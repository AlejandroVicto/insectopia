import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

let sessionBridge = null

// The provider owns the session; Axios never persists or decodes the token.
export function bindApiSession(bridge) {
  sessionBridge = bridge
  return () => {
    if (sessionBridge === bridge) sessionBridge = null
  }
}

function isPublicRequest(config) {
  const path = config.url?.split('?')[0]
  return config.skipAuth === true || (config.method?.toLowerCase() === 'get' && path === '/api/health')
}

function isBackendRequest(config) {
  if (!import.meta.env.VITE_API_URL || !config?.url) return false
  try {
    const backend = new URL(import.meta.env.VITE_API_URL, window.location.href)
    if (backend.protocol !== 'http:' && backend.protocol !== 'https:') return false
    // getUri applies Axios's effective baseURL (including per-request overrides).
    const target = new URL(api.getUri(config), window.location.href)
    const prefix = backend.pathname.endsWith('/') ? backend.pathname : `${backend.pathname}/`
    return target.origin === backend.origin && (
      backend.pathname === '/' || target.pathname === backend.pathname || target.pathname.startsWith(prefix)
    )
  } catch {
    return false
  }
}

api.interceptors.request.use((config) => {
  config.headers.delete('Authorization')
  delete config.sessionToken
  const token = sessionBridge?.getToken()
  if (isBackendRequest(config) && !isPublicRequest(config) && typeof token === 'string' && token.trim()) {
    config.headers.set('Authorization', `Bearer ${token.trim()}`)
    config.sessionToken = token.trim()
  }
  return config
})

api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401) {
    // Only a request carrying the current session token may invalidate it.
    if (isBackendRequest(error.config) && error.config?.sessionToken && !error.config?.suppressAuthRedirect) {
      sessionBridge?.onUnauthorized(error.config.sessionToken)
      error.userMessage = 'Tu sesión ya no es válida. Inicia sesión nuevamente.'
    }
  } else if (error.response?.status === 403) {
    error.userMessage = 'No tienes permisos para realizar esta acción.'
  } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    error.userMessage = 'La solicitud al backend agotó el tiempo de espera.'
  } else if (!error.response) {
    error.userMessage = 'No se pudo conectar con el backend. Verifica la conexión e inténtalo de nuevo.'
  }
  return Promise.reject(error)
})

export default api
