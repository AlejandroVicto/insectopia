import { validarCampo as validarCampoBase } from './validacionRegistro'

export const VALORES_INICIALES_GOOGLE = {
  nombre: '',
  nombreUsuario: '',
  fechaNacimiento: '',
  genero: '',
  paisCodigo: '',
  estadoRegion: '',
  telefono: '',
  recibirSms: false,
  recibirWhatsapp: false,
  aceptarTerminos: false,
}

export const CAMPOS_VALIDABLES_GOOGLE = [
  'nombre',
  'nombreUsuario',
  'fechaNacimiento',
  'paisCodigo',
  'estadoRegion',
  'telefono',
  'aceptarTerminos',
]

export function validarCampoGoogle(campo, valores, catalogo = {}) {
  return validarCampoBase(campo, valores, catalogo)
}

export function validarFormularioGoogle(valores, catalogo = {}) {
  return CAMPOS_VALIDABLES_GOOGLE.reduce((errores, campo) => {
    const mensaje = validarCampoGoogle(campo, valores, catalogo)
    if (mensaje) errores[campo] = mensaje
    return errores
  }, {})
}
