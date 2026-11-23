import { useRef, useState } from 'react'
import ModalContainer from '../modales/ModalContainer'
import { CLASE_BOTON_PRIMARIO, CLASE_BOTON_SECUNDARIO } from '../../constants/modalesPublicaciones'
import { cancelarMiInscripcion } from '../../services/eventosService'
import { mensajeErrorApi } from '../../services/erroresApi'
import EventoModalAviso from './EventoModalAviso'
import { motivoNoCancelable } from './eventosPermisos'

function IconoCancelacion() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6">
      <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  )
}

function CancelarInscripcionForm({ evento, onClose, onConfirmar, onSuccess }) {
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mensajeTipo, setMensajeTipo] = useState('')
  const enviandoRef = useRef(false)

  const bloqueo = motivoNoCancelable(evento)

  async function confirmar() {
    if (enviandoRef.current || bloqueo) return
    enviandoRef.current = true
    setEnviando(true)
    setMensaje('')
    setMensajeTipo('')
    try {
      await (onConfirmar ?? cancelarMiInscripcion)(evento.id)
      await onSuccess?.(evento)
      onClose?.()
    } catch (error) {
      setMensaje(error?.userMessage || mensajeErrorApi(error, 'No se pudo cancelar la inscripción.'))
      setMensajeTipo(error?.tipo === 'info' ? 'info' : 'error')
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <ModalContainer
      titleId="evt-cancelar-titulo"
      descriptionId="evt-cancelar-descripcion"
      title="Cancelar inscripción"
      description="Confirma que deseas cancelar tu participación en este evento."
      eyebrow="Participación en eventos"
      icon={<IconoCancelacion />}
      acento="rojo"
      className="evt-modal"
      onClose={onClose}
      closeDisabled={enviando}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          confirmar()
        }}
        aria-busy={enviando}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div data-evento-cuerpo="" className="evt-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
          <section className="evt-modal-resumen rounded-xl border border-[#40584a] bg-[#141d17] p-4">
            <h3 className="font-display text-lg font-bold leading-6 text-stone-100">{evento.titulo}</h3>
            <p className="mt-1 text-xs text-[#a5b7a7]">{evento.rangoFechas ?? 'Fecha no disponible'}</p>
          </section>

          {bloqueo ? (
            <div className="mt-4"><EventoModalAviso mensaje={bloqueo} tipo="error" /></div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-stone-200">
              Tu inscripción quedará cancelada cuando se confirme la operación. Los cupos se actualizarán con los datos del servidor.
            </p>
          )}

          {mensaje && (
            <div data-evento-aviso="" className="mt-4">
              <EventoModalAviso mensaje={mensaje} tipo={mensajeTipo} />
            </div>
          )}
        </div>

        <footer data-evento-pie="" className="evt-modal-pie shrink-0 border-t border-[#35483a] bg-[#1d2820] px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={onClose} disabled={enviando} data-modal-autofocus="" className={CLASE_BOTON_SECUNDARIO}>
              Volver
            </button>
            <button type="submit" disabled={Boolean(bloqueo) || enviando} className={CLASE_BOTON_PRIMARIO}>
              {enviando ? 'Cancelando…' : 'Confirmar cancelación'}
            </button>
          </div>
        </footer>
      </form>
    </ModalContainer>
  )
}

export default function CancelarInscripcionModal({ open = true, ...props }) {
  return open ? <CancelarInscripcionForm {...props} /> : null
}
