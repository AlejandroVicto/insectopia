import api from './api'
import { consultarSeguidos } from './conversacionesService'

// 074: endpoint aún no presente en el backend local. El 404 se comunica al usuario.
export const consultarMiPerfil = ({ signal } = {}) => api.get('/api/usuarios/me', { signal })

// /api/auth/me devuelve nombre, alias y avatar, pero NO biografía, ubicación ni estadísticas.
export const consultarIdentidad = ({ signal } = {}) => api.get('/api/auth/me', { signal })

export { consultarSeguidos }

// 074/076: no se llama a una ruta imaginaria hasta que exista el controlador correspondiente.
export const CONTRATOS_PENDIENTES = Object.freeze({
  publicaciones: 'GET /api/usuarios/me/publicaciones?page=0&size=10 → PaginaDTO<PublicacionResponseDTO>',
  seguidores: 'GET /api/usuarios/me/seguidores?page=0&size=20&q= → PaginaDTO<UsuarioPublicoDTO>',
  seguir: 'POST /api/usuarios/{id}/seguir → confirmación del servidor',
  dejarSeguir: 'DELETE /api/usuarios/{id}/seguir → 204',
})
