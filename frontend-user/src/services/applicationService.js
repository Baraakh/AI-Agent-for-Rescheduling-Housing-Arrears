// ============================================================================
// src/services/applicationService.js
// ----------------------------------------------------------------------------
// APPLICANT-SIDE API — used by the Applicant service frontend.
//
// Wraps every Supabase call the applicant form needs: creating the
// application + loan-detail rows, uploading documents to Storage, recording
// document metadata, writing an audit-log entry, and returning the final
// created record. `submitFullApplication()` is the single entry point your
// form's submit handler should call.
//
// SYNTHETIC DEMO DATA ONLY — do not wire this up to real applicant PII.
// ============================================================================

import { supabase, DOCUMENTS_BUCKET } from '../lib/supabaseClient';

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------

/** Generates a readable demo application reference, e.g. APP-2026-7F3K9Q */
export function generateApplicationId() {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `APP-${year}-${random}`;
}

/** Builds the Storage path: applications/{application_id}/{document_type}/{filename} */
function buildStoragePath(applicationId, documentType, fileName) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `applications/${applicationId}/${documentType}/${safeName}`;
}

// ----------------------------------------------------------------------------
// 1. createApplication
// ----------------------------------------------------------------------------
/**
 * Inserts the main `applications` row.
 *
 * @param {Object} input
 * @param {string} input.applicationId       - e.g. generateApplicationId()
 * @param {string} input.applicantName
 * @param {string} input.applicantEmail
 * @param {string} [input.applicantPhone]
 * @param {number} input.currentSalary
 * @param {string} [input.remarks]           - hardship reason / free-text remarks
 * @param {boolean} [input.applicantAbroad]
 * @param {boolean} input.declarationAccepted
 * @returns {Promise<Object>} the created application row
 */
export async function createApplication(input) {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      application_id: input.applicationId,
      applicant_name: input.applicantName,
      applicant_email: input.applicantEmail,
      applicant_phone: input.applicantPhone ?? null,
      current_salary: input.currentSalary ?? null,
      remarks: input.remarks ?? null,
      applicant_abroad: Boolean(input.applicantAbroad),
      declaration_accepted: Boolean(input.declarationAccepted),
      status: 'submitted',
      emirates_id_number: input.emiratesIdNumber ?? null,
      uaepass_verified: Boolean(input.uaepassVerified),
      family_size: input.familySize ?? null,
      employer_name: input.employerName ?? null,
      hardship_type: input.hardshipType ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`createApplication failed: ${error.message}`);
  return data;
}

// ----------------------------------------------------------------------------
// 2. createLoanDetails
// ----------------------------------------------------------------------------
/**
 * Inserts the `loan_details` row linked to an application.
 * In this demo these figures are mocked/auto-retrieved (not entered by the
 * applicant) — pass whatever your "auto-retrieved loan details" step produces.
 *
 * @param {Object} input
 * @param {string} input.applicationId
 * @param {number} input.currentMonthlyEmi
 * @param {number} input.arrearsAmount
 * @param {number} input.overdueMonths
 * @param {number} input.remainingLoanPeriodMonths
 * @param {number} [input.previousReschedulingCount]
 * @returns {Promise<Object>} the created loan_details row
 */
export async function createLoanDetails(input) {
  const { data, error } = await supabase
    .from('loan_details')
    .insert({
      application_id: input.applicationId,
      current_monthly_emi: input.currentMonthlyEmi,
      arrears_amount: input.arrearsAmount,
      overdue_months: input.overdueMonths,
      remaining_loan_period_months: input.remainingLoanPeriodMonths,
      previous_rescheduling_count: input.previousReschedulingCount ?? 0,
      salary_at_origination: input.salaryAtOrigination ?? null,
      original_loan_amount: input.originalLoanAmount ?? null,
      remaining_balance: input.remainingBalance ?? null,
      payment_history_on_time_pct: input.paymentHistoryOnTimePct ?? null,
      loan_id: input.loanId ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`createLoanDetails failed: ${error.message}`);
  return data;
}

// ----------------------------------------------------------------------------
// 3. uploadApplicationDocument
// ----------------------------------------------------------------------------
/**
 * Uploads a single File/Blob to Supabase Storage under the standard path
 * `applications/{application_id}/{document_type}/{filename}` and returns
 * everything `saveDocumentMetadata()` needs.
 *
 * @param {string} applicationId
 * @param {string} documentType  - one of: salary_certificate | bank_statement |
 *                                 rescheduling_request | medical_report |
 *                                 passport_stamp | other_supporting_document
 * @param {File} file            - the browser File object from an <input type="file">
 * @returns {Promise<{storagePath: string, fileName: string, fileUrl: string}>}
 */
export async function uploadApplicationDocument(applicationId, documentType, file) {
  const storagePath = buildStoragePath(applicationId, documentType, file.name);

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true, // allow re-uploading/replacing the same document type
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    throw new Error(`uploadApplicationDocument failed: ${uploadError.message}`);
  }

  // If the bucket is public, getPublicUrl gives a directly-usable URL.
  // (If you instead make the bucket private, swap this for
  // `createSignedUrl(storagePath, expirySeconds)` — see docs/STORAGE notes.)
  const { data: publicUrlData } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(storagePath);

  return {
    storagePath,
    fileName: file.name,
    fileUrl: publicUrlData?.publicUrl ?? null,
  };
}

// ----------------------------------------------------------------------------
// 4. saveDocumentMetadata
// ----------------------------------------------------------------------------
/**
 * Inserts a `documents` row recording metadata for an uploaded file.
 *
 * @param {Object} input
 * @param {string} input.applicationId
 * @param {string} input.documentType
 * @param {string} input.fileName
 * @param {string} input.fileUrl
 * @param {string} input.storagePath
 * @returns {Promise<Object>} the created documents row
 */
export async function saveDocumentMetadata(input) {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      application_id: input.applicationId,
      document_type: input.documentType,
      file_name: input.fileName,
      file_url: input.fileUrl,
      storage_path: input.storagePath,
      validation_status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`saveDocumentMetadata failed: ${error.message}`);
  return data;
}

// ----------------------------------------------------------------------------
// 5. addAuditLog (small local helper — also re-exported from dashboardService)
// ----------------------------------------------------------------------------
async function addAuditLogEntry({ applicationId, actionType, actionDescription, performedBy = 'applicant' }) {
  const { error } = await supabase.from('audit_logs').insert({
    application_id: applicationId,
    action_type: actionType,
    action_description: actionDescription,
    performed_by: performedBy,
  });

  if (error) throw new Error(`addAuditLog failed: ${error.message}`);
}

// ----------------------------------------------------------------------------
// 6. submitFullApplication — the single call your form's submit button makes
// ----------------------------------------------------------------------------
/**
 * Orchestrates the entire applicant submission in one call:
 *   1. insert into applications
 *   2. insert loan_details
 *   3. upload each document to Storage
 *   4. insert document metadata rows
 *   5. write an APPLICATION_SUBMITTED audit-log entry
 *   6. return the created application record
 *
 * @param {Object} params
 * @param {Object} params.applicant        - fields for createApplication (without applicationId)
 * @param {Object} params.loan             - fields for createLoanDetails (without applicationId)
 * @param {Array<{documentType: string, file: File}>} params.documents
 * @returns {Promise<{application: Object, loanDetails: Object, documents: Object[]}>}
 */
export async function submitFullApplication({ applicant, loan, documents = [] }) {
  const applicationId = applicant.applicationId || generateApplicationId();

  // 1. applications
  const application = await createApplication({ ...applicant, applicationId });

  // 2. loan_details
  const loanDetails = await createLoanDetails({ ...loan, applicationId });

  // 3 & 4. upload each document, then store its metadata
  const savedDocuments = [];
  for (const doc of documents) {
    if (!doc?.file) continue; // skip empty/optional document slots
    const uploaded = await uploadApplicationDocument(applicationId, doc.documentType, doc.file);
    const metadata = await saveDocumentMetadata({ applicationId, ...uploaded, documentType: doc.documentType });
    savedDocuments.push(metadata);

    // one audit entry per uploaded document keeps the trail granular
    await addAuditLogEntry({
      applicationId,
      actionType: 'DOCUMENT_UPLOADED',
      actionDescription: `Uploaded ${doc.documentType}: ${uploaded.fileName}`,
      performedBy: 'applicant',
    });
  }

  // 5. top-level submission audit entry
  await addAuditLogEntry({
    applicationId,
    actionType: 'APPLICATION_SUBMITTED',
    actionDescription: `Applicant ${applicant.applicantName} submitted a new rescheduling application (${applicationId}).`,
    performedBy: 'applicant',
  });

  // 6. trigger the AI agent (fire-and-forget — Results page polls for completion)
  const agentUrl = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000'
  fetch(`${agentUrl}/process/${applicationId}`, { method: 'POST' }).catch(() => {})

  // 7. return everything the UI needs to show a confirmation screen
  return { application, loanDetails, documents: savedDocuments };
}

// ----------------------------------------------------------------------------
// 7. checkSubmissionEligibility — Rule 3: active request / cooldown validation
// ----------------------------------------------------------------------------

const ACTIVE_STATUSES = ['submitted', 'processing', 'pending_documents', 'needs_human_review', 'human_review']
const REJECTED_STATUSES = ['rejected']
const APPROVED_STATUSES = ['approved', 'approved_automatically', 'completed']

/**
 * Checks whether a citizen is allowed to submit a new application.
 * - Active application in progress → blocked until resolved
 * - Previously rejected → 1-day cooldown from updated_at
 * - Previously approved → 30-day cooldown from updated_at
 *
 * @param {string} emiratesIdNumber
 * @returns {Promise<{eligible: boolean, reason?: string, applicationId?: string, cooldownEnd?: Date, timeRemaining?: string}>}
 */
export async function checkSubmissionEligibility(emiratesIdNumber) {
  const { data, error } = await supabase
    .from('applications')
    .select('application_id, status, updated_at')
    .eq('emirates_id_number', emiratesIdNumber)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`checkSubmissionEligibility failed: ${error.message}`)
  if (!data) return { eligible: true }

  const { status, updated_at, application_id } = data
  const now = new Date()

  if (ACTIVE_STATUSES.includes(status)) {
    return { eligible: false, reason: 'active', applicationId: application_id }
  }

  if (REJECTED_STATUSES.includes(status)) {
    const cooldownEnd = new Date(new Date(updated_at).getTime() + 24 * 60 * 60 * 1000)
    if (now < cooldownEnd) {
      const hoursLeft = Math.ceil((cooldownEnd - now) / (60 * 60 * 1000))
      return {
        eligible: false,
        reason: 'rejected_cooldown',
        cooldownEnd,
        timeRemaining: hoursLeft <= 1 ? 'less than 1 hour' : `${hoursLeft} hours`,
      }
    }
  }

  if (APPROVED_STATUSES.includes(status)) {
    const cooldownEnd = new Date(new Date(updated_at).getTime() + 30 * 24 * 60 * 60 * 1000)
    if (now < cooldownEnd) {
      const daysLeft = Math.ceil((cooldownEnd - now) / (24 * 60 * 60 * 1000))
      return {
        eligible: false,
        reason: 'approved_cooldown',
        cooldownEnd,
        timeRemaining: daysLeft <= 1 ? 'less than 1 day' : `${daysLeft} days`,
      }
    }
  }

  return { eligible: true }
}

// ----------------------------------------------------------------------------
// 8. uploadAdditionalDocuments — re-upload missing docs and re-trigger the agent
// ----------------------------------------------------------------------------
/**
 * Uploads additional documents for an application that is in pending_documents status,
 * then automatically re-triggers the AI agent.
 *
 * @param {string} applicationId
 * @param {Array<{documentType: string, file: File}>} documents
 * @returns {Promise<void>}
 */
export async function uploadAdditionalDocuments(applicationId, documents) {
  for (const doc of documents) {
    if (!doc?.file) continue
    const uploaded = await uploadApplicationDocument(applicationId, doc.documentType, doc.file)
    await saveDocumentMetadata({ applicationId, ...uploaded, documentType: doc.documentType })
    await addAuditLogEntry({
      applicationId,
      actionType: 'DOCUMENT_UPLOADED',
      actionDescription: `Additional document uploaded: ${doc.documentType} — ${uploaded.fileName}`,
      performedBy: 'applicant',
    })
  }

  // Reset status back to submitted so the agent knows to re-process
  const { error } = await supabase
    .from('applications')
    .update({ status: 'submitted', missing_documents: null })
    .eq('application_id', applicationId)
  if (error) throw new Error(`Failed to reset application status: ${error.message}`)

  await addAuditLogEntry({
    applicationId,
    actionType: 'DOCUMENTS_RESUBMITTED',
    actionDescription: 'Applicant uploaded the requested additional documents. Agent re-triggered.',
    performedBy: 'applicant',
  })

  // Re-trigger agent automatically
  const agentUrl = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000'
  fetch(`${agentUrl}/process/${applicationId}`, { method: 'POST' }).catch(() => {})
}

// ----------------------------------------------------------------------------
// 9. getApplicationsByUser — returns all applications for a given Emirates ID
// ----------------------------------------------------------------------------
/**
 * Fetches all applications belonging to the logged-in citizen (matched by Emirates ID).
 *
 * @param {string} emiratesIdNumber
 * @returns {Promise<Object[]>}
 */
export async function getApplicationsByUser(emiratesIdNumber) {
  const { data, error } = await supabase
    .from('applications')
    .select(
      `
      *,
      loan_details (*),
      recommendations (*)
    `,
    )
    .eq('emirates_id_number', emiratesIdNumber)
    .order('submitted_at', { ascending: false })

  if (error) throw new Error(`getApplicationsByUser failed: ${error.message}`)
  return data || []
}

// ----------------------------------------------------------------------------
// 10. getApplicationById — lets the applicant check their own status later
// ----------------------------------------------------------------------------
/**
 * Fetches a single application (with its related rows) by application_id.
 * Useful for an applicant "track my application" view.
 *
 * @param {string} applicationId
 * @returns {Promise<Object|null>}
 */
export async function getApplicationById(applicationId) {
  const { data, error } = await supabase
    .from('applications')
    .select(
      `
      *,
      loan_details (*),
      documents (*),
      validation_results (*),
      recommendations (*),
      audit_logs (*)
    `
    )
    .eq('application_id', applicationId)
    .maybeSingle();

  if (error) throw new Error(`getApplicationById failed: ${error.message}`);
  return data;
}

/**
 * Citizen responds to a proposed rescheduling plan.
 * accept  → status = 'completed'
 * reject  → status = 'needs_human_review', human_review_required = true
 */
export async function respondToPlan(applicationId, decision, reason = '') {
  if (decision === 'accept') {
    const { error } = await supabase
      .from('applications')
      .update({ status: 'completed' })
      .eq('application_id', applicationId)
    if (error) throw new Error(`respondToPlan accept failed: ${error.message}`)
    await addAuditLogEntry({
      applicationId,
      actionType: 'CITIZEN_ACCEPTED',
      actionDescription: 'Citizen accepted the proposed rescheduling plan.',
      performedBy: 'citizen',
    })
  } else {
    const desc = reason.trim()
      ? `Citizen rejected the proposed plan. Reason: ${reason.trim()}`
      : 'Citizen rejected the proposed plan and requested human review.'
    const { error } = await supabase
      .from('applications')
      .update({
        status: 'needs_human_review',
        human_review_required: true,
        final_decision: desc,
      })
      .eq('application_id', applicationId)
    if (error) throw new Error(`respondToPlan reject failed: ${error.message}`)
    await addAuditLogEntry({
      applicationId,
      actionType: 'CITIZEN_REJECTED',
      actionDescription: desc,
      performedBy: 'citizen',
    })
  }
}
