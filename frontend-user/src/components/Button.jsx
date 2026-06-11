import { Link } from 'react-router-dom'

const variants = {
  primary:
    'bg-gold-600 text-white shadow-soft hover:bg-gold-700 focus-visible:ring-gold-300',
  secondary:
    'border border-ink-200 bg-white text-ink-700 hover:border-gold-400 hover:text-gold-700 focus-visible:ring-gold-200',
  ghost:
    'text-ink-600 hover:text-gold-700 focus-visible:ring-gold-200',
}

export default function Button({
  as = 'button',
  to,
  variant = 'primary',
  icon = null,
  iconPosition = 'left',
  className = '',
  children,
  ...props
}) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${variants[variant]} ${className}`

  const content = (
    <>
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </>
  )

  if (as === 'link' && to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={classes} {...props}>
      {content}
    </button>
  )
}
