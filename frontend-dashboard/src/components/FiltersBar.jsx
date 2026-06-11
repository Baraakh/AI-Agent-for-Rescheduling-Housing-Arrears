import { useLanguage } from '../contexts/LanguageContext'
import Icon from './Icon'

const selectClasses =
  'w-full appearance-none rounded-xl border border-navy-100 bg-white py-2 pl-3 pr-9 text-sm text-navy-700 outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-100'

function Select({ label, icon, value, onChange, options }) {
  return (
    <label className="block text-xs font-medium text-navy-400">
      <span className="mb-1 flex items-center gap-1.5 text-navy-500">
        <Icon name={icon} className="text-[16px]" />
        {label}
      </span>
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClasses}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-navy-300">
          <Icon name="expand_more" className="text-[18px]" />
        </span>
      </span>
    </label>
  )
}

export default function FiltersBar({ filters, onChange, resultCount }) {
  const { t } = useLanguage()
  const update = (key) => (value) => onChange({ ...filters, [key]: value })

  const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: t('statusAll') },
    { value: 'approved', label: t('statusApprovedAuto') },
    { value: 'needs-review', label: t('statusNeedsReview') },
    { value: 'pending-documents', label: t('statusPendingDocs') },
    { value: 'salary-mismatch', label: t('statusSalaryMismatch') },
    { value: 'medical-review', label: t('statusMedicalReview') },
    { value: 'incomplete', label: t('statusIncomplete') },
    { value: 'rejected', label: t('statusRejectedFilter') },
  ]

  const RISK_FILTER_OPTIONS = [
    { value: 'all', label: t('riskAll') },
    { value: 'Low', label: t('riskLow') },
    { value: 'Medium', label: t('riskMedium') },
    { value: 'High', label: t('riskHigh') },
    { value: 'Incomplete', label: t('riskIncomplete') },
  ]

  const REVIEW_FILTER_OPTIONS = [
    { value: 'all', label: t('reviewAll') },
    { value: 'yes', label: t('reviewRequiredFilter') },
    { value: 'no', label: t('reviewNotNeededFilter') },
  ]

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block text-xs font-medium text-navy-400 lg:col-span-1">
          <span className="mb-1 flex items-center gap-1.5 text-navy-500">
            <Icon name="search" className="text-[16px]" />
            {t('search')}
          </span>
          <span className="relative block">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => update('search')(e.target.value)}
              placeholder={t('nameOrAppId')}
              className="w-full rounded-xl border border-navy-100 bg-white py-2 pl-3 pr-3 text-sm text-navy-700 placeholder:text-navy-300 outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-100"
            />
          </span>
        </label>

        <Select label={t('filterStatus')} icon="filter_alt" value={filters.status} onChange={update('status')} options={STATUS_FILTER_OPTIONS} />
        <Select label={t('filterRiskLevel')} icon="warning" value={filters.risk} onChange={update('risk')} options={RISK_FILTER_OPTIONS} />
        <Select label={t('filterHumanReview')} icon="person_search" value={filters.review} onChange={update('review')} options={REVIEW_FILTER_OPTIONS} />

        <label className="block text-xs font-medium text-navy-400">
          <span className="mb-1 flex items-center gap-1.5 text-navy-500">
            <Icon name="event" className="text-[16px]" />
            {t('filterLastUpdated')}
          </span>
          <span className="relative block">
            <select value={filters.date} onChange={(e) => update('date')(e.target.value)} className={selectClasses}>
              <option value="all">{t('anyTime')}</option>
              <option value="7d">{t('last7Days')}</option>
              <option value="30d">{t('last30Days')}</option>
              <option value="90d">{t('last90Days')}</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-navy-300">
              <Icon name="expand_more" className="text-[18px]" />
            </span>
          </span>
          <span className="mt-1 block text-[11px] text-navy-300">{t('demoPlaceholder')}</span>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-navy-50 pt-3">
        <p className="text-xs text-navy-400">
          {t('showing')} <span className="font-semibold text-navy-700">{resultCount}</span> {t('matchingApplications')}
        </p>
        <button
          type="button"
          onClick={() => onChange({ search: '', status: 'all', risk: 'all', review: 'all', date: 'all' })}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-navy-500 transition hover:bg-navy-50 hover:text-navy-700"
        >
          <Icon name="filter_alt_off" className="text-[16px]" />
          {t('resetFilters')}
        </button>
      </div>
    </div>
  )
}
