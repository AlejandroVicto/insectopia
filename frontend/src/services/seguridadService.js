// Actividad 079 - Capa de Seguridad, separada del flujo de perfil (077/078).
//
// Estado del contrato (verificado en el código fuente del backend):
//   - AuthController: POST /api/auth/register, POST /api/auth/login,
//     GET /api/auth/me y POST /api/auth/logout.
//   - UsuarioController: GET /api/usuarios/me y GET /api/usuarios/me/publicaciones.
//   - No existe todavía ningún endpoint de cambio de contraseña, recuperación
//     ni desactivación de cuenta. Esos son responsabilidad de la actividad 080.
//
// Por eso NO se inventa una ruta productiva. Mientras `endpoint` sea null,
// `cambiarContrasena` rechaza con `codigo: 'contrato_pendiente'` antes de
// crear cualquier petición HTTP. Las pruebas inyectan un endpoint de mock y un
// transporte falso; ese valor nunca se usa en la aplicación.

import api from './api'

export const CONTRATO_SEGURIDAD_080 = Object.freeze({
  estado: 'pendiente',
  endpoint: null,
  metodo: null,
  dto: null,
  nota: 'Faltan la ruta, el método HTTP y el DTO del backend 080. Este frontend no envía contraseñas a una URL supuesta.',
})

// Solo para pruebas. No es un endpoint del backend ni se usa por defecto.
export const ENDPOINT_PRUEBA_CAMBIO_CONTRASENA = '/api/_mock/seguridad/cambiar-contrasena'

const ALIAS_CAMPOS = {
  contrasenaactual: 'contrasenaActual',
  currentpassword: 'contrasenaActual',
  passwordactual: 'contrasenaActual',
  contrasenanueva: 'contrasenaNueva',
  newpassword: 'contrasenaNueva',
  confirmarcontrasena: 'confirmarContrasena',
  confirmpassword: 'confirmarContrasena',
}

const MENSAJES_HTTP = {
  400: 'Revisa los campos marcados e inténtalo de nuevo.',
  401: 'Tu sesión ya no es válida. Inicia sesión nuevamente.',
  403: 'No tienes permisos para realizar este cambio.',
  404: 'El servicio de seguridad aún no está disponible en el servidor.',
  405: 'El servicio de seguridad aún no está disponible en el servidor.',
  409: 'No se pudo completar el cambio por un conflicto con tu cuenta.',
  422: 'Revisa los campos marcados e inténtalo de nuevo.',
}

function normalizarAlias(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function errorSeguridad(codigo, message, extra = {}) {
  return Object.assign(new Error(message), { codigo, ...extra })
}

function sinSecretos(texto, valores) {
  let resultado = String(texto ?? '')
  for (const valor of Object.values(valores ?? {})) {
    const secreto = String(valor ?? '')
    if (secreto.length >= 3 && resultado.includes(secreto)) {
      resultado = '[información omitida]'
    }
  }
  return resultado
}

export function construirPayloadCambioContrasena(valores) {
  // Propuesta de DTO, no un contrato confirmado. La confirmación se valida en
  // el cliente y nunca se envía.
  return {
    contrasenaActual: String(valores?.contrasenaActual ?? ''),
    contrasenaNueva: String(valores?.contrasenaNueva ?? ''),
  }
}

export function requiereReautenticacion(data) {
  if (data?.requiereReautenticacion === true || data?.reautenticacionRequerida === true) return true
  return /reauth|reautent/i.test(String(data?.code ?? ''))
}

export function normalizarErrorSeguridad(error, valores = {}) {
  const status = error?.response?.status
  const data = error?.response?.data ?? {}
  const textoBackend = String(data?.message ?? '')
  const detalles = Array.isArray(data?.details) ? data.details : []
  const campos = new Set(
    detalles
      .map((detalle) => ALIAS_CAMPOS[normalizarAlias(detalle?.field)])
      .filter(Boolean),
  )

  if (/contrase[nñ]a actual|current.?password/i.test(textoBackend)) {
    campos.add('contrasenaActual')
  }

  const fieldErrors = {}
  if (campos.has('contrasenaActual')) {
    fieldErrors.contrasenaActual = 'La contraseña actual no es correcta.'
  }
  if (campos.has('contrasenaNueva')) {
    fieldErrors.contrasenaNueva = 'La contraseña nueva no cumple los requisitos.'
  }
  if (campos.has('confirmarContrasena')) {
    fieldErrors.confirmarContrasena = 'La confirmación no coincide.'
  }

  if (status === 401 || /reauth|reautent/i.test(String(data?.code ?? ''))) {
    return errorSeguridad('sesion_expirada', sinSecretos(MENSAJES_HTTP[401], valores), { fieldErrors })
  }
  if (status === 404 || status === 405) {
    return errorSeguridad('endpoint_no_disponible', sinSecretos(MENSAJES_HTTP[status], valores), { fieldErrors })
  }
  if (status === 403) {
    return errorSeguridad('sin_permisos', sinSecretos(MENSAJES_HTTP[403], valores), { fieldErrors })
  }
  if (status === 409) {
    return errorSeguridad('conflicto', sinSecretos(MENSAJES_HTTP[409], valores), { fieldErrors })
  }
  if (status === 400 || status === 422 || Object.keys(fieldErrors).length) {
    return errorSeguridad('validacion', sinSecretos(MENSAJES_HTTP[status] ?? MENSAJES_HTTP[400], valores), { fieldErrors })
  }
  if (!error?.response) {
    const sinConexion = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT'
    return errorSeguridad(
      sinConexion ? 'tiempo_espera' : 'conexion',
      sinSecretos(
        sinConexion
          ? 'La solicitud agotó el tiempo de espera. Inténtalo de nuevo.'
          : 'No se pudo conectar con el backend. Verifica tu conexión e inténtalo de nuevo.',
        valores,
      ),
      { fieldErrors },
    )
  }
  return errorSeguridad(
    'servidor',
    sinSecretos(`El backend respondió con estado HTTP ${status}.`, valores),
    { fieldErrors },
  )
}

export function cambiarContrasena(
  valores,
  { transporte = api, endpoint = CONTRATO_SEGURIDAD_080.endpoint, signal } = {},
) {
  if (!endpoint) {
    return Promise.reject(errorSeguridad(
      'contrato_pendiente',
      'El cambio de contraseña estará disponible cuando el backend 080 publique su contrato. Tus contraseñas no se enviaron.',
    ))
  }

  return transporte.put(
    endpoint,
    construirPayloadCambioContrasena(valores),
    { signal },
  ).then(
    ({ data } = {}) => ({ requiereReautenticacion: requiereReautenticacion(data) }),
    (error) => Promise.reject(normalizarErrorSeguridad(error, valores)),
  )
}
