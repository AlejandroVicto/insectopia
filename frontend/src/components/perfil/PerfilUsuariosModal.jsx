import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Avatar from '../inicio/Avatar'
import { avatarUrl } from '../../adapters/perfilAdapter'
import { adaptarPagina, adaptarSeguido } from '../../adapters/mensajesAdapter'
import { consultarSeguidos } from '../../services/perfilService'

const SIZE = 20

export function PerfilUsuarioRow({ person, ownId }) {
  return <li className="perfil-persona">
    <Avatar name={person.nombre} src={avatarUrl(person.avatarUrl)} />
    <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{person.nombre}</strong>
      <span className="block truncate text-xs text-[var(--inicio-muted)]">@{person.nombreUsuario}</span></div>
    {String(person.id) !== String(ownId) && <button type="button" disabled
      title="Acciones de seguimiento pendientes del backend" className="perfil-secondary shrink-0 disabled:opacity-65"
      aria-label={`${person.loSigo ? 'Siguiendo' : 'Seguir'} a ${person.nombre}: acción no disponible por ahora`}>
      {person.loSigo ? 'Siguiendo' : 'Seguir'}</button>}
  </li>
}

// Diseño preparado para la confirmación de 075. Solo se habilitará cuando exista DELETE real.
export function ConfirmarDejarSeguir({ nombre, onCancel, onConfirm, pending, error }) {
  return <div className="perfil-state" role="group" aria-label="Confirmar acción">
    <span className="perfil-eyebrow">CONFIRMAR ACCIÓN</span>
    <h3>¿Dejar de seguir a {nombre}?</h3>
    <p>No verás sus futuras actualizaciones en la lista de seguidos.</p>
    {error && <p role="alert">{error}</p>}
    <div className="mt-5 flex gap-3"><button type="button" className="perfil-secondary flex-1" disabled={pending} onClick={onCancel}>Cancelar</button>
      <button type="button" className="perfil-primary flex-1" disabled={pending} onClick={onConfirm}>{pending ? 'Guardando…' : 'Dejar de seguir'}</button></div>
  </div>
}

export default function PerfilUsuariosModal({ tipo, ownId, onClose, onTotal }) {
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState(null)
  const [emptyBase, setEmptyBase] = useState(false)
  const dialog = useRef(null)
  const more = useRef(null)
  const opener = useRef(document.activeElement)
  const key = JSON.stringify([tipo, query, retry])
  const visible = result?.key === key ? result : { status: 'loading', users: [], total: null, last: true }
  const isFollowed = tipo === 'seguidos'

  useEffect(() => {
    const root = document.getElementById('root')
    const wasInert = root?.inert
    const openingElement = opener.current
    if (root) root.inert = true
    dialog.current?.focus()
    return () => { if (root) root.inert = wasInert; openingElement?.focus() }
  }, [])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const elements = [...(dialog.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]') ?? [])]
      if (!elements.length) { event.preventDefault(); return }
      const first = elements[0]
      const last = elements.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const timer = setTimeout(() => setQuery(draft.trim()), 350)
    return () => clearTimeout(timer)
  }, [draft])

  useEffect(() => {
    if (!isFollowed) return undefined // 076: no endpoint de seguidores en el backend local.
    const controller = new AbortController()
    consultarSeguidos({ page: 0, size: SIZE, q: query, signal: controller.signal }).then(({ data }) => {
      const page = adaptarPagina(data, adaptarSeguido)
      if (!controller.signal.aborted) {
        if (!query) { setEmptyBase(page.totalElements === 0); onTotal(page.totalElements) }
        setResult({ key, status: 'success', users: page.content, total: page.totalElements, number: page.number, last: page.last })
      }
    }).catch(() => { if (!controller.signal.aborted) setResult({ key, status: 'error' }) })
    return () => { controller.abort(); more.current?.abort() }
  }, [isFollowed, query, retry, key, onTotal])

  async function loadMore() {
    if (visible.status !== 'success' || visible.last || more.current) return
    const controller = new AbortController()
    more.current = controller
    setResult((prev) => ({ ...prev, loadingMore: true, moreError: false }))
    try {
      const { data } = await consultarSeguidos({ page: visible.number + 1, size: SIZE, q: query, signal: controller.signal })
      const page = adaptarPagina(data, adaptarSeguido)
      if (!controller.signal.aborted) setResult((prev) => prev?.key === key ? {
        ...prev, users: [...new Map([...prev.users, ...page.content].map((person) => [String(person.id), person])).values()],
        number: page.number, last: page.last, loadingMore: false,
      } : prev)
    } catch {
      if (!controller.signal.aborted) setResult((prev) => prev?.key === key ? { ...prev, loadingMore: false, moreError: true } : prev)
    } finally { if (more.current === controller) more.current = null }
  }

  const title = isFollowed ? 'Seguidos' : 'Seguidores'
  return createPortal(<div className="perfil-overlay">
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="perfil-modal-title" aria-describedby="perfil-modal-description" className="perfil-dialog">
      <header className="flex items-start justify-between gap-4"><div>
        <p className="perfil-eyebrow">COMUNIDAD · ACTIVIDAD 075</p>
        <h2 id="perfil-modal-title" className="mt-2 text-2xl font-bold">{title}</h2>
        <p id="perfil-modal-description" className="mt-1 text-xs text-[var(--inicio-muted)]">{isFollowed ? 'Personas a las que sigues' : 'Personas que siguen tu perfil'}</p>
      </div><button type="button" aria-label={`Cerrar ${title}`} onClick={onClose} className="perfil-close">×</button></header>
      <div className="mt-5 border-t border-[var(--inicio-border)] pt-5">
        {isFollowed && <label className="perfil-search"><span aria-hidden="true">⌕</span>
          <span className="sr-only">Buscar por nombre o usuario</span>
          <input type="search" maxLength={100} placeholder="Buscar por nombre o @usuario..." value={draft} onChange={(event) => setDraft(event.target.value)} /></label>}
        <p className="perfil-eyebrow mt-5 text-[var(--inicio-muted)]" aria-live="polite">{visible.status === 'success' ? `${visible.total} RESULTADOS · PAGINACIÓN DEL SERVIDOR` : title.toUpperCase()}</p>
        <div className="perfil-list" role="region" aria-label={`Lista de ${title.toLowerCase()}`} tabIndex={0}>
          {!isFollowed && <div className="perfil-state" role="status"><strong>Lista de seguidores no disponible</strong><p>La consulta de seguidores está pendiente del backend (actividad 076).</p></div>}
          {isFollowed && visible.status === 'loading' && <div role="status" className="perfil-state"><strong>Cargando personas...</strong>
            {[0, 1, 2].map((item) => <div key={item} aria-hidden="true" className="perfil-skeleton" />)}</div>}
          {isFollowed && visible.status === 'error' && <div role="alert" className="perfil-state"><strong>No pudimos cargar esta lista</strong><p>Comprueba tu conexión e inténtalo de nuevo.</p><button type="button" className="perfil-secondary mt-4" onClick={() => setRetry((n) => n + 1)}>Reintentar</button></div>}
          {isFollowed && visible.status === 'success' && <>
            <ul className="grid gap-3">{visible.users.map((person) => <PerfilUsuarioRow key={person.id} person={person} ownId={ownId} />)}</ul>
            {!visible.users.length && <div role="status" className="perfil-state"><strong>{query && !emptyBase ? 'No encontramos usuarios que coincidan con tu búsqueda' : 'Todavía no sigues a nadie'}</strong></div>}
            {!visible.last && <button type="button" className="perfil-secondary mt-4 w-full" disabled={visible.loadingMore} onClick={loadMore}>{visible.loadingMore ? 'Cargando personas...' : 'Cargar más personas'}</button>}
            {visible.moreError && <p role="alert" className="mt-3 text-xs">No pudimos cargar más personas. <button type="button" className="underline" onClick={loadMore}>Reintentar</button></p>}
          </>}
        </div>
      </div>
      <footer className="mt-5 border-t border-[var(--inicio-border)] pt-4 text-xs text-[var(--inicio-muted)]">
        <p>Solo información pública: avatar, nombre y @usuario.</p>
        <p className="mt-1">Las acciones de seguimiento están pendientes de endpoints del backend.</p>
      </footer>
    </section>
  </div>, document.body)
}
