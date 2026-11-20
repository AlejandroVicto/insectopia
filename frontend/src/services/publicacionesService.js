import api from './api'

export function consultarPublicaciones({ page = 0, size = 10, q = '', feed = 'para-ti', filters = {}, signal } = {}) {
  return api.get('/api/publicaciones', {
    params: { page, size, feed, ...(q.trim() ? { q: q.trim() } : {}), ...filters },
    signal,
  })
}
