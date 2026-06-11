import { useLanguage } from '../contexts/LanguageContext'
import ApplicationsExplorer from '../components/ApplicationsExplorer'

const isApproved = (status) => /approved/i.test(status)

export default function ApprovedCases() {
  const { t } = useLanguage()
  return (
    <ApplicationsExplorer
      title={t('pageApprovedTitle')}
      description={t('pageApprovedDesc')}
      icon="verified"
      baseFilter={isApproved}
      emptyHint={t('pageApprovedEmpty')}
    />
  )
}
