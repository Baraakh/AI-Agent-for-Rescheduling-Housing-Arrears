"""
Wipes all application data from Supabase — tables and storage bucket.
Run from the agent/ directory with the venv active:
    python clear_all_data.py
"""

from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DOCUMENTS_BUCKET

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

TABLES = [
    "audit_logs",
    "recommendations",
    "validation_results",
    "documents",
    "loan_details",
    "applications",
]


def clear_tables():
    for table in TABLES:
        # Delete all rows — using neq on id covers every row
        try:
            result = sb.table(table).delete().neq("id", 0).execute()
            count = len(result.data) if result.data else "?"
            print(f"  ✓ {table}: {count} rows deleted")
        except Exception as e:
            # Some tables use application_id as PK, fallback
            try:
                result = sb.table(table).delete().neq("application_id", "").execute()
                count = len(result.data) if result.data else "?"
                print(f"  ✓ {table}: {count} rows deleted")
            except Exception as e2:
                print(f"  ✗ {table}: {e2}")


def clear_storage():
    try:
        files = sb.storage.from_(DOCUMENTS_BUCKET).list()
    except Exception as e:
        print(f"  ✗ Could not list bucket root: {e}")
        return

    if not files:
        print(f"  ✓ Storage bucket '{DOCUMENTS_BUCKET}' already empty")
        return

    # The bucket is structured as applications/{app_id}/...
    # List all top-level folders then recursively collect file paths
    all_paths = []

    for folder in files:
        folder_name = folder.get("name", "")
        if not folder_name:
            continue
        try:
            sub = sb.storage.from_(DOCUMENTS_BUCKET).list(folder_name)
            for subfolder in (sub or []):
                sub_name = subfolder.get("name", "")
                path = f"{folder_name}/{sub_name}"
                try:
                    files_inner = sb.storage.from_(DOCUMENTS_BUCKET).list(path)
                    for f in (files_inner or []):
                        all_paths.append(f"{path}/{f['name']}")
                except Exception:
                    all_paths.append(path)
        except Exception:
            all_paths.append(folder_name)

    if not all_paths:
        print(f"  ✓ No files found in storage")
        return

    # Delete in batches of 100 (Supabase limit)
    batch_size = 100
    total_deleted = 0
    for i in range(0, len(all_paths), batch_size):
        batch = all_paths[i : i + batch_size]
        try:
            sb.storage.from_(DOCUMENTS_BUCKET).remove(batch)
            total_deleted += len(batch)
        except Exception as e:
            print(f"  ✗ Storage batch delete error: {e}")

    print(f"  ✓ Storage '{DOCUMENTS_BUCKET}': {total_deleted} files deleted")


if __name__ == "__main__":
    print("Clearing Supabase tables...")
    clear_tables()
    print("Clearing storage bucket...")
    clear_storage()
    print("\nDone — Supabase is clean.")
