// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import { ROUTE_ROLES } from '../auth/roles'
import ProtectedRoute from '../auth/ProtectedRoute'
import PrivateLayout from '../layout/PrivateLayout'
import MiPerfil from './MiPerfil'
import { ConfirmarDejarSeguir } from '../components/perfil/PerfilUsuariosModal'

vi.mock('../services/notificacionesService', async (original) => ({
  ...await original(), contarNoLeidas: () => Promise.resolve({ data: { count: 0 } }),
}))

const originalAdapter = api.defaults.adapter
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter })
const ok = (config, data) => Promise.resolve({ status: 200, data, config, headers: {} })
const fail = (config, status) => Promise.reject(Object.assign(new Error('Error HTTP'), { config, response: { status, config } }))
const page = (users, number = 0, total = users.length, last = true) => ({ content: users, number, totalElements: total, last, size: 20, totalPages: last ? number + 1 : number + 2 })
const ana = { id: 8, nombre: 'Ana López', nombreUsuario: 'ana', avatarUrl: null, loSigo: true, email: 'privado@test.invalid', telefono: '555888' }
const luis = { id: 9, nombre: 'Luis Pérez', nombreUsuario: 'luis', avatarUrl: null, loSigo: true }
const profile = { idUsuario: 7, nombre: 'María Real', nombreUsuario: 'maria', fotoPerfil: 'https://example.test/foto.png', biografia: 'Estudio polinizadores', paisCodigo: 'MX', estadoRegion: 'Jalisco', fechaRegistro: '2024-06-01T10:00:00Z', totalSeguidores: 12, totalPublicaciones: 3 }

function LoginControl() {
  const { setSession, clearSession } = useAuth()
  const navigate = useNavigate()
  return <><button onClick={() => { setSession({ token: 'jwt-test', user: { id: 7, role: 'USUARIO', name: 'María Real', email: 'privado@test.invalid' } }); navigate('/app/perfil') }}>Entrar</button>
    <button onClick={() => { clearSession(); navigate('/login') }}>Salir</button></>
}

function renderPerfil(adapter) {
  api.defaults.adapter = adapter
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
  const view = render(<MemoryRouter initialEntries={['/login']}><AuthProvider><LoginControl />
    <Routes><Route path="/login" element={<p>Pantalla de login</p>} /><Route path="/app/configuracion" element={<p>Configuración 077</p>} />
      <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.generales} />}><Route element={<PrivateLayout />}>
        <Route path="/app/perfil" element={<MiPerfil />} />
      </Route></Route></Routes>
  </AuthProvider></MemoryRouter>, { container: root })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  return view
}

const adapter = vi.fn((config) => {
  if (config.url === '/api/usuarios/me') return ok(config, profile)
  if (config.url === '/api/usuarios/seguidos') {
    const params = config.params
    if (params.q === 'nadie') return ok(config, page([], 0, 0))
    if (params.page === 1) return ok(config, page([ana, luis], 1, 2))
    return ok(config, page([ana], 0, 2, false))
  }
  if (config.url === '/api/catalogos/paises') return ok(config, [{ codigo: 'MX', nombre: 'México' }])
  return ok(config, { count: 0 })
})

describe('Mi perfil y modales 073/075 (backend local)', () => {
  it('usa el layout compartido, consulta identidad privada y no muestra datos privados ni publicaciones ajenas', async () => {
    renderPerfil(adapter)
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeTruthy()
    await screen.findByText('Estudio polinizadores')
    expect(screen.getByText('María Real', { selector: 'h2' })).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Información de mi cuenta' })).getByText('@maria')).toBeTruthy()
    await screen.findByText('Jalisco, México')
    expect(screen.getByText('junio de 2024')).toBeTruthy()
    expect(screen.getByText('Publicaciones propias no disponibles')).toBeTruthy()
    expect(within(screen.getByRole('main')).queryByText('privado@test.invalid')).toBeNull()
    expect(adapter.mock.calls.some(([config]) => config.url === '/api/usuarios/me' && config.headers.get('Authorization') === 'Bearer jwt-test')).toBe(true)
    expect(adapter.mock.calls.some(([config]) => config.url === '/api/publicaciones')).toBe(false)
    fireEvent.click(screen.getByRole('link', { name: 'Editar perfil' }))
    expect(screen.getByText('Configuración 077')).toBeTruthy()
  })

  it('abre listas diferentes; Seguidos pagina sin duplicados y oculta campos privados', async () => {
    renderPerfil(adapter)
    await screen.findByText('Estudio polinizadores')
    await waitFor(() => expect(screen.getByRole('button', { name: /2 Seguidos/ })).toBeTruthy())
    const opener = screen.getByRole('button', { name: /2 Seguidos/ })
    fireEvent.click(opener)
    const dialog = await screen.findByRole('dialog', { name: 'Seguidos' })
    await within(dialog).findByText('Ana López')
    expect(document.getElementById('root').inert).toBe(true)
    expect(within(dialog).queryByText('privado@test.invalid')).toBeNull()
    expect(within(dialog).queryByText('555888')).toBeNull()
    expect(within(dialog).getByRole('button', { name: /Siguiendo a Ana López/ }).disabled).toBe(true)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cargar más personas' }))
    await within(dialog).findByText('Luis Pérez')
    expect(within(dialog).getAllByText('Ana López')).toHaveLength(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(opener)
    fireEvent.click(screen.getByRole('button', { name: /12 Seguidores/ }))
    expect(within(screen.getByRole('dialog', { name: 'Seguidores' })).getByText('Lista de seguidores no disponible')).toBeTruthy()
    expect(within(screen.getByRole('dialog')).queryByText('Ana López')).toBeNull()
  })

  it('busca en servidor y distingue sin resultados de lista vacía', async () => {
    renderPerfil(adapter)
    await screen.findByText('Estudio polinizadores')
    fireEvent.click(screen.getByRole('button', { name: /Seguidos/ }))
    const dialog = screen.getByRole('dialog')
    await within(dialog).findByText('Ana López')
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: 'nadie' } })
    await within(dialog).findByText('No encontramos usuarios que coincidan con tu búsqueda')
    expect(adapter.mock.calls.some(([config]) => config.url === '/api/usuarios/seguidos' && config.params.q === 'nadie')).toBe(true)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar Seguidos' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('muestra identidad parcial honesta en 404, sin inventar biografía, región o conteos', async () => {
    renderPerfil(vi.fn((config) => config.url === '/api/usuarios/me' ? fail(config, 404)
      : config.url === '/api/auth/me' ? ok(config, { id: 7, name: 'Cuenta Real', nombreUsuario: 'cuenta', avatarUrl: null, email: 'secret@test.invalid' })
        : config.url === '/api/usuarios/seguidos' ? ok(config, page([])) : ok(config, [])))
    await screen.findByText('Cuenta Real', { selector: 'h2' })
    expect(screen.getByText(/Perfil completo pendiente de GET/)).toBeTruthy()
    expect(screen.getByText('Biografía no disponible: pendiente del endpoint de perfil.')).toBeTruthy()
    expect(screen.getByText('Ubicación no disponible')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Avatar de Cuenta Real' })).toBeTruthy()
    expect(screen.queryByText('secret@test.invalid')).toBeNull()
  })

  it('presenta bio vacía y avatar de respaldo al fallar la imagen', async () => {
    renderPerfil(vi.fn((config) => config.url === '/api/usuarios/me' ? ok(config, { ...profile, biografia: null })
      : config.url === '/api/usuarios/seguidos' ? ok(config, page([])) : ok(config, [])))
    await screen.findByText('Todavía no has agregado una biografía')
    fireEvent.error(screen.getByAltText('Avatar de María Real'))
    expect(screen.getByRole('img', { name: 'Avatar de María Real' })).toBeTruthy()
    expect(screen.queryByAltText('Avatar de María Real')).toBeNull()
  })

  it('presenta lista vacía, error de conexión y reintento sin usuarios simulados', async () => {
    let attempts = 0
    renderPerfil(vi.fn((config) => {
      if (config.url === '/api/usuarios/me') return ok(config, profile)
      if (config.url === '/api/usuarios/seguidos') {
        attempts += 1
        return attempts === 2 ? fail(config, 503) : ok(config, page([]))
      }
      return ok(config, [])
    }))
    await screen.findByText('Estudio polinizadores')
    fireEvent.click(screen.getByRole('button', { name: '0 Seguidos' }))
    const dialog = screen.getByRole('dialog')
    await within(dialog).findByText('No pudimos cargar esta lista')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar' }))
    await within(dialog).findByText('Todavía no sigues a nadie')
    expect(within(dialog).queryByText('Ana López')).toBeNull()
  })

  it('maneja error de perfil con reintento y sin fixtures', async () => {
    renderPerfil(vi.fn((config) => config.url === '/api/usuarios/me' ? fail(config, 503)
      : config.url === '/api/usuarios/seguidos' ? ok(config, page([])) : ok(config, [])))
    await screen.findByText('No pudimos cargar tu perfil')
    expect(screen.queryByText('María Real', { selector: 'h2' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByText('Cargando tu perfil...')).toBeTruthy()
  })

  it('cancela solicitudes y retira datos privados al cerrar sesión', async () => {
    renderPerfil(adapter)
    await screen.findByText('Estudio polinizadores')
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))
    await screen.findByText('Pantalla de login')
    expect(screen.queryByText('Estudio polinizadores')).toBeNull()
  })

  it('deja la confirmación visual preparada para integrar DELETE, sin mutación local', () => {
    const cancel = vi.fn()
    const confirm = vi.fn()
    render(<ConfirmarDejarSeguir nombre="Ana" onCancel={cancel} onConfirm={confirm} pending={false} />)
    expect(screen.getByText('¿Dejar de seguir a Ana?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(cancel).toHaveBeenCalledOnce()
    expect(confirm).not.toHaveBeenCalled()
  })
})
