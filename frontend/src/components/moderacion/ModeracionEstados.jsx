export function ModeracionCargando({ seccion }) {
  const etiqueta = seccion === 'eventos' ? 'Cargando propuestas' : 'Cargando reportes'
  return (
    <div role="status" className="mod-estado" aria-live="polite">
      <span className="mod-estado-icono" aria-hidden="true">◌</span>
      <h3>{etiqueta}…</h3>
      <p>Consultando el backend con los filtros seleccionados.</p>
    </div>
  )
}

export function ModeracionError({ mensaje, onReintentar }) {
  return (
    <div role="alert" className="mod-estado mod-estado--error">
      <span className="mod-estado-icono" aria-hidden="true">!</span>
      <h3>No pudimos cargar la bandeja</h3>
      <p>{mensaje}</p>
      <button type="button" className="mod-btn mod-btn--secundario" onClick={onReintentar}>Reintentar</button>
    </div>
  )
}

export function ModeracionVacio({ seccion, filtrado, onLimpiar }) {
  const titulo = filtrado
    ? 'Sin coincidencias con los filtros'
    : seccion === 'eventos' ? 'No hay propuestas para revisar' : 'No hay reportes registrados'
  return (
    <div role="status" className="mod-estado">
      <span className="mod-estado-icono" aria-hidden="true">○</span>
      <h3>{titulo}</h3>
      <p>
        {filtrado
          ? 'Ajusta los filtros para ampliar la consulta.'
          : 'Las decisiones y los reportes aparecerán aquí cuando existan.'}
      </p>
      {filtrado && (
        <button type="button" className="mod-btn mod-btn--secundario" onClick={onLimpiar}>Limpiar filtros</button>
      )}
    </div>
  )
}
