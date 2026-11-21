// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import App from '../App'
import Mensajes from './Mensajes'
import { adaptarConversacion, adaptarMensaje, adaptarPagina } from '../adapters/mensajesAdapter'
import NewMessageModal from '../components/mensajes/NewMessageModal'

vi.mock('../services/notificacionesService', async (original) => ({
  ...await original(), contarNoLeidas: () => Promise.resolve({ data: { count: 0 } }),
}))

const originalAdapter = api.defaults.adapter
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter; vi.useRealTimers() })
const chat = (id, name = `Persona ${id}`, unread = 0) => ({ id, interlocutor: { id: id + 100, nombre: name, nombreUsuario: `alias${id}` }, noLeidos: unread, ultimoMensaje: null, oculta: false })
const msg = (id, chatId, sender = 101) => ({ id, conversacionId: chatId, remitenteId: sender, contenido: `Mensaje ${id}`, fechaEnvio: `2026-11-20T08:${String(id % 60).padStart(2, '0')}:00` })
const page = (content, number = 0, totalPages = 1, size = 30) => ({ content, number, size, totalElements: content.length * totalPages, totalPages, last: number >= totalPages - 1 })
const ok = (config, data, status = 200) => Promise.resolve({ config, data, status, headers: {} })
const fail = (config, status) => Promise.reject(Object.assign(new Error('Error de prueba'), { config, response: status ? { status, config } : undefined }))

function Controls({ initial = '/app/mensajes' }) {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  return <><button onClick={() => { setSession({ token: 'jwt-mensajes', user: { id: 7, role: 'USUARIO', name: 'Prueba' } }); navigate(initial) }}>Iniciar prueba</button>
    <button onClick={() => navigate('/app/eventos')}>Salir de mensajes</button></>
}

function start({ demo = true, adapter = vi.fn(), path = '/app/mensajes', app = false, authenticated = true, pollMs = 50000 } = {}) {
  api.defaults.adapter = adapter
  render(<MemoryRouter initialEntries={['/login']}><AuthProvider><Controls initial={path} />
    {app ? <App /> : <>
      <MensajesRoute demo={demo} pollMs={pollMs} />
    </>}
  </AuthProvider></MemoryRouter>)
  if (authenticated) fireEvent.click(screen.getByRole('button', { name: 'Iniciar prueba' }))
  return adapter
}

// App exercises the real route; the lightweight route also allows injecting demo/API in tests.
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../auth/ProtectedRoute'
import { ROUTE_ROLES } from '../auth/roles'
import PrivateLayout from '../layout/PrivateLayout'
function MensajesRoute({ demo, pollMs }) {
  return <Routes><Route path="/login" element={<p>Login público</p>} />
    <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.generales} />}><Route element={<PrivateLayout />}>
      <Route path="/app/mensajes" element={<Mensajes demo={demo} pollMs={pollMs} />} />
      <Route path="/app/eventos" element={<p>Eventos existentes</p>} />
    </Route></Route></Routes>
}

describe('Mensajes 063', () => {
  it('ruta real protegida, sin placeholder ni duplicar navbar/sidebar; otros destinos siguen disponibles', () => {
    start({ app: true })
    expect(screen.getByRole('heading', { name: 'Mensajes' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Área general' })).toBeNull()
    expect(document.querySelectorAll('.private-shell > header')).toHaveLength(1)
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Selecciona una conversación' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Salir de mensajes' }))
    expect(screen.getByRole('heading', { name: 'Eventos' })).toBeTruthy()
  })

  it('bloquea la ruta sin sesión', () => {
    start({ authenticated: false })
    expect(screen.getByText('Login público')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Mensajes' })).toBeNull()
  })

  it('demo: bandeja, selección, estilos, perfil dinámico, búsqueda y filtros; nunca solicita API', async () => {
    const adapter = start()
    expect(screen.queryByText(/Vista de demostración/)).toBeNull()
    expect(screen.getByRole('region', { name: 'Lista de conversaciones' }).querySelectorAll('.msg-conversation')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: /TinkyW.*Cerca de San José/ }))
    const history = screen.getByRole('region', { name: 'Historial de mensajes' })
    expect(within(history).getByText(/¡Hola! Encontré/).closest('.msg-bubble').classList.contains('own')).toBe(false)
    expect(within(history).getByText(/¡Qué buen hallazgo!/).closest('.msg-bubble').classList.contains('own')).toBe(true)
    expect(screen.getByRole('complementary', { name: 'Perfil del interlocutor' }).textContent).toContain('TinkyW')
    fireEvent.click(screen.getByRole('button', { name: /Adelina.*Gracias/ }))
    expect(screen.queryByText(/¡Qué buen hallazgo!/)).toBeNull()
    expect(screen.getByRole('complementary', { name: 'Perfil del interlocutor' }).textContent).toContain('Adelina')
    fireEvent.click(screen.getByRole('button', { name: /Magali.*Sin mensajes/ }))
    expect(screen.getByRole('heading', { name: 'Empieza la conversación' })).toBeTruthy()
    const search = screen.getByRole('searchbox', { name: 'Buscar conversación' })
    fireEvent.change(search, { target: { value: 'nora.insectos' } })
    await waitFor(() => expect(screen.getByRole('region', { name: 'Lista de conversaciones' }).querySelectorAll('.msg-conversation')).toHaveLength(1))
    fireEvent.change(search, { target: { value: 'nada coincide' } })
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sin resultados' })).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Limpiar búsqueda' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'No leídos' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Lista de conversaciones' }).querySelectorAll('.msg-conversation')).toHaveLength(2))
    expect(screen.getByRole('complementary', { name: 'Perfil del interlocutor' }).textContent).toContain('Magali')
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Lista de conversaciones' }).querySelectorAll('.msg-conversation')).toHaveLength(4))
    expect(adapter).not.toHaveBeenCalled()
  })

  it('acciones 065 abren modales; demo permite redactar pero no persiste mensajes', () => {
    const adapter = start()
    fireEvent.click(screen.getByRole('button', { name: /＋ Nuevo/ }))
    expect(screen.getByRole('dialog', { name: 'Nuevo mensaje' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar nuevo mensaje' }))
    fireEvent.click(screen.getByRole('button', { name: /TinkyW.*Cerca de San José/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de conversación' }))
    expect(screen.getByRole('menu', { name: 'Gestionar conversación' })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ocultar conversación' }))
    expect(screen.getByRole('dialog', { name: '¿Ocultar esta conversación?' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog', { name: '¿Ocultar esta conversación?' })).toBeNull()
    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe un mensaje' }), { target: { value: 'Texto de muestra' } })
    expect(screen.getByRole('button', { name: 'Enviar mensaje' }).disabled).toBe(true)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('API usa JWT del cliente compartido, filtra en servidor, no sustituye fallos por fixtures y reintenta', async () => {
    let failure = true
    const adapter = vi.fn((config) => failure ? fail(config, 500) : ok(config, page([chat(1, 'Real', 3)], 0, 1, 20)))
    start({ demo: false, adapter })
    await waitFor(() => expect(screen.getByRole('heading', { name: 'No pudimos cargar los mensajes' })).toBeTruthy())
    expect(screen.queryByRole('note')).toBeNull()
    failure = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Real.*Sin mensajes/ })).toBeTruthy())
    expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer jwt-mensajes')
    expect(adapter.mock.calls[0][0].params).toEqual({ page: 0, size: 20, noLeidos: false })
    fireEvent.click(screen.getByRole('button', { name: 'No leídos' }))
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params.noLeidos).toBe(true))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar conversación' }), { target: { value: 'alias1' } })
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params.q).toBe('alias1'))
  })

  it('lista vacía no es error; adaptadores rechazan DTO inválido', async () => {
    start({ demo: false, adapter: vi.fn((config) => ok(config, page([], 0, 0, 20))) })
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Aún no tienes conversaciones' })).toBeTruthy())
    expect(() => adaptarConversacion({ ...chat(1), noLeidos: undefined })).toThrow()
    expect(() => adaptarMensaje({ ...msg(1, 1), remitenteId: null })).toThrow()
    expect(() => adaptarPagina({ content: [] }, adaptarMensaje)).toThrow()
  })

  it('pagina la bandeja, consulta búsqueda en backend y cancela peticiones obsoletas', async () => {
    let finishSearch
    const adapter = vi.fn((config) => {
      if (config.params.q === 'alias1') return new Promise((resolve) => { finishSearch = () => resolve(ok(config, page([chat(99)], 0, 1, 20))) })
      if (config.params.q === 'alias2') return ok(config, page([chat(2)], 0, 1, 20))
      return ok(config, page(config.params.page ? [chat(21)] : Array.from({ length: 20 }, (_, n) => chat(n + 1)), config.params.page, 2, 20))
    })
    start({ demo: false, adapter })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cargar más conversaciones' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más conversaciones' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Persona 21.*Sin mensajes/ })).toBeTruthy())
    const search = screen.getByRole('searchbox', { name: 'Buscar conversación' })
    fireEvent.change(search, { target: { value: 'alias1' } })
    await waitFor(() => expect(finishSearch).toBeTypeOf('function'))
    const oldSignal = adapter.mock.calls.at(-1)[0].signal
    fireEvent.change(search, { target: { value: 'alias2' } })
    await waitFor(() => expect(screen.getByRole('button', { name: /Persona 2.*Sin mensajes/ })).toBeTruthy())
    expect(oldSignal.aborted).toBe(true)
    finishSearch()
    expect(screen.queryByRole('button', { name: /Persona 99.*Sin mensajes/ })).toBeNull()
    expect(adapter.mock.calls.at(-1)[0].params.page).toBe(0)
  })

  it('historial con error permite reintentar; el 401 sigue siendo responsabilidad de AuthProvider', async () => {
    let attempts = 0
    const adapter = vi.fn((config) => config.url === '/api/conversaciones'
      ? ok(config, page([chat(1)], 0, 1, 20))
      : ++attempts === 1 ? fail(config, 500) : ok(config, page([msg(1, 1)])))
    start({ demo: false, adapter })
    await waitFor(() => expect(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('Mensaje 1')).toBeTruthy())
  })

  it('abrir directamente un chat registra lectura real, borra la insignia y persiste tras remontar', async () => {
    let unread = 1
    const adapter = vi.fn((config) => {
      if (config.url === '/api/conversaciones' && config.params.noLeidos) return ok(config, page(unread ? [chat(5, 'Ana', unread)] : [], 0, unread ? 1 : 0, 20))
      if (config.url === '/api/conversaciones') return ok(config, page([chat(5, 'Ana', unread)], 0, 1, 20))
      if (config.url === '/api/conversaciones/5/mensajes') return ok(config, page([msg(80, 5, 105)]))
      if (config.url === '/api/conversaciones/5/lectura') {
        expect(JSON.parse(config.data)).toEqual({ mensajeId: 80 })
        unread = 0
        return ok(config, chat(5, 'Ana', unread))
      }
      throw new Error(`Solicitud inesperada: ${config.url}`)
    })
    start({ demo: false, adapter })
    const row = await screen.findByRole('button', { name: /Ana.*Sin mensajes/ })
    expect(within(row).getByLabelText('1 mensajes no leídos')).toBeTruthy()
    fireEvent.click(row)
    expect(await screen.findByText('Mensaje 80')).toBeTruthy()
    await waitFor(() => expect(within(screen.getByRole('button', { name: /Ana.*Sin mensajes/ })).queryByLabelText('1 mensajes no leídos')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'No leídos' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sin resultados' })).toBeTruthy())
    expect(adapter.mock.calls.filter(([c]) => c.url === '/api/conversaciones/5/lectura')).toHaveLength(1)
    cleanup()
    start({ demo: false, adapter })
    const persisted = await screen.findByRole('button', { name: /Ana.*Sin mensajes/ })
    expect(within(persisted).queryByLabelText('1 mensajes no leídos')).toBeNull()
  })

  it('enlace de chat consulta por ID aunque no esté en la bandeja; 403, 404 e ID inválido no seleccionan otro', async () => {
    const adapter = vi.fn((config) => {
      if (config.url === '/api/conversaciones') return ok(config, page([chat(1)], 0, 1, 20))
      if (config.url === '/api/conversaciones/5') return ok(config, chat(5, 'Destino'))
      if (config.url === '/api/conversaciones/5/mensajes') return ok(config, page([msg(80, 5, 105)]))
      if (config.url === '/api/conversaciones/5/lectura') return ok(config, chat(5, 'Destino'))
      return fail(config, 403)
    })
    start({ demo: false, adapter, path: '/app/mensajes?conversacion=5' })
    expect(await screen.findByText('Mensaje 80')).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Perfil del interlocutor' }).textContent).toContain('Destino')
    expect(adapter.mock.calls.some(([c]) => c.url === '/api/conversaciones/5')).toBe(true)
    cleanup()
    start({ demo: false, adapter, path: '/app/mensajes?conversacion=999' })
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Conversación no disponible.')
    expect(screen.getByRole('heading', { name: 'Selecciona una conversación' })).toBeTruthy()
    cleanup()
    start({ demo: false, adapter: vi.fn((config) => config.url === '/api/conversaciones'
      ? ok(config, page([chat(1)], 0, 1, 20)) : fail(config, 404)), path: '/app/mensajes?conversacion=999' })
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Conversación no disponible.')
    cleanup()
    start({ demo: false, adapter, path: '/app/mensajes?conversacion=abc' })
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Conversación no disponible.')
    expect(adapter.mock.calls.some(([c]) => c.url === '/api/conversaciones/abc')).toBe(false)
  })

  it('la pestaña oculta no registra lectura aunque haya cargado historial', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const adapter = vi.fn((config) => config.url === '/api/conversaciones'
      ? ok(config, page([chat(5, 'Ana', 1)], 0, 1, 20))
      : config.url === '/api/conversaciones/5/mensajes' ? ok(config, page([msg(80, 5, 105)]))
        : ok(config, chat(5, 'Ana', 0)))
    start({ demo: false, adapter })
    fireEvent.click(await screen.findByRole('button', { name: /Ana.*Sin mensajes/ }))
    expect(await screen.findByText('Mensaje 80')).toBeTruthy()
    expect(adapter.mock.calls.filter(([c]) => c.url.endsWith('/lectura'))).toHaveLength(0)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    fireEvent(document, new Event('visibilitychange'))
    await waitFor(() => expect(adapter.mock.calls.filter(([c]) => c.url.endsWith('/lectura'))).toHaveLength(1))
    vi.restoreAllMocks()
  })

  it('401 de la bandeja limpia la sesión por el interceptor existente', async () => {
    start({ demo: false, adapter: vi.fn((config) => fail(config, 401)) })
    await waitFor(() => expect(screen.getByText('Login público')).toBeTruthy())
    expect(screen.queryByRole('heading', { name: 'Mensajes' })).toBeNull()
  })

  it('cancela historial anterior, pagina mensajes sin duplicarlos y conserva autoría', async () => {
    let resolveFirst
    const adapter = vi.fn((config) => {
      if (config.url === '/api/conversaciones') return ok(config, page([chat(1), chat(2)], 0, 1, 20))
      if (config.url.includes('/1/') && config.params.page === 0) return new Promise((resolve) => { resolveFirst = () => resolve(ok(config, page([msg(10, 1)]))) })
      if (config.url.includes('/2/') && config.params.page === 0) return ok(config, page([msg(22, 2, 7), msg(21, 2)], 0, 2))
      return ok(config, page([msg(21, 2), msg(20, 2)], 1, 2))
    })
    start({ demo: false, adapter })
    await waitFor(() => expect(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ }))
    await waitFor(() => expect(resolveFirst).toBeTypeOf('function'))
    const firstSignal = adapter.mock.calls.at(-1)[0].signal
    fireEvent.click(screen.getByRole('button', { name: /Persona 2.*Sin mensajes/ }))
    expect(firstSignal.aborted).toBe(true)
    await waitFor(() => expect(screen.getByText('Mensaje 22')).toBeTruthy())
    resolveFirst()
    expect(screen.queryByText('Mensaje 10')).toBeNull()
    expect(screen.getByText('Mensaje 22').closest('.msg-bubble').classList.contains('own')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cargar mensajes anteriores' }))
    await waitFor(() => expect(screen.getByText('Mensaje 20')).toBeTruthy())
    expect(screen.getAllByText('Mensaje 21')).toHaveLength(1)
  })

  it('envío valida vacío, Enter/IME, doble clic y fallo conserva borrador', async () => {
    let complete
    let attempts = 0
    const adapter = vi.fn((config) => {
      if (config.url === '/api/conversaciones') return ok(config, page([chat(1)], 0, 1, 20))
      if (config.method === 'get') return ok(config, page([msg(1, 1)]))
      if (config.method !== 'post') return ok(config, chat(1))
      attempts++
      if (attempts === 1) return fail(config, 500)
      return new Promise((resolve) => { complete = () => resolve(ok(config, msg(2, 1, 7), 201)) })
    })
    start({ demo: false, adapter })
    await waitFor(() => expect(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ }))
    await waitFor(() => expect(screen.getByText('Mensaje 1')).toBeTruthy())
    const input = screen.getByRole('textbox', { name: 'Escribe un mensaje' })
    const send = screen.getByRole('button', { name: 'Enviar mensaje' })
    fireEvent.change(input, { target: { value: '  ' } })
    expect(send.disabled).toBe(true)
    fireEvent.change(input, { target: { value: 'Hola' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(attempts).toBe(0)
    fireEvent.click(send)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No se pudo enviar'))
    expect(input.value).toBe('Hola')
    await waitFor(() => expect(send.disabled).toBe(false))
    fireEvent.click(send)
    fireEvent.click(send)
    await waitFor(() => expect(attempts).toBe(2))
    expect(screen.queryByText('Mensaje 2')).toBeNull()
    complete()
    await waitFor(() => expect(screen.getByText('Mensaje 2')).toBeTruthy())
    expect(input.value).toBe('')
    expect(JSON.parse(adapter.mock.calls.find(([config]) => config.method === 'post')[0].data)).toEqual({ contenido: 'Hola' })
  })

  it('polling no continúa al salir de la ruta y no superpone solicitudes', async () => {
    let pending
    const adapter = vi.fn((config) => {
      if (config.url === '/api/conversaciones') return ok(config, page([chat(1)], 0, 1, 20))
      if (config.url.includes('/mensajes') && adapter.mock.calls.filter(([c]) => c.url.includes('/mensajes')).length > 1) {
        return new Promise((resolve) => { pending = () => resolve(ok(config, page([msg(1, 1)]))) })
      }
      return ok(config, page([msg(1, 1)]))
    })
    start({ demo: false, adapter, pollMs: 40 })
    await waitFor(() => expect(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ }))
    await waitFor(() => expect(screen.getByText('Mensaje 1')).toBeTruthy())
    await waitFor(() => expect(pending).toBeTypeOf('function'))
    const count = adapter.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Salir de mensajes' }))
    expect(screen.getByText('Eventos existentes')).toBeTruthy()
    expect(adapter.mock.calls.at(-1)[0].signal.aborted).toBe(true)
    pending()
    expect(adapter).toHaveBeenCalledTimes(count)
  })

  it('cambiar de chat aborta el polling anterior y descarta mensajes tardíos', async () => {
    let resolveOldPoll
    const adapter = vi.fn((config) => {
      if (config.url === '/api/conversaciones') return ok(config, page([chat(1), chat(2)], 0, 1, 20))
      if (config.url.includes('/1/') && adapter.mock.calls.filter(([c]) => c.url.includes('/1/')).length > 1) {
        return new Promise((resolve) => { resolveOldPoll = () => resolve(ok(config, page([msg(50, 1)]))) })
      }
      return ok(config, page([msg(config.url.includes('/2/') ? 2 : 1, config.url.includes('/2/') ? 2 : 1)]))
    })
    start({ demo: false, adapter, pollMs: 40 })
    await waitFor(() => expect(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ }))
    await waitFor(() => expect(resolveOldPoll).toBeTypeOf('function'))
    const signal = adapter.mock.calls.at(-1)[0].signal
    fireEvent.click(screen.getByRole('button', { name: /Persona 2.*Sin mensajes/ }))
    await waitFor(() => expect(screen.getByText('Mensaje 2')).toBeTruthy())
    expect(signal.aborted).toBe(true)
    resolveOldPoll()
    expect(screen.queryByText('Mensaje 50')).toBeNull()
  })

  it('Nuevo: foco, trampa de Tab, Escape y restauración del foco, sin HTTP en demo', () => {
    const adapter = start()
    const trigger = screen.getByRole('button', { name: /＋ Nuevo/ })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Nuevo mensaje' })
    expect(document.querySelector('.private-shell').inert).toBe(true)
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Buscar usuarios seguidos' }))
    screen.getByRole('button', { name: 'Cerrar nuevo mensaje' }).focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Cerrar nuevo mensaje' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(document.querySelector('.private-shell').inert).not.toBe(true)
    expect(dialog.isConnected).toBe(false)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('demo: busca seguidos, diferencia vacío de no coincidencias y permite recuperar un chat existente', async () => {
    const adapter = start()
    fireEvent.click(screen.getByRole('button', { name: /＋ Nuevo/ }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo mensaje' })
    expect(within(dialog).getByText(/4 RESULTADOS/)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Abrir conversación →' }).disabled).toBe(true)
    const search = screen.getByRole('searchbox', { name: 'Buscar usuarios seguidos' })
    fireEvent.change(search, { target: { value: 'desconocida' } })
    await waitFor(() => expect(within(dialog).getByRole('heading', { name: 'Sin coincidencias' })).toBeTruthy())
    expect(within(dialog).queryByRole('heading', { name: 'Todavía no sigues a nadie' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda de usuarios' }))
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /Adelina.*AdNieto/ })).toBeTruthy())
    fireEvent.click(within(dialog).getByRole('button', { name: /Adelina.*AdNieto/ }))
    expect(within(dialog).getByRole('button', { name: /Adelina.*AdNieto/ }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abrir conversación →' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('complementary', { name: 'Perfil del interlocutor' }).textContent).toContain('Adelina')
    expect(within(screen.getByRole('region', { name: 'Historial de mensajes' })).getByText('Gracias por compartir la foto')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Lista de conversaciones' }).querySelectorAll('.msg-conversation')).toHaveLength(4)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('demo: crea chat solo en memoria, ocultar exige confirmación y al reabrirlo lo recupera', async () => {
    const adapter = start()
    fireEvent.click(screen.getByRole('button', { name: /＋ Nuevo/ }))
    fireEvent.click(screen.getByRole('button', { name: /Lucía.*lucia.bosques/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir conversación →' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('heading', { name: 'Empieza la conversación' })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Perfil del interlocutor' }).textContent).toContain('Lucía')
    expect(screen.getByRole('region', { name: 'Lista de conversaciones' }).querySelectorAll('.msg-conversation')).toHaveLength(5)
    fireEvent.click(screen.getByRole('button', { name: /Ocultar conversación/ }))
    const hide = screen.getByRole('dialog', { name: '¿Ocultar esta conversación?' })
    expect(within(hide).getByText(/no se borrarán los mensajes/)).toBeTruthy()
    fireEvent.click(within(hide).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('heading', { name: 'Empieza la conversación' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Ocultar conversación/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar solo para mí' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('heading', { name: 'Selecciona una conversación' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Lucía.*Sin mensajes/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /＋ Nuevo/ }))
    fireEvent.click(screen.getByRole('button', { name: /Lucía.*lucia.bosques/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir conversación →' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('region', { name: 'Lista de conversaciones' }).querySelectorAll('.msg-conversation')).toHaveLength(5)
    expect(adapter).not.toHaveBeenCalled()
  })

  it('la fila de seguidos impide autochat y destinatarios no seguidos; vacío real es distinto', () => {
    const onOpen = vi.fn()
    const values = [
      { id: 7, nombre: 'Propia', nombreUsuario: 'propia', loSigo: true },
      { id: 8, nombre: 'Ajena', nombreUsuario: 'ajena', loSigo: false },
      { id: 9, nombre: 'Válida', nombreUsuario: 'valida', loSigo: true },
    ]
    render(<NewMessageModal demo userId={7} onClose={vi.fn()} onOpen={onOpen} onOpened={vi.fn()} demoUsers={values} />)
    expect(screen.queryByRole('button', { name: /Propia.*propia/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Ajena.*ajena/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Abrir conversación →' }).disabled).toBe(true)
    expect(onOpen).not.toHaveBeenCalled()
    cleanup()
    render(<NewMessageModal demo userId={7} onClose={vi.fn()} onOpen={onOpen} onOpened={vi.fn()} demoUsers={[]} />)
    expect(screen.getByRole('heading', { name: 'Todavía no sigues a nadie' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Abrir conversación →' }).disabled).toBe(true)
  })

  it('API 066: consulta paginada, reutiliza chat y solo confirma al responder; bloquea doble solicitud', async () => {
    let complete
    const followed = Array.from({ length: 20 }, (_, n) => ({ id: n + 101, nombre: `Seguido ${n + 1}`, nombreUsuario: `seg${n + 1}`, loSigo: true }))
    const adapter = vi.fn((config) => {
      if (config.url === '/api/usuarios/seguidos') return ok(config, page(config.params.page ? [{ id: 121, nombre: 'Extra', nombreUsuario: 'extra', loSigo: true }] : followed, config.params.page, 2, 20))
      if (config.method === 'post') return new Promise((resolve) => { complete = () => resolve(ok(config,
        { ...chat(15, 'Seguido 1'), interlocutor: { id: 101, nombre: 'Seguido 1', nombreUsuario: 'seg1', loSigo: true } }, 200)) })
      if (config.url === '/api/conversaciones') return ok(config, page([chat(15, 'Seguido 1')], 0, 1, 20))
      return ok(config, page([]))
    })
    start({ demo: false, adapter })
    fireEvent.click(screen.getByRole('button', { name: /＋ Nuevo/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cargar más personas' })).toBeTruthy())
    const followedRequest = adapter.mock.calls.find(([config]) => config.url === '/api/usuarios/seguidos')[0]
    expect(followedRequest.headers.get('Authorization')).toBe('Bearer jwt-mensajes')
    expect(followedRequest.params).toEqual({ page: 0, size: 20 })
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más personas' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Extra.*extra/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Seguido 1@seg1$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir conversación →' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abriendo…' }))
    await waitFor(() => expect(complete).toBeTypeOf('function'))
    expect(adapter.mock.calls.filter(([config]) => config.method === 'post')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Nuevo mensaje' })).toBeTruthy()
    expect(JSON.parse(adapter.mock.calls.find(([config]) => config.method === 'post')[0].data)).toEqual({ destinatarioId: 101 })
    // El servidor confirma el mismo chat preexistente: no se crea otro en React.
    complete()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('complementary', { name: 'Perfil del interlocutor' }).textContent).toContain('Seguido 1')
  })

  it('API: errores de creación y ocultación conservan modal, contexto y bandeja; luego se reintenta', async () => {
    let failCreate = true
    let failHide = true
    const adapter = vi.fn((config) => {
      if (config.url === '/api/usuarios/seguidos') return ok(config, page([{ id: 101, nombre: 'Persona 1', nombreUsuario: 'alias1', loSigo: true }], 0, 1, 20))
      if (config.url === '/api/conversaciones' && config.method === 'post') return failCreate ? fail(config, 500) : ok(config, chat(1), 200)
      if (config.url.includes('/ocultar')) return failHide ? fail(config, 403) : ok(config, '', 204)
      if (config.url === '/api/conversaciones') return ok(config, page([chat(1)], 0, 1, 20))
      return ok(config, page([]))
    })
    start({ demo: false, adapter })
    await waitFor(() => expect(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ }))
    fireEvent.click(screen.getByRole('button', { name: /＋ Nuevo/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Persona 1.*alias1/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Persona 1.*alias1/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Abrir conversación →' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No pudimos abrir'))
    expect(screen.getByRole('dialog', { name: 'Nuevo mensaje' })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Perfil del interlocutor' }).textContent).toContain('Persona 1')
    failCreate = false
    fireEvent.click(screen.getByRole('button', { name: 'Abrir conversación →' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /Ocultar conversación/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar solo para mí' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No tienes permisos'))
    expect(screen.getByRole('dialog', { name: '¿Ocultar esta conversación?' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Empieza la conversación' })).toBeTruthy()
    failHide = false
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar solo para mí' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('heading', { name: 'Selecciona una conversación' })).toBeTruthy()
    expect(adapter.mock.calls.filter(([config]) => config.url.includes('/ocultar')).at(-1)[0].method).toBe('patch')
  })

  it('API: busca seguidos en servidor, cancela búsqueda obsoleta y distingue vacío, error y reintento', async () => {
    let finishOld
    let error = false
    const adapter = vi.fn((config) => {
      if (config.url === '/api/conversaciones') return ok(config, page([], 0, 0, 20))
      if (error) return fail(config, 500)
      if (config.params.q === 'tardía') return new Promise((resolve) => { finishOld = () => resolve(ok(config, page([{ id: 101, nombre: 'Incorrecta', nombreUsuario: 'vieja', loSigo: true }], 0, 1, 20))) })
      if (config.params.q === 'correcta') return ok(config, page([{ id: 102, nombre: 'Correcta', nombreUsuario: 'nueva', loSigo: true }], 0, 1, 20))
      return ok(config, page([], 0, 0, 20))
    })
    start({ demo: false, adapter })
    fireEvent.click(screen.getByRole('button', { name: /＋ Nuevo/ }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Todavía no sigues a nadie' })).toBeTruthy())
    const search = screen.getByRole('searchbox', { name: 'Buscar usuarios seguidos' })
    fireEvent.change(search, { target: { value: 'tardía' } })
    await waitFor(() => expect(finishOld).toBeTypeOf('function'))
    const oldSignal = adapter.mock.calls.at(-1)[0].signal
    fireEvent.change(search, { target: { value: 'correcta' } })
    await waitFor(() => expect(screen.getByRole('button', { name: /Correcta.*nueva/ })).toBeTruthy())
    expect(oldSignal.aborted).toBe(true)
    finishOld()
    expect(screen.queryByRole('button', { name: /Incorrecta.*vieja/ })).toBeNull()
    expect(adapter.mock.calls.at(-1)[0].params).toEqual({ page: 0, size: 20, q: 'correcta' })
    error = true
    fireEvent.change(search, { target: { value: 'fallo' } })
    await waitFor(() => expect(screen.getByText('No pudimos cargar las personas que sigues')).toBeTruthy())
    error = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Todavía no sigues a nadie' })).toBeTruthy())
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('Ocultar en API no duplica PATCH, ignora Escape durante la solicitud y restaura foco al cancelar', async () => {
    let finish
    const adapter = vi.fn((config) => {
      if (config.url === '/api/conversaciones') return ok(config, page([chat(1)], 0, 1, 20))
      if (config.url.includes('/ocultar')) return new Promise((resolve) => { finish = () => resolve(ok(config, '', 204)) })
      return ok(config, page([]))
    })
    start({ demo: false, adapter })
    await waitFor(() => expect(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Persona 1.*Sin mensajes/ }))
    const trigger = screen.getByRole('button', { name: /Ocultar conversación/ })
    trigger.focus()
    fireEvent.click(trigger)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar solo para mí' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ocultando…' }))
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    expect(adapter.mock.calls.filter(([config]) => config.url.includes('/ocultar'))).toHaveLength(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: '¿Ocultar esta conversación?' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Empieza la conversación' })).toBeTruthy()
    finish()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('heading', { name: 'Selecciona una conversación' })).toBeTruthy()
  })
})
