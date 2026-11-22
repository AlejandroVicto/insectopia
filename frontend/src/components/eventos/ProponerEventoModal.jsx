import ModalContainer from '../modales/ModalContainer'
import { crearEvento } from '../../services/eventosService'
import EventoFormulario from './EventoFormulario'
import useEventoFormulario from './useEventoFormulario'

function IconoPropuesta() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6">
      <path d="M12 3v18M3 12h18" strokeLinecap="round" />
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  )
}

function ProponerEventoForm({ onClose, onGuardar, onSuccess }) {
  const form = useEventoFormulario({
    onClose,
    onGuardar: onGuardar ?? crearEvento,
    onSuccess,
    fallback: 'No se pudo enviar la propuesta. Inténtalo de nuevo.',
  })

  return (
    <ModalContainer
      titleId="evt-proponer-titulo"
      descriptionId="evt-proponer-descripcion"
      title="Proponer nuevo evento / bioblitz"
      description="Registra una iniciativa para revisión del comité taxonómico de Insectopia."
      eyebrow="Propuesta comunitaria · revisión científica"
      icon={<IconoPropuesta />}
      ancho={768}
      alto="min(88dvh,720px)"
      className="evt-modal"
      onClose={form.solicitarCierre}
      closeDisabled={form.enviando}
    >
      <EventoFormulario idPrefix="proponer" form={form} modo="crear" />
    </ModalContainer>
  )
}

export default function ProponerEventoModal({ open = true, ...props }) {
  return open ? <ProponerEventoForm {...props} /> : null
}
