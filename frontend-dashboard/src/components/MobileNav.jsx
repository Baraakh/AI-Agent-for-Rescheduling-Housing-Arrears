import { NavLink } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import Icon from './Icon'

export default function MobileNav() {
  const { t } = useLanguage()

  const ITEMS = [
    { to: '/', label: t('navDashboard'), icon: 'dashboard', end: true },
    { to: '/applications', label: t('navApplications'), icon: 'folder_open' },
    { to: '/approved', label: t('navApproved'), icon: 'verified' },
    { to: '/needs-review', label: t('navNeedsReview'), icon: 'fact_check' },
    { to: '/pending-documents', label: t('navPendingDocs'), icon: 'upload_file' },
    { to: '/audit-logs', label: t('navAuditLogs'), icon: 'history' },
    { to: '/settings', label: t('navSettings'), icon: 'settings' },
  ]

  return (
    <nav className="flex gap-1.5 overflow-x-auto border-b border-navy-100 bg-white px-4 py-2 scrollbar-thin lg:hidden">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              isActive ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
            }`
          }
        >
          <Icon name={item.icon} className="text-[16px]" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
