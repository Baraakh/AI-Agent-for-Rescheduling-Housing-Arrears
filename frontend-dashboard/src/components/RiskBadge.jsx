import { useLanguage } from '../contexts/LanguageContext'

export default function RiskBadge({ level, className = '' }) {
  const { t } = useLanguage()

  const RISK_STYLES = {
    low: { label: t('riskLowLabel'), classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
    medium: { label: t('riskMediumLabel'), classes: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
    high: { label: t('riskHighLabel'), classes: 'bg-rose-50 text-rose-700 ring-rose-600/20', dot: 'bg-rose-500' },
    incomplete: { label: t('riskIncompleteLabel'), classes: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },
  }

  if (!level) return null
  const key = String(level).toLowerCase()
  const style = RISK_STYLES[key] || RISK_STYLES.incomplete

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${style.classes} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}
