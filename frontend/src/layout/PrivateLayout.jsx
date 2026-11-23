
import { useCallback, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import LogoutConfirmModal from './LogoutConfirmModal'
import { cerrarSesion } from '../services/logoutService'
import { CrearPublicacionProvider } from '../context/CrearPublicacionProvider'
import { NotificacionesProvider } from '../context/NotificacionesProvider'
import { useNotificaciones } from '../context/useNotificaciones'
import './private-layout.css'

function PrivateLayoutContent({ notificationCount }) {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutState, setLogoutState] = useState('idle')
  const [logoutError, setLogoutError] = useState('')
  const inFlight = useRef(false)

  const { clearSession } = useAuth()
  const { count } = useNotificaciones()
  const visibleCount = notificationCount ?? count
  const navigate = useNavigate()
  const pathname = useLocation().pathname

  const isInicio = pathname === '/app'
  const isMensajes = pathname === '/app/mensajes'
  const isNotificaciones = pathname === '/app/notificaciones'
  const isPublicacion = pathname.startsWith('/app/publicaciones/')
  const isEventos = pathname === '/app/eventos'
  const isPerfil = pathname === '/app/perfil'
  const isConfiguracion = pathname === '/app/configuracion'
  const isAdministracion = pathname === '/administracion'

  const isScrollableSection =
    isInicio ||
    isMensajes ||
    isNotificaciones ||
    isPublicacion ||
    isEventos ||
    isPerfil ||
    isConfiguracion ||
    isAdministracion

  const sectionClassName = isInicio
    ? 'private-shell--inicio'
    : isMensajes
      ? 'private-shell--mensajes'
      : isNotificaciones
        ? 'private-shell--notificaciones'
        : isPublicacion
          ? 'private-shell--publicacion'
          : isEventos
            ? 'private-shell--eventos'
            : isPerfil
              ? 'private-shell--perfil'
              : isConfiguracion
                ? 'private-shell--configuracion'
                : isAdministracion
                  ? 'private-shell--administracion'
                  : 'min-h-screen'

  const minWidthClassName =
    isPerfil || isConfiguracion ? '' : 'min-w-[1100px]'

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

      if (response.status !== 204) {
        throw new Error('Respuesta inesperada del servidor')
      }

      finishLocalLogout()
    } catch (error) {
      if (error.response?.status === 401) {
        finishLocalLogout()
      } else {
        setLogoutState('error')
        setLogoutError(
          error.userMessage ||
          'No se pudo confirmar el cierre en el servidor. Inténtalo de nuevo.'
        )
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
      <div
        className={`private-shell ${minWidthClassName} ${sectionClassName}`}
      >
        <Navbar
          notificationCount={visibleCount}
          inactive={logoutOpen}
          onLogout={openLogout}
        />

        <div
          className={`flex ${isScrollableSection
              ? 'min-h-0 flex-1'
              : 'min-h-[calc(100vh-80px)]'
            }`}
          inert={logoutOpen ? true : undefined}
        >
          <Sidebar
            notificationCount={visibleCount}
            onLogout={openLogout}
          />

          <main
            className={`min-w-0 flex-1 ${isScrollableSection
                ? 'bg-[#111713]'
                : 'bg-[#f2f6ef] p-8'
              }`}
            id="private-content"
          >
            <Outlet />
          </main>
        </div>

        {logoutOpen && (
          <LogoutConfirmModal
            onCancel={closeLogout}
            onConfirm={confirmLogout}
            onLocalLogout={finishLocalLogout}
            state={logoutState}
            error={logoutError}
          />
        )}
      </div>
    </CrearPublicacionProvider>
  )
}

export default function PrivateLayout({ notificationCount }) {
  const { token } = useAuth()

  return (
    <NotificacionesProvider key={token}>
      <PrivateLayoutContent notificationCount={notificationCount} />
    </NotificacionesProvider>
  )
}
