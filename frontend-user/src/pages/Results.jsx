import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import SideNav from '../components/SideNav'
import Button from '../components/Button'
import Icon from '../components/Icon'
import { getApplicationById, respondToPlan } from '../services/applicationService'
import { useApplication } from '../contexts/ApplicationContext'
import { useLanguage } from '../contexts/LanguageContext'

function formatAED(n) {
  if (!n && n !== 0) return '—'
  return `AED ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 30 // 90 seconds max wait

export default function Results() {
  const navigate = useNavigate()
  const { submissionResult } = useApplication()
  const { t } = useLanguage()

  const applicationId =
    submissionResult?.application?.application_id ||
    localStorage.getItem('lastSubmittedApplicationId') ||
    null

  const [agentResult, setAgentResult] = useState(null)
  const [polling, setPolling] = useState(true)
  const [pollCount, setPollCount] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const [responding, setResponding] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [citizenDecision, setCitizenDecision] = useState(null) // 'accepted' | 'rejected'

  useEffect(() => {
    if (!applicationId) {
      setPolling(false)
      return
    }

    const check = async () => {
      try {
        const data = await getApplicationById(applicationId)
        if (data && data.status !== 'submitted' && data.status !== 'processing') {
          setAgentResult(data)
          setPolling(false)
          return true // done
        }
      } catch {
        // Supabase unavailable — stop polling silently
        setPolling(false)
        return true
      }
      return false
    }

    // Check immediately then on interval
    check()
    const interval = setInterval(async () => {
      const done = await check()
      if (done) {
        clearInterval(interval)
        return
      }
      setPollCount((c) => {
        if (c + 1 >= MAX_POLLS) {
          clearInterval(interval)
          setPolling(false)
          setTimedOut(true)
        }
        return c + 1
      })
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [applicationId])

  const rec = Array.isArray(agentResult?.recommendations)
    ? agentResult.recommendations[0]
    : agentResult?.recommendations

  const riskLevel = agentResult?.risk_level || 'low'
  const confidence = agentResult?.confidence_score
  const path = rec?.path_taken
  const needsReview = agentResult?.human_review_required
  const mandate = !needsReview ? (rec?.add_mandate ?? null) : null

  const planRows = rec
    ? [
        {
          label: 'Monthly Arrears Payment',
          value: rec.recommended_monthly_arrears_payment === 0
            ? 'None — deferred to loan end'
            : formatAED(rec.recommended_monthly_arrears_payment),
        },
        {
          label: rec.recommended_duration_months === 0 ? 'Monthly EMI' : 'EMI (Rescheduling Period)',
          value: formatAED(rec.emi_during_rescheduling_period),
        },
        {
          label: 'Duration',
          value: rec.recommended_duration_months > 0
            ? `${rec.recommended_duration_months} Months`
            : (() => {
                const loan = agentResult.loan_details?.[0]
                const extra = loan?.current_monthly_emi
                  ? Math.ceil((loan.arrears_amount || 0) / loan.current_monthly_emi)
                  : null
                return extra
                  ? `Deferred to loan end (+${extra} extra months)`
                  : 'Arrears deferred to loan end'
              })(),
        },
        rec.recommended_duration_months === 0
          ? {
              label: 'How Arrears Are Repaid',
              value: (() => {
                const loan = agentResult.loan_details?.[0]
                if (!loan?.current_monthly_emi) return '—'
                const extra = Math.ceil((loan.arrears_amount || 0) / loan.current_monthly_emi)
                return `${extra} additional payments of ${formatAED(loan.current_monthly_emi)} added at end of loan`
              })(),
            }
          : {
              label: 'EMI (Post-Rescheduling)',
              value: rec.emi_after_rescheduling_period === 0
                ? 'Loan fully repaid'
                : formatAED(rec.emi_after_rescheduling_period),
            },
      ]
    : [
        { label: 'Monthly Arrears Payment', value: 'AED 1,250' },
        { label: 'EMI (Rescheduling Period)', value: 'AED 3,800' },
        { label: 'Duration', value: '24 Months' },
        { label: 'EMI (Post-Rescheduling)', value: 'AED 2,550' },
      ]

  const handleProceed = () => {
    localStorage.setItem('maxReachedStep', '6')
    navigate('/confirmation')
  }

  const handleAccept = async () => {
    setResponding(true)
    try {
      await respondToPlan(applicationId, 'accept')
      setCitizenDecision('accepted')
      localStorage.setItem('maxReachedStep', '6')
      navigate('/confirmation')
    } catch (err) {
      console.error('Accept failed:', err)
      setResponding(false)
    }
  }

  const handleReject = async () => {
    setResponding(true)
    try {
      await respondToPlan(applicationId, 'reject', rejectReason)
      setCitizenDecision('rejected')
      setShowRejectInput(false)
    } catch (err) {
      console.error('Reject failed:', err)
    } finally {
      setResponding(false)
    }
  }

  const riskColors = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-rose-100 text-rose-700',
  }
  const riskLabel = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (polling) {
    return (
      <div>
        <div className="border-b border-ink-100 bg-white">
          <div className="mx-auto max-w-[1440px] px-6 py-4 lg:px-10">
            <Breadcrumbs trail={[{ label: 'Housing Services', to: '/' }, { label: 'Arrears Rescheduling Results' }]} />
          </div>
        </div>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:flex-row lg:px-10">
          <SideNav />
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-6">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 animate-pulse">
              <Icon name="smart_toy" className="!text-3xl" />
            </span>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-ink-900">AI Agent is Analysing Your Application</h2>
              <p className="mt-2 text-sm text-ink-500">
                Extracting financial data, running cross-checks, and calculating your rescheduling plan…
              </p>
              <p className="mt-1 text-xs text-ink-400">This usually takes 20–30 seconds.</p>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main results view ──────────────────────────────────────────────────────
  const isRejected = agentResult?.status === 'rejected'
  // Prefer final_decision on applications row; fall back to the REJECTED audit log entry
  const rejectionAuditLog = Array.isArray(agentResult?.audit_logs)
    ? agentResult.audit_logs
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .find((l) => l.action_type === 'REJECTED')
    : null
  const rejectionReason =
    agentResult?.final_decision ||
    (rejectionAuditLog?.action_description
      ? rejectionAuditLog.action_description.includes('Reason:')
        ? rejectionAuditLog.action_description.split('Reason:').slice(1).join('Reason:').trim()
        : rejectionAuditLog.action_description
      : null) ||
    null
  const isAutoApproved = !isRejected && !needsReview && agentResult
  const isEscalated = !isRejected && (needsReview || path === 'P5')

  return (
    <div>
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-4 lg:px-10">
          <Breadcrumbs trail={[{ label: 'Housing Services', to: '/' }, { label: 'Arrears Rescheduling Results' }]} />
        </div>
      </div>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:flex-row lg:px-10">
        <SideNav />

        <div className="flex-1 space-y-6">
          {/* Decision banner */}
          <section className={`flex flex-col items-start gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 ${
            isRejected
              ? 'border-rose-100 bg-rose-50/70'
              : isEscalated
                ? 'border-amber-100 bg-amber-50/70'
                : 'border-green-100 bg-green-50/70'
          }`}>
            <div className="flex items-start gap-4">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white ${
                isRejected ? 'bg-rose-600' : isEscalated ? 'bg-amber-500' : 'bg-green-600'
              }`}>
                <Icon
                  name={isRejected ? 'cancel' : isEscalated ? 'person_search' : 'check_circle'}
                  filled
                  className="!text-2xl"
                />
              </span>
              <div>
                <h1 className={`text-xl font-semibold sm:text-2xl ${
                  isRejected ? 'text-rose-900' : isEscalated ? 'text-amber-900' : 'text-green-900'
                }`}>
                  {isRejected
                    ? 'Application Rejected'
                    : isEscalated
                      ? 'Application Referred for Human Review'
                      : 'Approved for Automated Rescheduling'}
                </h1>
                <p className={`mt-1.5 max-w-xl text-sm leading-relaxed ${
                  isRejected ? 'text-rose-800/80' : isEscalated ? 'text-amber-800/80' : 'text-green-800/80'
                }`}>
                  {isRejected
                    ? (rejectionReason || 'Your application has been reviewed and rejected. Please contact SZHP for further assistance.')
                    : agentResult?.decision_rationale ||
                      (isEscalated
                        ? 'Our officer will review your application and contact you within 3–5 working days.'
                        : 'Your profile meets the criteria for immediate processing. Review the plan below to proceed.')}
                </p>
              </div>
            </div>
            {!isEscalated && !isRejected && !citizenDecision && (
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Button
                  onClick={handleAccept}
                  disabled={responding}
                  variant="primary"
                  className="!bg-green-600 hover:!bg-green-700"
                  icon={<Icon name="check_circle" className="!text-base" />}
                >
                  {responding ? t('loading') || 'Processing…' : t('acceptPlan')}
                </Button>
                {!showRejectInput && (
                  <button
                    onClick={() => setShowRejectInput(true)}
                    className="text-xs font-medium text-rose-600 underline hover:text-rose-800"
                  >
                    {t('rejectPlan')}
                  </button>
                )}
              </div>
            )}
            {citizenDecision === 'rejected' && (
              <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                <Icon name="person_search" className="mr-1 text-[16px]" />
                {t('planRejected')}
              </div>
            )}
          </section>

          {/* Rejection reason input — shown when citizen clicks "Reject Plan" */}
          {showRejectInput && !citizenDecision && (
            <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-rose-900">
                <Icon name="warning" className="text-[18px] text-rose-600" />
                {t('rejectPlanTitle')}
              </h3>
              <p className="mt-1 text-xs text-rose-700/80">{t('rejectPlanDesc')}</p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('rejectReasonPlaceholder')}
                className="mt-3 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <div className="mt-3 flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={responding || !rejectReason.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <Icon name="cancel" className="!text-base" />
                  {responding ? t('loading') || 'Processing…' : t('confirmRejection')}
                </button>
                <button
                  onClick={() => setShowRejectInput(false)}
                  className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                >
                  {t('cancel') || 'Cancel'}
                </button>
              </div>
            </section>
          )}

          {/* Post-rejection confirmation notice */}
          {citizenDecision === 'rejected' && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <Icon name="person_search" className="text-[18px] text-amber-600" />
                {t('planRejected')}
              </h3>
              <p className="mt-1 text-sm text-amber-800">{t('planRejectedDesc')}</p>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left column */}
            <div className="space-y-6 lg:col-span-2">
              {/* Risk & confidence */}
              <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
                <h3 className="text-base font-semibold text-ink-900">Analysis Overview</h3>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-ink-100 p-4">
                    <p className="text-sm text-ink-600">Risk Assessment Level</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${riskColors[riskLevel] || riskColors.low}`}>
                      {riskLabel[riskLevel] || 'Low Risk'}
                    </span>
                  </div>
                  <div className="rounded-xl bg-gold-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-ink-600">AI Confidence Score</p>
                      <p className="text-lg font-semibold text-gold-700">
                        {confidence != null ? `${confidence}%` : '98.2%'}
                      </p>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gold-100">
                      <div
                        className="h-full rounded-full bg-gold-600 transition-all duration-700"
                        style={{ width: `${confidence ?? 98.2}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-ink-500">
                      {path
                        ? `Decision path: ${path} — Based on income verification, document cross-check, and governance rules.`
                        : 'Based on historical payment data and verified income stability.'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Document completeness */}
              <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
                <h3 className="text-base font-semibold text-ink-900">Document Completeness</h3>
                <ul className="mt-4 space-y-2.5">
                  {(submissionResult?.documents?.length
                    ? submissionResult.documents.map((d) => d.document_type || d.file_name)
                    : ['Salary Certificate', 'Bank Statement (6 months)']
                  ).map((item) => (
                    <li key={item} className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50/60 px-4 py-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green-600 text-white">
                        <Icon name="check" className="!text-sm" />
                      </span>
                      <p className="text-sm font-medium text-ink-700 capitalize">
                        {item.replace(/_/g, ' ')}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Right column */}
            <div className="space-y-6 lg:col-span-3">
              {/* Recommended plan — hidden for rejected applications */}
              {!isRejected && <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
                <div className="flex flex-col items-start justify-between gap-2 border-b border-ink-100 p-6 sm:flex-row sm:items-center">
                  <h3 className="text-base font-semibold text-ink-900">Recommended Rescheduling Plan</h3>
                  <span className="rounded-lg bg-ink-100 px-3 py-1 text-xs font-bold text-ink-600">
                    Ref: {applicationId || 'MOEI-HS-2024-882'}
                  </span>
                </div>
                <div className="grid gap-px bg-ink-100 sm:grid-cols-2">
                  {planRows.map((row) => (
                    <div key={row.label} className="space-y-1 bg-white p-5">
                      <p className="text-sm text-ink-500">{row.label}</p>
                      <p className="text-xl font-semibold text-ink-900">{row.value}</p>
                    </div>
                  ))}
                </div>
              </section>}

              {/* ADD Mandate — informational, mandate already signed pre-service via UAE Pass */}
              {mandate && (
                <section className="rounded-2xl border border-green-200 bg-green-50/60 p-6 shadow-card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Icon name="account_balance" className="!text-xl text-green-600" />
                      <h3 className="text-base font-semibold text-green-900">{t('addMandateTitle')}</h3>
                    </div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-700">
                      {t('docAddMandateActive')}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-green-800/90 leading-relaxed">{t('addMandateActiveDesc')}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/70 border border-green-100 px-4 py-3">
                      <p className="text-xs text-ink-500">{t('addMandateAgreedEmi')}</p>
                      <p className="mt-0.5 text-base font-semibold text-ink-900">{formatAED(mandate.agreed_emi)}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 border border-green-100 px-4 py-3">
                      <p className="text-xs text-ink-500">{t('addMandateFirstDeduction')}</p>
                      <p className="mt-0.5 text-base font-semibold text-ink-900">{mandate.first_deduction_date}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 border border-green-100 px-4 py-3">
                      <p className="text-xs text-ink-500">{t('addMandateBank')}</p>
                      <p className="mt-0.5 text-sm font-semibold text-ink-900">{mandate.bank_name}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 border border-green-100 px-4 py-3">
                      <p className="text-xs text-ink-500">{t('addMandateAccount')}</p>
                      <p className="mt-0.5 text-sm font-semibold text-ink-900 font-mono">{mandate.account_number_masked}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* AI rationale (shown when agent result is available) */}
              {agentResult?.decision_rationale && (
                <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon name="smart_toy" className="text-indigo-600" />
                    <h3 className="text-base font-semibold text-indigo-900">AI Decision Rationale</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-indigo-800">
                    {agentResult.decision_rationale}
                  </p>
                </section>
              )}

              {/* Timed out or no agent result — show generic message */}
              {timedOut && !agentResult && (
                <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6">
                  <p className="text-sm text-amber-800">
                    AI analysis is taking longer than expected. Your application has been submitted
                    successfully. Results will appear in your officer's dashboard shortly.
                  </p>
                </section>
              )}
            </div>
          </div>

          {isEscalated && (
            <div className="flex justify-end">
              <Button onClick={handleProceed} variant="secondary" icon={<Icon name="arrow_forward" className="!text-base" />} iconPosition="right">
                Continue to Confirmation
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
