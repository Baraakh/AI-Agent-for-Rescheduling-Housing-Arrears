import json
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from agent_orchestrator import run_agent
from agent_logger import LOGS_DIR

_executor = ThreadPoolExecutor(max_workers=4)
_running: set[str] = set()  # application IDs currently being processed

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SZHP AI Agent API",
    description="AI agent for housing loan arrears rescheduling analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "agent": "SZHP AI Loan Analyst v1"}


def _run_in_background(application_id: str):
    """Run the blocking agent in a thread pool so FastAPI's event loop stays free."""
    try:
        run_agent(application_id)
    except Exception as exc:
        logger.error(f"Background agent failed for {application_id}: {exc}", exc_info=True)
    finally:
        _running.discard(application_id)


@app.post("/process/{application_id}")
async def process_application(application_id: str, background_tasks: BackgroundTasks):
    """
    Trigger the AI agent to analyse one application end-to-end.
    Returns immediately with 202 Accepted; the agent runs in the background.
    Called automatically after applicant submits, or manually from the dashboard.
    """
    if application_id in _running:
        logger.info(f"Agent already running for {application_id} — ignoring duplicate request")
        return {"accepted": False, "application_id": application_id, "reason": "already_processing"}

    _running.add(application_id)
    logger.info(f"Queuing agent for: {application_id}")
    background_tasks.add_task(_run_in_background, application_id)
    return {"accepted": True, "application_id": application_id}


@app.get("/logs")
def list_logs():
    """List all available agent trace log files."""
    if not LOGS_DIR.exists():
        return {"logs": []}
    files = sorted(LOGS_DIR.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
    return {
        "logs": [
            {
                "application_id": f.stem,
                "size_bytes": f.stat().st_size,
                "modified": f.stat().st_mtime,
            }
            for f in files
        ]
    }


@app.get("/logs/{application_id}")
def get_agent_logs(application_id: str):
    """Return the full agent trace for one application as a list of events."""
    log_path = LOGS_DIR / f"{application_id}.jsonl"
    if not log_path.exists():
        raise HTTPException(status_code=404, detail=f"No trace log found for {application_id}")
    events = [
        json.loads(line)
        for line in log_path.read_text().splitlines()
        if line.strip()
    ]
    return {
        "application_id": application_id,
        "event_count": len(events),
        "events": events,
    }


@app.post("/process-batch")
async def process_batch(application_ids: list[str]):
    """Process multiple applications in sequence. Useful for seeding all 4 demo cases at once."""
    results = []
    for app_id in application_ids:
        try:
            result = run_agent(app_id)
            results.append({"application_id": app_id, "success": True,
                             "iterations": result.get("iterations")})
        except Exception as exc:
            logger.error(f"Batch: failed for {app_id}: {exc}")
            results.append({"application_id": app_id, "success": False, "error": str(exc)})
    return results
