import api from './api'
import { consultarSeguidos } from './conversacionesService'

export const consultarMiPerfil = ({ signal } = {}) => api.get('/api/usuarios/me', { signal })

// 074: la identidad del listado la impone el principal autenticado en el backend.
export const consultarMisPublicaciones = ({ page = 0, size = 10, signal } = {}) =>
  api.get('/api/usuarios/me/publicaciones', { params: { page, size }, signal })

// /api/auth/me devuelve nombre, alias y avatar, pero NO biografía, ubicación ni estadísticas.
export const consultarIdentidad = ({ signal } = {}) => api.get('/api/auth/me', { signal })

// 076: la identidad del seguidor siempre la resuelve el JWT en el backend.
export const consultarSeguidores = ({ page = 0, size = 20, q = '', signal } = {}) =>
  api.get('/api/usuarios/me/seguidores', {
    params: { page, size, ...(q.trim() ? { q: q.trim() } : {}) },
    signal,
  })

// Perfil público: solo los campos de UsuarioPublicoDTO. No se abre una pantalla nueva.
export const consultarPerfilPublico = (id, { signal } = {}) =>
  api.get(`/api/usuarios/${encodeURIComponent(id)}`, { signal })

export const seguirUsuario = (id, { signal } = {}) =>
  api.post(`/api/usuarios/${encodeURIComponent(id)}/seguir`, undefined, { signal })

export const dejarSeguirUsuario = (id, { signal } = {}) =>
  api.delete(`/api/usuarios/${encodeURIComponent(id)}/seguir`, { signal })

export { consultarSeguidos }
