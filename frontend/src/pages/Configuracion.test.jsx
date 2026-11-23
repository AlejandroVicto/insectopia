// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import api from '../services/api'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import Configuracion from './Configuracion'

const originalAdapter = api.defaults.adapter
afterEach(() => {
  cleanup()
  api.defaults.adapter = originalAdapter
})

const perfil = {
  idUsuario: 7,
  nombre: 'María Real',
  nombreUsuario: 'maria',
  fotoPerfil: 'https://example.test/avatar.png',
  biografia: 'Estudio polinizadores',
  paisCodigo: 'MX',
  estadoRegion: 'Jalisco',
  fechaRegistro: '2022-06-01T10:00:00Z',
  totalSeguidores: 12,
  totalSeguidos: 4,
  totalPublicaciones: 3,
}
const paises = [{ codigo: 'MX', nombre: 'México' }, { codigo: 'US', nombre: 'Estados Unidos' }]
const regiones = [{ nombre: 'Jalisco' }, { nombre: 'Oaxaca' }]
const SESSION_USER = { id: 7, role: 'USUARIO', name: 'María Real', email: 'maria@test.invalid', avatarUrl: null }

const ok = (config, data) => Promise.resolve({ status: 200, data, config, headers: {} })
const fail = (config, status, data = {}) => Promise.reject(Object.assign(new Error('Error HTTP'), { config, response: { status, data, config } }))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function Sesion({ user = SESSION_USER }) {
  const { setSession } = useAuth()
  return <button type="button" onClick={() => setSession({ token: 'jwt-solo-en-prueba', user })}>Iniciar sesión de prueba</button>
}

function renderConfiguracion({
  initial = '/app/configuracion?seccion=perfil',
  datosPerfil = perfil,
  estadoPerfil = 200,
  datosIdentidad = null,
  datosPaises = paises,
  datosRegiones = regiones,
  regionesPorPais = {},
  fallarPaises = false,
  fallarRegiones = false,
  estadoGuardado = 404,
  datosGuardado = {},
  user = SESSION_USER,
} = {}) {
  const llamadas = []
  api.defaults.adapter = (config) => {
    llamadas.push(config)
    const metodo = String(config.method ?? 'get').toLowerCase()
    if (config.url === '/api/usuarios/me' && metodo === 'put') {
      return estadoGuardado === 200 ? ok(config, datosGuardado) : fail(config, estadoGuardado)
    }
    if (config.url === '/api/usuarios/me') {
      if (estadoPerfil === 404) return fail(config, 404)
      if (estadoPerfil === 503) return fail(config, 503)
      return ok(config, datosPerfil)
    }
    if (config.url === '/api/auth/me') return ok(config, datosIdentidad)
    if (config.url === '/api/catalogos/paises') {
      return fallarPaises ? Promise.reject(new Error('catálogo caído')) : ok(config, datosPaises)
    }
    if (config.url?.endsWith('/regiones')) {
      if (fallarRegiones) return Promise.reject(new Error('regiones caídas'))
      const codigo = config.url.split('/')[4]
      return ok(config, regionesPorPais[codigo] ?? datosRegiones)
    }
    return ok(config, {})
  }
  render(
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider>
        <Sesion user={user} />
        <LocationProbe />
        <Configuracion />
      </AuthProvider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión de prueba' }))
  return llamadas
}

describe('Configuración 077', () => {
  it('reproduce la estructura de Figma con campos reales y editables', async () => {
    const llamadas = renderConfiguracion()
    expect(await screen.findByRole('heading', { name: 'Configuración' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Perfil' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('button', { name: 'Cambiar foto' }).disabled).toBe(false)
    expect(screen.getByText('Presentación')).toBeTruthy()
    expect(screen.getByText('Sitio web')).toBeTruthy()
    expect(screen.getByText('Género')).toBeTruthy()
    expect(screen.getByText('Ubicación')).toBeTruthy()
    expect(screen.getByText('Fecha de nacimiento')).toBeTruthy()
    expect(screen.getByText('Información de contacto')).toBeTruthy()

    expect(screen.getByLabelText('Nombre').value).toBe('María Real')
    expect(screen.getByLabelText('Nombre de usuario').value).toBe('maria')
    const TarjetaSuperior = screen.getByLabelText('Foto y datos de perfil')
    expect(within(TarjetaSuperior).getByText('Nombre').tagName).toBe('LABEL')
    expect(within(TarjetaSuperior).getByText('Nombre de usuario').tagName).toBe('LABEL')
    expect(screen.getByLabelText('Nombre').closest('.configuracion-identidad-input')).toBeTruthy()
    expect(screen.getByLabelText('Nombre de usuario').closest('.configuracion-identidad-input')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cancelar selección' })).toBeNull()
    expect(screen.getByLabelText('Biografía').value).toBe('Estudio polinizadores')
    expect(screen.getByLabelText('Identidad').value).toBe('')
    expect(screen.getByLabelText('Identidad').disabled).toBe(false)
    expect(screen.getByLabelText('Fecha').value).toBe('')
    expect(screen.getByLabelText('Fecha').disabled).toBe(false)
    expect(screen.getByLabelText('Teléfono').value).toBe('')
    expect(screen.getByLabelText('Teléfono').disabled).toBe(false)
    expect(screen.getByLabelText('País').value).toBe('MX')
    expect(screen.getByLabelText('Estado').value).toBe('Jalisco')

    expect(within(screen.getByRole('complementary', { name: 'Resumen del perfil' })).getByText('12')).toBeTruthy()
    expect(llamadas.some((config) => config.url === '/api/usuarios/me')).toBe(true)
    expect(llamadas.some((config) => config.url === '/api/catalogos/paises')).toBe(true)
    expect(screen.queryByText('maria@test.invalid')).toBeNull()
    expect(screen.queryByText(/actividad 079/i)).toBeNull()
  })

  it('navega entre Perfil y Seguridad en la misma ruta y respeta ?seccion=seguridad', async () => {
    renderConfiguracion({ initial: '/app/configuracion?seccion=seguridad' })
    await screen.findByRole('heading', { name: 'Configuración' })
    expect(screen.getByRole('tab', { name: 'Seguridad' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Inicio de sesión y recuperación')).toBeTruthy()
    expect(screen.getByText('Contraseña')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }))
    expect(screen.getByRole('tab', { name: 'Perfil' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Presentación')).toBeTruthy()
    expect(screen.getByTestId('location').textContent).toBe('/app/configuracion?seccion=perfil')
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Seguridad' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTestId('location').textContent).toBe('/app/configuracion?seccion=seguridad')
  })

  it('valida nombre, usuario y biografía con mensajes accesibles y habilita guardar', async () => {
    renderConfiguracion()
    const usuario = await screen.findByLabelText('Nombre de usuario')
    const nombre = screen.getByLabelText('Nombre')
    const bio = screen.getByLabelText('Biografía')

    fireEvent.change(usuario, { target: { value: 'M@RIA' } })
    fireEvent.blur(usuario)
    expect(screen.getByText('El nombre de usuario no puede contener @.')).toBeTruthy()
    expect(usuario.getAttribute('aria-invalid')).toBe('true')
    expect(usuario.getAttribute('aria-describedby')).toContain('config-nombreUsuario-error')

    fireEvent.change(usuario, { target: { value: 'maria' } })
    fireEvent.change(nombre, { target: { value: 'María Real 123' } })
    fireEvent.blur(nombre)
    expect(screen.getByText('El nombre solo puede contener letras y espacios.')).toBeTruthy()
    fireEvent.change(nombre, { target: { value: 'María Real' } })

    fireEvent.change(bio, { target: { value: 'Nueva presentación' } })
    expect(screen.getByText('Tienes cambios pendientes de guardar.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar cambios' }).disabled).toBe(false)
  })

  it('valida género, fecha y teléfono sin exigir que el perfil los devuelva', async () => {
    renderConfiguracion({ datosPerfil: { ...perfil, genero: null, fechaNacimiento: null, telefono: null } })
    await screen.findByLabelText('Biografía')

    const genero = screen.getByLabelText('Identidad')
    const fecha = screen.getByLabelText('Fecha')
    const telefono = screen.getByLabelText('Teléfono')
    fireEvent.change(genero, { target: { value: 'Femenino' } })
    fireEvent.change(fecha, { target: { value: '2004-01-04' } })
    fireEvent.change(telefono, { target: { value: 'abc' } })
    fireEvent.blur(telefono)
    expect(screen.getByText('Ingresa un teléfono válido.')).toBeTruthy()
    fireEvent.change(telefono, { target: { value: '+52 33 1234 5678' } })
    expect(screen.queryByText('Ingresa un teléfono válido.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Guardar cambios' }).disabled).toBe(false)
  })

  it('envía la actualización preparada, muestra el error del servidor y conserva los cambios', async () => {
    const llamadas = renderConfiguracion()
    await screen.findByLabelText('Biografía')
    fireEvent.change(screen.getByLabelText('Biografía'), { target: { value: 'Nueva presentación' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText(/aún no está disponible en el servidor/)).toBeTruthy()
    expect(screen.getByLabelText('Biografía').value).toBe('Nueva presentación')
    expect(screen.queryByText(/se guardaron/i)).toBeNull()

    const guardado = llamadas.find((config) => String(config.method).toLowerCase() === 'put')
    expect(guardado).toBeTruthy()
    expect(guardado.url).toBe('/api/usuarios/me')
    expect(guardado.data).not.toMatch(/fotoPerfil|archivo|contrasena/)
  })

  it('usa la petición de actualización cuando el servicio responde correctamente', async () => {
    const llamadas = renderConfiguracion({ estadoGuardado: 200 })
    await screen.findByLabelText('Biografía')
    fireEvent.change(screen.getByLabelText('Biografía'), { target: { value: 'Nueva presentación' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Tus cambios se guardaron.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar cambios' }).disabled).toBe(true)
    expect(llamadas.filter((config) => String(config.method).toLowerCase() === 'put')).toHaveLength(1)
  })

  it('cancela y restaura los valores originales', async () => {
    renderConfiguracion()
    await screen.findByLabelText('Biografía')
    fireEvent.change(screen.getByLabelText('Biografía'), { target: { value: 'Cambio temporal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByLabelText('Biografía').value).toBe('Estudio polinizadores')
    expect(screen.getByRole('button', { name: 'Guardar cambios' }).disabled).toBe(true)
  })

  it('selecciona, previsualiza y cancela una imagen sin enviarla ni dejar Object URLs', async () => {
    const crearOriginal = URL.createObjectURL
    const revocarOriginal = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:configuracion')
    URL.revokeObjectURL = vi.fn()
    try {
      const llamadas = renderConfiguracion()
      await screen.findByLabelText('Biografía')
      const input = document.querySelector('#config-foto')
      fireEvent.change(input, {
        target: { files: [new File([new Uint8Array([1, 2, 3])], 'foto.jpg', { type: 'image/jpeg' })] },
      })
      expect(screen.getByRole('img', { name: 'Vista previa de tu nueva foto de perfil' }).getAttribute('src')).toBe('blob:configuracion')
      expect(screen.getByText(/Archivo seleccionado: foto.jpg/)).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Cancelar selección' })).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Recuperar imagen anterior' })).toBeNull()
      expect(screen.getByText('Tienes cambios pendientes de guardar.')).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar selección' }))
      expect(screen.queryByRole('img', { name: 'Vista previa de tu nueva foto de perfil' })).toBeNull()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:configuracion')
      expect(screen.getByRole('button', { name: 'Guardar cambios' }).disabled).toBe(true)
      expect(llamadas.some((config) => ['post', 'put', 'patch', 'delete'].includes(String(config.method).toLowerCase()))).toBe(false)
    } finally {
      URL.createObjectURL = crearOriginal
      URL.revokeObjectURL = revocarOriginal
    }
  })

  it('rechaza formatos y tamaños de imagen fuera de la política del proyecto', async () => {
    renderConfiguracion()
    await screen.findByLabelText('Biografía')
    const input = document.querySelector('#config-foto')

    fireEvent.change(input, { target: { files: [new File(['x'], 'foto.gif', { type: 'image/gif' })] } })
    expect(screen.getByText(/Selecciona una imagen JPG o PNG/)).toBeTruthy()
    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' })] },
    })
    expect(screen.getByText(/Selecciona una imagen JPG o PNG/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar cambios' }).disabled).toBe(true)
  })

  it('recupera la imagen anterior al quitarla y limpia la vista previa al desmontar', async () => {
    const crearOriginal = URL.createObjectURL
    const revocarOriginal = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:anterior')
    URL.revokeObjectURL = vi.fn()
    try {
      renderConfiguracion()
      await screen.findByLabelText('Biografía')
      fireEvent.click(screen.getByRole('button', { name: 'Quitar imagen' }))
      expect(screen.queryByRole('img', { name: 'Vista previa de tu nueva foto de perfil' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Recuperar imagen anterior' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Recuperar imagen anterior' }))
      expect(screen.getByRole('img', { name: 'Avatar de María Real' })).toBeTruthy()

      fireEvent.change(document.querySelector('#config-foto'), {
        target: { files: [new File([new Uint8Array([2])], 'otra.png', { type: 'image/png' })] },
      })
      expect(screen.getByRole('img', { name: 'Vista previa de tu nueva foto de perfil' }).getAttribute('src')).toBe('blob:anterior')
      cleanup()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:anterior')
    } finally {
      URL.createObjectURL = crearOriginal
      URL.revokeObjectURL = revocarOriginal
    }
  })

  it('limpia la región anterior, consulta la del nuevo país y muestra carga', async () => {
    const llamadas = renderConfiguracion({
      regionesPorPais: { MX: regiones, US: [{ nombre: 'California' }] },
    })
    await screen.findByLabelText('Biografía')
    const pais = screen.getByLabelText('País')
    const estado = screen.getByLabelText('Estado')
    expect(estado.value).toBe('Jalisco')

    fireEvent.change(pais, { target: { value: 'US' } })
    expect(estado.value).toBe('')
    expect(estado.disabled).toBe(true)
    await waitFor(() => expect(llamadas.some((config) => config.url === '/api/catalogos/paises/US/regiones')).toBe(true))

    await waitFor(() => expect(estado.disabled).toBe(false))
    expect([...estado.options].map((option) => option.value)).toContain('California')
    expect([...estado.options].map((option) => option.value)).not.toContain('Jalisco')
  })

  it('muestra error y reintenta la carga del perfil', async () => {
    let fallar = true
    const llamadas = []
    api.defaults.adapter = (config) => {
      llamadas.push(config)
      if (config.url === '/api/usuarios/me') return fallar ? fail(config, 503) : ok(config, perfil)
      if (config.url === '/api/catalogos/paises') return ok(config, paises)
      if (config.url?.endsWith('/regiones')) return ok(config, regiones)
      return ok(config, {})
    }
    render(
      <MemoryRouter initialEntries={['/app/configuracion']}>
        <AuthProvider>
          <Sesion />
          <Configuracion />
        </AuthProvider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión de prueba' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('No pudimos cargar tu configuración')).toBeTruthy()
    fallar = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByLabelText('Biografía')).toBeTruthy()
    expect(llamadas.filter((config) => config.url === '/api/usuarios/me')).toHaveLength(2)
  })

  it('usa /api/auth/me ante 404 sin inventar biografía ni estadísticas', async () => {
    const identidad = { id: 7, role: 'USUARIO', name: 'María Real', nombreUsuario: 'maria', email: 'maria@test.invalid', avatarUrl: null }
    renderConfiguracion({ estadoPerfil: 404, datosIdentidad: identidad })
    expect(await screen.findByText(/Perfil parcial/)).toBeTruthy()
    expect(await screen.findByLabelText('Biografía')).toBeTruthy()
    expect(screen.getByLabelText('Biografía').value).toBe('')
    expect(screen.getByLabelText('País').value).toBe('')
    expect(within(screen.getByRole('complementary', { name: 'Resumen del perfil' })).getAllByText('—').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('tab', { name: 'Seguridad' }))
    expect(screen.getByDisplayValue('maria@test.invalid')).toBeTruthy()
  })

  it('no bloquea el formulario si el catálogo falla y mantiene los códigos reales', async () => {
    renderConfiguracion({ fallarPaises: true })
    await screen.findByLabelText('Biografía')
    expect(screen.getByText('Catálogo de países no disponible.')).toBeTruthy()
    expect(screen.getByLabelText('País').disabled).toBe(true)
    expect(screen.getByLabelText('País').value).toBe('MX')
  })

  it('mantiene Seguridad como área de la 079 sin campos editable del Perfil', async () => {
    renderConfiguracion({ initial: '/app/configuracion?seccion=seguridad' })
    await screen.findByRole('heading', { name: 'Contraseña' })
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeTruthy()
    expect(screen.getByDisplayValue('maria@test.invalid')).toBeTruthy()
    expect(screen.getByText(/Pendiente · backend 080/)).toBeTruthy()
    expect(screen.getByText(/Requiere backend 080/)).toBeTruthy()
    expect(screen.getByText(/recuperación se habilitará/)).toBeTruthy()
    expect(screen.queryByLabelText('Foto y datos de perfil')).toBeNull()
    expect(screen.queryByLabelText('Nombre')).toBeNull()
    expect(screen.queryByLabelText('Nombre de usuario')).toBeNull()
    expect(screen.queryByLabelText('Nueva contraseña')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cambiar foto' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull()
    expect(screen.queryByRole('complementary', { name: 'Resumen del perfil' })).toBeNull()
  })

  it('abre el modal de contraseña desde Seguridad en la misma ruta y restaura el foco', async () => {
    renderConfiguracion({ initial: '/app/configuracion?seccion=seguridad' })
    await screen.findByRole('heading', { name: 'Contraseña' })
    const abrir = screen.getByRole('button', { name: 'Cambiar contraseña' })
    abrir.focus()
    fireEvent.click(abrir)

    expect(await screen.findByRole('dialog', { name: 'Cambiar contraseña' })).toBeTruthy()
    expect(screen.getByTestId('location').textContent).toBe('/app/configuracion?seccion=seguridad')
    expect(screen.getByLabelText('Contraseña actual')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText('Contraseña actual'))

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(abrir)
  })

  it('aborta la consulta de perfil al desmontar', async () => {
    let senalPerfil
    api.defaults.adapter = (config) => {
      if (config.url === '/api/usuarios/me') {
        senalPerfil = config.signal
        return new Promise(() => {})
      }
      if (config.url === '/api/catalogos/paises') return ok(config, paises)
      if (config.url?.endsWith('/regiones')) return ok(config, regiones)
      return ok(config, {})
    }
    const vista = render(
      <MemoryRouter initialEntries={['/app/configuracion']}>
        <AuthProvider>
          <Sesion />
          <Configuracion />
        </AuthProvider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión de prueba' }))
    await waitFor(() => expect(senalPerfil).toBeTruthy())
    vista.unmount()
    expect(senalPerfil.aborted).toBe(true)
  })
})
