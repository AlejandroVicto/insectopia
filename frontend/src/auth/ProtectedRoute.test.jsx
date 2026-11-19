// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { AuthContext } from './AuthContext'
import { useAuth } from './useAuth'
import ProtectedRoute from './ProtectedRoute'
import RoleGate from './RoleGate'
import { ROLES, ROUTE_ROLES } from './roles'

afterEach(cleanup)

function Controls({ role }) {
  const { setSession, clearSession } = useAuth()
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => setSession({ token: 'only-in-test', user: { id: 1, role } })}>Iniciar</button>
      <button onClick={clearSession}>Limpiar</button>
      <button onClick={() => navigate('/app')}>General</button>
      <button onClick={() => navigate('/moderacion')}>Moderación</button>
      <button onClick={() => navigate('/administracion')}>Administración</button>
    </>
  )
}

function LoginProbe() {
  const location = useLocation()
  return <p>Login: {location.state?.from ?? 'sin destino'}</p>
}

function TestRoutes({ role }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Controls role={role} />
        <Routes>
          <Route path="/" element={<p>Inicio público</p>} />
          <Route path="/login" element={<LoginProbe />} />
          <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.generales} />}>
            <Route path="/app" element={<p>Área general</p>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.moderacion} />}>
            <Route path="/moderacion" element={<p>Área moderación</p>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.administracion} />}>
            <Route path="/administracion" element={<p>Área administración</p>} />
          </Route>
        </Routes>
        <RoleGate allowedRoles={ROUTE_ROLES.moderacion}><p>Acción de moderación</p></RoleGate>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('rutas protegidas', () => {
  it('conserva destino y envía al login sin sesión; no redirige en bucle', () => {
    render(<TestRoutes role={ROLES.USUARIO} />)
    expect(screen.getByText('Inicio público')).toBeTruthy()
    fireEvent.click(screen.getByText('General'))
    expect(screen.getByText('Login: /app')).toBeTruthy()
  })

  it('permite a USUARIO las rutas generales y oculta moderación', () => {
    render(<TestRoutes role={ROLES.USUARIO} />)
    fireEvent.click(screen.getByText('Iniciar'))
    fireEvent.click(screen.getByText('General'))
    expect(screen.getByText('Área general')).toBeTruthy()
    expect(screen.queryByText('Acción de moderación')).toBeNull()
  })

  it('restringe moderación a USUARIO sin cerrar su sesión', () => {
    render(<TestRoutes role={ROLES.USUARIO} />)
    fireEvent.click(screen.getByText('Iniciar'))
    fireEvent.click(screen.getByText('Moderación'))
    expect(screen.getByText('Acceso restringido')).toBeTruthy()
    fireEvent.click(screen.getByText('General'))
    expect(screen.getByText('Área general')).toBeTruthy()
  })

  it('MODERADOR ve acciones generales y moderación, pero no administración', () => {
    render(<TestRoutes role={ROLES.MODERADOR} />)
    fireEvent.click(screen.getByText('Iniciar'))
    fireEvent.click(screen.getByText('Moderación'))
    expect(screen.getByText('Área moderación')).toBeTruthy()
    expect(screen.getByText('Acción de moderación')).toBeTruthy()
    fireEvent.click(screen.getByText('Administración'))
    expect(screen.getByText('Acceso restringido')).toBeTruthy()
  })

  it('ADMINISTRADOR accede a administración', () => {
    render(<TestRoutes role={ROLES.ADMINISTRADOR} />)
    fireEvent.click(screen.getByText('Iniciar'))
    fireEvent.click(screen.getByText('Administración'))
    expect(screen.getByText('Área administración')).toBeTruthy()
  })

  it('muestra carga si aún no se resolvió el estado', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <AuthContext.Provider value={{ isLoading: true, isAuthenticated: false }}>
          <Routes>
            <Route path="/app" element={<ProtectedRoute><p>Privado</p></ProtectedRoute>} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('status').textContent).toContain('Comprobando sesión')
    expect(screen.queryByText('Privado')).toBeNull()
  })

  it('limpia una sesión y vuelve a proteger las rutas', () => {
    render(<TestRoutes role={ROLES.ADMINISTRADOR} />)
    fireEvent.click(screen.getByText('Iniciar'))
    fireEvent.click(screen.getByText('Administración'))
    fireEvent.click(screen.getByText('Limpiar'))
    expect(screen.getByText('Login: /administracion')).toBeTruthy()
  })
})
