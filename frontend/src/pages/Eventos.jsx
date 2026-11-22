import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adaptarPaginaEventos } from '../adapters/eventosAdapter'
import { CONTRATO_FILTROS_CONFIRMADO, consultarEventos, consultarMisPropuestas } from '../services/eventosService'
import { consultarEventosDemo, consultarMisPropuestasDemo } from '../data/eventosDemo'
import EventoCard, { AVISO_ACCIONES_ID } from '../components/eventos/EventoCard'
import EventoDetalle from '../components/eventos/EventoDetalle'
import EventosFiltros from '../components/eventos/EventosFiltros'
import EventosPaginacion from '../components/eventos/EventosPaginacion'
import EventosTabs from '../components/eventos/EventosTabs'
import { EventosCargando, EventosError, EventosVacio, FiltroPendiente } from '../components/eventos/EventosStates'
import './eventos.css'

export const EVENTOS_DEMO = import.meta.env.VITE_EVENTOS_MOCK === 'true'

const TABS = Object.freeze([
  { id: 'todos', label: 'Todos los eventos' },
  { id: 'proximos', label: 'Próximos 30 días', pendiente: true },
  { id: 'bioblitz', label: 'Bioblitz y muestreos', pendiente: true },
  { id: 'talleres', label: 'Talleres y simposios', pendiente: true },
  { id: 'participaciones', label: 'Mis participaciones', pendiente: true },
  { id: 'mis-propuestas', label: 'Mis propuestas' },
])

const ESTADOS_VALIDOS = ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO']

function clasificarError(error) {
  if (!error?.response) return 'red'
  if (error.response.status === 404) return 'no-disponible'
  return 'http'
}

export default function Eventos({ demo = EVENTOS_DEMO }) {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((opcion) => opcion.id === params.get('tab')) ? params.get('tab') : 'todos'
  const q = params.get('q')?.trim() ?? ''
  const estadoParam = params.get('estado') ?? ''
  const estado = ESTADOS_VALIDOS.includes(estadoParam) ? estadoParam : ''
  const periodoParam = params.get('periodo') ?? ''
  const periodo = ['futuros', 'pasados'].includes(periodoParam) ? periodoParam : ''
  const fechaDesdeParam = params.get('fechaDesde') ?? ''
  const fechaHastaParam = params.get('fechaHasta') ?? ''
  const fechaDesde = /^\d{4}-\d{2}-\d{2}$/.test(fechaDesdeParam) ? fechaDesdeParam : ''
  const fechaHasta = /^\d{4}-\d{2}-\d{2}$/.test(fechaHastaParam) ? fechaHastaParam : ''
  const paginaSolicitada = Number(params.get('page'))
  const page = Number.isSafeInteger(paginaSolicitada) && paginaSolicitada >= 0 ? paginaSolicitada : 0
  const size = demo ? 2 : 10

  const tabPendiente = Boolean(TABS.find((opcion) => opcion.id === tab)?.pendiente)
  const filtrosActivos = Boolean(q || estado || periodo || fechaDesde || fechaHasta)
  const [draft, setDraft] = useState({ value: q, committed: q })
  const busqueda = draft.committed === q ? draft.value : q
  const [retry, setRetry] = useState(0)
  const [resultado, setResultado] = useState(null)
  const [seleccionadoId, setSeleccionadoId] = useState(null)
  const [aviso, setAviso] = useState({ clave: '', texto: '' })
  const listaRef = useRef(null)

  const filtros = useMemo(() => ({ q, estado, periodo, fechaDesde, fechaHasta }),
    [q, estado, periodo, fechaDesde, fechaHasta])
  const claveNavegacion = JSON.stringify([tab, page, q, estado, periodo, fechaDesde, fechaHasta])
  const avisoVisible = aviso.clave === claveNavegacion ? aviso.texto : ''
  const key = JSON.stringify([demo, tab, q, estado, periodo, fechaDesde, fechaHasta, page, retry])

  const actualizarParams = useCallback((cambios, options) => {
    setParams((anterior) => {
      const siguiente = new URLSearchParams(anterior)
      for (const [campo, valor] of Object.entries(cambios)) {
        if (valor == null || valor === '' || (campo === 'page' && valor === 0)) siguiente.delete(campo)
        else siguiente.set(campo, String(valor))
      }
      return siguiente
    }, options)
  }, [setParams])

  useEffect(() => {
    if (busqueda.trim() === q) return undefined
    const temporizador = setTimeout(() => {
      const termino = busqueda.trim()
      actualizarParams({ q: termino || null, page: 0 }, { replace: true })
      setDraft({ value: termino, committed: termino })
    }, 350)
    return () => clearTimeout(temporizador)
  }, [busqueda, q, actualizarParams])

  function mostrarAviso(texto) {
    setAviso({ clave: claveNavegacion, texto })
  }

  const datosDemo = useMemo(() => {
    if (!demo || tabPendiente) return null
    return tab === 'mis-propuestas'
      ? consultarMisPropuestasDemo({ page, size })
      : consultarEventosDemo({ page, size, q, estado, periodo, fechaDesde, fechaHasta })
  }, [demo, tabPendiente, tab, page, size, q, estado, periodo, fechaDesde, fechaHasta])

  useEffect(() => {
    const controller = new AbortController()
    if (demo || tabPendiente) return () => controller.abort()

    const consultar = tab === 'mis-propuestas' ? consultarMisPropuestas : consultarEventos
    consultar({ page, size, filtros, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setResultado({ key, status: 'success', data: adaptarPaginaEventos(data) })
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResultado({ key, status: 'error', data: null, tipo: clasificarError(error) })
        }
      })
    return () => controller.abort()
  }, [demo, tabPendiente, tab, page, size, filtros, key, retry])

  const visible = demo
    ? { key, status: tabPendiente ? 'pendiente' : 'success', data: datosDemo }
    : resultado?.key === key ? resultado : { key, status: 'loading', data: null }
  const eventos = visible.status === 'success' ? visible.data.content : []
  const seleccionado = eventos.find((evento) => String(evento.id) === String(seleccionadoId)) ?? eventos[0] ?? null

  function limpiarFiltros() {
    actualizarParams({ q: null, estado: null, periodo: null, fechaDesde: null, fechaHasta: null, page: 0 })
    setDraft({ value: '', committed: '' })
  }

  function irAPagina(siguiente) {
    actualizarParams({ page: siguiente })
    listaRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="eventos">
      <div className="evt-layout">
        <div className="evt-principal">
          <header className="evt-cabecera">
            <p className="evt-eyebrow"><span aria-hidden="true" className="evt-eyebrow-dot" />CIENCIA CIUDADANA &amp; EXPEDICIONES</p>
            <div className="evt-cabecera-fila">
              <div className="evt-cabecera-copy">
                <h1 className="font-display">Eventos y Bioblitz Entomológicos</h1>
                <p>Participa en muestreos de campo, simposios de taxonomía y expediciones de ciencia comunitaria en tiempo real.</p>
              </div>
              <button
                type="button"
                className="evt-btn evt-btn--primary evt-proponer"
                aria-describedby={AVISO_ACCIONES_ID}
                onClick={() => mostrarAviso('El formulario para proponer eventos estará disponible cuando se integre la actividad 071.')}
              >
                + Proponer Evento
              </button>
            </div>
          </header>

          <EventosTabs tabs={TABS} value={tab} onChange={(siguiente) => actualizarParams({ tab: siguiente === 'todos' ? null : siguiente, page: 0 })} />

          {demo && <p className="evt-demo-label" role="note">Vista de demostración · datos ilustrativos, no registros de MySQL</p>}
          {filtrosActivos && !demo && !tabPendiente && !CONTRATO_FILTROS_CONFIRMADO && (
            <p role="note" className="evt-filter-pending">
              Los filtros están pendientes del contrato del backend 070; el listado no los aplica todavía.
            </p>
          )}
          <p id={AVISO_ACCIONES_ID} role="status" aria-live="polite" className={avisoVisible ? 'evt-aviso' : 'sr-only'}>{avisoVisible}</p>

          <div id="eventos-panel" role="tabpanel" aria-labelledby={`evt-tab-${tab}`} tabIndex={0} className="evt-tabpanel">
            {tabPendiente ? <FiltroPendiente etiqueta={TABS.find((opcion) => opcion.id === tab).label} /> : (
              <>
                <EventosFiltros
                  busqueda={busqueda}
                  onBusqueda={(valor) => setDraft({ value: valor, committed: q })}
                  estado={estado}
                  onEstado={(valor) => actualizarParams({ estado: valor, page: 0 })}
                  periodo={periodo}
                  onPeriodo={(valor) => actualizarParams({ periodo: valor, page: 0 })}
                  fechaDesde={fechaDesde}
                  fechaHasta={fechaHasta}
                  onFecha={(campo, valor) => actualizarParams({ [campo]: valor, page: 0 })}
                  onLimpiar={limpiarFiltros}
                />

                <div className="evt-resultados" ref={listaRef}>
                  {visible.status === 'success' && (
                    <p className="evt-contador">
                      Mostrando {eventos.length} de {visible.data.totalElements} {tab === 'mis-propuestas' ? 'propuestas' : 'eventos'}
                    </p>
                  )}
                  {visible.status === 'loading' && <EventosCargando />}
                  {visible.status === 'error' && <EventosError tipo={visible.tipo} onRetry={() => setRetry((valor) => valor + 1)} />}
                  {visible.status === 'success' && (eventos.length === 0
                    ? <EventosVacio filtrado={filtrosActivos} onLimpiar={limpiarFiltros} />
                    : <div className="evt-lista">
                      {eventos.map((evento) => (
                        <EventoCard
                          key={evento.id}
                          evento={evento}
                          seleccionado={String(seleccionado?.id) === String(evento.id)}
                          onVerDetalle={(elegido) => setSeleccionadoId(elegido.id)}
                          onInscribir={() => mostrarAviso('La inscripción estará disponible cuando se integren las actividades 071 y 072.')}
                        />
                      ))}
                    </div>)}
                  {visible.status === 'success' && (
                    <EventosPaginacion
                      page={visible.data.number}
                      totalPages={visible.data.totalPages}
                      first={visible.data.first}
                      last={visible.data.last}
                      onChange={irAPagina}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <EventoDetalle
          evento={seleccionado}
          onInscribir={() => mostrarAviso('La inscripción estará disponible cuando se integren las actividades 071 y 072.')}
        />
      </div>
    </div>
  )
}
