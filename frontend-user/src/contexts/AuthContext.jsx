import { createContext, useState, useContext } from 'react'
import { getPersonaById } from '../data/uaePassData'
import { getLoanDataByPersonaId } from '../data/moeiData'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('uaepass_user')
    return s ? JSON.parse(s) : null
  })
  const [loanData, setLoanData] = useState(() => {
    const s = localStorage.getItem('moei_loan')
    return s ? JSON.parse(s) : null
  })
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem('uaepass_user')
  )

  const loginWithUAEPass = (personaId) => {
    const persona = getPersonaById(personaId)
    if (!persona) return
    const loan = getLoanDataByPersonaId(personaId)
    const userData = { ...persona, loginTime: new Date().toISOString() }
    setUser(userData)
    setLoanData(loan)
    setIsAuthenticated(true)
    localStorage.setItem('uaepass_user', JSON.stringify(userData))
    localStorage.setItem('moei_loan', JSON.stringify(loan))
    localStorage.setItem('maxReachedStep', '1')
  }

  const logout = () => {
    setUser(null)
    setLoanData(null)
    setIsAuthenticated(false)
    localStorage.removeItem('uaepass_user')
    localStorage.removeItem('moei_loan')
    localStorage.removeItem('maxReachedStep')
    localStorage.removeItem('lastSubmittedApplicationId')
  }

  return (
    <AuthContext.Provider value={{ user, loanData, isAuthenticated, loginWithUAEPass, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
