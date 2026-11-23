import ModalContainer from '../modales/ModalContainer'
import DetallePropuesta from './DetallePropuesta'

export default function RevisarPropuestaModal({ propuesta, onClose, onElegir }) {
  if (!propuesta) return null
  return (
    <ModalContainer
      titleId="mod-revisar-titulo"
      descriptionId="mod-revisar-descripcion"
      title="Revisar propuesta"
      description="Verifica la información enviada antes de tomar una decisión definitiva."
      eyebrow="MODERACIÓN DE EVENTOS"
      ancho={680}
      className="mod-modal"
      onClose={onClose}
    >
      <div className="mod-modal-body">
        <DetallePropuesta propuesta={propuesta} />
        <p className="mod-modal-nota">
          La aprobación o el rechazo quedan registrados con tu usuario y la fecha de resolución.
        </p>
      </div>
      <footer className="mod-modal-pie">
        <button type="button" data-modal-autofocus className="mod-btn mod-btn--secundario" onClick={onClose}>Cancelar</button>
        <button type="button" className="mod-btn mod-btn--peligro" onClick={() => onElegir('rechazar')}>Rechazar propuesta</button>
        <button type="button" className="mod-btn mod-btn--primario" onClick={() => onElegir('aprobar')}>Aprobar propuesta</button>
      </footer>
    </ModalContainer>
  )
}
