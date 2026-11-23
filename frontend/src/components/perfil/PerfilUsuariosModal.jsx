import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Avatar from '../inicio/Avatar'
import { avatarUrl } from '../../adapters/perfilAdapter'
import { adaptarPagina, adaptarSeguido } from '../../adapters/mensajesAdapter'
import {
  consultarSeguidores,
  consultarSeguidos,
  dejarSeguirUsuario,
  seguirUsuario,
} from '../../services/perfilService'
import { mensajeErrorApi } from '../../services/erroresApi'

const SIZE = 20

function consultarLista(tipo, opciones) {
  return tipo === 'seguidos' ? consultarSeguidos(opciones) : consultarSeguidores(opciones)
}

export function PerfilUsuarioRow({ person, ownId, pending, onSeguir, onDejarSeguir }) {
  const esPropio = ownId != null && String(person.id) === String(ownId)
  const etiqueta = person.loSigo ? 'Siguiendo' : 'Seguir'
  return <li className="perfil-persona">
    <Avatar name={person.nombre} src={avatarUrl(person.avatarUrl)} />
    <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{person.nombre}</strong>
      <span className="block truncate text-xs text-[var(--inicio-muted)]">@{person.nombreUsuario}</span></div>
    {!esPropio && <button type="button" disabled={pending}
      title={pending ? 'Guardando…' : undefined} className="perfil-secondary shrink-0 disabled:opacity-65"
      aria-label={`${etiqueta} a ${person.nombre}`}
      onClick={(event) => person.loSigo
        ? onDejarSeguir(person, event.currentTarget)
        : onSeguir(person)}>
      {pending ? 'Guardando…' : etiqueta}
    </button>}
  </li>
}

export function ConfirmarDejarSeguir({ nombre, onCancel, onConfirm, pending, error }) {
  return <div className="perfil-state" role="group" aria-label="Confirmar acción">
    <span className="perfil-eyebrow">CONFIRMAR ACCIÓN</span>
    <h3>¿Dejar de seguir a {nombre}?</h3>
    <p>No verás sus futuras actualizaciones en la lista de seguidos.</p>
    {error && <p role="alert">{error}</p>}
    <div className="mt-5 flex gap-3"><button type="button" className="perfil-secondary flex-1" disabled={pending} autoFocus onClick={onCancel}>Cancelar</button>
      <button type="button" className="perfil-primary flex-1" disabled={pending} onClick={onConfirm}>{pending ? 'Guardando…' : 'Dejar de seguir'}</button></div>
  </div>
}

export default function PerfilUsuariosModal({ tipo, ownId, onClose, onTotal, onChanged }) {
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [retry, setRetry] = useState(0)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState(null)
  const [emptyBase, setEmptyBase] = useState(false)
  const [confirmacion, setConfirmacion] = useState(null)
  const [accion, setAccion] = useState(null)
  const [accionError, setAccionError] = useState('')
  const dialog = useRef(null)
  const more = useRef(null)
  const opener = useRef(document.activeElement)
  const origenConfirmacion = useRef(null)
  const accionController = useRef(null)
  const accionId = useRef(null)
  const alive = useRef(true)
  const key = JSON.stringify([tipo, query, retry, revision])
  const visible = result?.key === key ? result : { status: 'loading', users: [], total: null, last: true }
  const isFollowed = tipo === 'seguidos'
  const textoVacio = isFollowed ? 'Todavía no sigues a nadie' : 'Todavía no tienes seguidores'

  const cerrarConfirmacion = useCallback(() => {
    setConfirmacion(null)
    setAccionError('')
    const origen = origenConfirmacion.current
    origenConfirmacion.current = null
    if (origen?.isConnected) origen.focus()
    else dialog.current?.focus()
  }, [])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      accionController.current?.abort()
    }
  }, [])

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
      if (event.key === 'Escape') { event.preventDefault(); confirmacion ? cerrarConfirmacion() : onClose(); return }
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
  }, [onClose, confirmacion, cerrarConfirmacion])

  useEffect(() => {
    const timer = setTimeout(() => setQuery(draft.trim()), 350)
    return () => clearTimeout(timer)
  }, [draft])

  useEffect(() => {
    const controller = new AbortController()
    consultarLista(tipo, { page: 0, size: SIZE, q: query, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted || !alive.current) return
        const pagina = adaptarPagina(data, adaptarSeguido)
        if (!query) {
          setEmptyBase(pagina.totalElements === 0)
          // El conteo global de seguidos se comparte con MiPerfil; el de seguidores
          // ya viene en GET /api/usuarios/me y no debe sobreescribirse aquí.
          if (isFollowed) onTotal?.(pagina.totalElements)
        }
        setResult({ key, status: 'success', users: pagina.content, total: pagina.totalElements, number: pagina.number, last: pagina.last })
      })
      .catch(() => { if (!controller.signal.aborted && alive.current) setResult({ key, status: 'error' }) })
    return () => {
      controller.abort()
      more.current?.abort()
      more.current = null
    }
  }, [tipo, isFollowed, query, retry, key, onTotal])

  async function loadMore() {
    if (visible.status !== 'success' || visible.last || more.current) return
    const controller = new AbortController()
    more.current = controller
    setResult((prev) => prev?.key === key ? { ...prev, loadingMore: true, moreError: false } : prev)
    try {
      const { data } = await consultarLista(tipo, { page: visible.number + 1, size: SIZE, q: query, signal: controller.signal })
      const pagina = adaptarPagina(data, adaptarSeguido)
      if (!controller.signal.aborted && alive.current) setResult((prev) => prev?.key === key ? {
        ...prev,
        users: [...new Map([...prev.users, ...pagina.content].map((person) => [String(person.id), person])).values()],
        number: pagina.number,
        last: pagina.last,
        loadingMore: false,
      } : prev)
    } catch {
      if (!controller.signal.aborted && alive.current) setResult((prev) => prev?.key === key ? { ...prev, loadingMore: false, moreError: true } : prev)
    } finally {
      if (more.current === controller) more.current = null
    }
  }

  function esPropio(person) {
    return ownId != null && String(person.id) === String(ownId)
  }

  function iniciarAccion(person) {
    if (accionId.current || esPropio(person)) return null
    const controller = new AbortController()
    accionId.current = String(person.id)
    accionController.current = controller
    setAccion(String(person.id))
    setAccionError('')
    return controller
  }

  function terminarAccion(controller) {
    if (accionController.current !== controller) return
    accionController.current = null
    accionId.current = null
    if (alive.current) setAccion(null)
  }

  function actualizarPersona(id, cambios) {
    setResult((prev) => prev?.key === key ? {
      ...prev,
      users: prev.users.map((person) => String(person.id) === String(id) ? { ...person, ...cambios } : person),
    } : prev)
  }

  function quitarPersona(id) {
    setResult((prev) => prev?.key === key ? {
      ...prev,
      users: prev.users.filter((person) => String(person.id) !== String(id)),
    } : prev)
  }

  async function seguir(person) {
    const controller = iniciarAccion(person)
    if (!controller) return
    try {
      await seguirUsuario(person.id, { signal: controller.signal })
      if (controller.signal.aborted || !alive.current) return
      actualizarPersona(person.id, { loSigo: true })
      setRevision((n) => n + 1)
      onChanged?.()
    } catch (error) {
      if (!controller.signal.aborted && alive.current) {
        setAccionError(mensajeErrorApi(error, 'No se pudo seguir a esta persona.'))
      }
    } finally {
      terminarAccion(controller)
    }
  }

  function pedirDejarSeguir(person, origen) {
    if (accionId.current || esPropio(person)) return
    origenConfirmacion.current = origen ?? null
    setAccionError('')
    setConfirmacion(person)
  }

  async function confirmarDejarSeguir() {
    const persona = confirmacion
    if (!persona) return
    const controller = iniciarAccion(persona)
    if (!controller) return
    try {
      await dejarSeguirUsuario(persona.id, { signal: controller.signal })
      if (controller.signal.aborted || !alive.current) return
      if (isFollowed) quitarPersona(persona.id)
      else actualizarPersona(persona.id, { loSigo: false })
      setConfirmacion(null)
      origenConfirmacion.current = null
      setRevision((n) => n + 1)
      onChanged?.()
      dialog.current?.focus()
    } catch (error) {
      if (!controller.signal.aborted && alive.current) {
        setAccionError(mensajeErrorApi(error, 'No se pudo dejar de seguir a esta persona.'))
      }
    } finally {
      terminarAccion(controller)
    }
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
        <label className="perfil-search"><span aria-hidden="true">⌕</span>
          <span className="sr-only">Buscar por nombre o usuario</span>
          <input type="search" maxLength={100} placeholder="Buscar por nombre o @usuario..." value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
        <p className="perfil-eyebrow mt-5 text-[var(--inicio-muted)]" aria-live="polite">{visible.status === 'success' ? `${visible.total} RESULTADOS · PAGINACIÓN DEL SERVIDOR` : title.toUpperCase()}</p>
        <div className="perfil-list" role="region" aria-label={`Lista de ${title.toLowerCase()}`} tabIndex={0}>
          {confirmacion ? <ConfirmarDejarSeguir
            nombre={confirmacion.nombre}
            onCancel={cerrarConfirmacion}
            onConfirm={confirmarDejarSeguir}
            pending={accion === String(confirmacion.id)}
            error={accionError}
          /> : <>
            {visible.status === 'loading' && <div role="status" className="perfil-state"><strong>Cargando personas...</strong>
              {[0, 1, 2].map((item) => <div key={item} aria-hidden="true" className="perfil-skeleton" />)}</div>}
            {visible.status === 'error' && <div role="alert" className="perfil-state"><strong>No pudimos cargar esta lista</strong><p>Comprueba tu conexión e inténtalo de nuevo.</p><button type="button" className="perfil-secondary mt-4" onClick={() => setRetry((n) => n + 1)}>Reintentar</button></div>}
            {visible.status === 'success' && <>
              <ul className="grid gap-3">{visible.users.map((person) => <PerfilUsuarioRow
                key={person.id}
                person={person}
                ownId={ownId}
                pending={accion === String(person.id)}
                onSeguir={seguir}
                onDejarSeguir={pedirDejarSeguir}
              />)}</ul>
              {accionError && <p role="alert" className="mt-3 text-xs text-red-300">{accionError}</p>}
              {!visible.users.length && <div role="status" className="perfil-state"><strong>{query && !emptyBase ? 'No encontramos usuarios que coincidan con tu búsqueda' : textoVacio}</strong></div>}
              {!visible.last && <button type="button" className="perfil-secondary mt-4 w-full" disabled={visible.loadingMore} onClick={loadMore}>{visible.loadingMore ? 'Cargando personas...' : 'Cargar más personas'}</button>}
              {visible.moreError && <p role="alert" className="mt-3 text-xs">No pudimos cargar más personas. <button type="button" className="underline" onClick={loadMore}>Reintentar</button></p>}
            </>}
          </>}
        </div>
      </div>
      <footer className="mt-5 border-t border-[var(--inicio-border)] pt-4 text-xs text-[var(--inicio-muted)]">
        <p>Solo información pública: avatar, nombre, @usuario y estado de seguimiento.</p>
        <p className="mt-1">Las acciones se confirman con el servidor antes de actualizar la lista.</p>
      </footer>
    </section>
  </div>, document.body)
}
