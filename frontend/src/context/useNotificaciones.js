import { useContext } from 'react'
import { NotificacionesContext } from './NotificacionesContext'

export function useNotificaciones() {
  const context = useContext(NotificacionesContext)
  if (!context) throw new Error('useNotificaciones requiere NotificacionesProvider')
  return context
}
