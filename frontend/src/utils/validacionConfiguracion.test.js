// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  VALORES_INICIALES_CONFIGURACION,
  validarCampoConfiguracion,
  validarCorreoConfiguracion,
  validarFormularioConfiguracion,
} from './validacionConfiguracion'

const catalogo = {
  paises: [{ codigo: 'MX', nombre: 'México' }],
  regiones: [{ nombre: 'Jalisco' }],
}

describe('validación de configuración 077', () => {
  it('acepta los campos reales del perfil', () => {
    const valores = {
      ...VALORES_INICIALES_CONFIGURACION,
      nombre: 'María Real',
      nombreUsuario: 'maria.real',
      biografia: 'Estudio polinizadores',
      genero: 'Prefiero no decirlo',
      paisCodigo: 'MX',
      estadoRegion: 'Jalisco',
      fechaNacimiento: '2004-01-04',
      telefono: '+52 33 1234 5678',
    }
    expect(validarFormularioConfiguracion(valores, catalogo)).toEqual({})
  })

  it('valida longitud, formato y combined de los campos de identidad', () => {
    expect(validarCampoConfiguracion('nombre', { nombre: '  ' })).toBe('El nombre es obligatorio.')
    expect(validarCampoConfiguracion('nombre', { nombre: 'María 123' })).toBe('El nombre solo puede contener letras y espacios.')
    expect(validarCampoConfiguracion('nombreUsuario', { nombreUsuario: 'M@RIA' })).toBe('El nombre de usuario no puede contener @.')
    expect(validarCampoConfiguracion('nombreUsuario', { nombreUsuario: 'ab' })).toMatch(/3 a 30 caracteres/)
    expect(validarCampoConfiguracion('biografia', { biografia: 'a'.repeat(501) })).toMatch(/500 caracteres/)
  })

  it('valida género, fecha y teléfono sin exigirlos', () => {
    expect(validarCampoConfiguracion('genero', { genero: '' })).toBeUndefined()
    expect(validarCampoConfiguracion('fechaNacimiento', { fechaNacimiento: '' })).toBe('La fecha de nacimiento es obligatoria.')
    expect(validarCampoConfiguracion('telefono', { telefono: '' })).toBeUndefined()
    expect(validarCampoConfiguracion('genero', { genero: 'FEMENINO' })).toBe('Selecciona una opción válida.')
    expect(validarCampoConfiguracion('fechaNacimiento', { fechaNacimiento: '2004-02-30' })).toMatch(/fecha válida/)
    expect(validarCampoConfiguracion('telefono', { telefono: 'abc' })).toBe('Ingresa un teléfono válido.')
    expect(validarCampoConfiguracion('telefono', { telefono: '123' })).toMatch(/7 y 15 dígitos/)
  })

  it('rechaza combinaciones incompatibles de país y región', () => {
    expect(validarCampoConfiguracion('paisCodigo', { paisCodigo: 'ZZ' }, catalogo)).toBe('Selecciona un país del catálogo.')
    expect(validarCampoConfiguracion('estadoRegion', { estadoRegion: 'Oaxaca' }, catalogo)).toBe('Selecciona una región del país indicado.')
    expect(validarCampoConfiguracion('estadoRegion', { estadoRegion: 'Jalisco' }, catalogo)).toBeUndefined()
  })

  it('valida el correo de la sesión y los campos de seguridad futuros', () => {
    expect(validarCorreoConfiguracion('')).toBeUndefined()
    expect(validarCorreoConfiguracion('maria@test.invalid')).toBeUndefined()
    expect(validarCorreoConfiguracion('maria')).toMatch(/formato válido/)
    expect(validarCampoConfiguracion('contrasena', { contrasena: 'abc' })).toBe('Debe tener al menos 8 caracteres.')
    expect(validarCampoConfiguracion('confirmarContrasena', { contrasena: 'Abcdefg1!', confirmarContrasena: 'otra' })).toBe('Las contraseñas no coinciden.')
  })
})
