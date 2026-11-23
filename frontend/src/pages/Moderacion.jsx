import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { listarPropuestas, aprobarPropuesta, rechazarPropuesta } from '../services/moderacionService'
import { listarReportes, resolverReporte } from '../services/reportesService'
import { suscribirseAReportesCreados } from '../services/reportesEventos'
import { mensajeErrorApi } from '../services/erroresApi'
import ModeracionTabs from '../components/moderacion/ModeracionTabs'
import ModeracionFiltros from '../components/moderacion/ModeracionFiltros'
import ModeracionTabla from '../components/moderacion/ModeracionTabla'
import ModeracionPaginacion from '../components/moderacion/ModeracionPaginacion'
import { ModeracionCargando, ModeracionError, ModeracionVacio } from '../components/moderacion/ModeracionEstados'
import RevisarPropuestaModal from '../components/moderacion/RevisarPropuestaModal'
import AprobarPropuestaModal from '../components/moderacion/AprobarPropuestaModal'
import RechazarPropuestaModal from '../components/moderacion/RechazarPropuestaModal'
import ResolverReporteModal from '../components/moderacion/ResolverReporteModal'
import './moderacion.css'

const TAMANO_PAGINA = 10
const FILTROS_EVENTOS_INICIALES = Object.freeze({
  q: '', estado: 'PENDIENTE', fechaDesde: '', fechaHasta: '',
})
const FILTROS_REPORTES_INICIALES = Object.freeze({ estado: '' })
const ESTADOS_REPORTE_REVISABLES = ['PENDIENTE', 'EN_REVISION']

const listaInicial = () => ({ estado: 'cargando', datos: null, error: '' })

export default function Moderacion() {
  const { role } = useAuth()
  const [seccion, setSeccion] = useState('eventos')
  const [filtrosEventos, setFiltrosEventos] = useState({ ...FILTROS_EVENTOS_INICIALES })
  const [busquedaDraft, setBusquedaDraft] = useState('')
  const [paginaEventos, setPaginaEventos] = useState(0)
  const [filtrosReportes, setFiltrosReportes] = useState({ ...FILTROS_REPORTES_INICIALES })
  const [paginaReportes, setPaginaReportes] = useState(0)
  const [revision, setRevision] = useState(0)
  const [eventos, setEventos] = useState(listaInicial)
  const [reportes, setReportes] = useState(listaInicial)
  const [resumen, setResumen] = useState({
    eventosPendientes: null, reportes: null, reportesPendientes: null, error: '',
  })
  const [modal, setModal] = useState(null)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    const termino = busquedaDraft.trim()
    if (termino === filtrosEventos.q) return undefined
    const temporizador = setTimeout(() => {
      setEventos({ estado: 'cargando', datos: null, error: '' })
      setFiltrosEventos((anterior) => ({ ...anterior, q: termino }))
      setPaginaEventos(0)
    }, 350)
    return () => clearTimeout(temporizador)
  }, [busquedaDraft, filtrosEventos.q])

  useEffect(() => {
    let activo = true
    const control = new AbortController()
    Promise.all([
      listarPropuestas({ page: 0, size: 1, estado: 'PENDIENTE', signal: control.signal }),
      listarReportes({ page: 0, size: 1, signal: control.signal }),
      listarReportes({ page: 0, size: 1, estado: 'PENDIENTE', signal: control.signal }),
    ]).then(([pendientes, todos, reportesPendientes]) => {
      if (!activo) return
      setResumen({
        eventosPendientes: pendientes?.data?.totalElements ?? 0,
        reportes: todos?.data?.totalElements ?? 0,
        reportesPendientes: reportesPendientes?.data?.totalElements ?? 0,
        error: '',
      })
    }).catch((fallo) => {
      if (activo && !control.signal.aborted) {
        setResumen((anterior) => ({ ...anterior, error: mensajeErrorApi(fallo) }))
      }
    })
    return () => { activo = false; control.abort() }
  }, [revision])

  useEffect(() => {
    let activo = true
    const control = new AbortController()
    listarPropuestas({
      page: paginaEventos,
      size: TAMANO_PAGINA,
      ...filtrosEventos,
      signal: control.signal,
    }).then(({ data }) => {
      if (!activo) return
      const totalPaginas = Number.isSafeInteger(data?.totalPages) ? data.totalPages : 0
      if (paginaEventos > 0 && Array.isArray(data?.content) && data.content.length === 0 && paginaEventos >= totalPaginas) {
        setEventos({ estado: 'cargando', datos: null, error: '' })
        setPaginaEventos(Math.max(totalPaginas - 1, 0))
        return
      }
      setEventos({ estado: 'listo', datos: data, error: '' })
    }).catch((fallo) => {
      if (activo && !control.signal.aborted) {
        setEventos({ estado: 'error', datos: null, error: mensajeErrorApi(fallo) })
      }
    })
    return () => { activo = false; control.abort() }
  }, [filtrosEventos, paginaEventos, revision])

  useEffect(() => {
    let activo = true
    const control = new AbortController()
    listarReportes({
      page: paginaReportes,
      size: TAMANO_PAGINA,
      ...filtrosReportes,
      signal: control.signal,
    }).then(({ data }) => {
      if (!activo) return
      const totalPaginas = Number.isSafeInteger(data?.totalPages) ? data.totalPages : 0
      if (paginaReportes > 0 && Array.isArray(data?.content) && data.content.length === 0 && paginaReportes >= totalPaginas) {
        setReportes({ estado: 'cargando', datos: null, error: '' })
        setPaginaReportes(Math.max(totalPaginas - 1, 0))
        return
      }
      setReportes({ estado: 'listo', datos: data, error: '' })
    }).catch((fallo) => {
      if (activo && !control.signal.aborted) {
        setReportes({ estado: 'error', datos: null, error: mensajeErrorApi(fallo) })
      }
    })
    return () => { activo = false; control.abort() }
  }, [filtrosReportes, paginaReportes, revision])

  const onFiltroEventos = useCallback((campo, valor) => {
    setEventos({ estado: 'cargando', datos: null, error: '' })
    setFiltrosEventos((anterior) => ({ ...anterior, [campo]: valor }))
    setPaginaEventos(0)
  }, [])

  const onFiltroReportes = useCallback((campo, valor) => {
    setReportes({ estado: 'cargando', datos: null, error: '' })
    setFiltrosReportes((anterior) => ({ ...anterior, [campo]: valor }))
    setPaginaReportes(0)
  }, [])

  const irAPaginaEventos = useCallback((siguiente) => {
    setEventos({ estado: 'cargando', datos: null, error: '' })
    setPaginaEventos(siguiente)
  }, [])

  const irAPaginaReportes = useCallback((siguiente) => {
    setReportes({ estado: 'cargando', datos: null, error: '' })
    setPaginaReportes(siguiente)
  }, [])

  const trasDecision = useCallback((mensaje) => {
    setAviso(mensaje)
    setModal(null)
    setEventos({ estado: 'cargando', datos: null, error: '' })
    setReportes({ estado: 'cargando', datos: null, error: '' })
    setRevision((valor) => valor + 1)
  }, [])

  // Un reporte creado en otra pantalla (o pestaña) debe aparecer en la bandeja:
  // se limpian filtro y página para que nunca quede oculto por un estado distinto.
  const alCrearReporte = useCallback(() => {
    setReportes({ estado: 'cargando', datos: null, error: '' })
    setFiltrosReportes({ ...FILTROS_REPORTES_INICIALES })
    setPaginaReportes(0)
    setRevision((valor) => valor + 1)
  }, [])

  useEffect(() => suscribirseAReportesCreados(alCrearReporte), [alCrearReporte])

  function actualizarBandeja() {
    if (seccion === 'eventos') setEventos({ estado: 'cargando', datos: null, error: '' })
    else setReportes({ estado: 'cargando', datos: null, error: '' })
    setRevision((valor) => valor + 1)
  }

  const datosVisibles = seccion === 'eventos' ? eventos : reportes
  const paginaActual = seccion === 'eventos' ? paginaEventos : paginaReportes
  const contenido = Array.isArray(datosVisibles.datos?.content) ? datosVisibles.datos.content : []
  const totalPaginas = Number.isSafeInteger(datosVisibles.datos?.totalPages) ? datosVisibles.datos.totalPages : 0
  const filtrado = seccion === 'eventos'
    ? Boolean(filtrosEventos.q || filtrosEventos.fechaDesde || filtrosEventos.fechaHasta || filtrosEventos.estado !== 'PENDIENTE')
    : Boolean(filtrosReportes.estado)
  const irAPagina = seccion === 'eventos' ? irAPaginaEventos : irAPaginaReportes

  const textoResumen = useMemo(() => ({
    eventos: resumen.eventosPendientes ?? '—',
    reportes: resumen.reportes ?? '—',
    pendientes: resumen.reportesPendientes ?? '—',
  }), [resumen])

  function limpiarFiltros() {
    if (seccion === 'eventos') {
      setEventos({ estado: 'cargando', datos: null, error: '' })
      setBusquedaDraft('')
      setFiltrosEventos({ ...FILTROS_EVENTOS_INICIALES })
      setPaginaEventos(0)
    } else {
      setReportes({ estado: 'cargando', datos: null, error: '' })
      setFiltrosReportes({ ...FILTROS_REPORTES_INICIALES })
      setPaginaReportes(0)
    }
  }

  function reintentar() {
    if (seccion === 'eventos') setEventos({ estado: 'cargando', datos: null, error: '' })
    else setReportes({ estado: 'cargando', datos: null, error: '' })
    setRevision((valor) => valor + 1)
  }

  function revisar(recurso) {
    setAviso('')
    if (seccion === 'eventos') {
      if (recurso.estado !== 'PENDIENTE') return
      setModal({ tipo: 'revisar', recurso })
    } else {
      if (!ESTADOS_REPORTE_REVISABLES.includes(recurso.estado)) return
      setModal({ tipo: 'resolver', recurso })
    }
  }

  function elegirDecision(tipo) {
    setModal((anterior) => (anterior ? { ...anterior, tipo } : anterior))
  }

  return (
    <div className="moderacion">
      <div className="mod-contenedor">
        <header className="mod-cabecera">
          <div>
            <h1 className="font-display">Moderación · Eventos y reportes</h1>
            <p>Resolver propuestas de eventos y reportes de publicaciones; sin asignar roles.</p>
          </div>
          <p className="mod-cabecera-rol">Acceso: MODERADOR · ADMINISTRADOR</p>
        </header>

        {resumen.error && (
          <p role="alert" className="mod-aviso-error">
            No se pudieron actualizar los conteos: {resumen.error}
          </p>
        )}
        {aviso && (
          <div role="status" className="mod-aviso-exito">
            <span>{aviso}</span>
            <button type="button" aria-label="Cerrar notificación" onClick={() => setAviso('')}>×</button>
          </div>
        )}

        <section aria-label="Resumen de moderación" className="mod-cards">
          <article className="mod-card">
            <p className="mod-card-titulo">Eventos pendientes</p>
            <p className="mod-card-numero">{textoResumen.eventos}</p>
            <p className="mod-card-copy">Aprobar o rechazar propuestas</p>
            <p className="mod-card-detalle">eventos.estado = PENDIENTE</p>
          </article>
          <article className="mod-card">
            <p className="mod-card-titulo">Reportes</p>
            <p className="mod-card-numero">{textoResumen.reportes}</p>
            <p className="mod-card-copy">Motivo, estado y resolución</p>
            <p className="mod-card-detalle">{textoResumen.pendientes} pendientes · reportes · publicaciones</p>
          </article>
          <article className="mod-card mod-card--permisos">
            <p className="mod-card-titulo">Permisos</p>
            <p className="mod-card-numero mod-card-numero--texto">Sin administración de usuarios</p>
            <p className="mod-card-copy">Rol de acceso: {role || 'MODERADOR'} · ADMINISTRADOR</p>
            <p className="mod-card-detalle">roles · MODERADOR / ADMINISTRADOR</p>
          </article>
        </section>

        <section aria-label="Bandeja de revisión" className="mod-bandeja">
          <div className="mod-bandeja-cabecera">
            <div>
              <h2 className="font-display">Bandeja de revisión</h2>
            </div>
            <div className="mod-bandeja-acciones">
              <ModeracionTabs value={seccion} onChange={setSeccion} />
              <button
                type="button"
                className="mod-btn mod-btn--actualizar"
                onClick={actualizarBandeja}
                aria-label="Actualizar bandeja de revisión"
                title="Recargar los datos desde el backend"
              >
                Actualizar
              </button>
            </div>
          </div>

          <ModeracionFiltros
            seccion={seccion}
            filtrosEventos={filtrosEventos}
            busqueda={busquedaDraft}
            onBusqueda={setBusquedaDraft}
            onFiltroEventos={onFiltroEventos}
            filtrosReportes={filtrosReportes}
            onFiltroReportes={onFiltroReportes}
            onLimpiar={limpiarFiltros}
            cargando={datosVisibles.estado === 'cargando'}
          />

          <div
            id={`mod-panel-${seccion}`}
            role="tabpanel"
            aria-labelledby={`mod-tab-${seccion}`}
            tabIndex={0}
            className="mod-panel"
          >
            {datosVisibles.estado === 'cargando' && <ModeracionCargando seccion={seccion} />}
            {datosVisibles.estado === 'error' && (
              <ModeracionError
                mensaje={datosVisibles.error}
                onReintentar={reintentar}
              />
            )}
            {datosVisibles.estado === 'listo' && contenido.length === 0 && (
              <ModeracionVacio seccion={seccion} filtrado={filtrado} onLimpiar={limpiarFiltros} />
            )}
            {datosVisibles.estado === 'listo' && contenido.length > 0 && (
              <ModeracionTabla seccion={seccion} contenido={contenido} onRevisar={revisar} />
            )}
            {datosVisibles.estado === 'listo' && (
              <ModeracionPaginacion
                pagina={paginaActual}
                totalPaginas={totalPaginas}
                first={datosVisibles.datos?.first ?? true}
                last={datosVisibles.datos?.last ?? true}
                onChange={irAPagina}
              />
            )}
          </div>
        </section>

      </div>

      {modal?.tipo === 'revisar' && (
        <RevisarPropuestaModal
          propuesta={modal.recurso}
          onClose={() => setModal(null)}
          onElegir={elegirDecision}
        />
      )}
      {modal?.tipo === 'aprobar' && (
        <AprobarPropuestaModal
          propuesta={modal.recurso}
          onClose={() => setModal(null)}
          onConfirm={aprobarPropuesta}
          onSuccess={() => trasDecision('Propuesta aprobada correctamente.')}
        />
      )}
      {modal?.tipo === 'rechazar' && (
        <RechazarPropuestaModal
          propuesta={modal.recurso}
          onClose={() => setModal(null)}
          onConfirm={rechazarPropuesta}
          onSuccess={() => trasDecision('Propuesta rechazada correctamente.')}
        />
      )}
      {modal?.tipo === 'resolver' && (
        <ResolverReporteModal
          reporte={modal.recurso}
          onClose={() => setModal(null)}
          onConfirm={resolverReporte}
          onSuccess={() => trasDecision('Reporte resuelto correctamente.')}
        />
      )}
    </div>
  )
}
