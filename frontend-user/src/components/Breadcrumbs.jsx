import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function Breadcrumbs({ trail = [], dark = false }) {
  const sep = (
    <Icon
      name="chevron_right"
      className={`!text-base ${dark ? 'text-white/50' : 'text-ink-400'}`}
    />
  )

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">
      <Link to="/" className={`font-medium ${dark ? 'text-white/80 hover:text-white' : 'text-ink-500 hover:text-gold-600'}`}>
        Home
      </Link>
      {trail.map((item, i) => {
        const isLast = i === trail.length - 1
        return (
          <span key={item.label} className="flex items-center gap-2">
            {sep}
            {item.to && !isLast ? (
              <Link to={item.to} className={`font-medium ${dark ? 'text-white/80 hover:text-white' : 'text-ink-500 hover:text-gold-600'}`}>
                {item.label}
              </Link>
            ) : (
              <span className={`font-semibold ${dark ? 'text-white' : 'text-ink-900'}`}>{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
