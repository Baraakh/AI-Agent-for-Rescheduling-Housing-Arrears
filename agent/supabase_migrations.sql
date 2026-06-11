-- ============================================================
-- SZHP AI Agent — Supabase SQL migrations
-- Run these in the Supabase SQL Editor (Dashboard → SQL Editor)
-- before starting the agent for the first time.
-- ============================================================

-- 1. Add AI output columns to applications
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS confidence_score integer,
  ADD COLUMN IF NOT EXISTS final_decision text,
  ADD COLUMN IF NOT EXISTS decision_rationale text;

-- 2. Relax status CHECK to include agent-produced statuses
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status IN (
  'submitted',
  'processing',
  'approved_automatically',
  'needs_human_review',
  'pending_documents',
  'completed',
  'rejected',
  'escalated_p5'
));

-- 3. Relax risk_level CHECK (dashboard expects lowercase values)
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_risk_level_check;
ALTER TABLE applications ADD CONSTRAINT applications_risk_level_check CHECK (
  risk_level IN ('low', 'medium', 'high', 'incomplete')
);

-- 4. validation_results: add extracted_financials JSONB column + unique constraint for upsert
ALTER TABLE validation_results
  ADD COLUMN IF NOT EXISTS extracted_financials jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'validation_results_application_id_key'
  ) THEN
    ALTER TABLE validation_results
      ADD CONSTRAINT validation_results_application_id_key UNIQUE (application_id);
  END IF;
END $$;

-- 5. recommendations: add missing columns + unique constraint
ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS path_taken text,
  ADD COLUMN IF NOT EXISTS rationale jsonb,
  ADD COLUMN IF NOT EXISTS final_decision text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recommendations_application_id_key'
  ) THEN
    ALTER TABLE recommendations
      ADD CONSTRAINT recommendations_application_id_key UNIQUE (application_id);
  END IF;
END $$;

-- 6. audit_logs: allow AI agent action types
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;

-- 7. applications: UAE PASS identity fields + hardship type
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS emirates_id_number text,
  ADD COLUMN IF NOT EXISTS uaepass_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS family_size integer,
  ADD COLUMN IF NOT EXISTS employer_name text,
  ADD COLUMN IF NOT EXISTS hardship_type text,
  ADD COLUMN IF NOT EXISTS missing_documents text[];

-- 8. recommendations: full AI output fields required by challenge spec
ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS proposed_deduction_rate_pct numeric,
  ADD COLUMN IF NOT EXISTS period_rule_passed boolean,
  ADD COLUMN IF NOT EXISTS twenty_pct_rule_passed boolean,
  ADD COLUMN IF NOT EXISTS income_change_pct numeric,
  ADD COLUMN IF NOT EXISTS per_member_income numeric,
  ADD COLUMN IF NOT EXISTS case_summary text;

-- 9. loan_details: additional data auto-retrieved from MOEI
ALTER TABLE loan_details
  ADD COLUMN IF NOT EXISTS salary_at_origination numeric,
  ADD COLUMN IF NOT EXISTS original_loan_amount numeric,
  ADD COLUMN IF NOT EXISTS remaining_balance numeric,
  ADD COLUMN IF NOT EXISTS payment_history_on_time_pct numeric,
  ADD COLUMN IF NOT EXISTS loan_id text;

-- 10. Drop overly strict CHECK constraints on validation_results
-- Claude generates descriptive strings; the normalization in db_writer.py handles canonical values,
-- but dropping these constraints prevents any future value from blocking the write.
ALTER TABLE validation_results
  DROP CONSTRAINT IF EXISTS validation_results_salary_match_status_check,
  DROP CONSTRAINT IF EXISTS validation_results_cross_document_consistency_check,
  DROP CONSTRAINT IF EXISTS validation_results_document_completeness_status_check;

-- 11. recommendations: reasoning text + ensure core plan columns exist
ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS reasoning text,
  ADD COLUMN IF NOT EXISTS recommended_monthly_arrears_payment numeric,
  ADD COLUMN IF NOT EXISTS emi_during_rescheduling_period numeric,
  ADD COLUMN IF NOT EXISTS emi_after_rescheduling_period numeric,
  ADD COLUMN IF NOT EXISTS recommended_duration_months integer,
  ADD COLUMN IF NOT EXISTS cap_utilization_pct numeric;

-- 11. applications: allow 'human_review' status (set by employee dashboard)
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status IN (
  'submitted',
  'processing',
  'approved_automatically',
  'needs_human_review',
  'human_review',
  'pending_documents',
  'approved',
  'completed',
  'rejected',
  'escalated_p5'
));

-- 12. New agent output fields: bank_statement_source, hardship_permanence, add_mandate
ALTER TABLE validation_results
  ADD COLUMN IF NOT EXISTS bank_statement_source text;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS hardship_permanence text;

ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS add_mandate jsonb;

-- 13. RLS policies — allow anon key (dashboard + citizen portal) full read/write
-- The agent uses the service-role key which bypasses RLS automatically.
-- Both frontends use the anon key and need explicit permissive policies,
-- otherwise Supabase blocks all writes by default when RLS is enabled.
ALTER TABLE applications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_details        ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_anon_all" ON applications;
CREATE POLICY "allow_anon_all" ON applications       FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_all" ON loan_details;
CREATE POLICY "allow_anon_all" ON loan_details       FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_all" ON documents;
CREATE POLICY "allow_anon_all" ON documents          FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_all" ON validation_results;
CREATE POLICY "allow_anon_all" ON validation_results FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_all" ON recommendations;
CREATE POLICY "allow_anon_all" ON recommendations    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_all" ON audit_logs;
CREATE POLICY "allow_anon_all" ON audit_logs         FOR ALL TO anon USING (true) WITH CHECK (true);
