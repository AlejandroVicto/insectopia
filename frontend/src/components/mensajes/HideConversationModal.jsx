import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMessageDialog } from './useMessageDialog'

export default function HideConversationModal({ chat, demo, onClose, onHide, onHidden }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(null)
  const busyRef = useRef(false)
  const { dialogRef, initialRef } = useMessageDialog(onClose, busy)
  useEffect(() => () => pending.current?.abort(), [])

  async function confirm() {
    if (busyRef.current) return
    const controller = new AbortController()
    pending.current = controller
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      await onHide(chat.id, controller.signal)
      if (!controller.signal.aborted) onHidden(chat.id)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause.userMessage || 'No pudimos ocultar la conversación. Inténtalo de nuevo.')
    } finally {
      if (pending.current === controller) { pending.current = null; busyRef.current = false; setBusy(false) }
    }
  }

  return createPortal(<div className="mensajes msg-overlay"><section ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}
    aria-labelledby="msg-hide-title" aria-describedby="msg-hide-description" className="msg-dialog msg-hide-dialog">
    <p className="msg-dialog-caption">GESTIÓN DE CONVERSACIONES</p>
    <h2 id="msg-hide-title" className="font-display">¿Ocultar esta conversación?</h2>
    <p id="msg-hide-description">Dejarás de verla en tu lista, pero no se borrarán los mensajes ni se afectará la conversación de la otra persona.</p>
    {demo && <p className="msg-demo-warning">Demostración: se ocultará solo en esta sesión, sin modificar MySQL.</p>}
    {error && <p role="alert" className="msg-inline-error">{error}</p>}
    <div className="msg-hide-actions"><button ref={initialRef} type="button" onClick={onClose} disabled={busy}>Cancelar</button>
      <button type="button" className="msg-dialog-primary" onClick={confirm} disabled={busy}>{busy ? 'Ocultando…' : 'Ocultar solo para mí'}</button></div>
  </section></div>, document.body)
}
