// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import api from '../services/api'
import App from '../App'

const originalAdapter = api.defaults.adapter
const originalBaseURL = api.defaults.baseURL
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter; api.defaults.baseURL = originalBaseURL; vi.unstubAllEnvs() })

const post = (id) => ({ id, autor: { id: 7, nombre: 'María', nombreUsuario: 'maria', avatarUrl: null },
  contenido: `Escarabajo publicado en ${id}`, imagenUrl: `/api/publicaciones/${id}/imagen`,
  fechaPublicacion: '2026-11-20T09:00:00', estado: 'VISIBLE', totalComentarios: 2, totalReacciones: 5, reaccionUsuario: null })
const answer = (config, data) => Promise.resolve({ config, data, status: 200, headers: {} })
const reject = (config, status) => Promise.reject(Object.assign(new Error('Error de prueba'), {
  config, response: { config, status, data: { message: 'Error del servidor' } },
}))

function LoginForTest({ destination }) {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  return <button type="button" onClick={() => {
    setSession({ token: 'token-detail', user: { id: 1, role: 'USUARIO', name: 'Usuario' } })
    navigate(destination)
  }}>Acceder a la URL directa</button>
}

function RestoreAfterLogin() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  return <button type="button" onClick={() => {
    setSession({ token: 'token-detail', user: { id: 1, role: 'USUARIO', name: 'Usuario' } })
    navigate(location.state?.from ?? '/app')
  }}>Autenticar tras recarga</button>
}

function setup(path, adapter) {
  vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
  vi.stubEnv('VITE_INICIO_MOCK', 'true')
  api.defaults.baseURL = import.meta.env.VITE_API_URL
  api.defaults.adapter = vi.fn(adapter)
  render(<MemoryRouter initialEntries={['/login']}><AuthProvider>
    <LoginForTest destination={path} /><App />
  </AuthProvider></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Acceder a la URL directa' }))
  return api.defaults.adapter
}

describe('detalle de publicación por URL dentro de PrivateLayout', () => {
  it('una URL directa sin sesión vuelve al mismo ID después de iniciar sesión', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
    api.defaults.baseURL = import.meta.env.VITE_API_URL
    api.defaults.adapter = vi.fn((config) => config.url === '/api/notificaciones/no-leidas/count'
      ? answer(config, { count: 0 }) : config.url === '/api/publicaciones/173'
        ? answer(config, post(173)) : answer(config, { content: [] }))
    render(<MemoryRouter initialEntries={['/app/publicaciones/173']}><AuthProvider><RestoreAfterLogin /><App /></AuthProvider></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Autenticar tras recarga' }))
    expect(await screen.findByRole('article', { name: 'Publicación 173' })).toBeTruthy()
    expect(api.defaults.adapter.mock.calls.some(([config]) => config.url === '/api/publicaciones')).toBe(false)
  })

  it('consulta exactamente el ID de la URL con JWT, aunque no esté en el feed o modo demo', async () => {
    const calls = setup('/app/publicaciones/173', (config) => {
      if (config.url === '/api/notificaciones/no-leidas/count') return answer(config, { count: 3 })
      if (config.url === '/api/publicaciones/173') return answer(config, post(173))
      if (config.url === '/api/publicaciones/173/comentarios') return answer(config, { content: [{
        id: 8, autor: { nombre: 'Ana', nombreUsuario: 'ana' }, contenido: 'Qué bonito escarabajo', fechaComentario: '2026-11-20T09:01:00',
      }] })
      if (config.url === '/api/publicaciones/173/reaccion') return answer(config, { total: 6, tipo: 'ME_GUSTA' })
      throw new Error(`Petición inesperada ${config.url}`)
    })
    expect(await screen.findByRole('article', { name: 'Publicación 173' })).toBeTruthy()
    expect(screen.getByText('Escarabajo publicado en 173')).toBeTruthy()
    expect(screen.getByText('María')).toBeTruthy()
    expect(screen.getByRole('img', { name: /Imagen de la publicación de María/ }).getAttribute('src')).toContain('/api/publicaciones/173/imagen')
    expect(await screen.findByText('Qué bonito escarabajo')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Me gusta: 5' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Me gusta: 5' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Me gusta: 6' }).getAttribute('aria-pressed')).toBe('true'))
    expect(calls.mock.calls.some(([config]) => config.url === '/api/publicaciones')).toBe(false)
    const detail = calls.mock.calls.find(([config]) => config.url === '/api/publicaciones/173')[0]
    expect(detail.headers.get('Authorization')).toBe('Bearer token-detail')
    expect(screen.getByRole('link', { name: /Volver a Notificaciones/ }).getAttribute('href')).toBe('/app/notificaciones')
    expect(screen.getByRole('link', { name: 'Notificaciones: 3' })).toBeTruthy()
  })

  it.each([403, 404])('muestra contenido no disponible si GET por ID devuelve %s', async (status) => {
    const calls = setup('/app/publicaciones/24', (config) => config.url === '/api/notificaciones/no-leidas/count'
      ? answer(config, { count: 0 }) : reject(config, status))
    expect(await screen.findByRole('heading', { name: 'Contenido no disponible' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Volver a Notificaciones/ })).toBeTruthy()
    expect(screen.queryByRole('article', { name: 'Publicación 24' })).toBeNull()
    expect(calls.mock.calls.filter(([config]) => config.url === '/api/publicaciones/24')).toHaveLength(1)
  })

  it('rechaza un ID inválido y una respuesta de otro ID sin revelar la publicación', async () => {
    const calls = setup('/app/publicaciones/24%2Fevil', (config) => answer(config, { count: 0 }))
    expect(screen.getByRole('heading', { name: 'Contenido no disponible' })).toBeTruthy()
    expect(calls.mock.calls.some(([config]) => config.url.startsWith('/api/publicaciones/'))).toBe(false)
    cleanup()
    setup('/app/publicaciones/24', (config) => config.url === '/api/notificaciones/no-leidas/count'
      ? answer(config, { count: 0 }) : answer(config, post(999)))
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar la publicación' })).toBeTruthy()
    expect(screen.queryByText('Escarabajo publicado en 999')).toBeNull()
  })

  it('permite reintentar un error de servidor sin mostrar datos inventados', async () => {
    let failed = true
    const calls = setup('/app/publicaciones/24', (config) => config.url === '/api/notificaciones/no-leidas/count'
      ? answer(config, { count: 0 }) : config.url === '/api/publicaciones/24' && failed
        ? reject(config, 500) : config.url === '/api/publicaciones/24'
          ? answer(config, post(24)) : answer(config, { content: [] }))
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar la publicación' })).toBeTruthy()
    expect(screen.queryByRole('article', { name: 'Publicación 24' })).toBeNull()
    failed = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('article', { name: 'Publicación 24' })).toBeTruthy()
    expect(calls.mock.calls.filter(([config]) => config.url === '/api/publicaciones/24')).toHaveLength(2)
  })
})
