"""
Deterministic P1–P5 rescheduling rule engine.
The LLM calls these as tools but never overrides the decisions they return.
"""
import math


def v2_cross_check(cert_salary: float, bank_6mo_avg: float) -> dict:
    """
    V2 validation: salary certificate vs bank statement 6-month average.
    Fails if the discrepancy exceeds ±10%. A failure forces P5 escalation.
    """
    if not cert_salary or not bank_6mo_avg or bank_6mo_avg <= 0:
        return {
            "passes": False,
            "discrepancy_pct": 100.0,
            "severity": "UNVERIFIABLE",
            "reason": "One or both salary figures are missing or zero — cannot cross-check.",
        }

    disc = abs(cert_salary - bank_6mo_avg) / bank_6mo_avg
    passes = disc <= 0.10
    severity = "PASS" if passes else ("MINOR" if disc <= 0.20 else "MAJOR")

    return {
        "passes": passes,
        "discrepancy_pct": round(disc * 100, 2),
        "severity": severity,
        "cert_salary": cert_salary,
        "bank_6mo_avg": bank_6mo_avg,
        "reason": (
            f"Discrepancy is {round(disc * 100, 1)}% — "
            f"{'within' if passes else 'exceeds'} the ±10% tolerance."
        ),
    }


def check_per_member_income(total_salary: float, household_size: int) -> dict:
    """
    S6 check: per-member income threshold is AED 2,500.
    Falling below this threshold forces P4 (compassionate deferral).
    """
    household_size = max(household_size or 1, 1)
    per_member = total_salary / household_size
    below = per_member < 2500

    return {
        "per_member_income": round(per_member, 2),
        "household_size": household_size,
        "below_threshold": below,
        "threshold": 2500,
        "reason": (
            f"AED {per_member:,.0f}/member — "
            f"{'BELOW' if below else 'above'} the AED 2,500 threshold."
        ),
    }


def calculate_p3_plan(
    current_emi: float,
    total_arrears: float,
    remaining_months: int,
    monthly_salary: float,
) -> dict:
    """
    P3: Maintain current EMI, spread arrears evenly over the remaining loan term.
    Returns feasible=True if the 20% income cap is satisfied.
    """
    if remaining_months <= 0:
        return {"feasible": False, "path": "P3_FAILED_NO_TERM", "reason": "No remaining loan term."}

    spread = total_arrears / remaining_months
    new_total = current_emi + spread
    cap = 0.20 * monthly_salary

    if new_total <= cap:
        return {
            "feasible": True,
            "path": "P3",
            "monthly_arrears_spread": round(spread, 2),
            "emi_during": round(new_total, 2),
            "emi_after": round(current_emi, 2),
            "duration_months": remaining_months,
            "cap_utilization_pct": round((new_total / cap) * 100, 1),
        }

    return {
        "feasible": False,
        "path": "P3_FAILED_CAP",
        "new_total_would_be": round(new_total, 2),
        "cap": round(cap, 2),
        "overage": round(new_total - cap, 2),
        "reason": (
            f"P3 would require AED {new_total:,.0f}/month, "
            f"exceeding the 20% cap of AED {cap:,.0f}."
        ),
        "suggested_fallback": "P4",
    }


def calculate_p4_plan(
    current_emi: float,
    monthly_salary: float,
    total_arrears: float,
) -> dict:
    """
    P4: Defer all arrears to the end of the loan.
    Monthly EMI is unchanged; no additional arrears payment is required now.
    """
    cap = 0.20 * monthly_salary
    return {
        "feasible": True,
        "path": "P4",
        "monthly_arrears_spread": 0,
        "emi_during": round(current_emi, 2),
        "emi_after": round(current_emi, 2),
        "duration_months": 0,
        "arrears_deferred": round(total_arrears, 2),
        "cap_utilization_pct": round((current_emi / cap) * 100, 1) if cap > 0 else 0,
        "reason": "Arrears transferred to the end of the loan. No additional monthly burden.",
    }


def calculate_p1_plan(
    current_emi: float,
    total_arrears: float,
    remaining_months: int,
    monthly_salary: float,
    salary_at_origination: float,
) -> dict:
    """
    P1: Income has increased. Raise the monthly payment to 16% of current salary,
    which shortens the loan term rather than overpaying over the original term.
    For a zero-interest SZHP loan: remaining_balance = current_emi × remaining_months.
    Falls back to P3/P4 if the target rate can't clear the total within the original term.
    """
    if remaining_months <= 0:
        return calculate_p4_plan(current_emi, monthly_salary, total_arrears)

    target_payment = 0.16 * monthly_salary
    remaining_balance = current_emi * remaining_months
    total_outstanding = remaining_balance + total_arrears

    new_term = math.ceil(total_outstanding / target_payment)

    if new_term > remaining_months:
        p3 = calculate_p3_plan(current_emi, total_arrears, remaining_months, monthly_salary)
        if p3["feasible"]:
            return p3
        return calculate_p4_plan(current_emi, monthly_salary, total_arrears)

    months_saved = remaining_months - new_term
    income_change_pct = round(
        ((monthly_salary - salary_at_origination) / max(salary_at_origination, 1)) * 100, 1
    )
    return {
        "feasible": True,
        "path": "P1",
        "monthly_arrears_spread": round(total_arrears / new_term, 2),
        "emi_during": round(total_outstanding / new_term, 2),
        "emi_after": 0,
        "duration_months": new_term,
        "months_saved": months_saved,
        "cap_utilization_pct": round((target_payment / (0.20 * monthly_salary)) * 100, 1),
        "reason": (
            f"Income increased {income_change_pct}% since origination. "
            f"EMI raised to AED {round(total_outstanding / new_term, 2):,.2f}/month (~16% of salary). "
            f"Loan paid off in {new_term} months ({months_saved} months early)."
        ),
    }


def determine_hardship_type(remarks: str, has_medical: bool, hardship_permanent: bool) -> str:
    """Classify the hardship type from remarks and medical flag."""
    if has_medical and hardship_permanent:
        return "MEDICAL_HARDSHIP_PERMANENT"
    if has_medical:
        return "MEDICAL_HARDSHIP_TEMPORARY"

    r = (remarks or "").lower()
    if any(w in r for w in ["widow", "widowed", "spouse died", "husband died", "husband passed"]):
        return "BEREAVEMENT"
    if any(w in r for w in ["job loss", "unemployed", "lost job", "redundan", "laid off"]):
        return "INCOME_REDUCTION"
    if any(w in r for w in ["resolved", "recovered", "resumed", "back to work", "returned"]):
        return "TEMPORARY_RESOLVED"
    return "TEMPORARY_CIRCUMSTANCE"


def select_path(
    v2_result: dict,
    current_salary: float,
    salary_at_origination: float,
    per_member_result: dict,
    hardship_type: str,
    p3_plan: dict,
) -> str:
    """
    Deterministic path selector.
    Order of evaluation is fixed; the LLM cannot override this.
    """
    # 1. V2 gate — if income cross-check fails, always escalate
    if not v2_result["passes"]:
        return "P5"

    # 2. S6 binding — per-member income below AED 2,500
    if per_member_result["below_threshold"]:
        return "P4"

    # 3. Permanent medical hardship or bereavement — long-term, needs employee review
    if "PERMANENT" in hardship_type or "BEREAVEMENT" in hardship_type:
        return "P5"

    # 4. Income-change routing
    income_change = (current_salary - salary_at_origination) / max(salary_at_origination, 1)
    if income_change > 0.10:
        return "P1"
    if income_change > 0.03:
        return "P2"

    # 5. Stable income — try spreading arrears
    if p3_plan.get("feasible"):
        return "P3"

    # 6. P3 failed the 20% cap — defer to end
    return "P4"


def score_confidence(
    v2_result: dict,
    doc_complete: bool,
    path: str,
    hardship_type: str,
    per_member_result: dict,
) -> int:
    """
    Confidence score (0–99).
    Starts at 100, deducts for each uncertainty factor.
    Target outputs: P1 ~96–98, P3 ~75, P4 ~64, P5 ~58.
    """
    score = 100

    if not doc_complete:
        score -= 20

    disc = v2_result.get("discrepancy_pct", 0)

    if path == "P5":
        # Flat escalation penalty — V2 discrepancy is already the cause, no double-count
        score -= 40
    elif path == "P4":
        score -= 15  # base P4 uncertainty
        if per_member_result.get("below_threshold"):
            score -= 10
        if "PERMANENT" in hardship_type:
            score -= 10
        if "BEREAVEMENT" in hardship_type:
            score -= 5
        if disc > 5:
            score -= int(disc * 0.3)
    elif path == "P3":
        score -= 25  # stable but spread adds future risk
        if disc > 5:
            score -= int(disc * 0.3)
    elif path in ("P1", "P2"):
        score -= 2  # near-perfect case, minimal deduction
        if disc > 5:
            score -= int(disc * 0.3)

    return max(20, min(99, score))


def check_period_rule(plan_duration_months: int, remaining_loan_months: int) -> dict:
    """
    Key Rule 2: The rescheduling plan must not extend beyond the remaining loan term.
    P4 (arrears deferred to end, duration=0) always passes.
    """
    remaining_loan_months = max(remaining_loan_months or 0, 0)
    # A duration of 0 means arrears deferred to loan end — within term by definition
    if plan_duration_months <= 0:
        return {
            "passes": True,
            "reason": "Arrears deferred to loan end — within original term.",
            "plan_duration_months": 0,
            "remaining_loan_months": remaining_loan_months,
        }

    passes = plan_duration_months <= remaining_loan_months
    return {
        "passes": passes,
        "plan_duration_months": plan_duration_months,
        "remaining_loan_months": remaining_loan_months,
        "reason": (
            f"Plan duration ({plan_duration_months} months) "
            f"{'≤' if passes else '>'} remaining term ({remaining_loan_months} months). "
            f"{'PASS' if passes else 'FAIL'}."
        ),
    }


def determine_risk_level(path: str, confidence: int) -> str:
    """Map decision path + confidence to the risk_level string the dashboard expects."""
    if path == "P5":
        return "high"
    if path == "P4":
        return "medium"
    if path in ("P1", "P2", "P3"):
        return "low"   # stable/increasing income, auto-approved
    if confidence >= 60:
        return "medium"
    return "high"


# Per-hardship-type: the exact document type required and its human-readable label.
# Medical hardship specifically requires medical_report (issued by a recognized healthcare
# authority with QR/digital authentication) — a generic other_supporting_document does NOT
# suffice per the organizer guidance on document validation requirements.
_HARDSHIP_DOC_REQUIRED = {
    "medical":      ("medical_report",            "Medical Report or Disability Certificate"),
    "bereavement":  ("other_supporting_document", "Bereavement / Hardship Letter"),
    "abroad":       ("passport_stamp",            "Passport Copy or Travel Stamp"),
    "unemployment": ("other_supporting_document", "Proof of Unemployment or Income Loss"),
}


def check_document_completeness(documents: list, hardship_type: str) -> dict:
    """
    Deterministic document completeness check.

    Rules:
    - salary_certificate is always required.
    - If hardship_type is medical/bereavement/abroad/unemployment, the specific required
      document type for that hardship must be present (see _HARDSHIP_DOC_REQUIRED).
      Notably, medical hardship requires medical_report specifically — a generic
      other_supporting_document is not accepted.
    - bank_statement absence is noted as a warning but does NOT block processing
      (V2 will be skipped / cert used as the sole income source).

    Returns:
        complete (bool), missing_documents (list of human-readable strings),
        missing_types (list of storage key strings), warnings (list of strings).
    """
    uploaded = {doc.get("document_type", "") for doc in (documents or [])}
    missing_types = []
    missing_labels = []
    warnings = []

    # Always required
    if "salary_certificate" not in uploaded:
        missing_types.append("salary_certificate")
        missing_labels.append("Salary Certificate (required for all applications)")

    # Hardship-specific supporting document — each type has its own exact requirement
    if hardship_type in _HARDSHIP_DOC_REQUIRED:
        required_doc_type, doc_label = _HARDSHIP_DOC_REQUIRED[hardship_type]
        if required_doc_type not in uploaded:
            missing_types.append(required_doc_type)
            missing_labels.append(
                f"{doc_label} (required to verify your declared {hardship_type.replace('_', ' ')} hardship)"
            )

    # Bank statement — soft warning only
    if "bank_statement" not in uploaded:
        warnings.append(
            "Bank statement not provided — V2 income cross-check will be skipped. "
            "Providing it strengthens your application."
        )

    return {
        "complete": len(missing_types) == 0,
        "missing_documents": missing_labels,
        "missing_types": missing_types,
        "uploaded_types": list(uploaded),
        "warnings": warnings,
        "reason": (
            "All required documents are present."
            if not missing_types
            else f"Missing: {', '.join(missing_labels)}"
        ),
    }
