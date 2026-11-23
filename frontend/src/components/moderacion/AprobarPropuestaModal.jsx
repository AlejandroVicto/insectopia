import { useRef, useState } from 'react'
import ModalContainer from '../modales/ModalContainer'
import DetallePropuesta from './DetallePropuesta'
import { mensajeErrorApi } from '../../services/erroresApi'

export default function AprobarPropuestaModal({ propuesta, onClose, onConfirm, onSuccess }) {
  const [confirmado, setConfirmado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const enviandoRef = useRef(false)

  if (!propuesta) return null

  async function confirmar(event) {
    event.preventDefault()
    if (enviandoRef.current || !confirmado) return
    enviandoRef.current = true
    setEnviando(true)
    setError('')
    try {
      await onConfirm(propuesta.idEvento)
      await onSuccess?.()
      onClose?.()
    } catch (fallo) {
      setError(mensajeErrorApi(fallo, 'No se pudo aprobar la propuesta.'))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <ModalContainer
      titleId="mod-aprobar-titulo"
      descriptionId="mod-aprobar-descripcion"
      title="Aprobar propuesta"
      description="Confirmarás que la propuesta cumple con las reglas de la comunidad."
      eyebrow="DECISIÓN DEFINITIVA"
      ancho={680}
      className="mod-modal"
      onClose={onClose}
      closeDisabled={enviando}
    >
      <form onSubmit={confirmar} aria-busy={enviando} className="mod-modal-form">
        <div className="mod-modal-body">
          <DetallePropuesta propuesta={propuesta} />
          <label className="mod-confirmacion">
            <input
              type="checkbox"
              checked={confirmado}
              disabled={enviando}
              onChange={(event) => setConfirmado(event.target.checked)}
              data-modal-autofocus
            />
            <span>Confirmo que deseo aprobar esta propuesta de evento.</span>
          </label>
          {error && <p role="alert" className="mod-error-servidor">{error}</p>}
        </div>
        <footer className="mod-modal-pie">
          <button type="button" className="mod-btn mod-btn--secundario" disabled={enviando} onClick={onClose}>Cancelar</button>
          <button type="submit" className="mod-btn mod-btn--primario" disabled={!confirmado || enviando}>
            {enviando ? 'Aprobando…' : 'Confirmar aprobación'}
          </button>
        </footer>
      </form>
    </ModalContainer>
  )
}
