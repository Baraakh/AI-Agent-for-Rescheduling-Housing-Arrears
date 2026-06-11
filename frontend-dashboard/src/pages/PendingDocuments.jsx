import { useLanguage } from '../contexts/LanguageContext'
import ApplicationsExplorer from '../components/ApplicationsExplorer'

const pendingDocuments = (status) => status === 'pending_documents'

export default function PendingDocuments() {
  const { t } = useLanguage()
  return (
    <ApplicationsExplorer
      title={t('pagePendingDocsTitle')}
      description={t('pagePendingDocsDesc')}
      icon="upload_file"
      baseFilter={pendingDocuments}
      emptyHint={t('pagePendingDocsEmpty')}
    />
  )
}
