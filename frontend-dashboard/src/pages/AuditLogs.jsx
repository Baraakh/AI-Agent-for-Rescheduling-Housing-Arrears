import { useMemo, useState, useEffect } from 'react'
import { getAllApplications } from '../services/dashboardService'
import { useLanguage } from '../contexts/LanguageContext'
import DashboardCard from '../components/DashboardCard'
import StatusBadge from '../components/StatusBadge'
import Icon from '../components/Icon'

function offsetDays(iso, n) {
  return new Date(new Date(iso).getTime() - n * 24 * 60 * 60 * 1000).toISOString()
}

export default function AuditLogs() {
  const [eventFilter, setEventFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const { t, language } = useLanguage()
  const locale = language === 'ar' ? 'ar-AE' : 'en-GB'

  function formatDateTime(iso) {
    return new Date(iso).toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const EVENT_TYPES = {
    submitted: { label: t('eventSubmitted'), icon: 'send', tone: 'bg-navy-50 text-navy-500' },
    uploaded: { label: t('eventUploaded'), icon: 'cloud_upload', tone: 'bg-sky-50 text-sky-600' },
    validation: { label: t('eventValidation'), icon: 'task_alt', tone: 'bg-violet-50 text-violet-600' },
    recommendation: { label: t('eventRecommendation'), icon: 'lightbulb', tone: 'bg-gold-100 text-gold-700' },
    status: { label: t('eventStatus'), icon: 'flag', tone: 'bg-emerald-50 text-emerald-600' },
    review: { label: t('eventReview'), icon: 'person_search', tone: 'bg-amber-50 text-amber-600' },
  }

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

  const allEntries = useMemo(() => {
    if (applications.length === 0) return []
    const entries = []

    applications.forEach((app) => {
      const hasDocs = app.documents_received?.length > 0 || (app.documents && app.documents.length > 0)
      const isComplete = !app.missing_documents || app.missing_documents.length === 0
      const submitted = app.submitted_at || app.last_updated

      entries.push({ id: `${app.application_id}-submitted`, app, type: 'submitted', timestamp: offsetDays(submitted, 6), detail: `Rescheduling request received from ${app.applicant_name}.` })
      entries.push({ id: `${app.application_id}-uploaded`, app, type: 'uploaded', timestamp: offsetDays(submitted, 5), detail: hasDocs ? `Supporting documents uploaded and received.` : 'No supporting documents were uploaded.' })
      entries.push({ id: `${app.application_id}-validation`, app, type: 'validation', timestamp: offsetDays(submitted, 3), detail: isComplete ? 'Salary, identity and bank records validated.' : 'Validation paused — required documents missing.' })
      entries.push({ id: `${app.application_id}-recommendation`, app, type: 'recommendation', timestamp: offsetDays(submitted, 2), detail: app.recommended_duration_months > 0 ? `Suggested a plan at AED ${Number(app.recommended_monthly_arrears_payment || 0).toLocaleString()}/month.` : 'No recommendation generated.' })
      entries.push({ id: `${app.application_id}-status`, app, type: 'status', timestamp: offsetDays(submitted, 1), detail: `Case marked as "${app.status}".` })
      entries.push({ id: `${app.application_id}-review`, app, type: 'review', timestamp: app.last_updated || submitted, detail: app.human_review_required ? 'Routed to an employee reviewer for final judgement.' : 'No employee review required — closed automatically.' })

      if (Array.isArray(app.audit_logs)) {
        app.audit_logs.forEach((log) => {
          entries.push({
            id: `real-${log.id}`,
            app,
            type: 'review',
            timestamp: log.created_at,
            detail: `${log.action_description} (${log.performed_by})`
          })
        })
      }
    })

    return entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [applications])

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allEntries.filter((entry) => {
      if (eventFilter !== 'all' && entry.type !== eventFilter) return false
      if (term) {
        const haystack = `${entry.app.applicant_name} ${entry.app.application_id} ${entry.detail}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [allEntries, eventFilter, search])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
          <Icon name="history" className="text-[22px] text-gold-600" />
          {t('auditLogsTitle')}
        </h1>
        <p className="mt-0.5 text-sm text-navy-400">
          {t('auditLogsDesc')}
        </p>
      </div>

      <DashboardCard bodyClassName="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:w-72">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-navy-300">
              <Icon name="search" className="text-[18px]" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchAuditLogs')}
              className="w-full rounded-xl border border-navy-100 bg-white py-2 pl-10 pr-3 text-sm text-navy-700 placeholder:text-navy-300 outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-100"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setEventFilter('all')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                eventFilter === 'all' ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
              }`}
            >
              {t('allEvents')}
            </button>
            {Object.entries(EVENT_TYPES).map(([key, def]) => (
              <button
                key={key}
                type="button"
                onClick={() => setEventFilter(key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  eventFilter === key ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                }`}
              >
                <Icon name={def.icon} className="text-[14px]" />
                {def.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-navy-400">
          {t('showingXofY')} <span className="font-semibold text-navy-700">{filteredEntries.length}</span> {t('ofY')} {allEntries.length} {t('loggedEvents')}
        </p>

        <ol className="space-y-0 border-t border-navy-50">
          {filteredEntries.map((entry) => {
            const def = EVENT_TYPES[entry.type]
            return (
              <li key={entry.id} className="flex items-start gap-3 border-b border-navy-50 px-1 py-3">
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${def.tone}`}>
                  <Icon name={def.icon} className="text-[17px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold text-navy-900">{def.label}</p>
                    <span className="font-mono text-[11px] text-navy-400">{entry.app.application_id}</span>
                    <span className="text-xs text-navy-400">· {entry.app.applicant_name}</span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-navy-500">{entry.detail}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusBadge status={entry.app.status} />
                    <span className="text-[11px] text-navy-300">{formatDateTime(entry.timestamp)}</span>
                  </div>
                </div>
              </li>
            )
          })}
          {filteredEntries.length === 0 && (
            <li className="flex flex-col items-center gap-2 py-12 text-center">
              <Icon name="search_off" className="text-[28px] text-navy-300" />
              <p className="text-sm font-medium text-navy-600">{t('noLogEntries')}</p>
            </li>
          )}
        </ol>
      </DashboardCard>
    </div>
  )
}
