import { useEffect, useState } from 'react'
import api from '../../services/api'

// Las propuestas pendientes no exponen su imagen públicamente. El dueño la obtiene con JWT.
export default function ImagenEvento({ evento, ...props }) {
  const requiereSesion = evento.estado !== 'APROBADO'
    && Boolean(evento.imagenUrl?.includes(`/api/eventos/${evento.id}/imagen`))
  const [temporal, setTemporal] = useState(null)

  useEffect(() => {
    if (!requiereSesion) return undefined
    const controller = new AbortController()
    let url = null
    api.get(`/api/eventos/${encodeURIComponent(String(evento.id))}/imagen`, {
      responseType: 'blob', signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return
      url = URL.createObjectURL(data)
      setTemporal(url)
    }).catch(() => { /* Sin permiso o archivo inexistente: no mostrar fotografía. */ })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [evento.id, requiereSesion, evento.imagenUrl])

  if (requiereSesion && !temporal) return null
  return <img {...props} src={requiereSesion ? temporal : evento.imagenUrl} />
}
