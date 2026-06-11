import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getApplicationsByUser } from '../services/applicationService'
import Breadcrumbs from '../components/Breadcrumbs'
import Button from '../components/Button'
import Icon from '../components/Icon'

const STATUS_CONFIG = {
  submitted:           { labelKey: 'statusInProgress',             color: 'bg-blue-100 text-blue-700',   icon: 'schedule'      },
  processing:          { labelKey: 'statusInProgress',             color: 'bg-blue-100 text-blue-700',   icon: 'sync'          },
  pending_documents:   { labelKey: 'statusAdditionalInfoRequired', color: 'bg-amber-100 text-amber-700', icon: 'folder_open'   },
  needs_human_review:  { labelKey: 'statusUnderExpertReview',      color: 'bg-purple-100 text-purple-700',icon: 'person_search' },
  human_review:        { labelKey: 'statusUnderExpertReview',      color: 'bg-purple-100 text-purple-700',icon: 'person_search' },
  approved_automatically:{ labelKey: 'statusApproved',            color: 'bg-green-100 text-green-700', icon: 'check_circle'  },
  approved:            { labelKey: 'statusApproved',               color: 'bg-green-100 text-green-700', icon: 'check_circle'  },
  completed:           { labelKey: 'statusApproved',               color: 'bg-green-100 text-green-700', icon: 'check_circle'  },
  rejected:            { labelKey: 'statusNotEligible',            color: 'bg-red-100 text-red-700',     icon: 'cancel'        },
}

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['submitted']
}

function fmt(n) {
  if (n == null) return '—'
  return `AED ${Number(n).toLocaleString('en-US')}`
}

export default function MyApplications() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const { t, language } = useLanguage()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!user?.emiratesId) {
      setLoading(false)
      return
    }
    getApplicationsByUser(user.emiratesId)
      .then((data) => setApplications(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user, isAuthenticated, navigate])

  // Poll every 5 seconds while any application is still in a pending state
  useEffect(() => {
    const hasPending = applications.some(
      (a) => a.status === 'submitted' || a.status === 'processing',
    )
    if (!hasPending || !user?.emiratesId) return
    const interval = setInterval(() => {
      getApplicationsByUser(user.emiratesId)
        .then((data) => setApplications(data || []))
        .catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [applications, user])

  return (
    <div>
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-4 lg:px-10">
          <Breadcrumbs
            trail={[
              { label: t('breadcrumbHousing'), to: '/' },
              { label: t('myApplications') },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t('myApplications')}</h1>
            {user?.fullNameEn && (
              <p className="mt-1 text-sm text-ink-500">{language === 'ar' ? user.fullNameAr : user.fullNameEn}</p>
            )}
          </div>
          <Button
            as="link"
            to="/"
            variant="secondary"
            icon={<Icon name="add" className="!text-base" />}
          >
            {t('newApplication')}
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 gap-3 text-ink-500">
            <Icon name="sync" className="!text-2xl animate-spin" />
            <span>{t('loadingApplications')}</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <Icon name="error" className="text-red-600 shrink-0" />
            <p className="text-sm text-red-900">{error}</p>
          </div>
        )}

        {!loading && !error && applications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-ink-100 text-ink-400">
              <Icon name="folder_open" className="!text-3xl" />
            </span>
            <div>
              <p className="text-lg font-semibold text-ink-700">{t('noApplicationsYet')}</p>
              <p className="mt-1 text-sm text-ink-500">{t('noApplicationsDesc')}</p>
            </div>
            <Button as="link" to="/" variant="primary">
              {t('startNewRequest')}
            </Button>
          </div>
        )}

        {!loading && !error && applications.length > 0 && (
          <div className="space-y-4">
            {applications.map((app) => {
              const cfg = getStatusConfig(app.status)
              const loan = Array.isArray(app.loan_details)
                ? app.loan_details[0]
                : app.loan_details
              const rec = Array.isArray(app.recommendations)
                ? app.recommendations[0]
                : app.recommendations

              return (
                <div
                  key={app.application_id}
                  className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card"
                >
                  <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-bold text-ink-700">
                          {app.application_id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${cfg.color}`}
                        >
                          <Icon name={cfg.icon} className="!text-xs" />
                          {t(cfg.labelKey)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-600">{t('arrearsReschedulingRequest')}</p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {t('submittedOn')}:{' '}
                        {app.submitted_at
                          ? new Date(app.submitted_at).toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-GB', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—'}
                      </p>
                      {loan && (
                        <p className="mt-0.5 text-xs text-ink-400">
                          {t('totalArrearsLabel')}: {fmt(loan.arrears_amount)} · {t('currentEmiLabel')}: {fmt(loan.current_monthly_emi)}
                          /mo
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Link
                        to={`/my-applications/${app.application_id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-gold-300 hover:text-gold-700"
                      >
                        {t('viewDetails')}
                        <Icon name={language === 'ar' ? 'arrow_back' : 'arrow_forward'} className="!text-base" />
                      </Link>
                      {(['approved', 'approved_automatically', 'completed'].includes(app.status) || rec?.path_taken) && (
                        <Link
                          to={`/my-applications/${app.application_id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-gold-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-700"
                        >
                          <Icon name="download" className="!text-base" />
                          {t('decisionLetter')}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
