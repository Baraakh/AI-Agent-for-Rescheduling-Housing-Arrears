# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-agent hackathon project for the **Sheikh Zayed Housing Programme (SZHP) Arrears Rescheduling** system. UAE citizens apply to reschedule housing loan arrears; a Claude-powered agent processes their applications end-to-end. Three independent components share one Supabase project:

- **`agent/`** — FastAPI backend; Claude tool-use orchestrator + deterministic rule engine
- **`frontend-user/`** — Applicant portal (`moei-portal`): multi-step UAE citizen submission form
- **`frontend-dashboard/`** — Employee dashboard: officers review AI-processed applications

## Commands

### Agent (Python / FastAPI)

```bash
cd agent

# Install dependencies
pip install -r requirements.txt

# Run dev server (port 8000)
uvicorn main:app --reload

# Trigger agent manually for one application
curl -X POST http://localhost:8000/process/APP-2026-XXXXXX

# Process all 4 demo cases at once
curl -X POST http://localhost:8000/process-batch \
  -H "Content-Type: application/json" \
  -d '["APP-ID-1","APP-ID-2","APP-ID-3","APP-ID-4"]'

# View agent trace for an application
curl http://localhost:8000/logs/APP-2026-XXXXXX

# Seed demo data
python seed_demo.py
```

Agent requires a `.env` file in `agent/` with:
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # service role, not anon
ANTHROPIC_API_KEY=...
```

### Frontends

Both use identical npm scripts. Run from the respective directory:

```bash
npm run dev       # development server
npm run build     # production build
npm run lint      # ESLint
npm run preview   # preview production build
```

`frontend-user` runs on port 5173, `frontend-dashboard` on port 5174.

## Architecture

### Shared Backend: Supabase

Both frontends use `src/lib/supabaseClient.js` (anon key, RLS-enforced). The agent uses the **service role key** to bypass RLS when writing results.

Database schema:
- `applications` — master record: `status`, `risk_level`, `human_review_required`, `confidence_score`, `final_decision`, `missing_documents`
- `loan_details` — financial figures tied to an application
- `documents` — Storage file metadata (path pattern: `applications/{app_id}/{document_type}/{filename}`)
- `validation_results` — agent output: salary cross-check, doc completeness
- `recommendations` — agent plan: path taken (P1–P5), EMI figures, duration, bilingual rationale
- `audit_logs` — append-only trail of every action

### Agent Architecture (`agent/`)

The agent uses **two Claude models** with distinct roles:
- `claude-sonnet-4-6` (orchestrator) — reasons over all tool results, selects the path, writes bilingual rationale
- `claude-haiku-4-5-20251001` (extractor) — PDF vision extraction only, returns structured JSON; never makes decisions

**Core invariant**: The `rule_engine.py` functions make all rescheduling decisions deterministically. Claude calls them as tools and is instructed never to override their outputs. The path selection order in `select_path()` is a fixed governance rule.

**Agentic loop** (`agent_orchestrator.py` → `run_agent()`):
1. `fetch_application_data` — load application + documents from Supabase
2. `check_document_completeness` — if incomplete → `set_pending_documents` → **stop**
3. Extract each uploaded document via vision (salary cert / bank statement / medical report)
4. `run_v2_cross_check` — cert salary vs 6-month bank average; discrepancy >10% → forced P5
5. `run_per_member_income_check` — salary ÷ household size; below AED 2,500 → forced P4
6. `calculate_rescheduling_plan` — calls `select_path()` then the appropriate plan calculator
7. `check_period_rule` — plan duration must not exceed remaining loan term
8. `write_results_to_database` — upsert `validation_results`, `recommendations`, update `applications`, append audit log

Every tool call, result, error, and Claude reasoning block is persisted to `agent/logs/{application_id}.jsonl` via `AgentTraceLogger`. The `/logs/{id}` API endpoint streams these back to the dashboard's Agent Trace Panel.

**`db_writer.py`** normalises Claude's free-text output to the exact DB enum values (`salary_match_status`, `document_completeness_status`, `cross_document_consistency`) before every write.

### Rescheduling Decision Paths

| Path | Trigger | Outcome |
|------|---------|---------|
| P1 | Income >10% above origination | Raise EMI to ~18% of salary, spread arrears |
| P2 | Income 3–10% above origination | Partial EMI increase (near-cap variant of P1) |
| P3 | Stable income, 20% cap fits | Maintain EMI, spread arrears over remaining term |
| P4 | Per-member income <AED 2,500, or permanent medical/bereavement | Defer all arrears to loan end, EMI unchanged |
| P5 | V2 cross-check fails (>10% discrepancy) | Escalate to human review — no plan generated |

V2 and per-member checks are **hard gates** — the orchestrator is instructed never to override them.

### `frontend-user` — Applicant Portal

Multi-step flow enforced by `ProtectedRoute` using `maxReachedStep` in localStorage:
`/` → `/login` → `/applicant-info` → `/loan-summary` → `/documents` → `/results|/confirmation`

Three React contexts wrap the app: `AuthContext` (simulated UAE Pass), `LanguageContext` (EN/AR + RTL), `ApplicationContext` (form state). `submitFullApplication()` in `applicationService.js` is the single submission entry point.

### `frontend-dashboard` — Employee Dashboard

Routes: Dashboard → Applications list → `/applications/:id` (detail).

All pages try Supabase first; fall back to `src/data/applicationsMockData.js` on failure. `normalizeDbApplication()` in `dashboardService.js` flattens nested Supabase joins (loan_details[0], recommendations[0]) to the flat shape the UI expects. `getDashboardStats()` does a full table scan + client-side aggregation.

`ApplicationDetailsPanel` is the largest component (renders the full AI analysis, rule compliance, employee action buttons, agent trace, and audit trail). When adding new status transitions, always call `updateApplicationStatus()` + `addAuditLog()` together.

**UI libraries**: dashboard uses Ant Design (`antd`) + Tailwind; user portal uses Tailwind only.

**Language**: both frontends use `src/contexts/LanguageContext.jsx` with a single `translations` object (`en`/`ar`). All user-visible strings use `t(key)`. Arrays with translated labels must be defined inside the React component (not at module level) so `t()` is in scope.

**Icon component**: both frontends use `src/components/Icon.jsx` — Material Symbols rendered from a self-hosted `.woff2` font. Use `<Icon name="icon_name" />`.

## Demo Data

`Data/Case1–4/` contains synthetic PDFs for four personas covering all demonstrated paths:
- **Case 1** (Khalid Al Mazrouei) → P1: income up 34%, V2 passes, clean auto-approval
- **Case 2** (Aisha Al Nuaimi) → P4: widowed, 5-member household, per-member income below threshold, medical hardship
- **Case 3** (Mohammed Al Hammadi) → P5: 50% salary discrepancy between certificate and bank statement
- **Case 4** (Fatima Al Shamsi) → P3: stable income, temporary resolved circumstance

See `Data/CASES_MANIFEST.md` for exact income figures, expected V2 outcomes, and per-member income calculations.
