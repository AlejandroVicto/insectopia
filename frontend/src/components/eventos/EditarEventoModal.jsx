import ModalContainer from '../modales/ModalContainer'
import { actualizarEvento } from '../../services/eventosService'
import { CLASE_BOTON_SECUNDARIO } from '../../constants/modalesPublicaciones'
import EventoFormulario from './EventoFormulario'
import useEventoFormulario from './useEventoFormulario'
import { motivoNoEditable, puedeEditarEvento } from './eventosPermisos'

function IconoEdicion() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6">
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" strokeLinejoin="round" />
      <path d="m14.5 6.5 3 3" strokeLinecap="round" />
    </svg>
  )
}

function EditarBloqueado({ evento, onClose }) {
  return (
    <ModalContainer
      titleId="evt-editar-titulo"
      descriptionId="evt-editar-descripcion"
      title="Editar propuesta"
      description="La edición está limitada a propuestas propias pendientes de revisión."
      eyebrow="Edición no disponible"
      icon={<IconoEdicion />}
      className="evt-modal"
      onClose={onClose}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
        <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-950/30 px-4 py-3 text-xs leading-5 text-amber-100">
          {motivoNoEditable(evento)}
        </div>
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

function EditarPermitido({ evento, onClose, onGuardar, onSuccess, onQuitarImagen }) {
  const form = useEventoFormulario({
    inicial: evento,
    onClose,
    onGuardar: onGuardar ?? ((datos) => actualizarEvento(evento.id, datos)),
    onSuccess,
    onQuitarImagen,
    fallback: 'No se pudo guardar la propuesta. Inténtalo de nuevo.',
  })

  return (
    <ModalContainer
      titleId="evt-editar-titulo"
      descriptionId="evt-editar-descripcion"
      title="Editar propuesta"
      description="Actualiza los campos de tu propuesta pendiente sin cambiar su estado ni su moderación."
      eyebrow="Propuesta comunitaria · edición"
      icon={<IconoEdicion />}
      ancho={768}
      alto="min(88dvh,720px)"
      className="evt-modal"
      onClose={form.solicitarCierre}
      closeDisabled={form.enviando}
    >
      <EventoFormulario idPrefix="editar" form={form} modo="editar" />
    </ModalContainer>
  )
}

export default function EditarEventoModal({ open = true, evento, ...props }) {
  if (!open) return null
  return puedeEditarEvento(evento)
    ? <EditarPermitido evento={evento} {...props} />
    : <EditarBloqueado evento={evento} onClose={props.onClose} />
}
