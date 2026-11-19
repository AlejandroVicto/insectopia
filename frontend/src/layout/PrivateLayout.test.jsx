// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import App from '../App'
import logo from '../assets/logo.png'
import PrivateLayout from './PrivateLayout'
import SectionPlaceholder from '../pages/SectionPlaceholder'

afterEach(cleanup)

function SessionControls({ role, user = {} }) {
  const { setSession, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => {
        setSession({ token: 'jwt-only-in-test', user: { id: 1, role, ...user } })
        navigate('/app')
      }}>Preparar sesión</button>
      <button onClick={() => navigate('/administracion')}>Abrir URL administrativa</button>
      <output data-testid="session">{isAuthenticated ? 'con sesión' : 'sin sesión'}</output>
    </>
  )
}

function start(role, user) {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <SessionControls role={role} user={user} />
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByText('Preparar sesión'))
}

const navigation = () => screen.getByRole('navigation', { name: 'Navegación principal' })

describe('layout de escritorio', () => {
  it('comparte el navbar entre secciones, carga el logo oficial y vuelve al inicio', () => {
    start('USUARIO', { name: 'Nombre desde sesión' })
    const header = screen.getByRole('banner')
    expect(screen.getByRole('img', { name: 'Logo de Insectopia' }).getAttribute('src')).toBe(logo)
    expect(screen.getByRole('heading', { name: 'Área general' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Mensajes' }))
    expect(screen.getByRole('heading', { name: 'Mensajes' })).toBeTruthy()
    expect(screen.getByRole('banner')).toBe(header)
    expect(screen.getByRole('link', { name: 'Mensajes' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('link', { name: 'Ir al inicio de Insectopia' }))
    expect(screen.getByRole('heading', { name: 'Área general' })).toBeTruthy()
  })

  it('USUARIO ve accesos generales y configuración, no accesos elevados', () => {
    start('USUARIO')
    for (const name of ['Inicio', 'Mensajes', 'Notificaciones', 'Eventos', 'Mi perfil', 'Configuración']) {
      expect(navigation().querySelector(`a[href="${name === 'Inicio' ? '/app' : name === 'Configuración' ? '/app/configuracion' : name === 'Mi perfil' ? '/app/perfil' : `/app/${name.toLowerCase()}`}"]`)).toBeTruthy()
    }
    expect(screen.queryByRole('link', { name: 'Moderación' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Administración' })).toBeNull()
    fireEvent.click(screen.getByText('Abrir URL administrativa'))
    expect(screen.getByRole('heading', { name: 'Acceso restringido' })).toBeTruthy()
  })

  it('MODERADOR ve moderación pero no administración y una URL escrita a mano sigue restringida', () => {
    start('MODERADOR')
    expect(screen.getByRole('link', { name: 'Moderación' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Administración' })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'Moderación' }))
    expect(screen.getByRole('heading', { name: 'Moderación' })).toBeTruthy()
    fireEvent.click(screen.getByText('Abrir URL administrativa'))
    expect(screen.getByRole('heading', { name: 'Acceso restringido' })).toBeTruthy()
    expect(screen.getByTestId('session').textContent).toBe('con sesión')
  })

  it('ADMINISTRADOR accede a administración y moderación', () => {
    start('ADMINISTRADOR')
    expect(screen.getByRole('link', { name: 'Moderación' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Administración' }))
    expect(screen.getByRole('heading', { name: 'Administración' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Administración' }).getAttribute('aria-current')).toBe('page')
  })

  it('muestra solo datos del contexto y un avatar predeterminado sin inventar notificaciones', () => {
    start('USUARIO', { name: 'Persona Real', email: 'persona@dominio.test' })
    expect(screen.getByText('Persona Real')).toBeTruthy()
    expect(screen.getByText('persona@dominio.test')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Avatar predeterminado' }).textContent).toBe('PR')
    expect(screen.getAllByRole('link', { name: 'Notificaciones' })).toHaveLength(2)
    expect(navigation().textContent).not.toContain('· 5')
    expect(screen.getByRole('searchbox', { name: 'Buscar usuarios, publicaciones o eventos' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: '+ Crear publicación' }).disabled).toBe(true)
  })

  it('muestra estados neutros sin nombre ni correo y vuelve al avatar predeterminado si la imagen falla', () => {
    start('USUARIO', { avatarUrl: '/imagen-no-disponible.png' })
    expect(screen.getByText('Cuenta de Insectopia')).toBeTruthy()
    expect(screen.getByText('Correo no disponible')).toBeTruthy()
    fireEvent.error(screen.getByRole('img', { name: 'Avatar de Cuenta de Insectopia' }))
    expect(screen.getByRole('img', { name: 'Avatar predeterminado' })).toBeTruthy()
  })

  it('cancelar o Escape conservan sesión, enfocan y restauran el control; confirmar cierra solo localmente', () => {
    start('USUARIO')
    const logout = navigation().querySelector('button')
    logout.focus()
    fireEvent.click(logout)
    const dialog = screen.getByRole('dialog', { name: '¿Cerrar sesión?' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(dialog.querySelectorAll('button')[1])
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(logout)
    expect(screen.getByTestId('session').textContent).toBe('con sesión')
    fireEvent.click(logout)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByTestId('session').textContent).toBe('con sesión')
    fireEvent.click(logout)
    fireEvent.click(screen.getByRole('dialog').querySelectorAll('button')[1])
    expect(screen.getByTestId('session').textContent).toBe('sin sesión')
    expect(screen.getByRole('heading', { name: 'Acceso a Insectopia' })).toBeTruthy()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('las rutas privadas siguen protegidas sin sesión y las públicas no muestran layout', () => {
    render(<MemoryRouter initialEntries={['/administracion']}><AuthProvider><App /></AuthProvider></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Acceso a Insectopia' })).toBeTruthy()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('el login público no monta el layout privado', () => {
    render(<MemoryRouter initialEntries={['/login']}><AuthProvider><App /></AuthProvider></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Acceso a Insectopia' })).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).toBeNull()
  })

  it('muestra solo un contador recibido dinámicamente, nunca uno por defecto', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <SessionControls role="USUARIO" />
          <Routes>
            <Route path="/login" element={<p>Acceso público</p>} />
            <Route element={<PrivateLayout notificationCount={3} />}>
              <Route path="/app" element={<SectionPlaceholder title="Área general" />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('Preparar sesión'))
    expect(screen.getByRole('link', { name: 'Notificaciones: 3' })).toBeTruthy()
    expect(navigation().textContent).toContain('Notificaciones · 3')
  })
})
