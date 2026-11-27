import api from './api'

export const REGISTRO_ENDPOINT = '/api/auth/register'

const ALIAS_CAMPOS = {
  nombre: 'nombre',
  nombrecompleto: 'nombre',
  nombreusuario: 'nombreUsuario',
  usuario: 'nombreUsuario',
  username: 'nombreUsuario',
  correo: 'correo',
  correoelectronico: 'correo',
  email: 'correo',
  fechanacimiento: 'fechaNacimiento',
  genero: 'genero',
  pais: 'paisCodigo',
  paiscodigo: 'paisCodigo',
  paiscodigoiso: 'paisCodigo',
  region: 'estadoRegion',
  estadoregion: 'estadoRegion',
  telefono: 'telefono',
  contrasena: 'contrasena',
  password: 'contrasena',
  confirmarcontrasena: 'confirmarContrasena',
  confirmacion: 'confirmarContrasena',
  confirmpassword: 'confirmarContrasena',
}

function normalizarNombreCampo(campo) {
  return String(campo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function normalizarTelefonoRegistro(valor) {
  const telefono = String(valor ?? '').trim().replace(/\D/g, '')
  if (!telefono) return null
  if (telefono.length === 10) return `+52${telefono}`
  if (telefono.length === 12 && telefono.startsWith('52')) return `+${telefono}`
  return String(valor ?? '').trim() || null
}

export function telefonoInputRegistro(valor) {
  const telefono = String(valor ?? '').trim()
  if (/^\+52\d{10}$/.test(telefono)) return telefono.slice(3)
  if (/^\d{10}$/.test(telefono)) return telefono
  return telefono.replace(/\D/g, '').slice(-10)
}

export function construirPayloadRegistro(valores) {
  return {
    nombre: String(valores.nombre ?? '').trim(),
    nombreUsuario: String(valores.nombreUsuario ?? '').trim().toLowerCase(),
    correo: String(valores.correo ?? '').trim().toLowerCase(),
    fechaNacimiento: valores.fechaNacimiento,
    genero: String(valores.genero ?? '').trim() || null,
    paisCodigo: String(valores.paisCodigo ?? '').trim().toUpperCase(),
    estadoRegion: String(valores.estadoRegion ?? '').trim(),
    telefono: normalizarTelefonoRegistro(valores.telefono),
    contrasena: valores.contrasena,
    recibirSms: Boolean(valores.recibirSms),
    recibirWhatsapp: Boolean(valores.recibirWhatsapp),
  }
}

export function registrarUsuario(valores) {
  // skipAuth: el registro es público aunque exista una sesión previa en el cliente.
  return api.post(
    REGISTRO_ENDPOINT,
    construirPayloadRegistro(valores),
    { skipAuth: true },
  )
}

export function normalizarErrorRegistro(error) {
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

  if (status === 404) {
    return {
      codigo: 'no_disponible',
      message: 'No se encontró el servicio de registro. Revisa que el backend esté actualizado y en ejecución.',
      fieldErrors,
    }
  }

  if (status === 409) {
    const texto = `${datos?.message ?? ''} ${detalles.map((d) => d?.message ?? '').join(' ')}`
    if (/correo|email/i.test(texto)) {
      fieldErrors.correo = 'Este correo ya está registrado.'
    }
    if (/usuario|username/i.test(texto)) {
      fieldErrors.nombreUsuario = 'Este nombre de usuario ya está en uso.'
    }

    return {
      codigo: 'conflicto',
      message: Object.keys(fieldErrors).length > 0
        ? 'El correo o el nombre de usuario ya están registrados.'
        : 'Ya existe una cuenta con esos datos.',
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
    message: 'No se pudo completar el registro. Inténtalo de nuevo.',
    fieldErrors,
  }
}
