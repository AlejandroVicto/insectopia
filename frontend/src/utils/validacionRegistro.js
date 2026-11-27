export const VALORES_INICIALES = {
  nombre: '',
  nombreUsuario: '',
  correo: '',
  fechaNacimiento: '',
  genero: '',
  paisCodigo: '',
  estadoRegion: '',
  telefono: '',
  contrasena: '',
  confirmarContrasena: '',
  recibirSms: false,
  recibirWhatsapp: false,
  aceptarTerminos: false,
}

export const CAMPOS_VALIDABLES = [
  'nombre',
  'nombreUsuario',
  'correo',
  'fechaNacimiento',
  'paisCodigo',
  'estadoRegion',
  'telefono',
  'contrasena',
  'confirmarContrasena',
  'aceptarTerminos',
]

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NOMBRE_USUARIO = /^[a-z0-9._]{3,30}$/
const CODIGO_PAIS = /^[A-Z]{2}$/
const NOMBRE_COMPLETO = /^[\p{L}\p{M}]+(?: +[\p{L}\p{M}]+)*$/u
const TELEFONO_10_DIGITOS = /^\d{10}$/

function fechaValidaYNoFutura(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false

  const [anio, mes, dia] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))

  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return false
  }

  const hoy = new Date()
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return fecha.getTime() <= hoyUTC
}

function paisValido(paisCodigo) {
  return CODIGO_PAIS.test(String(paisCodigo ?? '').trim().toUpperCase())
}

export function validarCampo(campo, valores, catalogo = {}) {
  switch (campo) {
    case 'nombre': {
      const nombre = String(valores.nombre ?? '').trim()
      if (!nombre) return 'El nombre es obligatorio.'
      if (nombre.length > 100) return 'El nombre no puede superar los 100 caracteres.'
      if (!NOMBRE_COMPLETO.test(nombre)) return 'El nombre solo puede contener letras y espacios.'
      return undefined
    }
    case 'nombreUsuario': {
      const usuario = String(valores.nombreUsuario ?? '').trim().toLowerCase()
      if (!usuario) return 'El nombre de usuario es obligatorio.'
      if (usuario.includes('@')) return 'El nombre de usuario no puede contener @.'
      if (!NOMBRE_USUARIO.test(usuario)) {
        return 'Usa de 3 a 30 caracteres: minúsculas, números, _ y .'
      }
      return undefined
    }
    case 'correo': {
      const correo = String(valores.correo ?? '').trim()
      if (!correo) return 'El correo electrónico es obligatorio.'
      if (correo.length > 150) return 'El correo no puede superar los 150 caracteres.'
      if (!CORREO.test(correo)) return 'Ingresa un correo electrónico válido.'
      return undefined
    }
    case 'fechaNacimiento': {
      if (!valores.fechaNacimiento) return 'La fecha de nacimiento es obligatoria.'
      if (!fechaValidaYNoFutura(valores.fechaNacimiento)) {
        return 'Ingresa una fecha válida que no sea futura.'
      }
      return undefined
    }
    case 'paisCodigo': {
      if (!valores.paisCodigo) return 'El país es obligatorio.'
      if (!paisValido(valores.paisCodigo)) {
        return 'Ingresa un código de país ISO 3166-1 alfa-2 (dos letras).'
      }
      if (catalogo.paises && !catalogo.paises.some((pais) => pais.codigo === valores.paisCodigo)) {
        return 'Selecciona un país del catálogo.'
      }
      return undefined
    }
    case 'estadoRegion': {
      if (!paisValido(valores.paisCodigo)) {
        return 'Primero selecciona un país válido.'
      }
      const region = String(valores.estadoRegion ?? '').trim()
      if (!region) return 'La región es obligatoria.'
      if (region.length > 100) return 'La región no puede superar los 100 caracteres.'
      if (catalogo.regiones && !catalogo.regiones.some((item) => item.nombre === region)) {
        return 'Selecciona una región del país indicado.'
      }
      return undefined
    }
    case 'telefono': {
      const telefono = String(valores.telefono ?? '').trim()
      if (!telefono) {
        return valores.recibirSms
          ? 'Se requiere un teléfono para recibir comunicaciones.' : undefined
      }
      if (!TELEFONO_10_DIGITOS.test(telefono)) return 'Ingresa un teléfono de 10 dígitos.'
      return undefined
    }
    case 'contrasena': {
      const contrasena = String(valores.contrasena ?? '')
      if (!contrasena) return 'La contraseña es obligatoria.'
      if (contrasena.length < 8) return 'Debe tener al menos 8 caracteres.'
      if (!/[A-Z]/.test(contrasena)) return 'Debe incluir al menos una mayúscula.'
      if (!/\d/.test(contrasena)) return 'Debe incluir al menos un número.'
      if (!/[^A-Za-z0-9]/.test(contrasena)) return 'Debe incluir al menos un carácter especial.'
      return undefined
    }
    case 'confirmarContrasena': {
      if (!valores.confirmarContrasena) return 'Confirma tu contraseña.'
      if (valores.confirmarContrasena !== valores.contrasena) {
        return 'Las contraseñas no coinciden.'
      }
      return undefined
    }
    case 'aceptarTerminos': {
      if (!valores.aceptarTerminos) {
        return 'Debes aceptar los términos y el aviso de privacidad.'
      }
      return undefined
    }
    default:
      return undefined
  }
}

export function validarFormulario(valores, catalogo = {}) {
  return CAMPOS_VALIDABLES.reduce((errores, campo) => {
    const mensaje = validarCampo(campo, valores, catalogo)
    if (mensaje) errores[campo] = mensaje
    return errores
  }, {})
}
