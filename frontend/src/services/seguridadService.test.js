import { describe, expect, it, vi } from 'vitest'
import {
  CONTRATO_SEGURIDAD_080,
  ENDPOINT_PRUEBA_CAMBIO_CONTRASENA,
  cambiarContrasena,
  construirPayloadCambioContrasena,
  normalizarErrorSeguridad,
  requiereReautenticacion,
} from './seguridadService'

const valores = {
  contrasenaActual: 'ClaveActual1!',
  contrasenaNueva: 'ClaveNueva2!',
  confirmarContrasena: 'ClaveNueva2!',
}

const errorHttp = (status, data = {}, extra = {}) => Object.assign(new Error('Error HTTP'), {
  response: { status, data },
  ...extra,
})

describe('seguridadService - contrato 080', () => {
  it('envía únicamente al endpoint de la cuenta autenticada', async () => {
    const transporte = { put: vi.fn().mockResolvedValue({ data: { requiereReautenticacion: true } }) }
    expect(CONTRATO_SEGURIDAD_080.endpoint).toBe('/api/usuarios/me/contrasena')
    expect(CONTRATO_SEGURIDAD_080.estado).toBe('disponible')
    await expect(cambiarContrasena(valores, { transporte })).resolves.toEqual({ requiereReautenticacion: true })
    expect(transporte.put.mock.calls[0][0]).toBe('/api/usuarios/me/contrasena')
  })

  it('prepara un payload propio sin incluir la confirmación ni datos de perfil', () => {
    expect(construirPayloadCambioContrasena(valores)).toEqual({
      contrasenaActual: 'ClaveActual1!',
      contrasenaNueva: 'ClaveNueva2!',
    })
  })

  it('consumiría únicamente el endpoint inyectado en pruebas y devolvería el resultado real', async () => {
    const transporte = { put: vi.fn().mockResolvedValue({ data: {} }) }
    const resultado = await cambiarContrasena(valores, {
      transporte,
      endpoint: ENDPOINT_PRUEBA_CAMBIO_CONTRASENA,
    })

    expect(resultado).toEqual({ requiereReautenticacion: false })
    expect(transporte.put).toHaveBeenCalledTimes(1)
    const [endpoint, payload] = transporte.put.mock.calls[0]
    expect(endpoint).toBe(ENDPOINT_PRUEBA_CAMBIO_CONTRASENA)
    expect(payload).toEqual(construirPayloadCambioContrasena(valores))
    expect(JSON.stringify(payload)).not.toContain('confirmarContrasena')
  })

  it('detecta la petición de reautenticación solo cuando la respuesta lo indica', () => {
    expect(requiereReautenticacion({ requiereReautenticacion: true })).toBe(true)
    expect(requiereReautenticacion({ code: 'REAUTH_REQUIRED' })).toBe(true)
    expect(requiereReautenticacion({ message: 'Contraseña actualizada' })).toBe(false)
  })
})

describe('normalizarErrorSeguridad', () => {
  it('sitúa la contraseña actual incorrecta junto al campo sin revelar secretos', () => {
    const error = normalizarErrorSeguridad(errorHttp(400, {
      message: `La contraseña ${valores.contrasenaActual} no es válida`,
      details: [{ field: 'contrasenaActual', message: 'ClaveActual1! incorrecta' }],
    }), valores)

    expect(error.codigo).toBe('validacion')
    expect(error.fieldErrors.contrasenaActual).toBe('La contraseña actual no es correcta.')
    expect(error.message).not.toContain(valores.contrasenaActual)
    expect(error.message).not.toContain(valores.contrasenaNueva)
  })

  it('reconoce alias del futuro DTO para los tres campos', () => {
    const error = normalizarErrorSeguridad(errorHttp(422, {
      details: [
        { field: 'currentPassword' },
        { field: 'new_password' },
        { field: 'confirmPassword' },
      ],
    }))

    expect(error.fieldErrors).toEqual({
      contrasenaActual: 'La contraseña actual no es correcta.',
      contrasenaNueva: 'La contraseña nueva no cumple los requisitos.',
      confirmarContrasena: 'La confirmación no coincide.',
    })
  })

  it('informa sesión expirada sin cerrarla manualmente', () => {
    const error = normalizarErrorSeguridad(errorHttp(401, { code: 'REAUTH_REQUIRED' }), valores)
    expect(error.codigo).toBe('sesion_expirada')
    expect(error.message).toBe('Tu sesión ya no es válida. Inicia sesión nuevamente.')
  })

  it('distingue endpoint no disponible, permisos, conflictos y fallos de red', () => {
    expect(normalizarErrorSeguridad(errorHttp(404)).codigo).toBe('endpoint_no_disponible')
    expect(normalizarErrorSeguridad(errorHttp(405)).codigo).toBe('endpoint_no_disponible')
    expect(normalizarErrorSeguridad(errorHttp(403)).codigo).toBe('sin_permisos')
    expect(normalizarErrorSeguridad(errorHttp(409)).codigo).toBe('conflicto')
    expect(normalizarErrorSeguridad(Object.assign(new Error('sin red'))).codigo).toBe('conexion')
    expect(normalizarErrorSeguridad(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })).codigo).toBe('tiempo_espera')
  })

  it('devuelve un mensaje seguro cuando el servidor responde con un estado inesperado', () => {
    const error = normalizarErrorSeguridad(errorHttp(500, { message: 'org.springframework.internal.Trace' }))
    expect(error.message).toBe('El backend respondió con estado HTTP 500.')
    expect(error.message).not.toContain('springframework')
  })
})
