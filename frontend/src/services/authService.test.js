// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import {
  REGISTRO_ENDPOINT,
  construirPayloadRegistro,
  normalizarErrorRegistro,
  registrarUsuario,
} from './authService'

const adaptadorOriginal = api.defaults.adapter

const valoresValidos = {
  nombre: '  Mariana González  ',
  nombreUsuario: '  Maria.Insectos  ',
  correo: '  MARIA@EJEMPLO.COM  ',
  fechaNacimiento: '1995-05-20',
  genero: '  ',
  paisCodigo: 'mx',
  estadoRegion: '  Oaxaca  ',
  telefono: '   ',
  contrasena: 'ClaveSegura1!',
  confirmarContrasena: 'ClaveSegura1!',
  recibirSms: false,
  recibirWhatsapp: false,
  aceptarTerminos: true,
}

afterEach(() => {
  api.defaults.adapter = adaptadorOriginal
  vi.unstubAllEnvs()
})

describe('servicio de registro', () => {
  it('construye el payload acordado sin confirmación ni aceptación de términos', () => {
    expect(construirPayloadRegistro(valoresValidos)).toEqual({
      nombre: 'Mariana González',
      nombreUsuario: 'maria.insectos',
      correo: 'maria@ejemplo.com',
      fechaNacimiento: '1995-05-20',
      genero: null,
      paisCodigo: 'MX',
      estadoRegion: 'Oaxaca',
      telefono: null,
      contrasena: 'ClaveSegura1!',
      recibirSms: false,
      recibirWhatsapp: false,
    })
  })

  it('publica al endpoint previsto mediante Axios y sin Bearer', async () => {
    const adaptador = vi.fn((config) => Promise.resolve({
      data: { id: 1 },
      status: 201,
      statusText: 'Created',
      headers: {},
      config,
    }))
    api.defaults.adapter = adaptador

    await registrarUsuario(valoresValidos)

    expect(adaptador).toHaveBeenCalledOnce()
    const config = adaptador.mock.calls[0][0]
    expect(config.url).toBe(REGISTRO_ENDPOINT)
    expect(config.method).toBe('post')
    expect(config.skipAuth).toBe(true)
    expect(config.headers.get('Authorization')).toBeUndefined()
    expect(JSON.parse(config.data)).toEqual(construirPayloadRegistro(valoresValidos))
  })

  it('mapea errores 400/422 por campo con distintos nombres del backend', () => {
    const resultado = normalizarErrorRegistro({
      response: {
        status: 422,
        data: {
          message: 'Los datos enviados no son válidos',
          details: [
            { field: 'nombre_usuario', message: 'Ya está en uso' },
            { field: 'correo electrónico', message: 'Formato inválido' },
            { field: 'estado_region', message: 'Región requerida' },
          ],
        },
      },
    })

    expect(resultado.codigo).toBe('validacion')
    expect(resultado.fieldErrors).toEqual({
      nombreUsuario: 'Ya está en uso',
      correo: 'Formato inválido',
      estadoRegion: 'Región requerida',
    })
  })

  it('interpreta conflictos 409 de correo y nombre de usuario', () => {
    const correo = normalizarErrorRegistro({
      response: { status: 409, data: { message: 'El correo ya existe' } },
    })
    expect(correo.codigo).toBe('conflicto')
    expect(correo.fieldErrors.correo).toMatch(/ya está registrado/i)

    const usuario = normalizarErrorRegistro({
      response: { status: 409, data: { message: 'nombre_usuario duplicado' } },
    })
    expect(usuario.fieldErrors.nombreUsuario).toMatch(/ya está en uso/i)
  })

  it('distingue servicio no disponible, conexión y errores genéricos', () => {
    expect(normalizarErrorRegistro({ response: { status: 404 } }).codigo).toBe('no_disponible')
    expect(normalizarErrorRegistro({ userMessage: 'No se pudo conectar' }).message)
      .toMatch(/no se pudo conectar/i)
    expect(normalizarErrorRegistro(new Error('otro')).codigo).toBe('general')
  })

  it('no devuelve la contraseña en los mensajes de error', () => {
    const resultado = normalizarErrorRegistro({
      response: { status: 400, data: { message: 'Datos inválidos' } },
    })
    expect(JSON.stringify(resultado)).not.toContain(valoresValidos.contrasena)
  })
})
