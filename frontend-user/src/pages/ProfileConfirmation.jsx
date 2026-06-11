import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Breadcrumbs from '../components/Breadcrumbs'
import SideNav from '../components/SideNav'
import Button from '../components/Button'
import Icon from '../components/Icon'

export default function ProfileConfirmation() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, language } = useLanguage()

  const handleContinue = () => {
    localStorage.setItem('maxReachedStep', '2')
    navigate('/loan-details')
  }

  const dob = user?.dateOfBirth
    ? new Date(user.dateOfBirth).toLocaleDateString(language === 'ar' ? 'ar-AE' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div>
      <section className="bg-gradient-to-r from-gold-700 to-gold-600 text-white">
        <div className="mx-auto max-w-[1440px] px-6 pb-8 pt-6 lg:px-10">
          <Breadcrumbs
            dark
            trail={[
              { label: t('breadcrumbHousing'), to: '/' },
              { label: t('breadcrumbArrears'), to: '/' },
              { label: t('breadcrumbConfirmIdentity') },
            ]}
          />
          <h1 className="mt-6 text-2xl font-bold sm:text-3xl">{t('identityVerification')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
            {t('identityVerificationDesc')}
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:flex-row lg:px-10">
        <SideNav />

        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
            <Icon name="verified_user" className="text-green-600 !text-base" filled />
            {t('identityVerifiedUAEPass')}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Personal info */}
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
                <Icon name="badge" className="text-gold-600 !text-lg" />
                {t('personalInformation')}
              </h3>
              <dl className="space-y-3">
                {[
                  { label: t('fullName'), value: user?.fullNameEn },
                  { label: t('fullNameArabic'), value: user?.fullNameAr },
                  { label: t('emiratesIdLabel'), value: user?.emiratesId },
                  { label: t('dateOfBirth'), value: dob },
                  { label: t('nationality'), value: user?.nationality },
                  { label: t('gender'), value: user?.gender },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between border-b border-dashed border-ink-100 pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-sm text-ink-500">{label}</dt>
                    <dd className="text-sm font-semibold text-ink-900 text-right">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <div className="space-y-6">
              {/* Family info */}
              <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
                  <Icon name="family_restroom" className="text-gold-600 !text-lg" />
                  {t('familyInformation')}
                </h3>
                <dl className="space-y-3">
                  {[
                    { label: t('maritalStatus'), value: user?.maritalStatus },
                    {
                      label: t('householdSizeLabel'),
                      value: user?.householdSize ? `${user.householdSize} ${t('members')}` : '—',
                    },
                    {
                      label: t('dependants'),
                      value: user?.dependents != null ? String(user.dependents) : '—',
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between border-b border-dashed border-ink-100 pb-3 last:border-0 last:pb-0"
                    >
                      <dt className="text-sm text-ink-500">{label}</dt>
                      <dd className="text-sm font-semibold text-ink-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Contact & employment */}
              <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
                  <Icon name="work" className="text-gold-600 !text-lg" />
                  {t('contactEmployment')}
                </h3>
                <dl className="space-y-3">
                  {[
                    { label: t('mobile'), value: user?.mobile },
                    { label: t('emailLabel'), value: user?.email },
                    { label: t('employerLabel'), value: user?.employer },
                    { label: t('emirate'), value: user?.address?.emirate },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between border-b border-dashed border-ink-100 pb-3 last:border-0 last:pb-0"
                    >
                      <dt className="text-sm text-ink-500">{label}</dt>
                      <dd className="text-sm font-semibold text-ink-900">{value || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          </div>

          <div className="rounded-xl border border-gold-200 bg-gold-50 p-4 text-sm text-gold-900">
            <p>{t('moeiContactNote')}</p>
          </div>

          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              as="link"
              to="/login"
              variant="secondary"
              icon={<Icon name={language === 'ar' ? 'arrow_forward' : 'arrow_back'} className="!text-base" />}
            >
              {t('backToLogin')}
            </Button>
            <Button
              onClick={handleContinue}
              variant="primary"
              icon={<Icon name={language === 'ar' ? 'arrow_back' : 'arrow_forward'} className="!text-base" />}
              iconPosition="right"
            >
              {t('confirmContinue')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
