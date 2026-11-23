// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import App from '../App'
import logo from '../assets/logo.png'
import PrivateLayout from './PrivateLayout'
import SectionPlaceholder from '../pages/SectionPlaceholder'

vi.mock('../services/notificacionesService', async (original) => ({
  ...await original(), contarNoLeidas: () => Promise.resolve({ data: { count: 0 } }),
}))
vi.mock('../services/moderacionService', async (original) => ({
  ...await original(),
  listarPropuestas: vi.fn(() => Promise.resolve({ data: { content: [], totalElements: 0, totalPages: 0, first: true, last: true } })),
  aprobarPropuesta: vi.fn(),
  rechazarPropuesta: vi.fn(),
}))
vi.mock('../services/reportesService', () => ({
  crearReporte: vi.fn(),
  listarReportes: vi.fn(() => Promise.resolve({ data: { content: [], totalElements: 0, totalPages: 0, first: true, last: true } })),
  resolverReporte: vi.fn(),
}))

const originalAdapter = api.defaults.adapter
afterEach(() => {
  api.defaults.adapter = originalAdapter
  cleanup()
})

function logoutResponse(config) {
  return Promise.resolve({ data: '', status: 204, statusText: 'No Content', headers: {}, config })
}

function logoutError(config, status) {
  const error = new Error('Fallo de prueba')
  error.config = config
  if (status) error.response = { status, data: {}, config }
  return Promise.reject(error)
}

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
      <button onClick={() => navigate(-1)}>Atrás</button>
      <button onClick={() => navigate('/app/mensajes')}>Abrir mensajes</button>
      <button onClick={() => navigate('/app/notificaciones')}>Abrir notificaciones</button>
      <button onClick={() => navigate('/app/perfil')}>Abrir perfil</button>
      <button onClick={() => navigate('/moderacion')}>Abrir moderación</button>
      <output data-testid="session">{isAuthenticated ? 'con sesión' : 'sin sesión'}</output>
    </>
  )
}

function start(role, user) {
  const adapter = api.defaults.adapter
  const paginaVacia = { content: [], number: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true }
  const respuestasInicio = {
    '/api/publicaciones': paginaVacia,
    '/api/usuarios/sugeridos': [],
    '/api/eventos': paginaVacia,
    '/api/usuarios/buscar': [],
    '/api/eventos/buscar': paginaVacia,
  }
  api.defaults.adapter = (config) => Object.hasOwn(respuestasInicio, config.url)
    ? Promise.resolve({ data: respuestasInicio[config.url], status: 200, config, headers: {} })
    : typeof adapter === 'function' ? adapter(config) : Promise.reject(new Error('Solicitud no simulada'))
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
const accountNavigation = () => screen.getByRole('navigation', { name: 'Mi cuenta' })

describe('layout de escritorio', () => {
  it('comparte el navbar entre secciones, carga el logo oficial y vuelve al inicio', () => {
    start('USUARIO', { name: 'Nombre desde sesión' })
    const header = document.querySelector('.private-shell > header')
    expect(screen.getByRole('img', { name: 'Logo de Insectopia' }).getAttribute('src')).toBe(logo)
    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Área general' })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'Mensajes' }))
    expect(screen.getByRole('heading', { name: 'Mensajes' })).toBeTruthy()
    expect(document.querySelector('.private-shell').classList.contains('private-shell--inicio')).toBe(false)
    expect(document.querySelector('.private-shell > header')).toBe(header)
    expect(screen.getByRole('link', { name: 'Mensajes' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('link', { name: 'Ir al inicio de Insectopia' }))
    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeTruthy()
  })

  it('abre Configuración desde Mi cuenta con la pantalla 077', async () => {
    start('USUARIO')
    fireEvent.click(screen.getByRole('link', { name: 'Configuración' }))
    expect(await screen.findByRole('heading', { name: 'Configuración' })).toBeTruthy()
    expect(document.querySelector('.private-shell').classList.contains('private-shell--configuracion')).toBe(true)
    expect(screen.getByRole('tab', { name: 'Perfil' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Seguridad' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Seguridad' }).getAttribute('aria-selected')).toBe('true')
  })

  it('USUARIO ve accesos generales y configuración, no accesos elevados', () => {
    start('USUARIO')
    for (const name of ['Inicio', 'Mensajes', 'Notificaciones', 'Eventos', 'Mi perfil']) {
      expect(navigation().querySelector(`a[href="${name === 'Inicio' ? '/app' : name === 'Mi perfil' ? '/app/perfil' : `/app/${name.toLowerCase()}`}"]`)).toBeTruthy()
    }
    expect(accountNavigation().querySelector('a[href="/app/configuracion?seccion=seguridad"]')).toBeTruthy()
    expect(navigation().querySelector('a[href="/app/configuracion"]')).toBeNull()
    expect(accountNavigation().textContent).not.toContain('Acceso:')
    expect(navigation().parentElement.lastElementChild).toBe(accountNavigation())
    expect(accountNavigation().className).toContain('mt-auto')
    expect(screen.queryByRole('link', { name: 'Moderación' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Usuarios y roles' })).toBeNull()
    fireEvent.click(screen.getByText('Abrir URL administrativa'))
    expect(screen.getByRole('heading', { name: 'Acceso restringido' })).toBeTruthy()
  })

  it('MODERADOR ve moderación pero no administración y una URL escrita a mano sigue restringida', () => {
    start('MODERADOR')
    expect(screen.getByRole('link', { name: 'Moderación' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Usuarios y roles' })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'Moderación' }))
    expect(screen.getByRole('heading', { name: 'Moderación · Eventos y reportes' })).toBeTruthy()
    fireEvent.click(screen.getByText('Abrir URL administrativa'))
    expect(screen.getByRole('heading', { name: 'Acceso restringido' })).toBeTruthy()
    expect(screen.getByTestId('session').textContent).toBe('con sesión')
  })

  it('ADMINISTRADOR accede a administración y moderación', () => {
    start('ADMINISTRADOR')
    expect(screen.getByRole('link', { name: 'Moderación' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Usuarios y roles' }))
    expect(screen.getByRole('heading', { name: 'Administración de usuarios y roles' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Usuarios y roles' }).getAttribute('aria-current')).toBe('page')
  })

  it('muestra solo datos del contexto y un avatar predeterminado sin inventar notificaciones', () => {
    start('USUARIO', { name: 'Persona Real', email: 'persona@dominio.test' })
    expect(screen.getByText('Persona Real')).toBeTruthy()
    expect(screen.getByText('persona@dominio.test')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Avatar predeterminado' }).textContent).toBe('PR')
    expect(screen.getAllByRole('link', { name: 'Notificaciones' })).toHaveLength(2)
    expect(navigation().textContent).not.toContain('· 5')
    expect(screen.getByRole('searchbox', { name: 'Buscar usuarios o títulos de eventos' }).disabled).toBe(false)
    expect(screen.getByRole('button', { name: '+ Crear publicación' }).disabled).toBe(false)
    const header = document.querySelector('.private-shell > header')
    const search = screen.getByRole('searchbox', { name: 'Buscar usuarios o títulos de eventos' })
    const actions = screen.getByRole('button', { name: '+ Crear publicación' }).parentElement
    expect(header.className).toContain('grid-cols-')
    expect(header.children[1].contains(search)).toBe(true)
    expect(header.lastElementChild).toBe(actions)
    expect(actions.className).toContain('justify-end')
    expect(actions.lastElementChild.textContent).toContain('Persona Real')
  })

  it('el botón superior abre el mismo modal Crear y vuelve al inicio desde otra sección', () => {
    start('USUARIO')
    const boton = screen.getByRole('button', { name: '+ Crear publicación' })
    expect(boton.disabled).toBe(false)
    fireEvent.click(boton)
    expect(screen.getByRole('dialog', { name: 'Registrar observación' })).toBeTruthy()
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('link', { name: 'Mensajes' }))
    expect(screen.getByRole('heading', { name: 'Mensajes' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '+ Crear publicación' }))
    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeTruthy()
    expect(screen.getByRole('dialog', { name: 'Registrar observación' })).toBeTruthy()
  })

  it('muestra estados neutros sin nombre ni correo y vuelve al avatar predeterminado si la imagen falla', () => {
    start('USUARIO', { avatarUrl: '/imagen-no-disponible.png' })
    expect(screen.getByText('Cuenta de Insectopia')).toBeTruthy()
    expect(screen.getByText('Correo no disponible')).toBeTruthy()
    fireEvent.error(screen.getByRole('img', { name: 'Avatar de Cuenta de Insectopia' }))
    expect(screen.getByRole('img', { name: 'Avatar predeterminado' })).toBeTruthy()
  })

  it('cancelar o Escape conservan sesión; 204 borra la sesión y Atrás no expone contenido privado', async () => {
    const adapter = vi.fn(logoutResponse)
    api.defaults.adapter = adapter
    start('USUARIO')
    const logout = accountNavigation().querySelector('button')
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
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('sin sesión'))
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0][0].url).toBe('/api/auth/logout')
    expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer jwt-only-in-test')
    expect(adapter.mock.calls[0][0].skipAuth).not.toBe(true)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeTruthy())
    expect(screen.queryByRole('banner')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(screen.queryByRole('heading', { name: 'Área general' })).toBeNull()
    expect(screen.queryByRole('banner')).toBeNull()
    for (const name of ['Abrir mensajes', 'Abrir notificaciones', 'Abrir perfil', 'Abrir moderación', 'Abrir URL administrativa']) {
      fireEvent.click(screen.getByRole('button', { name }))
      expect(screen.queryByRole('banner')).toBeNull()
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeTruthy())
    }
  })

  it('navbar abre el mismo modal y confirma la revocación', async () => {
    api.defaults.adapter = vi.fn(logoutResponse)
    start('MODERADOR')
    const trigger = screen.getByRole('button', { name: 'Menú de cuenta' })
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Cerrar sesión' })))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    expect(screen.getByRole('dialog', { name: '¿Cerrar sesión?' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }))
    fireEvent.click(screen.getByRole('dialog').querySelectorAll('button')[1])
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('sin sesión'))
  })

  it('bloquea repetidos y Escape durante la solicitud, sin borrar antes de recibir 204', async () => {
    let complete
    const adapter = vi.fn((config) => new Promise((resolve) => { complete = () => resolve(logoutResponse(config)) }))
    api.defaults.adapter = adapter
    start('USUARIO')
    fireEvent.click(accountNavigation().querySelector('button'))
    fireEvent.click(screen.getByRole('dialog').querySelectorAll('button')[1])
    expect(screen.getByRole('button', { name: 'Cerrando sesión…' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Cancelar' }).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrando sesión…' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByTestId('session').textContent).toBe('con sesión')
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1))
    complete()
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('sin sesión'))
  })

  it.each([undefined, 500])('fallo %s permite reintentar sin perder sesión', async (status) => {
    const adapter = vi.fn((config) => adapter.mock.calls.length === 1
      ? logoutError(config, status) : logoutResponse(config))
    api.defaults.adapter = adapter
    start('USUARIO')
    fireEvent.click(accountNavigation().querySelector('button'))
    fireEvent.click(screen.getByRole('dialog').querySelectorAll('button')[1])
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('token podría seguir siendo válido'))
    expect(screen.getByTestId('session').textContent).toBe('con sesión')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('sin sesión'))
    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('al fallar ofrece cerrar solo localmente, sin afirmar revocación', async () => {
    api.defaults.adapter = vi.fn((config) => logoutError(config, 503))
    start('USUARIO')
    fireEvent.click(accountNavigation().querySelector('button'))
    fireEvent.click(screen.getByRole('dialog').querySelectorAll('button')[1])
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cerrar solo aquí' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar solo aquí' }))
    expect(screen.getByTestId('session').textContent).toBe('sin sesión')
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('401 del logout borra sesión local sin duplicar redirecciones del interceptor', async () => {
    api.defaults.adapter = vi.fn((config) => logoutError(config, 401))
    start('ADMINISTRADOR')
    fireEvent.click(accountNavigation().querySelector('button'))
    fireEvent.click(screen.getByRole('dialog').querySelectorAll('button')[1])
    await waitFor(() => expect(screen.getByTestId('session').textContent).toBe('sin sesión'))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeTruthy())
  })

  it('las rutas privadas siguen protegidas sin sesión y las públicas no muestran layout', () => {
    render(<MemoryRouter initialEntries={['/administracion']}><AuthProvider><App /></AuthProvider></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeTruthy()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('el login público no monta el layout privado', () => {
    render(<MemoryRouter initialEntries={['/login']}><AuthProvider><App /></AuthProvider></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeTruthy()
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
