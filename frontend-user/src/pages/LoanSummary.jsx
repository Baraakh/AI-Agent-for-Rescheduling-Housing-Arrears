import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getPaymentOnTimePct } from '../data/moeiData'
import Breadcrumbs from '../components/Breadcrumbs'
import SideNav from '../components/SideNav'
import Button from '../components/Button'
import Icon from '../components/Icon'

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}

export default function LoanSummary() {
  const navigate = useNavigate()
  const { loanData } = useAuth()
  const { t, language } = useLanguage()

  const loan = loanData || {}
  const arrears = loan.arrears || {}
  const onTimePct = getPaymentOnTimePct(loan.paymentHistory)
  const previousCount = loan.previousApplications?.length || 0

  const handleContinue = () => {
    localStorage.setItem('maxReachedStep', '3')
    navigate('/documents')
  }

  const stats = [
    {
      label: t('totalArrearsAmount'),
      value: fmt(arrears.totalAmount),
      unit: t('unitAed'),
      note: `${arrears.monthsOverdue || 0} ${t('monthsSuffix')} ${t('overdue')}`,
      icon: 'account_balance_wallet',
      accent: true,
    },
    {
      label: t('overdueInstallments'),
      value: arrears.unpaidInstallments || arrears.monthsOverdue || '—',
      unit: t('unitMonths'),
      icon: 'event_busy',
    },
    {
      label: t('currentEmiLabel'),
      value: fmt(loan.currentEmi),
      unit: t('unitAedPerMonth'),
      icon: 'payments',
    },
    {
      label: t('remainingPeriodLabel'),
      value: loan.remainingTermMonths || '—',
      unit: t('unitMonths'),
      icon: 'calendar_month',
    },
    {
      label: t('remainingBalance'),
      value: fmt(loan.outstandingBalance),
      unit: t('unitAed'),
      icon: 'account_balance',
    },
    {
      label: t('priorReschedulings'),
      value: previousCount,
      unit: t('unitOccurrences'),
      icon: 'history',
    },
  ]

  return (
    <div>
      <section className="bg-gradient-to-r from-gold-700 to-gold-600 text-white">
        <div className="mx-auto max-w-[1440px] px-6 pb-8 pt-6 lg:px-10">
          <Breadcrumbs
            dark
            trail={[
              { label: t('breadcrumbHousing'), to: '/' },
              { label: t('breadcrumbArrears'), to: '/' },
              { label: t('breadcrumbLoanDetails') },
            ]}
          />
          <h1 className="mt-6 text-2xl font-bold sm:text-3xl">{t('yourLoanDetails')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
            {t('loanDetailsRetrievedDesc')}
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:flex-row lg:px-10">
        <SideNav caseRef={loan.loanId || 'SZHP-LN-—'} />

        <div className="flex-1 space-y-6">
          <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
            <div className="flex flex-col items-start justify-between gap-3 border-b border-ink-100 p-6 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">{t('loanDetailsSummary')}</h3>
                <p className="mt-1 text-sm text-ink-500">
                  {t('loanIdLabel')}: {loan.loanId || '—'} · {t('retrievedFromMOEI')}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gold-700">
                <Icon name="verified" className="!text-sm" />
                {t('activeLoan')}
              </span>
            </div>

            {/* Stat grid */}
            <div className="grid gap-px bg-ink-100 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`flex flex-col gap-3 p-6 ${
                    stat.accent ? 'bg-gold-50/70 lg:col-span-2' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 text-ink-500">
                    <Icon
                      name={stat.icon}
                      className={stat.accent ? 'text-gold-600' : 'text-ink-400'}
                    />
                    <p className="text-sm font-medium">{stat.label}</p>
                  </div>
                  <p className="flex items-baseline gap-1.5">
                    <span
                      className={`font-bold text-ink-900 ${stat.accent ? 'text-3xl' : 'text-2xl'}`}
                    >
                      {stat.value}
                    </span>
                    <span className="text-sm font-medium text-ink-500">{stat.unit}</span>
                  </p>
                  {stat.note && <p className="text-xs font-medium text-ink-500">{stat.note}</p>}
                </div>
              ))}
            </div>

            {/* Payment history */}
            <div className="border-t border-ink-100 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-ink-700">{t('paymentHistory12')}</p>
                <span
                  className={`text-sm font-bold ${
                    onTimePct >= 70 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {onTimePct}% {t('onTime')}
                </span>
              </div>
              <div className="flex gap-1">
                {(loan.paymentHistory || []).slice(-12).map((p, i) => (
                  <div
                    key={i}
                    title={`${p.month}: ${p.status}`}
                    className={`h-6 flex-1 rounded-sm ${
                      p.status === 'PAID' ? 'bg-green-400' : 'bg-red-400'
                    }`}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-ink-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-400" /> {t('paidLegend')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" /> {t('missedLegend')}
                </span>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              as="link"
              to="/profile"
              variant="secondary"
              icon={<Icon name={language === 'ar' ? 'arrow_forward' : 'arrow_back'} className="!text-base" />}
            >
              {t('backToProfile')}
            </Button>
            <Button
              onClick={handleContinue}
              variant="primary"
              icon={<Icon name={language === 'ar' ? 'arrow_back' : 'arrow_forward'} className="!text-base" />}
              iconPosition="right"
            >
              {t('confirmContinue')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
