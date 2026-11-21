import api from './api'

// Rutas propuestas para 064/066; aún no implementadas en el backend.
export function consultarConversaciones({ page = 0, size = 20, q = '', noLeidos = false, signal } = {}) {
  return api.get('/api/conversaciones', { params: { page, size, ...(q.trim() ? { q: q.trim() } : {}), noLeidos }, signal })
}

// Contrato propuesto para 066; estas rutas todavía no están implementadas.
export function consultarSeguidos({ page = 0, size = 20, q = '', signal } = {}) {
  return api.get('/api/usuarios/seguidos', { params: { page, size, ...(q.trim() ? { q: q.trim() } : {}) }, signal })
}

export function abrirConversacion(destinatarioId, { signal } = {}) {
  return api.post('/api/conversaciones', { destinatarioId }, { signal })
}

export function ocultarConversacion(id, { signal } = {}) {
  return api.patch(`/api/conversaciones/${encodeURIComponent(id)}/ocultar`, {}, { signal })
}
