import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Icon from './Icon'
import Button from './Button'

const navLinks = [
  { label: 'home', to: '/' },
  { label: 'services', to: '/' },
  { label: 'mediaCenter', to: '/' },
  { label: 'knowledgeCenter', to: '/' },
  { label: 'digitalParticipation', to: '/' },
  { label: 'openData', to: '/' },
]

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const { language, changeLanguage, t } = useLanguage()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const languageDropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setLanguageDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    setDropdownOpen(false)
    navigate('/login')
  }

  const handleLogin = () => {
    setDropdownOpen(false)
    navigate('/login')
  }

  const handleProfileClick = () => {
    // TODO: Navigate to profile page
    console.log('Profile clicked')
    setDropdownOpen(false)
  }

  const handleSettingsClick = () => {
    // TODO: Navigate to settings page
    console.log('Settings clicked')
    setDropdownOpen(false)
  }

  const handleLanguageChange = (lang) => {
    changeLanguage(lang)
    setLanguageDropdownOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* top gold accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-gold-300 via-gold-500 to-gold-700" />

      <div className="border-b border-ink-100">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-6 py-3 lg:px-10">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-600 font-bold text-white">M</span>
            <span className="text-lg font-bold tracking-wide text-ink-900">MOEI</span>
          </Link>

          {/* Search - moved after logo */}
          <div className="hidden items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-sm text-ink-600 md:flex">
            <Icon name="search" className="text-base text-ink-400" />
            <input
              type="text"
              placeholder={t('search')}
              className="w-36 bg-transparent text-sm text-ink-700 placeholder:text-ink-400 focus:outline-none lg:w-48"
            />
          </div>

          {/* Navigation menu */}
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-700 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`transition-colors hover:text-gold-600 ${
                  location.pathname === link.to && link.label === 'home' ? 'text-gold-600' : ''
                }`}
              >
                {t(link.label)}
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Language Dropdown */}
            <div className="relative" ref={languageDropdownRef}>
              <button
                type="button"
                aria-label="Language"
                onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-600 hover:border-gold-400 hover:text-gold-600 transition-colors"
              >
                <Icon name="language" />
              </button>

              {/* Language Dropdown Menu */}
              {languageDropdownOpen && (
                <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-40 rounded-xl border border-ink-100 bg-white shadow-lg z-50 overflow-hidden">
                  <div className="py-1">
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                        language === 'en' ? 'bg-gold-50 text-gold-700 font-medium' : 'text-ink-700 hover:bg-ink-50'
                      }`}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold">
                        {language === 'en' ? '✓' : ''}
                      </span>
                      English
                    </button>
                    <button
                      onClick={() => handleLanguageChange('ar')}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors ${
                        language === 'ar' ? 'bg-gold-50 text-gold-700 font-medium' : 'text-ink-700 hover:bg-ink-50'
                      }`}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold">
                        {language === 'ar' ? '✓' : ''}
                      </span>
                      العربية
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  aria-label="Account"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-600 hover:border-gold-400 hover:text-gold-600 transition-colors"
                >
                  <Icon name="account_circle" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-56 rounded-xl border border-ink-100 bg-white shadow-lg z-50 overflow-hidden">
                    {/* User Info */}
                    <div className="border-b border-ink-100 px-4 py-3">
                      <p className="text-xs font-semibold text-ink-400 uppercase">{t('account')}</p>
                      <p className="mt-1 text-sm font-semibold text-ink-900 truncate">{user?.name}</p>
                      <p className="text-xs text-ink-500 truncate">{user?.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={handleProfileClick}
                        className="w-full px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50 flex items-center gap-2 transition-colors"
                      >
                        <Icon name="person" className="!text-base text-gold-600 shrink-0" />
                        <span>{t('profile')}</span>
                      </button>
                      <button
                        onClick={handleSettingsClick}
                        className="w-full px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50 flex items-center gap-2 transition-colors"
                      >
                        <Icon name="settings" className="!text-base text-gold-600 shrink-0" />
                        <span>{t('settings')}</span>
                      </button>
                    </div>

                    {/* Logout Button */}
                    <div className="border-t border-ink-100 px-4 py-2">
                      <button
                        onClick={handleLogout}
                        className="w-full rounded-lg bg-red-50 py-2 text-sm font-medium text-red-600 hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Icon name="logout" className="!text-base" />
                        {t('logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  aria-label="Account"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-600 hover:border-gold-400 hover:text-gold-600 transition-colors"
                >
                  <Icon name="account_circle" />
                </button>

                {/* Login Dropdown */}
                {dropdownOpen && (
                  <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-56 rounded-xl border border-ink-100 bg-white shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-ink-100">
                      <p className="text-sm font-semibold text-ink-900">{t('notLoggedIn')}</p>
                      <p className="text-xs text-ink-500 mt-1">{t('signInAccess')}</p>
                    </div>

                    <div className="px-4 py-3">
                      <button
                        onClick={handleLogin}
                        className="w-full rounded-lg bg-gold-600 py-2.5 text-sm font-medium text-white hover:bg-gold-700 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Icon name="login" className="!text-base" />
                        {t('login')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
