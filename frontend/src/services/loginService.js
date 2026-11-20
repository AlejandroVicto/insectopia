import api from './api'
import { ROLES } from '../auth/roles'

// El backend expone POST /api/auth/login con { token, user }.
export const LOGIN_ENDPOINT = '/api/auth/login'
export const LOGIN_DISPONIBLE = import.meta.env.VITE_LOGIN_DISPONIBLE === 'true'

const ROLES_VALIDOS = new Set(Object.values(ROLES))

const ALIAS_CAMPOS = {
  correo: 'correo',
  correoelectronico: 'correo',
  email: 'correo',
  contrasena: 'contrasena',
  password: 'contrasena',
}

function normalizarNombreCampo(campo) {
  return String(campo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function primerValor(...valores) {
  return valores.find((valor) => valor !== undefined && valor !== null && valor !== '')
}

function normalizarRol(rol) {
  const texto = String(rol ?? '').trim().toUpperCase().replace(/^ROLE_/, '')
  return ROLES_VALIDOS.has(texto) ? texto : null
}

export function construirPayloadLogin(valores) {
  // El identificador de acceso es el correo, nunca el nombre de usuario.
  return {
    correo: String(valores?.correo ?? '').trim().toLowerCase(),
    contrasena: valores?.contrasena ?? '',
  }
}

export function iniciarSesion(valores) {
  // skipAuth: el login es público aunque exista una sesión previa en el cliente.
  return api.post(LOGIN_ENDPOINT, construirPayloadLogin(valores), { skipAuth: true })
}

/**
 * Adapta la respuesta del backend al objeto que acepta AuthProvider.setSession.
 * No decodifica JWT: solo toma el token emitido por el servidor.
 * Los nombres alternativos conservan compatibilidad con versiones anteriores.
 */
export function adaptarRespuestaLogin(data) {
  const token = primerValor(data?.token, data?.accessToken, data?.access_token, data?.jwt)
  const usuario = data?.user ?? data?.usuario ?? {}
  const role = normalizarRol(primerValor(usuario.role, usuario.rol, data?.role, data?.rol))

  if (typeof token !== 'string' || !token.trim() || !role) {
    throw new Error('La respuesta de inicio de sesión no tiene el formato esperado.')
  }

  return {
    token,
    user: {
      id: primerValor(usuario.id, usuario.idUsuario, data?.id, data?.idUsuario),
      role,
      name: primerValor(usuario.name, usuario.nombre, data?.name, data?.nombre),
      email: primerValor(usuario.email, usuario.correo, data?.email, data?.correo),
      avatarUrl: primerValor(usuario.avatarUrl, usuario.avatar_url, data?.avatarUrl),
    },
  }
}

export function normalizarErrorLogin(error) {
  const status = error?.response?.status
  const datos = error?.response?.data
  const detalles = Array.isArray(datos?.details) ? datos.details : []
  const fieldErrors = {}

  for (const detalle of detalles) {
    const destino = ALIAS_CAMPOS[normalizarNombreCampo(detalle?.field)]
    if (destino && detalle?.message) {
      fieldErrors[destino] = detalle.message
    }
  }

  if (status === 401) {
    return {
      codigo: 'credenciales',
      message: 'Correo o contraseña incorrectos.',
      fieldErrors,
    }
  }

  if (status === 404) {
    return {
      codigo: 'no_disponible',
      message: 'Inicio de sesión no disponible: el backend aún no expone este endpoint.',
      fieldErrors,
    }
  }

  if (status === 400 || status === 422 || Object.keys(fieldErrors).length > 0) {
    return {
      codigo: 'validacion',
      message: datos?.message || 'Revisa los campos marcados e inténtalo de nuevo.',
      fieldErrors,
    }
  }

  if (error?.userMessage) {
    return { codigo: 'conexion', message: error.userMessage, fieldErrors }
  }

  return {
    codigo: 'general',
    message: 'No se pudo iniciar sesión. Inténtalo de nuevo.',
    fieldErrors,
  }
}
