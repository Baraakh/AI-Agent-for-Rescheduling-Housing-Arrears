import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import StatusBadge from './StatusBadge'
import RiskBadge from './RiskBadge'
import Icon from './Icon'

function formatCurrency(amount) {
  return `AED ${Number(amount || 0).toLocaleString('en-US')}`
}

export default function ApplicationsTable({ applications }) {
  const { t, language } = useLanguage()
  const locale = language === 'ar' ? 'ar-AE' : 'en-GB'

  function formatDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const columns = [
    { key: 'application_id', label: t('colApplicationId') },
    { key: 'applicant_name', label: t('colApplicantName') },
    { key: 'current_salary', label: t('colCurrentSalary') },
    { key: 'arrears_amount', label: t('colArrearsAmount') },
    { key: 'overdue_months', label: t('colOverdueMonths') },
    { key: 'risk_level', label: t('colRiskLevel') },
    { key: 'status', label: t('colStatus') },
    { key: 'human_review_required', label: t('colHumanReview') },
    { key: 'confidence_score', label: t('colConfidenceScore') },
    { key: 'last_updated', label: t('colLastUpdated') },
    { key: 'actions', label: '' },
  ]

  if (!applications.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-16 text-center">
        <Icon name="search_off" className="text-[32px] text-navy-300" />
        <p className="text-sm font-medium text-navy-600">{t('noApplicationsMatch')}</p>
        <p className="text-xs text-navy-400">{t('tryAdjustingFilters')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/60 text-xs font-semibold uppercase tracking-wide text-navy-500">
              {columns.map((col) => (
                <th key={col.key} scope="col" className="whitespace-nowrap px-4 py-3 first:pl-5 last:pr-5">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {applications.map((app) => {
              return (
                <tr
                  key={app.application_id}
                  className="transition-colors hover:bg-navy-50/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 pl-5 font-mono text-xs font-medium text-navy-700">
                    {app.application_id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-navy-900">{app.applicant_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-navy-600">{formatCurrency(app.current_salary)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-navy-600">{formatCurrency(app.arrears_amount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-navy-600">{app.overdue_months} {t('monthAbbr')}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <RiskBadge level={app.risk_level} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        app.human_review_required ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      <Icon name={app.human_review_required ? 'person_search' : 'smart_toy'} className="text-[16px]" />
                      {app.human_review_required ? t('reviewRequired') : t('reviewNotNeeded')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-navy-100">
                        <div
                          className={`h-full rounded-full ${
                            app.confidence_score >= 85
                              ? 'bg-emerald-500'
                              : app.confidence_score >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.max(app.confidence_score, 4)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-navy-700">{app.confidence_score}%</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-navy-500">{formatDate(app.last_updated)}</td>
                  <td className="whitespace-nowrap px-4 py-3 pr-5 text-right">
                    <Link
                      to={`/applications/${app.application_id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:bg-navy-900 hover:text-white"
                    >
                      <Icon name="visibility" className="text-[15px]" />
                      {t('viewDetails')}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
