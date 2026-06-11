"""
Standalone smoke test — no pytest required.

Run from the project root:
    PYTHONPATH=. python3 scripts/smoke_test_bank_fetch.py
"""

import asyncio
from decimal import Decimal
from unittest.mock import patch

from src.tools.bank_statement_fetch_mock import (
    BankFetchError,
    BankStatementResult,
    fetch_bank_statement,
)
from src.models.decision import ADDMandate, FinalRecommendation
from src.agents.context_understanding import ContextAnalysis


def _pass(label: str) -> None:
    print(f"  PASS  {label}")


def _fail(label: str, err: Exception) -> None:
    print(f"  FAIL  {label}: {err}")
    raise SystemExit(1)


async def test_bank_fetch() -> None:
    print("\n── Bank Statement Auto-Fetch ──────────────────────────────────────")

    known_id = "784-1988-3471902-6"
    unknown_id = "784-0000-0000000-0"

    # 1. Known ID returns valid result
    with patch("src.tools.bank_statement_fetch_mock.random.random", return_value=1.0):
        result = await fetch_bank_statement(known_id)
    try:
        assert isinstance(result, BankStatementResult)
        assert result.source == "AUTO_FETCHED"
        assert result.period_months == 6
        assert result.avg_monthly_salary > 0
        assert len(result.monthly_salary_credits) == 6
        _pass(f"fetch known ID → avg_monthly_salary = AED {result.avg_monthly_salary:,}")
    except AssertionError as e:
        _fail("fetch known ID", e)

    # 2. Unknown ID raises BankFetchError
    raised = False
    with patch("src.tools.bank_statement_fetch_mock.random.random", return_value=1.0):
        try:
            await fetch_bank_statement(unknown_id)
        except BankFetchError:
            raised = True
    if not raised:
        _fail("unknown ID", AssertionError("Expected BankFetchError was not raised"))
    _pass("unknown Emirates ID raises BankFetchError")

    # 3. source field is AUTO_FETCHED
    with patch("src.tools.bank_statement_fetch_mock.random.random", return_value=1.0):
        r = await fetch_bank_statement(known_id)
    try:
        assert r.source == "AUTO_FETCHED"
        _pass(f"source = {r.source!r}")
    except AssertionError as e:
        _fail("source field", e)


def test_add_mandate_model() -> None:
    print("\n── ADDMandate Pydantic Model ───────────────────────────────────────")
    from datetime import date, datetime, timezone

    try:
        mandate = ADDMandate(
            mandate_id="ADD-APP-TEST-001",
            beneficiary_id="SZHP-BEN-100417",
            emirates_id="784-1988-3471902-6",
            bank_name="First Abu Dhabi Bank",
            account_number_masked="****7720",
            agreed_emi=Decimal("3400"),
            first_deduction_date=date(2026, 7, 1),
            mandate_status="PENDING_SIGNATURE",
            generated_at=datetime.now(timezone.utc),
            mandate_text_en="MOEI is authorised to deduct AED 3,400 monthly.",
            mandate_text_ar="يُخوَّل وزارة الطاقة والبنية التحتية بخصم 3,400 درهم شهرياً.",
        )
        assert mandate.mandate_status == "PENDING_SIGNATURE"
        assert mandate.signed_at is None
        _pass(f"ADDMandate created — status={mandate.mandate_status}")
    except Exception as e:
        _fail("ADDMandate construction", e)


def test_context_analysis_model() -> None:
    print("\n── ContextAnalysis hardship_permanence field ──────────────────────")

    try:
        ctx = ContextAnalysis(
            hardship_type="MEDICAL_HARDSHIP",
            hardship_permanence="PERMANENT",
            hardship_evidence="MOHAP medical board decision — permanent unfit for work.",
            medical_condition="Multiple Sclerosis (ICD-10 G35)",
            is_permanent_hardship=True,
        )
        assert ctx.hardship_permanence == "PERMANENT"
        _pass(f"ContextAnalysis hardship_permanence = {ctx.hardship_permanence!r}")
    except Exception as e:
        _fail("ContextAnalysis construction", e)

    # Invalid value should fail validation
    try:
        ContextAnalysis(
            hardship_type="MEDICAL_HARDSHIP",
            hardship_permanence="INVALID_VALUE",
            hardship_evidence="test",
        )
        _fail("invalid hardship_permanence", AssertionError("Should have raised ValidationError"))
    except Exception:
        _pass("invalid hardship_permanence correctly rejected by Pydantic")


async def main() -> None:
    await test_bank_fetch()
    test_add_mandate_model()
    test_context_analysis_model()
    print("\n  All checks passed.\n")


if __name__ == "__main__":
    asyncio.run(main())
