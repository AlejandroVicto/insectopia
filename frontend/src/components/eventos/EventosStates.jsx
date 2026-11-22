export function EventosCargando() {
  return (
    <div role="status" aria-label="Cargando eventos" className="evt-estado evt-skeleton">
      {[1, 2].map((id) => (
        <div key={id} className="evt-skeleton-card">
          <div className="evt-skeleton-thumb" />
          <div className="evt-skeleton-lineas">
            <span /><span /><span />
          </div>
        </div>
      ))}
      <span className="sr-only">Cargando eventos…</span>
    </div>
  )
}

export function EventosVacio({ filtrado, onLimpiar }) {
  return (
    <section role="status" className="evt-estado evt-panel">
      <span aria-hidden="true" className="evt-empty-icon">◇</span>
      <h2>{filtrado ? 'Sin coincidencias de búsqueda' : 'Aún no hay eventos disponibles'}</h2>
      <p>
        {filtrado
          ? 'Prueba con otro nombre, estado o rango de fechas.'
          : 'Cuando el backend publique eventos aparecerán en esta sección.'}
      </p>
      {filtrado && <button type="button" className="evt-btn evt-btn--primary" onClick={onLimpiar}>Limpiar filtros</button>}
    </section>
  )
}

const MENSAJES_ERROR = {
  'no-disponible': {
    titulo: 'Todavía no se pueden consultar los eventos',
    detalle: 'El servicio estará disponible cuando se integre el backend.',
  },
  red: {
    titulo: 'No se pudo conectar con el backend',
    detalle: 'Comprueba la conexión e inténtalo de nuevo.',
  },
  http: {
    titulo: 'No pudimos cargar los eventos',
    detalle: 'El backend respondió con un error. Inténtalo de nuevo.',
  },
}

export function EventosError({ tipo = 'http', onRetry }) {
  const mensaje = MENSAJES_ERROR[tipo] ?? MENSAJES_ERROR.http
  return (
    <section role="alert" className="evt-estado evt-panel">
      <span aria-hidden="true" className="evt-empty-icon evt-empty-icon--error">!</span>
      <h2>{mensaje.titulo}</h2>
      <p>{mensaje.detalle}</p>
      <button type="button" className="evt-btn evt-btn--primary" onClick={onRetry}>Reintentar</button>
    </section>
  )
}

export function FiltroPendiente({ etiqueta }) {
  return (
    <section role="note" className="evt-estado evt-panel">
      <span aria-hidden="true" className="evt-empty-icon">◇</span>
      <h2>Filtro pendiente de integración</h2>
      <p>
        «{etiqueta}» requiere un contrato del backend 070 que todavía no está publicado.
        No se muestran resultados simulados.
      </p>
    </section>
  )
}
