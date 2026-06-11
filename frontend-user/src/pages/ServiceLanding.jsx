import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import Breadcrumbs from '../components/Breadcrumbs'
import SideNav from '../components/SideNav'
import Button from '../components/Button'
import Icon from '../components/Icon'
import skyline from '../assets/skyline.jpg'
import buildings from '../assets/buildings-1.jpg'

export default function ServiceLanding() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { t } = useLanguage()

  const facts = [
    { label: t('estimatedTime'), value: t('estimatedTimeValue'), icon: 'schedule' },
    { label: t('serviceFee'), value: t('serviceFeeValue'), icon: 'payments' },
    { label: t('targetGroup'), value: t('targetGroupValue'), icon: 'group' },
  ]

  const eligibilityLeft = [
    t('eligibility1'),
    t('eligibility2'),
    t('eligibility3'),
  ]

  const eligibilityRight = [
    t('eligibility4'),
    t('eligibility5'),
    t('eligibility6'),
  ]

  const handleStartService = () => {
    if (!isAuthenticated) {
      navigate('/login')
    } else {
      localStorage.setItem('maxReachedStep', '1')
      navigate('/profile')
    }
  }

  return (
    <div>
      {/* Gold hero banner */}
      <section className="relative overflow-hidden bg-ink-900">
        <img src={skyline} alt="Dubai skyline at dusk" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/80 to-gold-900/40" />
        <div className="relative mx-auto max-w-[1440px] px-6 pb-12 pt-6 lg:px-10">
          <Breadcrumbs dark trail={[{ label: t('breadcrumbHousing'), to: '/' }, { label: t('housingArrearsRescheduling') }]} />
          <div className="mt-10 max-w-2xl pb-4">
            <p className="mb-3 inline-block rounded-full bg-gold-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-200">
              {t('digitalService')}
            </p>
            <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {t('housingArrearsRescheduling')}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/80">
              {t('serviceDesc1')}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:flex-row lg:px-10">
        {/* Side navigation (25%) */}
        <SideNav />

        {/* Article - main workspace (75%) */}
        <article className="flex-1 space-y-8">
          {/* Service visual header */}
          <div className="relative overflow-hidden rounded-2xl">
            <img src={buildings} alt="Modern UAE residential towers" className="h-56 w-full object-cover sm:h-72" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gold-300">{t('digitalService')}</p>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">{t('serviceGuidelines')}</h2>
            </div>
          </div>

          {/* Description card */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
            <h3 className="mb-3 text-lg font-semibold text-ink-900">{t('serviceDescription')}</h3>
            <p className="leading-relaxed text-ink-600">
              {t('serviceDesc2')}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
                  <Icon name={fact.icon} className="mb-2 text-gold-600" />
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{fact.label}</p>
                  <p className="mt-1 text-base font-semibold text-ink-900">{fact.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Eligibility */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
            <h3 className="mb-4 text-lg font-semibold text-ink-900">{t('eligibilityCriteria')}</h3>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {[...eligibilityLeft, ...eligibilityRight].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold-100 text-gold-700">
                    <Icon name="check" className="!text-base" />
                  </span>
                  <p className="text-sm leading-relaxed text-ink-600">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-gradient-to-r from-gold-700 to-gold-600 p-6 text-white shadow-soft sm:flex-row sm:items-center sm:p-8">
            <div>
              <h4 className="text-lg font-semibold">{t('readyToStart')}</h4>
              <p className="mt-1 text-sm text-white/80">{t('ensureDocuments')}</p>
            </div>
            <Button variant="secondary" className="!border-white/30 !bg-white !text-gold-700 hover:!bg-gold-50" icon={<Icon name="arrow_forward" className="!text-base" />} iconPosition="right" onClick={handleStartService}>
              {t('startService')}
            </Button>
          </section>
        </article>
      </div>
    </div>
  )
}
