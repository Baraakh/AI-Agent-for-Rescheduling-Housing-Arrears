import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useApplication } from '../contexts/ApplicationContext'
import { useLanguage } from '../contexts/LanguageContext'
import Icon from '../components/Icon'
import { UAE_PASS_PERSONAS } from '../data/uaePassData'

export default function Login() {
  const navigate = useNavigate()
  const { isAuthenticated, loginWithUAEPass } = useAuth()
  const { resetApplicationState } = useApplication()
  const { language, t } = useLanguage()
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  const handlePersonaSelect = (personaId) => {
    resetApplicationState()
    loginWithUAEPass(personaId)
    navigate('/profile')
  }

  if (!selecting) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-10">
          <div className="w-full max-w-md space-y-8">
            <div className="rounded-3xl border-2 border-gold-300 bg-white p-10 shadow-lg">
              <div className="space-y-8">
                <div className="flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-ink-900">
                    <Icon name="fingerprint" className="!text-5xl text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-ink-900">
                    {t('signWithUAEPass')}
                  </h1>
                </div>
                <div className="text-center">
                  <p className="text-sm leading-relaxed text-ink-600">
                    {t('uaePassTrustedIdentity')}
                  </p>
                </div>
                <button
                  onClick={() => setSelecting(true)}
                  className="w-full rounded-xl bg-ink-900 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-ink-800 flex items-center justify-center gap-2"
                >
                  <Icon name="fingerprint" className="!text-base" />
                  {t('signWithUAEPass')}
                </button>
                <div className="text-center">
                  <p className="text-xs leading-relaxed text-ink-500">
                    {t('demoEnvPersonaHint')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-10">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-900">
              <Icon name="fingerprint" className="!text-4xl text-white" />
            </div>
            <h1 className="text-2xl font-bold text-ink-900">{t('uaePassDemoMode')}</h1>
            <p className="mt-2 text-sm text-ink-500">{t('selectApplicantSimulate')}</p>
          </div>

          <div className="grid gap-3">
            {UAE_PASS_PERSONAS.map((persona) => (
              <button
                key={persona.id}
                onClick={() => handlePersonaSelect(persona.id)}
                className="flex items-center gap-4 rounded-2xl border-2 border-ink-100 bg-white p-5 text-left transition-all hover:border-gold-300 hover:bg-gold-50/50 hover:shadow-md"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-600">
                  <Icon name="person" className="!text-2xl" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-900">{persona.fullNameEn}</p>
                  <p className="text-sm text-ink-500 mt-0.5">{persona.caseLabel} · {persona.address.emirate}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{persona.emiratesId}</p>
                </div>
                <Icon name={language === 'ar' ? 'arrow_back' : 'arrow_forward'} className="text-ink-300 shrink-0" />
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-ink-400">
            {t('liveDeploymentNote')}
          </p>

          <div className="text-center">
            <button
              onClick={() => setSelecting(false)}
              className="text-sm text-ink-500 underline hover:text-ink-700"
            >
              {t('back')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
