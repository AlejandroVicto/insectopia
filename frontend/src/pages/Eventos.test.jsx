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

function LoginControl() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  return <button onClick={() => {
    setSession({ token: 'jwt-de-prueba', user: { id: 7, role: 'USUARIO', name: 'Usuaria Real', email: 'usuaria@ejemplo.test' } })
    navigate('/app/eventos')
  }}>Preparar sesión</button>
}

function renderEventos({ demo = false, adapter = vi.fn(), authenticated = true } = {}) {
  api.defaults.adapter = adapter
  render(
    <MemoryRouter initialEntries={[authenticated ? '/login' : '/app/eventos']}>
      <AuthProvider>
        <LoginControl />
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
  it('protege la ruta y no monta la pantalla sin sesión', async () => {
    renderEventos({ authenticated: false })
    await waitFor(() => expect(screen.getByText('Pantalla de login')).toBeTruthy())
    expect(screen.queryByRole('heading', { name: 'Eventos y Bioblitz Entomológicos' })).toBeNull()
  })

  it('renderiza encabezado, pestañas y una sola navegación', () => {
    renderEventos({ demo: true })
    expect(screen.getByRole('heading', { name: 'Eventos y Bioblitz Entomológicos' })).toBeTruthy()
    expect(screen.getByText('CIENCIA CIUDADANA & EXPEDICIONES')).toBeTruthy()
    expect(screen.getByText(/Participa en muestreos de campo/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '+ Proponer Evento' })).toBeTruthy()
    expect(screen.getAllByRole('tab')).toHaveLength(6)
    expect(screen.getByRole('tab', { name: 'Mis propuestas' })).toBeTruthy()
    expect(document.querySelectorAll('.private-shell > header')).toHaveLength(1)
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(1)
    expect(screen.queryByText('RED ENTOMOLÓGICA')).toBeNull()
  })

  it('las pestañas se navegan por teclado y los filtros sin contrato no simulan resultados', () => {
    renderEventos({ demo: true })
    const primera = screen.getByRole('tab', { name: 'Todos los eventos' })
    expect(primera.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(primera, { key: 'ArrowRight' })
    const segunda = screen.getByRole('tab', { name: 'Próximos 30 días' })
    expect(segunda.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(segunda)
    expect(screen.getByText(/No se muestran resultados simulados/)).toBeTruthy()
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
    fireEvent.click(screen.getByRole('button', { name: '+ Proponer Evento' }))
    expect(screen.getByRole('status').textContent).toMatch(/actividad 071/)
    fireEvent.click(screen.getAllByRole('button', { name: 'Inscribirme' })[0])
    expect(screen.getByRole('status').textContent).toMatch(/071 y 072/)
    expect(screen.queryByText('Inscrito')).toBeNull()
    expect(adapter).not.toHaveBeenCalled()

    const busqueda = screen.getByRole('searchbox', { name: 'Buscar eventos por nombre, taxón o localidad' })
    fireEvent.change(busqueda, { target: { value: 'Coleópteros' } })
    await waitFor(() => expect(screen.queryByRole('article', { name: /Bioblitz nocturno/ })).toBeNull())
    expect(screen.getByRole('article', { name: /Simposio Internacional/ })).toBeTruthy()
    expect(adapter).not.toHaveBeenCalled()
  })

  it('reinicia la paginación al cambiar de filtro y usa páginas del modo demo', async () => {
    renderEventos({ demo: true })
    expect(screen.getByText('Página 1 de 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('Página 2 de 3')).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por estado del evento' }), { target: { value: 'RECHAZADO' } })
    expect(screen.queryByRole('navigation', { name: 'Páginas de eventos' })).toBeNull()
    expect(screen.getByRole('article', { name: /Propuesta: expedición/ })).toBeTruthy()
  })

  it('sincroniza búsqueda y filtros con la URL sin enviar parámetros no confirmados', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([raw(1)])))
    renderEventos({ adapter })
    await waitFor(() => expect(screen.getByRole('article', { name: 'Evento: Evento 1' })).toBeTruthy())
    const busqueda = screen.getByRole('searchbox', { name: 'Buscar eventos por nombre, taxón o localidad' })
    fireEvent.change(busqueda, { target: { value: 'polillas' } })
    await waitFor(() => expect(screen.getByTestId('params').textContent).toContain('q=polillas'))
    expect(screen.getByText(/Los filtros están pendientes del contrato del backend 070/)).toBeTruthy()
    expect(adapter.mock.calls[0][0].params).toEqual({ page: 0, size: 10 })
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por fecha del evento' }), { target: { value: 'pasados' } })
    await waitFor(() => expect(screen.getByTestId('params').textContent).toContain('periodo=pasados'))
    expect(adapter.mock.calls.at(-1)[0].params).toEqual({ page: 0, size: 10 })
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
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por estado del evento' }), { target: { value: 'APROBADO' } })
    await waitFor(() => expect(screen.getByRole('article', { name: 'Evento: Evento 2' })).toBeTruthy())
    expect(primeraSenal.aborted).toBe(true)
    resolverPrimera()
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Evento: Evento 1' })).toBeNull())
  })

  it('muestra estados vacío y sin coincidencias', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([])))
    renderEventos({ adapter })
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Aún no hay eventos disponibles' })).toBeTruthy())
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar eventos por nombre, taxón o localidad' }), { target: { value: 'nada' } })
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
})
