import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import Icon from './Icon'

export default function SideNav({ caseRef = 'SZHP-LN-—' }) {
  const { pathname } = useLocation()
  const { t } = useLanguage()

  const steps = [
    { label: t('stepServiceOverview'), to: '/', icon: 'home_work' },
    { label: t('breadcrumbConfirmIdentity'), to: '/profile', icon: 'badge' },
    { label: t('breadcrumbLoanDetails'), to: '/loan-details', icon: 'account_balance' },
    { label: t('breadcrumbDocuments'), to: '/documents', icon: 'upload_file' },
    { label: t('breadcrumbReviewSubmit'), to: '/review', icon: 'fact_check' },
  ]

  const activeIndex = steps.findIndex((s) => s.to === pathname)

  const [maxReachedStep, setMaxReachedStep] = useState(() => {
    const saved = localStorage.getItem('maxReachedStep')
    return saved ? parseInt(saved, 10) : 0
  })

  useEffect(() => {
    const saved = localStorage.getItem('maxReachedStep')
    const currentMax = saved ? parseInt(saved, 10) : 0
    setMaxReachedStep(currentMax)
  }, [pathname])

  return (
    <aside className="w-full shrink-0 lg:w-72">
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
        <div className="space-y-1 border-b border-ink-100 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-600 font-bold text-white">M</div>
          <h3 className="pt-2 text-lg font-semibold text-ink-900">
            {t('arrearsReschedulingTitle')}
          </h3>
          <p className="text-sm text-ink-500">{t('breadcrumbHousing')}</p>
        </div>

        <div className="space-y-1 p-3">
          <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            {t('applicationSteps')}
          </p>
          <p className="px-2 pb-2 text-xs text-ink-500">{t('caseReferenceLabel')} {caseRef}</p>

          <nav className="space-y-1">
            {steps.map((step, i) => {
              const isActive = i === activeIndex
              const isDone = activeIndex > -1 && i < activeIndex
              const isClickable = i <= maxReachedStep

              if (!isClickable) {
                return (
                  <div
                    key={step.to}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-400 opacity-50 cursor-not-allowed select-none"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs bg-ink-100 text-ink-400">
                      <Icon name={step.icon} className="!text-base" />
                    </span>
                    {step.label}
                  </div>
                )
              }

              return (
                <Link
                  key={step.to}
                  to={step.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gold-50 text-gold-700 ring-1 ring-gold-200'
                      : 'text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${
                      isActive
                        ? 'bg-gold-600 text-white'
                        : isDone
                        ? 'bg-gold-100 text-gold-700'
                        : 'bg-ink-100 text-ink-500'
                    }`}
                  >
                    {isDone ? <Icon name="check" className="!text-sm" /> : <Icon name={step.icon} className="!text-base" />}
                  </span>
                  {step.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="space-y-1 border-t border-ink-100 p-3">
          <Link to="/my-applications" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50">
            <Icon name="folder_open" className="!text-lg text-ink-400" />
            {t('myApplications')}
          </Link>
          <Link to="#" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50">
            <Icon name="support_agent" className="!text-lg text-ink-400" />
            {t('contactSupport')}
          </Link>
        </div>
      </div>
    </aside>
  )
}
