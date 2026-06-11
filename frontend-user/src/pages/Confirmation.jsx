import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Button from '../components/Button'
import Icon from '../components/Icon'

export default function Confirmation() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, language } = useLanguage()

  const appId =
    localStorage.getItem('lastSubmittedApplicationId') || 'APP-' + new Date().getFullYear() + '-XXXXXX'

  const submittedAt = new Date().toLocaleString(language === 'ar' ? 'ar-AE' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const applicantName = language === 'ar' ? user?.fullNameAr : user?.fullNameEn

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg text-center space-y-8">
        {/* Success icon */}
        <div className="flex justify-center">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-green-100">
            <Icon name="check_circle" className="!text-6xl text-green-600" filled />
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-ink-900">{t('requestSubmittedSuccessfully')}</h1>
          <p className="text-base leading-relaxed text-ink-600">
            {t('applicationReceivedDesc')}
          </p>
        </div>

        {/* Reference card */}
        <div className="rounded-2xl border border-ink-100 bg-ink-50 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">{t('referenceNumber')}</p>
            <p className="text-sm font-bold text-ink-900 font-mono">{appId}</p>
          </div>
          <div className="flex items-center justify-between border-t border-dashed border-ink-200 pt-3">
            <p className="text-sm text-ink-500">{t('submittedOn')}</p>
            <p className="text-sm font-semibold text-ink-900">{submittedAt}</p>
          </div>
          {applicantName && (
            <div className="flex items-center justify-between border-t border-dashed border-ink-200 pt-3">
              <p className="text-sm text-ink-500">{t('applicantLabel')}</p>
              <p className="text-sm font-semibold text-ink-900">{applicantName}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gold-200 bg-gold-50 p-4 text-sm text-gold-900 text-left">
          <p className="font-semibold mb-1">{t('whatHappensNext')}</p>
          <p className="leading-relaxed">
            {t('applicationUnderReviewDesc')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => navigate('/my-applications')}
            variant="primary"
            icon={<Icon name="folder_open" className="!text-base" />}
          >
            {t('viewMyApplications')}
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="secondary"
            icon={<Icon name="home" className="!text-base" />}
          >
            {t('returnHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}
