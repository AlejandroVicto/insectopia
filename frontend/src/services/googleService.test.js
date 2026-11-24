// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import {
  GOOGLE_LOGIN_URL,
  cancelarRegistroGoogle,
  construirPayloadRegistroGoogle,
  intercambiarCodigoGoogle,
  limpiarParametroCodigo,
  normalizarErrorGoogle,
  obtenerConfiguracionGoogle,
  redirigirAGoogle,
  urlAutorizacionGoogle,
} from './googleService'

const baseUrlOriginal = api.defaults.baseURL
const urlOriginal = window.location.href

beforeEach(() => {
  api.defaults.baseURL = 'http://localhost:8080'
})

afterEach(() => {
  vi.restoreAllMocks()
  api.defaults.baseURL = baseUrlOriginal
  window.history.replaceState(null, '', urlOriginal)
})

describe('googleService', () => {
  it('acepta únicamente la ruta de autorización del backend', () => {
    expect(urlAutorizacionGoogle('/oauth2/authorization/google')).toContain('/oauth2/authorization/google')
    expect(urlAutorizacionGoogle('http://localhost:8080/oauth2/authorization/google?intent=login&linkToken=abc_123'))
      .toContain('linkToken=abc_123')
    expect(urlAutorizacionGoogle(null)).toBeNull()
    expect(urlAutorizacionGoogle('https://proveedor.example/oauth2/authorization/google')).toBeNull()
    expect(urlAutorizacionGoogle('/oauth2/authorization/google/extra')).toBeNull()
    expect(urlAutorizacionGoogle('/oauth2/authorization/otro')).toBeNull()
    expect(urlAutorizacionGoogle('/oauth2/authorization/google?redirect=https://mal.example')).toBeNull()
    expect(urlAutorizacionGoogle('/oauth2/authorization/google?intent=admin')).toBeNull()
    expect(urlAutorizacionGoogle('/oauth2/authorization/google?linkToken=con%20espacios')).toBeNull()
    expect(urlAutorizacionGoogle('/oauth2/authorization/google#fragmento')).toBeNull()
  })

  it('redirige solo a una URL validada y nunca la modifica', () => {
    const destino = { assign: vi.fn() }

    const resultado = redirigirAGoogle('/oauth2/authorization/google?intent=login', destino)

    expect(destino.assign).toHaveBeenCalledWith(resultado)
    expect(resultado).toContain('/oauth2/authorization/google?intent=login')
    expect(() => redirigirAGoogle('https://mal.example', destino)).toThrow(/no es válida/i)
    expect(destino.assign).toHaveBeenCalledTimes(1)
  })

  it('borra código, estado y error del historial sin perder otros parámetros', () => {
    window.history.replaceState(null, '', '/auth/google/resultado?code=opaco&state=abc&error=denied&keep=1#frag')

    const teniaDatos = limpiarParametroCodigo()

    expect(teniaDatos).toBe(true)
    expect(window.location.search).toBe('?keep=1')
    expect(window.location.hash).toBe('#frag')
    expect(limpiarParametroCodigo()).toBe(false)
  })

  it('lee la configuración pública y rechaza una URL de inicio manipulada', async () => {
    const get = vi.spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { enabled: true, loginUrl: 'http://localhost:8080/oauth2/authorization/google' } })
      .mockResolvedValueOnce({ data: { enabled: true, loginUrl: 'https://mal.example/oauth2/authorization/google' } })

    const configurado = await obtenerConfiguracionGoogle()
    const manipulado = await obtenerConfiguracionGoogle()

    expect(configurado).toEqual({ enabled: true, loginUrl: 'http://localhost:8080/oauth2/authorization/google' })
    expect(manipulado).toEqual({ enabled: true, loginUrl: GOOGLE_LOGIN_URL })
    expect(get).toHaveBeenCalledWith('/api/google/config', expect.objectContaining({ skipAuth: true, timeout: 10000 }))
  })

  it('no envía códigos de intercambio mal formados', async () => {
    const post = vi.spyOn(api, 'post')

    for (const codigo of ['', '   ', 'abc def', '../otra-ruta', 'x'.repeat(129)]) {
      await expect(intercambiarCodigoGoogle(codigo)).rejects.toThrow(/no es válido/i)
    }

    expect(post).not.toHaveBeenCalled()
  })

  it('intercambia el código opaco por cuerpo y sin autorización previa', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { estado: 'LOGIN_COMPLETO' } })

    const respuesta = await intercambiarCodigoGoogle('  codigo_opaco-123  ')

    expect(respuesta.estado).toBe('LOGIN_COMPLETO')
    expect(post).toHaveBeenCalledWith('/api/google/exchange', { code: 'codigo_opaco-123' }, { skipAuth: true })
  })

  it('construye el registro solo con datos del formulario, nunca con identidad o secretos', () => {
    const payload = construirPayloadRegistroGoogle({
      nombre: '  Mariana González  ',
      nombreUsuario: '  MARIA.Insectos ',
      fechaNacimiento: '1995-05-20',
      genero: '  Femenino ',
      paisCodigo: ' mx ',
      estadoRegion: ' Oaxaca ',
      telefono: ' +529511234567 ',
      recibirSms: true,
      recibirWhatsapp: false,
      aceptarTerminos: true,
      correo: 'atacante@ejemplo.com',
      sub: 'google-sub-robado',
      token: 'token-opaco',
      contrasena: 'ClaveSegura1!',
    })

    expect(payload).toEqual({
      nombre: 'Mariana González',
      nombreUsuario: 'maria.insectos',
      fechaNacimiento: '1995-05-20',
      genero: 'Femenino',
      paisCodigo: 'MX',
      estadoRegion: 'Oaxaca',
      telefono: '+529511234567',
      recibirSms: true,
      recibirWhatsapp: false,
      aceptarTerminos: true,
    })
    expect(payload).not.toHaveProperty('correo')
    expect(payload).not.toHaveProperty('sub')
    expect(payload).not.toHaveProperty('token')
    expect(payload).not.toHaveProperty('contrasena')
  })

  it('no intenta cancelar un registro sin token válido', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} })

    expect(await cancelarRegistroGoogle('token con espacios')).toBe(false)
    expect(post).not.toHaveBeenCalled()

    expect(await cancelarRegistroGoogle('token_opaco')).toBe(true)
    expect(post).toHaveBeenCalledWith('/api/google/register/cancel', { token: 'token_opaco' }, { skipAuth: true })
  })

  it('normaliza errores de campo y no refleja secretos del backend', () => {
    const resultado = normalizarErrorGoogle({
      response: {
        status: 422,
        data: {
          message: 'El token interno bearer secret es inválido',
          details: [
            { field: 'nombre_usuario', message: 'Ya está en uso' },
            { field: 'token', message: 'No debe aparecer' },
          ],
        },
      },
    })

    expect(resultado.codigo).toBe(422)
    expect(resultado.fieldErrors).toEqual({ nombreUsuario: 'Ya está en uso' })
    expect(resultado.message).toBe('No se pudo completar la operación con Google.')
  })
})
