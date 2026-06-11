"""
Structured per-application trace logger.

Writes one JSON line per event to agent/logs/{application_id}.jsonl so that
every tool call, result, error, and Claude reasoning block is persisted and
queryable after the fact.

Usage in agent_orchestrator:
    trace = AgentTraceLogger(application_id)
    trace.log_start()
    trace.log_tool_call(iteration, "fetch_application_data", {"application_id": ...})
    trace.log_tool_result(iteration, "fetch_application_data", result_dict)
    trace.log_tool_error(iteration, "write_results_to_database", "APIError: ...")
    trace.log_reasoning(iteration, "I need to first fetch the application data...")
    trace.log_complete(total_iterations, "Agent completed successfully.")
"""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

LOGS_DIR = Path(__file__).parent / "logs"


class AgentTraceLogger:
    def __init__(self, application_id: str):
        self.application_id = application_id
        LOGS_DIR.mkdir(exist_ok=True)
        self.log_path = LOGS_DIR / f"{application_id}.jsonl"
        # Overwrite any previous trace for the same application
        self.log_path.write_text("")

    def _write(self, event: str, iteration: int | None = None, **payload):
        record = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "event": event,
        }
        if iteration is not None:
            record["iteration"] = iteration
        record.update(payload)
        with self.log_path.open("a") as f:
            f.write(json.dumps(record) + "\n")

    # ── Public API ──────────────────────────────────────────────────────────

    def log_start(self):
        self._write("agent_start", application_id=self.application_id)
        logger.info(f"[{self.application_id}] ▶ Agent trace started → {self.log_path}")

    def log_tool_call(self, iteration: int, tool_name: str, tool_input: dict):
        self._write("tool_call", iteration=iteration,
                    tool_name=tool_name, tool_input=tool_input)
        # Keep terminal readable: truncate input to 120 chars
        short = json.dumps(tool_input)[:120]
        logger.info(f"[{self.application_id}] [{iteration}] → {tool_name}({short}…)")

    def log_tool_result(self, iteration: int, tool_name: str, result: dict):
        self._write("tool_result", iteration=iteration,
                    tool_name=tool_name, result=result)
        short = json.dumps(result)[:160]
        logger.info(f"[{self.application_id}] [{iteration}] ✓ {tool_name}: {short}…")

    def log_tool_error(self, iteration: int, tool_name: str, error: str):
        self._write("tool_error", iteration=iteration,
                    tool_name=tool_name, error=error)
        logger.error(f"[{self.application_id}] [{iteration}] ✗ {tool_name}: {error}")

    def log_reasoning(self, iteration: int, text: str):
        if not text or not text.strip():
            return
        self._write("claude_reasoning", iteration=iteration, text=text)
        # Print first 200 chars of Claude's reasoning to terminal
        short = text.strip().replace("\n", " ")[:200]
        logger.info(f"[{self.application_id}] [{iteration}] 💭 {short}…")

    def log_complete(self, total_iterations: int, summary: str):
        self._write("agent_complete",
                    total_iterations=total_iterations, summary=summary)
        logger.info(
            f"[{self.application_id}] ■ Agent finished in {total_iterations} iterations. "
            f"Log: {self.log_path}"
        )
