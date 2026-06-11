import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import ApplicationDetails from './pages/ApplicationDetails'
import ApprovedCases from './pages/ApprovedCases'
import RejectedCases from './pages/RejectedCases'
import NeedsReview from './pages/NeedsReview'
import PendingDocuments from './pages/PendingDocuments'
import AuditLogs from './pages/AuditLogs'
import Settings from './pages/Settings'
import './App.css'

function App() {
  return (
    <LanguageProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/applications/:id" element={<ApplicationDetails />} />
          <Route path="/approved" element={<ApprovedCases />} />
          <Route path="/rejected" element={<RejectedCases />} />
          <Route path="/needs-review" element={<NeedsReview />} />
          <Route path="/pending-documents" element={<PendingDocuments />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
