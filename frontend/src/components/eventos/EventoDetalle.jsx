import { AVISO_ACCIONES_ID } from './EventoCard'

function nombreProponente(proponente) {
  if (!proponente) return null
  if (typeof proponente === 'string') return proponente
  return proponente.nombre ?? proponente.usuario ?? null
}

export default function EventoDetalle({ evento, onInscribir }) {
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
          <div className="evt-detail-head">
            <span className={`evt-chip evt-chip--${evento.estadoTono}`}>{evento.estadoEtiqueta}</span>
            <h2 className="evt-detail-titulo">{evento.titulo}</h2>
            {evento.esPasado && <span className="evt-chip evt-chip--pasado">Evento finalizado</span>}
          </div>

          <p className="evt-detail-descripcion">
            {evento.descripcion ?? 'El backend no ha proporcionado una descripción para este evento.'}
          </p>

          <dl className="evt-detail-list">
            <div>
              <dt>Fecha y horario</dt>
              <dd>{evento.rangoFechas}{evento.horaInicio ? ` · ${evento.horaInicio}${evento.horaFin ? ` – ${evento.horaFin}` : ''} h` : ''}</dd>
            </div>
            {evento.ubicacion && <div><dt>Ubicación</dt><dd>{evento.ubicacion}</dd></div>}
            {evento.cupoMaximo !== null && <div><dt>Cupo máximo</dt><dd>{evento.cupoMaximo} plazas</dd></div>}
            {evento.participantesConfirmados !== null && (
              <div><dt>Participantes confirmados</dt><dd>{evento.participantesConfirmados}</dd></div>
            )}
            {nombreProponente(evento.proponente) && (
              <div><dt>Proponente</dt><dd>{nombreProponente(evento.proponente)}</dd></div>
            )}
            <div><dt>Estado del evento</dt><dd>{evento.estadoEtiqueta}</dd></div>
            {evento.inscripcionEtiqueta && <div><dt>Tu inscripción</dt><dd>{evento.inscripcionEtiqueta}</dd></div>}
          </dl>

          <p className="evt-detail-note">
            Coordenadas GPS, mapa de monitoreo, equipo técnico y etiquetas taxonómicas se incorporarán cuando el backend los exponga.
          </p>

          {evento.estado === 'APROBADO' && evento.cupoDisponible !== false && !evento.esPasado && !evento.inscripcionEstado && (
            <button
              type="button"
              className="evt-btn evt-btn--primary evt-detail-action"
              aria-describedby={AVISO_ACCIONES_ID}
              onClick={() => onInscribir?.(evento)}
            >
              Inscribirme
            </button>
          )}
        </>
      )}
    </aside>
  )
}
