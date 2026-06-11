import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const steps = [
  { to: '/' },
  { to: '/profile' },
  { to: '/loan-details' },
  { to: '/documents' },
  { to: '/review' },
  { to: '/confirmation' },
]

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const saved = localStorage.getItem('maxReachedStep')
  const maxReachedStep = saved ? parseInt(saved, 10) : 0

  const targetIndex = steps.findIndex((s) => s.to === pathname)

  if (targetIndex !== -1 && targetIndex > maxReachedStep) {
    const fallbackStep = steps[maxReachedStep] || steps[1]
    return <Navigate to={fallbackStep.to} replace />
  }

  return children
}
