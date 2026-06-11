"""
SZHP AI Loan Analyst — Claude tool-use orchestrator.

Claude acts as the autonomous agent: it decides which tools to call, reads
each result, and proceeds to the next step without external scripting.
The Python rule engine (rule_engine.py) makes all rescheduling decisions
deterministically; Claude synthesises the human-readable rationale.
"""

import json
import logging
import anthropic

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL, MAX_TOKENS
from tools.data_tools import fetch_application
from tools.document_tools import (
    extract_salary_certificate,
    extract_bank_statement,
    extract_medical_report,
)
from tools.rule_engine import (
    v2_cross_check,
    check_per_member_income,
    calculate_p3_plan,
    calculate_p4_plan,
    calculate_p1_plan,
    check_period_rule,
    determine_hardship_type,
    select_path,
    score_confidence,
    determine_risk_level,
    check_document_completeness,
)
from tools.db_writer import (
    write_validation_results,
    write_recommendation,
    update_application,
    write_audit_log,
    set_pending_documents_status,
)
from agent_logger import AgentTraceLogger

logger = logging.getLogger(__name__)
_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ── Tool definitions ─────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "fetch_application_data",
        "description": (
            "Fetch the full application record from the database, including loan details "
            "and a list of uploaded documents with their storage paths."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "application_id": {"type": "string", "description": "The application ID to fetch."}
            },
            "required": ["application_id"],
        },
    },
    {
        "name": "check_document_completeness",
        "description": (
            "Run the deterministic document completeness check. "
            "Call this immediately after fetch_application_data, before extracting any documents. "
            "Pass the full documents list and the declared hardship_type. "
            "If complete=false, you MUST call set_pending_documents and stop — do not proceed with analysis."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "documents": {
                    "type": "array",
                    "description": "The documents array from fetch_application_data result.",
                    "items": {"type": "object"},
                },
                "hardship_type": {
                    "type": "string",
                    "description": "The hardship_type field from the application (e.g. medical, bereavement, abroad, unemployment).",
                },
            },
            "required": ["documents", "hardship_type"],
        },
    },
    {
        "name": "set_pending_documents",
        "description": (
            "Set the application status to pending_documents and record the list of missing documents. "
            "Call this ONLY when check_document_completeness returns complete=false. "
            "After calling this, stop — do not extract documents or calculate a plan."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "application_id": {"type": "string"},
                "missing_documents": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Human-readable list of missing documents from check_document_completeness.",
                },
                "reason": {
                    "type": "string",
                    "description": "Plain English explanation of what is missing and why it is needed.",
                },
            },
            "required": ["application_id", "missing_documents", "reason"],
        },
    },
    {
        "name": "extract_salary_certificate_data",
        "description": (
            "Download the salary certificate PDF from Supabase Storage and use AI vision "
            "to extract the monthly salary (AED), employer name, and document date."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "storage_path": {
                    "type": "string",
                    "description": "Full storage path, e.g. applications/APP-ID/salary_certificate/file.pdf",
                }
            },
            "required": ["storage_path"],
        },
    },
    {
        "name": "extract_bank_statement_data",
        "description": (
            "Download the bank statement PDF and extract the 6-month average salary credit "
            "and individual monthly credit amounts."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "storage_path": {"type": "string", "description": "Full storage path to the bank statement PDF."}
            },
            "required": ["storage_path"],
        },
    },
    {
        "name": "extract_medical_report_data",
        "description": (
            "Download a medical report or hardship letter PDF and extract whether the "
            "applicant has a medical hardship, whether it is permanent, and the condition name."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "storage_path": {"type": "string", "description": "Full storage path to the medical/hardship document."}
            },
            "required": ["storage_path"],
        },
    },
    {
        "name": "run_v2_cross_check",
        "description": (
            "Run the V2 salary cross-validation: compare the salary certificate figure against "
            "the bank statement 6-month average. If the discrepancy exceeds ±10%, the check "
            "FAILS and the application MUST be escalated to P5 (human review). "
            "This is a hard governance rule — never override a FAIL result."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "cert_salary": {"type": "number", "description": "Monthly salary from the salary certificate (AED)."},
                "bank_6mo_avg": {"type": "number", "description": "6-month average salary credit from the bank statement (AED)."},
            },
            "required": ["cert_salary", "bank_6mo_avg"],
        },
    },
    {
        "name": "run_per_member_income_check",
        "description": (
            "Check whether total monthly salary divided by household size falls below "
            "the AED 2,500 per-member threshold (S6 rule). "
            "If below threshold, the application must be routed to P4."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "total_salary": {"type": "number", "description": "Total monthly salary (AED)."},
                "household_size": {"type": "integer", "description": "Number of people in the household."},
            },
            "required": ["total_salary", "household_size"],
        },
    },
    {
        "name": "check_period_rule",
        "description": (
            "Check Key Rule 2: the rescheduling plan duration must not exceed the remaining loan term. "
            "Call this after calculate_rescheduling_plan with the plan's duration_months and "
            "the remaining loan term in months. Returns passes (bool) and a reason string."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "plan_duration_months": {
                    "type": "integer",
                    "description": "Duration of the proposed rescheduling plan in months (0 for P4).",
                },
                "remaining_loan_months": {
                    "type": "integer",
                    "description": "Remaining loan term in months at time of application.",
                },
            },
            "required": ["plan_duration_months", "remaining_loan_months"],
        },
    },
    {
        "name": "calculate_rescheduling_plan",
        "description": (
            "Run the deterministic rescheduling rules engine. "
            "Provide all financial inputs; the engine selects the correct path (P1/P3/P4/P5) "
            "and returns the full rescheduling plan including EMI figures, duration, "
            "20% rule compliance, income change %, per-member income, and deduction rate. "
            "If v2_passed is false, the engine immediately returns P5 without calculating a plan."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "current_emi": {"type": "number", "description": "Current monthly EMI (AED)."},
                "total_arrears": {"type": "number", "description": "Total outstanding arrears (AED)."},
                "remaining_months": {"type": "integer", "description": "Remaining loan term in months."},
                "monthly_salary": {"type": "number", "description": "Applicant's current monthly salary (AED)."},
                "salary_at_origination": {"type": "number", "description": "Salary when the loan was originally taken."},
                "hardship_type": {
                    "type": "string",
                    "description": (
                        "Hardship classification: MEDICAL_HARDSHIP_PERMANENT, MEDICAL_HARDSHIP_TEMPORARY, "
                        "BEREAVEMENT, INCOME_REDUCTION, TEMPORARY_RESOLVED, or TEMPORARY_CIRCUMSTANCE."
                    ),
                },
                "household_size": {"type": "integer", "description": "Household size for per-member income check."},
                "v2_passed": {"type": "boolean", "description": "Whether the V2 salary cross-check passed."},
            },
            "required": [
                "current_emi", "total_arrears", "remaining_months",
                "monthly_salary", "salary_at_origination", "v2_passed",
            ],
        },
    },
    {
        "name": "write_results_to_database",
        "description": (
            "Write the completed analysis back to Supabase: "
            "upsert validation_results, upsert recommendations, update applications status/risk/confidence, "
            "and append an AI_ANALYSIS_COMPLETE audit log entry."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "application_id": {"type": "string"},
                "validation_data": {
                    "type": "object",
                    "description": (
                        "Fields for validation_results: salary_certificate_valid (bool), "
                        "bank_statement_available (bool), salary_match_status (string), "
                        "document_completeness_status (string), cross_document_consistency (string), "
                        "identified_issues (array of strings), extracted_financials (object)."
                    ),
                },
                "recommendation_data": {
                    "type": "object",
                    "description": (
                        "Fields for recommendations: path_taken, recommended_monthly_arrears_payment, "
                        "emi_during_rescheduling_period, emi_after_rescheduling_period, "
                        "recommended_duration_months, final_decision, "
                        "rationale (object with rationale_en, rationale_ar, reasoning_ar, case_summary_ar — bilingual), "
                        "reasoning (plain English 2-3 sentence explanation), "
                        "proposed_deduction_rate_pct (number: new EMI as % of salary), "
                        "period_rule_passed (bool), twenty_pct_rule_passed (bool), "
                        "income_change_pct (number: % change from origination salary), "
                        "per_member_income (number: AED per household member), "
                        "case_summary (string: 2-3 sentence plain English case overview)."
                    ),
                },
                "application_update": {
                    "type": "object",
                    "description": (
                        "Fields to update on applications: status, risk_level, human_review_required (bool), "
                        "confidence_score (int), final_decision, decision_rationale."
                    ),
                },
            },
            "required": ["application_id", "validation_data", "recommendation_data", "application_update"],
        },
    },
]

# ── Tool dispatcher ──────────────────────────────────────────────────────────

def _dispatch(tool_name: str, tool_input: dict) -> dict:
    """Route Claude's tool calls to the correct Python function."""

    if tool_name == "fetch_application_data":
        return fetch_application(tool_input["application_id"])

    if tool_name == "check_document_completeness":
        return check_document_completeness(
            tool_input.get("documents", []),
            tool_input.get("hardship_type", ""),
        )

    if tool_name == "set_pending_documents":
        return set_pending_documents_status(
            tool_input["application_id"],
            tool_input.get("missing_documents", []),
            tool_input.get("reason", "Required documents are missing."),
        )

    if tool_name == "extract_salary_certificate_data":
        return extract_salary_certificate(tool_input["storage_path"])

    if tool_name == "extract_bank_statement_data":
        return extract_bank_statement(tool_input["storage_path"])

    if tool_name == "extract_medical_report_data":
        return extract_medical_report(tool_input["storage_path"])

    if tool_name == "run_v2_cross_check":
        return v2_cross_check(
            float(tool_input["cert_salary"]),
            float(tool_input["bank_6mo_avg"]),
        )

    if tool_name == "run_per_member_income_check":
        return check_per_member_income(
            float(tool_input["total_salary"]),
            int(tool_input.get("household_size", 1)),
        )

    if tool_name == "check_period_rule":
        return check_period_rule(
            int(tool_input.get("plan_duration_months", 0)),
            int(tool_input.get("remaining_loan_months", 0)),
        )

    if tool_name == "calculate_rescheduling_plan":
        v2_passed = bool(tool_input.get("v2_passed", True))
        salary = float(tool_input["monthly_salary"])
        emi = float(tool_input["current_emi"])
        arrears = float(tool_input["total_arrears"])
        months = int(tool_input["remaining_months"])
        origination = float(tool_input.get("salary_at_origination", salary))
        hardship = str(tool_input.get("hardship_type", "TEMPORARY_CIRCUMSTANCE"))
        household = int(tool_input.get("household_size", 1))

        income_change_pct = round(
            ((salary - origination) / max(origination, 1)) * 100, 1
        ) if origination else 0

        if not v2_passed:
            return {
                "path": "P5",
                "reason": "V2 cross-check FAILED — agent must escalate to human review.",
                "emi_during": emi,
                "emi_after": emi,
                "monthly_arrears_spread": 0,
                "duration_months": 0,
                "feasible": False,
                "twenty_pct_rule_passed": None,
                "period_rule_passed": None,
                "income_change_pct": income_change_pct,
                "per_member_income": None,
                "proposed_deduction_rate_pct": None,
            }

        per_member = check_per_member_income(salary, household)
        p3 = calculate_p3_plan(emi, arrears, months, salary)
        path = select_path(
            v2_result={"passes": True, "discrepancy_pct": 0},
            current_salary=salary,
            salary_at_origination=origination,
            per_member_result=per_member,
            hardship_type=hardship,
            p3_plan=p3,
        )

        if path in ("P1", "P2"):
            plan = calculate_p1_plan(emi, arrears, months, salary, origination)
            plan["path"] = path
        elif path == "P3":
            plan = p3
        elif path == "P4":
            plan = calculate_p4_plan(emi, salary, arrears)
        else:
            plan = {"path": "P5", "reason": "Escalated by rule engine.", "feasible": False}

        # Augment plan with extra compliance fields
        emi_during = plan.get("emi_during", emi)
        duration = plan.get("duration_months", months)
        cap = 0.20 * salary
        twenty_pct_ok = round(emi_during, 2) <= round(cap, 2)
        period_ok = duration <= months if duration > 0 else True
        deduction_rate = round((emi_during / salary) * 100, 1) if salary > 0 else None

        plan["twenty_pct_rule_passed"] = twenty_pct_ok
        plan["period_rule_passed"] = period_ok
        plan["income_change_pct"] = income_change_pct
        plan["per_member_income"] = per_member.get("per_member_income")
        plan["proposed_deduction_rate_pct"] = deduction_rate
        return plan

    if tool_name == "write_results_to_database":
        app_id = tool_input["application_id"]
        val = {"application_id": app_id, **tool_input["validation_data"]}
        rec = {"application_id": app_id, **tool_input["recommendation_data"]}
        upd = tool_input["application_update"]

        write_validation_results(val)
        write_recommendation(rec)
        update_application(app_id, upd)
        path = tool_input["recommendation_data"].get("path_taken", "?")
        conf = tool_input["application_update"].get("confidence_score", "?")
        write_audit_log(
            app_id,
            "AI_ANALYSIS_COMPLETE",
            f"AI agent completed analysis. Path: {path}. Confidence: {conf}%.",
        )
        return {"success": True, "application_id": app_id}

    raise ValueError(f"Unknown tool: {tool_name}")


# ── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are the SZHP (Sheikh Zayed Housing Programme) AI Loan Analyst agent.

Your job is to analyse housing loan arrears rescheduling applications end-to-end and write
the results directly to the database.

STEP-BY-STEP PROCEDURE (follow in order):
1. Call fetch_application_data to retrieve the application, loan details, and document list.
2. Call check_document_completeness with the documents array and hardship_type from the application.
   - If complete=false: call set_pending_documents with the application_id, the missing_documents
     list, and a clear reason. Then STOP — do not proceed to steps 3–8.
   - If complete=true: continue to step 3.
3. For EACH uploaded document, call the matching extraction tool:
   - salary_certificate → extract_salary_certificate_data
   - bank_statement → extract_bank_statement_data
   - medical_report, hardship_letter, or similar → extract_medical_report_data
4. Call run_v2_cross_check with cert_salary and bank_6mo_avg.
   (If bank statement is missing, use cert_salary for both — this will pass V2 with 0% discrepancy,
   but note in identified_issues that bank statement was not provided.)
5. Call run_per_member_income_check with total monthly salary and household size.
   (Use family_size from the application record if available; default to 1.)
6. Call calculate_rescheduling_plan with all gathered inputs.
7. Call check_period_rule with the plan's duration_months and the remaining_loan_period_months.
8. Build three objects — validation_data, recommendation_data, application_update — and call
   write_results_to_database.

CRITICAL GOVERNANCE RULES (never violate):
- The path returned by calculate_rescheduling_plan is FINAL. Use it exactly as returned.
  Never override or second-guess the engine's path based on your own reasoning.
  If the engine returns P4, the decision is P4 — even if permanent hardship is present.
  If the engine returns P5, the decision is P5. Trust the engine unconditionally.
- If run_v2_cross_check returns passes=false: set v2_passed=false in calculate_rescheduling_plan.
  The engine returns path=P5. Set human_review_required=true, status="needs_human_review".
  Do NOT produce a rescheduling plan for P5.
- emi_during_rescheduling_period MUST be ≤ 20% of monthly_salary in every non-P5 plan.
  P1/P2 plans set emi_during = 16% of salary and shorten the loan term (emi_after = 0, loan fully
  paid off at end of duration_months). The 20% is only the hard cap, never the target.
- For P5 cases: write a clear decision_rationale explaining exactly WHY (e.g. "50% salary
  discrepancy detected between certificate (AED X) and bank statement average (AED Y)…").
- Every case must end with write_results_to_database. Never skip this step.

REQUIRED FIELDS IN recommendation_data (include ALL of these):
- path_taken, recommended_monthly_arrears_payment, emi_during_rescheduling_period,
  emi_after_rescheduling_period, recommended_duration_months
- reasoning: 2–3 plain English sentences explaining the plan
- case_summary: 2–3 sentences summarising the applicant's situation (salary, family, hardship)
- proposed_deduction_rate_pct: new EMI as a % of monthly salary
- twenty_pct_rule_passed: from calculate_rescheduling_plan result
- period_rule_passed: from check_period_rule result
- income_change_pct: % change in salary since origination
- per_member_income: AED per household member

BILINGUAL OUTPUT (Arabic + English):
Inside the rationale object, you MUST also include Arabic (Modern Standard Arabic / فصحى) versions:
- rationale_ar: Arabic translation of rationale_en
- reasoning_ar: Arabic translation of the reasoning field (2–3 sentences)
- case_summary_ar: Arabic translation of case_summary
These Arabic fields go inside the rationale dict passed to write_results_to_database.
The system serves UAE citizens who may prefer Arabic; always generate both languages.

STATUS VALUES for application_update:
- Engine returns P1/P2/P3/P4 → status="approved_automatically", human_review_required=false
- Engine returns P5 → status="needs_human_review", human_review_required=true
- Missing required documents → use set_pending_documents tool (not write_results_to_database)

CONFIDENCE SCORING (use cap_utilization_pct from plan when available, otherwise estimate):
- P1 clean: ~96, P3 stable: ~75, P4 hardship: ~64, P5 escalation: ~58.

DECISION RATIONALE (in application_update.decision_rationale):
2–3 sentences in plain English. Cite key numbers: salary, discrepancy %, EMI cap %.
An officer must be able to read this and immediately understand the decision.
"""

# ── Main entry point ─────────────────────────────────────────────────────────

def run_agent(application_id: str) -> dict:
    """
    Run the full Claude tool-use agentic loop for one application.
    Returns a dict with iteration count and final summary text.
    """
    trace = AgentTraceLogger(application_id)
    trace.log_start()
    write_audit_log(application_id, "AI_ANALYSIS_STARTED", "AI agent began processing.")

    messages = [
        {
            "role": "user",
            "content": (
                f"Process rescheduling application {application_id}.\n\n"
                "Follow the procedure in the system prompt exactly:\n"
                "fetch → extract all documents → V2 cross-check → per-member check "
                "→ calculate plan → write results.\n\n"
                "Document your reasoning at each step."
            ),
        }
    ]

    iteration = 0
    final_text = ""
    max_iterations = 10

    while iteration < max_iterations:
        iteration += 1

        response = _client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        # Log any reasoning/text blocks Claude produced before tool calls
        for block in response.content:
            if hasattr(block, "text") and block.type == "text":
                trace.log_reasoning(iteration, block.text)

        if response.stop_reason == "end_turn":
            for block in response.content:
                if hasattr(block, "text"):
                    final_text = block.text
            break

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    trace.log_tool_call(iteration, block.name, block.input)
                    try:
                        result = _dispatch(block.name, block.input)
                        trace.log_tool_result(iteration, block.name, result)
                    except Exception as exc:
                        trace.log_tool_error(iteration, block.name, str(exc))
                        logger.error(
                            f"[{application_id}] Tool {block.name} error: {exc}",
                            exc_info=True,
                        )
                        result = {"error": str(exc), "tool": block.name}

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    })

            messages.append({"role": "user", "content": tool_results})
            continue

        # Unexpected stop reason — exit loop
        logger.warning(f"[{application_id}] Unexpected stop_reason: {response.stop_reason}")
        break

    trace.log_complete(iteration, final_text)
    return {
        "application_id": application_id,
        "iterations": iteration,
        "summary": final_text,
        "status": "completed",
    }
