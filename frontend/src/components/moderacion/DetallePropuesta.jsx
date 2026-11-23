import { formatearFecha, nombreProponente } from '../../utils/moderacion'

export default function DetallePropuesta({ propuesta }) {
  if (!propuesta) return null
  return (
    <dl className="mod-detalle">
      <div><dt>Título</dt><dd>{propuesta.titulo}</dd></div>
      <div><dt>Proponente</dt><dd>{nombreProponente(propuesta)}</dd></div>
      <div className="mod-detalle--amplio"><dt>Descripción</dt><dd>{propuesta.descripcion || 'Sin descripción'}</dd></div>
      <div><dt>Fecha de inicio</dt><dd>{formatearFecha(propuesta.fechaInicio, { incluirHora: true })}</dd></div>
      <div><dt>Fecha de envío</dt><dd>{formatearFecha(propuesta.fechaCreacion, { incluirHora: true })}</dd></div>
      <div><dt>Ubicación</dt><dd>{propuesta.ubicacion || 'No disponible'}</dd></div>
      <div><dt>Cupo propuesto</dt><dd>{propuesta.cupoMaximo ?? 'No disponible'}</dd></div>
      <div><dt>Estado</dt><dd>{propuesta.estado || 'SIN ESTADO'}</dd></div>
      {propuesta.motivoResolucion && (
        <div className="mod-detalle--amplio"><dt>Motivo de resolución</dt><dd>{propuesta.motivoResolucion}</dd></div>
      )}
    </dl>
  )
}
