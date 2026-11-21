export function NotificacionesSkeleton() {
  return <div role="status" className="notif-state notif-loading">
    <h2>Cargando notificaciones…</h2>
    <div aria-hidden="true" className="notif-skeletons">{[0, 1, 2, 3].map((i) =>
      <div key={i} className="notif-skeleton"><span /><div><span /><span /><span /></div></div>)}</div>
  </div>
}

export function NotificacionesEmpty({ filtro }) {
  return <section className="notif-state" aria-label="Sin notificaciones">
    <span aria-hidden="true" className="notif-state-icon">◎</span>
    <h2>{filtro === 'no-leidas' ? 'No tienes notificaciones sin leer'
      : filtro === 'leidas' ? 'No tienes notificaciones leídas' : 'Sin notificaciones'}</h2>
    <p>{filtro === 'todas' ? 'Aquí aparecerán las novedades de tu comunidad cuando existan.'
      : 'Cuando haya actividad en este filtro, aparecerá aquí.'}</p>
  </section>
}

export function NotificacionesError({ onRetry }) {
  return <section className="notif-state" role="alert">
    <h2>No pudimos cargar tu actividad</h2>
    <p>Reintenta; no se sustituyen errores de la API con datos ficticios.</p>
    <button type="button" className="notif-primary" onClick={onRetry}>Reintentar</button>
  </section>
}
