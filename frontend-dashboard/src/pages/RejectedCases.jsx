import { useLanguage } from '../contexts/LanguageContext'
import ApplicationsExplorer from '../components/ApplicationsExplorer'

const isRejected = (status) => /rejected|not eligible/i.test(status)

export default function RejectedCases() {
  const { t } = useLanguage()
  return (
    <ApplicationsExplorer
      title={t('pageRejectedTitle')}
      description={t('pageRejectedDesc')}
      icon="block"
      baseFilter={isRejected}
      emptyHint={t('pageRejectedEmpty')}
    />
  )
}
