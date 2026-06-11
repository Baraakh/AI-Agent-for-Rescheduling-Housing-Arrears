"""
Pydantic v2 models for SZHP application data.

These models describe the shape of data as it moves through the agent pipeline.
They are distinct from the Supabase row schema — they are the agent's internal
representation after normalisation.
"""

from decimal import Decimal
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class LoanDetails(BaseModel):
    """Loan parameters retrieved from MOEI Systems / Supabase loan_details."""
    loan_id: str
    original_amount: Decimal
    remaining_term_months: int
    current_emi: Decimal
    outstanding_balance: Decimal
    salary_at_origination: Decimal
    total_arrears_amount: Decimal
    months_overdue: int


class UploadedDocument(BaseModel):
    document_type: str               # salary_certificate | bank_statement | medical_report | …
    storage_path: str                # Supabase Storage path
    uploaded_at: datetime | None = None


class ApplicationRecord(BaseModel):
    """Full application record as fetched by A1 (Intake & Validation Agent)."""
    application_id: str
    beneficiary_id: str
    emirates_id: str
    full_name_en: str
    full_name_ar: str | None = None
    monthly_salary: Decimal
    household_size: int
    hardship_type: str               # as declared by applicant
    hardship_remarks: str | None = None
    residing_abroad: bool = False
    status: Literal[
        "submitted",
        "pending_documents",
        "processing",
        "approved_automatically",
        "needs_human_review",
        "completed",
        "rejected",
    ]
    loan: LoanDetails
    documents: list[UploadedDocument]
    created_at: datetime | None = None


class DocumentExtractionResult(BaseModel):
    """Structured output from A2 (Document Understanding Agent)."""
    cert_salary: Decimal | None = None
    employer_name: str | None = None
    document_date: str | None = None           # "YYYY-MM"
    bank_6mo_avg: Decimal | None = None
    monthly_credits: list[Decimal] = []
    has_medical_hardship: bool = False
    hardship_permanent: bool = False
    medical_condition: str | None = None
    issuing_authority: str | None = None
    bank_statement_source: Literal["UPLOADED", "AUTO_FETCHED", "NOT_AVAILABLE"] = "NOT_AVAILABLE"


class VerificationResult(BaseModel):
    """Output from A3 (Income Verification Agent)."""
    v2_passed: bool
    discrepancy_pct: float
    severity: Literal["PASS", "MINOR", "MAJOR", "UNVERIFIABLE"]
    cert_salary: Decimal
    bank_6mo_avg: Decimal | None
    s6_binding: bool
    per_member_income: Decimal
    household_size: int
    identified_issues: list[str] = []
