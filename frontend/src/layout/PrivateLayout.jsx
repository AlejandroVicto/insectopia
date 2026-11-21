import { useCallback, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import LogoutConfirmModal from './LogoutConfirmModal'
import { cerrarSesion } from '../services/logoutService'
import { CrearPublicacionProvider } from '../context/CrearPublicacionProvider'
import './private-layout.css'

export default function PrivateLayout({ notificationCount }) {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutState, setLogoutState] = useState('idle')
  const [logoutError, setLogoutError] = useState('')
  const inFlight = useRef(false)
  const { clearSession } = useAuth()
  const navigate = useNavigate()
  const isInicio = useLocation().pathname === '/app'

  const closeLogout = useCallback(() => {
    if (inFlight.current) return
    setLogoutOpen(false)
    setLogoutState('idle')
    setLogoutError('')
  }, [])

  function finishLocalLogout() {
    clearSession()
    setLogoutOpen(false)
    navigate('/login', { replace: true })
  }

  async function confirmLogout() {
    if (inFlight.current) return
    inFlight.current = true
    setLogoutState('loading')
    setLogoutError('')
    try {
      const response = await cerrarSesion()
      if (response.status !== 204) throw new Error('Respuesta inesperada del servidor')
      finishLocalLogout()
    } catch (error) {
      if (error.response?.status === 401) {
        finishLocalLogout() // The token was already invalid, not successfully revoked.
      } else {
        setLogoutState('error')
        setLogoutError(error.userMessage || 'No se pudo confirmar el cierre en el servidor. Inténtalo de nuevo.')
      }
    } finally {
      inFlight.current = false
    }
  }

  function openLogout() {
    setLogoutState('idle')
    setLogoutError('')
    setLogoutOpen(true)
  }

  return (
    <CrearPublicacionProvider>
      <div className={`private-shell min-w-[1100px] ${isInicio ? 'private-shell--inicio' : 'min-h-screen'}`}>
        <Navbar notificationCount={notificationCount} inactive={logoutOpen} onLogout={openLogout} />
        <div className={`flex ${isInicio ? 'min-h-0 flex-1' : 'min-h-[calc(100vh-80px)]'}`} inert={logoutOpen ? true : undefined}>
          <Sidebar notificationCount={notificationCount} onLogout={openLogout} />
          <main className={`min-w-0 flex-1 ${isInicio ? 'bg-[#111713]' : 'bg-[#f2f6ef] p-8'}`} id="private-content">
            <Outlet />
          </main>
        </div>
        {logoutOpen && (
          <LogoutConfirmModal onCancel={closeLogout} onConfirm={confirmLogout}
            onLocalLogout={finishLocalLogout} state={logoutState} error={logoutError} />
        )}
      </div>
    </CrearPublicacionProvider>
  )
}
