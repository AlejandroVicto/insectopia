import { Link } from 'react-router-dom'
import logo from '../assets/logo.png'
import UserAccount from './UserAccount'

export default function Navbar({ notificationCount, inactive = false }) {
  const hasCount = Number.isInteger(notificationCount) && notificationCount > 0
  return (
    <header inert={inactive ? true : undefined} className="flex h-20 items-center gap-5 bg-[var(--nav-header)] px-6">
      <Link to="/app" className="flex h-14 w-56 shrink-0 items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-[var(--nav-lime)]" aria-label="Ir al inicio de Insectopia">
        <img src={logo} alt="Logo de Insectopia" className="size-10 shrink-0 object-contain" />
        <span className="font-display text-lg font-bold text-[var(--nav-light)]">Insectopia</span>
      </Link>
      <div className="relative min-w-0 max-w-[570px] flex-1">
        <label htmlFor="nav-search" className="sr-only">Buscar usuarios, publicaciones o eventos</label>
        <span aria-hidden="true" className="pointer-events-none absolute left-4 top-2 text-lg text-[var(--nav-muted)]">⌕</span>
        <input id="nav-search" type="search" disabled aria-describedby="search-pending" placeholder="Buscar usuarios, publicaciones o eventos…" className="h-10 w-full rounded-full bg-[var(--nav-sidebar)] pl-10 pr-4 text-xs text-[var(--nav-light)] placeholder:text-[var(--nav-muted)] disabled:cursor-not-allowed" />
        <span id="search-pending" className="sr-only">Búsqueda disponible próximamente</span>
      </div>
      <div className="flex h-11 w-64 shrink-0 items-center gap-4">
        <button type="button" disabled title="Crear publicación estará disponible próximamente" className="h-10 w-36 rounded-full bg-[var(--nav-lime)] text-xs font-semibold text-[var(--nav-ink)] disabled:cursor-not-allowed">+ Crear publicación</button>
        <Link to="/app/notificaciones" aria-label={hasCount ? `Notificaciones: ${notificationCount}` : 'Notificaciones'} className="relative flex size-10 items-center justify-center rounded-full text-[var(--nav-muted)] hover:bg-[var(--nav-active)] focus-visible:outline-2 focus-visible:outline-[var(--nav-lime)]">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5"><path d="M12 2a2 2 0 0 0-2 2v.2A7 7 0 0 0 5 11v4l-1.5 2.5A1 1 0 0 0 4.4 19h15.2a1 1 0 0 0 .9-1.5L19 15v-4a7 7 0 0 0-5-6.8V4a2 2 0 0 0-2-2Zm-2 19a2 2 0 0 0 4 0h-4Z" /></svg>
          {hasCount && <span className="absolute -right-1 -top-1 rounded-full bg-[var(--nav-lime)] px-1.5 text-[10px] font-bold text-[var(--nav-ink)]">{notificationCount}</span>}
        </Link>
      </div>
      <UserAccount />
    </header>
  )
}
