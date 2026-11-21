import { useEffect, useRef } from 'react'

// Portals keep the dialog outside the inert private shell. Restore the trigger when it still exists.
export function useMessageDialog(onClose, busy) {
  const dialogRef = useRef(null)
  const initialRef = useRef(null)
  const closeRef = useRef(onClose)
  const busyRef = useRef(busy)
  useEffect(() => { closeRef.current = onClose; busyRef.current = busy })

  useEffect(() => {
    const shell = document.querySelector('.private-shell')
    const oldInert = shell?.inert
    const oldOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    if (shell) shell.inert = true
    document.body.style.overflow = 'hidden'
    initialRef.current?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!busyRef.current) closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusables = [...(dialogRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? [])]
      const first = focusables[0]
      const last = focusables.at(-1)
      if (!first) { event.preventDefault(); dialogRef.current?.focus(); return }
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (shell) shell.inert = oldInert
      document.body.style.overflow = oldOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
      else document.querySelector('.msg-new')?.focus()
    }
  }, [])
  return { dialogRef, initialRef }
}
