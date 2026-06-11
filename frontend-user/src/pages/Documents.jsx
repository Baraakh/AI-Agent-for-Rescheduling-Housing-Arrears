import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApplication } from '../contexts/ApplicationContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import Breadcrumbs from '../components/Breadcrumbs'
import SideNav from '../components/SideNav'
import Button from '../components/Button'
import Icon from '../components/Icon'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_FORMATS = ['application/pdf', 'image/jpeg', 'image/png']

export default function Documents() {
  const navigate = useNavigate()
  const { hardshipType, setHardshipType, remarks, setRemarks, uploaded, setUploaded } =
    useApplication()
  const { t, language } = useLanguage()
  const { user } = useAuth()

  const addMandateSigned = user?.addMandateSigned ?? false

  const HARDSHIP_OPTIONS = [
    { value: 'medical', label: t('hardshipMedicalLong'), icon: 'health_and_safety' },
    { value: 'income_reduction', label: t('hardshipIncomeReductionLong'), icon: 'trending_down' },
    { value: 'abroad', label: t('hardshipAbroadLong'), icon: 'flight' },
    { value: 'bereavement', label: t('hardshipBereavementLong'), icon: 'sentiment_sad' },
    { value: 'unemployment', label: t('hardshipUnemployment'), icon: 'work_off' },
    { value: 'other', label: t('hardshipOther'), icon: 'help_outline' },
  ]

  const DOC_TILES = [
    {
      key: 'salary',
      title: t('docSalaryCertificate'),
      icon: 'request_quote',
      description: t('docSalaryCertificateFullDesc'),
      required: true,
    },
    {
      key: 'bank',
      title: t('docBankStatement'),
      icon: 'account_balance',
      description: t('docBankStatementFullDesc'),
      required: false,
    },
    {
      key: 'medical',
      title: t('docMedicalReport'),
      icon: 'medical_information',
      description: t('docMedicalReportFullDesc'),
      required: false,
    },
    {
      key: 'hardship_letter',
      title: t('docHardshipLetter'),
      icon: 'description',
      description: t('docHardshipLetterFullDesc'),
      required: false,
    },
    {
      key: 'passport',
      title: t('docPassport'),
      icon: 'travel_explore',
      description: t('docPassportFullDesc'),
      required: false,
    },
  ]

  const [error, setError] = useState('')
  const fileInputRefs = useRef({})

  const handleFileClick = (key) => fileInputRefs.current[key]?.click()

  const handleFileChange = (key, event) => {
    const file = event.target.files?.[0]
    setError('')
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setError(`${t('fileTooLarge')} ${file.name}`)
      return
    }
    if (!ALLOWED_FORMATS.includes(file.type)) {
      setError(`${file.name} — ${t('unsupportedFormat')}`)
      return
    }
    setUploaded((prev) => ({ ...prev, [key]: { name: file.name, file } }))
  }

  const handleContinue = () => {
    if (!addMandateSigned) {
      setError(t('docAddMandateBlockedDesc'))
      return
    }
    if (!hardshipType) {
      setError(t('selectReasonError'))
      return
    }
    const missingRequired = DOC_TILES.filter((doc) => doc.required && !uploaded[doc.key]).map(
      (doc) => doc.title,
    )
    if (missingRequired.length > 0) {
      setError(`${t('pleaseUpload')} ${missingRequired.join(', ')}`)
      return
    }
    setError('')
    localStorage.setItem('maxReachedStep', '4')
    navigate('/review')
  }

  return (
    <div>
      <section className="bg-gradient-to-r from-gold-700 to-gold-600 text-white">
        <div className="mx-auto max-w-[1440px] px-6 pb-8 pt-6 lg:px-10">
          <Breadcrumbs
            dark
            trail={[
              { label: t('breadcrumbHousing'), to: '/' },
              { label: t('breadcrumbArrears'), to: '/' },
              { label: t('breadcrumbDocumentsHardship') },
            ]}
          />
          <h1 className="mt-6 text-2xl font-bold sm:text-3xl">{t('documentsHardshipTitle')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
            {t('documentsHardshipDesc')}
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:flex-row lg:px-10">
        <SideNav />

        <div className="flex-1 space-y-8">
          {/* Verification badges */}
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
              <Icon name="verified_user" className="text-green-600 !text-base" filled />
              {t('identityVerifiedUAEPass')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
              <Icon name="account_balance" className="text-green-600 !text-base" />
              {t('loanDataRetrieved')}
            </span>
          </div>

          {/* Section A: Hardship */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-lg font-semibold text-ink-900">{t('reasonForRescheduling')}</h2>
            <p className="mt-1 text-sm text-ink-500">
              {t('selectMainReason')}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {HARDSHIP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setHardshipType(opt.value)
                    setError('')
                  }}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    hardshipType === opt.value
                      ? 'border-gold-400 bg-gold-50 text-gold-900'
                      : 'border-ink-100 bg-white text-ink-700 hover:border-ink-200 hover:bg-ink-50'
                  }`}
                >
                  <Icon
                    name={opt.icon}
                    className={`!text-xl shrink-0 ${
                      hardshipType === opt.value ? 'text-gold-600' : 'text-ink-400'
                    }`}
                  />
                  <span className="text-sm font-medium leading-snug">{opt.label}</span>
                  {hardshipType === opt.value && (
                    <Icon
                      name="check_circle"
                      className="ml-auto text-gold-600 !text-lg shrink-0"
                      filled
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium text-ink-700 mb-2">
                {t('additionalDetails')} <span className="text-ink-400 font-normal">({t('optional')})</span>
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={t('provideAdditionalContext')}
                maxLength={500}
                rows={3}
                className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-100 resize-none"
              />
              <p className="mt-1 text-right text-xs text-ink-400">{remarks.length}/500</p>
            </div>
          </section>

          {/* Section B: Document upload */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-lg font-semibold text-ink-900">{t('uploadDocuments')}</h2>
            <p className="mt-1 text-sm text-ink-500">
              {t('maxFileSizeFormats')}
            </p>

            <div className="mt-6 space-y-6">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">
                  {t('requiredDocuments')}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {DOC_TILES.filter((doc) => doc.required).map((tile) => (
                    <UploadTile
                      key={tile.key}
                      tile={tile}
                      uploaded={uploaded}
                      onFileClick={handleFileClick}
                      onFileChange={handleFileChange}
                      fileInputRefs={fileInputRefs}
                      t={t}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">
                  {t('optionalSupportingDocuments')}
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {DOC_TILES.filter((doc) => !doc.required).map((tile) => (
                    <UploadTile
                      key={tile.key}
                      tile={tile}
                      uploaded={uploaded}
                      onFileClick={handleFileClick}
                      onFileChange={handleFileChange}
                      fileInputRefs={fileInputRefs}
                      t={t}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">
                  {t('autoGeneratedDocuments')}
                </p>
                <div className={`flex flex-col rounded-xl border-2 p-5 transition-all ${
                  addMandateSigned ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/40'
                }`}>
                  <div className="flex items-start justify-between">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${
                      addMandateSigned ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      <Icon
                        name={addMandateSigned ? 'check_circle' : 'cancel'}
                        className="!text-xl"
                        filled
                      />
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      addMandateSigned ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {addMandateSigned ? t('docAddMandateActive') : t('docAddMandateNotSigned')}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-ink-900">{t('docAddMandate')}</h3>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-500">
                    {addMandateSigned ? t('docAddMandateFullDesc') : t('docAddMandateBlockedDesc')}
                  </p>
                  {!addMandateSigned && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2.5">
                      <Icon name="info" className="text-red-600 !text-sm shrink-0" />
                      <p className="text-xs font-medium text-red-800">
                        {language === 'ar'
                          ? 'لا يمكن المتابعة بدون تفويض الخصم المباشر'
                          : 'Cannot proceed without ADD mandate registration'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <Icon name="error" className="mt-0.5 text-red-600 shrink-0" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              as="link"
              to="/loan-details"
              variant="secondary"
              icon={<Icon name={language === 'ar' ? 'arrow_forward' : 'arrow_back'} className="!text-base" />}
            >
              {t('backToLoanDetails')}
            </Button>
            <Button
              onClick={handleContinue}
              variant="primary"
              icon={<Icon name={language === 'ar' ? 'arrow_back' : 'arrow_forward'} className="!text-base" />}
              iconPosition="right"
            >
              {t('reviewAndSubmit')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UploadTile({ tile, uploaded, onFileClick, onFileChange, fileInputRefs, t }) {
  const done = !!uploaded[tile.key]
  const fileData = uploaded[tile.key]
  return (
    <div
      className={`flex flex-col rounded-xl border-2 p-5 transition-all ${
        done ? 'border-green-200 bg-green-50/50' : 'border-ink-100 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${
            done ? 'bg-green-100 text-green-700' : 'bg-gold-100 text-gold-700'
          }`}
        >
          <Icon name={done ? 'check_circle' : tile.icon} className="!text-xl" filled={done} />
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            tile.required ? 'bg-red-50 text-red-700' : 'bg-ink-100 text-ink-500'
          }`}
        >
          {tile.required ? t('required') : t('optional')}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink-900">{tile.title}</h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-ink-500">{tile.description}</p>
      {done && (
        <p className="mt-2 text-xs text-green-700 truncate" title={fileData?.name}>
          📎 {fileData?.name}
        </p>
      )}
      <button
        onClick={() => onFileClick(tile.key)}
        className={`mt-4 w-full rounded-lg py-2 text-sm font-semibold transition-colors ${
          done
            ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
            : 'bg-ink-900 text-white hover:bg-ink-800'
        }`}
      >
        {done ? t('replaceFile') : t('upload')}
      </button>
      <input
        ref={(el) => (fileInputRefs.current[tile.key] = el)}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => onFileChange(tile.key, e)}
        className="hidden"
        aria-label={`Upload ${tile.title}`}
      />
    </div>
  )
}
