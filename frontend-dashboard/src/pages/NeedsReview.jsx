import { useLanguage } from '../contexts/LanguageContext'
import ApplicationsExplorer from '../components/ApplicationsExplorer'

const needsReview = (status) =>
  status === 'needs_human_review' || status === 'human_review' || status === 'escalated_p5'

export default function NeedsReview() {
  const { t } = useLanguage()
  return (
    <ApplicationsExplorer
      title={t('pageNeedsReviewTitle')}
      description={t('pageNeedsReviewDesc')}
      icon="fact_check"
      baseFilter={needsReview}
      emptyHint={t('pageNeedsReviewEmpty')}
    />
  )
}
