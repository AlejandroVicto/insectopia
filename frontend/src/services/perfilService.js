import api from './api'
import { consultarSeguidos } from './conversacionesService'

export const consultarMiPerfil = ({ signal } = {}) => api.get('/api/usuarios/me', { signal })
export const consultarConfiguracionPerfil = ({ signal } = {}) => api.get('/api/usuarios/me/configuracion', { signal })
export const subirAvatar = (imagen) => {
  const datos = new FormData()
  datos.append('imagen', imagen)
  return api.post('/api/usuarios/me/avatar', datos, { headers: { 'Content-Type': undefined } })
}
export const quitarAvatar = () => api.delete('/api/usuarios/me/avatar')

// La fotografía y los datos de seguridad se actualizan por separado.
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

export const consultarSugeridos = ({ limite = 5, excluir = [], signal } = {}) =>
  api.get('/api/usuarios/sugeridos', { params: { limite, ...(excluir.length ? { excluir: excluir.join(',') } : {}) }, signal })

export const buscarUsuarios = ({ q, limite = 5, signal } = {}) =>
  api.get('/api/usuarios/buscar', { params: { q, limite }, signal })

export const consultarPublicacionesPublicas = (id, { page = 0, size = 10, signal } = {}) =>
  api.get(`/api/usuarios/${encodeURIComponent(id)}/publicaciones`, { params: { page, size }, signal })

export const seguirUsuario = (id, { signal } = {}) =>
  api.post(`/api/usuarios/${encodeURIComponent(id)}/seguir`, undefined, { signal })

export const dejarSeguirUsuario = (id, { signal } = {}) =>
  api.delete(`/api/usuarios/${encodeURIComponent(id)}/seguir`, { signal })

export { consultarSeguidos }
