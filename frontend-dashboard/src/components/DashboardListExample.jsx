// ============================================================================
// src/examples/DashboardListExample.jsx
// ----------------------------------------------------------------------------
// EXAMPLE — replacing `applicationsMockData.js` in the Employee dashboard
// frontend with a live Supabase fetch.
//
// Shows the standard loading / error / data pattern, status-tab filtering,
// and a manual "Refresh" action (call this same loader again after any
// employee action so the list reflects the new state immediately).
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  getAllApplications,
  getApplicationsNeedingReview,
  getPendingDocumentApplications,
  getApprovedApplications,
  getDashboardStats,
} from '../services/dashboardService';

const TABS = [
  { key: 'all', label: 'All applications', loader: getAllApplications },
  { key: 'needs_review', label: 'Needs review', loader: getApplicationsNeedingReview },
  { key: 'pending_documents', label: 'Pending documents', loader: getPendingDocumentApplications },
  { key: 'approved', label: 'Approved', loader: getApprovedApplications },
];

export default function DashboardListExample({ onOpenApplication }) {
  const [activeTab, setActiveTab] = useState('all');
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tab = TABS.find((t) => t.key === activeTab) ?? TABS[0];
      const [rows, dashboardStats] = await Promise.all([tab.loader(), getDashboardStats()]);
      setApplications(rows);
      setStats(dashboardStats);
    } catch (err) {
      setError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Re-fetch whenever the active tab changes — and on first mount.
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="card section-card">
      <div className="dashboard-header-row">
        <h2>Applications</h2>
        <button type="button" className="btn btn--outline" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {stats && (
        <div className="stats-row">
          <span>Total: {stats.total}</span>
          <span>Needs review: {stats.needsHumanReview}</span>
          <span>Pending documents: {stats.pendingDocuments}</span>
          <span>Approved: {stats.approvedAutomatically}</span>
        </div>
      )}

      <div className="tabs-row">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab ${activeTab === tab.key ? 'tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- loading state --- */}
      {loading && <p>Loading applications…</p>}

      {/* --- error state --- */}
      {!loading && error && (
        <div className="form-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn--outline" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {/* --- empty state --- */}
      {!loading && !error && applications.length === 0 && <p>No applications in this view yet.</p>}

      {/* --- data state --- */}
      {!loading && !error && applications.length > 0 && (
        <table className="applications-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Applicant</th>
              <th>Status</th>
              <th>Risk level</th>
              <th>Confidence</th>
              <th>Submitted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.application_id}>
                <td>{app.application_id}</td>
                <td>{app.applicant_name}</td>
                <td>{app.status}</td>
                <td>{app.risk_level ?? '—'}</td>
                <td>{app.confidence_score != null ? `${app.confidence_score}/100` : '—'}</td>
                <td>{new Date(app.submitted_at).toLocaleString()}</td>
                <td>
                  <button type="button" className="btn btn--outline" onClick={() => onOpenApplication?.(app.application_id)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
