import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import logo from '../assets/logo.png'
import UserAccount from './UserAccount'
import { useCrearPublicacion } from '../context/useCrearPublicacion'

export default function Navbar({ notificationCount, inactive = false, onLogout }) {
  const hasCount = Number.isInteger(notificationCount) && notificationCount > 0
  const { abrir: abrirCrear } = useCrearPublicacion()
  const isInicio = useLocation().pathname === '/app'
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const [draft, setDraft] = useState({ value: query, committedQuery: query })
  const search = draft.committedQuery === query ? draft.value : query

  useEffect(() => {
    if (!isInicio || search.trim() === query) return undefined
    const timer = setTimeout(() => {
      const term = search.trim()
      setDraft({ value: term, committedQuery: term })
      setParams((current) => {
        const next = new URLSearchParams(current)
        if (term) next.set('q', term)
        else next.delete('q')
        next.delete('page')
        return next
      }, { replace: true })
    }, 350)
    return () => clearTimeout(timer)
  }, [isInicio, query, search, setParams])

  return (
    <header inert={inactive ? true : undefined} className="grid h-20 grid-cols-[minmax(0,1fr)_minmax(200px,570px)_minmax(0,1fr)] items-center bg-[var(--nav-header)] px-6">
      <Link to="/app" className="flex h-14 w-56 shrink-0 items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-[var(--nav-lime)]" aria-label="Ir al inicio de Insectopia">
        <img src={logo} alt="Logo de Insectopia" className="size-10 shrink-0 object-contain" />
        <span className="font-display text-lg font-bold text-[var(--nav-light)]">Insectopia</span>
      </Link>
      <div className="relative min-w-0 w-full">
        <label htmlFor="nav-search" className="sr-only">Buscar usuarios, publicaciones o eventos</label>
        <span aria-hidden="true" className="pointer-events-none absolute left-4 top-2 text-lg text-[var(--nav-muted)]">⌕</span>
        <input id="nav-search" type="search" value={isInicio ? search : ''} onChange={(event) => setDraft({ value: event.target.value, committedQuery: query })} disabled={!isInicio}
          aria-describedby="search-pending" placeholder={isInicio ? 'Buscar publicaciones en Inicio…' : 'Buscar usuarios, publicaciones o eventos…'} className="h-10 w-full rounded-full bg-[var(--nav-sidebar)] pl-10 pr-4 text-xs text-[var(--nav-light)] placeholder:text-[var(--nav-muted)] focus-visible:outline-2 focus-visible:outline-[var(--nav-lime)] disabled:cursor-not-allowed" />
        <span id="search-pending" className="sr-only">{isInicio ? 'Busca publicaciones; usuarios y eventos estarán disponibles más adelante' : 'Búsqueda disponible próximamente'}</span>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-3">
        <button type="button" onClick={abrirCrear} aria-haspopup="dialog" title="Registrar observación" className="h-10 w-36 rounded-full bg-[var(--nav-lime)] text-xs font-semibold text-[var(--nav-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nav-lime)]">+ Crear publicación</button>
        <Link to="/app/notificaciones" aria-label={hasCount ? `Notificaciones: ${notificationCount}` : 'Notificaciones'} className="relative flex size-10 items-center justify-center rounded-full text-[var(--nav-muted)] hover:bg-[var(--nav-active)] focus-visible:outline-2 focus-visible:outline-[var(--nav-lime)]">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5"><path d="M12 2a2 2 0 0 0-2 2v.2A7 7 0 0 0 5 11v4l-1.5 2.5A1 1 0 0 0 4.4 19h15.2a1 1 0 0 0 .9-1.5L19 15v-4a7 7 0 0 0-5-6.8V4a2 2 0 0 0-2-2Zm-2 19a2 2 0 0 0 4 0h-4Z" /></svg>
          {hasCount && <span className="absolute -right-1 -top-1 rounded-full bg-[var(--nav-lime)] px-1.5 text-[10px] font-bold text-[var(--nav-ink)]">{notificationCount}</span>}
        </Link>
        <UserAccount onLogout={onLogout} />
      </div>
    </header>
  )
}
