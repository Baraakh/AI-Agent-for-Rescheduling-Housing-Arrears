// ============================================================================
// src/examples/ApplicationDetailActionsExample.jsx
// ----------------------------------------------------------------------------
// EXAMPLE — the Employee dashboard's "application details" screen:
// validation results, AI recommendation, risk level, decision rationale,
// PLUS the four status-update actions:
//
//     Approve Recommendation | Request More Documents |
//     Send to Human Review   | Reject Application
//
// Each action: (1) updates `applications.status` (and related fields),
// (2) writes an `audit_logs` row describing what happened and who did it,
// and (3) re-fetches the application so the screen reflects the new state
// immediately (the same pattern you'd use to refresh the dashboard list).
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { getApplicationDetails, updateApplicationStatus, addAuditLog } from '../services/dashboardService';

// In a real deployment this would come from your auth/session.
// For this no-login hackathon demo, a fixed reviewer name is fine —
// it still produces a meaningful, attributable audit trail.
const CURRENT_EMPLOYEE = 'employee.reviewer@moei.gov.ae';

export default function ApplicationDetailActionsExample({ applicationId }) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null); // which button is busy

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getApplicationDetails(applicationId);
      setApplication(data);
    } catch (err) {
      setError(err.message || 'Failed to load application details.');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    load();
  }, [load]);

  // --------------------------------------------------------------------------
  // Generic runner: performs the status update + audit log, then refreshes.
  // Each action below just supplies its own status/description/labels.
  // --------------------------------------------------------------------------
  async function runAction({ key, statusChanges, auditAction, auditDescription }) {
    setActionInProgress(key);
    setError(null);
    try {
      await updateApplicationStatus(applicationId, statusChanges);
      await addAuditLog({
        applicationId,
        actionType: auditAction,
        actionDescription: auditDescription,
        performedBy: CURRENT_EMPLOYEE,
      });
      await load(); // refresh so the screen (and badges) reflect the new status
    } catch (err) {
      setError(err.message || 'Action failed. Please try again.');
    } finally {
      setActionInProgress(null);
    }
  }

  // ---- 1. Approve Recommendation -------------------------------------------
  const handleApprove = () =>
    runAction({
      key: 'approve',
      statusChanges: {
        status: 'completed',
        finalDecision: 'Approved by employee — recommendation confirmed',
        humanReviewRequired: false,
      },
      auditAction: 'APPROVED',
      auditDescription: `Employee ${CURRENT_EMPLOYEE} approved the rescheduling recommendation for ${applicationId}.`,
    });

  // ---- 2. Request More Documents --------------------------------------------
  const handleRequestDocuments = () =>
    runAction({
      key: 'request_documents',
      statusChanges: {
        status: 'pending_documents',
        riskLevel: 'incomplete',
      },
      auditAction: 'DOCUMENTS_REQUESTED',
      auditDescription: `Employee ${CURRENT_EMPLOYEE} requested additional supporting documents for ${applicationId}.`,
    });

  // ---- 3. Send to Human Review -----------------------------------------------
  const handleSendToReview = () =>
    runAction({
      key: 'send_to_review',
      statusChanges: {
        status: 'needs_human_review',
        humanReviewRequired: true,
      },
      auditAction: 'SENT_TO_REVIEW',
      auditDescription: `Employee ${CURRENT_EMPLOYEE} escalated ${applicationId} to human review for further assessment.`,
    });

  // ---- 4. Reject Application --------------------------------------------------
  const handleReject = () =>
    runAction({
      key: 'reject',
      statusChanges: {
        status: 'rejected',
        finalDecision: 'Rejected by employee after review',
        humanReviewRequired: false,
      },
      auditAction: 'REJECTED',
      auditDescription: `Employee ${CURRENT_EMPLOYEE} rejected application ${applicationId}.`,
    });

  // --------------------------------------------------------------------------
  if (loading) return <p>Loading application details…</p>;

  if (error && !application) {
    return (
      <div className="form-error" role="alert">
        <p>{error}</p>
        <button type="button" className="btn btn--outline" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  if (!application) return <p>Application not found.</p>;

  const validation = application.validation_results?.[0];
  const recommendation = application.recommendations?.[0];

  return (
    <div className="card section-card">
      <h2>
        {application.application_id} — {application.applicant_name}
      </h2>
      <p>
        Status: <strong>{application.status}</strong> · Risk level:{' '}
        <strong>{application.risk_level ?? '—'}</strong> · Confidence:{' '}
        <strong>{application.confidence_score != null ? `${application.confidence_score}/100` : '—'}</strong>
      </p>

      {error && <p className="form-error" role="alert">{error}</p>}

      {/* ---- Validation results ---- */}
      {validation && (
        <section>
          <h3>Validation results</h3>
          <ul>
            <li>Salary certificate valid: {String(validation.salary_certificate_valid)}</li>
            <li>Bank statement available: {String(validation.bank_statement_available)}</li>
            <li>Salary match status: {validation.salary_match_status}</li>
            <li>Document completeness: {validation.document_completeness_status}</li>
            <li>Cross-document consistency: {validation.cross_document_consistency}</li>
          </ul>
        </section>
      )}

      {/* ---- AI recommendation & decision rationale ---- */}
      {recommendation && (
        <section>
          <h3>Recommendation &amp; decision rationale</h3>
          <ul>
            <li>Recommended monthly arrears payment: AED {recommendation.recommended_monthly_arrears_payment}</li>
            <li>EMI during rescheduling period: AED {recommendation.emi_during_rescheduling_period}</li>
            <li>EMI after rescheduling period: AED {recommendation.emi_after_rescheduling_period}</li>
            <li>Recommended duration: {recommendation.recommended_duration_months} months</li>
            <li>Final decision: {recommendation.final_decision}</li>
          </ul>
          {recommendation.rationale?.rationale_en && <p>{recommendation.rationale.rationale_en}</p>}
        </section>
      )}

      {/* ---- Employee actions ---- */}
      <section className="action-buttons-row">
        <button type="button" className="btn btn--primary" disabled={!!actionInProgress} onClick={handleApprove}>
          {actionInProgress === 'approve' ? 'Approving…' : 'Approve Recommendation'}
        </button>
        <button type="button" className="btn btn--outline" disabled={!!actionInProgress} onClick={handleRequestDocuments}>
          {actionInProgress === 'request_documents' ? 'Requesting…' : 'Request More Documents'}
        </button>
        <button type="button" className="btn btn--outline" disabled={!!actionInProgress} onClick={handleSendToReview}>
          {actionInProgress === 'send_to_review' ? 'Sending…' : 'Send to Human Review'}
        </button>
        <button type="button" className="btn btn--danger" disabled={!!actionInProgress} onClick={handleReject}>
          {actionInProgress === 'reject' ? 'Rejecting…' : 'Reject Application'}
        </button>
      </section>

      {/* ---- Audit trail ---- */}
      <section>
        <h3>Audit trail</h3>
        <ul>
          {(application.audit_logs ?? [])
            .slice()
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((log) => (
              <li key={log.id}>
                <strong>{log.action_type}</strong> — {log.action_description} ({log.performed_by},{' '}
                {new Date(log.created_at).toLocaleString()})
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
