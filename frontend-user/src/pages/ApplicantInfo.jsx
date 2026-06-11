import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useApplication } from '../contexts/ApplicationContext'
import Breadcrumbs from '../components/Breadcrumbs'
import SideNav from '../components/SideNav'
import Button from '../components/Button'
import Icon from '../components/Icon'

export default function ApplicantInfo() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const {
    salary,
    setSalary,
    abroad,
    setAbroad,
    passportFile,
    setPassportFile,
    remarks,
    setRemarks,
    agree,
    setAgree,
  } = useApplication()
  const [errors, setErrors] = useState({})
  const passportInputRef = useRef(null)

  const wordCount = remarks.trim() ? remarks.trim().split(/\s+/).length : 0

  const validateForm = () => {
    const newErrors = {}

    // Validate salary
    if (!salary || salary <= 0) {
      newErrors.salary = t('salaryError')
    }

    // Validate remarks
    if (!remarks.trim()) {
      newErrors.remarks = t('hardshipError')
    }

    // Validate passport if abroad
    if (abroad && !passportFile) {
      newErrors.passport = t('passportError')
    }

    // Validate agreement
    if (!agree) {
      newErrors.agree = t('declarationError')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePassportClick = () => {
    passportInputRef.current?.click()
  }

  const handlePassportChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit')
        return
      }
      // Validate file type
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        alert('Please upload a PDF, JPG, or PNG file')
        return
      }
      setPassportFile(file)
    }
  }

  return (
    <div>
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-[1440px] px-6 py-4 lg:px-10">
          <Breadcrumbs trail={[{ label: t('breadcrumbHousing'), to: '/' }, { label: t('breadcrumbArrears'), to: '/' }, { label: t('breadcrumbApplicant') }]} />
        </div>
      </div>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:flex-row lg:px-10">
        <SideNav />

        <div className="flex-1 space-y-6">
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
            <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t('applicantDetails')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
              {t('applicantDesc')}
            </p>

            <form
              className="mt-8 space-y-7"
              onSubmit={(e) => {
                e.preventDefault()
                if (validateForm()) {
                  localStorage.setItem('maxReachedStep', '2')
                  navigate('/loan-summary')
                }
              }}
            >
              {/* Monthly salary */}
              <div>
                <label htmlFor="salary" className="mb-2 block text-sm font-bold text-ink-900">
                  {t('currentMonthlySalary')}
                </label>
                <div className="relative max-w-md">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-400">
                    <Icon name="payments" className="!text-lg" />
                  </span>
                  <input
                    id="salary"
                    type="number"
                    value={salary}
                    onChange={(e) => {
                      setSalary(e.target.value)
                      if (errors.salary) {
                        setErrors((prev) => ({ ...prev, salary: '' }))
                      }
                    }}
                    placeholder={t('salaryPlaceholder')}
                    className={`w-full rounded-xl border ${
                      errors.salary ? 'border-red-500' : 'border-ink-200'
                    } bg-white py-3 pl-11 pr-4 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 ${
                      errors.salary ? 'focus:border-red-500 focus:ring-red-100' : 'focus:border-gold-500 focus:ring-gold-100'
                    }`}
                  />
                </div>
                {errors.salary && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                    <Icon name="error" className="!text-sm" />
                    {errors.salary}
                  </p>
                )}
                {!errors.salary && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs italic text-ink-500">
                    <Icon name="info" className="!text-sm text-ink-400" />
                    {t('salaryInfo')}
                  </p>
                )}
              </div>

              {/* Abroad toggle */}
              <div>
                <p className="mb-2 text-sm font-bold text-ink-900">{t('residingAbroad')}</p>
                <div className="inline-flex overflow-hidden rounded-xl border border-ink-200">
                  {[
                    { label: t('residingAbroadYes'), val: true },
                    { label: t('residingAbroadNo'), val: false },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.label}
                      onClick={() => setAbroad(opt.val)}
                      className={`px-6 py-2.5 text-sm font-medium transition-colors ${
                        abroad === opt.val ? 'bg-gold-600 text-white' : 'bg-white text-ink-600 hover:bg-ink-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passport upload section - appears if abroad is true */}
              {abroad && (
                <div className={`rounded-2xl border p-6 ${
                  errors.passport ? 'border-red-300 bg-red-50' : 'border-gold-200 bg-gold-50'
                }`}>
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-bold text-ink-900">
                      {t('passportCopy')} *
                    </label>
                    <p className={`text-sm ${errors.passport ? 'text-red-700' : 'text-ink-600'}`}>
                      {t('passportUpload')}
                    </p>
                  </div>
                  
                  <div className={`rounded-xl border-2 border-dashed ${
                    errors.passport ? 'border-red-300' : 'border-gold-300'
                  } bg-white p-6`}>
                    <div className="flex flex-col items-center justify-center">
                      <Icon name="upload" className={`mb-3 ${errors.passport ? 'text-red-500' : 'text-gold-600'}`} />
                      <p className="mb-1 text-sm font-medium text-ink-900">
                        {passportFile ? passportFile.name : t('clickToUpload')}
                      </p>
                      {passportFile && (
                        <p className="text-xs text-green-600">✓ {t('submitted')}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant={passportFile ? 'secondary' : 'primary'}
                    className={`mt-4 w-full ${
                      passportFile ? '!border-green-200 !bg-green-50 !text-green-700' : ''
                    }`}
                    icon={
                      <Icon
                        name={passportFile ? 'check_circle' : 'upload'}
                        className="!text-base"
                        filled={!!passportFile}
                      />
                    }
                    onClick={handlePassportClick}
                  >
                    {passportFile ? t('submitted') : t('uploadDocument')}
                  </Button>

                  <input
                    ref={passportInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      handlePassportChange(e)
                      if (errors.passport) {
                        setErrors((prev) => ({ ...prev, passport: '' }))
                      }
                    }}
                    className="hidden"
                    aria-label="Upload passport copy"
                  />

                  <p className="mt-3 text-xs text-ink-500">
                    {t('fileFormatError').split('to upload')[0]}PDF, JPG, PNG. Max: 5MB.
                  </p>

                  {errors.passport && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-red-600">
                      <Icon name="error" className="!text-sm" />
                      {errors.passport}
                    </p>
                  )}
                </div>
              )}

              {/* Hardship remarks */}
              <div>
                <label htmlFor="remarks" className="mb-2 block text-sm font-bold text-ink-900">
                  {t('hardshipRemarks')}
                </label>
                <textarea
                  id="remarks"
                  rows={5}
                  value={remarks}
                  onChange={(e) => {
                    setRemarks(e.target.value)
                    if (errors.remarks) {
                      setErrors((prev) => ({ ...prev, remarks: '' }))
                    }
                  }}
                  placeholder={t('hardshipPlaceholder')}
                  className={`w-full resize-none rounded-xl border ${
                    errors.remarks ? 'border-red-500' : 'border-ink-200'
                  } bg-white p-4 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 ${
                    errors.remarks ? 'focus:border-red-500 focus:ring-red-100' : 'focus:border-gold-500 focus:ring-gold-100'
                  }`}
                />
                {errors.remarks && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                    <Icon name="error" className="!text-sm" />
                    {errors.remarks}
                  </p>
                )}
                {!errors.remarks && (
                  <div className="mt-1.5 flex justify-between text-xs text-ink-400">
                    <span>Maximum 500 {t('words')}</span>
                    <span>{wordCount}/500</span>
                  </div>
                )}
              </div>

              {/* Declaration */}
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
                errors.agree ? 'border-red-300 bg-red-50' : 'border-ink-100 hover:bg-ink-50/60'
              }`}>
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => {
                    setAgree(e.target.checked)
                    if (errors.agree) {
                      setErrors((prev) => ({ ...prev, agree: '' }))
                    }
                  }}
                  className="mt-1 h-4 w-4 rounded border-ink-300 text-gold-600 focus:ring-gold-400"
                />
                <span className={`text-sm leading-relaxed ${errors.agree ? 'text-red-700' : 'text-ink-600'}`}>
                  {t('declarationText')}
                </span>
              </label>
              {errors.agree && (
                <p className="flex items-center gap-1.5 text-xs text-red-600">
                  <Icon name="error" className="!text-sm" />
                  {errors.agree}
                </p>
              )}

              {/* Form actions */}
              <div className="flex flex-col-reverse items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Button as="link" to="/" variant="secondary" icon={<Icon name="arrow_back" className="!text-base" />}>
                  {t('back')}
                </Button>
                <Button type="submit" variant="primary" icon={<Icon name="arrow_forward" className="!text-base" />} iconPosition="right">
                  {t('continue')}
                </Button>
              </div>
            </form>
          </section>

          {/* Helper section */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <h4 className="flex items-center gap-2 text-sm font-bold text-ink-900">
                <Icon name="support_agent" className="text-gold-600" />
                Talk to an Advisor
              </h4>
              <p className="mt-1.5 text-sm text-ink-600">Need help with the hardship justification? Call 800-MOEI.</p>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <h4 className="flex items-center gap-2 text-sm font-bold text-ink-900">
                <Icon name="schedule" className="text-gold-600" />
                Average Response Time
              </h4>
              <p className="mt-1.5 text-sm text-ink-600">Applications are typically reviewed within 5 working days.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
