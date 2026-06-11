from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

_sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def fetch_application(application_id: str) -> dict:
    """Fetch the full application record with loan_details and documents."""
    result = (
        _sb.table("applications")
        .select("*, loan_details(*), documents(*)")
        .eq("application_id", application_id)
        .single()
        .execute()
    )
    if not result.data:
        raise ValueError(f"Application {application_id} not found")
    return result.data
