"""
Mock for UAE Bank Data auto-fetch integration.

In production this module would call the centralised UAE bank data API using
Emirates ID + account linkage to retrieve a 6-month bank statement. In the demo
environment it synthesises transactions from the fixtures in data/fixtures/.

When the applicant has not uploaded a bank statement, A2 (Document Understanding)
calls fetch_bank_statement() before extraction proceeds. The source field on the
result distinguishes uploaded vs auto-fetched for audit purposes.

Cited rules: V2, ESC3.
"""

import asyncio
import json
import random
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Literal

from pydantic import BaseModel


# ── Exceptions ────────────────────────────────────────────────────────────────

class BankFetchError(Exception):
    """Raised when the bank data fetch fails (unknown Emirates ID or simulated error)."""


# ── Data models ───────────────────────────────────────────────────────────────

class BankTransaction(BaseModel):
    date: date
    description: str
    debit: Decimal | None
    credit: Decimal | None
    balance: Decimal
    is_salary_credit: bool           # flagged by the mock


class MonthlySalaryCredit(BaseModel):
    month: str                       # "YYYY-MM"
    employer_name: str
    amount: Decimal


class BankStatementResult(BaseModel):
    """6-month bank statement — either uploaded by the applicant or auto-fetched.
    Cited rules: V2, ESC3."""
    source: Literal["UPLOADED", "AUTO_FETCHED"]
    emirates_id: str
    account_holder: str
    account_number: str              # masked: last 4 digits only
    bank_name: str
    period_months: int
    transactions: list[BankTransaction]
    monthly_salary_credits: list[MonthlySalaryCredit]
    avg_monthly_salary: Decimal
    fetch_timestamp: datetime


# ── Fixture loader ─────────────────────────────────────────────────────────────

_FIXTURES_DIR = Path(__file__).parent.parent.parent / "data" / "fixtures"

_EMIRATES_ID_TO_FIXTURE: dict[str, str] = {
    "784-1988-3471902-6": "case1_khalid_al_mazrouei.json",
    "784-1980-6628451-2": "case2_aisha_al_nuaimi.json",
    "784-1985-2249076-3": "case3_mohammed_al_hammadi.json",
    "784-1990-7714388-1": "case4_fatima_al_shamsi.json",
}

_SIMULATED_ERROR_RATE = 0.05  # ASSUMPTION A_001: 5% transient error rate


def _load_fixture(emirates_id: str) -> dict:
    filename = _EMIRATES_ID_TO_FIXTURE.get(emirates_id)
    if not filename:
        raise BankFetchError(
            f"Emirates ID {emirates_id!r} not found in bank data mock — "
            "no account linkage registered."
        )
    path = _FIXTURES_DIR / filename
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _synthesise_transactions(
    monthly_credits: list[dict],
    employer_name: str,
    balance_start: Decimal = Decimal("12000"),
) -> list[BankTransaction]:
    """Build a plausible transaction list from monthly salary credit entries."""
    transactions: list[BankTransaction] = []
    balance = balance_start

    for entry in monthly_credits:
        year, mon = entry["month"].split("-")
        salary = Decimal(str(entry["salary_credit"]))

        # Salary credit — first working day of the month (approximate: day 1)
        balance += salary
        transactions.append(BankTransaction(
            date=date(int(year), int(mon), 1),
            description=f"SALARY CREDIT - {employer_name}",
            debit=None,
            credit=salary,
            balance=balance,
            is_salary_credit=True,
        ))

        # A few synthetic debits — utility, rent partial, misc
        for day, desc, amount_frac in [
            (5,  "DEWA UTILITY PAYMENT",      Decimal("0.04")),
            (10, "SUPERMARKET",               Decimal("0.02")),
            (15, "HOUSING LOAN INSTALMENT",   Decimal("0.10")),
            (25, "PHONE BILL",                Decimal("0.01")),
        ]:
            debit_amount = (salary * amount_frac).quantize(Decimal("0.01"))
            balance -= debit_amount
            transactions.append(BankTransaction(
                date=date(int(year), int(mon), day),
                description=desc,
                debit=debit_amount,
                credit=None,
                balance=balance,
                is_salary_credit=False,
            ))

    return sorted(transactions, key=lambda t: t.date)


# ── Public interface ───────────────────────────────────────────────────────────

async def fetch_bank_statement(
    emirates_id: str,
    months: int = 6,
) -> BankStatementResult:
    """Auto-fetch a 6-month bank statement for the given Emirates ID.

    Simulates ~200ms network latency and a 5% transient error rate.
    Raises BankFetchError for unknown Emirates IDs or on simulated failures.
    The returned source field is always AUTO_FETCHED when called programmatically.

    Cited rules: V2, ESC3.
    """
    await asyncio.sleep(0.20)  # ASSUMPTION A_001: ~200ms simulated latency

    if random.random() < _SIMULATED_ERROR_RATE:  # ASSUMPTION A_001: 5% error rate
        raise BankFetchError(
            f"Transient bank data fetch error for Emirates ID {emirates_id!r}. "
            "Retry or escalate to ESC1."
        )

    data = _load_fixture(emirates_id)
    uae_pass = data["uae_pass"]
    bs = data["bank_statement_fixture"]

    credit_entries = bs["months"][-months:]
    employer = bs["employer_name"]

    monthly_salary_credits = [
        MonthlySalaryCredit(
            month=entry["month"],
            employer_name=employer,
            amount=Decimal(str(entry["salary_credit"])),
        )
        for entry in credit_entries
    ]

    total = sum(c.amount for c in monthly_salary_credits)
    avg = (total / len(monthly_salary_credits)).quantize(Decimal("0.01"))

    transactions = _synthesise_transactions(credit_entries, employer)

    return BankStatementResult(
        source="AUTO_FETCHED",
        emirates_id=emirates_id,
        account_holder=uae_pass["full_name_en"],
        account_number=bs["account_number_masked"],
        bank_name=bs["bank_name"],
        period_months=len(credit_entries),
        transactions=transactions,
        monthly_salary_credits=monthly_salary_credits,
        avg_monthly_salary=avg,
        fetch_timestamp=datetime.now(timezone.utc),
    )
