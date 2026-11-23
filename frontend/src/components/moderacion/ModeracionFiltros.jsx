import { ESTADOS_PROPUESTA_MODERABLES } from '../../services/moderacionService'
import { ESTADOS_REPORTE } from '../../services/reportesService'

export default function ModeracionFiltros({
  seccion,
  filtrosEventos,
  busqueda,
  onBusqueda,
  onFiltroEventos,
  filtrosReportes,
  onFiltroReportes,
  onLimpiar,
  cargando,
}) {
  const esEventos = seccion === 'eventos'

  return (
    <form
      role="search"
      aria-label={esEventos ? 'Búsqueda y filtros de propuestas' : 'Búsqueda y filtros de reportes'}
      className={`mod-filtros ${esEventos ? '' : 'mod-filtros--reportes'}`}
      aria-busy={cargando}
      onSubmit={(event) => event.preventDefault()}
    >
      {esEventos ? (
        <>
          <label className="mod-campo mod-campo--busqueda" htmlFor="mod-busqueda-eventos">
            <span>Buscar propuesta</span>
            <input
              id="mod-busqueda-eventos"
              type="search"
              value={busqueda}
              onChange={(event) => onBusqueda(event.target.value)}
              placeholder="Título, descripción o ubicación"
              maxLength={100}
            />
          </label>
          <label className="mod-campo" htmlFor="mod-estado-evento">
            <span>Estado</span>
            <select
              id="mod-estado-evento"
              value={filtrosEventos.estado}
              onChange={(event) => onFiltroEventos('estado', event.target.value)}
            >
              {ESTADOS_PROPUESTA_MODERABLES.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
            </select>
          </label>
          <label className="mod-campo" htmlFor="mod-fecha-desde">
            <span>Desde</span>
            <input
              id="mod-fecha-desde"
              type="date"
              value={filtrosEventos.fechaDesde}
              onChange={(event) => onFiltroEventos('fechaDesde', event.target.value)}
            />
          </label>
          <label className="mod-campo" htmlFor="mod-fecha-hasta">
            <span>Hasta</span>
            <input
              id="mod-fecha-hasta"
              type="date"
              value={filtrosEventos.fechaHasta}
              onChange={(event) => onFiltroEventos('fechaHasta', event.target.value)}
            />
          </label>
        </>
      ) : (
        <label className="mod-campo mod-campo--busqueda" htmlFor="mod-estado-reporte">
          <span>Estado del reporte</span>
          <select
            id="mod-estado-reporte"
            value={filtrosReportes.estado}
            onChange={(event) => onFiltroReportes('estado', event.target.value)}
          >
            <option value="">Todos los estados</option>
            {ESTADOS_REPORTE.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
          </select>
        </label>
      )}
      <button type="button" onClick={onLimpiar} className="mod-btn mod-btn--secundario mod-limpiar">
        Limpiar filtros
      </button>
    </form>
  )
}
