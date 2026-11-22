import ModalContainer from '../modales/ModalContainer'
import { CLASE_BOTON_SECUNDARIO } from '../../constants/modalesPublicaciones'
import EventoDetalleContenido from './EventoDetalleContenido'

function IconoDetalle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
    </svg>
  )
}

export default function EventoDetallesModal({ open = true, evento, onClose }) {
  if (!open || !evento) return null

  return (
    <ModalContainer
      titleId="evt-detalles-titulo"
      descriptionId="evt-detalles-descripcion"
      title="Detalles del evento"
      description="Información disponible del evento; nunca campos privados de moderación."
      eyebrow="Ficha del evento"
      icon={<IconoDetalle />}
      className="evt-modal evt-modal--detalles"
      onClose={onClose}
    >
      <div className="evt-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
        <EventoDetalleContenido evento={evento} />
      </div>
      <footer className="shrink-0 border-t border-[#35483a] px-6 py-4 sm:px-8">
        <div className="flex justify-end">
          <button type="button" onClick={onClose} data-modal-autofocus="" className={CLASE_BOTON_SECUNDARIO}>
            Cerrar
          </button>
        </div>
      </footer>
    </ModalContainer>
  )
}
