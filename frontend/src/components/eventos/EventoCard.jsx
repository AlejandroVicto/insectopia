import { puedeCancelarInscripcion, puedeEditarEvento, puedeInscribirseEvento } from './eventosPermisos'

function diaYMes(fechaTexto) {
  const partes = (fechaTexto ?? '').split(/\s+/)
  return { dia: partes[0] ?? '', mes: partes[1] ?? '' }
}

export default function EventoCard({
  evento,
  seleccionado = false,
  onVerDetalle,
  onInscribir,
  onEditar,
  onCancelarInscripcion,
}) {
  const { dia, mes } = diaYMes(evento.fechaInicioTexto)
  const tieneCupo = evento.cupoMaximo !== null && evento.participantesConfirmados !== null
  const porcentaje = tieneCupo && evento.cupoMaximo > 0
    ? Math.min(100, Math.round((evento.participantesConfirmados / evento.cupoMaximo) * 100))
    : 0
  const puedeInscribirse = puedeInscribirseEvento(evento)
  const puedeEditar = puedeEditarEvento(evento)
  const puedeCancelar = puedeCancelarInscripcion(evento)

  return (
    <article
      className={`evt-card evt-card--${evento.estadoTono} ${seleccionado ? 'evt-card--seleccionado' : ''} ${evento.esPasado ? 'evt-card--pasado' : ''}`}
      aria-label={`Evento: ${evento.titulo}`}
    >
      <div className="evt-thumb">
        {evento.imagenUrl ? (
          <img src={evento.imagenUrl} alt={`Imagen del evento ${evento.titulo}`} />
        ) : (
          <div className="evt-thumb-vacio" role="img" aria-label="Sin fotografía disponible">
            <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M24 40c-9-6-13-14-8-21 3-4 8-5 8-5s5 1 8 5c5 7 1 15-8 21Z" />
              <path d="M24 14V8M17 17l-5-4M31 17l5-4M18 27h12" />
            </svg>
            <span>Sin fotografía</span>
          </div>
        )}
        <div className="evt-date-badge" aria-label={`Fecha de inicio: ${evento.fechaInicioTexto}`}>
          <span className="evt-date-mes">{mes.toUpperCase()}</span>
          <span className="evt-date-dia">{dia}</span>
        </div>
      </div>

      <div className="evt-card-body">
        <div className="evt-card-top">
          <span className={`evt-chip evt-chip--${evento.estadoTono}`}>{evento.estadoEtiqueta}</span>
          {evento.ubicacion && <span className="evt-lugar" aria-label={`Ubicación: ${evento.ubicacion}`}>◉ {evento.ubicacion}</span>}
        </div>

        <div className="evt-card-copy">
          <h3 className="evt-titulo">{evento.titulo}</h3>
          <p className="evt-descripcion">{evento.descripcion ?? 'Sin descripción disponible.'}</p>
        </div>

        <div className="evt-card-actions">
          <div className="evt-meta">
            <span>{evento.rangoFechas}</span>
            {evento.horaInicio && <span>{evento.horaInicio}{evento.horaFin ? ` – ${evento.horaFin}` : ''} h</span>}
          </div>
          <div className="evt-action-row">
            {tieneCupo && (
              <div className="evt-cupo" aria-label={`Cupo: ${evento.participantesConfirmados} de ${evento.cupoMaximo} participantes`}>
                <span>Cupo: {evento.participantesConfirmados}/{evento.cupoMaximo}</span>
                <span className="evt-bar" aria-hidden="true">
                  <span className={evento.cupoDisponible === false ? 'evt-bar-fill evt-bar-fill--lleno' : 'evt-bar-fill'} style={{ width: `${porcentaje}%` }} />
                </span>
              </div>
            )}
            {evento.cupoDisponible === false && <span className="evt-chip evt-chip--lleno">Cupo completo</span>}
            {evento.esPasado && <span className="evt-chip evt-chip--pasado">Finalizado</span>}
            {evento.inscripcionEtiqueta && <span className="evt-chip evt-chip--inscrito">{evento.inscripcionEtiqueta}</span>}
            <button type="button" className="evt-btn evt-btn--ghost" onClick={() => onVerDetalle?.(evento)}>
              Ver detalles
            </button>
            {puedeEditar && (
              <button type="button" className="evt-btn evt-btn--ghost" onClick={() => onEditar?.(evento)}>
                Editar
              </button>
            )}
            {puedeCancelar && (
              <button type="button" className="evt-btn evt-btn--ghost" onClick={() => onCancelarInscripcion?.(evento)}>
                Cancelar inscripción
              </button>
            )}
            {puedeInscribirse && (
              <button
                type="button"
                className="evt-btn evt-btn--primary"
                onClick={() => onInscribir?.(evento)}
              >
                Inscribirme
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
