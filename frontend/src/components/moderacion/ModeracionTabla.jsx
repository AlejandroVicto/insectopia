import { claseEstado, esEstadoFinal, formatearFecha, nombreProponente } from '../../utils/moderacion'

function Chip({ estado }) {
  return <span className={`mod-chip ${claseEstado(estado)}`}>{estado || 'SIN ESTADO'}</span>
}

function FilaEvento({ propuesta, onRevisar }) {
  const final = esEstadoFinal('eventos', propuesta.estado)
  return (
    <tr>
      <th scope="row">
        <span className="mod-recurso-titulo">{propuesta.titulo}</span>
        <span className="mod-recurso-meta">Proponente: {nombreProponente(propuesta)}</span>
        <span className="mod-recurso-descripcion">{propuesta.descripcion || 'Sin descripción'}</span>
        <span className="mod-recurso-meta">{propuesta.ubicacion || 'Ubicación no disponible'}</span>
        {propuesta.motivoResolucion && (
          <span className="mod-recurso-motivo">Motivo: {propuesta.motivoResolucion}</span>
        )}
      </th>
      <td>{formatearFecha(propuesta.fechaInicio, { incluirHora: true })}</td>
      <td><Chip estado={propuesta.estado} /></td>
      <td>Evento</td>
      <td>
        <button
          type="button"
          className="mod-btn mod-btn--primario"
          disabled={final}
          onClick={() => onRevisar(propuesta)}
          title={final ? 'Esta propuesta ya tiene una resolución definitiva' : 'Revisar propuesta'}
        >
          Revisar
        </button>
      </td>
    </tr>
  )
}

function FilaReporte({ reporte, onRevisar }) {
  const final = esEstadoFinal('reportes', reporte.estado)
  return (
    <tr>
      <th scope="row">
        <span className="mod-recurso-titulo">Reporte #{reporte.id} · {reporte.motivo}</span>
        <span className="mod-recurso-descripcion">{reporte.descripcion || 'Sin descripción adicional'}</span>
        <span className="mod-recurso-meta">Publicación #{reporte.publicacionId ?? 'sin vínculo'}</span>
        {reporte.resolucion && <span className="mod-recurso-motivo">Resolución: {reporte.resolucion}</span>}
      </th>
      <td>{formatearFecha(reporte.fechaReporte, { incluirHora: true })}</td>
      <td><Chip estado={reporte.estado} /></td>
      <td>Reporte</td>
      <td>
        <button
          type="button"
          className="mod-btn mod-btn--primario"
          disabled={final}
          onClick={() => onRevisar(reporte)}
          title={final ? 'Este reporte ya tiene una resolución final' : 'Revisar y resolver reporte'}
        >
          Resolver
        </button>
      </td>
    </tr>
  )
}

export default function ModeracionTabla({ seccion, contenido, onRevisar }) {
  const esEventos = seccion === 'eventos'
  return (
    <div className="mod-tabla-contenedor">
      <table className="mod-tabla">
        <caption className="sr-only">
          {esEventos ? 'Propuestas de eventos pendientes de revisión' : 'Reportes de publicaciones'}
        </caption>
        <thead>
          <tr>
            <th scope="col">Recurso</th>
            <th scope="col">Fecha</th>
            <th scope="col">Estado</th>
            <th scope="col">Tipo</th>
            <th scope="col">Acción</th>
          </tr>
        </thead>
        <tbody>
          {contenido.map((recurso) => esEventos
            ? <FilaEvento key={recurso.idEvento} propuesta={recurso} onRevisar={onRevisar} />
            : <FilaReporte key={reporteKey(recurso)} reporte={recurso} onRevisar={onRevisar} />)}
        </tbody>
      </table>
    </div>
  )
}

function reporteKey(reporte) {
  return reporte.id ?? `${reporte.publicacionId}-${reporte.fechaReporte}`
}
