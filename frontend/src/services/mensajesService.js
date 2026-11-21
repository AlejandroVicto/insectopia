import api from './api'

// Contrato propuesto para 064. El remitente se obtiene del JWT, nunca del cuerpo.
export function consultarMensajes(id, { page = 0, size = 30, signal } = {}) {
  return api.get(`/api/conversaciones/${encodeURIComponent(id)}/mensajes`, { params: { page, size }, signal })
}

export function enviarMensaje(id, contenido, { signal } = {}) {
  return api.post(`/api/conversaciones/${encodeURIComponent(id)}/mensajes`, { contenido: contenido.trim() }, { signal })
}
