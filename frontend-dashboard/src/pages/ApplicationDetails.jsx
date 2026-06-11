import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { getApplicationDetails } from '../services/dashboardService'
import { useLanguage } from '../contexts/LanguageContext'
import ApplicationDetailsPanel from '../components/ApplicationDetailsPanel'
import Icon from '../components/Icon'

export default function ApplicationDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const { t, language } = useLanguage()

  const loadDetails = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getApplicationDetails(id)
      setApplication(data || null)
    } catch (err) {
      console.error('Failed to load application details:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail?.id === id) {
        loadDetails()
      }
    }
    window.addEventListener('application-updated', handleUpdate)
    return () => window.removeEventListener('application-updated', handleUpdate)
  }, [id, loadDetails])

  // Poll every 5 seconds while the agent is still processing
  useEffect(() => {
    if (!application || (application.status !== 'submitted' && application.status !== 'processing')) return
    const interval = setInterval(() => {
      loadDetails()
    }, 5000)
    return () => clearInterval(interval)
  }, [application, loadDetails])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-navy-100 bg-white p-20 text-center shadow-card text-navy-400 text-sm">
          {t('loadingCaseDetails')}
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy-900"
        >
          <Icon name={language === 'ar' ? 'arrow_forward' : 'arrow_back'} /> {t('back')}
        </button>
        <div className="rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-card">
          <p className="text-sm font-medium text-navy-600">{t('applicationNotFound')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs font-semibold text-navy-700 shadow-card transition hover:bg-navy-50"
        >
          <Icon name={language === 'ar' ? 'arrow_forward' : 'arrow_back'} className="text-[16px]" />
          {t('backToList')}
        </button>
        <div className="text-xs font-semibold uppercase tracking-wider text-navy-400">
          {t('caseFile')} <span className="font-mono text-navy-600">{application.application_id}</span>
        </div>
      </div>

      <ApplicationDetailsPanel application={application} />
    </div>
  )
}
