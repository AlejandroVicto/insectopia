import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { adaptarPaginaEventos } from '../../adapters/eventosAdapter'
import { avatarUrl } from '../../adapters/perfilAdapter'
import { consultarEventos } from '../../services/eventosService'
import { consultarSugeridos, seguirUsuario } from '../../services/perfilService'
import Avatar from './Avatar'

function Panel({ heading, children, action }) {
  return <section className="inicio-card min-w-0 p-3.5">
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[10px] font-bold tracking-wide text-[var(--inicio-text)]"><span aria-hidden="true" className="mr-2 text-[var(--inicio-lime)]">●</span>{heading}</h2>
      {action}
    </div>
    {children}
  </section>
}

function estadoPanel(estado, vacio, reintentar) {
  if (estado === 'loading') return <p role="status" className="text-xs text-[var(--inicio-muted)]">Cargando…</p>
  if (estado === 'error') return <div role="alert" className="text-xs text-red-300">No se pudo cargar la información. <button type="button" onClick={reintentar} className="text-[var(--inicio-lime)] underline">Reintentar</button></div>
  if (estado === 'empty') return <p role="status" className="text-xs text-[var(--inicio-muted)]">{vacio}</p>
  return null
}

export function SuggestedUsers({ demo = false, userId }) {
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState(demo ? 'empty' : 'loading')
  const [retry, setRetry] = useState(0)
  const [pending, setPending] = useState([])
  const [errorId, setErrorId] = useState(null)
  const blocked = useRef(new Set())
  const pendingRef = useRef(new Set())
  const usersRef = useRef([])
  const request = useRef(null)
  const replenishing = useRef(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    if (demo) return () => { alive.current = false }
    const controller = new AbortController()
    request.current = controller
    consultarSugeridos({ signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return
      if (!Array.isArray(data)) throw new Error('Sugerencias inválidas')
      const ids = new Set()
      const elegibles = data.filter((u) => u?.id != null && u.nombre && u.nombreUsuario
        && String(u.id) !== String(userId) && !blocked.current.has(String(u.id))
        && !ids.has(String(u.id)) && ids.add(String(u.id))).slice(0, 5)
      usersRef.current = elegibles
      setUsers(elegibles)
      setStatus(elegibles.length ? 'success' : 'empty')
    }).catch(() => { if (!controller.signal.aborted) setStatus('error') })
    return () => { alive.current = false; controller.abort() }
  }, [demo, userId, retry])

  async function reponer() {
    if (replenishing.current) return
    replenishing.current = true
    try {
      while (alive.current && usersRef.current.length < 5) {
        const ids = [...usersRef.current.map((u) => u.id), ...blocked.current]
        const { data } = await consultarSugeridos({ limite: 5 - usersRef.current.length, excluir: ids, signal: request.current?.signal })
        if (!alive.current || !Array.isArray(data) || data.length === 0) break
        const nuevos = data.filter((u) => u?.id != null && u.nombre && u.nombreUsuario
          && String(u.id) !== String(userId) && !blocked.current.has(String(u.id))
          && !usersRef.current.some((actual) => String(actual.id) === String(u.id)))
        if (!nuevos.length) break
        usersRef.current = [...usersRef.current, ...nuevos].slice(0, 5)
        setUsers(usersRef.current)
        setStatus('success')
      }
    } catch { /* La persona ya se siguió; las sugerencias restantes siguen disponibles. */ }
    finally { replenishing.current = false }
  }

  async function seguir(id) {
    if (pendingRef.current.has(String(id)) || blocked.current.has(String(id))) return
    pendingRef.current.add(String(id))
    setPending((ids) => [...ids, id])
    setErrorId(null)
    try {
      await seguirUsuario(id)
      blocked.current.add(String(id))
      if (!alive.current) return
      usersRef.current = usersRef.current.filter((u) => String(u.id) !== String(id))
      setUsers(usersRef.current)
      if (!usersRef.current.length) setStatus('empty')
      await reponer()
    } catch { if (alive.current) setErrorId(id) }
    finally {
      pendingRef.current.delete(String(id))
      if (alive.current) setPending((ids) => ids.filter((item) => item !== id))
    }
  }

  return <Panel heading="PERSONAS SUGERIDAS">
    {estadoPanel(status, 'No hay personas sugeridas disponibles', () => { setStatus('loading'); setRetry((n) => n + 1) })}
    {users.length > 0 && <ul className="grid gap-2">
      {users.map((user) => <li key={user.id} className="flex min-w-0 items-center gap-2">
        <Link to={`/app/usuarios/${encodeURIComponent(user.id)}`} aria-label={`Ver perfil de ${user.nombre}`} className="shrink-0 rounded-full"><Avatar name={user.nombre} src={avatarUrl(user.avatarUrl)} size="sm" /></Link>
        <Link to={`/app/usuarios/${encodeURIComponent(user.id)}`} className="min-w-0 flex-1 hover:text-[var(--inicio-lime)]"><span className="block truncate text-xs font-bold">{user.nombre}</span><span className="block truncate text-[10px] text-[var(--inicio-muted)]">@{user.nombreUsuario}</span></Link>
        <button type="button" disabled={pending.includes(user.id) || demo} onClick={() => seguir(user.id)} className="inicio-pending text-[10px] text-[var(--inicio-lime)] disabled:opacity-60" aria-label={`Seguir a ${user.nombre}`}>{pending.includes(user.id) ? 'Siguiendo…' : 'Seguir'}</button>
        {errorId === user.id && <span role="alert" className="sr-only">No se pudo seguir a {user.nombre}. Inténtalo de nuevo.</span>}
      </li>)}
    </ul>}
  </Panel>
}

function fechaEvento(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '')
  if (!match) return 'Fecha no disponible'
  const fecha = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(fecha)
}

export function UpcomingEvents({ demo = false }) {
  const [result, setResult] = useState({ status: demo ? 'empty' : 'loading', events: [] })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (demo) return undefined
    const controller = new AbortController()
    consultarEventos({ size: 5, filtros: { estado: 'APROBADO', periodo: 'futuros' }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        const events = adaptarPaginaEventos(data).content.filter((e) => e.estado === 'APROBADO' && !e.esPasado).slice(0, 5)
        setResult({ status: events.length ? 'success' : 'empty', events })
      }).catch(() => { if (!controller.signal.aborted) setResult({ status: 'error', events: [] }) })
    return () => controller.abort()
  }, [demo, retry])
  return <Panel heading="PRÓXIMOS EVENTOS" action={<Link to="/app/eventos" className="text-[10px] font-bold text-[var(--inicio-lime)] hover:underline">Ver todos</Link>}>
    {estadoPanel(result.status, 'No hay eventos próximos disponibles', () => { setResult({ status: 'loading', events: [] }); setRetry((n) => n + 1) })}
    <ul className="grid gap-2">{result.events.map((event) => <li key={event.id}>
      <Link to={`/app/eventos?evento=${encodeURIComponent(event.id)}`} className="inicio-inset block rounded-xl p-3 hover:border-[var(--inicio-lime)]">
        <span className="block text-xs font-bold">{event.titulo}</span>
        <span className="mt-1 block text-[11px] text-[var(--inicio-lime)]">{fechaEvento(event.fechaInicio)}{/[T ]\d{2}:\d{2}/.test(event.fechaInicio) ? ` · ${event.horaInicio}` : ''}</span>
      </Link>
    </li>)}</ul>
  </Panel>
}
