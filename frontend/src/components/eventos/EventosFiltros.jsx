const ESTADOS = [
  { value: '', label: 'Estado: Sin filtrar' },
  { value: 'APROBADO', label: 'Estado: Aprobado' },
  { value: 'PENDIENTE', label: 'Estado: Pendiente' },
  { value: 'RECHAZADO', label: 'Estado: Rechazado' },
  { value: 'CANCELADO', label: 'Estado: Cancelado' },
]

const PERIODOS = [
  { value: '', label: 'Fecha: Todas' },
  { value: 'futuros', label: 'Fecha: Próximos' },
  { value: 'pasados', label: 'Fecha: Pasados' },
]

export default function EventosFiltros({
  busqueda,
  onBusqueda,
  estado,
  soloAprobados = false,
  proximos = false,
  onEstado,
  periodo,
  onPeriodo,
  fechaDesde,
  fechaHasta,
  onFecha,
  onLimpiar,
}) {
  return (
    <section aria-label="Búsqueda y filtros de eventos" className="evt-filtros evt-panel">
      <div className="evt-busqueda">
        <span aria-hidden="true" className="evt-lupa">⌕</span>
        <label htmlFor="eventos-q" className="sr-only">Buscar eventos por nombre, descripción o localidad</label>
        <input
          id="eventos-q"
          type="search"
          value={busqueda}
          onChange={(evento) => onBusqueda(evento.target.value)}
          placeholder="Buscar por nombre, descripción o localidad..."
        />
      </div>

      <div className={`evt-filtros-grid${soloAprobados ? ' evt-filtros-grid--sin-estado' : ''}`}>
        {!soloAprobados && (
          <label>
            <span className="sr-only">Filtrar por estado del evento</span>
            <select className="evt-select" value={estado} onChange={(evento) => onEstado(evento.target.value)}>
              {ESTADOS.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}
            </select>
          </label>
        )}

        <label>
          <span className="sr-only">Filtrar por fecha del evento</span>
          <select className="evt-select" value={periodo} onChange={(evento) => onPeriodo(evento.target.value)}>
            {PERIODOS.filter((opcion) => !proximos || opcion.value !== 'pasados')
              .map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}
          </select>
        </label>

        <label>
          <span>Desde</span>
          <input className="evt-select" type="date" value={fechaDesde} onChange={(evento) => onFecha('fechaDesde', evento.target.value)} />
        </label>

        <label>
          <span>Hasta</span>
          <input className="evt-select" type="date" value={fechaHasta} onChange={(evento) => onFecha('fechaHasta', evento.target.value)} />
        </label>
      </div>

      <button type="button" className="evt-btn evt-btn--ghost evt-limpiar" onClick={onLimpiar}>
        Limpiar filtros
      </button>
    </section>
  )
}
