import { puedeCancelarInscripcion, puedeEditarEvento, puedeInscribirseEvento } from './eventosPermisos'
import EventoDetalleContenido from './EventoDetalleContenido'

export default function EventoDetalle({ evento, onInscribir, onEditar, onCancelarInscripcion }) {
  return (
    <aside aria-label="Detalle del evento" className="evt-detail evt-panel">
      {!evento ? (
        <div className="evt-detail-empty">
          <span aria-hidden="true" className="evt-empty-icon">◇</span>
          <h2>Detalle del evento</h2>
          <p>Selecciona un evento de la lista para consultar la información disponible.</p>
        </div>
      ) : (
        <>
          <EventoDetalleContenido evento={evento} />

          <div className="evt-detail-actions">
            {puedeEditarEvento(evento) && (
              <button type="button" className="evt-btn evt-btn--ghost evt-detail-action" onClick={() => onEditar?.(evento)}>
                Editar propuesta
              </button>
            )}
            {puedeCancelarInscripcion(evento) && (
              <button type="button" className="evt-btn evt-btn--ghost evt-detail-action" onClick={() => onCancelarInscripcion?.(evento)}>
                Cancelar inscripción
              </button>
            )}
            {puedeInscribirseEvento(evento) && (
              <button type="button" className="evt-btn evt-btn--primary evt-detail-action" onClick={() => onInscribir?.(evento)}>
                Inscribirme
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
