import api from './api'
import { construirPayloadRegistro } from './authService'

const base = '/api/admin'

export async function listarUsuarios(filtros) {
  const { data } = await api.get(`${base}/usuarios`, { params: filtros })
  return data
}

export async function obtenerResumen() {
  const { data } = await api.get(`${base}/usuarios/resumen`)
  return data
}

export async function obtenerUsuario(id) {
  const { data } = await api.get(`${base}/usuarios/${encodeURIComponent(id)}`)
  return data
}

export async function obtenerRoles() {
  const { data } = await api.get(`${base}/roles`)
  return data
}

export async function obtenerAuditoria(id, page = 0) {
  const { data } = await api.get(`${base}/usuarios/${encodeURIComponent(id)}/auditoria-roles`, { params: { page, size: 10 } })
  return data
}

export async function crearUsuario(valores) {
  const { data } = await api.post(`${base}/usuarios`, construirPayloadRegistro(valores))
  return data
}

export async function editarUsuario(id, valores) {
  const payload = construirPayloadRegistro(valores)
  if (!payload.contrasena) delete payload.contrasena
  const { data } = await api.put(`${base}/usuarios/${encodeURIComponent(id)}`, payload)
  return data
}

export async function cambiarEstado(id, estado) {
  const { data } = await api.patch(`${base}/usuarios/${encodeURIComponent(id)}/estado`, { estado })
  return data
}

export async function cambiarRol(id, rol) {
  const { data } = await api.patch(`${base}/usuarios/${encodeURIComponent(id)}/rol`, { rol })
  return data
}

export async function eliminarUsuario(id) {
  await api.delete(`${base}/usuarios/${encodeURIComponent(id)}`)
}
