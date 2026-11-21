import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { adaptarPagina, adaptarSeguido } from '../../adapters/mensajesAdapter'
import { consultarSeguidosDemo, seguidosDemo } from '../../data/mensajesDemo'
import { consultarSeguidos } from '../../services/conversacionesService'
import { EmptyState, LoadingState } from './MessageStates'
import FollowedUserRow from './FollowedUserRow'
import { useMessageDialog } from './useMessageDialog'

const SIZE = 20
const mergeUsers = (old, next) => [...new Map([...old, ...next].map((user) => [String(user.id), user])).values()]

export default function NewMessageModal({ demo, userId, onClose, onOpen, onOpened, demoUsers = seguidosDemo }) {
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)
  const [unfilteredEmpty, setUnfilteredEmpty] = useState(false)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const pending = useRef(null)
  const more = useRef(null)
  const busyRef = useRef(false)
  const { dialogRef, initialRef } = useMessageDialog(onClose, busy)
  const key = JSON.stringify([query, retry])
  const demoPage = demo ? adaptarPagina(consultarSeguidosDemo({ q: query, userId, users: demoUsers }), adaptarSeguido) : null
  const visible = demo ? { key, status: 'success', users: demoPage.content, number: 0, total: demoPage.totalElements, last: demoPage.last }
    : result?.key === key ? result : { key, status: 'loading', users: [], total: 0, last: true }

  useEffect(() => {
    const timer = setTimeout(() => setQuery(draft.trim()), 350)
    return () => clearTimeout(timer)
  }, [draft])

  useEffect(() => {
    const controller = new AbortController()
    if (!demo) consultarSeguidos({ q: query, size: SIZE, signal: controller.signal }).then(({ data }) => {
      const page = adaptarPagina(data, adaptarSeguido)
      if (!controller.signal.aborted) {
        if (!query) setUnfilteredEmpty(page.totalElements === 0)
        setResult({ key, status: 'success', users: page.content, number: page.number, total: page.totalElements, last: page.last })
      }
    }).catch(() => { if (!controller.signal.aborted) setResult({ key, status: 'error', users: [], total: 0, last: true }) })
    return () => { controller.abort(); more.current?.abort() }
  }, [demo, query, retry, key])

  useEffect(() => () => pending.current?.abort(), [])

  async function loadMore() {
    if (demo || visible.status !== 'success' || visible.last || more.current) return
    const controller = new AbortController()
    more.current = controller
    setResult((prev) => ({ ...prev, loadingMore: true, moreError: false }))
    try {
      const { data } = await consultarSeguidos({ q: query, page: visible.number + 1, size: SIZE, signal: controller.signal })
      const page = adaptarPagina(data, adaptarSeguido)
      if (!controller.signal.aborted) setResult((prev) => prev?.key === key
        ? { ...prev, users: mergeUsers(prev.users, page.content), number: page.number, last: page.last, loadingMore: false } : prev)
    } catch {
      if (!controller.signal.aborted) setResult((prev) => prev?.key === key ? { ...prev, loadingMore: false, moreError: true } : prev)
    } finally { if (more.current === controller) more.current = null }
  }

  async function open() {
    if (busyRef.current || visible.status !== 'success' || !selected || selected.loSigo !== true
      || String(selected.id) === String(userId)) return
    const controller = new AbortController()
    pending.current = controller
    busyRef.current = true
    setBusy(true)
    setActionError('')
    try {
      const chat = await onOpen(selected, controller.signal)
      if (!controller.signal.aborted) onOpened(chat)
    } catch (error) {
      if (!controller.signal.aborted) setActionError(error.userMessage || 'No pudimos abrir la conversación. Inténtalo de nuevo.')
    } finally {
      if (pending.current === controller) { pending.current = null; busyRef.current = false; setBusy(false) }
    }
  }

  return createPortal(<div className="mensajes msg-overlay">
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="msg-new-title" aria-describedby="msg-new-description" className="msg-dialog msg-new-dialog">
      <div className="msg-dialog-head"><div><h2 id="msg-new-title" className="font-display">Nuevo mensaje</h2>
        <p id="msg-new-description">Selecciona una persona que sigues para comenzar a conversar.</p></div>
        <button type="button" className="msg-close" onClick={onClose} disabled={busy} aria-label="Cerrar nuevo mensaje">×</button></div>
      <div className="msg-dialog-search"><span aria-hidden="true">⌕</span><input ref={initialRef} type="search" aria-label="Buscar usuarios seguidos"
        placeholder="Buscar por nombre o @usuario…" value={draft} onChange={(event) => { setDraft(event.target.value); setSelected(null); setActionError('') }} />
        {draft && <button type="button" aria-label="Limpiar búsqueda de usuarios" onClick={() => { setDraft(''); setSelected(null) }}>×</button>}</div>
      <p className="msg-dialog-caption">PERSONAS QUE SIGUES {visible.status === 'success' ? ` · ${visible.total} RESULTADOS` : ''}</p>
      <div className="msg-follow-scroll" role="region" aria-label="Usuarios seguidos" tabIndex={0}>
        {visible.status === 'loading' && <LoadingState label="Cargando usuarios seguidos" />}
        {visible.status === 'error' && <div className="msg-modal-state" role="alert"><strong>No pudimos cargar las personas que sigues</strong>
          <p>Comprueba tu conexión e inténtalo de nuevo.</p><button type="button" className="msg-action" onClick={() => setRetry((n) => n + 1)}>Reintentar</button></div>}
        {visible.status === 'success' && <>
          {visible.users.map((person) => <FollowedUserRow key={person.id} person={person} ownId={userId}
            selected={String(selected?.id) === String(person.id)} onSelect={setSelected} />)}
          {!visible.users.length && (query && !(demo ? consultarSeguidosDemo({ userId, users: demoUsers }).totalElements === 0 : unfilteredEmpty)
            ? <EmptyState title="Sin coincidencias">No encontramos personas que sigues con ese nombre o usuario.</EmptyState>
            : <EmptyState title="Todavía no sigues a nadie">Busca personas en Insectopia y síguelas para poder iniciar un chat.</EmptyState>)}
          {!visible.last && <button type="button" className="msg-action msg-more" disabled={visible.loadingMore} onClick={loadMore}>{visible.loadingMore ? 'Cargando…' : 'Cargar más personas'}</button>}
          {visible.moreError && <p role="alert" className="msg-inline-error">No se pudieron cargar más personas. <button type="button" onClick={loadMore}>Reintentar</button></p>}
        </>}
      </div>
      <div className="msg-dialog-footer"><span>Solo puedes iniciar chats con personas que sigues.</span>
        <button type="button" className="msg-dialog-primary" onClick={open} disabled={busy || visible.status !== 'success' || !selected || !selected.loSigo || String(selected?.id) === String(userId)}>
          {busy ? 'Abriendo…' : 'Abrir conversación →'}</button></div>
      {actionError && <p className="msg-dialog-error" role="alert">{actionError}</p>}
    </section>
  </div>, document.body)
}
