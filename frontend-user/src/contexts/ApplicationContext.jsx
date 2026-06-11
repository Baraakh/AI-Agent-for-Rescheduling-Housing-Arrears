import { createContext, useState, useContext } from 'react'

const ApplicationContext = createContext()

export function ApplicationProvider({ children }) {
  const [hardshipType, setHardshipType] = useState('')
  const [remarks, setRemarks] = useState('')
  const [abroad, setAbroad] = useState(false)
  const [passportFile, setPassportFile] = useState(null)
  const [agree, setAgree] = useState(false)
  const [uploaded, setUploaded] = useState({})
  const [submissionResult, setSubmissionResult] = useState(null)

  const resetApplicationState = () => {
    setHardshipType('')
    setRemarks('')
    setAbroad(false)
    setPassportFile(null)
    setAgree(false)
    setUploaded({})
    setSubmissionResult(null)
  }

  return (
    <ApplicationContext.Provider
      value={{
        hardshipType,
        setHardshipType,
        remarks,
        setRemarks,
        abroad,
        setAbroad,
        passportFile,
        setPassportFile,
        agree,
        setAgree,
        uploaded,
        setUploaded,
        submissionResult,
        setSubmissionResult,
        resetApplicationState,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  )
}

export function useApplication() {
  const context = useContext(ApplicationContext)
  if (!context) throw new Error('useApplication must be used within an ApplicationProvider')
  return context
}
