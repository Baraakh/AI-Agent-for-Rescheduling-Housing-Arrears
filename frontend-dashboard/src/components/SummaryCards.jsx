import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import Icon from './Icon'

function computeSummary(applications) {
  const total = applications.length
  const approved = applications.filter(
    (a) => a.status === 'approved_automatically' || a.status === 'approved' || a.status === 'completed'
  ).length
  const needsReview = applications.filter(
    (a) => a.human_review_required || a.status === 'needs_human_review' || a.status === 'human_review'
  ).length
  const pendingDocs = applications.filter(
    (a) => a.status === 'pending_documents'
  ).length
  const rejected = applications.filter(
    (a) => a.status === 'rejected'
  ).length
  const avgConfidence = total
    ? Math.round(applications.reduce((sum, a) => sum + (a.confidence_score || 0), 0) / total)
    : 0

  return { total, approved, needsReview, pendingDocs, rejected, avgConfidence }
}

export default function SummaryCards({ applications }) {
  const { t } = useLanguage()
  const summary = computeSummary(applications)

  const CARD_DEFS = [
    {
      key: 'total',
      label: t('totalApplications'),
      icon: 'folder_open',
      accent: 'bg-navy-50 text-navy-600',
      hint: t('totalApplicationsHint'),
      to: '/applications',
    },
    {
      key: 'approved',
      label: t('approvedAutomatically'),
      icon: 'verified',
      accent: 'bg-emerald-50 text-emerald-600',
      hint: t('approvedAutomaticallyHint'),
      to: '/approved',
    },
    {
      key: 'needsReview',
      label: t('needsHumanReview'),
      icon: 'fact_check',
      accent: 'bg-amber-50 text-amber-600',
      hint: t('needsHumanReviewHint'),
      to: '/needs-review',
    },
    {
      key: 'pendingDocs',
      label: t('pendingDocuments'),
      icon: 'upload_file',
      accent: 'bg-sky-50 text-sky-600',
      hint: t('pendingDocumentsHint'),
      to: '/pending-documents',
    },
    {
      key: 'rejected',
      label: t('rejectedNotEligible'),
      icon: 'block',
      accent: 'bg-rose-50 text-rose-600',
      hint: t('rejectedNotEligibleHint'),
      to: '/rejected',
    },
    {
      key: 'avgConfidence',
      label: t('avgConfidenceScore'),
      icon: 'insights',
      accent: 'bg-gold-100 text-gold-700',
      hint: t('avgConfidenceScoreHint'),
      suffix: '%',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {CARD_DEFS.map((card) => {
        const isLink = !!card.to
        const CardElement = isLink ? Link : 'div'
        const elementProps = isLink ? { to: card.to } : {}

        return (
          <CardElement
            key={card.key}
            {...elementProps}
            className={`group flex items-center justify-between gap-4 rounded-2xl border border-navy-100 bg-white py-3.5 px-4 shadow-card transition-all duration-300 ${
              isLink
                ? 'hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-md cursor-pointer'
                : 'opacity-95'
            }`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ${isLink ? 'group-hover:scale-110' : ''} ${card.accent}`}>
              <Icon name={card.icon} className="text-[22px]" />
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy-800 truncate">{card.label}</p>
              <p className="mt-0.5 text-xs text-navy-400 truncate">{card.hint}</p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold tracking-tight text-navy-900">
                {summary[card.key]}
                {card.suffix || ''}
              </p>
            </div>
          </CardElement>
        )
      })}
    </div>
  )
}
