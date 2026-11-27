import api from './api'
import { mensajeErrorApi } from './erroresApi'

export const GOOGLE_LOGIN_URL = '/oauth2/authorization/google'
export const GOOGLE_RESULTADO_PATH = '/auth/google/resultado'
// El alta pendiente se completa en el formulario tradicional, activando su modo Google por router state.
export const GOOGLE_REGISTRO_PATH = '/registro'

const SECRETO = /^[A-Za-z0-9_-]{1,128}$/
const CAMPOS_VALIDOS = new Set([
  'nombre',
  'nombreUsuario',
  'fechaNacimiento',
  'genero',
  'paisCodigo',
  'estadoRegion',
  'telefono',
  'recibirSms',
  'recibirWhatsapp',
  'aceptarTerminos',
])

function correlativo(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function secretoValido(valor) {
  return SECRETO.test(String(valor ?? '').trim())
}

function origenApi() {
  try {
    return new URL(api.defaults.baseURL || window.location.origin, window.location.origin)
  } catch {
    return new URL(window.location.origin)
  }
}

/** Solo acepta la ruta de autorización del backend; nunca una URL arbitraria. */
export function urlAutorizacionGoogle(url) {
  if (typeof url !== 'string' || !url.trim()) return null
  try {
    const base = origenApi()
    const destino = new URL(url.trim(), base)
    if (!['http:', 'https:'].includes(destino.protocol)) return null
    if (api.defaults.baseURL && destino.origin !== base.origin) return null
    if (destino.pathname.replace(/\/+$/, '') !== GOOGLE_LOGIN_URL) return null
    if (destino.hash) return null
    const permitidos = new Set(['intent', 'linkToken'])
    for (const clave of destino.searchParams.keys()) {
      if (!permitidos.has(clave)) return null
    }
    const intent = destino.searchParams.get('intent')
    const linkToken = destino.searchParams.get('linkToken')
    if (linkToken !== null && !secretoValido(linkToken)) return null
    if (intent !== null && !['login', 'vinculacion'].includes(intent)) return null
    return destino.href
  } catch {
    return null
  }
}

export function redirigirAGoogle(url, destino = window.location) {
  const href = urlAutorizacionGoogle(url)
  if (!href) throw new Error('La URL de inicio de sesión con Google no es válida.')
  destino.assign(href)
  return href
}

export function limpiarParametroCodigo() {
  const url = new URL(window.location.href)
  const teniaDatos = ['code', 'state', 'error'].some((clave) => url.searchParams.has(clave))
  for (const clave of ['code', 'state', 'error']) url.searchParams.delete(clave)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  return teniaDatos
}

export async function obtenerConfiguracionGoogle({ senal } = {}) {
  const { data } = await api.get('/api/google/config', {
    skipAuth: true,
    signal: senal,
    timeout: 10000,
  })
  const loginUrl = urlAutorizacionGoogle(data?.loginUrl) ? data.loginUrl : GOOGLE_LOGIN_URL
  return { enabled: data?.enabled === true, loginUrl }
}

export async function intercambiarCodigoGoogle(code) {
  if (!secretoValido(code)) {
    throw new Error('El código de intercambio de Google no es válido.')
  }
  const { data } = await api.post('/api/google/exchange', { code: String(code).trim() }, {
    skipAuth: true,
  })
  return data
}

/** Construye el DTO: la identidad y el correo vienen del token verificado, nunca de React. */
export function construirPayloadRegistroGoogle(valores) {
  const texto = (campo, max) => {
    const valor = String(valores?.[campo] ?? '').trim()
    return max ? valor.slice(0, max) : valor
  }
  const genero = texto('genero')
  const telefonoDigitos = String(valores?.telefono ?? '').trim().replace(/\D/g, '')
  const telefono = telefonoDigitos.length === 10 ? `+52${telefonoDigitos}`
    : telefonoDigitos.length === 12 && telefonoDigitos.startsWith('52') ? `+${telefonoDigitos}`
    : texto('telefono', 20)
  return {
    nombre: texto('nombre', 100),
    nombreUsuario: texto('nombreUsuario', 30).toLowerCase(),
    fechaNacimiento: texto('fechaNacimiento'),
    genero: genero || null,
    paisCodigo: texto('paisCodigo', 2).toUpperCase(),
    estadoRegion: texto('estadoRegion', 100),
    telefono: telefono || null,
    recibirSms: valores?.recibirSms === true,
    recibirWhatsapp: valores?.recibirWhatsapp === true,
    aceptarTerminos: valores?.aceptarTerminos === true,
  }
}

export async function completarRegistroGoogle(token, valores) {
  if (!secretoValido(token)) {
    throw new Error('El registro de Google expiró. Inicia sesión nuevamente.')
  }
  const { data } = await api.post('/api/google/register', {
    token: { token: String(token).trim() },
    datos: construirPayloadRegistroGoogle(valores),
  }, { skipAuth: true })
  return data
}

export async function cancelarRegistroGoogle(token) {
  if (!secretoValido(token)) return false
  await api.post('/api/google/register/cancel', { token: String(token).trim() }, { skipAuth: true })
  return true
}

export async function iniciarVinculacionGoogle() {
  const { data } = await api.post('/api/google/link', {})
  const authorizationUrl = urlAutorizacionGoogle(data?.authorizationUrl)
  if (!authorizationUrl) throw new Error('La vinculación con Google no está disponible.')
  return { authorizationUrl, expiraEn: data?.expiraEn ?? null }
}

export async function consultarVinculoGoogle({ senal } = {}) {
  const { data } = await api.get('/api/google/link', { signal: senal })
  return { vinculado: data?.vinculado === true, proveedor: data?.proveedor ?? null }
}

export async function desvincularGoogle() {
  await api.delete('/api/google/link')
}

export function normalizarErrorGoogle(error) {
  const detalles = Array.isArray(error?.response?.data?.details)
    ? error.response.data.details
    : []
  const fieldErrors = {}
  for (const detalle of detalles) {
    const campo = CAMPOS_VALIDOS.has(detalle?.field) ? detalle.field : correlativo(detalle?.field)
    const destino = CAMPOS_VALIDOS.has(detalle?.field) ? campo : [...CAMPOS_VALIDOS].find((valor) => correlativo(valor) === campo)
    if (destino && typeof detalle?.message === 'string') fieldErrors[destino] = detalle.message
  }
  const mensajeBackend = String(error?.response?.data?.message ?? '')
  const filtrado = /token|secret|contrasena|password|jwt/i.test(mensajeBackend)
    ? 'No se pudo completar la operación con Google.'
    : mensajeBackend
  return {
    codigo: error?.response?.status ?? 'red',
    message: filtrado || mensajeErrorApi(error, 'No se pudo completar la operación con Google.'),
    fieldErrors,
  }
}
