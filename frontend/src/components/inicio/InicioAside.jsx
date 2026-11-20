import { Link } from 'react-router-dom'
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

export function SuggestedUsers({ users }) {
  return <Panel heading="PERSONAS SUGERIDAS"><ul className="grid gap-2">
    {users.map((user) => <li key={user.id} className="flex min-w-0 items-center gap-2">
      <Avatar name={user.nombre} src={user.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{user.nombre}</p><p className="truncate text-[10px] text-[var(--inicio-muted)]">@{user.nombreUsuario}{user.interes ? ` · ${user.interes}` : ''}</p></div>
      <button type="button" disabled title="Seguimiento pendiente de API" className="inicio-pending text-[10px] text-[var(--inicio-lime)]">Seguir</button>
    </li>)}
  </ul></Panel>
}

export function TrendingSpecies({ species }) {
  return <Panel heading="ESPECIES EN TENDENCIA"><ol className="grid gap-2">
    {species.map((item, index) => <li key={item.id} className="flex min-w-0 items-center gap-3 rounded-lg bg-[var(--inicio-inset)] px-3 py-2">
      <span className="w-7 shrink-0 font-bold text-[var(--inicio-lime)]">#{index + 1}</span>
      <div className="min-w-0"><p className="truncate text-xs font-semibold italic">{item.nombre}</p><p className="text-[10px] text-[var(--inicio-muted)]">{new Intl.NumberFormat('es-MX', { notation: 'compact' }).format(item.registros)} registros</p></div>
    </li>)}
  </ol></Panel>
}

export function UpcomingEvents({ events }) {
  return <Panel heading="PRÓXIMOS EVENTOS" action={<Link to="/app/eventos" className="text-[10px] font-bold text-[var(--inicio-lime)] hover:underline">Ver todos</Link>}>
    {events.map((event) => <div key={event.id} className="inicio-inset rounded-xl p-3">
      <p className="text-[10px] font-bold text-[var(--inicio-lime)]">{event.tipo}</p>
      <p className="mt-2 text-xs font-bold">{event.nombre}</p>
      <p className="mt-1 text-xs text-[var(--inicio-muted)]">{event.ubicacion}</p>
      <Link to="/app/eventos" className="inicio-primary mt-3 block py-2 text-center text-xs">Ver detalles</Link>
    </div>)}
    <div role="img" aria-label="Mapa de eventos pendiente de recursos gráficos" className="inicio-map mt-2.5 flex h-24 items-center justify-center rounded-xl text-center text-[10px] text-[var(--inicio-muted)]">Mapa de eventos<br/>próximamente</div>
  </Panel>
}
