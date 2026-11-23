// Reglas locales de la pantalla 077. Se usan antes de enviar la actualización
// de perfil; nunca validan ni envían datos de seguridad.

export const VALORES_INICIALES_CONFIGURACION = {
  nombre: '',
  nombreUsuario: '',
  biografia: '',
  sitioWeb: '',
  genero: '',
  paisCodigo: '',
  estadoRegion: '',
  fechaNacimiento: '',
  telefono: '',
  contrasena: '',
  confirmarContrasena: '',
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NOMBRE_USUARIO = /^[a-z0-9._]{3,30}$/
const CODIGO_PAIS = /^[A-Z]{2}$/
const NOMBRE_COMPLETO = /^[\p{L}\p{M}]+(?: +[\p{L}\p{M}]+)*$/u
const TELEFONO = /^\+?[0-9][0-9 ()-]*$/
// Mismas opciones que el registro; el campo es opcional en el modelo de usuarios.
const GENEROS = ['', 'Femenino', 'Masculino', 'Otro', 'Prefiero no decirlo']

function fechaValidaYNoFutura(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false

  const [anio, mes, dia] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return false

  const hoy = new Date()
  return fecha.getTime() <= Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
}

function urlPublicaValida(valor) {
  try {
    const url = new URL(valor)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validarCampoConfiguracion(campo, valores, catalogo = {}) {
  const valor = String(valores?.[campo] ?? '').trim()

  switch (campo) {
    case 'nombre': {
      if (!valor) return 'El nombre es obligatorio.'
      if (valor.length > 100) return 'El nombre no puede superar los 100 caracteres.'
      if (!NOMBRE_COMPLETO.test(valor)) return 'El nombre solo puede contener letras y espacios.'
      return undefined
    }
    case 'nombreUsuario': {
      if (!valor) return 'El nombre de usuario es obligatorio.'
      if (valor.includes('@')) return 'El nombre de usuario no puede contener @.'
      if (!NOMBRE_USUARIO.test(valor)) return 'Usa de 3 a 30 caracteres: minúsculas, números, _ y .'
      return undefined
    }
    case 'biografia':
      return valor.length > 500 ? 'La presentación no puede superar los 500 caracteres.' : undefined
    case 'sitioWeb':
      if (!valor) return undefined
      if (valor.length > 300) return 'El enlace no puede superar los 300 caracteres.'
      return urlPublicaValida(valor) ? undefined : 'Ingresa una URL http:// o https:// válida.'
    case 'genero':
      return GENEROS.includes(valor) ? undefined : 'Selecciona una opción válida.'
    case 'paisCodigo': {
      if (!valor) return 'El país es obligatorio.'
      if (!CODIGO_PAIS.test(valor.toUpperCase())) return 'Usa un código ISO de dos letras.'
      if (catalogo.paises?.length && !catalogo.paises.some((pais) => pais.codigo === valor.toUpperCase())) {
        return 'Selecciona un país del catálogo.'
      }
      return undefined
    }
    case 'estadoRegion': {
      if (!valor) return 'La región es obligatoria.'
      if (valor.length > 100) return 'La región no puede superar los 100 caracteres.'
      if (catalogo.regiones?.length && !catalogo.regiones.some((region) => region.nombre === valor)) {
        return 'Selecciona una región del país indicado.'
      }
      return undefined
    }
    case 'fechaNacimiento':
      if (!valor) return 'La fecha de nacimiento es obligatoria.'
      return fechaValidaYNoFutura(valor) ? undefined : 'Ingresa una fecha válida que no sea futura.'
    case 'telefono': {
      if (!valor) return undefined
      if (valor.length > 20 || !TELEFONO.test(valor)) return 'Ingresa un teléfono válido.'
      const digitos = (valor.match(/\d/g) ?? []).length
      return digitos >= 7 && digitos <= 15 ? undefined : 'El teléfono debe contener entre 7 y 15 dígitos.'
    }
    case 'contrasena': {
      if (!valor) return undefined
      if (valor.length < 8) return 'Debe tener al menos 8 caracteres.'
      if (!/[A-Z]/.test(valor)) return 'Debe incluir al menos una mayúscula.'
      if (!/\d/.test(valor)) return 'Debe incluir al menos un número.'
      if (!/[^A-Za-z0-9]/.test(valor)) return 'Debe incluir al menos un carácter especial.'
      return undefined
    }
    case 'confirmarContrasena': {
      if (!valor && !String(valores?.contrasena ?? '')) return undefined
      if (!valor) return 'Confirma tu contraseña.'
      return valor === String(valores?.contrasena ?? '') ? undefined : 'Las contraseñas no coinciden.'
    }
    default:
      return undefined
  }
}

export function validarCorreoConfiguracion(valor) {
  const correo = String(valor ?? '').trim()
  if (!correo) return undefined
  return correo.length <= 150 && CORREO.test(correo) ? undefined : 'El correo de la sesión no tiene un formato válido.'
}

export function validarFormularioConfiguracion(valores, catalogo = {}) {
  return Object.keys(VALORES_INICIALES_CONFIGURACION).reduce((errores, campo) => {
    const mensaje = validarCampoConfiguracion(campo, valores, catalogo)
    if (mensaje) errores[campo] = mensaje
    return errores
  }, {})
}
