import { useMemo, useState, useEffect } from 'react'
import { getAllApplications } from '../services/dashboardService'
import { useLanguage } from '../contexts/LanguageContext'
import SummaryCards from '../components/SummaryCards'
import ApplicationsTable from '../components/ApplicationsTable'
import DashboardCard from '../components/DashboardCard'
import StatusBadge from '../components/StatusBadge'
import Icon from '../components/Icon'

function formatDateTime(iso, locale) {
  return new Date(iso).toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Dashboard() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const { t, language } = useLanguage()
  const locale = language === 'ar' ? 'ar-AE' : 'en-GB'

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

  const recentApplications = useMemo(
    () =>
      [...applications]
        .sort((a, b) => new Date(b.submitted_at || b.last_updated) - new Date(a.submitted_at || a.last_updated))
        .slice(0, 8),
    [applications],
  )

  const recentActivity = useMemo(
    () =>
      [...applications]
        .sort((a, b) => new Date(b.last_updated || b.submitted_at) - new Date(a.last_updated || a.submitted_at))
        .slice(0, 6),
    [applications],
  )

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-navy-100 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700 px-6 py-7 text-white shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300">{t('agentBadge')}</p>
        <h2 className="mt-1.5 max-w-2xl text-xl font-semibold leading-snug sm:text-2xl">
          {t('welcomeMsg')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-200">
          {t('agentDesc')}
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-navy-100 bg-white py-12 text-center text-navy-400 text-sm">
          {t('loadingMetrics')}
        </div>
      ) : (
        <SummaryCards applications={applications} />
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <DashboardCard
          title={t('recentApplications')}
          subtitle={t('recentApplicationsSubtitle')}
          className="xl:col-span-2"
          bodyClassName="p-0"
        >
          {loading ? (
            <div className="py-20 text-center text-navy-400 text-sm">{t('loadingApplications')}</div>
          ) : (
            <ApplicationsTable applications={recentApplications} />
          )}
        </DashboardCard>

        <DashboardCard title={t('recentActivity')} subtitle={t('recentActivitySubtitle')} bodyClassName="p-0">
          {loading ? (
            <div className="py-20 text-center text-navy-400 text-sm">{t('loadingActivity')}</div>
          ) : (
            <ul className="divide-y divide-navy-50">
              {recentActivity.map((app) => (
                <li key={app.application_id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-500">
                    <Icon name={app.human_review_required ? 'person_search' : 'smart_toy'} className="text-[16px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-900">{app.applicant_name}</p>
                    <p className="font-mono text-[11px] text-navy-400">{app.application_id}</p>
                    <div className="mt-2 flex flex-col items-start gap-1">
                      <span className="text-[11px] text-navy-400 font-medium">{formatDateTime(app.last_updated || app.submitted_at, locale)}</span>
                      <StatusBadge status={app.status} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
