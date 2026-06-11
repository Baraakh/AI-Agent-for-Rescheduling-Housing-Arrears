// Thin wrapper around the self-hosted Material Symbols Outlined icon font.
// Usage: <Icon name="dashboard" /> or <Icon name="dashboard" filled className="text-lg" />
export default function Icon({ name, filled = false, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined select-none leading-none ${className}`}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
