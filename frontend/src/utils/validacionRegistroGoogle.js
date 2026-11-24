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

const E164 = /^\+[1-9]\d{1,14}$/

export function validarCampoGoogle(campo, valores, catalogo = {}) {
  if (campo === 'telefono' && valores.recibirSms && String(valores.telefono ?? '').trim()
      && !E164.test(String(valores.telefono).trim())) {
    return 'Para recibir SMS usa el formato internacional E.164, por ejemplo +529511234567.'
  }
  return validarCampoBase(campo, valores, catalogo)
}

export function validarFormularioGoogle(valores, catalogo = {}) {
  return CAMPOS_VALIDABLES_GOOGLE.reduce((errores, campo) => {
    const mensaje = validarCampoGoogle(campo, valores, catalogo)
    if (mensaje) errores[campo] = mensaje
    return errores
  }, {})
}
