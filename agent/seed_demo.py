"""
Seed the 4 demo cases from Data/Case1-4/ directly into Supabase,
bypassing the frontend. Run once before the demo.

Usage:
    cd agent
    python seed_demo.py
"""

import json
import os
import random
import string
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DOCUMENTS_BUCKET = "application-documents"

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

DATA_DIR = Path(__file__).parent.parent / "Data"

CASES = [
    {
        "dir": DATA_DIR / "Case1",
        "label": "Khalid Saeed Al Mazrouei",
        "salary": 29500,
        "household_size": 4,
        "hardship_type": "INCOME_CHANGE",
        "remarks": "I experienced temporary financial difficulties earlier this year which have now been resolved. My salary has increased since the loan was originated and I am able to resume regular payments.",
        "documents": {
            "salary_certificate": "01_salary_certificate.pdf",
            "bank_statement": "02_bank_statement.pdf",
            "rescheduling_request": "03_hardship_letter.pdf",
        },
    },
    {
        "dir": DATA_DIR / "Case2",
        "label": "Aisha Mohammed Al Nuaimi",
        "salary": 11200,
        "household_size": 5,
        "hardship_type": "BEREAVEMENT_MEDICAL",
        "remarks": "I am a widow with four children. My husband passed away and my income changed from salary to pension. I have a permanent medical condition (Multiple Sclerosis) that prevents me from returning to full-time employment.",
        "documents": {
            "salary_certificate": "01_income_certificate.pdf",
            "bank_statement": "02_bank_statement.pdf",
            "rescheduling_request": "03_hardship_letter.pdf",
            "medical_report": "04_medical_report.pdf",
        },
    },
    {
        "dir": DATA_DIR / "Case3",
        "label": "Mohammed Rashid Al Hammadi",
        "salary": 16000,
        "household_size": 5,
        "hardship_type": "INCOME_CHANGE",
        "remarks": "I recently changed employers and my declared income on my new salary certificate is different from my previous employer's deposits visible in my bank statement. I am requesting rescheduling due to reduced income.",
        "documents": {
            "salary_certificate": "01_salary_certificate.pdf",
            "bank_statement": "02_bank_statement.pdf",
            "rescheduling_request": "03_hardship_letter.pdf",
        },
    },
    {
        "dir": DATA_DIR / "Case4",
        "label": "Fatima Ali Al Shamsi",
        "salary": 19800,
        "household_size": 4,
        "hardship_type": "TEMPORARY_CIRCUMSTANCE",
        "remarks": "My husband underwent surgery and I had to take unpaid leave to care for him. This was a temporary situation and I have now returned to work and resumed regular payments.",
        "documents": {
            "salary_certificate": "01_salary_certificate.pdf",
            "bank_statement": "02_bank_statement.pdf",
            "rescheduling_request": "03_hardship_letter.pdf",
            "other_supporting_document": "04_medical_note.pdf",
        },
    },
]

LOAN_DATA = [
    # Case 1 — Khalid
    {
        "current_monthly_emi": 3400,
        "arrears_amount": 13600,
        "overdue_months": 4,
        "remaining_loan_period_months": 144,
        "previous_rescheduling_count": 1,
        "salary_at_origination": 22000,
    },
    # Case 2 — Aisha
    {
        "current_monthly_emi": 2150,
        "arrears_amount": 21500,
        "overdue_months": 10,
        "remaining_loan_period_months": 205,
        "previous_rescheduling_count": 0,
        "salary_at_origination": 18500,
    },
    # Case 3 — Mohammed
    {
        "current_monthly_emi": 4100,
        "arrears_amount": 32800,
        "overdue_months": 8,
        "remaining_loan_period_months": 170,
        "previous_rescheduling_count": 0,
        "salary_at_origination": 24000,
    },
    # Case 4 — Fatima
    {
        "current_monthly_emi": 2900,
        "arrears_amount": 17400,
        "overdue_months": 6,
        "remaining_loan_period_months": 156,
        "previous_rescheduling_count": 0,
        "salary_at_origination": 19500,
    },
]

# Pre-computed AI-agent outputs for each case.
# These mirror what the live agent would produce when processing each application.
AI_OUTPUTS = [
    # ── Case 1 — Khalid — P1 (increase installment), auto-approved ──────────
    {
        "validation": {
            "salary_certificate_valid": True,
            "bank_statement_available": True,
            "salary_match_status": "match",
            "document_completeness_status": "complete",
            "cross_document_consistency": "consistent",
            "extracted_financials": {
                "employer_name": "Abu Dhabi Investment Authority",
                "declared_salary": 29500,
                "avg_bank_salary": 29800,
                "variance_pct": 1.0,
            },
            "bank_statement_source": "UPLOADED",
        },
        "recommendation": {
            "path_taken": "P1",
            "final_decision": "approved_automatically",
            "proposed_deduction_rate_pct": 16.1,
            "income_change_pct": 34.1,
            "per_member_income": 7375.0,
            "case_summary": "Khalid Al Mazrouei, employed at ADIA, income rose 34.1% since origination. 4 overdue payments totalling AED 13,600.",
            "reasoning": "Salary increased 34.1% above origination level. V2 cross-check passes (1.0% variance). Per-member income AED 7,375 well above threshold. P1 EMI-increase plan selected; DTI 16.1%.",
            "twenty_pct_rule_passed": True,
            "period_rule_passed": True,
            "recommended_monthly_arrears_payment": 1360,
            "emi_during_rescheduling_period": 4760,
            "emi_after_rescheduling_period": 3400,
            "recommended_duration_months": 10,
            "rationale": {
                "en": "Salary increased since origination; 20% cap provides sufficient headroom. Arrears absorbed over 10 months via EMI increase (P1). DTI 16.1%.",
                "ar": "ارتفع الراتب منذ التأسيس؛ حد 20% يتيح هامشاً كافياً. المتأخرات تُستوعب على 10 أشهر عبر زيادة القسط (P1). نسبة الدين للدخل 16.1%.",
            },
            # mandate_id injected dynamically as "ADD-{app_id}"
            "add_mandate": {
                "mandate_status": "PENDING_SIGNATURE",
                "agreed_emi": 4760,
                "first_deduction_date": "2026-07-01",
                "account_number_masked": "****7720",
                "bank_name": "First Abu Dhabi Bank",
            },
        },
        "application_update": {
            "status": "approved_automatically",
            "risk_level": "low",
            "confidence_score": 95,
            "final_decision": "approved_automatically",
            "decision_rationale": (
                "Income documents complete and consistent. P1 rescheduling keeps DTI at 16.1% "
                "(within 20% cap). Auto-approved."
            ),
            "hardship_permanence": "TEMPORARY",
            "human_review_required": False,
        },
    },

    # ── Case 2 — Aisha — P4 + permanent medical hardship → human review ─────
    {
        "validation": {
            "salary_certificate_valid": True,
            "bank_statement_available": True,
            "salary_match_status": "match",
            "document_completeness_status": "complete",
            "cross_document_consistency": "consistent",
            "extracted_financials": {
                "employer_name": "Pensioner — GPSSA",
                "declared_salary": 11200,
                "avg_bank_salary": 11100,
                "variance_pct": 0.9,
            },
            "bank_statement_source": "UPLOADED",
        },
        "recommendation": {
            "path_taken": "P4",
            "final_decision": "needs_human_review",
            "proposed_deduction_rate_pct": 19.2,
            "income_change_pct": -39.5,
            "per_member_income": 2240.0,
            "case_summary": "Aisha Al Nuaimi, widow with 4 children, GPSSA pension income. 10 overdue payments totalling AED 21,500. Permanent Multiple Sclerosis condition.",
            "reasoning": "Pension income 39.5% below origination salary. Per-member income AED 2,240 falls below AED 2,500 threshold — P4 deferral mandatory. Permanent MS triggers ESC9 compassionate-hardship human review.",
            "twenty_pct_rule_passed": True,
            "period_rule_passed": True,
            "recommended_monthly_arrears_payment": 0,
            "emi_during_rescheduling_period": 2150,
            "emi_after_rescheduling_period": 2150,
            "recommended_duration_months": 205,
            "rationale": {
                "en": (
                    "Low pension income — arrears deferred as lump sum to loan end (P4). "
                    "ESC9 triggered: permanent medical condition (Multiple Sclerosis) requires "
                    "human officer compassionate-hardship confirmation."
                ),
                "ar": (
                    "دخل معاش منخفض — المتأخرات مؤجلة كمبلغ إجمالي لنهاية القرض (P4). "
                    "تم تفعيل ESC9: الحالة الطبية الدائمة (التصلب المتعدد) تستوجب "
                    "تأكيد ظروف الرحمة من موظف بشري."
                ),
            },
            "add_mandate": None,
        },
        "application_update": {
            "status": "needs_human_review",
            "risk_level": "high",
            "confidence_score": 71,
            "final_decision": "needs_human_review",
            "decision_rationale": (
                "P4 plan viable (DTI 19.2%, within cap). Permanent medical condition "
                "(Multiple Sclerosis) triggers ESC9 — compassionate hardship review "
                "required by human officer before finalisation."
            ),
            "hardship_permanence": "PERMANENT",
            "human_review_required": True,
        },
    },

    # ── Case 3 — Mohammed — P5 (V2 salary mismatch >10%) ────────────────────
    {
        "validation": {
            "salary_certificate_valid": True,
            "bank_statement_available": True,
            "salary_match_status": "mismatch",
            "document_completeness_status": "complete",
            "cross_document_consistency": "inconsistent",
            "extracted_financials": {
                "employer_name": "Aldar Properties",
                "declared_salary": 16000,
                "avg_bank_salary": 24000,
                "variance_pct": 50.0,
            },
            "bank_statement_source": "AUTO_FETCHED",
        },
        "recommendation": {
            "path_taken": "P5",
            "final_decision": "needs_human_review",
            "proposed_deduction_rate_pct": None,
            "income_change_pct": -33.3,
            "per_member_income": 3200.0,
            "case_summary": "Mohammed Al Hammadi, Aldar Properties employee, recently changed employers. 8 overdue payments totalling AED 32,800. 50% discrepancy between salary certificate and bank deposits.",
            "reasoning": "V2 cross-check failed: salary certificate declares AED 16,000 but auto-fetched bank deposits average AED 24,000 — 50% variance exceeds the 10% threshold. Per ESC3 policy, agent cannot auto-decide. Escalated to P5 human review.",
            "twenty_pct_rule_passed": None,
            "period_rule_passed": None,
            "recommended_monthly_arrears_payment": 0,
            "emi_during_rescheduling_period": 0,
            "emi_after_rescheduling_period": 4100,
            "recommended_duration_months": 0,
            "rationale": {
                "en": (
                    "V2 cross-check failed: auto-fetched bank deposits (AED 24,000 avg) deviate "
                    ">10% from salary certificate (AED 16,000). Per ESC3 policy the agent must "
                    "not auto-decide. Escalated to human reviewer (P5)."
                ),
                "ar": (
                    "فشل التحقق المتقاطع V2: الودائع البنكية المجلوبة تلقائياً "
                    "(متوسط 24,000 درهم) تنحرف بأكثر من 10% عن شهادة الراتب (16,000 درهم). "
                    "وفقاً لسياسة ESC3 لا يمكن للوكيل اتخاذ قرار تلقائي. "
                    "تم التصعيد إلى المراجع البشري (P5)."
                ),
            },
            "add_mandate": None,
        },
        "application_update": {
            "status": "needs_human_review",
            "risk_level": "medium",
            "confidence_score": 52,
            "final_decision": "needs_human_review",
            "decision_rationale": (
                "V2 income cross-check failed — declared salary (AED 16,000) deviates 50% from "
                "auto-fetched bank average (AED 24,000). Per policy rule ESC3, agent cannot "
                "auto-decide. Escalated to human review (P5)."
            ),
            "hardship_permanence": "UNKNOWN",
            "human_review_required": True,
        },
    },

    # ── Case 4 — Fatima — P3 (maintain EMI, spread arrears), auto-approved ──
    {
        "validation": {
            "salary_certificate_valid": True,
            "bank_statement_available": True,
            "salary_match_status": "match",
            "document_completeness_status": "complete",
            "cross_document_consistency": "consistent",
            "extracted_financials": {
                "employer_name": "Roads and Transport Authority",
                "declared_salary": 19800,
                "avg_bank_salary": 19600,
                "variance_pct": 1.0,
            },
            "bank_statement_source": "UPLOADED",
        },
        "recommendation": {
            "path_taken": "P3",
            "final_decision": "approved_automatically",
            "proposed_deduction_rate_pct": 14.6,
            "income_change_pct": 1.5,
            "per_member_income": 4950.0,
            "case_summary": "Fatima Al Shamsi, RTA employee, temporary hardship fully resolved. 6 overdue payments totalling AED 17,400. Stable income consistent with origination.",
            "reasoning": "Income stable and 1.5% above origination — below 3% threshold for P1/P2. Temporary hardship resolved; per-member income AED 4,950 above threshold. P3 spreads arrears over remaining 156-month term. DTI 14.6%.",
            "twenty_pct_rule_passed": True,
            "period_rule_passed": True,
            "recommended_monthly_arrears_payment": 1117,
            "emi_during_rescheduling_period": 4017,
            "emi_after_rescheduling_period": 2900,
            "recommended_duration_months": 156,
            "rationale": {
                "en": (
                    "Temporary hardship resolved; income consistent. Arrears spread over "
                    "remaining 156-month term while maintaining current EMI (P3). DTI 14.6%."
                ),
                "ar": (
                    "تم حل الضائقة المؤقتة؛ الدخل متسق. المتأخرات موزعة على الفترة المتبقية "
                    "البالغة 156 شهراً مع الحفاظ على القسط الحالي (P3). نسبة الدين للدخل 14.6%."
                ),
            },
            "add_mandate": {
                "mandate_status": "PENDING_SIGNATURE",
                "agreed_emi": 4017,
                "first_deduction_date": "2026-07-01",
                "account_number_masked": "****4388",
                "bank_name": "Abu Dhabi Islamic Bank",
            },
        },
        "application_update": {
            "status": "approved_automatically",
            "risk_level": "low",
            "confidence_score": 92,
            "final_decision": "approved_automatically",
            "decision_rationale": (
                "Temporary hardship resolved. P3 plan spreads arrears over remaining "
                "156-month term without changing EMI. DTI 14.6%, within the 20% cap. Auto-approved."
            ),
            "hardship_permanence": "TEMPORARY",
            "human_review_required": False,
        },
    },
]


def _rand_id():
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"DEMO-2026-{suffix}"


def seed_agent_output(app_id: str, ai_output: dict) -> None:
    """Write validation_results, recommendations, and update the application row."""
    val = {**ai_output["validation"], "application_id": app_id}
    sb.table("validation_results").upsert(val, on_conflict="application_id").execute()
    print("  ✓ validation_results written")

    rec_data = {**ai_output["recommendation"], "application_id": app_id}
    if rec_data.get("add_mandate"):
        rec_data["add_mandate"] = {
            "mandate_id": f"ADD-{app_id}",
            **rec_data["add_mandate"],
        }
    sb.table("recommendations").upsert(rec_data, on_conflict="application_id").execute()
    print("  ✓ recommendations written")

    sb.table("applications").update(ai_output["application_update"]).eq("application_id", app_id).execute()
    upd = ai_output["application_update"]
    print(f"  ✓ application updated → status={upd['status']}, risk={upd['risk_level']}")

    sb.table("audit_logs").insert({
        "application_id": app_id,
        "action_type": "AI_AGENT_COMPLETED",
        "action_description": (
            f"AI agent processed application via seed script. "
            f"Path: {ai_output['recommendation']['path_taken']}. "
            f"Decision: {upd['final_decision']}."
        ),
        "performed_by": "seed_script",
    }).execute()
    print("  ✓ audit_log entry written (AI_AGENT_COMPLETED)")


def seed_case(case: dict, loan: dict, ai_output: dict) -> str:
    app_id = _rand_id()
    print(f"\n{'─'*60}")
    print(f"Seeding: {case['label']}  →  {app_id}")

    # 1. Insert application row
    sb.table("applications").insert({
        "application_id": app_id,
        "applicant_name": case["label"],
        "applicant_email": f"{app_id.lower()}@demo.ae",
        "current_salary": case["salary"],
        "family_size": case["household_size"],
        "hardship_type": case["hardship_type"],
        "remarks": case["remarks"],
        "applicant_abroad": False,
        "declaration_accepted": True,
        "status": "submitted",
        "human_review_required": False,
    }).execute()

    # 2. Insert loan_details row (salary_at_origination now included — migration #9 added the column)
    sb.table("loan_details").insert({
        "application_id": app_id,
        **loan,
    }).execute()

    # 3. Upload documents and insert document metadata
    for doc_type, filename in case["documents"].items():
        pdf_path = case["dir"] / filename
        if not pdf_path.exists():
            print(f"  ⚠ Skipping {filename} — file not found")
            continue

        storage_path = f"applications/{app_id}/{doc_type}/{filename}"
        with open(pdf_path, "rb") as f:
            sb.storage.from_(DOCUMENTS_BUCKET).upload(
                storage_path,
                f.read(),
                {"content-type": "application/pdf", "upsert": "true"},
            )

        url_data = sb.storage.from_(DOCUMENTS_BUCKET).get_public_url(storage_path)
        file_url = url_data if isinstance(url_data, str) else (url_data.get("publicUrl") or "")

        sb.table("documents").insert({
            "application_id": app_id,
            "document_type": doc_type,
            "file_name": filename,
            "file_url": file_url,
            "storage_path": storage_path,
            "validation_status": "pending",
        }).execute()
        print(f"  ✓ Uploaded {doc_type}: {filename}")

    # 4. Submission audit log
    sb.table("audit_logs").insert({
        "application_id": app_id,
        "action_type": "APPLICATION_SUBMITTED",
        "action_description": f"{case['label']} submitted a rescheduling application via demo seed.",
        "performed_by": "seed_script",
    }).execute()

    # 5. Write AI-agent output (validation_results, recommendations, application update)
    print("  → Writing AI agent output …")
    seed_agent_output(app_id, ai_output)

    print(f"  → Application ID: {app_id}")
    return app_id


if __name__ == "__main__":
    print("SZHP Demo Seeder — seeding 4 test cases into Supabase")
    seeded_ids = []
    for case, loan, ai_output in zip(CASES, LOAN_DATA, AI_OUTPUTS):
        app_id = seed_case(case, loan, ai_output)
        seeded_ids.append(app_id)

    print(f"\n{'═'*60}")
    print("Seeding complete. Application IDs:")
    for i, aid in enumerate(seeded_ids, 1):
        print(f"  Case {i}: {aid}")

    print("\nTo process all cases with the AI agent instead:")
    ids_json = json.dumps(seeded_ids)
    print(f"  curl -X POST http://localhost:8000/process-batch -H 'Content-Type: application/json' -d '{ids_json}'")
    print("\nOr process one at a time:")
    for aid in seeded_ids:
        print(f"  curl -X POST http://localhost:8000/process/{aid}")
