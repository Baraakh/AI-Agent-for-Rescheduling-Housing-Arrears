"""
Tests for src/tools/bank_statement_fetch_mock.py.

Run with pytest (once installed):
    pip install pytest pytest-asyncio
    PYTHONPATH=. pytest tests/test_bank_fetch_mock.py -v

Or run the standalone smoke script instead:
    PYTHONPATH=. python3 scripts/smoke_test_bank_fetch.py
"""

from unittest.mock import patch

import pytest

from src.tools.bank_statement_fetch_mock import (
    BankFetchError,
    BankStatementResult,
    fetch_bank_statement,
)

_KNOWN_ID = "784-1988-3471902-6"      # Case 1 — Khalid
_UNKNOWN_ID = "784-0000-0000000-0"


@pytest.mark.asyncio
async def test_auto_fetch_returns_valid_result():
    """fetch_bank_statement returns a populated BankStatementResult for a known Emirates ID."""
    with patch("src.tools.bank_statement_fetch_mock.random.random", return_value=1.0):
        result = await fetch_bank_statement(_KNOWN_ID)

    assert isinstance(result, BankStatementResult)
    assert result.emirates_id == _KNOWN_ID
    assert result.period_months == 6
    assert result.avg_monthly_salary > 0
    assert len(result.monthly_salary_credits) == 6
    assert len(result.transactions) > 0


@pytest.mark.asyncio
async def test_unknown_emirates_id_raises_bank_fetch_error():
    """fetch_bank_statement raises BankFetchError for an unregistered Emirates ID."""
    with patch("src.tools.bank_statement_fetch_mock.random.random", return_value=1.0):
        with pytest.raises(BankFetchError):
            await fetch_bank_statement(_UNKNOWN_ID)


@pytest.mark.asyncio
async def test_source_field_is_auto_fetched_when_called_programmatically():
    """BankStatementResult.source is always AUTO_FETCHED when called via fetch_bank_statement."""
    with patch("src.tools.bank_statement_fetch_mock.random.random", return_value=1.0):
        result = await fetch_bank_statement(_KNOWN_ID)

    assert result.source == "AUTO_FETCHED"
