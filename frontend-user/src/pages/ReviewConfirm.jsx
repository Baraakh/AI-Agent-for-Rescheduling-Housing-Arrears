import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApplication } from '../contexts/ApplicationContext'
import { useLanguage } from '../contexts/LanguageContext'
import { submitFullApplication, checkSubmissionEligibility } from '../services/applicationService'
import { getPaymentOnTimePct } from '../data/moeiData'
import Breadcrumbs from '../components/Breadcrumbs'
import SideNav from '../components/SideNav'
import Button from '../components/Button'
import Icon from '../components/Icon'

function fmt(n) {
  if (n == null) return '—'
  return `AED ${Number(n).toLocaleString('en-US')}`
}

export default function ReviewConfirm() {
  const navigate = useNavigate()
  const { user, loanData } = useAuth()
  const { hardshipType, remarks, uploaded, setSubmissionResult } = useApplication()
  const { t, language } = useLanguage()

  const HARDSHIP_LABELS = {
    medical: t('hardshipMedical'),
    income_reduction: t('hardshipIncomeReduction'),
    abroad: t('hardshipAbroad'),
    bereavement: t('hardshipBereavement'),
    unemployment: t('hardshipUnemployment'),
    other: t('hardshipOther'),
  }

  const DOC_LIST = [
    { key: 'salary', label: t('docSalaryCertificate') },
    { key: 'bank', label: t('docBankStatement') },
    { key: 'medical', label: t('docMedicalReport') },
    { key: 'hardship_letter', label: t('docHardshipLetter') },
    { key: 'passport', label: t('docPassport') },
  ]

  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loan = loanData || {}
  const arrears = loan.arrears || {}

  const handleSubmit = async () => {
    if (!agree) {
      setError('Please accept the declaration before submitting.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      // Rule 3: check for active applications or cooldown periods
      const eligibility = await checkSubmissionEligibility(user?.emiratesId)
      if (!eligibility.eligible) {
        const { reason, applicationId, cooldownEnd, timeRemaining } = eligibility
        const locale = language === 'ar' ? 'ar-AE' : 'en-GB'
        const formattedDate = cooldownEnd
          ? cooldownEnd.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
          : ''
        const formattedTime = cooldownEnd
          ? cooldownEnd.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
          : ''

        if (reason === 'active') {
          setError(
            language === 'ar'
              ? `لديك طلب نشط (${applicationId}) قيد المعالجة. يرجى الانتظار حتى يتم البت فيه قبل تقديم طلب جديد.`
              : `You already have an active application (${applicationId}) in progress. Please wait for it to be processed before submitting a new one.`
          )
        } else if (reason === 'rejected_cooldown') {
          setError(
            language === 'ar'
              ? `تم رفض طلبك السابق. يمكنك تقديم طلب جديد بعد ${timeRemaining} (بعد ${formattedDate} الساعة ${formattedTime}).`
              : `Your previous application was rejected. You may submit a new application in ${timeRemaining} (after ${formattedDate} at ${formattedTime}).`
          )
        } else if (reason === 'approved_cooldown') {
          setError(
            language === 'ar'
              ? `تمت الموافقة على طلبك السابق. يمكنك تقديم طلب جديد بعد ${timeRemaining} (بعد ${formattedDate}).`
              : `Your previous application was approved. You may submit a new application in ${timeRemaining} (after ${formattedDate}).`
          )
        }
        setSubmitting(false)
        return
      }

      const docsToUpload = []
      if (uploaded['salary']?.file)
        docsToUpload.push({ documentType: 'salary_certificate', file: uploaded['salary'].file })
      if (uploaded['bank']?.file)
        docsToUpload.push({ documentType: 'bank_statement', file: uploaded['bank'].file })
      if (uploaded['medical']?.file)
        docsToUpload.push({ documentType: 'medical_report', file: uploaded['medical'].file })
      if (uploaded['hardship_letter']?.file)
        docsToUpload.push({
          documentType: 'other_supporting_document',
          file: uploaded['hardship_letter'].file,
        })
      if (uploaded['passport']?.file)
        docsToUpload.push({ documentType: 'passport_stamp', file: uploaded['passport'].file })

      const submission = await submitFullApplication({
        applicant: {
          applicantName: user?.fullNameEn || '',
          applicantEmail: user?.email || '',
          applicantPhone: user?.mobile || '',
          emiratesIdNumber: user?.emiratesId || '',
          uaepassVerified: true,
          familySize: user?.householdSize || null,
          employerName: user?.employer || '',
          hardshipType: hardshipType || '',
          remarks: remarks || '',
          applicantAbroad: hardshipType === 'abroad',
          declarationAccepted: true,
          currentSalary: loan.currentSalary ?? null,
        },
        loan: {
          currentMonthlyEmi: loan.currentEmi,
          arrearsAmount: arrears.totalAmount,
          overdueMonths: arrears.monthsOverdue,
          remainingLoanPeriodMonths: loan.remainingTermMonths,
          previousReschedulingCount: loan.previousApplications?.length || 0,
          salaryAtOrigination: loan.salaryAtOrigination,
          originalLoanAmount: loan.originalAmount,
          remainingBalance: loan.outstandingBalance,
          paymentHistoryOnTimePct: getPaymentOnTimePct(loan.paymentHistory),
          loanId: loan.loanId,
        },
        documents: docsToUpload,
      })

      setSubmissionResult(submission)
      const appId = submission.application.application_id
      localStorage.setItem('lastSubmittedApplicationId', appId)

      // Fire-and-forget: trigger AI agent in background
      const agentUrl = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8000'
      fetch(`${agentUrl}/process/${appId}`, { method: 'POST' }).catch(() => {})

      localStorage.setItem('maxReachedStep', '5')
      navigate('/confirmation')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <section className="bg-gradient-to-r from-gold-700 to-gold-600 text-white">
        <div className="mx-auto max-w-[1440px] px-6 pb-8 pt-6 lg:px-10">
          <Breadcrumbs
            dark
            trail={[
              { label: t('breadcrumbHousing'), to: '/' },
              { label: t('breadcrumbArrears'), to: '/' },
              { label: t('breadcrumbReviewSubmit') },
            ]}
          />
          <h1 className="mt-6 text-2xl font-bold sm:text-3xl">{t('reviewYourApplication')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
            {t('reviewDesc')}
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:flex-row lg:px-10">
        <SideNav caseRef={loan.loanId || 'SZHP-LN-—'} />

        <div className="flex-1 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Applicant */}
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-400">
                <Icon name="badge" className="!text-base text-gold-600" /> {t('applicantSection')}
              </h3>
              <dl className="space-y-2.5">
                {[
                  { label: t('nameLabel'), value: language === 'ar' ? user?.fullNameAr : user?.fullNameEn },
                  {
                    label: t('emiratesIdLabel'),
                    value: user?.emiratesId ? `${user.emiratesId.slice(0, 7)}•••` : '—',
                  },
                  {
                    label: t('householdSizeShort'),
                    value: user?.householdSize ? `${user.householdSize} ${t('members')}` : '—',
                  },
                  { label: t('employerLabel'), value: user?.employer },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between border-b border-dashed border-ink-100 pb-2.5 last:border-0 last:pb-0"
                  >
                    <dt className="text-sm text-ink-500">{label}</dt>
                    <dd className="text-sm font-semibold text-ink-900">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-800">
                <Icon name="verified_user" className="text-green-600 !text-sm" filled />
                {t('identityVerifiedUAEPass')}
              </div>
            </section>

            {/* Loan */}
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-400">
                <Icon name="account_balance" className="!text-base text-gold-600" /> {t('loanDetailsSection')}
              </h3>
              <dl className="space-y-2.5">
                {[
                  { label: t('loanIdLabel'), value: loan.loanId },
                  { label: t('totalArrearsLabel'), value: fmt(arrears.totalAmount) },
                  {
                    label: t('monthsOverdueLabel'),
                    value: arrears.monthsOverdue ? `${arrears.monthsOverdue} ${t('monthsSuffix')}` : '—',
                  },
                  { label: t('currentEmiLabel'), value: fmt(loan.currentEmi) },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between border-b border-dashed border-ink-100 pb-2.5 last:border-0 last:pb-0"
                  >
                    <dt className="text-sm text-ink-500">{label}</dt>
                    <dd className="text-sm font-semibold text-ink-900">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          {/* Hardship */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-400">
              <Icon name="description" className="!text-base text-gold-600" /> {t('hardshipDeclarationSection')}
            </h3>
            <p className="text-sm text-ink-700">
              <span className="font-semibold">{t('reasonLabel')}: </span>
              {hardshipType ? (
                HARDSHIP_LABELS[hardshipType] || hardshipType
              ) : (
                <span className="text-red-600">{t('notSelectedGoBack')}</span>
              )}
            </p>
            {remarks && (
              <p className="mt-2 text-sm text-ink-500 italic">&ldquo;{remarks}&rdquo;</p>
            )}
          </section>

          {/* Documents */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-400">
              <Icon name="folder_open" className="!text-base text-gold-600" /> {t('documentsSection')}
            </h3>
            <ul className="space-y-2">
              {DOC_LIST.map(({ key, label }) => {
                const done = !!uploaded[key]
                return (
                  <li
                    key={key}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                      done ? 'bg-green-50 text-green-800' : 'bg-ink-50 text-ink-400'
                    }`}
                  >
                    <Icon
                      name={done ? 'check_circle' : 'radio_button_unchecked'}
                      className={`!text-base ${done ? 'text-green-600' : 'text-ink-300'}`}
                      filled={done}
                    />
                    <span className="font-medium">{label}</span>
                    {done && (
                      <span className="ml-auto max-w-[140px] truncate text-xs text-green-600">
                        {uploaded[key]?.name}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Declaration checkbox */}
          <div
            role="checkbox"
            aria-checked={agree}
            tabIndex={0}
            onClick={() => setAgree((v) => !v)}
            onKeyDown={(e) => e.key === ' ' && setAgree((v) => !v)}
            className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 transition-all select-none ${
              agree ? 'border-gold-300 bg-gold-50' : 'border-ink-200 bg-white hover:border-ink-300'
            }`}
          >
            <div
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border-2 transition-colors ${
                agree ? 'border-gold-500 bg-gold-500' : 'border-ink-300 bg-white'
              }`}
            >
              {agree && <Icon name="check" className="!text-xs text-white" />}
            </div>
            <p className="text-sm leading-relaxed text-ink-700">
              {t('reviewDeclarationText')}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <Icon name="error" className="mt-0.5 text-red-600 shrink-0" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              as="link"
              to="/documents"
              variant="secondary"
              icon={<Icon name={language === 'ar' ? 'arrow_forward' : 'arrow_back'} className="!text-base" />}
            >
              {t('backToDocuments')}
            </Button>
            <Button
              onClick={handleSubmit}
              variant="primary"
              icon={
                <Icon
                  name={submitting ? 'sync' : 'send'}
                  className={`!text-base ${submitting ? 'animate-spin' : ''}`}
                />
              }
              iconPosition="right"
              disabled={submitting}
            >
              {submitting ? t('submittingEllipsis') : t('submitApplication')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
