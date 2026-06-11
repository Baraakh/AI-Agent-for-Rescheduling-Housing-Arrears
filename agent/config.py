import os
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
DOCUMENTS_BUCKET = "application-documents"
CLAUDE_MODEL = "claude-sonnet-4-6"                    # orchestrator (reasoning + tool selection)
CLAUDE_EXTRACT_MODEL = "claude-haiku-4-5-20251001"    # PDF extraction (structured JSON only)
MAX_TOKENS = 8192
