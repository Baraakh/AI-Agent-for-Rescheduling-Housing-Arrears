import { useLanguage } from '../contexts/LanguageContext'

export default function StatusBadge({ status, className = '' }) {
  const { t } = useLanguage()

  const STATUS_STYLES = [
    {
      match: (s) => /approved/i.test(s),
      label: t('statusApproved'),
      classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      dot: 'bg-emerald-500',
    },
    {
      match: (s) => /needs human review|needs review/i.test(s),
      label: t('statusNeedsReviewBadge'),
      classes: 'bg-amber-50 text-amber-700 ring-amber-600/20',
      dot: 'bg-amber-500',
    },
    {
      match: (s) => /pending document/i.test(s),
      label: t('statusPendingDocuments'),
      classes: 'bg-sky-50 text-sky-700 ring-sky-600/20',
      dot: 'bg-sky-500',
    },
    {
      match: (s) => /salary mismatch/i.test(s),
      label: t('statusSalaryMismatch'),
      classes: 'bg-orange-50 text-orange-700 ring-orange-600/20',
      dot: 'bg-orange-500',
    },
    {
      match: (s) => /medical/i.test(s),
      label: t('statusMedicalReview'),
      classes: 'bg-violet-50 text-violet-700 ring-violet-600/20',
      dot: 'bg-violet-500',
    },
    {
      match: (s) => /incomplete/i.test(s),
      label: t('statusIncompleteBadge'),
      classes: 'bg-slate-100 text-slate-600 ring-slate-500/20',
      dot: 'bg-slate-400',
    },
    {
      match: (s) => /rejected|not eligible/i.test(s),
      label: t('statusRejected'),
      classes: 'bg-rose-50 text-rose-700 ring-rose-600/20',
      dot: 'bg-rose-500',
    },
  ]

  const FALLBACK = {
    label: status,
    classes: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    dot: 'bg-slate-400',
  }

  if (!status) return null
  const style = STATUS_STYLES.find((s) => s.match(status)) || FALLBACK

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${style.classes} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  )
}
