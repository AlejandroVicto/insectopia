import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { adaptarPaginaPublicaciones } from '../adapters/publicacionesAdapter'
import { consultarDemo, eventosDemo, sugerenciasDemo, tendenciasDemo } from '../data/inicioDemo'
import { consultarPublicaciones } from '../services/publicacionesService'
import { quitarReaccion, reaccionar } from '../services/reaccionesService'
import { mensajeErrorApi } from '../services/erroresApi'
import CrearPublicacionModal from '../components/modales/CrearPublicacionModal'
import EditarPublicacionModal from '../components/modales/EditarPublicacionModal'
import EliminarPublicacionModal from '../components/modales/EliminarPublicacionModal'
import ReportarPublicacionModal from '../components/modales/ReportarPublicacionModal'
import FeedFilters from '../components/inicio/FeedFilters'
import PostComposer from '../components/inicio/PostComposer'
import PublicationCard from '../components/inicio/PublicationCard'
import FeedPagination from '../components/inicio/FeedPagination'
import { FeedEmpty, FeedError, FeedLoading } from '../components/inicio/FeedStates'
import { SuggestedUsers, TrendingSpecies, UpcomingEvents } from '../components/inicio/InicioAside'
import { useCrearPublicacion } from '../context/useCrearPublicacion'
import './inicio.css'

export const INICIO_DEMO = import.meta.env.VITE_INICIO_MOCK === 'true'

export default function Inicio({ demo = INICIO_DEMO }) {
  const { user } = useAuth()
  const { abierto: crearAbierto, cerrar: cerrarCrear } = useCrearPublicacion()
  const [params, setParams] = useSearchParams()
  const feed = params.get('feed') === 'global' ? 'global' : 'para-ti'
  const q = params.get('q')?.trim() ?? ''
  const requestedPage = Number(params.get('page'))
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0
  const size = demo ? 2 : 10
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)
  const [overrideState, setOverrideState] = useState({ key: '', valores: {} })
  const [modal, setModal] = useState(null)
  const [seleccionada, setSeleccionada] = useState(null)
  const [comentariosId, setComentariosId] = useState(null)
  const [reaccionando, setReaccionando] = useState(null)
  const [accionError, setAccionError] = useState('')
  const feedRef = useRef(null)
  const key = JSON.stringify([demo, feed, q, page, retry])
  const overrides = overrideState.key === key ? overrideState.valores : {}
  const visible = demo
    ? { status: 'success', data: adaptarPaginaPublicaciones(consultarDemo({ page, size, feed, q })) }
    : result?.key === key ? result : { status: 'loading', data: null }
  const publicaciones = visible.status === 'success'
    ? visible.data.content.map((post) => ({ ...post, ...(overrides[post.id] ?? {}) }))
    : []

  useEffect(() => {
    const controller = new AbortController()
    if (!demo) {
      consultarPublicaciones({ page, size, feed, q, signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted) setResult({ key, status: 'success', data: adaptarPaginaPublicaciones(data) })
        })
        .catch(() => {
          if (!controller.signal.aborted) setResult({ key, status: 'error', data: null })
        })
    }
    return () => controller.abort()
  }, [demo, feed, q, page, size, retry, key])

  function updateParams(changes, options) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const [field, value] of Object.entries(changes)) {
        if (value == null || value === '' || value === 'para-ti' || (field === 'page' && value === 0)) next.delete(field)
        else next.set(field, String(value))
      }
      return next
    }, options)
  }

  function setPage(next) {
    updateParams({ page: next })
    feedRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }

  function actualizarPost(id, cambios) {
    setOverrideState((actual) => {
      const valores = actual.key === key ? actual.valores : {}
      return { key, valores: { ...valores, [id]: { ...(valores[id] ?? {}), ...cambios } } }
    })
  }

  function recargar() {
    setAccionError('')
    updateParams({ q: null, feed: null, page: 0 })
    setRetry((valor) => valor + 1)
  }

  function abrirModal(tipo, publicacion = null) {
    setAccionError('')
    setSeleccionada(publicacion)
    setModal(tipo)
  }

  function cerrarModal() {
    setModal(null)
    setSeleccionada(null)
  }

  async function alternarReaccion(post) {
    if (reaccionando === post.id) return
    setAccionError('')
    setReaccionando(post.id)
    try {
      const { data } = post.reaccionUsuario
        ? await quitarReaccion(post.id)
        : await reaccionar(post.id)
      actualizarPost(post.id, {
        reaccionUsuario: data?.tipo ?? null,
        totalReacciones: Number.isSafeInteger(data?.total) ? data.total : post.totalReacciones,
      })
    } catch (fallo) {
      setAccionError(mensajeErrorApi(fallo, 'No se pudo actualizar la reacción.'))
    } finally {
      setReaccionando(null)
    }
  }

  function alternarComentarios(post) {
    setAccionError('')
    setComentariosId((actual) => actual === post.id ? null : post.id)
  }

  function comentarioCreado(post) {
    setOverrideState((actual) => {
      const valores = actual.key === key ? actual.valores : {}
      const base = valores[post.id] ?? {}
      const total = base.totalComentarios ?? post.totalComentarios ?? 0
      return { key, valores: { ...valores, [post.id]: { ...base, totalComentarios: total + 1 } } }
    })
  }

  const puedeEditar = Boolean(seleccionada) && (
    String(seleccionada.autor?.id) === String(user?.id) || user?.role === 'ADMINISTRADOR'
  )

  return <div className="inicio h-full min-h-0 overflow-hidden px-4 py-4 text-[var(--inicio-text)]">
    <h1 className="sr-only">Inicio</h1>
    <div className="mx-auto grid h-full w-full max-w-[1500px] min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_minmax(240px,27%)] gap-4">
      <div className="inicio-scroll min-h-0 min-w-0 space-y-4 overflow-y-auto overscroll-contain" id="inicio-feed" ref={feedRef}
        role="region" aria-label="Publicaciones del inicio" tabIndex={0}>
        <FeedFilters value={feed} onChange={(next) => updateParams({ feed: next, page: 0 })} />
        {demo && <p className="text-[10px] text-[var(--inicio-muted)]">Vista de demostración · publicaciones ilustrativas, no datos de MySQL</p>}
        <PostComposer user={user} demo={demo} onSuccess={recargar} />
        {!demo && accionError && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-200">{accionError}</div>}
        {visible.status === 'loading' && <FeedLoading />}
        {visible.status === 'error' && <FeedError onRetry={() => setRetry((value) => value + 1)} />}
        {visible.status === 'success' && <>
          {publicaciones.length === 0
            ? <FeedEmpty filtered={Boolean(q) || feed === 'global'} onClear={() => updateParams({ q: null, feed: null, page: 0 })} />
            : <div className="grid gap-4">{publicaciones.map((post) => <PublicationCard key={post.id} post={post}
              demo={demo} user={user}
              onReaccion={alternarReaccion} reaccionando={reaccionando === post.id}
              onComentar={alternarComentarios} comentariosAbiertos={comentariosId === post.id}
              onCerrarComentarios={() => setComentariosId(null)} onComentarioCreado={comentarioCreado}
              onEditar={(seleccion) => abrirModal('editar', seleccion)}
              onEliminar={(seleccion) => abrirModal('eliminar', seleccion)}
              onReportar={(seleccion) => abrirModal('reportar', seleccion)} />)}</div>}
          <FeedPagination page={visible.data.number} totalPages={visible.data.totalPages}
            first={visible.data.first} last={visible.data.last} onChange={setPage} />
        </>}
      </div>
      <aside aria-label="Información complementaria" className="inicio-scroll grid min-h-0 min-w-0 content-start gap-3.5 overflow-y-auto overscroll-contain" tabIndex={0}>
        <SuggestedUsers users={demo ? sugerenciasDemo : []} />
        <TrendingSpecies species={demo ? tendenciasDemo : []} />
        <UpcomingEvents events={demo ? eventosDemo : []} />
        {!demo && <p className="text-[10px] text-[var(--inicio-muted)]">Sugerencias, tendencias y eventos pendientes de sus propias API.</p>}
      </aside>
    </div>
    {!demo && <>
      {crearAbierto && <CrearPublicacionModal open onClose={cerrarCrear} onSuccess={recargar} />}
      {modal === 'editar' && <EditarPublicacionModal open publicacion={seleccionada} puedeEditar={puedeEditar} onClose={cerrarModal} onSuccess={recargar} />}
      {modal === 'eliminar' && <EliminarPublicacionModal open publicacion={seleccionada} onClose={cerrarModal} onSuccess={recargar} />}
      {modal === 'reportar' && <ReportarPublicacionModal open publicacion={seleccionada} onClose={cerrarModal} onSuccess={recargar} />}
    </>}
  </div>
}
