import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { ApplicationProvider } from './contexts/ApplicationContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ServiceLanding from './pages/ServiceLanding'
import Login from './pages/Login'
import ProfileConfirmation from './pages/ProfileConfirmation'
import LoanSummary from './pages/LoanSummary'
import Documents from './pages/Documents'
import ReviewConfirm from './pages/ReviewConfirm'
import Results from './pages/Results'
import Confirmation from './pages/Confirmation'
import MyApplications from './pages/MyApplications'
import ApplicationDetail from './pages/ApplicationDetail'

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ApplicationProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<ServiceLanding />} />
                <Route path="/login" element={<Login />} />

                {/* Step-gated application flow */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfileConfirmation />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/loan-details"
                  element={
                    <ProtectedRoute>
                      <LoanSummary />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/documents"
                  element={
                    <ProtectedRoute>
                      <Documents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/review"
                  element={
                    <ProtectedRoute>
                      <ReviewConfirm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/results"
                  element={
                    <ProtectedRoute>
                      <Results />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/confirmation"
                  element={
                    <ProtectedRoute>
                      <Confirmation />
                    </ProtectedRoute>
                  }
                />

                {/* Always accessible after login */}
                <Route
                  path="/my-applications"
                  element={
                    <ProtectedRoute>
                      <MyApplications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-applications/:id"
                  element={
                    <ProtectedRoute>
                      <ApplicationDetail />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </ApplicationProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
