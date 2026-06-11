import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import Header from './Header'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

// Shared shell: sidebar + header around every routed page.
export default function Layout() {
  const location = useLocation()
  const { t } = useLanguage()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-slate-100/60">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <MobileNav />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-navy-100 bg-white px-6 py-4 text-center text-xs text-navy-300">
          {t('frontendDemoOnly')}
        </footer>
      </div>
    </div>
  )
}
