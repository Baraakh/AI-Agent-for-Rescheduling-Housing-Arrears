import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import StatusBadge from './StatusBadge'
import RiskBadge from './RiskBadge'
import Icon from './Icon'
import { updateApplicationStatus, addAuditLog, upsertHumanRecommendation } from '../services/dashboardService'

const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000'

function formatCurrency(amount) {
  return `AED ${Number(amount || 0).toLocaleString('en-US')}`
}

const TERMINAL_STATUSES = [
  'approved', 'approved_automatically', 'completed',
  'needs_human_review', 'human_review', 'pending_documents', 'rejected',
]

function formatProcessingTime(submittedAt, updatedAt) {
  if (!submittedAt || !updatedAt) return null
  const diffMs = new Date(updatedAt) - new Date(submittedAt)
  if (diffMs <= 0) return null
  const secs = Math.round(diffMs / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`
}

function Field({ label, value, mono = false }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className={`mt-0.5 text-sm font-medium text-navy-900 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

function ChipList({ items, tone = 'neutral', emptyLabel = 'None', icon }) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-navy-300">{emptyLabel}</p>
  }
  const toneClasses =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
      : tone === 'bad'
        ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
        : 'bg-navy-50 text-navy-600 ring-navy-500/10'

  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item, idx) => (
        <li
          key={idx}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${toneClasses}`}
        >
          {icon && <Icon name={icon} className="text-[14px]" />}
          {item}
        </li>
      ))}
    </ul>
  )
}

function RuleRow({ label, passLabel, failLabel, passed, detail }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-navy-50 bg-navy-50/50 px-3 py-2.5">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          passed === true
            ? 'bg-emerald-100 text-emerald-600'
            : passed === false
              ? 'bg-rose-100 text-rose-600'
              : 'bg-navy-100 text-navy-400'
        }`}
      >
        <Icon
          name={passed === true ? 'check' : passed === false ? 'close' : 'remove'}
          className="text-[15px]"
        />
      </span>
      <div>
        <p className="text-xs font-semibold text-navy-700">
          {label}{' '}
          <span
            className={`font-bold ${
              passed === true ? 'text-emerald-600' : passed === false ? 'text-rose-600' : 'text-navy-400'
            }`}
          >
            {passed === true ? passLabel : passed === false ? failLabel : '—'}
          </span>
        </p>
        {detail && <p className="mt-0.5 text-xs leading-relaxed text-navy-500">{detail}</p>}
      </div>
    </div>
  )
}

const AUDIT_ICONS = {
  submitted: 'send',
  uploaded: 'cloud_upload',
  validation: 'task_alt',
  recommendation: 'lightbulb',
  status: 'flag',
  review: 'person_search',
  APPROVED: 'thumb_up',
  DOCUMENTS_REQUESTED: 'mark_email_unread',
  SENT_TO_REVIEW: 'person_search',
  REJECTED: 'block',
}

function buildAuditTrail(app, t) {
  let submittedAt = new Date(app.last_updated || app.updated_at || app.submitted_at || Date.now())
  if (isNaN(submittedAt.getTime())) submittedAt = new Date()
  const offsetDays = (n) =>
    new Date(submittedAt.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

  const hasDocs = app.documents_received && app.documents_received.length > 0
  const isComplete = !app.missing_documents || app.missing_documents.length === 0

  return [
    {
      key: 'submitted',
      label: t('auditSubmitted'),
      detail: `${app.applicant_name} submitted the rescheduling request (${app.application_id}).`,
      timestamp: offsetDays(6),
      done: true,
    },
    {
      key: 'uploaded',
      label: t('auditUploaded'),
      detail: hasDocs
        ? `${app.documents_received.length} document(s) received via the applicant portal.`
        : 'No documents were uploaded with the initial submission.',
      timestamp: offsetDays(5),
      done: hasDocs,
    },
    {
      key: 'validation',
      label: t('auditValidation'),
      detail: isComplete
        ? 'Salary, identity, and bank documents were validated and cross-checked.'
        : 'Validation paused — required documents are missing and must be supplied first.',
      timestamp: offsetDays(3),
      done: isComplete,
    },
    {
      key: 'recommendation',
      label: t('auditRecommendation'),
      detail:
        app.path_taken === 'P4'
          ? `Path P4: AED ${Number(app.emi_during_rescheduling_period || 0).toLocaleString()} EMI maintained. Arrears of ${formatCurrency(app.arrears_amount)} deferred to loan end.`
          : app.recommended_duration_months > 0
            ? `Recommended a ${app.recommended_duration_months}-month plan at ${formatCurrency(app.recommended_monthly_arrears_payment)}/month.`
            : app.path_taken === 'P5'
              ? 'Escalated to human review — no automated plan generated.'
              : 'No recommendation generated.',
      timestamp: offsetDays(2),
      done: !!app.path_taken,
    },
    {
      key: 'status',
      label: t('auditFinalStatus'),
      detail: `Case marked as "${app.status}".`,
      timestamp: offsetDays(1),
      done: true,
    },
    {
      key: 'review',
      label: app.human_review_required ? t('auditReviewPending') : t('auditReviewNotRequired'),
      detail: app.human_review_required
        ? 'Routed to the Finance & Collection Department for a final officer decision.'
        : 'The system decision met all automatic-approval criteria — no employee action required.',
      timestamp: app.last_updated,
      done: !app.human_review_required,
      pending: app.human_review_required,
    },
  ]
}

const ACTION_TONE_CLASSES = {
  agent: 'bg-indigo-600 text-white hover:bg-indigo-700',
  primary: 'bg-navy-900 text-white hover:bg-navy-800',
  secondary: 'bg-navy-50 text-navy-700 ring-1 ring-inset ring-navy-100 hover:bg-navy-100',
  danger: 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
}

const DOCUMENT_TYPE_LABELS = {
  salary_certificate: 'Salary Certificate',
  bank_statement: 'Bank Statement (6 months)',
  rescheduling_request: 'Rescheduling Request Form',
  medical_report: 'Medical Report',
  passport_stamp: 'Passport / Travel Proof',
  other_supporting_document: 'Supporting Document',
}

function normalizeApplication(app) {
  if (!app) return null

  const loan = Array.isArray(app.loan_details) ? app.loan_details[0] : app.loan_details
  const val =
    Array.isArray(app.validation_results) ? app.validation_results[0] : app.validation_results
  const rec =
    Array.isArray(app.recommendations) ? app.recommendations[0] : app.recommendations

  let docsReceived = app.documents_received || []
  let docsMissing = app.missing_documents || []

  if (Array.isArray(app.documents)) {

    const uploadedTypes = new Set(
      app.documents
        .filter((d) => {
          const s = (d.status || d.validation_status || '').toLowerCase()
          return s === 'uploaded' || s === 'valid' || s === 'received' || s === 'pending'
        })
        .map((d) => d.document_type),
    )

    const requiredTypes = ['salary_certificate', 'bank_statement']
    const missingTypes = requiredTypes.filter((type) => !uploadedTypes.has(type))

    docsReceived = app.documents
      .filter((d) => {
        const s = (d.status || d.validation_status || '').toLowerCase()
        return s === 'uploaded' || s === 'valid' || s === 'received' || s === 'pending'
      })
      .map((d) => DOCUMENT_TYPE_LABELS[d.document_type] || d.document_type || d.file_name)

    docsMissing = missingTypes.map((type) => DOCUMENT_TYPE_LABELS[type] || type)
  }

  return {
    ...app,
    current_salary: loan?.current_salary ?? app.current_salary,
    employer_name:
      app.employer_name ??
      loan?.employer_name ??
      val?.extracted_financials?.employer_name ??
      '—',
    current_monthly_emi: loan?.current_monthly_emi ?? app.current_monthly_emi,
    arrears_amount: loan?.arrears_amount ?? app.arrears_amount,
    overdue_months: loan?.overdue_months ?? app.overdue_months,
    remaining_balance: loan?.remaining_balance ?? app.remaining_balance,
    original_loan_amount: loan?.original_loan_amount ?? app.original_loan_amount,
    salary_at_origination: loan?.salary_at_origination ?? app.salary_at_origination,
    recommended_monthly_arrears_payment:
      rec?.recommended_monthly_arrears_payment ?? app.recommended_monthly_arrears_payment,
    emi_during_rescheduling_period:
      rec?.emi_during_rescheduling_period ?? app.emi_during_rescheduling_period,
    emi_after_rescheduling_period:
      rec?.emi_after_rescheduling_period ?? app.emi_after_rescheduling_period,
    recommended_duration_months: rec?.recommended_duration_months ?? app.recommended_duration_months,
    decision_rationale:
      app.decision_rationale ||
      rec?.final_decision ||
      rec?.rationale?.rationale_en ||
      app.decision_rationale,
    path_taken: rec?.path_taken ?? app.path_taken,
    proposed_deduction_rate_pct: rec?.proposed_deduction_rate_pct ?? app.proposed_deduction_rate_pct,
    period_rule_passed: rec?.period_rule_passed ?? app.period_rule_passed,
    twenty_pct_rule_passed: rec?.twenty_pct_rule_passed ?? app.twenty_pct_rule_passed,
    income_change_pct: rec?.income_change_pct ?? app.income_change_pct,
    per_member_income: rec?.per_member_income ?? app.per_member_income,
    case_summary: rec?.case_summary ?? app.case_summary,
    rec_reasoning: rec?.reasoning ?? rec?.rationale?.rationale_en,
    bank_statement_source: val?.bank_statement_source ?? app.bank_statement_source ?? null,
    hardship_permanence: app.hardship_permanence ?? null,
    add_mandate: app.add_mandate ?? null,
    validation_results: {
      salary_certificate_valid:
        val?.salary_certificate_valid ?? app.validation_results?.salary_certificate_valid,
      bank_statement_available:
        val?.bank_statement_available ?? app.validation_results?.bank_statement_available,
      salary_match_status: val?.salary_match_status ?? app.validation_results?.salary_match_status,
      salary_discrepancy_pct:
        val?.salary_discrepancy_pct ?? app.validation_results?.salary_discrepancy_pct,
      document_completeness_status:
        val?.document_completeness_status ??
        app.validation_results?.document_completeness_status,
      cross_document_consistency:
        val?.cross_document_consistency ?? app.validation_results?.cross_document_consistency,
      identified_issues: val?.identified_issues ?? app.validation_results?.identified_issues,
    },
    documents_received: docsReceived,
    missing_documents: docsMissing,
  }
}

// ── Agent Trace Panel ────────────────────────────────────────────────────────

const EVENT_STYLES = {
  agent_start:     { icon: 'play_circle',   color: 'text-navy-400',   bg: 'bg-navy-50'   },
  agent_complete:  { icon: 'check_circle',  color: 'text-emerald-600', bg: 'bg-emerald-50' },
  tool_call:       { icon: 'build',         color: 'text-blue-600',    bg: 'bg-blue-50'   },
  tool_result:     { icon: 'done',          color: 'text-emerald-600', bg: 'bg-emerald-50' },
  tool_error:      { icon: 'error',         color: 'text-red-600',     bg: 'bg-red-50'    },
  claude_reasoning:{ icon: 'psychology',    color: 'text-purple-600',  bg: 'bg-purple-50' },
}

function TraceEvent({ event }) {
  const [expanded, setExpanded] = useState(false)
  const { t } = useLanguage()
  const style = EVENT_STYLES[event.event] || EVENT_STYLES.tool_call
  const ts = event.ts ? new Date(event.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''

  let title = event.event
  let body = null

  if (event.event === 'tool_call') {
    title = `→ ${event.tool_name}`
    body = JSON.stringify(event.tool_input, null, 2)
  } else if (event.event === 'tool_result') {
    title = `✓ ${event.tool_name}`
    body = JSON.stringify(event.result, null, 2)
  } else if (event.event === 'tool_error') {
    title = `✗ ${event.tool_name}`
    body = event.error
  } else if (event.event === 'claude_reasoning') {
    title = t('claudeReasoning')
    body = event.text
  } else if (event.event === 'agent_complete') {
    title = `${t('agentFinished')} — ${event.total_iterations} iterations`
    body = event.summary || null
  } else if (event.event === 'agent_start') {
    title = t('agentStarted')
  }

  return (
    <div className={`rounded-lg border border-transparent px-3 py-2 ${style.bg} mb-1.5`}>
      <div
        className={`flex items-center gap-2 cursor-pointer select-none`}
        onClick={() => body && setExpanded(v => !v)}
      >
        {event.iteration != null && (
          <span className="text-[10px] font-mono font-bold text-navy-300 w-5 text-right shrink-0">
            {event.iteration}
          </span>
        )}
        <Icon name={style.icon} className={`text-[15px] shrink-0 ${style.color}`} />
        <span className={`flex-1 text-xs font-semibold ${style.color}`}>{title}</span>
        <span className="text-[10px] text-navy-300 font-mono">{ts}</span>
        {body && (
          <Icon
            name={expanded ? 'expand_less' : 'expand_more'}
            className="text-[15px] text-navy-300 shrink-0"
          />
        )}
      </div>
      {expanded && body && (
        <pre className="mt-2 ml-7 overflow-x-auto whitespace-pre-wrap break-words rounded bg-white/70 p-2 text-[11px] font-mono text-navy-700 border border-navy-100 max-h-64 overflow-y-auto">
          {body}
        </pre>
      )}
    </div>
  )
}

function AgentTracePanel({ applicationId }) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetchKey, setFetchKey] = useState(0)
  const { t } = useLanguage()

  const refresh = useCallback(() => setFetchKey(k => k + 1), [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      setLoading(true)
      setError('')
      fetch(`${AGENT_API_URL}/logs/${applicationId}`)
        .then(r => {
          if (r.status === 404) throw new Error('No trace log found — run the agent first.')
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then(data => { if (!cancelled) setEvents(data.events || []) })
        .catch(err => { if (!cancelled) setError(err.message) })
        .finally(() => { if (!cancelled) setLoading(false) })
    })
    return () => { cancelled = true }
  }, [open, fetchKey, applicationId])

  return (
    <section className="rounded-2xl border border-navy-100 bg-white shadow-card overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-navy-50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <Icon name="terminal" className="text-[18px] text-navy-400" />
          {t('agentTrace')}
          {events.length > 0 && (
            <span className="ml-1 rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-bold text-navy-500">
              {events.length} events
            </span>
          )}
        </h3>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="text-[18px] text-navy-400" />
      </button>

      {open && (
        <div className="border-t border-navy-100 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-navy-400">
              {t('agentTraceDesc')}
            </p>
            <button
              onClick={refresh}
              className="flex items-center gap-1 rounded-lg border border-navy-200 bg-white px-2 py-1 text-xs font-medium text-navy-600 hover:border-navy-300 transition-colors"
            >
              <Icon name="refresh" className="text-[13px]" />
              {t('refresh')}
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 py-6 text-navy-400 text-sm">
              <Icon name="sync" className="text-[18px] animate-spin" />
              {t('loadingTrace')}
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              <Icon name="error" className="text-[15px] shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <p className="py-4 text-center text-sm text-navy-400">{t('noEventsToShow')}</p>
          )}

          {!loading && events.length > 0 && (
            <div>
              {events.map((ev, i) => <TraceEvent key={i} event={ev} />)}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function ApplicationDetailsPanel({ application }) {
  const { t, language } = useLanguage()
  const [actionNotice, setActionNotice] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [showRequestDocsModal, setShowRequestDocsModal] = useState(false)
  const [selectedRequestDocs, setSelectedRequestDocs] = useState([])
  const [requestDocsNote, setRequestDocsNote] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [overrideDuration, setOverrideDuration] = useState('')
  const [overrideEmiDuring, setOverrideEmiDuring] = useState('')
  const [overrideEmiAfter, setOverrideEmiAfter] = useState('')
  const [overrideArrearsMonth, setOverrideArrearsMonth] = useState('')
  const [overrideNotes, setOverrideNotes] = useState('')

  const locale = language === 'ar' ? 'ar-AE' : 'en-GB'

  function formatDateTime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const REQUEST_DOC_OPTIONS = [
    { key: 'salary_certificate', label: t('docOptSalaryCertificate') },
    { key: 'bank_statement', label: t('docOptBankStatement') },
    { key: 'medical_report', label: t('docOptMedicalReport') },
    { key: 'hardship_letter', label: t('docOptHardshipLetter') },
    { key: 'passport', label: t('docOptPassport') },
    { key: 'other', label: t('docOptOther') },
  ]

  const ACTIONS = [
    { key: 'analyze-ai', label: t('reAnalyze'), icon: 'smart_toy', tone: 'agent' },
    { key: 'approve', label: t('approve'), icon: 'thumb_up', tone: 'primary', status: 'completed', auditType: 'APPROVED', desc: 'Approved the rescheduling recommendation.' },
    { key: 'request-docs', label: t('requestDocuments'), icon: 'mark_email_unread', tone: 'secondary' },
    { key: 'send-review', label: t('sendToHumanReview'), icon: 'person_search', tone: 'secondary', status: 'needs_human_review', auditType: 'SENT_TO_REVIEW', desc: 'Escalated application to human review.' },
    { key: 'reject', label: t('reject') || 'Reject', icon: 'cancel', tone: 'danger' },
  ]

  if (!application) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-16 text-center">
        <Icon name="inventory_2" className="text-[32px] text-navy-300" />
        <p className="text-sm font-medium text-navy-600">{t('noCase')}</p>
        <p className="max-w-xs text-xs text-navy-400">
          {t('viewDetailsCTA')}
        </p>
      </div>
    )
  }

  const app = normalizeApplication(application)
  const v = app.validation_results || {}

  const PATH_LABELS = {
    P1: t('pathP1'),
    P2: t('pathP2'),
    P3: t('pathP3'),
    P4: t('pathP4'),
    P5: t('pathP5'),
  }

  const auditTrail =
    Array.isArray(app.audit_logs) && app.audit_logs.length > 0
      ? app.audit_logs
          .slice()
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          .map((log) => ({
            key: log.id || log.created_at,
            label: log.action_type || 'Action performed',
            detail: log.action_description,
            timestamp: log.created_at,
            done: true,
          }))
      : buildAuditTrail(app, t)

  const handleAction = async (action) => {
    if (action.key === 'analyze-ai') {
      setUpdating(true)
      setActionNotice(t('processingMsg'))
      try {
        const res = await fetch(`${AGENT_API_URL}/process/${app.application_id}`, {
          method: 'POST',
        })
        if (!res.ok) throw new Error(`API returned HTTP ${res.status}`)
        const data = await res.json()
        setActionNotice(
          `Analysis complete — ${data.agent_iterations ?? '—'} reasoning steps performed.`,
        )
        window.dispatchEvent(
          new CustomEvent('application-updated', { detail: { id: app.application_id } }),
        )
      } catch (err) {
        setActionNotice(`Error: ${err.message}`)
      } finally {
        setUpdating(false)
        setTimeout(() => setActionNotice(null), 6000)
      }
      return
    }

    if (action.key === 'request-docs') {
      setSelectedRequestDocs([])
      setRequestDocsNote('')
      setShowRequestDocsModal(true)
      return
    }

    if (action.key === 'reject') {
      setRejectionReason('')
      setRejecting(true)
      return
    }

    setUpdating(true)
    try {
      const statusChanges = { status: action.status }
      if (action.status === 'completed') {
        statusChanges.finalDecision = 'Approved by reviewer'
        statusChanges.humanReviewRequired = false
      } else if (action.status === 'needs_human_review') {
        statusChanges.humanReviewRequired = true
      }
      await updateApplicationStatus(app.application_id, statusChanges)
      await addAuditLog({
        applicationId: app.application_id,
        actionType: action.auditType,
        actionDescription: `${action.desc} (Performed by: employee.reviewer@moei.gov.ae)`,
        performedBy: 'employee.reviewer@moei.gov.ae',
      })
      setActionNotice(`"${action.label}" ${t('actionSaved')}`)
      setTimeout(() => setActionNotice(null), 3000)
      window.dispatchEvent(
        new CustomEvent('application-updated', { detail: { id: app.application_id } }),
      )
    } catch (err) {
      setActionNotice(`Error: ${err.message}`)
      setTimeout(() => setActionNotice(null), 4000)
    } finally {
      setUpdating(false)
    }
  }

  const handleRequestDocsSubmit = async () => {
    if (selectedRequestDocs.length === 0) return
    setUpdating(true)
    setShowRequestDocsModal(false)
    try {
      const docLabels = REQUEST_DOC_OPTIONS.filter((o) =>
        selectedRequestDocs.includes(o.key),
      ).map((o) => o.label)
      if (requestDocsNote) docLabels.push(`Note: ${requestDocsNote}`)
      const desc = `Requested additional documents: ${docLabels.join('; ')}. (By: employee.reviewer@moei.gov.ae)`
      await updateApplicationStatus(app.application_id, { status: 'pending_documents' })
      await addAuditLog({
        applicationId: app.application_id,
        actionType: 'DOCUMENTS_REQUESTED',
        actionDescription: desc,
        performedBy: 'employee.reviewer@moei.gov.ae',
      })
      setActionNotice(t('documentRequestSent'))
      setTimeout(() => setActionNotice(null), 4000)
      window.dispatchEvent(
        new CustomEvent('application-updated', { detail: { id: app.application_id } }),
      )
    } catch (err) {
      setActionNotice(`Error: ${err.message}`)
      setTimeout(() => setActionNotice(null), 4000)
    } finally {
      setUpdating(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) return
    setUpdating(true)
    try {
      await updateApplicationStatus(app.application_id, {
        status: 'rejected',
        finalDecision: rejectionReason.trim(),
        humanReviewRequired: false,
      })
      await addAuditLog({
        applicationId: app.application_id,
        actionType: 'REJECTED',
        actionDescription: `Application rejected by reviewer. Reason: ${rejectionReason.trim()}`,
        performedBy: 'employee.reviewer@moei.gov.ae',
      })
      setRejecting(false)
      setRejectionReason('')
      setActionNotice('Application has been rejected.')
      window.dispatchEvent(new CustomEvent('application-updated', { detail: { id: app.application_id } }))
    } catch (err) {
      setActionNotice(`Error: ${err.message}`)
    } finally {
      setUpdating(false)
      setTimeout(() => setActionNotice(null), 6000)
    }
  }

  const handleHumanOverride = async () => {
    setUpdating(true)
    try {
      await upsertHumanRecommendation(app.application_id, {
        durationMonths: overrideDuration ? parseInt(overrideDuration, 10) : null,
        emiDuring: overrideEmiDuring ? parseFloat(overrideEmiDuring) : null,
        emiAfter: overrideEmiAfter ? parseFloat(overrideEmiAfter) : null,
        arrearsStartMonth: overrideArrearsMonth || null,
        notes: overrideNotes,
      })
      await updateApplicationStatus(app.application_id, {
        status: 'approved',
        finalDecision: `Human reviewer approved with custom plan.${overrideNotes ? ' ' + overrideNotes : ''}`,
        humanReviewRequired: false,
      })
      const parts = [
        'Custom plan approved by human reviewer.',
        overrideDuration && `Duration: ${overrideDuration} months.`,
        overrideEmiDuring && `EMI during: AED ${overrideEmiDuring}.`,
        overrideEmiAfter && `EMI after: AED ${overrideEmiAfter}.`,
        overrideArrearsMonth && `Arrears from: ${overrideArrearsMonth}.`,
        overrideNotes && `Notes: ${overrideNotes}`,
      ].filter(Boolean)
      await addAuditLog({
        applicationId: app.application_id,
        actionType: 'HUMAN_PLAN_APPROVED',
        actionDescription: parts.join(' '),
        performedBy: 'employee.reviewer@moei.gov.ae',
      })
      setActionNotice('Custom plan saved and application approved.')
      window.dispatchEvent(new CustomEvent('application-updated', { detail: { id: app.application_id } }))
    } catch (err) {
      setActionNotice(`Error: ${err.message}`)
    } finally {
      setUpdating(false)
      setTimeout(() => setActionNotice(null), 6000)
    }
  }

  const incomeMatchOk =
    v.salary_match_status !== 'mismatch' &&
    v.salary_match_status !== 'pending' &&
    v.salary_match_status != null &&
    (
      v.salary_match_status === 'match' ||
      v.salary_match_status === 'matched' ||
      v.salary_match_status === 'PASS' ||
      v.salary_match_status === 'pass' ||
      v.salary_match_status === 'verified' ||
      (typeof v.salary_discrepancy_pct === 'number' && Math.abs(v.salary_discrepancy_pct) <= 10)
    )

  const discrepancyPct =
    v.salary_discrepancy_pct != null ? `${Number(v.salary_discrepancy_pct).toFixed(1)}%` : null

  const incomeChangePct =
    app.income_change_pct != null
      ? `${app.income_change_pct > 0 ? '+' : ''}${Number(app.income_change_pct).toFixed(1)}%`
      : null

  const perMemberIncome = app.per_member_income
  const perMemberOk = perMemberIncome != null && perMemberIncome >= 2500

  return (
    <div className="space-y-5 fade-in">
      {/* Request Docs Modal */}
      {showRequestDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-navy-900">{t('requestAdditionalDocuments')}</h3>
              <button
                onClick={() => setShowRequestDocsModal(false)}
                className="text-navy-400 hover:text-navy-700"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            <div className="space-y-2 p-5">
              <p className="text-xs text-navy-500 mb-3">
                {t('selectDocumentsNeeded')}
              </p>
              {REQUEST_DOC_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-navy-100 px-4 py-3 hover:bg-navy-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedRequestDocs.includes(opt.key)}
                    onChange={(e) =>
                      setSelectedRequestDocs((prev) =>
                        e.target.checked ? [...prev, opt.key] : prev.filter((k) => k !== opt.key),
                      )
                    }
                    className="h-4 w-4 rounded border-navy-300 text-navy-900"
                  />
                  <span className="text-sm text-navy-700">{opt.label}</span>
                </label>
              ))}
              <textarea
                value={requestDocsNote}
                onChange={(e) => setRequestDocsNote(e.target.value)}
                placeholder={t('additionalInstructions')}
                rows={2}
                className="mt-3 w-full rounded-xl border border-navy-100 px-4 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-navy-400 focus:outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-navy-100 px-5 py-4">
              <button
                onClick={() => setShowRequestDocsModal(false)}
                className="rounded-xl border border-navy-100 px-4 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleRequestDocsSubmit}
                disabled={selectedRequestDocs.length === 0}
                className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-40"
              >
                {t('sendRequest')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-navy-900">Reject Application</h3>
              <button
                onClick={() => { setRejecting(false); setRejectionReason('') }}
                className="text-navy-400 hover:text-navy-700"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-navy-500">
                This action is final and will be permanently recorded in the audit trail.
              </p>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-1">
                Rejection Reason *
              </label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter a clear, detailed reason for rejection…"
                className="w-full rounded-xl border border-navy-100 px-4 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-rose-400 focus:outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-navy-100 px-5 py-4">
              <button
                onClick={() => { setRejecting(false); setRejectionReason('') }}
                className="rounded-xl border border-navy-100 px-4 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                disabled={!rejectionReason.trim() || updating}
                onClick={handleReject}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-40"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile header */}
      <section className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-navy-50 bg-gradient-to-r from-navy-900 to-navy-700 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold ring-1 ring-white/20">
              {(app.applicant_name || '—')
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')}
            </span>
            <div>
              <p className="text-base font-semibold">{app.applicant_name}</p>
              <p className="font-mono text-xs text-navy-200">{app.application_id}</p>
              <p className="mt-0.5 text-xs text-navy-300">{app.employer_name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={app.status} />
            <RiskBadge level={app.risk_level} />
            {app.confidence_score != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20">
                <Icon name="insights" className="text-[14px]" />
                {app.confidence_score}{t('pctConfidence')}
              </span>
            )}
            {TERMINAL_STATUSES.includes(app.status) &&
              formatProcessingTime(app.submitted_at, app.updated_at) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-semibold text-amber-200 ring-1 ring-inset ring-amber-300/30">
                  <Icon name="bolt" className="text-[14px]" filled />
                  {formatProcessingTime(app.submitted_at, app.updated_at)} · {t('wasWorkingDays')}
                </span>
              )}
          </div>
        </div>

        {/* Identity verification & UAE PASS badge */}
        <div className="flex flex-wrap items-center gap-3 border-b border-navy-50 px-5 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            <Icon name="verified_user" className="text-[14px] text-emerald-600" />
            {t('identityVerifiedUAEPASS')}
          </span>
          {app.emirates_id_number && (
            <span className="font-mono text-xs text-navy-500">
              {t('emiratesId')} {app.emirates_id_number}
            </span>
          )}
          {app.family_size && (
            <span className="text-xs text-navy-500">
              {t('household')} {app.family_size} {t('members')}
            </span>
          )}
        </div>

        {/* Decision banner */}
        <div
          className={`flex items-start gap-3 px-5 py-4 ${
            app.human_review_required
              ? 'bg-amber-50/70'
              : /rejected|not eligible/i.test(app.status)
                ? 'bg-rose-50/70'
                : 'bg-emerald-50/70'
          }`}
        >
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              app.human_review_required
                ? 'bg-amber-100 text-amber-600'
                : /rejected|not eligible/i.test(app.status)
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-emerald-100 text-emerald-600'
            }`}
          >
            <Icon
              name={
                app.human_review_required
                  ? 'person_search'
                  : /rejected|not eligible/i.test(app.status)
                    ? 'block'
                    : 'verified'
              }
              filled
              className="text-[20px]"
            />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">
              Status: <span className="font-mono">{app.status}</span>
              {app.path_taken && (
                <span className="ml-2 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                  {PATH_LABELS[app.path_taken] || app.path_taken}
                </span>
              )}
            </p>
            {app.decision_rationale && (
              <p className="mt-1 text-xs leading-relaxed text-navy-600">{app.decision_rationale}</p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-5 sm:grid-cols-3 lg:grid-cols-4">
          <Field label={t('fieldAppId')} value={app.application_id} mono />
          <Field label={t('fieldCurrentSalary')} value={app.current_salary ? formatCurrency(app.current_salary) : 'From document'} />
          <Field label={t('fieldEmployer')} value={app.employer_name} />
          <Field label={t('fieldCurrentEmi')} value={formatCurrency(app.current_monthly_emi)} />
          <Field label={t('fieldArrearsAmount')} value={formatCurrency(app.arrears_amount)} />
          <Field label={t('fieldOverdueMonths')} value={app.overdue_months ? `${app.overdue_months} months` : '—'} />
          <Field label={t('fieldRemainingBalance')} value={app.remaining_balance ? formatCurrency(app.remaining_balance) : '—'} />
          <Field label={t('fieldLastUpdated')} value={formatDateTime(app.last_updated)} />
        </dl>
      </section>

      {/* Full AI Analysis Panel */}
      <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-card">
        <div className="border-b border-indigo-100 bg-indigo-50 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <Icon name="psychology" className="text-[18px] text-indigo-600" />
            {t('systemAnalysis')}
          </h3>
        </div>

        <div className="divide-y divide-navy-50">
          {/* Case summary */}
          {app.case_summary && (
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-2">
                {t('caseSummary')}
              </p>
              <p className="text-sm leading-relaxed text-navy-700">{app.case_summary}</p>
            </div>
          )}

          {/* Income analysis */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-3">
              {t('incomeAnalysis')}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: t('incomeSalaryCurrent'), value: app.current_salary ? formatCurrency(app.current_salary) : 'Extracted from doc' },
                { label: t('incomeSalaryOrigination'), value: app.salary_at_origination ? formatCurrency(app.salary_at_origination) : '—' },
                {
                  label: t('incomeChange'),
                  value: incomeChangePct || '—',
                  highlight: incomeChangePct
                    ? app.income_change_pct > 0
                      ? 'emerald'
                      : 'rose'
                    : null,
                },
                {
                  label: t('perFamilyMember'),
                  value: perMemberIncome ? `${formatCurrency(perMemberIncome)}/mo` : '—',
                  note: perMemberIncome
                    ? perMemberOk
                      ? t('thresholdAbove')
                      : t('thresholdBelow')
                    : null,
                  highlight: perMemberIncome ? (perMemberOk ? 'emerald' : 'rose') : null,
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-navy-50 bg-navy-50/50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                    {item.label}
                  </p>
                  <p
                    className={`mt-1 text-sm font-semibold ${
                      item.highlight === 'emerald'
                        ? 'text-emerald-700'
                        : item.highlight === 'rose'
                          ? 'text-rose-700'
                          : 'text-navy-900'
                    }`}
                  >
                    {item.value}
                  </p>
                  {item.note && (
                    <p
                      className={`mt-0.5 text-[10px] ${
                        item.highlight === 'emerald' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {item.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rule compliance */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-3">
              {t('ruleComplianceChecks')}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <RuleRow
                label={t('rule20Pct')}
                passLabel={t('rulePass')}
                failLabel={t('ruleFail')}
                passed={app.twenty_pct_rule_passed}
                detail={
                  app.twenty_pct_rule_passed === true
                    ? app.proposed_deduction_rate_pct != null
                      ? `New EMI is ${Number(app.proposed_deduction_rate_pct).toFixed(1)}% of salary (≤ 20%)`
                      : 'New plan stays within the 20% cap'
                    : app.twenty_pct_rule_passed === false
                      ? 'Proposed plan exceeds 20% of monthly salary'
                      : 'Not yet evaluated'
                }
              />
              <RuleRow
                label={t('ruleRepaymentPeriod')}
                passLabel={t('rulePass')}
                failLabel={t('ruleFail')}
                passed={app.period_rule_passed}
                detail={
                  app.period_rule_passed === true
                    ? 'Plan duration fits within the original loan term'
                    : app.period_rule_passed === false
                      ? 'Plan duration would exceed the original loan term'
                      : 'Not yet evaluated'
                }
              />
              <RuleRow
                label={t('ruleCrossCheck')}
                passLabel={t('rulePass')}
                failLabel={t('ruleFail')}
                passed={incomeMatchOk}
                detail={
                  discrepancyPct
                    ? `Discrepancy: ${discrepancyPct} (tolerance: ±10%)`
                    : v.salary_match_status || 'Certificate vs bank statement 6-month average'
                }
              />
            </div>
          </div>

          {/* Hardship context */}
          {app.hardship_permanence && app.hardship_permanence !== 'UNKNOWN' && (
            <div className="px-5 py-3 flex items-center gap-2.5 flex-wrap">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                Hardship Permanence
              </p>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
                app.hardship_permanence === 'PERMANENT'
                  ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
                  : app.hardship_permanence === 'LONG_TERM'
                    ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                    : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
              }`}>
                <Icon
                  name={app.hardship_permanence === 'PERMANENT' ? 'warning' : app.hardship_permanence === 'LONG_TERM' ? 'schedule' : 'check_circle'}
                  className="text-[13px]"
                />
                {app.hardship_permanence === 'PERMANENT' ? 'Permanent — ESC9 eligible' : app.hardship_permanence === 'LONG_TERM' ? 'Long-term (>12 months)' : 'Temporary'}
              </span>
            </div>
          )}

          {/* Proposed plan summary — shown for all paths that produced a plan (P1/P2/P3/P4) */}
          {app.path_taken && app.path_taken !== 'P5' && app.emi_during_rescheduling_period != null && (
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-3">
                {t('proposedPlan')}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: app.path_taken === 'P4' ? t('planCurrentEmi') || 'Current EMI' : t('planNewEmi'),
                    value: formatCurrency(app.emi_during_rescheduling_period),
                  },
                  {
                    label: t('planEmiAfter'),
                    value: app.emi_after_rescheduling_period === 0
                      ? (language === 'ar' ? 'القرض مسدد بالكامل' : 'Loan paid off')
                      : formatCurrency(app.emi_after_rescheduling_period),
                  },
                  {
                    label: t('planDuration'),
                    value: app.recommended_duration_months > 0
                      ? `${app.recommended_duration_months} months`
                      : (() => {
                          const extra = app.current_monthly_emi
                            ? Math.ceil((app.arrears_amount || 0) / app.current_monthly_emi)
                            : null
                          return language === 'ar'
                            ? `مؤجل لنهاية القرض${extra ? ` (+${extra} شهراً)` : ''}`
                            : `Deferred to loan end${extra ? ` (+${extra} extra months)` : ''}`
                        })(),
                  },
                  app.path_taken === 'P4'
                    ? {
                        label: language === 'ar' ? 'آلية السداد' : 'How Repaid',
                        value: (() => {
                          const extra = app.current_monthly_emi
                            ? Math.ceil((app.arrears_amount || 0) / app.current_monthly_emi)
                            : null
                          return extra
                            ? `${extra} extra payments of ${formatCurrency(app.current_monthly_emi)}`
                            : '—'
                        })(),
                      }
                    : {
                        label: t('planDeductionRate'),
                        value: app.proposed_deduction_rate_pct
                          ? `${Number(app.proposed_deduction_rate_pct).toFixed(1)}% of salary`
                          : '—',
                      },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-navy-50 bg-navy-50/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-navy-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADD Mandate */}
          {app.add_mandate && (
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-3">
                Auto Direct Debit Mandate
              </p>
              <div className={`rounded-xl border p-4 ${
                app.add_mandate.mandate_status === 'SIGNED'
                  ? 'border-emerald-200 bg-emerald-50'
                  : app.add_mandate.mandate_status === 'REJECTED_BY_BENEFICIARY'
                    ? 'border-rose-200 bg-rose-50'
                    : 'border-amber-200 bg-amber-50'
              }`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Icon
                      name={app.add_mandate.mandate_status === 'SIGNED' ? 'verified' : app.add_mandate.mandate_status === 'REJECTED_BY_BENEFICIARY' ? 'cancel' : 'pending_actions'}
                      filled
                      className={`text-[22px] ${app.add_mandate.mandate_status === 'SIGNED' ? 'text-emerald-600' : app.add_mandate.mandate_status === 'REJECTED_BY_BENEFICIARY' ? 'text-rose-600' : 'text-amber-600'}`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-navy-900">
                        {app.add_mandate.mandate_status === 'SIGNED'
                          ? 'Direct Debit Active'
                          : app.add_mandate.mandate_status === 'REJECTED_BY_BENEFICIARY'
                            ? 'Mandate Rejected by Beneficiary'
                            : 'Awaiting Beneficiary Signature'}
                      </p>
                      <p className="text-[11px] font-mono text-navy-500 mt-0.5">{app.add_mandate.mandate_id}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${
                    app.add_mandate.mandate_status === 'SIGNED'
                      ? 'bg-emerald-100 text-emerald-700 ring-emerald-600/20'
                      : app.add_mandate.mandate_status === 'REJECTED_BY_BENEFICIARY'
                        ? 'bg-rose-100 text-rose-700 ring-rose-600/20'
                        : 'bg-amber-100 text-amber-700 ring-amber-600/20'
                  }`}>
                    {app.add_mandate.mandate_status === 'SIGNED' ? 'SIGNED'
                      : app.add_mandate.mandate_status === 'REJECTED_BY_BENEFICIARY' ? 'REJECTED'
                      : 'PENDING SIGNATURE'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Agreed EMI', value: formatCurrency(app.add_mandate.agreed_emi) },
                    { label: 'First Deduction', value: app.add_mandate.first_deduction_date },
                    { label: 'Bank', value: app.add_mandate.bank_name },
                    { label: 'Account', value: app.add_mandate.account_number_masked },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">{item.label}</p>
                      <p className="mt-0.5 text-xs font-semibold text-navy-800">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reasoning */}
          {(app.rec_reasoning || app.decision_rationale) && (
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-2">
                {t('reasoning')}
              </p>
              <p className="text-sm leading-relaxed text-navy-700">
                {app.rec_reasoning || app.decision_rationale}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Documents */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <Icon name="folder_open" className="text-[18px] text-navy-400" />
            {t('documents')}
          </h3>
          <div className="mt-3 space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                {t('identity')}
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                <Icon name="verified_user" className="text-[14px] text-emerald-600" />
                {t('identityVerifiedUAEPASS')}
                {app.emirates_id_number && (
                  <span className="ml-1 font-mono text-emerald-700">{app.emirates_id_number}</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                {t('documentsReceived')}
              </p>
              {Array.isArray(app.documents) && app.documents.some((d) => {
                const s = (d.status || d.validation_status || '').toLowerCase()
                return s === 'uploaded' || s === 'valid' || s === 'received' || s === 'pending'
              }) ? (
                <ul className="flex flex-wrap gap-2">
                  {app.documents
                    .filter((d) => {
                      const s = (d.status || d.validation_status || '').toLowerCase()
                      return s === 'uploaded' || s === 'valid' || s === 'received' || s === 'pending'
                    })
                    .map((d, idx) => (
                      <li key={idx}>
                        <a
                          href={d.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100 transition"
                        >
                          <Icon name="description" className="text-[14px]" />
                          {DOCUMENT_TYPE_LABELS[d.document_type] || d.document_type || d.file_name}
                          <Icon name="open_in_new" className="text-[12px] opacity-60" />
                        </a>
                      </li>
                    ))}
                </ul>
              ) : (
                <ChipList
                  items={app.documents_received}
                  tone="good"
                  icon="description"
                  emptyLabel={t('noDocumentsYet')}
                />
              )}
              {app.bank_statement_source && (
                <div className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset ${
                  app.bank_statement_source === 'AUTO_FETCHED'
                    ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                    : 'bg-navy-50 text-navy-500 ring-navy-500/10'
                }`}>
                  <Icon
                    name={app.bank_statement_source === 'AUTO_FETCHED' ? 'cloud_download' : 'upload_file'}
                    className="text-[13px]"
                  />
                  Bank statement: {app.bank_statement_source === 'AUTO_FETCHED' ? 'auto-fetched via UAE Bank Data' : 'uploaded by applicant'}
                </div>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                {t('missingDocuments')}
              </p>
              <ChipList
                items={app.missing_documents}
                tone="bad"
                icon="priority_high"
                emptyLabel={t('noMissingDocuments')}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <Icon name="fact_check" className="text-[18px] text-navy-400" />
            {t('validationResults')}
          </h3>
          <dl className="mt-3 space-y-2.5">
            {[
              { label: t('salaryMatchStatus'), value: v.salary_match_status },
              { label: t('documentCompleteness'), value: v.document_completeness_status },
              { label: t('crossDocConsistency'), value: v.cross_document_consistency },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-navy-50 bg-navy-50/50 px-3 py-2.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                  {label}
                </dt>
                <dd className="mt-0.5 text-xs text-navy-600">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          {v.identified_issues && v.identified_issues.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                {t('identifiedIssues')}
              </p>
              <ul className="space-y-1.5">
                {v.identified_issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-navy-600">
                    <Icon name="error" className="mt-0.5 text-[14px] text-rose-500" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Employee actions — only shown for applications that need human review */}
      {app.human_review_required && <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <Icon name="touch_app" className="text-[18px] text-navy-400" />
          {t('employeeActions')}
        </h3>
        <p className="mt-1 text-xs text-navy-400">
          {t('updateAuditTrail')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={updating}
              onClick={() => handleAction(action)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${ACTION_TONE_CLASSES[action.tone]}`}
            >
              <Icon name={action.icon} className="text-[18px]" />
              {action.label}
            </button>
          ))}
        </div>
        {actionNotice && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-navy-50 px-3 py-2 text-xs font-medium text-navy-600 fade-in">
            <Icon name="info" className="text-[16px] text-navy-400" />
            {actionNotice}
          </p>
        )}

        {/* Human Plan Override — only shown for escalated cases */}
        {app.human_review_required && (
          <div className="mt-5 border-t border-navy-100 pt-5">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy-400">
              <Icon name="settings" className="text-[14px]" />
              Human Plan Override
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-1">
                    Duration (months)
                  </label>
                  <input
                    type="number" min="1" max="360"
                    value={overrideDuration}
                    onChange={(e) => setOverrideDuration(e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-1">
                    Arrears Start Month
                  </label>
                  <input
                    type="month"
                    value={overrideArrearsMonth}
                    onChange={(e) => setOverrideArrearsMonth(e.target.value)}
                    className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-1">
                    EMI During (AED)
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    value={overrideEmiDuring}
                    onChange={(e) => setOverrideEmiDuring(e.target.value)}
                    placeholder="e.g. 3200"
                    className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-1">
                    EMI After (AED)
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    value={overrideEmiAfter}
                    onChange={(e) => setOverrideEmiAfter(e.target.value)}
                    placeholder="e.g. 2800"
                    className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-navy-400 mb-1">
                  Reviewer Notes / Justification
                </label>
                <textarea
                  rows={3}
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="Document justification for the custom plan…"
                  className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm text-navy-800 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <button
                onClick={handleHumanOverride}
                disabled={updating}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <Icon name="check_circle" className="text-[18px]" />
                Save Override &amp; Approve
              </button>
            </div>
          </div>
        )}
      </section>}

      {/* Agent Trace */}
      <AgentTracePanel applicationId={app.application_id} />

      {/* Audit trail */}
      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <Icon name="history" className="text-[18px] text-navy-400" />
          {t('auditTrail')}
        </h3>
        <ol className="mt-4 space-y-0">
          {auditTrail.map((step, idx) => (
            <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
              {idx !== auditTrail.length - 1 && (
                <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-navy-100" />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${
                  step.done
                    ? 'bg-emerald-100 text-emerald-600'
                    : step.pending
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-navy-100 text-navy-400'
                }`}
              >
                <Icon name={AUDIT_ICONS[step.key] || 'info'} className="text-[16px]" />
              </span>
              <div className="pt-1">
                <p className="text-sm font-medium text-navy-900">{step.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-navy-500">{step.detail}</p>
                <p className="mt-1 text-[11px] text-navy-300">{formatDateTime(step.timestamp)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
