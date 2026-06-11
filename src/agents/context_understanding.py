"""
A4 — Context Understanding Agent stub.

Classifies the applicant's hardship type and severity from application remarks,
medical extraction flags, and supporting document metadata.

Cited rules: S4, S5.
"""

from typing import Literal

from pydantic import BaseModel


class ContextAnalysis(BaseModel):
    """Structured output from A4 (Context Understanding Agent).
    Feeds into A5 (Policy Path Engine) path selection logic.
    Cited rules: S4, S5, ESC9."""

    hardship_type: Literal[
        "MEDICAL_HARDSHIP",
        "BEREAVEMENT",
        "INCOME_REDUCTION",
        "UNEMPLOYMENT",
        "LEGAL_ENCUMBRANCE",
        "TEMPORARY_CIRCUMSTANCE",
        "TEMPORARY_RESOLVED",
        "UNKNOWN",
    ]
    hardship_permanence: Literal[
        "TEMPORARY",
        "LONG_TERM",    # > 12 months expected but not permanent
        "PERMANENT",    # medical board / confirmed permanent
        "UNKNOWN",      # insufficient evidence to classify
    ]
    hardship_evidence: str           # brief description of supporting evidence
    medical_condition: str | None = None
    is_permanent_hardship: bool = False
    supporting_doc_types: list[str] = []   # document types that substantiate the claim


async def analyse_context(
    remarks: str,
    has_medical_hardship: bool,
    hardship_permanent: bool,
    medical_condition: str | None,
    document_types: list[str],
) -> ContextAnalysis:
    """Classify hardship type and severity from available context.

    This is a deterministic stub — in the full agent this analysis would
    be performed by A4's LLM reasoning loop with access to document metadata.
    Cited rules: S4, S5.
    """
    raise NotImplementedError("A4 stub — full implementation pending.")
