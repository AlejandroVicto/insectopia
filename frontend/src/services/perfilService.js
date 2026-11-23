import api from './api'
import { consultarSeguidos } from './conversacionesService'

export const consultarMiPerfil = ({ signal } = {}) => api.get('/api/usuarios/me', { signal })

// 074: la identidad del listado la impone el principal autenticado en el backend.
export const consultarMisPublicaciones = ({ page = 0, size = 10, signal } = {}) =>
  api.get('/api/usuarios/me/publicaciones', { params: { page, size }, signal })

// /api/auth/me devuelve nombre, alias y avatar, pero NO biografía, ubicación ni estadísticas.
export const consultarIdentidad = ({ signal } = {}) => api.get('/api/auth/me', { signal })

export { consultarSeguidos }

// 076: no se llama a una ruta imaginaria hasta que exista el controlador correspondiente.
export const CONTRATOS_PENDIENTES = Object.freeze({
  seguidores: 'GET /api/usuarios/me/seguidores?page=0&size=20&q= → PaginaDTO<UsuarioPublicoDTO>',
  seguir: 'POST /api/usuarios/{id}/seguir → confirmación del servidor',
  dejarSeguir: 'DELETE /api/usuarios/{id}/seguir → 204',
})
