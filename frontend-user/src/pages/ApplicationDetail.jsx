import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getApplicationById, uploadAdditionalDocuments, respondToPlan } from '../services/applicationService'
import Breadcrumbs from '../components/Breadcrumbs'
import Button from '../components/Button'
import Icon from '../components/Icon'

const TERMINAL_STATUSES = [
  'approved', 'approved_automatically', 'completed',
  'needs_human_review', 'human_review', 'pending_documents', 'rejected',
]

function formatProcessingTime(submittedAt, updatedAt) {
  if (!submittedAt || !updatedAt) return null
  const diffMs = new Date(updatedAt) - new Date(submittedAt)
  if (diffMs <= 0) return null
  const secs = Math.round(diffMs / 1000)
  if (secs < 60) return `${secs} seconds`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return rem > 0 ? `${mins} min ${rem} sec` : `${mins} min`
}

const STATUS_CONFIG = {
  submitted:            { labelKey: 'statusInProgress',             color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: 'schedule',      messageEn: 'Your application has been received and is pending review. You will be notified once a decision is made.',                                                                    messageAr: 'تم استلام طلبك وهو في انتظار المراجعة. سيتم إخطارك فور اتخاذ القرار.' },
  processing:           { labelKey: 'statusInProgress',             color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: 'sync',          messageEn: 'Your application is currently being reviewed. You will be notified once a decision is made.',                                                                        messageAr: 'جارٍ مراجعة طلبك حاليًا. سيتم إخطارك فور اتخاذ القرار.' },
  pending_documents:    { labelKey: 'statusAdditionalInfoRequired', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   icon: 'folder_open',   messageEn: 'Additional documents are required to process your application.',                                                                                                    messageAr: 'مستندات إضافية مطلوبة لمعالجة طلبك.' },
  needs_human_review:   { labelKey: 'statusUnderExpertReview',      color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: 'person_search', messageEn: 'Your case is being reviewed by a specialist. Expected response: within 3–5 working days.',                                                                     messageAr: 'يتم مراجعة حالتك من قِبل متخصص. الرد المتوقع: خلال 3-5 أيام عمل.' },
  human_review:         { labelKey: 'statusUnderExpertReview',      color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: 'person_search', messageEn: 'Your case is being reviewed by a specialist. Expected response: within 3–5 working days.',                                                                     messageAr: 'يتم مراجعة حالتك من قِبل متخصص. الرد المتوقع: خلال 3-5 أيام عمل.' },
  approved_automatically:{ labelKey: 'statusApproved',              color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: 'check_circle',  messageEn: 'Your rescheduling request has been approved. Review your new repayment plan below.',                                                                          messageAr: 'تمت الموافقة على طلب إعادة الجدولة. راجع خطة السداد الجديدة أدناه.' },
  approved:             { labelKey: 'statusApproved',               color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: 'check_circle',  messageEn: 'Your rescheduling request has been approved. Review your new repayment plan below.',                                                                          messageAr: 'تمت الموافقة على طلب إعادة الجدولة. راجع خطة السداد الجديدة أدناه.' },
  completed:            { labelKey: 'statusApproved',               color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: 'check_circle',  messageEn: 'Your rescheduling request has been approved. Review your new repayment plan below.',                                                                          messageAr: 'تمت الموافقة على طلب إعادة الجدولة. راجع خطة السداد الجديدة أدناه.' },
  rejected:             { labelKey: 'statusNotEligible',            color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       icon: 'cancel',        messageEn: 'Your application was not eligible for rescheduling based on the current assessment. To appeal, contact MOEI at 800-MOEI.',                                  messageAr: 'لم يكن طلبك مؤهلاً لإعادة الجدولة بناءً على التقييم الحالي. للطعن، تواصل مع الوزارة على 800-MOEI.' },
}

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['submitted']
}

function fmt(n) {
  if (n == null) return '—'
  return `AED ${Number(n).toLocaleString('en-US')}`
}

function generateDecisionLetterHtml(app, loan, rec, user) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const newEmi = rec?.emi_during_rescheduling_period || rec?.new_monthly_installment || '—'
  const newEmiFormatted =
    newEmi !== '—' ? `AED ${Number(newEmi).toLocaleString('en-US')}` : '—'
  const duration = rec?.recommended_duration_months || rec?.rescheduling_duration_months || '—'
  const deductionRate = rec?.proposed_deduction_rate_pct
    ? `${Number(rec.proposed_deduction_rate_pct).toFixed(1)}%`
    : '—'
  const rationale = rec?.reasoning || app?.decision_rationale || ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Decision Letter — ${app.application_id}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #111; font-size: 14px; line-height: 1.6; }
    .header { border-bottom: 3px solid #b8860b; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 22px; color: #5a3e0a; margin: 0; }
    .header p { margin: 4px 0; color: #555; }
    .badge { display: inline-block; background: #d4edda; color: #155724; border-radius: 20px; padding: 4px 14px; font-weight: bold; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f8f3e8; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #7a5c1a; border-bottom: 2px solid #e8d9b0; }
    td { padding: 10px 12px; border-bottom: 1px dashed #ddd; }
    .section-title { font-weight: bold; font-size: 15px; margin: 24px 0 8px; color: #333; }
    .note { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #78350f; margin-top: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }
    @media print { button { display: none !important; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Ministry of Energy &amp; Infrastructure</h1>
    <p>Sheikh Zayed Housing Programme (SZHP)</p>
    <p>Arrears Rescheduling Service</p>
  </div>

  <span class="badge">✓ APPROVED FOR RESCHEDULING</span>

  <p><strong>Date:</strong> ${today}</p>
  <p><strong>Reference:</strong> ${app.application_id}</p>

  <div class="section-title">Applicant Information</div>
  <table>
    <tr><td><strong>Full Name</strong></td><td>${app.applicant_name || '—'}</td></tr>
    <tr><td><strong>Emirates ID</strong></td><td>${app.emirates_id_number || '—'}</td></tr>
    <tr><td><strong>Loan Reference</strong></td><td>${loan?.loan_id || '—'}</td></tr>
    <tr><td><strong>Total Arrears</strong></td><td>${fmt(loan?.arrears_amount)}</td></tr>
  </table>

  <div class="section-title">Approved Rescheduling Plan</div>
  <table>
    <thead><tr><th>Detail</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td>New Monthly Installment</td><td><strong>${newEmiFormatted}</strong></td></tr>
      <tr><td>Plan Duration</td><td>${duration !== '—' ? `${duration} months` : '—'}</td></tr>
      <tr><td>Deduction Rate</td><td>${deductionRate} of monthly salary</td></tr>
      <tr><td>20% Policy Rule</td><td>${rec?.twenty_pct_rule_passed === true ? '✓ PASS' : rec?.twenty_pct_rule_passed === false ? '✗ FAIL' : '—'}</td></tr>
      <tr><td>Period Rule</td><td>${rec?.period_rule_passed === true ? '✓ PASS' : rec?.period_rule_passed === false ? '✗ FAIL' : '—'}</td></tr>
    </tbody>
  </table>

  ${rationale ? `<div class="section-title">Summary</div><p>${rationale}</p>` : ''}

  <div class="note">
    This letter constitutes the official decision for your arrears rescheduling request under the
    Sheikh Zayed Housing Programme. Please retain it for your records.
    For questions, contact MOEI at 800 MOEI (6634).
  </div>

  <div class="footer">
    <p>Issued electronically — Sheikh Zayed Housing Programme, Ministry of Energy &amp; Infrastructure, UAE</p>
    <p>This document is valid without a physical signature as per UAE Digital Transactions Law.</p>
  </div>

  <script>window.print()</script>
</body>
</html>`
}

export default function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { t, language } = useLanguage()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [additionalFiles, setAdditionalFiles] = useState({})
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [responding, setResponding] = useState(false)
  const [respondError, setRespondError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    getApplicationById(id)
      .then((data) => {
        if (!data) setError('Application not found.')
        else setApp(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, isAuthenticated, navigate])

  const handleAdditionalUpload = async () => {
    const docs = Object.entries(additionalFiles)
      .filter(([, file]) => file)
      .map(([documentType, file]) => ({ documentType, file }))
    if (docs.length === 0) {
      setUploadError('Please select at least one document to upload.')
      return
    }
    setUploading(true)
    setUploadError('')
    try {
      await uploadAdditionalDocuments(app.application_id, docs)
      setUploadSuccess(true)
      setAdditionalFiles({})
      // Refresh app data after a short delay to show new status
      setTimeout(() => {
        getApplicationById(id).then((data) => { if (data) setApp(data) })
      }, 2000)
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleAcceptPlan = async () => {
    setResponding(true)
    setRespondError('')
    try {
      await respondToPlan(app.application_id, 'accept')
      setApp((prev) => ({ ...prev, status: 'completed' }))
    } catch (err) {
      setRespondError(err.message || 'Failed to accept plan. Please try again.')
    } finally {
      setResponding(false)
    }
  }

  const handleRejectPlan = async () => {
    setResponding(true)
    setRespondError('')
    try {
      await respondToPlan(app.application_id, 'reject', rejectReason)
      setApp((prev) => ({ ...prev, status: 'needs_human_review', human_review_required: true }))
      setShowRejectInput(false)
    } catch (err) {
      setRespondError(err.message || 'Failed to submit rejection. Please try again.')
    } finally {
      setResponding(false)
    }
  }

  const handleDownload = () => {
    const loan = Array.isArray(app?.loan_details) ? app.loan_details[0] : app?.loan_details
    const rec = Array.isArray(app?.recommendations) ? app.recommendations[0] : app?.recommendations
    const html = generateDecisionLetterHtml(app, loan, rec)
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-ink-500">
        <Icon name="sync" className="!text-2xl animate-spin" />
        <span>{t('loadingApplication')}</span>
      </div>
    )
  }

  if (error || !app) {
    return (
      <div className="mx-auto max-w-[1440px] px-6 py-16 text-center">
        <p className="text-lg font-semibold text-red-700">{error || t('applicationNotFound')}</p>
        <Link to="/my-applications" className="mt-4 inline-block text-sm text-gold-600 underline">
          {t('backToMyApplications')}
        </Link>
      </div>
    )
  }

  const loan = Array.isArray(app.loan_details) ? app.loan_details[0] : app.loan_details
  const rec = Array.isArray(app.recommendations) ? app.recommendations[0] : app.recommendations
  const cfg = getStatusConfig(app.status)
  const APPROVED_STATUSES = ['approved', 'approved_automatically', 'completed']
  const isApproved = app.status !== 'rejected' && (APPROVED_STATUSES.includes(app.status) || (rec && rec.path_taken && rec.path_taken !== 'P5'))
  const missingDocs = app.missing_documents || []
  const processingTime = TERMINAL_STATUSES.includes(app.status)
    ? formatProcessingTime(app.submitted_at, app.updated_at)
    : null

  return (
    <div>
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-4 lg:px-10">
          <Breadcrumbs
            trail={[
              { label: t('breadcrumbHousing'), to: '/' },
              { label: t('myApplications'), to: '/my-applications' },
              { label: app.application_id },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">{app.application_id}</h1>
            <p className="mt-1 text-sm text-ink-500">
              {t('submittedDate')}{' '}
              {app.submitted_at
                ? new Date(app.submitted_at).toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </p>
          </div>
          {isApproved && (
            <Button
              onClick={handleDownload}
              variant="primary"
              icon={<Icon name="download" className="!text-base" />}
            >
              {t('downloadDecisionLetter')}
            </Button>
          )}
        </div>

        {/* Status banner */}
        <div className={`rounded-2xl border p-6 ${cfg.bg}`}>
          <div className="flex items-start gap-4">
            <Icon name={cfg.icon} className={`!text-3xl shrink-0 ${cfg.color}`} filled />
            <div>
              <p className={`text-lg font-bold ${cfg.color}`}>{t(cfg.labelKey)}</p>
              <p className="mt-1 text-sm text-ink-700">
                {app.status === 'rejected' && app.final_decision
                  ? app.final_decision
                  : (language === 'ar' ? cfg.messageAr : cfg.messageEn)}
              </p>
              {missingDocs.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {missingDocs.map((doc) => (
                    <li key={doc} className="flex items-center gap-2 text-sm text-amber-800">
                      <Icon name="arrow_right" className="!text-base text-amber-600" />
                      {doc}
                    </li>
                  ))}
                </ul>
              )}
              {processingTime && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-current/20 bg-white/60 px-3 py-1 text-xs font-semibold">
                  <Icon name="bolt" className="!text-sm" filled />
                  {t('processedIn')} {processingTime} {t('previouslyUpTo5Days')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional documents upload — shown when agent requested more docs */}
        {app.status === 'pending_documents' && !uploadSuccess && (
          <section className="overflow-hidden rounded-2xl border-2 border-amber-300 bg-white shadow-card">
            <div className="border-b border-amber-100 bg-amber-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <Icon name="upload_file" className="!text-xl text-amber-600" />
                <div>
                  <h2 className="text-base font-semibold text-amber-900">{t('uploadRequiredDocumentsTitle')}</h2>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {t('uploadRequiredDocumentsDesc')}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {(app.missing_documents || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-3">
                    {t('documentsRequested')}
                  </p>
                  <ul className="space-y-4">
                    {(app.missing_documents || []).map((label, idx) => {
                      const typeMap = {
                        'salary_certificate': 'salary_certificate',
                        'Salary Certificate': 'salary_certificate',
                        'medical_report': 'medical_report',
                        'Medical Report': 'medical_report',
                        'other_supporting_document': 'other_supporting_document',
                        'Bereavement': 'other_supporting_document',
                        'Hardship': 'other_supporting_document',
                        'Proof of Unemployment': 'other_supporting_document',
                        'passport_stamp': 'passport_stamp',
                        'Passport': 'passport_stamp',
                        'bank_statement': 'bank_statement',
                        'Bank Statement': 'bank_statement',
                      }
                      // derive storage key from label
                      const docType = Object.entries(typeMap).find(([k]) =>
                        label.toLowerCase().includes(k.toLowerCase())
                      )?.[1] || 'other_supporting_document'

                      const file = additionalFiles[docType]
                      return (
                        <li key={idx} className="rounded-xl border border-ink-100 bg-ink-50 p-4">
                          <p className="text-sm font-medium text-ink-800 mb-3">{label}</p>
                          <label className="flex cursor-pointer items-center gap-3">
                            <div className={`flex flex-1 items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-colors ${file ? 'border-green-400 bg-green-50' : 'border-ink-200 hover:border-gold-400'}`}>
                              <Icon
                                name={file ? 'check_circle' : 'attach_file'}
                                className={`!text-base ${file ? 'text-green-600' : 'text-ink-400'}`}
                              />
                              <span className={`text-sm truncate ${file ? 'text-green-700 font-medium' : 'text-ink-500'}`}>
                                {file ? file.name : t('clickToChooseFile')}
                              </span>
                            </div>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) setAdditionalFiles((prev) => ({ ...prev, [docType]: f }))
                              }}
                            />
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {uploadError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <Icon name="error" className="mt-0.5 text-red-600 shrink-0 !text-base" />
                  <p className="text-sm text-red-900">{uploadError}</p>
                </div>
              )}

              <Button
                onClick={handleAdditionalUpload}
                variant="primary"
                disabled={uploading || Object.keys(additionalFiles).length === 0}
                icon={
                  <Icon
                    name={uploading ? 'sync' : 'upload'}
                    className={`!text-base ${uploading ? 'animate-spin' : ''}`}
                  />
                }
                iconPosition="right"
              >
                {uploading ? t('uploadingResubmitting') : t('submitDocumentsButton')}
              </Button>
            </div>
          </section>
        )}

        {/* Upload success confirmation */}
        {uploadSuccess && (
          <div className="flex items-start gap-4 rounded-2xl border border-green-200 bg-green-50 p-5">
            <Icon name="check_circle" className="!text-2xl text-green-600 shrink-0 mt-0.5" filled />
            <div>
              <p className="font-semibold text-green-900">{t('documentsSubmittedSuccess')}</p>
              <p className="mt-1 text-sm text-green-700">{t('agentReanalysingDesc')}</p>
            </div>
          </div>
        )}

        {/* Approved plan */}
        {isApproved && rec && (
          <section className="overflow-hidden rounded-2xl border border-green-200 bg-white shadow-card">
            <div className="border-b border-green-100 bg-green-50 p-6">
              <h2 className="text-lg font-semibold text-green-900">{t('yourNewRepaymentPlan')}</h2>
            </div>
            <div className="grid gap-px bg-ink-100 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: t('newMonthlyInstallmentLabel'),
                  value: fmt(rec.emi_during_rescheduling_period || rec.new_monthly_installment),
                  icon: 'payments',
                },
                {
                  label: t('planDurationLabel'),
                  value: rec.recommended_duration_months
                    ? `${rec.recommended_duration_months} ${t('monthsSuffix')}`
                    : '—',
                  icon: 'calendar_month',
                },
                {
                  label: t('deductionRateLabel'),
                  value: rec.proposed_deduction_rate_pct
                    ? `${Number(rec.proposed_deduction_rate_pct).toFixed(1)}% ${t('ofSalary')}`
                    : '—',
                  icon: 'percent',
                },
                {
                  label: t('twentyPctRuleLabel'),
                  value: rec.twenty_pct_rule_passed === true ? 'PASS' : rec.twenty_pct_rule_passed === false ? 'FAIL' : '—',
                  icon: rec.twenty_pct_rule_passed !== false ? 'check_circle' : 'cancel',
                  green: rec.twenty_pct_rule_passed !== false,
                },
              ].map((item) => (
                <div key={item.label} className="bg-white p-5 space-y-2">
                  <div className="flex items-center gap-2 text-ink-500">
                    <Icon name={item.icon} className={`!text-base ${item.green ? 'text-green-600' : 'text-ink-400'}`} />
                    <p className="text-xs font-medium">{item.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${item.green ? 'text-green-700' : 'text-ink-900'}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            {(rec.reasoning || rec.rationale?.reasoning_ar) && (
              <div className="border-t border-ink-100 p-6">
                <p className="text-sm font-medium text-ink-700 mb-2">{t('whatThisMeansForYou')}</p>
                <p className="text-sm leading-relaxed text-ink-600">
                  {language === 'ar'
                    ? (rec.rationale?.reasoning_ar || rec.reasoning)
                    : rec.reasoning}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Application details */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">
              {t('applicationDetailsSection')}
            </h3>
            <dl className="space-y-3">
              {[
                { label: t('applicantLabel'), value: app.applicant_name },
                {
                  label: t('emiratesIdLabel'),
                  value: app.emirates_id_number
                    ? `${app.emirates_id_number.slice(0, 7)}•••`
                    : '—',
                },
                { label: t('hardshipReasonLabel'), value: app.hardship_type?.replace(/_/g, ' ') },
                {
                  label: t('uaePassVerifiedLabel'),
                  value: app.uaepass_verified ? t('yes') : t('no'),
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-dashed border-ink-100 pb-3 last:border-0 last:pb-0"
                >
                  <dt className="text-sm text-ink-500">{label}</dt>
                  <dd className="text-sm font-semibold text-ink-900 text-right capitalize">
                    {value || '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {loan && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">
                {t('loanSummarySection')}
              </h3>
              <dl className="space-y-3">
                {[
                  { label: t('loanIdLabel'), value: loan.loan_id },
                  { label: t('totalArrearsLabel'), value: fmt(loan.arrears_amount) },
                  {
                    label: t('overdueMonthsLabel'),
                    value: loan.overdue_months ? `${loan.overdue_months} ${t('monthsSuffix')}` : '—',
                  },
                  { label: t('currentEmiLabel'), value: fmt(loan.current_monthly_emi) },
                  {
                    label: t('remainingPeriodLabel'),
                    value: loan.remaining_loan_period_months
                      ? `${loan.remaining_loan_period_months} ${t('monthsSuffix')}`
                      : '—',
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between border-b border-dashed border-ink-100 pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-sm text-ink-500">{label}</dt>
                    <dd className="text-sm font-semibold text-ink-900">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        {/* Citizen response — only for approved-but-not-yet-accepted applications */}
        {(app.status === 'approved_automatically' || app.status === 'approved') && (
          <section className="rounded-2xl border border-green-200 bg-green-50/60 p-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-green-900">
              <Icon name="how_to_reg" className="text-[18px] text-green-600" />
              {t('acceptPlan') || 'Respond to Proposed Plan'}
            </h3>
            <p className="mt-1 text-xs text-green-700/80">
              {t('rejectPlanDesc') || 'Accept the plan to proceed, or reject it to request a human officer review.'}
            </p>
            {respondError && (
              <p className="mt-2 text-xs text-rose-600">{respondError}</p>
            )}
            {!showRejectInput ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleAcceptPlan}
                  disabled={responding}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Icon name="check_circle" className="!text-base" />
                  {responding ? '…' : t('acceptPlan')}
                </button>
                <button
                  onClick={() => setShowRejectInput(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <Icon name="cancel" className="!text-base" />
                  {t('rejectPlan')}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-medium text-rose-700">{t('rejectPlanTitle')}</p>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('rejectReasonPlaceholder')}
                  className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-ink-800 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleRejectPlan}
                    disabled={responding || !rejectReason.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {responding ? '…' : t('confirmRejection')}
                  </button>
                  <button
                    onClick={() => setShowRejectInput(false)}
                    className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button
            as="link"
            to="/my-applications"
            variant="secondary"
            icon={<Icon name={language === 'ar' ? 'arrow_forward' : 'arrow_back'} className="!text-base" />}
          >
            {t('backToMyApplications')}
          </Button>
          {isApproved && (
            <Button
              onClick={handleDownload}
              variant="primary"
              icon={<Icon name="download" className="!text-base" />}
            >
              {t('downloadDecisionLetter')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
