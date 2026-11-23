import api from './api'

export const SOLICITAR_ENLACE = '/api/auth/forgot-password'
export const RESTABLECER_CONTRASENA = '/api/auth/reset-password'

// Estas operaciones son públicas incluso si el navegador conserva otra sesión.
export function solicitarRecuperacion(correo) {
  return api.post(SOLICITAR_ENLACE, { correo: correo.trim().toLowerCase() }, { skipAuth: true })
}

export function restablecerContrasena(token, contrasena) {
  return api.post(RESTABLECER_CONTRASENA, { token, contrasena }, { skipAuth: true })
}

// Nunca se muestra contenido arbitrario del servidor: puede contener el token o revelar cuentas.
// La actividad 056 todavía no define un DTO de error: se aceptan únicamente códigos
// explícitos o descripciones inequívocas referidas al token, nunca el HTTP por sí solo.
export function clasificarErrorRecuperacion(error, operacion) {
  const data = error?.response?.data
  const status = error?.response?.status
  if (operacion === 'restablecer' && status && status >= 400 && status < 500) {
    const codigo = String(data?.code ?? data?.codigo ?? '').toUpperCase()
    if (['TOKEN_INVALID', 'TOKEN_EXPIRED', 'TOKEN_USED', 'INVALID_RESET_TOKEN', 'EXPIRED_RESET_TOKEN', 'USED_RESET_TOKEN'].includes(codigo)) {
      return 'token'
    }
    const mensaje = String(data?.message ?? data?.mensaje ?? '')
    if (/(?:token|enlace)\s+(?:de recuperación\s+)?(?:es\s+)?(?:inválid[oa]|incorrect[oa]|expirad[oa]|vencid[oa]|caducad[oa]|utilizad[oa]|usad[oa])/i.test(mensaje) ||
      /(?:token|enlace).{0,50}(?:ya\s+(?:fue\s+)?utilizad[oa]|ha\s+expirado|no\s+es\s+válid[oa])/i.test(mensaje)) {
      return 'token'
    }
  }
  return 'tecnico'
}

export function mensajeErrorRecuperacion(error) {
  if (!error?.response) return 'No se pudo conectar con el servicio. Comprueba la conexión e inténtalo de nuevo.'
  if (error.response.status === 404) return 'El servicio de recuperación no está disponible todavía. Inténtalo más tarde.'
  return 'No se pudo completar la solicitud. Inténtalo de nuevo más tarde.'
}
