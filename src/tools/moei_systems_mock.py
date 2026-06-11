"""
Mock for MOEI Systems integration.

In production this module would call the MOEI REST API to retrieve beneficiary
loan data, arrears, and payment history. In the demo environment it loads data
from the fixture files in data/fixtures/.

Cited rules: R1, R2, S6.
"""

import asyncio
import json
from decimal import Decimal
from pathlib import Path
from datetime import date
from typing import Literal

from pydantic import BaseModel


# ── Exceptions ────────────────────────────────────────────────────────────────

class MOEISystemsError(Exception):
    """Raised when the MOEI systems mock cannot service a request."""


# ── Data models ───────────────────────────────────────────────────────────────

class LoanRecord(BaseModel):
    loan_id: str
    original_amount: Decimal
    disbursement_date: date
    original_term_months: int
    months_elapsed: int
    remaining_term_months: int
    current_emi: Decimal
    outstanding_balance: Decimal
    salary_at_origination: Decimal


class ArrearsRecord(BaseModel):
    total_arrears_amount: Decimal
    unpaid_installments: int
    months_overdue: int
    first_missed_month: str          # "YYYY-MM"
    status: Literal["ACCRUING", "FROZEN", "SETTLED"]


class PaymentRecord(BaseModel):
    month: str                       # "YYYY-MM"
    due: Decimal
    paid: Decimal
    status: Literal["PAID", "MISSED", "PARTIAL"]


class MOEIBeneficiaryRecord(BaseModel):
    """Full MOEI record for a registered SZHP beneficiary.
    Returned by fetch_moei_record(). Cites R1, R2, S6."""
    beneficiary_id: str
    emirates_id: str
    programme: str
    loan: LoanRecord
    arrears: ArrearsRecord
    payment_history: list[PaymentRecord]


# ── Fixture loader ─────────────────────────────────────────────────────────────

_FIXTURES_DIR = Path(__file__).parent.parent.parent / "data" / "fixtures"

_EMIRATES_ID_TO_FIXTURE: dict[str, str] = {
    "784-1988-3471902-6": "case1_khalid_al_mazrouei.json",
    "784-1980-6628451-2": "case2_aisha_al_nuaimi.json",
    "784-1985-2249076-3": "case3_mohammed_al_hammadi.json",
    "784-1990-7714388-1": "case4_fatima_al_shamsi.json",
}


def _load_fixture(emirates_id: str) -> dict:
    filename = _EMIRATES_ID_TO_FIXTURE.get(emirates_id)
    if not filename:
        raise MOEISystemsError(
            f"Emirates ID {emirates_id!r} not found in MOEI Systems mock fixtures."
        )
    path = _FIXTURES_DIR / filename
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


# ── Public interface ───────────────────────────────────────────────────────────

async def fetch_moei_record(emirates_id: str) -> MOEIBeneficiaryRecord:
    """Fetch the MOEI loan and arrears record for a beneficiary.

    Simulates ~150ms network latency.
    Raises MOEISystemsError if the Emirates ID is not registered.
    """
    await asyncio.sleep(0.15)
    data = _load_fixture(emirates_id)
    moei = data["moei_systems"]
    return MOEIBeneficiaryRecord(
        beneficiary_id=moei["beneficiary_id"],
        emirates_id=moei["emirates_id"],
        programme=moei["programme"],
        loan=LoanRecord(**moei["loan"]),
        arrears=ArrearsRecord(**moei["arrears"]),
        payment_history=[PaymentRecord(**p) for p in moei["payment_history"]],
    )
