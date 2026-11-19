import { useState } from 'react'
import { useAuth } from '../auth/useAuth'

export default function UserAccount() {
  const { user } = useAuth()
  const [failedImage, setFailedImage] = useState(null)
  const avatarUrl = user?.avatarUrl
  const displayName = user?.name?.trim() || 'Cuenta de Insectopia'
  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '•'

  return (
    <div className="flex h-12 w-64 shrink-0 items-center gap-3 rounded-2xl bg-[var(--nav-sidebar)] px-2">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--nav-lime)] text-xs font-bold text-[var(--nav-ink)]">
        {avatarUrl && failedImage !== avatarUrl
          ? <img className="size-full object-cover" src={avatarUrl} alt={`Avatar de ${displayName}`} onError={() => setFailedImage(avatarUrl)} />
          : <span aria-label="Avatar predeterminado" role="img">{initials}</span>}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--nav-light)]">{displayName}</p>
        <p className="truncate text-xs text-[var(--nav-muted)]">{user?.email || 'Correo no disponible'}</p>
      </div>
    </div>
  )
}
