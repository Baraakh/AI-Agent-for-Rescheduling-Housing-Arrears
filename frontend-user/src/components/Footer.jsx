import { Link } from 'react-router-dom'
import Icon from './Icon'

const columns = [
  {
    title: 'About MOEI',
    links: ['Vision & Mission', 'Leadership', 'Strategic Goals', 'Organization Chart'],
  },
  {
    title: 'Information & Support',
    links: ['Privacy Policy', 'Terms & Conditions', 'Accessibility', 'Service Standards'],
  },
  {
    title: 'Quick Links',
    links: ['Career Opportunities', 'Tenders & Auctions', 'E-Participation', 'Knowledge Base'],
  },
]

export default function Footer() {
  return (
    <>
      {/* Feedback band */}
      <div className="border-t border-ink-100 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-4 px-6 py-6 text-sm text-ink-600 sm:flex-row sm:justify-between lg:px-10">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-wide text-gold-700">MOEI</span>
            <span className="hidden h-5 w-px bg-ink-200 sm:block" />
            <span>Was this page helpful?</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-1.5 font-medium text-ink-700 transition-colors hover:border-gold-400 hover:text-gold-600"
            >
              <Icon name="thumb_up" className="text-base" /> Yes
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-ink-200 px-4 py-1.5 font-medium text-ink-700 transition-colors hover:border-gold-400 hover:text-gold-600"
            >
              <Icon name="thumb_down" className="text-base" /> No
            </button>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <footer className="bg-ink-900 text-ink-200">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
          <div className="space-y-4">
            <span className="text-xl font-bold tracking-wide text-white">MOEI</span>
            <p className="max-w-xs text-sm leading-relaxed text-ink-400">
              Ministry of Energy &amp; Infrastructure. Shaping the future of the UAE&apos;s energy and
              infrastructure landscape through sustainable innovation.
            </p>
            <div className="flex gap-3 pt-1">
              {['facebook', 'alternate_email', 'group', 'play_circle'].map((icon) => (
                <a
                  key={icon}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-full border border-ink-700 text-ink-300 transition-colors hover:border-gold-400 hover:text-gold-400"
                  aria-label={icon}
                >
                  <Icon name={icon} className="text-base" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white">{col.title}</h3>
              <ul className="space-y-2.5 text-sm text-ink-400">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="transition-colors hover:text-gold-400">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-ink-700">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-ink-400 sm:flex-row lg:px-10">
            <p>© 2024 Ministry of Energy &amp; Infrastructure. All rights reserved.</p>
            <div className="flex gap-5">
              <Link to="#" className="hover:text-gold-400">Privacy Policy</Link>
              <Link to="#" className="hover:text-gold-400">Terms of Service</Link>
              <Link to="#" className="hover:text-gold-400">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
