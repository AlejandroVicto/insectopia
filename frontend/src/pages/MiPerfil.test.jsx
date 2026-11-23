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

const publicacionPropia = (id, contenido, extras = {}) => ({
  id,
  autor: { id: 7, nombre: 'María Real', nombreUsuario: 'maria', avatarUrl: null },
  contenido,
  imagenUrl: null,
  fechaPublicacion: '2024-06-01T10:00:00Z',
  estado: 'VISIBLE',
  totalComentarios: 0,
  totalReacciones: 0,
  reaccionUsuario: null,
  ...extras,
})

const postsPage = (content, number = 0, totalElements = content.length, totalPages = totalElements === 0 ? 0 : number + 1) => ({
  content,
  number,
  size: 10,
  totalElements,
  totalPages,
  first: number === 0,
  last: number >= totalPages - 1,
})

const publicacionInicial = publicacionPropia(101, 'Mariposa en el jardín')
const RUTA_PROPIAS = '/api/usuarios/me/publicaciones'
const llamadaPropias = (mock) => mock.mock.calls.find(([config]) => config.url === RUTA_PROPIAS)?.[0]
const idiomaAdapter = (config, data) => ok(config, data)
const baseAdapter = ({ publicaciones = postsPage([]), perfil = profile, seguidos = page([]) } = {}) => vi.fn((config) => {
  if (config.url === '/api/usuarios/me') return idiomaAdapter(config, perfil)
  if (config.url === RUTA_PROPIAS) return idiomaAdapter(config, publicaciones)
  if (config.url === '/api/usuarios/seguidos') return idiomaAdapter(config, seguidos)
  if (config.url === '/api/catalogos/paises') return idiomaAdapter(config, [{ codigo: 'MX', nombre: 'México' }])
  return idiomaAdapter(config, { count: 0 })
})

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
  if (config.url === RUTA_PROPIAS) return ok(config, postsPage([publicacionInicial]))
  if (config.url === '/api/usuarios/seguidos') {
    const params = config.params
    if (params.q === 'nadie') return ok(config, page([], 0, 0))
    if (params.page === 1) return ok(config, page([ana, luis], 1, 2))
    return ok(config, page([ana], 0, 2, false))
  }
  if (config.url === '/api/catalogos/paises') return ok(config, [{ codigo: 'MX', nombre: 'México' }])
  return ok(config, { count: 0 })
})

describe('Mi perfil, publicaciones propias 074 y modales existentes', () => {
  it('usa el layout compartido, consulta identidad privada y muestra solo publicaciones propias reales', async () => {
    renderPerfil(adapter)
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeTruthy()
    await screen.findByText('Estudio polinizadores')
    expect(screen.getByText('María Real', { selector: 'h2' })).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Información de mi cuenta' })).getByText('@maria')).toBeTruthy()
    await screen.findByText('Jalisco, México')
    expect(screen.getByText('junio de 2024')).toBeTruthy()
    await screen.findByText('Mariposa en el jardín')
    expect(within(screen.getByRole('region', { name: 'Mis Publicaciones' })).getByRole('article', { name: 'Publicación 101' })).toBeTruthy()
    expect(screen.queryByText('Publicaciones propias no disponibles')).toBeNull()
    expect(within(screen.getByRole('main')).queryByText('privado@test.invalid')).toBeNull()
    expect(screen.getByText('Publicaciones').closest('.perfil-stat').textContent).toContain('3')
    expect(adapter.mock.calls.some(([config]) => config.url === '/api/usuarios/me' && config.headers.get('Authorization') === 'Bearer jwt-test')).toBe(true)
    expect(llamadaPropias(adapter).params).toEqual({ page: 0, size: 10 })
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
        : config.url === RUTA_PROPIAS ? ok(config, postsPage([]))
          : config.url === '/api/usuarios/seguidos' ? ok(config, page([])) : ok(config, [])))
    await screen.findByText('Cuenta Real', { selector: 'h2' })
    expect(screen.getByText(/Perfil completo pendiente de GET/)).toBeTruthy()
    expect(screen.getByText('Biografía no disponible: pendiente del endpoint de perfil.')).toBeTruthy()
    expect(screen.getByText('Ubicación no disponible')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Avatar de Cuenta Real' })).toBeTruthy()
    expect(screen.queryByText('secret@test.invalid')).toBeNull()
  })

  it('presenta bio vacía y avatar de respaldo al fallar la imagen', async () => {
    renderPerfil(baseAdapter({ perfil: { ...profile, biografia: null } }))
    await screen.findByText('Todavía no has agregado una biografía')
    fireEvent.error(screen.getByAltText('Avatar de María Real'))
    expect(screen.getByRole('img', { name: 'Avatar de María Real' })).toBeTruthy()
    expect(screen.queryByAltText('Avatar de María Real')).toBeNull()
  })

  it('presenta lista vacía, error de conexión y reintento sin usuarios simulados', async () => {
    let attempts = 0
    renderPerfil(vi.fn((config) => {
      if (config.url === '/api/usuarios/me') return ok(config, profile)
      if (config.url === RUTA_PROPIAS) return ok(config, postsPage([]))
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
      : config.url === RUTA_PROPIAS ? ok(config, postsPage([]))
        : config.url === '/api/usuarios/seguidos' ? ok(config, page([])) : ok(config, [])))
    await screen.findByText('No pudimos cargar tu perfil')
    expect(screen.queryByText('María Real', { selector: 'h2' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(screen.getByText('Cargando tu perfil...')).toBeTruthy()
  })

  it('cancela solicitudes y retira datos privados al cerrar sesión', async () => {
    let signalPropias
    renderPerfil(vi.fn((config) => {
      if (config.url === '/api/usuarios/me') return ok(config, profile)
      if (config.url === RUTA_PROPIAS) {
        signalPropias = config.signal
        return new Promise(() => {})
      }
      if (config.url === '/api/usuarios/seguidos') return ok(config, page([]))
      return ok(config, [])
    }))
    await screen.findByText('Estudio polinizadores')
    expect(screen.getByRole('status', { name: 'Cargando publicaciones' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }))
    await screen.findByText('Pantalla de login')
    expect(signalPropias.aborted).toBe(true)
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

  it('muestra el estado vacío del endpoint sin mensajes provisionales', async () => {
    renderPerfil(baseAdapter())
    await screen.findByText('Aún no has publicado')
    expect(screen.queryByText('Publicaciones propias no disponibles')).toBeNull()
    expect(within(screen.getByRole('region', { name: 'Mis Publicaciones' })).queryByRole('article')).toBeNull()
  })

  it('muestra error del endpoint y reintenta con datos del servidor', async () => {
    let intentos = 0
    const local = vi.fn((config) => {
      if (config.url === '/api/usuarios/me') return ok(config, profile)
      if (config.url === RUTA_PROPIAS) {
        intentos += 1
        return intentos === 1 ? fail(config, 503) : ok(config, postsPage([publicacionInicial]))
      }
      if (config.url === '/api/usuarios/seguidos') return ok(config, page([]))
      return ok(config, [])
    })
    renderPerfil(local)
    await screen.findByText('No pudimos cargar tus publicaciones')
    fireEvent.click(within(screen.getByRole('region', { name: 'Mis Publicaciones' })).getByRole('button', { name: 'Reintentar' }))
    await screen.findByText('Mariposa en el jardín')
    expect(intentos).toBe(2)
  })

  it('respeta la paginación real de PaginaDTO con diez publicaciones por página', async () => {
    const primera = Array.from({ length: 10 }, (_, index) => publicacionPropia(200 + index, `Publicación inicial ${index}`))
    const segunda = [publicacionPropia(300, 'Publicación de la segunda página')]
    const local = vi.fn((config) => {
      if (config.url === '/api/usuarios/me') return ok(config, profile)
      if (config.url === RUTA_PROPIAS) return ok(config, config.params.page === 1
        ? postsPage(segunda, 1, 11, 2)
        : postsPage(primera, 0, 11, 2))
      if (config.url === '/api/usuarios/seguidos') return ok(config, page([]))
      return ok(config, [])
    })
    renderPerfil(local)
    await screen.findByText('Publicación inicial 0')
    expect(within(screen.getByRole('region', { name: 'Mis Publicaciones' })).getAllByRole('article')).toHaveLength(10)
    const paginacion = screen.getByRole('navigation', { name: 'Páginas de mis publicaciones' })
    expect(within(paginacion).getByText('Página 1 de 2')).toBeTruthy()
    fireEvent.click(within(paginacion).getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Publicación de la segunda página')
    expect(screen.queryByText('Publicación inicial 0')).toBeNull()
    expect(local.mock.calls.some(([config]) => config.url === RUTA_PROPIAS && config.params.page === 1 && config.params.size === 10)).toBe(true)
    expect(within(screen.getByRole('region', { name: 'Mis Publicaciones' })).getAllByRole('article')).toHaveLength(1)
  })

  it('nunca consulta ni muestra el feed global para excluir publicaciones ajenas', async () => {
    const ajena = publicacionPropia(999, 'Publicación ajena del feed', { autor: { id: 99, nombre: 'Otro usuario', nombreUsuario: 'otro', avatarUrl: null } })
    const local = vi.fn((config) => {
      if (config.url === '/api/usuarios/me') return ok(config, profile)
      if (config.url === '/api/publicaciones') return ok(config, postsPage([ajena]))
      if (config.url === RUTA_PROPIAS) return ok(config, postsPage([publicacionInicial]))
      if (config.url === '/api/usuarios/seguidos') return ok(config, page([]))
      return ok(config, [])
    })
    renderPerfil(local)
    await screen.findByText('Mariposa en el jardín')
    expect(screen.queryByText('Publicación ajena del feed')).toBeNull()
    expect(local.mock.calls.some(([config]) => config.url === '/api/publicaciones')).toBe(false)
  })

  it('abre los modales propios con permiso y refresca lista y contador tras eliminar', async () => {
    let eliminada = false
    const local = vi.fn((config) => {
      if (config.url === '/api/usuarios/me') return ok(config, { ...profile, totalPublicaciones: eliminada ? 0 : 3 })
      if (config.url === RUTA_PROPIAS) return ok(config, eliminada ? postsPage([]) : postsPage([publicacionInicial]))
      if (config.url === '/api/usuarios/seguidos') return ok(config, page([]))
      if (config.url === '/api/publicaciones/101' && config.method === 'delete') {
        eliminada = true
        return ok(config, '')
      }
      return ok(config, { count: 0 })
    })
    renderPerfil(local)
    await screen.findByText('Mariposa en el jardín')

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones para publicación 101' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar publicación' }))
    const edicion = await screen.findByRole('dialog', { name: 'Editar publicación' })
    expect(within(edicion).getByRole('button', { name: 'Guardar cambios' }).disabled).toBe(false)
    fireEvent.click(within(edicion).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones para publicación 101' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar publicación' }))
    const confirmacion = await screen.findByRole('dialog', { name: 'Eliminar publicación' })
    const perfilesAntes = local.mock.calls.filter(([config]) => config.url === '/api/usuarios/me').length
    const propiasAntes = local.mock.calls.filter(([config]) => config.url === RUTA_PROPIAS).length
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Eliminar publicación' }))

    await screen.findByText('Aún no has publicado')
    await waitFor(() => expect(local.mock.calls.filter(([config]) => config.url === '/api/usuarios/me').length).toBeGreaterThan(perfilesAntes))
    expect(local.mock.calls.filter(([config]) => config.url === RUTA_PROPIAS).length).toBeGreaterThan(propiasAntes)
    expect(screen.getByText('Publicaciones').closest('.perfil-stat').textContent).toContain('0')
    expect(local.mock.calls.some(([config]) => config.url === '/api/publicaciones/101' && config.method === 'delete')).toBe(true)
  })
})
