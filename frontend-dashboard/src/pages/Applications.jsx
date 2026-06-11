import { useLanguage } from '../contexts/LanguageContext'
import ApplicationsExplorer from '../components/ApplicationsExplorer'

export default function Applications() {
  const { t } = useLanguage()
  return (
    <ApplicationsExplorer
      title={t('pageApplicationsTitle')}
      description={t('pageApplicationsDesc')}
      icon="folder_open"
      baseFilter={null}
      emptyHint={t('pageApplicationsEmpty')}
    />
  )
}
