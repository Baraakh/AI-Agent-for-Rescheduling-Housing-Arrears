// ============================================================================
// src/examples/ApplicantSubmitExample.jsx
// ----------------------------------------------------------------------------
// EXAMPLE — wiring the Applicant service frontend's submit button to Supabase.
//
// This shows the part that matters: replacing a "save to local mock state"
// submit handler with one real call to `submitFullApplication()`. Drop this
// logic into your existing UploadForm/ApplicantForm component — the form
// fields and styling stay exactly as you already built them; only the submit
// handler and the three pieces of state below (submitting/error/result) change.
// ============================================================================

import { useState } from 'react';
import { submitFullApplication, generateApplicationId } from '../services/applicationService';

export default function ApplicantSubmitExample() {
  // --- form fields (mirror whatever your real UploadForm collects) ----------
  const [applicantName, setApplicantName] = useState('Ahmed Khalid Al Mansouri');
  const [applicantEmail, setApplicantEmail] = useState('ahmed.almansouri.demo@example.com');
  const [currentSalary, setCurrentSalary] = useState(23500);
  const [remarks, setRemarks] = useState('');
  const [applicantAbroad, setApplicantAbroad] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Document <input type="file"> values — one File per slot (or null)
  const [salaryCertificateFile, setSalaryCertificateFile] = useState(null);
  const [bankStatementFile, setBankStatementFile] = useState(null);
  const [reschedulingRequestFile, setReschedulingRequestFile] = useState(null);

  // --- submission lifecycle state -------------------------------------------
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { application, loanDetails, documents }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!declarationAccepted) {
      setError('Please accept the declaration before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const applicationId = generateApplicationId();

      // This single call replaces your old "push to mock array" logic:
      //   1) inserts the application row
      //   2) inserts loan_details
      //   3) uploads each selected document to Storage
      //   4) inserts document metadata rows
      //   5) writes an APPLICATION_SUBMITTED audit-log entry
      //   6) returns the created records
      const submission = await submitFullApplication({
        applicant: {
          applicationId,
          applicantName,
          applicantEmail,
          currentSalary: Number(currentSalary),
          remarks,
          applicantAbroad,
          declarationAccepted,
        },
        // In the real app these come from your "auto-retrieved loan details"
        // step (mocked for the demo, e.g. looked up by national ID / account no.)
        loan: {
          currentMonthlyEmi: 3200,
          arrearsAmount: 44800,
          overdueMonths: 14,
          remainingLoanPeriodMonths: 72,
          previousReschedulingCount: 0,
        },
        documents: [
          { documentType: 'salary_certificate', file: salaryCertificateFile },
          { documentType: 'bank_statement', file: bankStatementFile },
          { documentType: 'rescheduling_request', file: reschedulingRequestFile },
        ],
      });

      setResult(submission);
    } catch (err) {
      setError(err.message || 'Something went wrong while submitting your application.');
    } finally {
      setSubmitting(false);
    }
  }

  // --- confirmation screen after a successful submit ------------------------
  if (result) {
    return (
      <div className="card section-card">
        <h2>Application submitted</h2>
        <p>
          Your application <strong>{result.application.application_id}</strong> was received and is
          now <strong>{result.application.status}</strong>. You can track its progress using this
          reference number.
        </p>
        <p>{result.documents.length} document(s) uploaded successfully.</p>
      </div>
    );
  }

  // --- form -------------------------------------------------------------------
  return (
    <form className="card section-card" onSubmit={handleSubmit}>
      <h2>Applicant details &amp; declaration</h2>

      {error && <p className="form-error" role="alert">{error}</p>}

      <label>
        Full name
        <input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} required />
      </label>

      <label>
        Email
        <input
          type="email"
          value={applicantEmail}
          onChange={(e) => setApplicantEmail(e.target.value)}
          required
        />
      </label>

      <label>
        Current monthly salary (AED)
        <input
          type="number"
          min="0"
          value={currentSalary}
          onChange={(e) => setCurrentSalary(e.target.value)}
          required
        />
      </label>

      <label>
        Remarks / hardship reason
        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={4} />
      </label>

      <label className="checkbox-row">
        <input type="checkbox" checked={applicantAbroad} onChange={(e) => setApplicantAbroad(e.target.checked)} />
        I am currently residing outside the UAE
      </label>

      <fieldset>
        <legend>Supporting documents</legend>

        <label>
          Salary certificate
          <input type="file" onChange={(e) => setSalaryCertificateFile(e.target.files?.[0] ?? null)} />
        </label>

        <label>
          Bank statement
          <input type="file" onChange={(e) => setBankStatementFile(e.target.files?.[0] ?? null)} />
        </label>

        <label>
          Rescheduling request form
          <input type="file" onChange={(e) => setReschedulingRequestFile(e.target.files?.[0] ?? null)} />
        </label>
      </fieldset>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={declarationAccepted}
          onChange={(e) => setDeclarationAccepted(e.target.checked)}
          required
        />
        I declare that the information provided is true and accurate to the best of my knowledge.
      </label>

      <button type="submit" className="btn btn--primary" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}
