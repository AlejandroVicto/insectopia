// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../auth/useAuth'
import { AuthProvider } from '../auth/AuthProvider'
import App from '../App'

const previousAdapter = api.defaults.adapter
const previousBaseURL = api.defaults.baseURL
afterEach(() => { cleanup(); api.defaults.adapter = previousAdapter; api.defaults.baseURL = previousBaseURL; vi.unstubAllEnvs() })

const item = (id, leida = false, tipo = 'COMENTARIO', disponible = true) => ({
  id, tipo, contenido: ['COMENTARIO', 'REACCION'].includes(tipo) ? 'Actividad en tu publicación' : 'Tu reporte fue resuelto',
  actor: ['COMENTARIO', 'REACCION'].includes(tipo) ? { id: 2, nombre: 'Ana', nombreUsuario: 'ana', avatarUrl: null } : null,
  fechaCreacion: '2026-11-20T09:00:00', leida,
  recurso: ['COMENTARIO', 'REACCION'].includes(tipo)
    ? { tipo: 'PUBLICACION', id: disponible ? 24 : null, disponible, apiUrl: disponible ? '/api/publicaciones/24' : null }
    : { tipo: 'REPORTE', id: id + 100, disponible: false, apiUrl: null },
})
const ok = (config, data, status = 200) => Promise.resolve({ config, data, status, headers: {} })
const fail = (config, status = 500) => Promise.reject(Object.assign(new Error('Fallo de prueba'), {
  config, response: { status, data: { message: 'Fallo del servidor' }, config },
}))

function Controls() {
  const { setSession, clearSession } = useAuth()
  const navigate = useNavigate()
  return <>
    <button onClick={() => { setSession({ token: 'token-1', user: { id: 1, role: 'USUARIO', name: 'María', email: 'maria@example.test' } }); navigate('/app/notificaciones') }}>Preparar sesión de notificaciones</button>
    <button onClick={() => setSession({ token: 'token-2', user: { id: 2, role: 'USUARIO', name: 'Ana' } })}>Cambiar cuenta</button>
    <button onClick={() => { clearSession(); navigate('/login') }}>Cerrar sesión de prueba</button>
  </>
}

function start(adapter) {
  vi.stubEnv('VITE_API_URL', 'http://localhost:8080')
  api.defaults.baseURL = import.meta.env.VITE_API_URL
  api.defaults.adapter = vi.fn(adapter)
  render(<MemoryRouter initialEntries={['/login']}><AuthProvider><Controls /><App /></AuthProvider></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Preparar sesión de notificaciones' }))
  return api.defaults.adapter
}

function store(initial = [item(9), item(10, true, 'REPORTE_RESUELTO')]) {
  let entries = [...initial]
  const calls = []
  const adapter = (config) => {
    calls.push(config)
    if (config.url === '/api/notificaciones/no-leidas/count') return ok(config, { count: entries.filter((n) => !n.leida).length })
    if (config.url === '/api/notificaciones' && config.method === 'get') {
      const { filtro, page, size } = config.params
      const filtered = entries.filter((n) => filtro === 'todas' || n.leida === (filtro === 'leidas'))
      const content = filtered.slice(page * size, (page + 1) * size)
      return ok(config, { content, number: page, size, totalPages: Math.ceil(filtered.length / size),
        totalElements: filtered.length, first: page === 0, last: (page + 1) * size >= filtered.length })
    }
    if (config.url.endsWith('/leer') && config.method === 'patch') {
      const id = Number(config.url.split('/')[3]); entries = entries.map((n) => n.id === id ? { ...n, leida: true } : n)
      return ok(config, entries.find((n) => n.id === id))
    }
    if (config.url === '/api/notificaciones/leer-todas') {
      entries = entries.map((n) => ({ ...n, leida: true }))
      return ok(config, { count: 0 })
    }
    if (config.method === 'delete') {
      entries = entries.filter((n) => n.id !== Number(config.url.split('/')[3]))
      return ok(config, '', 204)
    }
    throw new Error(`Solicitud inesperada: ${config.url}`)
  }
  return { adapter, calls, add(entry) { entries = [entry, ...entries] }, get entries() { return entries } }
}

const nav = () => screen.getByRole('navigation', { name: 'Navegación principal' })

describe('actividad 067, pantalla conectada con Axios', () => {
  it('un comentario navega al detalle exacto y marca solo el aviso pulsado', async () => {
    const source = store([item(9)])
    const requests = start((config) => config.url === '/api/publicaciones/24'
      ? ok(config, { id: 24, autor: { id: 1, nombre: 'María', nombreUsuario: 'maria' }, contenido: 'Publicación exacta 24',
        imagenUrl: null, fechaPublicacion: '2026-11-20T08:00:00', estado: 'VISIBLE', totalComentarios: 1,
        totalReacciones: 2, reaccionUsuario: null })
      : config.url === '/api/publicaciones/24/comentarios'
        ? ok(config, { content: [], number: 0, size: 50, totalPages: 0, totalElements: 0, first: true, last: true })
        : source.adapter(config))
    const row = await screen.findByRole('article', { name: 'Notificación 9' })
    const link = within(row).getByRole('link', { name: 'Ver publicación' })
    expect(link.getAttribute('href')).toBe('/app/publicaciones/24')
    link.focus()
    fireEvent.keyDown(link, { key: 'Enter' })
    // En jsdom el evento click ejecuta la activación de un enlace enfocado; en el navegador Enter es nativo.
    fireEvent.click(link)
    await waitFor(() => expect(screen.getByText('Publicación exacta 24')).toBeTruthy())
    expect(screen.getByRole('region', { name: 'Comentarios de la publicación 24' })).toBeTruthy()
    expect(requests.mock.calls.some(([c]) => c.url === '/api/publicaciones')).toBe(false)
    expect(requests.mock.calls.filter(([c]) => c.url === '/api/notificaciones/9/leer')).toHaveLength(1)
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Notificaciones: 1' })).toBeNull())
    fireEvent.click(screen.getByRole('link', { name: /Volver a Notificaciones/ }))
    expect(await screen.findByRole('article', { name: 'Notificación 9' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('0 sin leer')).toBeTruthy())
  })

  it('una reacción abre por su ID concreto una publicación no cargada en Inicio', async () => {
    const notification = { ...item(12, false, 'REACCION'),
      recurso: { tipo: 'PUBLICACION', id: 75, disponible: true, apiUrl: '/api/publicaciones/75' } }
    const source = store([notification])
    const calls = start((config) => config.url === '/api/publicaciones/75'
      ? ok(config, { id: 75, autor: { id: 1, nombre: 'María', nombreUsuario: 'maria' }, contenido: 'Reacción en publicación 75',
        imagenUrl: null, fechaPublicacion: '2026-11-20T08:00:00', estado: 'VISIBLE', totalComentarios: 0,
        totalReacciones: 1, reaccionUsuario: null })
      : config.url === '/api/publicaciones/75/comentarios'
        ? ok(config, { content: [] }) : source.adapter(config))
    const row = await screen.findByRole('article', { name: 'Notificación 12' })
    expect(within(row).getByText('@ana reaccionó a tu publicación')).toBeTruthy()
    fireEvent.click(within(row).getByRole('link', { name: 'Ver publicación' }))
    expect(await screen.findByText('Reacción en publicación 75')).toBeTruthy()
    expect(calls.mock.calls.some(([config]) => config.url === '/api/publicaciones/75')).toBe(true)
    expect(calls.mock.calls.some(([config]) => config.url === '/api/publicaciones')).toBe(false)
    expect(calls.mock.calls.filter(([config]) => config.url === '/api/notificaciones/12/leer')).toHaveLength(1)
  })

  it('mensaje real marca aviso, navega al chat fuera de la primera página y lee historial', async () => {
    const notification = { ...item(15), tipo: 'MENSAJE', contenido: 'Te envió un mensaje privado',
      actor: { id: 2, nombre: 'Ana', nombreUsuario: 'ana' },
      recurso: { tipo: 'MENSAJE', id: 80, conversacionId: 5, disponible: true, apiUrl: '/api/conversaciones/5' } }
    const source = store([notification])
    const conversation = { id: 5, interlocutor: { id: 2, nombre: 'Ana', nombreUsuario: 'ana' },
      noLeidos: 1, ultimoMensaje: null, oculta: false }
    let resolveRead
    const adapter = start((config) => {
      if (config.url === '/api/conversaciones') return ok(config, { content: [], number: 0, size: 20,
        totalPages: 0, totalElements: 0, first: true, last: true })
      if (config.url === '/api/conversaciones/5') return ok(config, conversation)
      if (config.url === '/api/conversaciones/5/mensajes') return ok(config, { content: [{ id: 80,
        conversacionId: 5, remitenteId: 2, contenido: 'Mensaje privado real', fechaEnvio: '2026-11-20T08:00:00' }],
      number: 0, size: 30, totalPages: 1, totalElements: 1, last: true })
      if (config.url === '/api/conversaciones/5/lectura') return new Promise((resolve) => { resolveRead = () => resolve(ok(config, { ...conversation, noLeidos: 0 })) })
      return source.adapter(config)
    })
    const row = await screen.findByRole('article', { name: 'Notificación 15' })
    expect(within(row).getByText('@ana te envió un mensaje privado')).toBeTruthy()
    fireEvent.click(within(row).getByRole('link', { name: 'Ir a conversación' }))
    await waitFor(() => expect(adapter.mock.calls.filter(([c]) => c.url === '/api/notificaciones/15/leer')).toHaveLength(1))
    expect(await screen.findByText('Mensaje privado real')).toBeTruthy()
    expect(adapter.mock.calls.some(([c]) => c.url === '/api/conversaciones/80')).toBe(false)
    await waitFor(() => expect(resolveRead).toBeTypeOf('function'))
    resolveRead()
    await waitFor(() => expect(adapter.mock.calls.some(([c]) => c.url === '/api/conversaciones/5/lectura'
      && JSON.parse(c.data).mensajeId === 80)).toBe(true))
    expect(adapter.mock.calls.filter(([c]) => c.url === '/api/notificaciones/15/leer')).toHaveLength(1)
    expect(source.entries[0].leida).toBe(true)
  })

  it('fallo del PATCH de un enlace no simula leído ni bloquea navegación', async () => {
    const source = store([item(9)])
    start((config) => config.url === '/api/notificaciones/9/leer' ? fail(config)
      : config.url === '/api/publicaciones/24' ? ok(config, { id: 24, autor: { id: 1, nombre: 'María', nombreUsuario: 'maria' },
        contenido: 'Detalle', fechaPublicacion: '2026-11-20T08:00:00', estado: 'VISIBLE', totalComentarios: 0, totalReacciones: 0 })
        : config.url === '/api/publicaciones/24/comentarios' ? ok(config, { content: [] }) : source.adapter(config))
    const row = await screen.findByRole('article', { name: 'Notificación 9' })
    fireEvent.click(within(row).getByRole('link', { name: 'Ver publicación' }))
    expect(await screen.findByText('Detalle')).toBeTruthy()
    expect(source.entries[0].leida).toBe(false)
  })

  it('un aviso legado de mensaje sin conversación verificable nunca selecciona un chat', async () => {
    const source = store([{ ...item(9), tipo: 'NUEVO_MENSAJE', recurso: { tipo: 'MENSAJE', id: null, disponible: false, apiUrl: null } }])
    const calls = start(source.adapter)
    const row = await screen.findByRole('article', { name: 'Notificación 9' })
    expect(within(row).getByText('Contenido no disponible')).toBeTruthy()
    expect(within(row).queryByRole('link', { name: 'Ir a conversación' })).toBeNull()
    fireEvent.click(within(row).getByRole('heading'))
    expect(screen.getByRole('heading', { name: 'Notificaciones' })).toBeTruthy()
    expect(calls.mock.calls.some(([config]) => config.url.startsWith('/api/conversaciones'))).toBe(false)
  })

  it('obtiene lista real paginada, filtro y contador compartido con JWT', async () => {
    const source = store([item(9), ...Array.from({ length: 11 }, (_, i) => item(i + 20, i % 2 === 0))])
    const adapter = start(source.adapter)
    expect(screen.getByText('Cargando notificaciones…')).toBeTruthy()
    await waitFor(() => expect(screen.getByRole('article', { name: 'Notificación 9' })).toBeTruthy())
    expect(screen.getByRole('heading', { name: 'Notificaciones' })).toBeTruthy()
    expect(screen.getByText('6 sin leer')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Notificaciones: 6' })).toBeTruthy()
    expect(nav().textContent).toContain('Notificaciones · 6')
    expect(screen.getByText('Página 1 de 2 · 12 notificaciones')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Anterior' }).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(screen.getByText('Página 2 de 2 · 12 notificaciones')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'No leídas · 6' }))
    expect(screen.getByText('Cargando notificaciones…')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Página 1 de 1 · 6 notificaciones')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'No leídas · 6' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Leídas' }))
    await waitFor(() => expect(screen.getByText('Página 1 de 1 · 6 notificaciones')).toBeTruthy())
    expect(source.calls.filter((c) => c.url === '/api/notificaciones').map((c) => c.params.filtro)).toEqual(['todas', 'todas', 'no-leidas', 'leidas'])
    expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer token-1')
  })

  it('espera PATCH individual; actualiza filtro y ambos contadores tras éxito, sin duplicar', async () => {
    const source = store([item(9)])
    let finish
    const adapter = start((config) => config.url === '/api/notificaciones/9/leer'
      ? new Promise((resolve) => { finish = () => { source.adapter(config); resolve(ok(config, { ...item(9), leida: true })) } })
      : source.adapter(config))
    await waitFor(() => expect(screen.getByRole('article', { name: 'Notificación 9' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'No leídas · 1' }))
    await waitFor(() => expect(screen.getByText('Página 1 de 1 · 1 notificaciones')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Marcar leída' }))
    expect(screen.getByRole('button', { name: 'Marcando…' }).disabled).toBe(true)
    expect(screen.getByText('1 sin leer')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Marcando…' }))
    expect(screen.getByRole('heading', { name: 'Notificaciones' })).toBeTruthy()
    await waitFor(() => expect(adapter.mock.calls.filter(([c]) => c.url === '/api/notificaciones/9/leer')).toHaveLength(1))
    finish()
    await waitFor(() => expect(screen.getByText('0 sin leer')).toBeTruthy())
    await waitFor(() => expect(screen.getByText('No tienes notificaciones sin leer')).toBeTruthy())
    expect(within(document.querySelector('.private-shell > header')).getByRole('link', { name: 'Notificaciones' })).toBeTruthy()
    expect(nav().textContent).not.toContain('Notificaciones · 1')
  })

  it('cancelar y Escape no llaman PATCH; confirmar espera respuesta y refresca datos', async () => {
    const source = store([item(9)])
    let finish
    const adapter = start((config) => config.url === '/api/notificaciones/leer-todas'
      ? new Promise((resolve) => { finish = () => { source.adapter(config); resolve(ok(config, { count: 0 })) } })
      : source.adapter(config))
    await waitFor(() => expect(screen.getByText('1 sin leer')).toBeTruthy())
    const trigger = screen.getByRole('button', { name: /Marcar todas leídas/ })
    trigger.focus(); fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: '¿Marcar todas como leídas?' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    fireEvent.click(trigger); fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(adapter.mock.calls.filter(([c]) => c.method === 'patch')).toHaveLength(0)
    fireEvent.click(trigger); fireEvent.click(screen.getByRole('button', { name: 'Marcar todas' }))
    expect(screen.getByRole('button', { name: 'Procesando…' }).disabled).toBe(true)
    expect(screen.getByText('1 sin leer')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
    await waitFor(() => expect(typeof finish).toBe('function'))
    finish()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(screen.getByText('0 sin leer')).toBeTruthy())
    expect(trigger.disabled).toBe(true)
    expect(await screen.findByText('Leída')).toBeTruthy()
  })

  it('muestra error de marcado masivo y permite reintentar sin alterar contador', async () => {
    const source = store([item(9)])
    let failed = true
    start((config) => config.url === '/api/notificaciones/leer-todas' && failed
      ? fail(config) : source.adapter(config))
    await waitFor(() => expect(screen.getByText('1 sin leer')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Marcar todas leídas/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Marcar todas' }))
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('alert')).toBeTruthy())
    expect(screen.getByText('1 sin leer')).toBeTruthy()
    failed = false
    fireEvent.click(screen.getByRole('button', { name: 'Marcar todas' }))
    await waitFor(() => expect(screen.getByText('0 sin leer')).toBeTruthy())
  })

  it('elimina con confirmación; error deja fila y contador; éxito sincroniza y corrige página', async () => {
    const source = store([item(9)])
    let failed = true
    start((config) => config.url === '/api/notificaciones/9' && failed
      ? fail(config) : source.adapter(config))
    await waitFor(() => expect(screen.getByText('1 sin leer')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar notificación 9' }))
    expect(screen.getByRole('heading', { name: 'Notificaciones' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('article', { name: 'Notificación 9' })).toBeTruthy()
    expect(screen.getByText('1 sin leer')).toBeTruthy()
    failed = false
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.getByText('Sin notificaciones')).toBeTruthy())
    await waitFor(() => expect(screen.getByText('0 sin leer')).toBeTruthy())
    expect(screen.getByText('Página 0 de 0 · 0 notificaciones')).toBeTruthy()
  })

  it('muestra vacío, error de carga y reintento sin sustituir el fallo por datos falsos', async () => {
    let failed = true
    const source = store([])
    start((config) => config.url === '/api/notificaciones' && failed ? fail(config) : source.adapter(config))
    await waitFor(() => expect(screen.getByText('No pudimos cargar tu actividad')).toBeTruthy())
    expect(screen.queryByText('Sin notificaciones')).toBeNull()
    failed = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('Sin notificaciones')).toBeTruthy())
    expect(screen.getByText('Aquí aparecerán las novedades de tu comunidad cuando existan.')).toBeTruthy()
  })

  it('recurso eliminado permanece visible sin enlace; error individual conserva no leída', async () => {
    const source = store([item(9, false, 'COMENTARIO', false), item(10, true, 'REPORTE_RESUELTO')])
    let failed = true
    start((config) => config.url === '/api/notificaciones/9/leer' && failed ? fail(config) : source.adapter(config))
    await waitFor(() => expect(within(screen.getByRole('article', { name: 'Notificación 9' })).getByText('Contenido no disponible')).toBeTruthy())
    expect(screen.queryByRole('link', { name: 'Ver publicación' })).toBeNull()
    fireEvent.click(within(screen.getByRole('article', { name: 'Notificación 9' })).getByRole('button', { name: 'Marcar leída' }))
    await waitFor(() => expect(within(screen.getByRole('article', { name: 'Notificación 9' })).getByRole('alert')).toBeTruthy())
    expect(screen.getByText('1 sin leer')).toBeTruthy()
    failed = false
    fireEvent.click(within(screen.getByRole('article', { name: 'Notificación 9' })).getByRole('button', { name: 'Marcar leída' }))
    await waitFor(() => expect(screen.getByText('0 sin leer')).toBeTruthy())
  })

  it('descarta respuestas antiguas al cambiar filtros y borra contador al cambiar sesión', async () => {
    const source = store([item(9), item(10, true)])
    let finishOld
    const adapter = start((config) => config.url === '/api/notificaciones' && config.params.filtro === 'todas'
      ? new Promise((resolve) => { finishOld = () => resolve(ok(config, { content: [item(88)], number: 0, size: 10, totalPages: 1, totalElements: 1, first: true, last: true })) })
      : config.url === '/api/notificaciones/no-leidas/count' && config.headers.get('Authorization') === 'Bearer token-2'
        ? ok(config, { count: 0 }) : source.adapter(config))
    await waitFor(() => expect(screen.getByText('1 sin leer')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Leídas' }))
    await waitFor(() => expect(screen.getByRole('article', { name: 'Notificación 10' })).toBeTruthy())
    finishOld()
    expect(screen.queryByRole('article', { name: 'Notificación 88' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar cuenta' }))
    await waitFor(() => expect(screen.getByText('0 sin leer')).toBeTruthy())
    expect(within(document.querySelector('.private-shell > header')).getByRole('link', { name: 'Notificaciones' })).toBeTruthy()
    expect(adapter.mock.calls.some(([c]) => c.headers.get('Authorization') === 'Bearer token-2')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión de prueba' }))
    expect(screen.queryAllByRole('link', { name: 'Notificaciones' })).toHaveLength(0)
  })

  it('al recuperar el foco actualiza contador y listado con datos nuevos', async () => {
    const source = store([item(9)])
    start(source.adapter)
    await waitFor(() => expect(screen.getByText('1 sin leer')).toBeTruthy())
    await waitFor(() => expect(screen.getByRole('article', { name: 'Notificación 9' })).toBeTruthy())
    source.add(item(12))
    fireEvent(window, new Event('focus'))
    await waitFor(() => expect(screen.getByText('2 sin leer')).toBeTruthy())
    await waitFor(() => expect(screen.getByRole('article', { name: 'Notificación 12' })).toBeTruthy())
    expect(nav().textContent).toContain('Notificaciones · 2')
  })

  it('un 401 invalida sesión con el interceptor existente y desmonta datos privados', async () => {
    start((config) => config.url === '/api/notificaciones/no-leidas/count'
      ? fail(config, 401) : store([item(9)]).adapter(config))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeTruthy())
    expect(screen.queryByRole('article', { name: 'Notificación 9' })).toBeNull()
    expect(screen.queryAllByRole('link', { name: 'Notificaciones' })).toHaveLength(0)
  })
})
