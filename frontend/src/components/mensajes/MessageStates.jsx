export function EmptyState({ title, children, action }) {
  return <div className="msg-empty" role="status"><span className="msg-empty-icon" aria-hidden="true">✳</span>
    <h3 className="font-display text-base font-bold">{title}</h3><p>{children}</p>{action}</div>
}

export function ErrorState({ onRetry }) {
  return <div className="msg-empty" role="alert"><h3 className="font-display text-base font-bold">No pudimos cargar los mensajes</h3>
    <p>Revisa la conexión e inténtalo de nuevo.</p><button className="msg-action" type="button" onClick={onRetry}>Reintentar</button></div>
}

export function LoadingState({ label = 'Cargando conversaciones' }) {
  return <div role="status" aria-label={label} className="msg-skeletons"><span /><span /><span /></div>
}
