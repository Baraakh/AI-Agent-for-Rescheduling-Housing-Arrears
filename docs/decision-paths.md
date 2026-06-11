# Sahel Agent — Decision Paths

> **Scope:** Defines the five rescheduling decision paths (P1–P5), the conditions under
> which each is selected, and the financial parameters computed for each.
> Rule engine implementation: `agent/tools/rule_engine.py`.

---

## Path Selection Logic

The rule engine evaluates conditions in the following fixed order. The first matching
condition determines the path. The LLM cannot override this order.

```
1. V2 cross-check failed?                          → P5  (ESC3, hard rule)
2. Per-member income < AED 2,500? (S6)             → P4  (compassionate)
3. Hardship is PERMANENT medical or BEREAVEMENT?   → P4  (compassionate)
4. Income increased > 10% since origination?        → P1  (increase)
5. Income increased 3–10% since origination?        → P2  (partial increase)
6. P3 feasible? (spread within 20% cap)            → P3  (maintain + spread)
7. P3 infeasible (would breach 20% cap)?           → P4  (fallback compassionate)
```

---

## P1 — Increase Installment

**Scenario:** Applicant's income has increased substantially since loan origination (>10%).
There is headroom to absorb both the normal EMI and the arrears spread within the 20% cap.

**Trigger condition:** `(current_salary − salary_at_origination) / salary_at_origination > 0.10`

**Parameters computed:**

```python
target_total      = 0.18 × monthly_salary       # target combined deduction
spread            = total_arrears / remaining_months
new_emi           = target_total − spread        # base EMI going forward

emi_during        = new_emi + spread             # = 0.18 × salary (during plan)
emi_after         = new_emi                      # reduced after arrears cleared
duration_months   = remaining_months             # spread over full remaining term

# R1 check: emi_during ≤ 0.20 × monthly_salary   (always passes at 18%)
# R2 check: duration_months ≤ remaining_months    (trivially equal — passes)
```

**Fallback:** If the calculated `new_emi` would be lower than the current EMI (income
went up but arrears spread consumes headroom), fall back to P3. If P3 is also infeasible,
fall back to P4.

---

## P2 — Partial Increase

**Scenario:** Applicant's income has increased moderately since origination (3–10%).
Same calculation as P1 but the income change percentage is recorded to reflect the
smaller increase.

**Trigger condition:** `0.03 < (current_salary − salary_at_origination) / salary_at_origination ≤ 0.10`

**Parameters computed:** Identical to P1. Path label is set to `P2` to indicate the
more modest income change.

---

## P3 — Maintain Installment, Spread Arrears

**Scenario:** Applicant's income is stable (≤3% change). The arrears are spread evenly
across the remaining loan term without increasing the base EMI.

**Trigger condition:** P3 feasibility check passes (see below).

**Parameters computed:**

```python
spread            = total_arrears / remaining_months
emi_during        = current_emi + spread         # combined during plan

# Feasibility check (R1):
cap               = 0.20 × monthly_salary
feasible          = emi_during ≤ cap

emi_after         = current_emi                  # returns to current EMI after
duration_months   = remaining_months

# R2 check: duration_months ≤ remaining_months   (trivially equal — passes)
```

If `feasible = False` (the spread pushes the deduction above 20% of salary), P3 is
rejected and the engine falls through to P4.

---

## P4 — Transfer Arrears to End of Loan

**Scenario:** Per-member income is below the S6 threshold, hardship is permanent/bereavement,
or P3 is infeasible. The applicant cannot sustain an increased deduction. Arrears are
deferred to the end of the loan via a term extension.

**Trigger condition:** S6 breach, permanent hardship, bereavement, or P3 infeasible.

**Parameters computed:**

```python
proposed_emi      = current_emi          # unchanged
new_term_months   = current_remaining_term  # unchanged (R2 trivially passes)
# Arrears become a deferred lump settled at loan end
# within the existing remaining term.
# R1 check: current_emi / current_salary <= 0.20 (must hold)
# R2 check: term unchanged -> always passes
```

If sustaining the current EMI itself violates R1 (pension too low), P4 is not
viable — proceed to ESC5 or ESC9.

---

## P5 — Escalate to Human Review

**Scenario:** V2 cross-check failed; the agent cannot trust the income figure. No
auto-decision is possible.

**Trigger condition:** `v2_result.passes == False` (ESC3)

**Parameters computed:** None. No financial plan is generated.

```python
# No EMI changes, no duration, no spread.
# Agent writes a clear escalation rationale explaining:
#   - Which documents were compared
#   - The discrepancy percentage and severity
#   - Why the agent cannot auto-decide
```

**Status written:** `needs_human_review`, `human_review_required = true`

The human officer decides the arrangement directly. The escalation rationale must
provide enough context for the officer to proceed without re-running extraction.
