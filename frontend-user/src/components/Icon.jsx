// Wrapper around Material Symbols Outlined font icons (loaded via Google Fonts in index.css)
export default function Icon({ name, className = '', filled = false, style = {} }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`, ...style }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
