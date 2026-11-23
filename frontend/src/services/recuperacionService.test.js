// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { clasificarErrorRecuperacion, mensajeErrorRecuperacion } from './recuperacionService'

describe('contrato pendiente de recuperación', () => {
  it('solo clasifica como token inválido respuestas explícitas del backend', () => {
    expect(clasificarErrorRecuperacion({ response: { status: 400, data: { code: 'TOKEN_EXPIRED' } } }, 'restablecer')).toBe('token')
    expect(clasificarErrorRecuperacion({ response: { status: 422, data: { message: 'El enlace ya fue utilizado' } } }, 'restablecer')).toBe('token')
    for (const status of [400, 404, 500]) {
      expect(clasificarErrorRecuperacion({ response: { status, data: { message: 'Fallo técnico' } } }, 'restablecer')).toBe('tecnico')
    }
    expect(clasificarErrorRecuperacion({ code: 'ECONNABORTED' }, 'restablecer')).toBe('tecnico')
  })

  it('nunca muestra el mensaje arbitrario del servidor ni el token', () => {
    const mensaje = mensajeErrorRecuperacion({ response: { status: 500, data: { message: 'secreto de token' } } })
    expect(mensaje).not.toContain('secreto')
  })
})
