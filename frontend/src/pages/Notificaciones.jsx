import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useNotificaciones } from '../context/useNotificaciones'
import { listarNotificaciones, marcarLeida, marcarTodasLeidas, eliminarNotificacion } from '../services/notificacionesService'
import { mensajeErrorApi } from '../services/erroresApi'
import NotificacionCard from '../components/notificaciones/NotificacionCard'
import ConfirmarNotificacionModal from '../components/notificaciones/ConfirmarNotificacionModal'
import { NotificacionesEmpty, NotificacionesError, NotificacionesSkeleton } from '../components/notificaciones/NotificacionesEstados'
import './notificaciones.css'

const SIZE = 10
const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'no-leidas', label: 'No leídas' },
  { id: 'leidas', label: 'Leídas' },
]

function paginaValida(data) {
  return data && Array.isArray(data.content) && Number.isSafeInteger(data.number)
    && Number.isSafeInteger(data.totalPages) && Number.isSafeInteger(data.totalElements)
    && typeof data.first === 'boolean' && typeof data.last === 'boolean'
}

export default function Notificaciones() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { count, error: countError, refreshCount } = useNotificaciones()
  const [filtro, setFiltro] = useState('todas')
  const [page, setPage] = useState(0)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)
  const [pendingId, setPendingId] = useState(null)
  const [rowErrors, setRowErrors] = useState({})
  const [modal, setModal] = useState(null)
  const [modalBusy, setModalBusy] = useState(false)
  const [modalError, setModalError] = useState('')
  const actions = useRef(new Set())
  const reading = useRef(new Map())
  const opening = useRef(new Set())
  const mutation = useRef(false)
  const previousCount = useRef(count)
  const key = `${user?.id}:${filtro}:${page}:${retry}`
  const visible = result?.key === key ? result : { status: 'loading', data: null }

  useEffect(() => {
    const controller = new AbortController()
    listarNotificaciones({ page, size: SIZE, filtro, signal: controller.signal }).then(({ data }) => {
      if (!paginaValida(data)) throw new Error('Página de notificaciones inválida')
      if (!controller.signal.aborted) setResult({ key, status: 'success', data })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key, status: 'error', data: null })
    })
    return () => controller.abort()
  }, [page, filtro, key])

  // Una página que quedó vacía tras una eliminación debe volver a la última página válida.
  useEffect(() => {
    if (result?.key === key && result.status === 'success' && page > 0 && page >= result.data.totalPages) {
      const timer = window.setTimeout(() => setPage(Math.max(0, result.data.totalPages - 1)), 0)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [result, key, page])

  useEffect(() => {
    refreshCount()
    function focus() {
      if (document.visibilityState !== 'hidden') setRetry((n) => n + 1)
    }
    window.addEventListener('focus', focus)
    return () => window.removeEventListener('focus', focus)
  }, [refreshCount])

  // Si el sondeo global detecta actividad nueva, refrescar también la página abierta.
  useEffect(() => {
    const changed = previousCount.current !== null && count !== null && previousCount.current !== count
    previousCount.current = count
    if (!changed) return undefined
    const timer = window.setTimeout(() => setRetry((n) => n + 1), 0)
    return () => window.clearTimeout(timer)
  }, [count])

  function changeFiltro(value) {
    if (filtro === value) return
    setFiltro(value)
    setPage(0)
    setRowErrors({})
  }

  function reload() { setRetry((n) => n + 1) }

  function read(id) {
    if (reading.current.has(id)) return reading.current.get(id)
    if (mutation.current) return Promise.resolve(false)
    actions.current.add(id)
    setPendingId(id)
    setRowErrors((prev) => ({ ...prev, [id]: '' }))
    const task = marcarLeida(id).then(({ data }) => {
      if (data?.id !== id || data.leida !== true) throw new Error('Lectura no confirmada por el servidor')
      setResult((prev) => prev?.key === key && prev.status === 'success'
        ? { ...prev, data: { ...prev.data, content: prev.data.content.map((n) => n.id === id ? data : n) } } : prev)
      reload()
      refreshCount()
      return true
    }).catch((error) => {
      setRowErrors((prev) => ({ ...prev, [id]: mensajeErrorApi(error, 'No se pudo marcar como leída. Reintenta.') }))
      return false
    }).finally(() => {
      reading.current.delete(id)
      actions.current.delete(id)
      setPendingId(null)
    })
    reading.current.set(id, task)
    return task
  }

  async function open(notification, destination) {
    if (opening.current.has(notification.id)) return
    opening.current.add(notification.id)
    try {
      if (!notification.leida) await read(notification.id)
      // Un fallo de lectura no debe retener al usuario en esta pantalla.
      navigate(destination)
    } finally {
      opening.current.delete(notification.id)
    }
  }

  function openModal(type, id = null) {
    if (mutation.current || (id != null && actions.current.has(id))) return
    setModal({ type, id })
    setModalError('')
  }

  function closeModal() {
    if (mutation.current) return
    setModal(null)
    setModalError('')
  }

  async function confirmModal() {
    if (!modal || mutation.current) return
    mutation.current = true
    setModalBusy(true)
    setModalError('')
    try {
      if (modal.type === 'todas') {
        const { data } = await marcarTodasLeidas()
        if (data?.count !== 0) throw new Error('El servidor no confirmó el marcado')
      } else {
        const response = await eliminarNotificacion(modal.id)
        if (response.status !== 204) throw new Error('El servidor no confirmó la eliminación')
      }
      setModal(null)
      reload()
      refreshCount()
    } catch (error) {
      setModalError(mensajeErrorApi(error, 'No se pudo completar la operación. Reintenta.'))
    } finally {
      mutation.current = false
      setModalBusy(false)
    }
  }

  const data = visible.status === 'success' ? visible.data : null
  return <div className="notificaciones">
    <div className="notif-grid">
      <section className="notif-main" aria-label="Actividad de notificaciones">
        <header className="notif-heading">
          <h1>Notificaciones</h1>
          {count !== null && <span aria-live="polite" className="notif-count">{count} sin leer</span>}
        </header>
        <div className="notif-filters" role="group" aria-label="Filtrar notificaciones">
          {FILTROS.map((item) => <button key={item.id} type="button" className="notif-filter"
            aria-pressed={filtro === item.id} onClick={() => changeFiltro(item.id)}>
            {item.label}{item.id === 'no-leidas' && count !== null ? ` · ${count}` : ''}
            {item.id === 'todas' && filtro === 'todas' && data ? ` · ${data.totalElements}` : ''}
          </button>)}
          <button type="button" className="notif-mark-all" onClick={() => openModal('todas')}
            disabled={count === null || count === 0}>✓&nbsp; Marcar todas leídas</button>
        </div>
        {countError && <p role="status" className="notif-inline-error">No se pudo actualizar el contador. <button type="button" onClick={refreshCount} className="underline">Reintentar contador</button></p>}
        <div className="notif-activity"><h2>ACTIVIDAD RECIENTE</h2><span>Orden: más recientes primero</span></div>
        {visible.status === 'loading' && <NotificacionesSkeleton />}
        {visible.status === 'error' && <NotificacionesError onRetry={reload} />}
        {data && (data.content.length ? <div className="notif-list">
          {data.content.map((notification) => <NotificacionCard key={notification.id} notificacion={notification}
            pending={pendingId === notification.id} error={rowErrors[notification.id]}
             onRead={read} onNavigate={open} onDelete={(id) => openModal('eliminar', id)} />)}
        </div> : <NotificacionesEmpty filtro={filtro} />)}
        {data && <footer className="notif-pagination">
          <span>Página {data.totalPages ? data.number + 1 : 0} de {data.totalPages} · {data.totalElements} notificaciones</span>
          <div>
            <button type="button" disabled={data.first} onClick={() => setPage((n) => n - 1)}>Anterior</button>
            <button type="button" disabled={data.last} onClick={() => setPage((n) => n + 1)}>Siguiente</button>
          </div>
        </footer>}
      </section>
      <aside className="notif-aside" aria-label="Perfil de la cuenta">
        <h2>{user?.name || 'Cuenta de Insectopia'}</h2>
        <p>{user?.email || 'Correo no disponible'}</p>
      </aside>
    </div>
    {modal && <ConfirmarNotificacionModal action={modal.type} loading={modalBusy} error={modalError}
      onCancel={closeModal} onConfirm={confirmModal} />}
  </div>
}
