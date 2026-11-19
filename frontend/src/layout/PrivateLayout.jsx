import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import LogoutConfirmModal from './LogoutConfirmModal'
import './private-layout.css'

export default function PrivateLayout({ notificationCount }) {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const { clearSession } = useAuth()
  const navigate = useNavigate()

  function confirmLogout() {
    clearSession() // Local only; the JWT is not revoked on the server.
    navigate('/login', { replace: true })
  }

  return (
    <div className="private-shell min-h-screen min-w-[1100px]">
      <Navbar notificationCount={notificationCount} inactive={logoutOpen} />
      <div className="flex min-h-[calc(100vh-80px)]" inert={logoutOpen ? true : undefined}>
        <Sidebar notificationCount={notificationCount} onLogout={() => setLogoutOpen(true)} />
        <main className="min-w-0 flex-1 bg-[#f2f6ef] p-8" id="private-content">
          <Outlet />
        </main>
      </div>
      {logoutOpen && (
        <LogoutConfirmModal onCancel={() => setLogoutOpen(false)} onConfirm={confirmLogout} />
      )}
    </div>
  )
}
