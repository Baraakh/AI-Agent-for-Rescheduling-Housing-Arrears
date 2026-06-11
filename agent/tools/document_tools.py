import base64
import json
import re
import anthropic
from supabase import create_client
from config import (
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
    DOCUMENTS_BUCKET, CLAUDE_EXTRACT_MODEL, ANTHROPIC_API_KEY
)

_sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
_claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def _pdf_b64(storage_path: str) -> str:
    data = _sb.storage.from_(DOCUMENTS_BUCKET).download(storage_path)
    return base64.standard_b64encode(data).decode()


def _extract(storage_path: str, prompt: str) -> dict:
    """Send a PDF to Claude as a base64 document and extract structured data."""
    try:
        b64 = _pdf_b64(storage_path)
    except Exception as e:
        return {"error": f"Could not download {storage_path}: {e}"}

    msg = _claude.messages.create(
        model=CLAUDE_EXTRACT_MODEL,
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": b64,
                    },
                },
                {"type": "text", "text": prompt},
            ],
        }],
    )
    text = msg.content[0].text
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    return {"raw_response": text}


def extract_salary_certificate(storage_path: str) -> dict:
    """Extract monthly salary and employer from a salary certificate PDF."""
    return _extract(
        storage_path,
        'Extract from this salary certificate. Reply ONLY with JSON:\n'
        '{"cert_salary": <monthly salary in AED as float or null>, '
        '"employer_name": "<string or null>", '
        '"document_date": "<YYYY-MM or null>"}',
    )


def extract_bank_statement(storage_path: str) -> dict:
    """Extract 6-month average salary credit from a bank statement PDF."""
    return _extract(
        storage_path,
        'Analyze the salary/income CREDITS in this bank statement over the last 6 months. '
        'Reply ONLY with JSON:\n'
        '{"bank_6mo_avg": <average monthly salary credit as float or null>, '
        '"months_analyzed": <number of months as int>, '
        '"monthly_credits": [<list of individual monthly salary amounts as floats>]}',
    )


def extract_medical_report(storage_path: str) -> dict:
    """Extract medical hardship status from a medical report or hardship letter PDF."""
    return _extract(
        storage_path,
        'Analyze this medical report or hardship letter. Reply ONLY with JSON:\n'
        '{"has_medical_hardship": <true or false>, '
        '"hardship_permanent": <true if permanent disability/unfit-for-work, false if temporary>, '
        '"medical_condition": "<condition name or null>", '
        '"issuing_authority": "<hospital or authority or null>"}',
    )
