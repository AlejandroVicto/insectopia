import { fechaNotificacion } from './fechaNotificacion'
import { Link } from 'react-router-dom'

const LABELS = {
  COMENTARIO: { icon: '✎', title: 'comentó tu publicación' },
  REACCION: { icon: '♥', title: 'reaccionó a tu publicación' },
  REPORTE_RESUELTO: { icon: '✓', title: 'Tu reporte fue resuelto' },
  REPORTE_RECHAZADO: { icon: '!', title: 'Tu reporte fue rechazado' },
  NUEVO_SEGUIDOR: { icon: '✦', title: 'comenzó a seguirte' },
  NUEVA_PUBLICACION: { icon: '✎', title: 'compartió una publicación' },
  NUEVO_MENSAJE: { icon: '✉', title: 'te envió un mensaje privado' },
  MENSAJE: { icon: '✉', title: 'te envió un mensaje privado' },
  EVENTO_APROBADO: { icon: '✓', title: 'Tu evento fue aprobado' },
  EVENTO_RECHAZADO: { icon: '!', title: 'Tu evento fue rechazado' },
}

export default function NotificacionCard({ notificacion, onRead, onDelete, onNavigate, pending = false, error = '' }) {
  const { id, tipo, contenido, actor, fechaCreacion, leida, recurso } = notificacion
  const variant = LABELS[tipo]
  const title = variant ? actor?.nombreUsuario
    ? `@${actor.nombreUsuario} ${variant.title}`
    : variant.title.charAt(0).toUpperCase() + variant.title.slice(1)
    : 'Nueva actividad'
  const publicationId = recurso?.id
  const publicationLink = ['COMENTARIO', 'REACCION'].includes(tipo) && recurso?.tipo === 'PUBLICACION'
    && recurso.disponible === true && Number.isSafeInteger(publicationId) && publicationId > 0
    && recurso.apiUrl === `/api/publicaciones/${publicationId}`
  const conversationId = recurso?.conversacionId
  const messageLink = ['MENSAJE', 'NUEVO_MENSAJE'].includes(tipo) && recurso?.tipo === 'MENSAJE'
    && recurso.disponible === true && Number.isSafeInteger(recurso.id) && recurso.id > 0
    && Number.isSafeInteger(conversationId) && conversationId > 0
    && recurso.apiUrl === `/api/conversaciones/${conversationId}`
  const destination = publicationLink ? `/app/publicaciones/${publicationId}`
    : messageLink ? `/app/mensajes?conversacion=${conversationId}` : null
  const unavailable = recurso != null && !recurso.disponible

  function navigate(event) {
    if (!destination || !onNavigate) return
    event.preventDefault()
    onNavigate(notificacion, destination)
  }

  function activate(event) {
    if (event.target.closest('a, button')) return
    if (destination && onNavigate) onNavigate(notificacion, destination)
  }

  return <article aria-label={`Notificación ${id}`} className={`notif-row ${leida ? 'notif-row--read' : ''}`}
    onClick={activate} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); activate(event) } }}
    tabIndex={destination && onNavigate ? 0 : undefined}>
    <div className="notif-icon" aria-hidden="true">{variant?.icon ?? '●'}</div>
    <div className="notif-row-body">
      <div className="notif-row-heading">
        <h3>{title}</h3>
        {!leida && <span className="notif-unread-dot" aria-hidden="true" />}
      </div>
      <p className="notif-row-description">{contenido}</p>
      <div className="notif-row-footer">
        <time dateTime={fechaCreacion || undefined}>{fechaNotificacion(fechaCreacion)}</time>
        {unavailable && <span className="notif-unavailable" title="Este recurso ya no está disponible o no se puede consultar">Contenido no disponible</span>}
        {destination && <Link className="notif-resource-link" to={destination} onClick={navigate}>
          {publicationLink ? 'Ver publicación' : 'Ir a conversación'}
        </Link>}
        <span className="notif-read-state">{leida ? 'Leída' : 'No leída'}</span>
        {!leida && <button type="button" disabled={pending} onClick={() => onRead(id)} className="notif-secondary">
          {pending ? 'Marcando…' : 'Marcar leída'}
        </button>}
        <button type="button" disabled={pending} onClick={() => onDelete(id)} className="notif-remove"
          aria-label={`Eliminar notificación ${id}`} title="Eliminar notificación">×</button>
      </div>
      {error && <p className="notif-inline-error" role="alert">{error}</p>}
    </div>
  </article>
}
