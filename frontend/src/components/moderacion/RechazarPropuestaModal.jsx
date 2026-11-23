import { useRef, useState } from 'react'
import ModalContainer from '../modales/ModalContainer'
import DetallePropuesta from './DetallePropuesta'
import { mensajeErrorApi } from '../../services/erroresApi'
import { LONGITUD_MAXIMA_MOTIVO } from '../../services/moderacionService'

export default function RechazarPropuestaModal({ propuesta, onClose, onConfirm, onSuccess }) {
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState('')
  const [errorServidor, setErrorServidor] = useState('')
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  if (!propuesta) return null

  function validar() {
    const limpio = motivo.trim()
    if (!limpio) return 'El motivo del rechazo es obligatorio.'
    if (limpio.length > LONGITUD_MAXIMA_MOTIVO) {
      return `El motivo no puede superar los ${LONGITUD_MAXIMA_MOTIVO} caracteres.`
    }
    return ''
  }

  async function confirmar(event) {
    event.preventDefault()
    const falloValidacion = validar()
    if (falloValidacion) {
      setErrorMotivo(falloValidacion)
      return
    }
    if (enviandoRef.current) return
    enviandoRef.current = true
    setEnviando(true)
    setErrorServidor('')
    setErrorMotivo('')
    try {
      await onConfirm(propuesta.idEvento, motivo.trim())
      await onSuccess?.()
      onClose?.()
    } catch (fallo) {
      setErrorServidor(mensajeErrorApi(fallo, 'No se pudo rechazar la propuesta.'))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <ModalContainer
      titleId="mod-rechazar-titulo"
      descriptionId="mod-rechazar-descripcion"
      title="Rechazar propuesta"
      description="El proponente recibirá el motivo de la decisión."
      eyebrow="DECISIÓN DEFINITIVA"
      acento="rojo"
      ancho={680}
      className="mod-modal"
      onClose={onClose}
      closeDisabled={enviando}
    >
      <form onSubmit={confirmar} aria-busy={enviando} className="mod-modal-form" noValidate>
        <div className="mod-modal-body">
          <DetallePropuesta propuesta={propuesta} />
          <label className="mod-campo mod-campo--modal" htmlFor="mod-motivo-rechazo">
            <span>Motivo del rechazo <span aria-hidden="true">*</span></span>
            <textarea
              id="mod-motivo-rechazo"
              value={motivo}
              maxLength={LONGITUD_MAXIMA_MOTIVO}
              rows={4}
              data-modal-autofocus
              disabled={enviando}
              aria-invalid={Boolean(errorMotivo)}
              aria-describedby={errorMotivo ? 'mod-motivo-error' : 'mod-motivo-ayuda'}
              onChange={(event) => {
                setMotivo(event.target.value)
                if (errorMotivo) setErrorMotivo('')
              }}
            />
          </label>
          <p id="mod-motivo-ayuda" className="mod-ayuda">
            Entre 1 y {LONGITUD_MAXIMA_MOTIVO} caracteres. Se guardará en la resolución de la propuesta.
          </p>
          <p className="mod-contador">{motivo.trim().length} / {LONGITUD_MAXIMA_MOTIVO}</p>
          {errorMotivo && <p id="mod-motivo-error" role="alert" className="mod-error-campo">{errorMotivo}</p>}
          {errorServidor && <p role="alert" className="mod-error-servidor">{errorServidor}</p>}
        </div>
        <footer className="mod-modal-pie">
          <button type="button" className="mod-btn mod-btn--secundario" disabled={enviando} onClick={onClose}>Cancelar</button>
          <button type="submit" className="mod-btn mod-btn--peligro" disabled={enviando}>
            {enviando ? 'Rechazando…' : 'Confirmar rechazo'}
          </button>
        </footer>
      </form>
    </ModalContainer>
  )
}
