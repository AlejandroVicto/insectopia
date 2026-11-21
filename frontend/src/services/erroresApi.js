// Convierte la forma de error del backend (ErrorResponseDTO: { message, details }) y los
// mensajes del interceptor de Axios en texto para los modales. Nunca inventa éxito.

export function mensajeErrorApi(error, fallback = 'No se pudo completar la operación. Inténtalo de nuevo.') {
  if (!error) return fallback

  const status = error.response?.status
  const data = error.response?.data
  const mensajeBackend = typeof data?.message === 'string' && data.message.trim() ? data.message.trim() : ''
  const detalles = Array.isArray(data?.details)
    ? data.details.map((detalle) => (typeof detalle?.message === 'string' ? detalle.message.trim() : '')).filter(Boolean)
    : []

  if (status === 403) {
    return mensajeBackend || 'No tienes permisos para realizar esta acción.'
  }
  if (status === 404) {
    return mensajeBackend || 'La publicación ya no existe o fue eliminada.'
  }
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'La solicitud agotó el tiempo de espera. Inténtalo de nuevo.'
    }
    return 'No se pudo conectar con el backend. Revisa la conexión e inténtalo de nuevo.'
  }
  if (error.userMessage && status !== 401) {
    return error.userMessage
  }
  return [...detalles, mensajeBackend].join(' · ') || `El backend respondió con estado HTTP ${status}.`
}
