import { formatearFecha } from '../../utils/moderacion'

export default function DetalleReporte({ reporte }) {
  if (!reporte) return null
  return (
    <dl className="mod-detalle">
      <div><dt>Identificador</dt><dd>Reporte #{reporte.id}</dd></div>
      <div><dt>Motivo</dt><dd>{reporte.motivo}</dd></div>
      <div className="mod-detalle--amplio"><dt>Descripción</dt><dd>{reporte.descripcion || 'Sin descripción adicional'}</dd></div>
      <div><dt>Publicación</dt><dd>#{reporte.publicacionId ?? 'sin vínculo'}</dd></div>
      <div><dt>Fecha del reporte</dt><dd>{formatearFecha(reporte.fechaReporte, { incluirHora: true })}</dd></div>
      <div><dt>Estado</dt><dd>{reporte.estado || 'SIN ESTADO'}</dd></div>
      {reporte.reportanteId != null && <div><dt>Reportante</dt><dd>Usuario #{reporte.reportanteId}</dd></div>}
      {reporte.moderadorId != null && <div><dt>Moderador</dt><dd>Usuario #{reporte.moderadorId}</dd></div>}
      {reporte.resolucion && (
        <div className="mod-detalle--amplio"><dt>Resolución previa</dt><dd>{reporte.resolucion}</dd></div>
      )}
    </dl>
  )
}
