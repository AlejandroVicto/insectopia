// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import App from '../App'
import Administracion from './Administracion'
import ConfirmarCambioAdministrativo from '../components/administracion/ConfirmarCambioAdministrativo'
import * as admin from '../services/adminService'
import { obtenerPaises, obtenerRegiones } from '../services/catalogoService'

vi.mock('../services/adminService', () => ({
  listarUsuarios: vi.fn(), obtenerResumen: vi.fn(), obtenerRoles: vi.fn(), obtenerUsuario: vi.fn(), eliminarUsuario: vi.fn(),
  obtenerAuditoria: vi.fn(), crearUsuario: vi.fn(), editarUsuario: vi.fn(), cambiarEstado: vi.fn(), cambiarRol: vi.fn(),
}))
vi.mock('../services/catalogoService', () => ({ obtenerPaises: vi.fn(), obtenerRegiones: vi.fn() }))
vi.mock('../services/notificacionesService', async (original) => ({
  ...await original(), contarNoLeidas: () => Promise.resolve({ data: { count: 0 } }),
}))

const usuario = {
  idUsuario: 7, nombre: 'Ana Ejemplo', nombreUsuario: 'ana', correo: 'ana@example.invalid',
  rol: 'USUARIO', estado: 'ACTIVO', paisCodigo: 'MX', estadoRegion: 'Oaxaca', fechaNacimiento: '1990-01-01',
  fechaRegistro: '2026-01-01T10:00:00', fechaActualizacion: '2026-01-01T10:00:00',
  protegida: false, cuentaPropia: false, recibirSms: false, recibirWhatsapp: false,
}
const pagina = (content = [usuario], number = 0, totalPages = 1) => ({ content, number, size: 10, totalElements: 12, totalPages, first: number === 0, last: number === totalPages - 1 })

beforeEach(() => {
  vi.clearAllMocks()
  admin.listarUsuarios.mockResolvedValue(pagina())
  admin.obtenerResumen.mockResolvedValue({ totalUsuarios: 12, usuarios: 9, moderadores: 2, administradores: 1, cuentasDesactivadas: 3 })
  admin.obtenerRoles.mockResolvedValue([{ nombre: 'USUARIO' }, { nombre: 'MODERADOR' }, { nombre: 'ADMINISTRADOR' }])
  admin.obtenerUsuario.mockResolvedValue(usuario)
  admin.obtenerAuditoria.mockResolvedValue(pagina([], 0, 1))
  admin.cambiarRol.mockResolvedValue({ ...usuario, rol: 'MODERADOR' })
  admin.cambiarEstado.mockResolvedValue({ ...usuario, estado: 'BLOQUEADO' })
  admin.crearUsuario.mockResolvedValue(usuario)
  admin.editarUsuario.mockResolvedValue(usuario)
  admin.eliminarUsuario.mockResolvedValue(undefined)
  obtenerPaises.mockResolvedValue([{ codigo: 'MX', nombre: 'México' }])
  obtenerRegiones.mockResolvedValue([{ nombre: 'Oaxaca' }])
})
afterEach(() => { cleanup(); vi.useRealTimers() })

function Entrar({ role }) {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  return <button onClick={() => { setSession({ token: 'jwt-prueba', user: { id: 9, role } }); navigate('/administracion') }}>Entrar</button>
}

function abrir(role = 'ADMINISTRADOR') {
  render(<MemoryRouter initialEntries={['/login']}><AuthProvider><Entrar role={role} /><App /></AuthProvider></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('Administración 081 integrada', () => {
  it('mantiene el layout y la protección de ruta', async () => {
    for (const role of ['USUARIO', 'MODERADOR']) {
      abrir(role)
      expect(screen.getByRole('heading', { name: 'Acceso restringido' })).toBeTruthy()
      expect(admin.listarUsuarios).not.toHaveBeenCalled()
      cleanup()
    }
    abrir()
    expect(document.querySelectorAll('.private-shell > header')).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeTruthy()
    await waitFor(() => expect(admin.listarUsuarios).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 10 })))
    expect(screen.getByRole('heading', { name: 'Administración de usuarios y roles' })).toBeTruthy()
  })

  it('carga tarjetas, tabla, paginación, filtros y detalle desde servidor', async () => {
    admin.listarUsuarios.mockImplementation(async ({ page }) => pagina([usuario], page, 2))
    render(<Administracion />)
    await waitFor(() => expect(screen.getByLabelText('Total usuarios: 12')).toBeTruthy())
    const tabla = screen.getByRole('table')
    await waitFor(() => expect(within(tabla).getByText('ana@example.invalid')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente ›' }))
    await waitFor(() => expect(admin.listarUsuarios).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })))
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por rol' }), { target: { value: 'USUARIO' } })
    await waitFor(() => expect(admin.listarUsuarios).toHaveBeenCalledWith(expect.objectContaining({ rol: 'USUARIO', page: 0 })))
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por estado' }), { target: { value: 'BLOQUEADO' } })
    await waitFor(() => expect(admin.listarUsuarios).toHaveBeenCalledWith(expect.objectContaining({ rol: 'USUARIO', estado: 'BLOQUEADO' })))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar nombre, usuario o correo' }), { target: { value: 'Ana' } })
    await waitFor(() => expect(admin.listarUsuarios).toHaveBeenCalledWith(expect.objectContaining({ q: 'Ana' })))
    fireEvent.click(within(tabla).getByRole('button', { name: 'Ver ficha' }))
    await waitFor(() => expect(admin.obtenerUsuario).toHaveBeenCalledWith(7))
    expect(admin.obtenerAuditoria).toHaveBeenCalledWith(7, 0)
    expect(screen.getByRole('button', { name: 'Editar datos' }).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer filtros' }))
    await waitFor(() => expect(admin.listarUsuarios).toHaveBeenCalledWith(expect.objectContaining({ q: '', page: 0 })))
  })

  it('confirma cambios de rol y estado, refresca datos y conserva error 422', async () => {
    render(<Administracion />)
    await waitFor(() => screen.getByRole('button', { name: 'Ver ficha' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ver ficha' }))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'ROL DEL USUARIO' }).disabled).toBe(false))
    fireEvent.change(screen.getByRole('combobox', { name: 'ROL DEL USUARIO' }), { target: { value: 'MODERADOR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios de rol' }))
    expect(admin.cambiarRol).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar cambio de rol' }))
    await waitFor(() => expect(admin.cambiarRol).toHaveBeenCalledWith(7, 'MODERADOR'))
    await waitFor(() => expect(admin.obtenerAuditoria).toHaveBeenCalledTimes(2))
    admin.cambiarEstado.mockRejectedValueOnce({ response: { status: 422, data: { message: 'No se puede retirar al último administrador activo.' } } })
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar cuenta' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Desactivar cuenta' }))
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toMatch(/último administrador/))
    expect(admin.cambiarEstado).toHaveBeenCalledWith(7, 'DESACTIVADO')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
  })

  it('impide cambios visuales de cuenta protegida o propia, sin sustituir protección del servidor', async () => {
    admin.obtenerUsuario.mockResolvedValue({ ...usuario, protegida: true, cuentaPropia: true })
    render(<Administracion />)
    await waitFor(() => screen.getByRole('button', { name: 'Ver ficha' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ver ficha' }))
    await waitFor(() => expect(screen.getByText('Cuenta de evaluación protegida.')).toBeTruthy())
    for (const name of ['Guardar cambios de rol', 'Editar datos', 'Eliminar cuenta', 'Desactivar cuenta']) {
      expect(screen.getByRole('button', { name }).disabled).toBe(true)
    }
    expect(admin.cambiarRol).not.toHaveBeenCalled()
    expect(admin.cambiarEstado).not.toHaveBeenCalled()
  })

  it('eliminación irreversible exige doble confirmación y elimina la ficha después de 204', async () => {
    render(<Administracion />)
    await waitFor(() => screen.getByRole('button', { name: 'Ver ficha' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ver ficha' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Eliminar cuenta' }).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar cuenta' }))
    const dialogo = screen.getByRole('dialog', { name: '¿Eliminar esta cuenta definitivamente?' })
    const confirmar = within(dialogo).getByRole('button', { name: 'Eliminar cuenta definitivamente' })
    expect(confirmar.disabled).toBe(true)
    expect(admin.eliminarUsuario).not.toHaveBeenCalled()
    fireEvent.click(within(dialogo).getByRole('checkbox', { name: /irreversible/ }))
    fireEvent.click(confirmar)
    await waitFor(() => expect(admin.eliminarUsuario).toHaveBeenCalledWith(7))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByText('Selecciona un usuario para consultar su ficha.')).toBeTruthy()
  })

  it('alta y edición validan y sólo envían DTO permitido, con contraseña opcional en edición', async () => {
    render(<Administracion />)
    fireEvent.click(screen.getByRole('button', { name: '+ Alta de usuario' }))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Alta de usuario' })).toBeTruthy())
    const dialogo = screen.getByRole('dialog')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }))
    expect(admin.crearUsuario).not.toHaveBeenCalled()
    for (const [nombre, valor] of Object.entries({ Nombre: 'Ana Ejemplo', 'Nombre de usuario': 'ana', Correo: 'ana@example.invalid', 'Fecha de nacimiento': '1990-01-01', Contraseña: 'Segura123!', 'Confirmar contraseña': 'Segura123!' })) {
      fireEvent.change(within(dialogo).getByLabelText(nombre), { target: { value: valor } })
    }
    await waitFor(() => expect(within(dialogo).getByLabelText('País').options.length).toBe(2))
    fireEvent.change(within(dialogo).getByLabelText('País'), { target: { value: 'MX' } })
    await waitFor(() => expect(within(dialogo).getByLabelText('Región').options.length).toBe(2))
    fireEvent.change(within(dialogo).getByLabelText('Región'), { target: { value: 'Oaxaca' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }))
    await waitFor(() => expect(admin.crearUsuario).toHaveBeenCalledWith(expect.objectContaining({ nombreUsuario: 'ana', paisCodigo: 'MX', contrasena: 'Segura123!' })))
    expect(Object.keys(admin.crearUsuario.mock.calls[0][0])).not.toContain('rol')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Editar datos' }).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Editar datos' }))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Editar usuario' })).toBeTruthy())
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar usuario' }))
    await waitFor(() => expect(admin.editarUsuario).toHaveBeenCalledWith(7, expect.objectContaining({ correo: 'ana@example.invalid', contrasena: '' })))
    expect(Object.keys(admin.editarUsuario.mock.calls[0][1])).not.toContain('estado')
  })

  it('muestra errores de carga y reintenta sin datos ficticios', async () => {
    admin.listarUsuarios.mockRejectedValueOnce({ response: { status: 403, data: { message: 'Sin permiso' } } })
    render(<Administracion />)
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Sin permiso/))
    expect(screen.queryByText('ana@example.invalid')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('ana@example.invalid')).toBeTruthy())
  })

  it.each([
    ['rol', '¿Confirmar cambio de rol?', 'Confirmar cambio de rol', 'USUARIO', 'MODERADOR'],
    ['desactivacion', '¿Desactivar esta cuenta?', 'Desactivar cuenta', 'ACTIVO', 'DESACTIVADO'],
    ['reactivacion', '¿Reactivar esta cuenta?', 'Reactivar cuenta', 'BLOQUEADO', 'ACTIVO'],
  ])('modal %s confirma, gestiona foco y permite cancelar', (tipo, titulo, boton, anterior, nuevo) => {
    const onClose = vi.fn(); const onConfirm = vi.fn()
    const { rerender } = render(<><button type="button">Abrir</button>
      <ConfirmarCambioAdministrativo tipo={tipo} usuario={usuario} anterior={anterior} nuevo={nuevo} onClose={onClose} onConfirm={onConfirm} /></>)
    const dialog = screen.getByRole('dialog', { name: titulo })
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(within(dialog).getByRole('button', { name: boton }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    rerender(<><button type="button">Abrir</button><ConfirmarCambioAdministrativo tipo={tipo} usuario={usuario}
      anterior={anterior} nuevo={nuevo} enviando onClose={onClose} onConfirm={onConfirm} /></>)
    expect(within(dialog).getByRole('button', { name: 'Procesando…' }).disabled).toBe(true)
    rerender(<><button type="button">Abrir</button><ConfirmarCambioAdministrativo tipo={tipo} usuario={usuario}
      anterior={anterior} nuevo={nuevo} onClose={onClose} onConfirm={onConfirm} /></>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
