// Actividad 079. Reutiliza las reglas de contraseña ya vigentes en registro y
// autenticación (8 caracteres, mayúscula, número y carácter especial). El
// texto del export Figma menciona 6 caracteres, pero ese requisito sería
// incompatible con el contrato existente; se conserva la regla real.

import { validarCampoConfiguracion } from './validacionConfiguracion'

export const VALORES_INICIALES_SEGURIDAD = {
  contrasenaActual: '',
  contrasenaNueva: '',
  confirmarContrasena: '',
}

export const REQUISITOS_CONTRASENA = [
  { id: 'longitud', texto: 'Al menos 8 caracteres.', cumple: (valor) => valor.length >= 8 },
  { id: 'mayuscula', texto: 'Una letra mayúscula.', cumple: (valor) => /[A-Z]/.test(valor) },
  { id: 'numero', texto: 'Un número.', cumple: (valor) => /\d/.test(valor) },
  { id: 'especial', texto: 'Un carácter especial.', cumple: (valor) => /[^A-Za-z0-9]/.test(valor) },
]

const texto = (valor) => String(valor ?? '')

export function validarContrasenaActual(valor) {
  return texto(valor).length ? undefined : 'Ingresa tu contraseña actual.'
}

export function validarContrasenaNueva(valor) {
  if (!texto(valor).length) return 'La contraseña nueva es obligatoria.'
  return validarCampoConfiguracion('contrasena', { contrasena: valor })
}

export function validarConfirmarContrasena(valor, nueva) {
  if (!texto(valor).length) return 'Confirma tu contraseña nueva.'
  return validarCampoConfiguracion('confirmarContrasena', {
    contrasena: nueva,
    confirmarContrasena: valor,
  })
}

export function validarFormularioSeguridad(valores) {
  return {
    contrasenaActual: validarContrasenaActual(valores?.contrasenaActual),
    contrasenaNueva: validarContrasenaNueva(valores?.contrasenaNueva),
    confirmarContrasena: validarConfirmarContrasena(
      valores?.confirmarContrasena,
      valores?.contrasenaNueva,
    ),
  }
}

export function requisitosCumplidos(valor) {
  const contrasena = texto(valor)
  return REQUISITOS_CONTRASENA.reduce((estado, requisito) => ({
    ...estado,
    [requisito.id]: requisito.cumple(contrasena),
  }), {})
}
