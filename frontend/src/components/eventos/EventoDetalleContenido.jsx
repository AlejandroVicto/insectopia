function nombreProponente(proponente) {
  if (!proponente) return null
  if (typeof proponente === 'string') return proponente
  return proponente.nombre ?? proponente.usuario ?? null
}

function motivoRechazoVisible(evento) {
  if (evento?.estado !== 'RECHAZADO' || !evento.esPropio) return null
  const motivo = typeof evento.motivoResolucion === 'string' ? evento.motivoResolucion.trim() : ''
  return motivo || null
}

// Contenido compartido por el panel lateral de la 069 y el modal de detalles 071.
// No incluye botones ni campos que no existen en el modelo persistente.
export default function EventoDetalleContenido({ evento }) {
  const motivo = motivoRechazoVisible(evento)
  const proponente = nombreProponente(evento.proponente)

  return (
    <>
      <div className="evt-detail-head">
        <span className={`evt-chip evt-chip--${evento.estadoTono}`}>{evento.estadoEtiqueta}</span>
        <h2 className="evt-detail-titulo">{evento.titulo}</h2>
        {evento.esPasado && <span className="evt-chip evt-chip--pasado">Evento finalizado</span>}
      </div>

      {evento.imagenUrl ? (
        <img
          className="evt-detail-imagen"
          src={evento.imagenUrl}
          alt={`Imagen del evento ${evento.titulo}`}
        />
      ) : (
        <div className="evt-detail-imagen evt-detail-imagen--vacia" role="img" aria-label="Sin fotografía disponible">
          Sin fotografía disponible
        </div>
      )}

      <p className="evt-detail-descripcion">
        {evento.descripcion ?? 'El backend no ha proporcionado una descripción para este evento.'}
      </p>

      <dl className="evt-detail-list">
        <div>
          <dt>Fecha y horario</dt>
          <dd>
            {evento.rangoFechas}
            {evento.horaInicio ? ` · ${evento.horaInicio}${evento.horaFin ? ` – ${evento.horaFin}` : ''} h` : ''}
          </dd>
        </div>
        {evento.ubicacion && <div><dt>Ubicación</dt><dd>{evento.ubicacion}</dd></div>}
        {evento.cupoMaximo !== null && <div><dt>Cupo máximo</dt><dd>{evento.cupoMaximo} plazas</dd></div>}
        {evento.participantesConfirmados !== null && (
          <div><dt>Participantes confirmados</dt><dd>{evento.participantesConfirmados}</dd></div>
        )}
        {proponente && <div><dt>Proponente</dt><dd>{proponente}</dd></div>}
        <div><dt>Estado del evento</dt><dd>{evento.estadoEtiqueta}</dd></div>
        {evento.inscripcionEtiqueta && <div><dt>Tu inscripción</dt><dd>{evento.inscripcionEtiqueta}</dd></div>}
      </dl>

      {motivo && (
        <section className="evt-rechazo" aria-label="Motivo del rechazo">
          <h3>Motivo del rechazo</h3>
          <p>{motivo}</p>
        </section>
      )}
    </>
  )
}
