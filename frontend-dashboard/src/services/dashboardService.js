// ============================================================================
// src/services/dashboardService.js
// ----------------------------------------------------------------------------
// EMPLOYEE DASHBOARD-SIDE API — used by the Employee dashboard frontend.
//
// Wraps every Supabase call the dashboard needs: listing/filtering
// applications, opening an application's full detail (validation results, AI
// recommendation, risk level, decision rationale), updating status/decisions,
// writing audit-log entries for every action, and computing summary stats.
//
// Reads the SAME `applications` table the applicant frontend writes to, so
// new submissions appear here live (call getAllApplications() again, or wire
// up a Realtime subscription — see docs — to refresh automatically).
//
// SYNTHETIC DEMO DATA ONLY.
// ============================================================================

import { supabase } from '../lib/supabaseClient';

// Shared "deep" select used whenever we need full application detail.
// Shared "deep" select used whenever we need full application detail.
const APPLICATION_DETAIL_SELECT = `
  *,
  loan_details (*),
  documents (*),
  validation_results (*),
  recommendations (*),
  audit_logs (*)
`;

/**
 * Normalizes live database application rows to match flat mock properties
 * expected by the dashboard and detail views.
 */
function normalizeDbApplication(app) {
  if (!app) return null;

  const loan = Array.isArray(app.loan_details) ? app.loan_details[0] : app.loan_details;
  const val = Array.isArray(app.validation_results) ? app.validation_results[0] : app.validation_results;
  const rec = Array.isArray(app.recommendations) ? app.recommendations[0] : app.recommendations;

  return {
    ...app,
    last_updated: app.updated_at || app.last_updated || app.submitted_at,
    current_salary: loan?.current_salary ?? app.current_salary,
    employer_name: loan?.employer_name ?? app.employer_name ?? val?.extracted_financials?.employer_name ?? '—',
    current_monthly_emi: loan?.current_monthly_emi ?? app.current_monthly_emi,
    arrears_amount: loan?.arrears_amount ?? app.arrears_amount,
    overdue_months: loan?.overdue_months ?? app.overdue_months,
    remaining_loan_period_months: loan?.remaining_loan_period_months ?? app.remaining_loan_period_months ?? null,
    recommended_monthly_arrears_payment: rec?.recommended_monthly_arrears_payment ?? app.recommended_monthly_arrears_payment,
    emi_during_rescheduling_period: rec?.emi_during_rescheduling_period ?? app.emi_during_rescheduling_period,
    emi_after_rescheduling_period: rec?.emi_after_rescheduling_period ?? app.emi_after_rescheduling_period,
    recommended_duration_months: rec?.recommended_duration_months ?? app.recommended_duration_months,
    bank_statement_source: val?.bank_statement_source ?? app.bank_statement_source ?? null,
    hardship_permanence: app.hardship_permanence ?? null,
    add_mandate: rec?.add_mandate ?? app.add_mandate ?? null,
  };
}

// ----------------------------------------------------------------------------
// 1. getAllApplications
// ----------------------------------------------------------------------------
/**
 * Fetches every application (most recent first) for the main dashboard list/grid.
 * Returns lightweight rows plus loan_details — enough for a list view without
 * pulling every document/validation/recommendation row for every application.
 *
 * @returns {Promise<Object[]>}
 */
export async function getAllApplications() {
  const { data, error } = await supabase
    .from('applications')
    .select('*, loan_details (*)')
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(`getAllApplications failed: ${error.message}`);
  return (data ?? []).map(normalizeDbApplication);
}

// ----------------------------------------------------------------------------
// 2. getApplicationsByStatus
// ----------------------------------------------------------------------------
/**
 * Fetches applications filtered to a single status value.
 * @param {string} status - e.g. 'submitted' | 'needs_human_review' | 'approved_automatically' | ...
 * @returns {Promise<Object[]>}
 */
export async function getApplicationsByStatus(status) {
  const { data, error } = await supabase
    .from('applications')
    .select('*, loan_details (*)')
    .eq('status', status)
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(`getApplicationsByStatus failed: ${error.message}`);
  return (data ?? []).map(normalizeDbApplication);
}

// ----------------------------------------------------------------------------
// 3. getApplicationsNeedingReview
// ----------------------------------------------------------------------------
/**
 * Convenience wrapper for the "Needs Review" dashboard tab/queue.
 * Matches on the boolean flag (covers any status where a human must look,
 * e.g. needs_human_review, salary_mismatch, medical_review).
 * @returns {Promise<Object[]>}
 */
export async function getApplicationsNeedingReview() {
  const { data, error } = await supabase
    .from('applications')
    .select('*, loan_details (*), validation_results (*), recommendations (*)')
    .eq('human_review_required', true)
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(`getApplicationsNeedingReview failed: ${error.message}`);
  return (data ?? []).map(normalizeDbApplication);
}

// ----------------------------------------------------------------------------
// 4. getPendingDocumentApplications
// ----------------------------------------------------------------------------
/**
 * Convenience wrapper for the "Pending Documents" dashboard tab/queue.
 * @returns {Promise<Object[]>}
 */
export async function getPendingDocumentApplications() {
  return getApplicationsByStatus('pending_documents');
}

// ----------------------------------------------------------------------------
// 5. getApprovedApplications
// ----------------------------------------------------------------------------
/**
 * Convenience wrapper for the "Approved" dashboard tab/queue.
 * Includes both automatic and (eventually) human-confirmed approvals.
 * @returns {Promise<Object[]>}
 */
export async function getApprovedApplications() {
  const { data, error } = await supabase
    .from('applications')
    .select('*, loan_details (*), recommendations (*)')
    .in('status', ['approved_automatically', 'completed'])
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(`getApprovedApplications failed: ${error.message}`);
  return (data ?? []).map(normalizeDbApplication);
}

// ----------------------------------------------------------------------------
// 6. getApplicationDetails
// ----------------------------------------------------------------------------
/**
 * Fetches one application with EVERYTHING the detail screen needs:
 * loan details, documents, validation results, AI recommendation,
 * risk level / confidence / decision rationale, and the audit trail.
 *
 * @param {string} applicationId
 * @returns {Promise<Object|null>}
 */
export async function getApplicationDetails(applicationId) {
  const { data, error } = await supabase
    .from('applications')
    .select(APPLICATION_DETAIL_SELECT)
    .eq('application_id', applicationId)
    .maybeSingle();

  if (error) throw new Error(`getApplicationDetails failed: ${error.message}`);
  return data ? normalizeDbApplication(data) : null;
}

// ----------------------------------------------------------------------------
// 7. updateApplicationStatus
// ----------------------------------------------------------------------------
/**
 * Updates an application's status (and optionally risk_level / final_decision /
 * human_review_required in the same call) and returns the updated row.
 * `updated_at` is auto-set by the `trg_applications_set_updated_at` trigger.
 *
 * @param {string} applicationId
 * @param {Object} changes
 * @param {string} changes.status
 * @param {string} [changes.finalDecision]
 * @param {string} [changes.riskLevel]
 * @param {boolean} [changes.humanReviewRequired]
 * @returns {Promise<Object>} updated application row
 */
export async function updateApplicationStatus(applicationId, changes) {
  const patch = { status: changes.status };
  if (changes.finalDecision !== undefined) patch.final_decision = changes.finalDecision;
  if (changes.riskLevel !== undefined) patch.risk_level = changes.riskLevel;
  if (changes.humanReviewRequired !== undefined) patch.human_review_required = changes.humanReviewRequired;

  const { data, error } = await supabase
    .from('applications')
    .update(patch)
    .eq('application_id', applicationId)
    .select()
    .single();

  if (error) throw new Error(`updateApplicationStatus failed: ${error.message}`);
  return data;
}

// ----------------------------------------------------------------------------
// 8. addAuditLog
// ----------------------------------------------------------------------------
/**
 * Writes one row to `audit_logs`. Call this after every status-changing
 * employee action so the trail stays complete.
 *
 * @param {Object} input
 * @param {string} input.applicationId
 * @param {string} input.actionType        - one of the values allowed by the
 *                                            audit_logs.action_type CHECK constraint
 * @param {string} input.actionDescription
 * @param {string} [input.performedBy]     - employee name/email; defaults to 'employee'
 * @returns {Promise<Object>} the created audit_logs row
 */
export async function addAuditLog({ applicationId, actionType, actionDescription, performedBy = 'employee' }) {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      application_id: applicationId,
      action_type: actionType,
      action_description: actionDescription,
      performed_by: performedBy,
    })
    .select()
    .single();

  if (error) throw new Error(`addAuditLog failed: ${error.message}`);
  return data;
}

// ----------------------------------------------------------------------------
// 9. upsertHumanRecommendation
// ----------------------------------------------------------------------------
/**
 * Lets a human reviewer save a custom rescheduling plan for a P5/escalated case.
 * Uses Supabase upsert (recommendations has UNIQUE on application_id).
 * Stores arrears_start_month in the rationale JSONB since no dedicated column exists.
 *
 * @param {string} applicationId
 * @param {{durationMonths?: number, emiDuring?: number, emiAfter?: number, arrearsStartMonth?: string, notes?: string}} overrides
 */
export async function upsertHumanRecommendation(applicationId, overrides) {
  const { data: existing } = await supabase
    .from('recommendations')
    .select('rationale')
    .eq('application_id', applicationId)
    .maybeSingle()

  const patch = { application_id: applicationId, path_taken: 'HR' }
  if (overrides.durationMonths != null) patch.recommended_duration_months = overrides.durationMonths
  if (overrides.emiDuring != null) patch.emi_during_rescheduling_period = overrides.emiDuring
  if (overrides.emiAfter != null) patch.emi_after_rescheduling_period = overrides.emiAfter
  if (overrides.notes) patch.reasoning = overrides.notes
  patch.rationale = {
    ...(existing?.rationale || {}),
    human_override: true,
    ...(overrides.arrearsStartMonth ? { arrears_start_month: overrides.arrearsStartMonth } : {}),
  }

  const { error } = await supabase
    .from('recommendations')
    .upsert(patch, { onConflict: 'application_id' })

  if (error) throw new Error(`upsertHumanRecommendation failed: ${error.message}`)
}

// ----------------------------------------------------------------------------
// 10. getDashboardStats
// ----------------------------------------------------------------------------
/**
 * Computes the small set of summary numbers a dashboard header/cards usually
 * shows: total applications, and counts per key bucket. Implemented as one
 * `select('*')` + client-side aggregation so it works without any DB views —
 * perfectly fine at hackathon-demo data volumes.
 *
 * @returns {Promise<{
 *   total: number,
 *   submitted: number,
 *   approvedAutomatically: number,
 *   needsHumanReview: number,
 *   pendingDocuments: number,
 *   rejected: number,
 *   completed: number,
 *   byRiskLevel: Record<string, number>
 * }>}
 */
export async function getDashboardStats() {
  const { data, error } = await supabase
    .from('applications')
    .select('status, risk_level, human_review_required');

  if (error) throw new Error(`getDashboardStats failed: ${error.message}`);

  const rows = data ?? [];
  const stats = {
    total: rows.length,
    submitted: 0,
    approvedAutomatically: 0,
    needsHumanReview: 0,
    pendingDocuments: 0,
    rejected: 0,
    completed: 0,
    byRiskLevel: { low: 0, medium: 0, high: 0, incomplete: 0 },
  };

  for (const row of rows) {
    if (row.status === 'submitted') stats.submitted += 1;
    if (row.status === 'approved_automatically') stats.approvedAutomatically += 1;
    if (row.status === 'pending_documents') stats.pendingDocuments += 1;
    if (row.status === 'rejected') stats.rejected += 1;
    if (row.status === 'completed') stats.completed += 1;
    if (row.human_review_required) stats.needsHumanReview += 1;
    if (row.risk_level && stats.byRiskLevel[row.risk_level] !== undefined) {
      stats.byRiskLevel[row.risk_level] += 1;
    }
  }

  return stats;
}
