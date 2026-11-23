// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import { ROUTE_ROLES } from '../auth/roles'
import ProtectedRoute from '../auth/ProtectedRoute'
import PrivateLayout from '../layout/PrivateLayout'
import Eventos from './Eventos'

// El layout monta NotificacionesProvider; se aísla su contador global para que
// las aserciones del adaptador verifiquen únicamente las peticiones de Eventos.
vi.mock('../services/notificacionesService', async (original) => ({
  ...await original(), contarNoLeidas: () => Promise.resolve({ data: { count: 0 } }),
}))

const originalAdapter = api.defaults.adapter
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter })

const raw = (id, overrides = {}) => ({
  idEvento: id,
  titulo: `Evento ${id}`,
  descripcion: `Descripción del evento ${id}`,
  ubicacion: 'San José del Pacífico, Oaxaca',
  imagen: null,
  fechaInicio: '2027-01-05T09:00:00',
  fechaFin: '2027-01-07T18:00:00',
  cupoMaximo: 30,
  participantesConfirmados: 10,
  estado: 'APROBADO',
  ...overrides,
})

const pagina = (content, number = 0, totalPages = 1) => ({
  content, number, size: 10, totalPages, totalElements: content.length * Math.max(totalPages, 1),
  first: number === 0, last: number >= totalPages - 1,
})

const ok = (config, data) => Promise.resolve({ status: 200, data, config, headers: {} })
const fallo = (config, status) => Promise.reject(Object.assign(new Error('Fallo de prueba'), {
  config, response: status ? { status, config } : undefined,
}))

function ParamsProbe() {
  return <span data-testid="params">{useLocation().search}</span>
}

function LoginControl({ destino = '/app/eventos' }) {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  return <button onClick={() => {
    setSession({ token: 'jwt-de-prueba', user: { id: 7, role: 'USUARIO', name: 'Usuaria Real', email: 'usuaria@ejemplo.test' } })
    navigate(destino)
  }}>Preparar sesión</button>
}

function renderEventos({ demo = false, adapter = vi.fn(), authenticated = true, destino = '/app/eventos' } = {}) {
  api.defaults.adapter = adapter
  render(
    <MemoryRouter initialEntries={[authenticated ? '/login' : '/app/eventos']}>
      <AuthProvider>
        <LoginControl destino={destino} />
        <ParamsProbe />
        <Routes>
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.generales} />}>
            <Route element={<PrivateLayout />}>
              <Route path="/app" element={<p>Inicio existente</p>} />
              <Route path="/app/eventos" element={<Eventos demo={demo} />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
  if (authenticated) fireEvent.click(screen.getByRole('button', { name: 'Preparar sesión' }))
  return adapter
}

describe('Eventos 069', () => {
  it('abre desde la URL la ficha real de un evento y permite cerrarla', async () => {
    const adapter = vi.fn((config) => config.url === '/api/eventos/40'
      ? ok(config, raw(40)) : ok(config, pagina([])))
    renderEventos({ destino: '/app/eventos?evento=40', adapter })
    const modal = await screen.findByRole('dialog', { name: 'Detalles del evento' })
    expect(within(modal).getByText('Evento 40')).toBeTruthy()
    expect(adapter.mock.calls.some(([config]) => config.url === '/api/eventos/40')).toBe(true)
    fireEvent.click(within(modal).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Detalles del evento' })).toBeNull()
    expect(screen.getByTestId('params').textContent).toBe('')
  })

  it('protege la ruta y no monta la pantalla sin sesión', async () => {
    renderEventos({ authenticated: false })
    await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeTruthy())
    expect(screen.queryByRole('heading', { name: 'Eventos y Bioblitz Entomológicos' })).toBeNull()
  })

  it('renderiza encabezado, pestañas y una sola navegación', () => {
    renderEventos({ demo: true })
    expect(screen.getByRole('heading', { name: 'Eventos y Bioblitz Entomológicos' })).toBeTruthy()
    expect(screen.queryByText('CIENCIA CIUDADANA & EXPEDICIONES')).toBeNull()
    expect(screen.getByText(/Participa en muestreos de campo/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '+ Proponer Evento' })).toBeTruthy()
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    expect(screen.queryByRole('tab', { name: 'Bioblitz y muestreos' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Talleres y simposios' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Filtrar por estado del evento' })).toBeNull()
    expect(screen.queryByRole('option', { name: /Estado:/ })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Mis propuestas' })).toBeTruthy()
    expect(document.querySelectorAll('.private-shell > header')).toHaveLength(1)
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(1)
    expect(screen.queryByText('RED ENTOMOLÓGICA')).toBeNull()
  })

  it('las cuatro pestañas se navegan por teclado y próximos muestra solo el rango aplicable', () => {
    renderEventos({ demo: true })
    const primera = screen.getByRole('tab', { name: 'Todos los eventos' })
    expect(primera.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(primera, { key: 'ArrowRight' })
    const segunda = screen.getByRole('tab', { name: 'Próximos 30 días' })
    expect(segunda.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(segunda)
    expect(screen.getByRole('tabpanel')).toBeTruthy()
    expect(screen.queryByText(/No se muestran resultados simulados/)).toBeNull()
    fireEvent.keyDown(segunda, { key: 'Home' })
    expect(screen.getByRole('article', { name: /Evento: Bioblitz nocturno/ })).toBeTruthy()
  })

  it('muestra tarjetas sin fotografía y actualiza el panel de detalle al seleccionar', () => {
    renderEventos({ demo: true })
    expect(screen.getByRole('article', { name: 'Evento: Bioblitz nocturno Sierra Sur: polillas Sphingidae' })).toBeTruthy()
    expect(screen.getAllByRole('img', { name: 'Sin fotografía disponible' }).length).toBeGreaterThan(0)
    const detalle = screen.getByRole('complementary', { name: 'Detalle del evento' })
    expect(within(detalle).getByText('Bioblitz nocturno Sierra Sur: polillas Sphingidae')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver detalles' })[1])
    expect(within(detalle).getByText('Simposio Internacional de Coleópteros Neotropicales')).toBeTruthy()
    expect(within(detalle).queryByText('Coordenadas GPS')).toBeNull()
  })

  it('modo demo está etiquetado, filtra en local y jamás ejecuta escrituras', async () => {
    const adapter = renderEventos({ demo: true })
    expect(screen.getByText(/Vista de demostración/)).toBeTruthy()
    const inscritosAntes = screen.queryAllByText('Inscrito').length

    const proponer = screen.getByRole('button', { name: '+ Proponer Evento' })
    proponer.focus()
    fireEvent.click(proponer)
    expect(screen.getByRole('dialog', { name: 'Proponer nuevo evento / bioblitz' })).toBeTruthy()
    expect(screen.queryByText(/backend de eventos \(actividad 070\)/)).toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(proponer)

    const inscribir = screen.getAllByRole('button', { name: 'Inscribirme' })[0]
    fireEvent.click(inscribir)
    expect(screen.getByRole('dialog', { name: 'Confirmar inscripción' })).toBeTruthy()
    expect(screen.queryByText(/actividad 072/)).toBeNull()
    expect(screen.queryAllByText('Inscrito')).toHaveLength(inscritosAntes)
    expect(adapter).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    const busqueda = screen.getByRole('searchbox', { name: 'Buscar eventos por nombre, descripción o localidad' })
    fireEvent.change(busqueda, { target: { value: 'Coleópteros' } })
    await waitFor(() => expect(screen.queryByRole('article', { name: /Bioblitz nocturno/ })).toBeNull())
    expect(screen.getByRole('article', { name: /Simposio Internacional/ })).toBeTruthy()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('reinicia la paginación al cambiar de filtro y usa páginas del modo demo', async () => {
    renderEventos({ demo: true })
    expect(screen.getByText('Página 1 de 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Página 2 de 2')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2035-01-01' } })
    expect(screen.queryByRole('navigation', { name: 'Páginas de eventos' })).toBeNull()
    expect(screen.queryByRole('article')).toBeNull()
  })

  it('sincroniza búsqueda y filtros con la URL y los envía al backend', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([raw(1)])))
    renderEventos({ adapter })
    await waitFor(() => expect(screen.getByRole('article', { name: 'Evento: Evento 1' })).toBeTruthy())
    const busqueda = screen.getByRole('searchbox', { name: 'Buscar eventos por nombre, descripción o localidad' })
    fireEvent.change(busqueda, { target: { value: 'polillas' } })
    await waitFor(() => expect(screen.getByTestId('params').textContent).toContain('q=polillas'))
    expect(screen.queryByText(/Los filtros están pendientes/)).toBeNull()
    expect(adapter.mock.calls[0][0].params).toEqual({ page: 0, size: 10 })
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params).toEqual({ page: 0, size: 10, q: 'polillas' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por fecha del evento' }), { target: { value: 'pasados' } })
    await waitFor(() => expect(screen.getByTestId('params').textContent).toContain('periodo=pasados'))
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params).toEqual({ page: 0, size: 10, q: 'polillas', periodo: 'pasados' }))
  })

  it('carga páginas reales desde la API sin páginas ficticias', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([raw(config.params.page + 10)], config.params.page, 3)))
    renderEventos({ adapter })
    await waitFor(() => expect(screen.getByRole('article', { name: 'Evento: Evento 10' })).toBeTruthy())
    expect(screen.getByText('Página 1 de 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params.page).toBe(1))
    expect(screen.getByRole('article', { name: 'Evento: Evento 11' })).toBeTruthy()
    expect(screen.getByText('Página 2 de 3')).toBeTruthy()
  })

  it('cancela la solicitud anterior e ignora su respuesta tardía al cambiar de filtro', async () => {
    let resolverPrimera
    const adapter = vi.fn((config) => config.params.page === 0 && adapter.mock.calls.length === 1
      ? new Promise((resolve) => { resolverPrimera = () => resolve(ok(config, pagina([raw(1)]))) })
      : ok(config, pagina([raw(2)])))
    renderEventos({ adapter })
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1))
    const primeraSenal = adapter.mock.calls[0][0].signal
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por fecha del evento' }), { target: { value: 'futuros' } })
    await waitFor(() => expect(screen.getByRole('article', { name: 'Evento: Evento 2' })).toBeTruthy())
    expect(primeraSenal.aborted).toBe(true)
    resolverPrimera()
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Evento: Evento 1' })).toBeNull())
  })

  it('muestra estados vacío y sin coincidencias', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([])))
    renderEventos({ adapter })
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Aún no hay eventos disponibles' })).toBeTruthy())
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar eventos por nombre, descripción o localidad' }), { target: { value: 'nada' } })
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sin coincidencias de búsqueda' })).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Limpiar filtros' }).at(-1))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Aún no hay eventos disponibles' })).toBeTruthy())
  })

  it.each([
    [500, 'No pudimos cargar los eventos'],
    [404, 'Todavía no se pueden consultar los eventos'],
    [undefined, 'No se pudo conectar con el backend'],
  ])('error %s muestra mens claro y reintento', async (estado, titulo) => {
    let intento = 0
    const adapter = vi.fn((config) => ++intento === 1 ? fallo(config, estado) : ok(config, pagina([raw(5)])))
    renderEventos({ adapter })
    await waitFor(() => expect(screen.getByRole('heading', { name: titulo })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByRole('article', { name: 'Evento: Evento 5' })).toBeTruthy())
  })

  it('consulta mis propuestas en el endpoint propuesto y muestra su estado', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([
      raw(6, { estado: 'PENDIENTE' }), raw(7, { estado: 'RECHAZADO' }),
    ])))
    renderEventos({ adapter })
    fireEvent.click(screen.getByRole('tab', { name: 'Mis propuestas' }))
    await waitFor(() => expect(adapter.mock.calls[0][0].url).toBe('/api/eventos/mis-propuestas'))
    expect(screen.getAllByText('Pendiente de aprobación').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rechazado').length).toBeGreaterThan(0)
  })

  it('consulta próximos y mis participaciones en el servidor sin recuperar pestañas eliminadas', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([raw(14, { estadoInscripcion: 'INSCRITO' })])))
    renderEventos({ adapter })
    await waitFor(() => expect(screen.getByRole('article', { name: 'Evento: Evento 14' })).toBeTruthy())
    fireEvent.click(screen.getByRole('tab', { name: 'Próximos 30 días' }))
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params.proximos).toBe(true))
    expect(adapter.mock.calls.at(-1)[0].url).toBe('/api/eventos')
    expect(screen.queryByRole('combobox', { name: 'Filtrar por estado del evento' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Mis participaciones' }))
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].url).toBe('/api/eventos/mis-participaciones'))
    expect(screen.getAllByText('Inscrito').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('tab')).toHaveLength(4)
  })

  it('filtra en backend y limpiar filtros conserva la pestaña y vuelve a página cero', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([raw(16)])))
    renderEventos({ adapter })
    fireEvent.click(screen.getByRole('tab', { name: 'Mis propuestas' }))
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado del evento' }).value).toBe('')
    expect(screen.getByRole('option', { name: 'Estado: Sin filtrar' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Estado: Todos' })).toBeNull()
    fireEvent.change(screen.getByRole('searchbox', { name: /Buscar eventos por nombre/ }), { target: { value: 'polillas' } })
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params.q).toBe('polillas'))
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por estado del evento' }), { target: { value: 'RECHAZADO' } })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2027-01-01' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2027-12-31' } })
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params).toMatchObject({
      page: 0, q: 'polillas', estado: 'RECHAZADO', fechaDesde: '2027-01-01', fechaHasta: '2027-12-31',
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].params).toEqual({ page: 0, size: 10 }))
    expect(screen.getByTestId('params').textContent).toContain('tab=mis-propuestas')
    expect(screen.getByRole('searchbox', { name: /Buscar eventos por nombre/ }).value).toBe('')
  })

  it('actualiza cupo y estado sólo tras POST/DELETE confirmados y consulta la página de nuevo', async () => {
    let inscrito = false
    let confirmarPost
    const adapter = vi.fn((config) => {
      if (config.method === 'post') return new Promise((resolve) => {
        confirmarPost = () => { inscrito = true; resolve(ok(config, {})) }
      })
      if (config.method === 'delete') { inscrito = false; return ok(config, {}) }
      return ok(config, pagina([raw(18, {
        participantesConfirmados: inscrito ? 11 : 10,
        estadoInscripcion: inscrito ? 'INSCRITO' : null,
      })]))
    })
    renderEventos({ adapter })
    await waitFor(() => expect(screen.getByRole('article', { name: 'Evento: Evento 18' })).toBeTruthy())
    fireEvent.click(screen.getAllByRole('button', { name: 'Inscribirme' })[0])
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo explícitamente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscripción' }))
    await waitFor(() => expect(adapter.mock.calls.at(-1)[0].url).toBe('/api/eventos/18/participantes/me'))
    expect(screen.queryByText('11 / 30')).toBeNull()
    confirmarPost()
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Cancelar inscripción' }).length).toBeGreaterThan(0))
    expect(adapter.mock.calls.at(-1)[0].url).toBe('/api/eventos')
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar inscripción' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }))
    await waitFor(() => expect(adapter.mock.calls.some(([config]) => config.method === 'delete'
      && config.url === '/api/eventos/18/participantes/me')).toBe(true))
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Inscribirme' }).length).toBeGreaterThan(0))
  })

  it('muestra estados de cupo completo, inscripción y evento pasado sólo con datos del servidor', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([
      raw(8, { participantesConfirmados: 30 }),
      raw(9, { estadoInscripcion: 'INSCRITO' }),
      raw(10, { fechaInicio: '2020-01-05T09:00:00', fechaFin: '2020-01-07T18:00:00' }),
    ])))
    renderEventos({ adapter })
    await waitFor(() => expect(screen.getByText('Cupo completo')).toBeTruthy())
    expect(screen.getAllByText('Inscrito').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Finalizado').length).toBeGreaterThan(0)
  })

  it('usa el tema oscuro y el desplazamiento del layout sin desbordar el encabezado', () => {
    renderEventos({ demo: true })
    const shell = document.querySelector('.private-shell')
    expect(shell.classList.contains('private-shell--eventos')).toBe(true)
    expect(document.getElementById('private-content').classList.contains('bg-[#111713]')).toBe(true)
    expect(document.getElementById('private-content').classList.contains('overflow-y-auto')).toBe(false)
    expect(document.getElementById('eventos-panel').classList.contains('evt-tabpanel')).toBe(true)
    expect(document.querySelector('.evt-resultados')).toBeTruthy()
    expect(shell.querySelector('header').contains(document.querySelector('.evt-lista'))).toBe(false)
    expect(shell.querySelector('aside').contains(document.querySelector('.evt-lista'))).toBe(false)
  })

  it('ya no ofrece filtros ni campos que no existen en el modelo persistente', () => {
    renderEventos({ demo: true })
    const filtros = screen.getByRole('region', { name: 'Búsqueda y filtros de eventos' })
    expect(within(filtros).queryByText(/Modalidad/i)).toBeNull()
    expect(within(filtros).queryByText(/Categoría\s*\/\s*tipo/i)).toBeNull()
    expect(within(filtros).queryByPlaceholderText(/taxón objetivo/i)).toBeNull()
    expect(screen.queryByText(/Coordenadas GPS, mapa de monitoreo, equipo técnico y etiquetas taxonómicas/)).toBeNull()
    const detalle = screen.getByRole('complementary', { name: 'Detalle del evento' })
    expect(within(detalle).queryByText(/Coordenadas GPS|mapa de monitoreo|equipo técnico|etiquetas taxonómicas/i)).toBeNull()
  })

  it('muestra el motivo de rechazo únicamente en una propuesta propia rechazada', async () => {
    renderEventos({ demo: true })
    fireEvent.click(screen.getByRole('tab', { name: 'Mis propuestas' }))
    const rechazada = screen.getAllByRole('article')
      .find((articulo) => articulo.getAttribute('aria-label')?.includes('expedición'))
    expect(rechazada).toBeTruthy()
    fireEvent.click(within(rechazada).getByRole('button', { name: 'Ver detalles' }))
    const detalle = screen.getByRole('complementary', { name: 'Detalle del evento' })
    expect(within(detalle).getByRole('region', { name: 'Motivo del rechazo' })).toBeTruthy()
    expect(within(detalle).getByText(/permiso de colecta científica vigente/)).toBeTruthy()

    cleanup()
    const adapter = vi.fn((config) => ok(config, pagina([
      raw(11, { estado: 'RECHAZADO', motivoResolucion: 'Motivo privado de otro proponente' }),
    ])))
    renderEventos({ adapter })
    await waitFor(() => expect(screen.getByRole('article', { name: 'Evento: Evento 11' })).toBeTruthy())
    expect(screen.queryByText('Motivo privado de otro proponente')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Motivo del rechazo' })).toBeNull()
  })

  it('conecta los cinco modales desde un único gestor en la página', () => {
    renderEventos({ demo: true })
    fireEvent.click(screen.getByRole('button', { name: '+ Proponer Evento' }))
    expect(screen.getByRole('dialog', { name: 'Proponer nuevo evento / bioblitz' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver detalles' })[0])
    expect(screen.getByRole('dialog', { name: 'Detalles del evento' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.click(screen.getByRole('tab', { name: 'Mis propuestas' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0])
    expect(screen.getByRole('dialog', { name: 'Editar propuesta' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.click(screen.getByRole('tab', { name: 'Todos los eventos' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Inscribirme' })[0])
    expect(screen.getByRole('dialog', { name: 'Confirmar inscripción' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar inscripción' })[0])
    expect(screen.getByRole('dialog', { name: 'Cancelar inscripción' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
