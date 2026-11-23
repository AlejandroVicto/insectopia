import { useRef, useState } from 'react'
import ModalContainer from '../modales/ModalContainer'
import { CLASE_BOTON_PRIMARIO, CLASE_BOTON_SECUNDARIO } from '../../constants/modalesPublicaciones'
import { inscribirmeEnEvento } from '../../services/eventosService'
import { mensajeErrorApi } from '../../services/erroresApi'
import EventoModalAviso from './EventoModalAviso'
import { cupoConfirmado, motivoNoInscribible } from './eventosPermisos'

function IconoInscripcion() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-6">
      <path d="M8 12.5 11 15.5 16.5 9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  )
}

function ConfirmarInscripcionForm({ evento, onClose, onConfirmar, onSuccess }) {
  const [confirmado, setConfirmado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [mensajeTipo, setMensajeTipo] = useState('')
  const enviandoRef = useRef(false)

  const bloqueo = motivoNoInscribible(evento)
  const sinCupo = !cupoConfirmado(evento)
  const puedeConfirmar = !bloqueo && !sinCupo && confirmado

  async function confirmar() {
    if (enviandoRef.current || !puedeConfirmar) return
    enviandoRef.current = true
    setEnviando(true)
    setMensaje('')
    setMensajeTipo('')
    try {
      await (onConfirmar ?? inscribirmeEnEvento)(evento.id)
      await onSuccess?.(evento)
      onClose?.()
    } catch (error) {
      setMensaje(error?.userMessage || mensajeErrorApi(error, 'No se pudo registrar la inscripción.'))
      setMensajeTipo(error?.tipo === 'info' ? 'info' : 'error')
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <ModalContainer
      titleId="evt-inscribir-titulo"
      descriptionId="evt-inscribir-descripcion"
      title="Confirmar inscripción"
      description="Verifica la información antes de confirmar tu participación."
      eyebrow="Convocatoria científica"
      icon={<IconoInscripcion />}
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-lime-400">Evento seleccionado</p>
            <h3 className="mt-1 font-display text-lg font-bold leading-6 text-stone-100">{evento.titulo}</h3>
            <dl className="evt-modal-datos mt-3">
              <div><dt>Fecha</dt><dd>{evento.rangoFechas ?? 'No disponible'}</dd></div>
              {evento.horaInicio && <div><dt>Horario</dt><dd>{evento.horaInicio}{evento.horaFin ? ` – ${evento.horaFin}` : ''} h</dd></div>}
              {evento.ubicacion && <div><dt>Ubicación</dt><dd>{evento.ubicacion}</dd></div>}
              {evento.cupoMaximo !== null && <div><dt>Cupo máximo</dt><dd>{evento.cupoMaximo} plazas</dd></div>}
              {evento.participantesConfirmados !== null && (
                <div><dt>Participantes confirmados</dt><dd>{evento.participantesConfirmados}</dd></div>
              )}
            </dl>
          </section>

          {bloqueo && (
            <div className="mt-4">
              <EventoModalAviso mensaje={bloqueo} tipo="error" />
            </div>
          )}
          {!bloqueo && sinCupo && (
            <div className="mt-4">
              <EventoModalAviso
                mensaje="El backend todavía no confirmó el cupo disponible; no se registrará una inscripción."
                tipo="error"
              />
            </div>
          )}

          <label className="evt-modal-check mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#40584a] bg-[#141d17] px-4 py-3 text-xs leading-5 text-stone-200">
            <input
              type="checkbox"
              checked={confirmado}
              disabled={Boolean(bloqueo) || sinCupo || enviando}
              onChange={(event) => setConfirmado(event.target.checked)}
              data-modal-autofocus=""
              className="mt-0.5 size-4 shrink-0 accent-lime-400"
            />
            <span>Confirmo explícitamente mi participación en este evento.</span>
          </label>

          <p className="mt-4 text-[11px] leading-5 text-[#a5b7a7]">
            La participación implica respetar el código ético de observación de Insectopia. Este diálogo no registra consentimientos ni datos de campo adicionales.
          </p>

          {mensaje && (
            <div data-evento-aviso="" className="mt-4">
              <EventoModalAviso mensaje={mensaje} tipo={mensajeTipo} />
            </div>
          )}
        </div>

        <footer data-evento-pie="" className="evt-modal-pie shrink-0 border-t border-[#35483a] bg-[#1d2820] px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" onClick={onClose} disabled={enviando} className={CLASE_BOTON_SECUNDARIO}>
              Cancelar
            </button>
            <button type="submit" disabled={!puedeConfirmar || enviando} className={CLASE_BOTON_PRIMARIO}>
              {enviando ? 'Confirmando…' : 'Confirmar inscripción'}
            </button>
          </div>
        </footer>
      </form>
    </ModalContainer>
  )
}

export default function ConfirmarInscripcionModal({ open = true, ...props }) {
  return open ? <ConfirmarInscripcionForm {...props} /> : null
}
