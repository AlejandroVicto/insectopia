import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { hasAllowedRole } from './roles'

export function AccessRestricted() {
  return (
    <main className="min-h-screen bg-emerald-950 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl" role="alert">
        <h1 className="text-2xl font-bold text-emerald-800">Acceso restringido</h1>
        <p className="mt-3 text-gray-700">Tu cuenta no tiene permisos para acceder a esta sección.</p>
      </section>
    </main>
  )
}

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isLoading, isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (isLoading) return <p role="status" className="p-6">Comprobando sesión...</p>
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  }
  if (allowedRoles && !hasAllowedRole(role, allowedRoles)) return <AccessRestricted />
  return children ?? <Outlet />
}
