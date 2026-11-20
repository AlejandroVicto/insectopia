import api from './api'

export async function obtenerPaises() {
  const { data } = await api.get('/api/catalogos/paises', { skipAuth: true, timeout: 15000 })
  return data
}

export async function obtenerRegiones(codigo) {
  const { data } = await api.get(`/api/catalogos/paises/${encodeURIComponent(codigo)}/regiones`, {
    skipAuth: true,
    timeout: 15000,
  })
  return data
}
