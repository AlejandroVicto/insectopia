import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adaptarPaginaEventos } from '../adapters/eventosAdapter'
import { CONTRATO_FILTROS_CONFIRMADO, consultarEventos, consultarMisParticipaciones, consultarMisPropuestas, operacionDemo } from '../services/eventosService'
import { consultarEventosDemo, consultarMisPropuestasDemo } from '../data/eventosDemo'
import { useAuth } from '../auth/useAuth'
import EventoCard from '../components/eventos/EventoCard'
import EventoDetalle from '../components/eventos/EventoDetalle'
import EventosFiltros from '../components/eventos/EventosFiltros'
import EventosPaginacion from '../components/eventos/EventosPaginacion'
import EventosTabs from '../components/eventos/EventosTabs'
import { EventosCargando, EventosError, EventosVacio } from '../components/eventos/EventosStates'
import ProponerEventoModal from '../components/eventos/ProponerEventoModal'
import EditarEventoModal from '../components/eventos/EditarEventoModal'
import EventoDetallesModal from '../components/eventos/EventoDetallesModal'
import ConfirmarInscripcionModal from '../components/eventos/ConfirmarInscripcionModal'
import CancelarInscripcionModal from '../components/eventos/CancelarInscripcionModal'
import './eventos.css'

export const EVENTOS_DEMO = import.meta.env.VITE_EVENTOS_MOCK === 'true'

const TABS = Object.freeze([
  { id: 'todos', label: 'Todos los eventos' },
  { id: 'proximos', label: 'Próximos 30 días' },
  { id: 'participaciones', label: 'Mis participaciones' },
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
  const { user } = useAuth()
  const tab = TABS.some((opcion) => opcion.id === params.get('tab')) ? params.get('tab') : 'todos'
  const q = params.get('q')?.trim() ?? ''
  const estadoParam = params.get('estado') ?? ''
  const estado = ESTADOS_VALIDOS.includes(estadoParam)
    && (tab === 'mis-propuestas' || tab === 'participaciones' || estadoParam === 'APROBADO') ? estadoParam : ''
  const periodoParam = params.get('periodo') ?? ''
  const periodo = ['futuros', 'pasados'].includes(periodoParam) ? periodoParam : ''
  const fechaDesdeParam = params.get('fechaDesde') ?? ''
  const fechaHastaParam = params.get('fechaHasta') ?? ''
  const fechaDesde = /^\d{4}-\d{2}-\d{2}$/.test(fechaDesdeParam) ? fechaDesdeParam : ''
  const fechaHasta = /^\d{4}-\d{2}-\d{2}$/.test(fechaHastaParam) ? fechaHastaParam : ''
  const paginaSolicitada = Number(params.get('page'))
  const page = Number.isSafeInteger(paginaSolicitada) && paginaSolicitada >= 0 ? paginaSolicitada : 0
  const size = demo ? 2 : 10

  const filtrosActivos = Boolean(q || estado || periodo || fechaDesde || fechaHasta)
  const [draft, setDraft] = useState({ value: q, committed: q })
  const busqueda = draft.committed === q ? draft.value : q
  const [retry, setRetry] = useState(0)
  const [resultado, setResultado] = useState(null)
  const [seleccionadoId, setSeleccionadoId] = useState(null)
  const [modal, setModal] = useState(null)
  const listaRef = useRef(null)

  const filtros = useMemo(() => ({ q, estado, periodo, fechaDesde, fechaHasta }),
    [q, estado, periodo, fechaDesde, fechaHasta])
  const opcionesAdaptacion = useMemo(() => ({
    idUsuario: user?.id ?? null,
    propia: tab === 'mis-propuestas',
  }), [user?.id, tab])
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

  const abrirModal = useCallback((tipo, evento) => {
    setModal({ tipo, eventoId: evento?.id ?? null })
  }, [])

  const cerrarModal = useCallback(() => setModal(null), [])

  const recargar = useCallback(() => setRetry((valor) => valor + 1), [])

  const trasProponer = useCallback(() => {
    actualizarParams({ tab: 'mis-propuestas', page: 0 })
    setRetry((valor) => valor + 1)
  }, [actualizarParams])

  useEffect(() => {
    if (busqueda.trim() === q) return undefined
    const temporizador = setTimeout(() => {
      const termino = busqueda.trim()
      actualizarParams({ q: termino || null, page: 0 }, { replace: true })
      setDraft({ value: termino, committed: termino })
    }, 350)
    return () => clearTimeout(temporizador)
  }, [busqueda, q, actualizarParams])

  const datosDemo = useMemo(() => {
    if (!demo) return null
    return tab === 'mis-propuestas'
      ? consultarMisPropuestasDemo({ page, size, q, estado, periodo, fechaDesde, fechaHasta })
      : consultarEventosDemo({ page, size, q, estado, periodo, fechaDesde, fechaHasta, tab })
  }, [demo, tab, page, size, q, estado, periodo, fechaDesde, fechaHasta])

  useEffect(() => {
    const controller = new AbortController()
    if (demo) return () => controller.abort()

    const consultar = tab === 'mis-propuestas' ? consultarMisPropuestas
      : tab === 'participaciones' ? consultarMisParticipaciones : consultarEventos
    consultar({ page, size, filtros, proximos: tab === 'proximos', signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setResultado({
            key,
            status: 'success',
            data: adaptarPaginaEventos(data, opcionesAdaptacion),
          })
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResultado({ key, status: 'error', data: null, tipo: clasificarError(error) })
        }
      })
    return () => controller.abort()
  }, [demo, tab, page, size, filtros, key, retry, opcionesAdaptacion])

  const visible = demo
    ? { key, status: 'success', data: datosDemo }
    : resultado?.key === key ? resultado : { key, status: 'loading', data: null }
  const eventos = visible.status === 'success' ? visible.data.content : []
  const seleccionado = eventos.find((evento) => String(evento.id) === String(seleccionadoId)) ?? eventos[0] ?? null
  const eventoModal = modal?.eventoId != null
    ? eventos.find((evento) => String(evento.id) === String(modal.eventoId)) ?? seleccionado
    : null

  function limpiarFiltros() {
    actualizarParams({ q: null, estado: null, periodo: null, fechaDesde: null, fechaHasta: null, page: 0 })
    setDraft({ value: '', committed: '' })
  }

  function irAPagina(siguiente) {
    actualizarParams({ page: siguiente })
    listaRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  function verDetalle(evento) {
    setSeleccionadoId(evento.id)
    abrirModal('detalles', evento)
  }

  return (
    <div className="eventos">
      <div className="evt-layout">
        <div className="evt-principal">
          <header className="evt-cabecera">
            <div className="evt-cabecera-fila">
              <div className="evt-cabecera-copy">
                <h1 className="font-display">Eventos y Bioblitz Entomológicos</h1>
                <p>Participa en muestreos de campo, simposios de taxonomía y expediciones de ciencia comunitaria en tiempo real.</p>
              </div>
              <button
                type="button"
                className="evt-btn evt-btn--primary evt-proponer"
                onClick={() => abrirModal('proponer')}
              >
                + Proponer Evento
              </button>
            </div>
          </header>

          <EventosTabs tabs={TABS} value={tab} onChange={(siguiente) => actualizarParams({
            tab: siguiente === 'todos' ? null : siguiente, page: 0,
            estado: siguiente === 'todos' || siguiente === 'proximos' ? null : estado,
            periodo: siguiente === 'proximos' ? null : periodo,
          })} />

          {demo && <p className="evt-demo-label" role="note">Vista de demostración · datos ilustrativos, no registros de MySQL</p>}
          {filtrosActivos && !demo && !CONTRATO_FILTROS_CONFIRMADO && (
            <p role="note" className="evt-filter-pending">
              Los filtros están pendientes del contrato del backend 070; el listado no los aplica todavía.
            </p>
          )}

          <div id="eventos-panel" role="tabpanel" aria-labelledby={`evt-tab-${tab}`} tabIndex={0} className="evt-tabpanel">
              <>
                <EventosFiltros
                  busqueda={busqueda}
                  onBusqueda={(valor) => setDraft({ value: valor, committed: q })}
                  estado={estado}
                  soloAprobados={tab === 'todos' || tab === 'proximos'}
                  proximos={tab === 'proximos'}
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
                          onVerDetalle={verDetalle}
                          onInscribir={(elegido) => abrirModal('inscribir', elegido)}
                          onEditar={(elegido) => abrirModal('editar', elegido)}
                          onCancelarInscripcion={(elegido) => abrirModal('cancelar', elegido)}
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
          </div>
        </div>

        <EventoDetalle
          evento={seleccionado}
          onInscribir={(elegido) => abrirModal('inscribir', elegido)}
          onEditar={(elegido) => abrirModal('editar', elegido)}
          onCancelarInscripcion={(elegido) => abrirModal('cancelar', elegido)}
        />
      </div>

      {modal?.tipo === 'proponer' && (
        <ProponerEventoModal onClose={cerrarModal} onSuccess={trasProponer}
          onGuardar={demo ? () => operacionDemo() : undefined} />
      )}
      {modal?.tipo === 'editar' && (
        <EditarEventoModal evento={eventoModal} onClose={cerrarModal} onSuccess={recargar}
          onGuardar={demo ? () => operacionDemo() : undefined}
          onQuitarImagen={demo ? () => operacionDemo() : undefined} />
      )}
      {modal?.tipo === 'detalles' && (
        <EventoDetallesModal evento={eventoModal} onClose={cerrarModal} />
      )}
      {modal?.tipo === 'inscribir' && (
        <ConfirmarInscripcionModal evento={eventoModal} onClose={cerrarModal} onSuccess={recargar}
          onConfirmar={demo ? () => operacionDemo() : undefined} />
      )}
      {modal?.tipo === 'cancelar' && (
        <CancelarInscripcionModal evento={eventoModal} onClose={cerrarModal} onSuccess={recargar}
          onConfirmar={demo ? () => operacionDemo() : undefined} />
      )}
    </div>
  )
}
