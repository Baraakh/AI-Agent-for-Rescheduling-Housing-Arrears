import logging
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

logger = logging.getLogger(__name__)

_sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Normalize Claude's free-text output to the exact values the DB CHECK constraints allow.
# Claude often generates descriptive strings like "PASS — 0.0% discrepancy" or "MATCHED".
_SALARY_MATCH_MAP = {
    # passing values
    "pass": "match", "passed": "match", "match": "match", "matched": "match",
    "verified": "match", "consistent": "match",
    # failing values
    "fail": "mismatch", "failed": "mismatch", "mismatch": "mismatch",
    "discrepancy": "mismatch", "error": "mismatch",
}
_COMPLETENESS_MAP = {
    "complete": "complete", "complete_with_optional": "complete",
    "all": "complete", "full": "complete",
    "incomplete": "incomplete", "missing": "incomplete",
    "partial": "partial",
}
_CONSISTENCY_MAP = {
    "consistent": "consistent", "no_issues": "consistent", "verified": "consistent",
    "consistent_": "consistent",  # catches "consistent — ..." prefix
    "inconsistent": "inconsistent", "discrepancy": "inconsistent", "mismatch": "inconsistent",
}

def _normalize(value: str | None, mapping: dict, default: str, field: str = "") -> str:
    if not value:
        return default
    lower = str(value).lower().strip()
    if lower in mapping:
        return mapping[lower]
    for key, canonical in mapping.items():
        if lower.startswith(key):
            return canonical
    logger.warning("db_writer: unrecognised %s value %r — falling back to %r", field, value, default)
    return default


def write_validation_results(data: dict) -> dict:
    """Upsert into validation_results, normalising enum fields before writing."""
    cleaned = dict(data)
    cleaned["salary_match_status"] = _normalize(
        cleaned.get("salary_match_status"), _SALARY_MATCH_MAP, "pending", "salary_match_status"
    )
    cleaned["document_completeness_status"] = _normalize(
        cleaned.get("document_completeness_status"), _COMPLETENESS_MAP, "complete", "document_completeness_status"
    )
    cleaned["cross_document_consistency"] = _normalize(
        cleaned.get("cross_document_consistency"), _CONSISTENCY_MAP, "consistent", "cross_document_consistency"
    )
    result = (
        _sb.table("validation_results")
        .upsert(cleaned, on_conflict="application_id")
        .execute()
    )
    return result.data[0] if result.data else {}


def write_recommendation(data: dict) -> dict:
    """Upsert into recommendations. application_id must be unique."""
    result = (
        _sb.table("recommendations")
        .upsert(data, on_conflict="application_id")
        .execute()
    )
    return result.data[0] if result.data else {}


def update_application(application_id: str, updates: dict) -> dict:
    """Update the applications row with agent results."""
    result = (
        _sb.table("applications")
        .update(updates)
        .eq("application_id", application_id)
        .execute()
    )
    return result.data[0] if result.data else {}


def write_audit_log(application_id: str, action_type: str, description: str) -> dict:
    """Append one entry to audit_logs."""
    result = (
        _sb.table("audit_logs")
        .insert({
            "application_id": application_id,
            "action_type": action_type,
            "action_description": description,
            "performed_by": "ai_agent_v1",
        })
        .execute()
    )
    return result.data[0] if result.data else {}


def set_pending_documents_status(application_id: str, missing_documents: list, reason: str) -> dict:
    """Set application to pending_documents and store the missing document list."""
    update_application(application_id, {
        "status": "pending_documents",
        "missing_documents": missing_documents,
        "decision_rationale": reason,
        "human_review_required": False,
    })
    write_audit_log(
        application_id,
        "PENDING_DOCUMENTS",
        f"Additional documents required: {'; '.join(missing_documents)}.",
    )
    return {
        "success": True,
        "status": "pending_documents",
        "missing_documents": missing_documents,
    }
