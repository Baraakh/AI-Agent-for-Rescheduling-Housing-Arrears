import { NavLink } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import Icon from './Icon'
import logo from '../assets/logo.png'

export default function Sidebar() {
  const { t } = useLanguage()

  const NAV_ITEMS = [
    { to: '/', label: t('navDashboard'), icon: 'dashboard', end: true },
    { to: '/applications', label: t('navApplications'), icon: 'folder_open' },
    { to: '/approved', label: t('navApprovedCases'), icon: 'verified' },
    { to: '/needs-review', label: t('navNeedsReview'), icon: 'fact_check' },
    { to: '/pending-documents', label: t('navPendingDocuments'), icon: 'upload_file' },
    { to: '/rejected', label: t('navRejectedCases'), icon: 'block' },
    { to: '/audit-logs', label: t('navAuditLogs'), icon: 'history' },
    { to: '/settings', label: t('navSettings'), icon: 'settings' },
  ]

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-navy-100 bg-navy-900 text-navy-100 lg:flex">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <img src={logo} alt="MOEI Logo" className="h-10 w-10 object-contain" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">{t('moeiPortal')}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-400">
          {t('navigation')}
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-gold-500/15 text-gold-300 ring-1 ring-inset ring-gold-400/30'
                  : 'text-navy-200 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} filled={isActive} className="text-[20px]" />
                <span>{item.label}</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-gold-300">
            <Icon name="smart_toy" className="text-[18px]" />
            {t('aiAgentStatus')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-navy-300">
            {t('agentActiveDesc')}
          </p>
        </div>
      </div>
    </aside>
  )
}
