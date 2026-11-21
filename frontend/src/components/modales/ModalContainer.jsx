import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSEABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Contenedor accesible común: portal sobre toda la página, cabecera con título accesible,
// cuerpo con scroll interno, atrapa el foco, cierra con Escape y restaura el foco anterior.
export default function ModalContainer({
  titleId,
  descriptionId,
  title,
  description,
  onClose,
  closeLabel = 'Cerrar diálogo',
  closeDisabled = false,
  children,
}) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const closeDisabledRef = useRef(closeDisabled)

  useEffect(() => { onCloseRef.current = onClose })
  useEffect(() => { closeDisabledRef.current = closeDisabled })

  useEffect(() => {
    const anterior = document.activeElement
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const dialog = dialogRef.current
    const inicial = dialog?.querySelector('[data-modal-autofocus]') ?? dialog?.querySelector(FOCUSEABLE)
    ;(inicial ?? dialog)?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (closeDisabledRef.current) return
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const focusables = Array.from(dialog?.querySelectorAll(FOCUSEABLE) ?? [])
      if (!focusables.length) {
        event.preventDefault()
        dialog?.focus()
        return
      }
      const primero = focusables[0]
      const ultimo = focusables[focusables.length - 1]
      if (!dialog?.contains(document.activeElement)) {
        event.preventDefault()
        primero.focus()
      } else if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault()
        ultimo.focus()
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = overflowAnterior
      if (anterior?.isConnected && typeof anterior.focus === 'function') anterior.focus()
    }
  }, [])

  function handleOverlayMouseDown(event) {
    if (event.target !== event.currentTarget || closeDisabled) return
    onClose?.()
  }

  return createPortal(
    <div
      data-modal-overlay=""
      onMouseDown={handleOverlayMouseDown}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#08110bcc] p-4 sm:p-6"
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative my-auto flex max-h-[min(90dvh,736px)] w-full max-w-[672px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#415c48] bg-[#1d2820] text-[#f3f8ef] shadow-2xl focus:outline-none"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#35483a] px-6 py-5 sm:px-8">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-xl font-bold leading-7 text-stone-100 sm:text-2xl">{title}</h2>
            <p id={descriptionId} className="mt-1 text-xs leading-4 text-[#a5b7a7]">{description}</p>
          </div>
          <button
            type="button"
            disabled={closeDisabled}
            onClick={onClose}
            aria-label={closeLabel}
            className="shrink-0 rounded-xl bg-[#35423a] px-3 py-1.5 text-xl leading-6 text-[#f3f8ef] hover:bg-[#465649] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  )
}
