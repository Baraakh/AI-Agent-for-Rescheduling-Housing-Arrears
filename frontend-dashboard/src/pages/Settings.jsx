import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import DashboardCard from '../components/DashboardCard'
import Icon from '../components/Icon'

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-navy-50 bg-navy-50/40 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-navy-800">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-navy-400">{hint}</p>}
      </div>
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition" onClick={() => onChange(!checked)}>
        <span className={`absolute inset-0 rounded-full transition ${checked ? 'bg-gold-500' : 'bg-navy-200'}`} />
        <span className={`relative inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
      </span>
    </label>
  )
}

export default function Settings() {
  const { t } = useLanguage()
  const [prefs, setPrefs] = useState({
    emailAlerts: true,
    reviewReminders: true,
    autoRefresh: false,
    compactTables: false,
  })
  const [saved, setSaved] = useState(false)

  const update = (key) => (value) => {
    setPrefs((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
          <Icon name="settings" className="text-[22px] text-gold-600" />
          {t('settingsTitle')}
        </h1>
        <p className="mt-0.5 text-sm text-navy-400">
          {t('settingsDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <DashboardCard title={t('reviewerProfile')} subtitle={t('reviewerProfileSubtitle')}>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-lg font-semibold text-white">ER</span>
            <div>
              <p className="text-sm font-semibold text-navy-900">{t('employeeReviewer')}</p>
              <p className="text-xs text-navy-400">{t('financeCollection')}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-navy-400">
                <Icon name="badge" className="text-[15px]" />
                {t('roleCaseReviewer')}
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-navy-50 bg-navy-50/40 px-3 py-2.5">
              <dt className="font-semibold uppercase tracking-wide text-navy-400">{t('department')}</dt>
              <dd className="mt-0.5 font-medium text-navy-800">{t('financeCollectionShort')}</dd>
            </div>
            <div className="rounded-xl border border-navy-50 bg-navy-50/40 px-3 py-2.5">
              <dt className="font-semibold uppercase tracking-wide text-navy-400">{t('workingHours')}</dt>
              <dd className="mt-0.5 font-medium text-navy-800">{t('workingHoursValue')}</dd>
            </div>
          </dl>
        </DashboardCard>

        <DashboardCard title={t('notificationPreferences')} subtitle={t('notificationPreferencesSubtitle')}>
          <div className="space-y-3">
            <Toggle
              checked={prefs.emailAlerts}
              onChange={update('emailAlerts')}
              label={t('emailAlertLabel')}
              hint={t('emailAlertHint')}
            />
            <Toggle
              checked={prefs.reviewReminders}
              onChange={update('reviewReminders')}
              label={t('dailyRemindersLabel')}
              hint={t('dailyRemindersHint')}
            />
            <Toggle
              checked={prefs.autoRefresh}
              onChange={update('autoRefresh')}
              label={t('autoRefreshLabel')}
              hint={t('autoRefreshHint')}
            />
          </div>
        </DashboardCard>

        <DashboardCard title={t('displayPreferences')} subtitle={t('displayPreferencesSubtitle')}>
          <div className="space-y-3">
            <Toggle
              checked={prefs.compactTables}
              onChange={update('compactTables')}
              label={t('compactTablesLabel')}
              hint={t('compactTablesHint')}
            />
            <div className="rounded-xl border border-navy-50 bg-navy-50/40 px-4 py-3">
              <p className="text-sm font-medium text-navy-800">{t('defaultLandingPage')}</p>
              <p className="mt-0.5 text-xs text-navy-400">{t('defaultLandingPageHint')}</p>
              <select
                defaultValue="dashboard"
                className="mt-2 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-700 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100"
              >
                <option value="dashboard">{t('optionDashboard')}</option>
                <option value="applications">{t('optionAllApplications')}</option>
                <option value="needs-review">{t('optionNeedsReview')}</option>
              </select>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('aboutWorkspace')} subtitle={t('aboutWorkspaceSubtitle')}>
          <ul className="space-y-2.5 text-sm text-navy-600">
            <li className="flex items-start gap-2.5">
              <Icon name="smart_toy" className="mt-0.5 text-[18px] text-gold-600" />
              {t('aboutLine1')}
            </li>
            <li className="flex items-start gap-2.5">
              <Icon name="layers" className="mt-0.5 text-[18px] text-gold-600" />
              {t('aboutLine2')}
            </li>
            <li className="flex items-start gap-2.5">
              <Icon name="shield" className="mt-0.5 text-[18px] text-gold-600" />
              {t('aboutLine3')}
            </li>
          </ul>
        </DashboardCard>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSaved(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          <Icon name="save" className="text-[18px]" />
          {t('savePreferences')}
        </button>
        {saved && (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 fade-in">
            <Icon name="check_circle" className="text-[16px]" />
            {t('preferencesSaved')}
          </p>
        )}
      </div>
    </div>
  )
}
