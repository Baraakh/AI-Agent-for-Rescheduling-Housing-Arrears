import { useMemo, useState, useEffect } from 'react'
import { getAllApplications } from '../services/dashboardService'
import { useLanguage } from '../contexts/LanguageContext'
import FiltersBar from './FiltersBar'
import ApplicationsTable from './ApplicationsTable'
import Icon from './Icon'

const STATUS_PREDICATES = {
  approved:            (s) => s === 'approved_automatically' || s === 'approved',
  'needs-review':      (s) => s === 'needs_human_review' || s === 'human_review' || s === 'escalated_p5',
  'pending-documents': (s) => s === 'pending_documents',
  'salary-mismatch':   (s) => s === 'escalated_p5',
  'medical-review':    (s) => s === 'needs_human_review',
  incomplete:          (s) => s === 'pending_documents',
  rejected:            (s) => s === 'rejected',
}

function withinDateWindow(iso, windowKey) {
  if (windowKey === 'all') return true
  const days = { '7d': 7, '30d': 30, '90d': 90 }[windowKey]
  if (!days) return true
  const updated = new Date(iso).getTime()
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return updated >= cutoff
}

export default function ApplicationsExplorer({ title, description, icon, baseFilter, emptyHint }) {
  const [filters, setFilters] = useState({ search: '', status: 'all', risk: 'all', review: 'all', date: 'all' })
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const data = await getAllApplications()
        setApplications(data || [])
      } catch (err) {
        console.error('Failed to load applications:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const baseApplications = useMemo(() => {
    if (!baseFilter) return applications
    return applications.filter((app) => baseFilter(app.status))
  }, [applications, baseFilter])

  const filteredApplications = useMemo(() => {
    const term = filters.search.trim().toLowerCase()
    return baseApplications.filter((app) => {
      if (term) {
        const haystack = `${app.applicant_name} ${app.application_id}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      if (filters.status !== 'all') {
        const predicate = STATUS_PREDICATES[filters.status]
        if (predicate && !predicate(app.status)) return false
      }
      if (filters.risk !== 'all' && app.risk_level !== filters.risk) return false
      if (filters.review !== 'all') {
        const wantsReview = filters.review === 'yes'
        if (Boolean(app.human_review_required) !== wantsReview) return false
      }
      if (!withinDateWindow(app.last_updated || app.submitted_at, filters.date)) return false
      return true
    })
  }, [baseApplications, filters])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
            <Icon name={icon} className="text-[22px] text-gold-600" />
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-navy-400">{description}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-navy-50 px-3 py-1.5 text-xs font-medium text-navy-500">
          <Icon name="folder_open" className="text-[15px]" />
          {baseApplications.length} {t('casesInView')}
        </span>
      </div>

      <FiltersBar filters={filters} onChange={setFilters} resultCount={filteredApplications.length} />

      {loading ? (
        <div className="rounded-2xl border border-navy-100 bg-white py-20 text-center text-navy-400 text-sm shadow-card">
          {t('loadingCases')}
        </div>
      ) : baseApplications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-200 bg-white px-6 py-16 text-center">
          <Icon name="inbox" className="text-[32px] text-navy-300" />
          <p className="text-sm font-medium text-navy-600">{t('nothingHere')}</p>
          <p className="max-w-xs text-xs text-navy-400">{emptyHint}</p>
        </div>
      ) : (
        <ApplicationsTable applications={filteredApplications} />
      )}
    </div>
  )
}
