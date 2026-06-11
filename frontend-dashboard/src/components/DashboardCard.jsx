// Generic card shell used across the dashboard for grouping content with a
// consistent header / padding / shadow treatment.
export default function DashboardCard({ title, subtitle, action, className = '', bodyClassName = '', children }) {
  return (
    <section className={`rounded-2xl border border-navy-100 bg-white shadow-card ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-navy-50 px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-navy-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-navy-400">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={`px-5 py-4 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
