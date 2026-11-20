import api from './api'

export function cerrarSesion() {
  // AuthProvider supplies the current Bearer token via the existing Axios interceptor.
  // The modal handles a 401 itself so the interceptor must not redirect first.
  return api.post('/api/auth/logout', undefined, { suppressAuthRedirect: true })
}
