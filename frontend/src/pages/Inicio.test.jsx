// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import { ROUTE_ROLES } from '../auth/roles'
import ProtectedRoute from '../auth/ProtectedRoute'
import PrivateLayout from '../layout/PrivateLayout'
import Inicio from './Inicio'
import { adaptarPaginaPublicaciones, adaptarPublicacion } from '../adapters/publicacionesAdapter'
import { consultarPublicaciones } from '../services/publicacionesService'

// Las pruebas de Inicio aíslan la consulta global del layout, que se cubre en Notificaciones.
vi.mock('../services/notificacionesService', async (original) => ({
  ...await original(), contarNoLeidas: () => Promise.resolve({ data: { count: 0 } }),
}))

const originalAdapter = api.defaults.adapter
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter })

const raw = (id, image = null) => ({
  id, autor: { id: 7, nombre: 'María', nombreUsuario: 'maria', avatarUrl: null },
  contenido: `Avistamiento ${id}`, imagenUrl: image,
  fechaPublicacion: '2026-11-20T08:00:00', estado: 'VISIBLE', totalReacciones: 5, totalComentarios: 2,
})
const page = (content, number = 0, totalPages = 1) => ({
  content, number, size: 10, totalPages, totalElements: totalPages * content.length,
  first: number === 0, last: number >= totalPages - 1,
})
const ok = (config, data) => Promise.resolve({ status: 200, data, config, headers: {} })
const failure = (config, status) => Promise.reject(Object.assign(new Error('Fallo de prueba'), {
  config, response: status ? { status, config } : undefined,
}))

function LoginControl() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  return <button onClick={() => {
    setSession({ token: 'jwt-de-prueba', user: { id: 7, role: 'USUARIO', name: 'Usuaria Real', email: 'usuaria@ejemplo.test' } })
    navigate('/app')
  }}>Preparar sesión</button>
}

function renderInicio({ demo = true, adapter = vi.fn(), authenticated = true } = {}) {
  api.defaults.adapter = (config) => {
    if (config.url === '/api/usuarios/sugeridos' || config.url === '/api/usuarios/buscar') return ok(config, [])
    if (config.url === '/api/eventos' || config.url === '/api/eventos/buscar') return ok(config, { ...page([], 0, 0), size: 5 })
    return adapter(config)
  }
  render(<MemoryRouter initialEntries={[authenticated ? '/login' : '/app']}><AuthProvider>
    <LoginControl />
    <Routes>
      <Route path="/login" element={<p>Pantalla de login</p>} />
      <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.generales} />}>
        <Route element={<PrivateLayout />}>
          <Route path="/app" element={<Inicio demo={demo} />} />
          <Route path="/app/eventos" element={<p>Eventos existentes</p>} />
        </Route>
      </Route>
    </Routes>
  </AuthProvider></MemoryRouter>)
  if (authenticated) fireEvent.click(screen.getByRole('button', { name: 'Preparar sesión' }))
  return adapter
}

describe('Inicio y feed', () => {
  it('protege la ruta y no monta el layout sin sesión', async () => {
    renderInicio({ authenticated: false })
    await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeTruthy())
    expect(screen.queryByRole('heading', { name: 'Inicio' })).toBeNull()
  })

  it('demo muestra feed variable, ilustración local, autora, contadores y una sola navegación', () => {
    const adapter = renderInicio()
    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Área general' })).toBeNull()
    expect(document.querySelectorAll('.private-shell > header')).toHaveLength(1)
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(1)
    expect(screen.getByText(/Vista de demostración/)).toBeTruthy()
    expect(screen.getByRole('article', { name: 'Publicación demo-1' })).toBeTruthy()
    expect(screen.getByRole('article', { name: 'Publicación demo-2' }).querySelector('img')).toBeNull()
    expect(screen.getByText('Hallazgo excepcional de Chrysina limbata en el bosque nuboso')).toBeTruthy()
    expect(screen.getByText('@Alezzz ·', { exact: false })).toBeTruthy()
    const image = screen.getByRole('img', { name: 'Ilustración de demostración de un escarabajo sobre una rama' })
    expect(image.getAttribute('src')).toMatch(/^(data:image\/svg\+xml|.*escarabajo-demo\.svg)/)
    expect(screen.getByRole('button', { name: 'Me gusta: 3500' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Comentar: 1100' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: /Publicar/ }).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Seguir' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'PERSONAS SUGERIDAS' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'ESPECIES EN TENDENCIA' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'PRÓXIMOS EVENTOS' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver todos' }).getAttribute('href')).toBe('/app/eventos')
    expect(screen.queryByRole('img', { name: /mapa de eventos/i })).toBeNull()
    fireEvent.error(image)
    expect(screen.getByText('Imagen no disponible')).toBeTruthy()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('desplaza el feed dentro de Inicio sin desplazar el navbar ni el sidebar', () => {
    renderInicio()
    const shell = document.querySelector('.private-shell')
    const feed = document.getElementById('inicio-feed')
    expect(shell.classList.contains('private-shell--inicio')).toBe(true)
    expect(feed.classList.contains('overflow-y-auto')).toBe(true)
    expect(feed.classList.contains('inicio-scroll')).toBe(true)
    expect(feed.tabIndex).toBe(0)
    feed.focus()
    expect(document.activeElement).toBe(feed)
    expect(document.getElementById('private-content').classList.contains('overflow-y-auto')).toBe(false)
    expect(shell.querySelector('header').contains(feed)).toBe(false)
    expect(shell.querySelector('aside').contains(feed)).toBe(false)
  })

  it('filtro y páginas se sincronizan con URL y reinician la paginación', () => {
    renderInicio()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Página 2 de 2')).toBeTruthy()
    expect(screen.getByRole('article', { name: 'Publicación demo-4' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Global' }))
    expect(screen.getByRole('button', { name: 'Global' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Página 1 de 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByRole('article', { name: 'Publicación demo-3' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Para ti' }))
    expect(screen.getByText('Página 1 de 2')).toBeTruthy()
  })

  it('la búsqueda de la navbar está disponible pero no altera el feed de Inicio', async () => {
    const adapter = renderInicio()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Página 2 de 2')).toBeTruthy()
    const search = screen.getByRole('searchbox', { name: 'Buscar usuarios o títulos de eventos' })
    expect(search.disabled).toBe(false)
    fireEvent.change(search, { target: { value: 'nada-coincide' } })
    expect(screen.getByRole('article', { name: 'Publicación demo-4' })).toBeTruthy()
    await screen.findByText('Sin resultados para “nada-coincide”.')
    expect(screen.getByRole('article', { name: 'Publicación demo-4' })).toBeTruthy()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('en API real envía Bearer y parámetros, renderiza imagen opcional y página siguiente', async () => {
    const adapter = vi.fn((config) => ok(config, page([raw(15, '/foto-real.jpg'), raw(16)], 0, 2)))
    renderInicio({ demo: false, adapter })
    expect(screen.getByRole('status', { name: 'Cargando publicaciones' })).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())
    expect(screen.getByRole('img', { name: 'Imagen de la publicación de María' }).getAttribute('src')).toBe('/foto-real.jpg')
    expect(screen.getByRole('article', { name: 'Publicación 16' }).querySelector('img')).toBeNull()
    expect(adapter.mock.calls[0][0].params).toEqual({ page: 0, size: 10, feed: 'para-ti' })
    expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer jwt-de-prueba')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params.page).toBe(1))
  })

  it('en API real la navbar busca usuarios y eventos sin añadir q a publicaciones', async () => {
    const adapter = vi.fn((config) => ok(config, page([raw(config.params.page === 0 ? 11 : 12)], config.params.page, 2)))
    renderInicio({ demo: false, adapter })
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 11' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 12' })).toBeTruthy())
    const search = screen.getByRole('searchbox', { name: 'Buscar usuarios o títulos de eventos' })
    fireEvent.change(search, { target: { value: 'polillas' } })
    await screen.findByText('Sin resultados para “polillas”.')
    expect(screen.getByRole('article', { name: 'Publicación 12' })).toBeTruthy()
    expect(adapter.mock.calls.at(-1)[0].params).not.toHaveProperty('q')
  })

  it('cancela la solicitud anterior e ignora su respuesta tardía al cambiar de filtro', async () => {
    let resolveFirst
    const adapter = vi.fn((config) => config.params.feed === 'para-ti'
      ? new Promise((resolve) => { resolveFirst = () => resolve(ok(config, page([raw(1)]))) })
      : ok(config, page([raw(2)])))
    renderInicio({ demo: false, adapter })
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1))
    const firstSignal = adapter.mock.calls[0][0].signal
    fireEvent.click(screen.getByRole('button', { name: 'Global' }))
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 2' })).toBeTruthy())
    expect(firstSignal.aborted).toBe(true)
    resolveFirst()
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Publicación 1' })).toBeNull())
  })

  it.each([undefined, 403, 404, 500])('error HTTP %s muestra reintento sin demo', async (status) => {
    let attempt = 0
    const adapter = vi.fn((config) => ++attempt === 1 ? failure(config, status) : ok(config, page([raw(5)])))
    renderInicio({ demo: false, adapter })
    await waitFor(() => expect(screen.getByRole('heading', { name: 'No pudimos cargar el inicio' })).toBeTruthy())
    expect(screen.queryByText(/Vista de demostración/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 5' })).toBeTruthy())
  })

  it('API vacía y DTO inválido se presentan como estados reales, nunca como demo', async () => {
    const adapter = vi.fn((config) => adapter.mock.calls.length === 1
      ? ok(config, page([])) : ok(config, { unexpected: true }))
    renderInicio({ demo: false, adapter })
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Aún no hay avistamientos' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Global' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'No pudimos cargar el inicio' })).toBeTruthy())
  })

  it('401 utiliza AuthProvider y no una redirección paralela', async () => {
    renderInicio({ demo: false, adapter: vi.fn((config) => failure(config, 401)) })
    await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeTruthy())
    expect(screen.queryByRole('heading', { name: 'Inicio' })).toBeNull()
  })

  it('servicio y adaptador respetan valores críticos, campos opcionales y cancelación', async () => {
    const adapter = vi.fn((config) => ok(config, page([raw(19)])))
    api.defaults.adapter = adapter
    const controller = new AbortController()
    await consultarPublicaciones({ page: 2, size: 3, q: '  bosque  ', feed: 'global', filters: { especie: 'Atta' }, signal: controller.signal })
    expect(adapter.mock.calls[0][0].params).toEqual({ page: 2, size: 3, feed: 'global', q: 'bosque', especie: 'Atta' })
    expect(adapter.mock.calls[0][0].signal).toBe(controller.signal)
    expect(adaptarPaginaPublicaciones(page([raw(19)])).content[0].titulo).toBeNull()
    expect(adaptarPublicacion({ ...raw(20), totalComentarios: undefined }).totalComentarios).toBeNull()
    expect(() => adaptarPublicacion({ id: 5, contenido: 'Sin autor' })).toThrow()
    expect(() => adaptarPaginaPublicaciones({ content: [] })).toThrow()
  })
})
