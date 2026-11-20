import { useState } from 'react'

export default function Avatar({ name, src, size = 'md' }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const label = name?.trim() || 'Usuario'
  const initials = label.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  return <span className={`inicio-avatar ${size === 'sm' ? 'inicio-avatar-sm' : ''}`}>
    {src && failedSrc !== src
      ? <img src={src} alt={`Avatar de ${label}`} onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />
      : <span role="img" aria-label={`Avatar de ${label}`}>{initials}</span>}
  </span>
}
