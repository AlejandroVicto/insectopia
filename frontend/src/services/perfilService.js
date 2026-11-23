import api from './api'
import { consultarSeguidos } from './conversacionesService'

export const consultarMiPerfil = ({ signal } = {}) => api.get('/api/usuarios/me', { signal })

// Flujo preparado para cuando el backend exponga la actualización del perfil.
// Hoy solo existe GET en /api/usuarios/me: la petición fallará y la pantalla
// conservará los cambios. Nunca incluye fotografía ni datos de seguridad.
export const ACTUALIZACION_PERFIL_ENDPOINT = '/api/usuarios/me'

const texto = (valor) => String(valor ?? '').trim()

export function construirPayloadActualizacionPerfil(valores) {
  return {
    nombre: texto(valores?.nombre),
    nombreUsuario: texto(valores?.nombreUsuario).toLowerCase(),
    biografia: texto(valores?.biografia) || null,
    genero: texto(valores?.genero) || null,
    paisCodigo: texto(valores?.paisCodigo).toUpperCase() || null,
    estadoRegion: texto(valores?.estadoRegion) || null,
    fechaNacimiento: texto(valores?.fechaNacimiento) || null,
    telefono: texto(valores?.telefono) || null,
  }
}

export function actualizarMiPerfil(valores) {
  return api.put(ACTUALIZACION_PERFIL_ENDPOINT, construirPayloadActualizacionPerfil(valores))
}

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
