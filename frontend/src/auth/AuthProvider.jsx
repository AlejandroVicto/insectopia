import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { bindApiSession } from '../services/api'
import { AuthContext } from './AuthContext'
import { ROLES } from './roles'

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null)
  const sessionRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  const clearSession = useCallback(() => {
    sessionRef.current = null
    setSessionState(null)
  }, [])

  // To be called with user data returned by the future login endpoint, not by parsing a JWT.
  const setSession = useCallback(({ token, user }) => {
    if (typeof token !== 'string' || !token.trim() || !user || !Object.values(ROLES).includes(user.role)) {
      throw new Error('La respuesta de sesión no es válida')
    }
    const next = { token: token.trim(), user: { id: user.id, role: user.role, name: user.name } }
    sessionRef.current = next
    setSessionState(next)
  }, [])

  useEffect(() => {
    const unbind = bindApiSession({
      getToken: () => sessionRef.current?.token,
      onUnauthorized: (sentToken) => {
        if (sessionRef.current?.token !== sentToken) return
        clearSession()
        if (location.pathname !== '/login' && location.pathname !== '/' && location.pathname !== '/health') {
          navigate('/login', {
            replace: true,
            state: { from: location.pathname + location.search + location.hash },
          })
        }
      },
    })
    return unbind
  }, [clearSession, location, navigate])

  const value = useMemo(() => ({
    token: session?.token ?? null,
    user: session?.user ?? null,
    role: session?.user.role ?? null,
    isAuthenticated: Boolean(session?.token),
    isLoading: false, // Memory-only initialization is synchronous; no stored session to hydrate.
    setSession,
    clearSession,
  }), [session, setSession, clearSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
