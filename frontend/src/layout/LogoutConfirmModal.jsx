import { useEffect, useRef } from 'react'

export default function LogoutConfirmModal({ onCancel, onConfirm }) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    cancelRef.current?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll('button:not([disabled])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a150ecc] p-6">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description" className="w-full max-w-md rounded-2xl border border-[#415c48] bg-[var(--nav-sidebar)] p-8 text-[var(--nav-light)] shadow-2xl">
        <h2 id="logout-title" className="font-display text-xl font-bold">¿Cerrar sesión?</h2>
        <p id="logout-description" className="mt-3 text-sm text-[var(--nav-muted)]">¿Seguro que quieres cerrar la sesión en este dispositivo?</p>
        <div className="mt-8 flex justify-end gap-3">
          <button ref={cancelRef} type="button" onClick={onCancel} className="rounded-full border border-[var(--nav-muted)] px-5 py-2 text-sm hover:bg-[var(--nav-active)]">Cancelar</button>
          <button type="button" onClick={onConfirm} className="rounded-full bg-[var(--nav-lime)] px-5 py-2 text-sm font-semibold text-[var(--nav-ink)] hover:brightness-110">Cerrar sesión</button>
        </div>
      </section>
    </div>
  )
}
