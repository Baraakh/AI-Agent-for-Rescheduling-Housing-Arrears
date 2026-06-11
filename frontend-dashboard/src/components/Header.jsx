import { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import Icon from './Icon'

function formatNow(date, locale) {
  const datePart = date.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
  const timePart = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  return `${datePart} · ${timePart} (Asia/Dubai)`
}

export default function Header() {
  const [now, setNow] = useState(() => new Date())
  const { t, language, changeLanguage } = useLanguage()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const locale = language === 'ar' ? 'ar-AE' : 'en-GB'

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-navy-100 bg-white/90 px-6 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-navy-900 sm:text-2xl">
          {t('headerTitle')}
        </h1>
        <p className="text-sm text-navy-400">{t('headerDept')}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Language toggle */}
        <div className="flex gap-1 rounded-lg border border-navy-200 p-0.5">
          {['en', 'ar'].map((lang) => (
            <button
              key={lang}
              onClick={() => changeLanguage(lang)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                language === lang
                  ? 'bg-navy-900 text-white'
                  : 'text-navy-500 hover:text-navy-800'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white px-3 py-2 shadow-card">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-sm font-semibold text-white">
            ER
          </span>
          <div className="leading-tight">
            <p className="text-sm font-medium text-navy-900">{t('headerEmployee')}</p>
            <p className="flex items-center gap-1 text-xs text-navy-400">
              <Icon name="schedule" className="text-[14px]" />
              {formatNow(now, locale)}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
