# SZHP Arrears Rescheduling — AI Agent System

> **Sheikh Zayed Housing Programme** · UAE · Hackathon Submission

An end-to-end AI-powered platform that lets UAE citizens apply to reschedule housing loan arrears and routes every application through an autonomous Claude-powered agent that extracts documents, runs governance checks, and produces a binding rescheduling decision — all within ~30 seconds, replacing a process that previously took up to 5 working days.

---

## What the AI Agent Does

When a citizen submits an application the agent:

1. **Fetches** the full application, loan details, and uploaded documents from Supabase
2. **Checks document completeness** — stops and requests missing docs if needed
3. **Extracts financial data** from PDFs using Claude Haiku vision (salary certificate, 6-month bank statement, medical report)
4. **Runs V2 cross-check** — compares certified salary vs. 6-month bank average; discrepancy >10% → hard escalation (P5)
5. **Runs per-member income check** — salary ÷ household size; below AED 2,500 → compassionate deferral (P4)
6. **Selects a rescheduling path** (P1–P5) via deterministic rule engine — Claude calls the rules as tools and cannot override them
7. **Calculates EMI figures** — new monthly payment, arrears payment, plan duration
8. **Writes results** — upserts to Supabase, updates application status, appends audit log

---

## System Architecture

```
┌──────────────────────────┐          ┌──────────────────────────┐
│    Citizen Portal         │          │   Employee Dashboard      │
│  frontend-user/           │          │  frontend-dashboard/      │
│  React 19 · Tailwind      │          │  React 19 · Ant Design    │
│  http://localhost:5173    │          │  http://localhost:5174    │
└────────────┬─────────────┘          └────────────┬─────────────┘
             │  anon key (RLS)                      │  anon key (RLS)
             └──────────────────┬───────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │     Supabase           │
                    │  Postgres + Storage    │
                    └───────────┬───────────┘
                                │  service role key
                    ┌───────────▼───────────┐
                    │   AI Agent API         │
                    │  agent/                │
                    │  FastAPI · Claude      │
                    │  http://localhost:8000 │
                    └───────────────────────┘
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18+ |
| Python | 3.11+ |
| Anthropic API key | Any Claude-capable key |
| Supabase project | Free tier works |

---

## Setup

### Step 1 — Supabase (one-time database setup)

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → **New query** → paste the entire contents of `agent/supabase_migrations.sql` → **Run**
   - This runs all 13 migrations including RLS policies that allow the frontends to read/write data
3. Go to **Storage** → **New bucket** → name it `application-documents` → tick **Public** → **Create**
4. From **Project Settings → API**, copy:
   - **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

> **Demo shortcut:** The `.env.example` files already contain working keys for the shared demo Supabase project — just `cp .env.example .env` in each directory and skip the above steps.

---

### Step 2 — AI Agent (port 8000)

```bash
cd agent

# Create virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure (real demo keys already in .env.example)
cp .env.example .env

# Start the agent API
uvicorn main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/health` → `{"status":"ok","agent":"SZHP AI Loan Analyst v1"}`

---

### Step 3 — Citizen Portal (port 5173)

```bash
cd frontend-user
cp .env.example .env
npm install
npm run dev
# → http://localhost:5173
```

---

### Step 4 — Employee Dashboard (port 5174)

```bash
cd frontend-dashboard
cp .env.example .env
npm install
npm run dev
# → http://localhost:5174
```

---

## Running the Demo

### Option A — Seed pre-processed cases (fastest, ~30 sec)

```bash
cd agent
source .venv/bin/activate
python seed_demo.py
```

This inserts all 4 synthetic cases into Supabase **with AI results already computed**. Open the employee dashboard at `http://localhost:5174` — all 4 applications will be visible with full AI analysis, risk scores, and decision rationale.

### Option B — Full end-to-end citizen flow

1. Open `http://localhost:5173`
2. Click **Start New Application**
3. On the login screen, pick one of the 4 demo personas (UAE Pass simulation)
4. Complete the 6-step form — applicant info, loan summary, document upload
5. Submit → the citizen portal polls every 3 seconds
6. The agent processes the application (~25–35 sec) and the Results page renders automatically
7. If auto-approved, the citizen can **Accept** (completes the case) or **Reject** (escalates to human review)
8. Open the employee dashboard to see the same case from the officer's perspective

---

## Demo Personas

| # | Name | Path | Key Signal | Outcome |
|---|---|---|---|---|
| **1** | Khalid Al Mazrouei | **P1** — EMI Raised | Income up 34% (AED 22k → 29.5k); V2 passes | Auto-approved — higher monthly payment, shorter term |
| **2** | Aisha Al Nuaimi | **P4** — Arrears Deferred | Widow; pension AED 11.2k; per-member income AED 2,240 (below AED 2,500 threshold) | Auto-approved — arrears moved to end of loan, EMI unchanged |
| **3** | Mohammed Al Hammadi | **P5** — Human Escalation | Salary cert AED 16k vs. bank statement AED 24k (**50% discrepancy**; tolerance is ±10%) | Escalated — officer reviews in dashboard and can override with custom plan |
| **4** | Fatima Al Shamsi | **P3** — Arrears Spread | Income stable (±1.5%); temporary hardship (resolved) | Auto-approved — arrears spread over remaining term, EMI slightly increased |

Documents for all 4 cases are in `Data/Case1/` – `Data/Case4/`. See `Data/CASES_MANIFEST.md` for exact figures.

---

## Environment Variables

### `agent/.env`

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bypasses RLS; used only by the agent |
| `ANTHROPIC_API_KEY` | Anthropic API key |

### `frontend-user/.env` and `frontend-dashboard/.env`

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key — safe to expose in browser |
| `VITE_AGENT_API_URL` | Agent API base URL (default: `http://localhost:8000`) |

---

## Rescheduling Decision Paths

The rule engine (`agent/tools/rule_engine.py`) is **fully deterministic** — Claude calls it as a tool and cannot override its outputs.

| Path | Trigger | Action | Outcome |
|---|---|---|---|
| **P1** | Current salary >10% above origination | Raise EMI to ~16% of salary | Arrears absorbed; loan term shortened |
| **P2** | Salary 3–10% above origination (near 20% cap) | Moderate EMI increase | Near-cap variant of P1 |
| **P3** | Salary stable (±3%); arrears fit within 20% cap | Keep EMI; spread arrears evenly | Burden distributed, no cap violation |
| **P4** | Per-member income <AED 2,500 **or** compassionate hardship | Defer all arrears to loan end | Maximum relief; EMI unchanged |
| **P5** | V2 cross-check fails (>±10% cert vs. bank) | Escalate to human officer | No auto-decision; full officer review |

**Hard governance gates (Claude cannot override):**
- V2 discrepancy >10% → always P5
- Per-member income <AED 2,500 → always P4
- EMI must stay ≤20% of monthly salary (20% cap rule)
- Plan duration must not exceed remaining loan term (period rule)

---

## Agent API Reference

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/process/{application_id}` | Trigger async AI analysis for one application |
| `POST` | `/process-batch` | Process a list of application IDs (body: `["APP-ID-1", ...]`) |
| `GET` | `/logs` | List all agent trace log files |
| `GET` | `/logs/{application_id}` | Retrieve full JSONL execution trace for one application |

The employee dashboard **Agent Trace** panel streams `/logs/{id}` to show every tool call, Claude reasoning block, and result in real time.

---

## AI Models Used

| Model | Role |
|---|---|
| `claude-sonnet-4-6` | Orchestrator — reasons over all tool results, selects path, writes bilingual rationale |
| `claude-haiku-4-5-20251001` | Extractor — PDF vision extraction only; returns structured JSON; never makes decisions |

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI Agent | Python 3.11, FastAPI, Anthropic SDK (tool-use) |
| Database | Supabase (Postgres + Storage) |
| Citizen Portal | React 19, Vite, Tailwind CSS |
| Employee Dashboard | React 19, Vite, Tailwind CSS, Ant Design |
| Deployment (agent) | Railway (`agent/railway.toml`) |
| Deployment (frontends) | Any static host (Vercel / Netlify) |

---

## Project Structure

```
house-agent/
├── agent/                     # AI Agent — FastAPI + Claude
│   ├── main.py                # 5 API endpoints
│   ├── agent_orchestrator.py  # 8-step agentic loop
│   ├── seed_demo.py           # Load 4 synthetic test cases
│   ├── supabase_migrations.sql # All DB migrations (run once)
│   └── tools/
│       ├── rule_engine.py     # Deterministic P1–P5 decision engine
│       ├── document_tools.py  # PDF vision extraction
│       ├── data_tools.py      # Supabase read helpers
│       └── db_writer.py       # Write + normalize AI output to DB
├── frontend-user/             # Citizen Portal (port 5173)
├── frontend-dashboard/        # Employee Dashboard (port 5174)
└── Data/                      # Synthetic demo documents
    ├── Case1/ – Case4/        # PDF documents per persona
    └── CASES_MANIFEST.md      # Expected outcomes + income figures
```

---

## Available Scripts

Both frontends use the same commands (run from each directory):

```bash
npm run dev      # Start dev server with HMR
npm run build    # Production build
npm run preview  # Preview production build locally
npm run lint     # ESLint
```
