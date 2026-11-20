import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth'

export default function UserAccount({ onLogout }) {
  const { user } = useAuth()
  const [failedImage, setFailedImage] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const accountRef = useRef(null)
  const triggerRef = useRef(null)
  const logoutRef = useRef(null)
  const avatarUrl = user?.avatarUrl
  const displayName = user?.name?.trim() || 'Cuenta de Insectopia'
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '•'

  useEffect(() => {
    if (!menuOpen) return undefined
    function onDocumentClick(event) {
      if (!accountRef.current?.contains(event.target)) setMenuOpen(false)
    }
    function onDocumentKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDocumentClick)
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onDocumentClick)
      document.removeEventListener('keydown', onDocumentKeyDown)
    }
  }, [menuOpen])

  function openLogout() {
    setMenuOpen(false)
    triggerRef.current?.focus()
    onLogout()
  }

  return (
    <div ref={accountRef} className="relative w-48 shrink-0">
      <button ref={triggerRef} type="button" aria-label="Menú de cuenta" aria-expanded={menuOpen}
        aria-controls="nav-account-menu" onClick={() => setMenuOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setMenuOpen(true)
            requestAnimationFrame(() => logoutRef.current?.focus())
          }
        }}
        className="flex h-12 w-full items-center gap-3 rounded-2xl bg-[var(--nav-sidebar)] px-2 text-left focus-visible:outline-2 focus-visible:outline-[var(--nav-lime)]">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--nav-lime)] text-xs font-bold text-[var(--nav-ink)]">
        {avatarUrl && failedImage !== avatarUrl
          ? <img className="size-full object-cover" src={avatarUrl} alt={`Avatar de ${displayName}`} onError={() => setFailedImage(avatarUrl)} />
          : <span aria-label="Avatar predeterminado" role="img">{initials}</span>}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--nav-light)]">{displayName}</p>
        <p className="truncate text-xs text-[var(--nav-muted)]">{user?.email || 'Correo no disponible'}</p>
      </div>
      </button>
      {menuOpen && <div id="nav-account-menu" role="menu" aria-label="Opciones de cuenta"
        className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-[var(--nav-active)] bg-[var(--nav-sidebar)] p-2 shadow-xl">
        <button ref={logoutRef} type="button" role="menuitem" onClick={openLogout}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              triggerRef.current?.focus()
            }
          }}
          onBlur={(event) => {
            if (!accountRef.current?.contains(event.relatedTarget)) setMenuOpen(false)
          }}
          className="nav-entry text-left focus-visible:outline-2 focus-visible:outline-[var(--nav-lime)]">Cerrar sesión</button>
      </div>}
    </div>
  )
}
