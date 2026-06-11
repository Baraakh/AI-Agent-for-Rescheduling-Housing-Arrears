# Sahel Agent — Policy Rules

> **Scope:** Deterministic compliance rules enforced by the rule engine and referenced
> by all agents. Rule IDs cited in code and agent prompts must match this document.

---

## Core Financial Rules

### R1 — 20% Monthly Deduction Cap

The total monthly deduction (EMI + arrears spread) must not exceed 20% of the
applicant's current gross monthly salary.

```
emi_during_rescheduling ≤ 0.20 × monthly_salary
```

- Applies to all rescheduling paths P1, P2, P3.
- P4 (arrears deferred to loan end) has no monthly arrears component;
  R1 is checked against the current EMI alone.
- P5 (human escalation) — no plan is generated; R1 is not evaluated.

### R2 — Period Rule

The rescheduling plan duration must not extend beyond the remaining loan term.

```
plan_duration_months ≤ remaining_loan_months
```

- P4 sets `plan_duration_months = 0` (arrears are deferred to end); R2 passes
  trivially by definition.
- P5 — no plan duration; R2 not evaluated.

---

## Salary Cross-Verification (V2)

### V2 — Income Cross-Check

Compare the declared salary certificate figure against the 6-month average salary
credit observed in the bank statement.

```
discrepancy = |cert_salary − bank_6mo_avg| / bank_6mo_avg × 100%

  ≤ 10%  →  PASS   — proceed normally
  > 10%  →  FAIL   — force P5 (human escalation); hard rule, no override
```

| Severity | Range | Action |
|---|---|---|
| PASS | 0–10% | Continue to path selection |
| MINOR | 10–20% | Force P5, note minor discrepancy |
| MAJOR | >20% | Force P5, flag significant discrepancy |
| UNVERIFIABLE | N/A (missing data) | Force P5, note unverifiable income |

If the bank statement was not uploaded by the applicant, `bank_6mo_avg` defaults
to `cert_salary` (0% discrepancy). V2 passes but the absence is noted in
`identified_issues`. See ESC1.

---

## Hardship Classification

### S4 — Hardship Type

The agent classifies the applicant's hardship into one of the following types based on
the applicant's remarks and any supporting documents:

| Type | Trigger Criteria |
|---|---|
| `MEDICAL_HARDSHIP` | Medical report present, `has_medical_hardship = true` |
| `BEREAVEMENT` | Remarks contain spouse-death keywords; hardship letter confirms |
| `INCOME_REDUCTION` | Salary materially reduced; evidence from bank statement trend |
| `TEMPORARY_CIRCUMSTANCE` | Hardship acknowledged but no qualifying category applies |
| `UNEMPLOYMENT` | Evidence of job loss; termination letter or proof of unemployment |
| `LEGAL_ENCUMBRANCE` | Legal proceedings affecting income or assets |

### S5 — Medical Hardship Permanence

When hardship type is `MEDICAL_HARDSHIP`, the medical report determines permanence:

| Classification | Criteria |
|---|---|
| Permanent | Medical report states "unfit for work", "permanent disability", or equivalent |
| Temporary | Medical report states condition is treatable or recovery expected |

Permanent medical hardship triggers P4 regardless of income level.

### S6 — Per-Member Income Threshold

Per-member income is computed as:

```
per_member_income = monthly_salary / household_size
```

If `per_member_income < AED 2,500`, the S6 threshold is breached. The agent must
route to P4 (compassionate deferral) regardless of the income-change direction.

---

## DOCUMENT COMPLETENESS REQUIREMENTS

The following table defines what is required at submission and what the system
retrieves automatically. The agent checks mandatory document presence at intake (A1).
If the salary certificate is missing, the application is placed in `PENDING_DOCUMENTS`
status and the agent halts.

Bank statement is not required at submission — it is auto-fetched by the system via
the bank data integration (see V2).

| Document | Requirement | Notes |
|---|---|---|
| **Salary Certificate** | MANDATORY | Required for all applications. Must be issued by the employer or pension authority within the past 3 months. Checked by A1 at intake. |
| Bank Statement | AUTO-FETCHED | Not required from the applicant. System retrieves a 6-month statement automatically via UAE Bank Data integration. If the applicant uploads one, the upload is used in preference to the auto-fetch. Completeness checked by A2 after auto-fetch. |
| Identity & Family Data | AUTO-FETCHED | Retrieved via UAE Pass at login. Not a document upload. |
| Loan & Arrears Data | AUTO-FETCHED | Retrieved via MOEI Systems mock. Not a document upload. |
| Medical Report | Conditional | Required if `hardship_type = MEDICAL_HARDSHIP` is claimed. Must be issued by a MOHAP-recognised facility. |
| Termination Letter | Conditional | Required if `hardship_type = UNEMPLOYMENT` is claimed. |
| Legal Document | Conditional | Required if `hardship_type = LEGAL_ENCUMBRANCE` is claimed. |
| Justification Text | Conditional | Required only if a conditional document category applies. Plain-text field, not a file upload. If no hardship is claimed, the field is optional. |

---

## ESCALATION TRIGGERS

When any of the following conditions are met, the agent must not auto-decide.
It must generate a P5 escalation with a clear rationale and set
`human_review_required = true`.

| ID | Trigger | Notes |
|---|---|---|
| ESC1 | Bank statement not uploaded AND automatic fetch is unavailable — V2 income cross-check cannot be completed | Recorded as severity UNVERIFIABLE. Manual income verification required. |
| ESC2 | Applicant's declared income deviates from historical MOEI payment records by >50% with no supporting evidence | Suggests possible fraud or data entry error. |
| ESC3 | V2 cross-check FAILS — bank statement 6-month average deviates from salary certificate by >10% | Hard rule. Engine forces P5. LLM cannot override. See V2. |
| ESC4 | Applicant's Emirates ID is not found in MOEI Systems as an active SZHP beneficiary | Cannot confirm programme eligibility. |
| ESC5 | No path P1–P4 can satisfy both R1 (20% cap) and R2 (period rule) simultaneously | Signals edge-case where mathematical rescheduling is not possible within policy constraints. |
| ESC6 | Document QR or digital signature verification fails — document may have been tampered | Triggers document integrity review. |
| ESC7 | Multiple concurrent open rescheduling applications found for the same beneficiary | De-duplication required before processing. |
| ESC8 | Loan account has a FROZEN, LEGAL_HOLD, or JUDICIAL_ORDER status in MOEI Systems | Legal team must clear the hold before rescheduling. |
| ESC9 | Hardship type is classified as PERMANENT or LONG_TERM (evidenced by medical board permanent decision, confirmed permanent unemployment, or applicant's supporting documents indicating condition exceeds remaining loan term) AND no path P1–P4 satisfies both R1 and R2 | Distinct from ESC5: ESC9 signals to the human officer that exceptional policy action (term extension, principal reduction, or programme exception) may be warranted — not just a missing document or edge-case math failure. |

> **ESC9 Rationale Requirement:** A6 must include in the escalation rationale for ESC9
> cases: the hardship permanence classification, the specific rule that could not be
> satisfied, and a recommended next step for the human officer.

---

## ADD Mandate Policy

When the agent issues an auto-approved recommendation, it simultaneously generates an
ADD (Auto Direct Debit) mandate authorising MOEI's designated bank to deduct the agreed
EMI from the beneficiary's linked bank account.

ADD-1  Mandate is generated for all auto-approved decisions (paths P1, P2, P3, P4).
       It is NOT generated for P5.

ADD-2  Initial mandate status is PENDING_SIGNATURE. The approval is valid but not
       active until the beneficiary digitally signs.

ADD-3  If the beneficiary rejects the mandate, the case status becomes
       REQUIRES_HUMAN_REVIEW with reason ADD_REJECTED_BY_BENEFICIARY. A human officer
       handles alternative arrangements.

ADD-4  The mandate references the account number from which the bank statement was
       sourced (uploaded or auto-fetched). Account number is masked in all outputs
       (last 4 digits).

ADD-5  ASSUMPTION A_011: first deduction date defaults to the 1st of the month
       following mandate signature. Configurable.

---

## Confidence Scoring

The agent computes a confidence score (0–99) for each auto-approved decision.
The score reflects the quality of evidence and certainty of the outcome.

**Base score:** 100. Deductions are applied as follows:

| Condition | Deduction |
|---|---|
| Mandatory documents missing or incomplete | −20 |
| V2 discrepancy present (>5%) | −(discrepancy_pct × 0.3), rounded down |
| Path is P4 | −15 (base uncertainty for compassionate deferral) |
| Path is P3 | −25 (arrears spread adds long-term payment risk) |
| Path is P5 | −40 (escalated; no auto-decision confidence) |
| Per-member income below S6 threshold | −10 |
| Permanent medical hardship | −10 |
| Bereavement hardship | −5 |

Minimum score: 20. Maximum score: 99.

**Target ranges by path:**

| Path | Expected Range |
|---|---|
| P1 / P2 | 96–98 |
| P3 | ~75 |
| P4 | ~64 |
| P5 | ~58 |
