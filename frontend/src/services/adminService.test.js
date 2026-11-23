// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import api from './api'
import { listarUsuarios, obtenerResumen, obtenerUsuario, obtenerRoles, obtenerAuditoria, crearUsuario, editarUsuario, cambiarRol, cambiarEstado, eliminarUsuario } from './adminService'

const adapterOriginal = api.defaults.adapter
afterEach(() => { api.defaults.adapter = adapterOriginal })

describe('Contrato REST administrativo', () => {
  it('usa sólo rutas /api/admin y los campos exactos, sin acceso a registro público', async () => {
    const solicitudes = vi.fn(async (config) => ({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }))
    api.defaults.adapter = solicitudes
    const valores = {
      nombre: ' Ana Ejemplo ', nombreUsuario: 'ANA', correo: ' ANA@example.invalid ', fechaNacimiento: '1990-01-01',
      genero: '', paisCodigo: 'mx', estadoRegion: ' Oaxaca ', telefono: '', contrasena: '',
      confirmarContrasena: '', recibirSms: false, recibirWhatsapp: true, rol: 'ADMINISTRADOR', estado: 'BLOQUEADO',
      idUsuario: 99, protegida: false, versionToken: 100,
    }
    await listarUsuarios({ q: 'ana', rol: 'USUARIO', estado: 'ACTIVO', page: 2, size: 10 })
    await obtenerResumen()
    await obtenerUsuario(7)
    await obtenerRoles()
    await obtenerAuditoria(7, 1)
    await crearUsuario({ ...valores, contrasena: 'Segura123!' })
    await editarUsuario(7, valores)
    await cambiarRol(7, 'MODERADOR')
    await cambiarEstado(7, 'DESACTIVADO')
    await eliminarUsuario(7)
    expect(solicitudes.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
      ['get', '/api/admin/usuarios'], ['get', '/api/admin/usuarios/resumen'], ['get', '/api/admin/usuarios/7'],
      ['get', '/api/admin/roles'], ['get', '/api/admin/usuarios/7/auditoria-roles'],
      ['post', '/api/admin/usuarios'], ['put', '/api/admin/usuarios/7'],
      ['patch', '/api/admin/usuarios/7/rol'], ['patch', '/api/admin/usuarios/7/estado'],
      ['delete', '/api/admin/usuarios/7'],
    ])
    const listado = solicitudes.mock.calls[0][0]
    expect(listado.params).toEqual({ q: 'ana', rol: 'USUARIO', estado: 'ACTIVO', page: 2, size: 10 })
    expect(solicitudes.mock.calls[4][0].params).toEqual({ page: 1, size: 10 })
    const alta = JSON.parse(solicitudes.mock.calls[5][0].data)
    const edicion = JSON.parse(solicitudes.mock.calls[6][0].data)
    expect(alta).toMatchObject({ nombre: 'Ana Ejemplo', nombreUsuario: 'ana', correo: 'ana@example.invalid', paisCodigo: 'MX', estadoRegion: 'Oaxaca', contrasena: 'Segura123!' })
    expect(edicion).not.toHaveProperty('contrasena')
    for (const payload of [alta, edicion]) {
      for (const campo of ['idUsuario', 'rol', 'estado', 'versionToken', 'protegida', 'confirmarContrasena']) expect(payload).not.toHaveProperty(campo)
    }
    expect(JSON.parse(solicitudes.mock.calls[7][0].data)).toEqual({ rol: 'MODERADOR' })
    expect(JSON.parse(solicitudes.mock.calls[8][0].data)).toEqual({ estado: 'DESACTIVADO' })
  })
})
