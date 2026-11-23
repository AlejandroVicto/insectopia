// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import api from '../services/api'
import { obtenerPaises, obtenerRegiones } from '../services/catalogoService'
import Registro from './Registro'

vi.mock('../services/catalogoService', () => ({
  obtenerPaises: vi.fn(),
  obtenerRegiones: vi.fn(),
}))

const adaptadorOriginal = api.defaults.adapter

function respuestaOk(config) {
  return Promise.resolve({
    data: { idUsuario: 1 },
    status: 201,
    statusText: 'Created',
    headers: {},
    config,
  })
}

function renderRegistro({ adaptador = vi.fn(respuestaOk) } = {}) {
  api.defaults.adapter = adaptador
  const resultado = render(
    <MemoryRouter initialEntries={['/registro']}>
      <Routes>
        <Route
          path="/registro"
          element={<Registro />}
        />
        <Route path="/login" element={<p>Pantalla de inicio de sesión</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return { ...resultado, adaptador }
}

async function completarFormulario() {
  await waitFor(() => expect(screen.getByRole('option', { name: 'México' })).toBeTruthy())
  fireEvent.change(screen.getByLabelText(/^nombre de usuario$/i), {
    target: { value: 'maria_insectos' },
  })
  fireEvent.change(screen.getByLabelText(/^nombre completo$/i), {
    target: { value: 'Mariana González' },
  })
  fireEvent.change(screen.getByLabelText(/^correo electrónico$/i), {
    target: { value: 'maria@ejemplo.com' },
  })
  fireEvent.change(screen.getByLabelText(/^fecha de nacimiento$/i), {
    target: { value: '1995-05-20' },
  })
  fireEvent.change(screen.getByLabelText(/^país$/i), {
    target: { value: 'MX' },
  })
  await waitFor(() => expect(screen.getByRole('option', { name: 'Oaxaca' })).toBeTruthy())
  fireEvent.change(screen.getByLabelText(/^estado \/ región$/i), {
    target: { value: 'Oaxaca' },
  })
  fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
    target: { value: 'ClaveSegura1!' },
  })
  fireEvent.change(screen.getByLabelText(/^confirmar contraseña$/i), {
    target: { value: 'ClaveSegura1!' },
  })
  fireEvent.click(screen.getByLabelText(/acepto los términos/i))
}

beforeEach(() => {
  vi.clearAllMocks()
  obtenerPaises.mockResolvedValue([{ codigo: 'MX', nombre: 'México' }])
  obtenerRegiones.mockResolvedValue([{ nombre: 'Oaxaca' }, { nombre: 'Puebla' }])
})

afterEach(() => {
  api.defaults.adapter = adaptadorOriginal
  cleanup()
})

describe('pantalla de registro', () => {
  it('no muestra la barra superior de registro, recuperación ni búsqueda', () => {
    renderRegistro()
    expect(screen.queryByText('Registro')).toBeNull()
    expect(screen.queryByText('Recuperar Contraseña')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Búsqueda no disponible' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeTruthy()
  })

  it('carga países exclusivamente desde la API sin aviso de registro no disponible', async () => {
    const { adaptador } = renderRegistro()

    expect(screen.queryByText(/registro no disponible/i)).toBeNull()
    expect(screen.getByRole('button', { name: /crear cuenta/i }).disabled).toBe(false)
    expect(adaptador).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/^país$/i).disabled).toBe(false)
    expect(screen.queryByRole('option', { name: 'México' })).toBeNull()
    expect((await screen.findByRole('option', { name: 'México' })).value).toBe('MX')
    expect(screen.getByLabelText(/^fecha de nacimiento$/i).disabled).toBe(false)
  })

  it('el botón de fecha abre el calendario o enfoca el campo si no hay selector nativo', () => {
    renderRegistro()
    const fecha = screen.getByLabelText(/^fecha de nacimiento$/i)
    const calendario = screen.getByRole('button', { name: /abrir calendario de fecha de nacimiento/i })
    const showPicker = vi.fn()
    fecha.showPicker = showPicker
    fireEvent.click(calendario)
    expect(showPicker).toHaveBeenCalledOnce()
    fecha.showPicker = undefined
    fireEvent.click(calendario)
    expect(document.activeElement).toBe(fecha)
    fireEvent.change(fecha, { target: { value: '2002-04-21' } })
    expect(fecha.value).toBe('2002-04-21')
  })

  it('valida todos los campos obligatorios al enviar y marca aria-invalid', () => {
    renderRegistro()

    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(screen.getByText('El nombre es obligatorio.')).toBeTruthy()
    expect(screen.getByText('El nombre de usuario es obligatorio.')).toBeTruthy()
    expect(screen.getByText('El correo electrónico es obligatorio.')).toBeTruthy()
    expect(screen.getByText('La fecha de nacimiento es obligatoria.')).toBeTruthy()
    expect(screen.getByText('El país es obligatorio.')).toBeTruthy()
    expect(screen.getByText('Primero selecciona un país válido.')).toBeTruthy()
    expect(screen.getByText('La contraseña es obligatoria.')).toBeTruthy()
    expect(screen.getByText('Confirma tu contraseña.')).toBeTruthy()
    expect(screen.getByText('Debes aceptar los términos y el aviso de privacidad.')).toBeTruthy()

    const nombre = screen.getByLabelText(/^nombre completo$/i)
    expect(nombre.getAttribute('aria-invalid')).toBe('true')
    expect(nombre.getAttribute('aria-describedby')).toContain('registro-nombre-error')
  })

  it('valida el nombre de usuario mientras se escribe y al salir del campo', () => {
    renderRegistro()
    const usuario = screen.getByLabelText(/^nombre de usuario$/i)

    fireEvent.change(usuario, { target: { value: 'Ab@' } })
    expect(usuario.value).toBe('ab@')
    expect(screen.getByText(/no puede contener @/i)).toBeTruthy()

    fireEvent.change(usuario, { target: { value: 'ab' } })
    fireEvent.blur(usuario)
    expect(screen.getByText(/de 3 a 30 caracteres/i)).toBeTruthy()

    fireEvent.change(usuario, { target: { value: 'maria.insectos' } })
    expect(screen.queryByText(/de 3 a 30 caracteres/i)).toBeNull()
  })

  it('valida correo, fecha futura y reglas de contraseña', () => {
    renderRegistro()

    const correo = screen.getByLabelText(/^correo electrónico$/i)
    fireEvent.change(correo, { target: { value: 'correo-invalido' } })
    expect(screen.getByText(/correo electrónico válido/i)).toBeTruthy()

    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    const fechaFutura = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`
    fireEvent.change(screen.getByLabelText(/^fecha de nacimiento$/i), {
      target: { value: fechaFutura },
    })
    expect(screen.getByText(/no sea futura/i)).toBeTruthy()

    const contrasena = screen.getByLabelText(/^contraseña$/i)
    fireEvent.change(contrasena, { target: { value: 'debil' } })
    expect(screen.getByText(/al menos 8 caracteres/i)).toBeTruthy()

    fireEvent.change(contrasena, { target: { value: 'ClaveSegura1!' } })
    expect(screen.queryByText(/al menos 8 caracteres/i)).toBeNull()

    const confirmacion = screen.getByLabelText(/^confirmar contraseña$/i)
    fireEvent.change(confirmacion, { target: { value: 'OtraClave1!' } })
    expect(screen.getByText(/no coinciden/i)).toBeTruthy()

    fireEvent.change(confirmacion, { target: { value: 'ClaveSegura1!' } })
    expect(screen.queryByText(/no coinciden/i)).toBeNull()
  })

  it('valida que el nombre contenga solo letras y el teléfono tenga 7 a 15 dígitos', () => {
    renderRegistro()
    const nombre = screen.getByLabelText(/^nombre completo$/i)
    fireEvent.change(nombre, { target: { value: 'María 123' } })
    expect(screen.getByText(/solo puede contener letras/i)).toBeTruthy()
    fireEvent.change(nombre, { target: { value: 'María José' } })
    expect(screen.queryByText(/solo puede contener letras/i)).toBeNull()

    const telefono = screen.getByLabelText(/^teléfono \(opcional\)$/i)
    fireEvent.change(telefono, { target: { value: '123456' } })
    expect(screen.getByText(/entre 7 y 15 dígitos\./i)).toBeTruthy()
    fireEvent.change(telefono, { target: { value: '+52 951 123 4567' } })
    expect(screen.queryByText(/debe contener entre 7 y 15 dígitos/i)).toBeNull()
    fireEvent.change(telefono, { target: { value: 'abc1234567' } })
    expect(screen.getByText('Ingresa un teléfono válido.')).toBeTruthy()
  })

  it('requiere teléfono si se activa SMS y muestra error cuando no carga el catálogo', async () => {
    obtenerPaises.mockRejectedValueOnce(new Error('offline'))
    renderRegistro()
    expect(await screen.findByText(/no se pudo cargar el catálogo de países/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /crear cuenta/i }).disabled).toBe(false)
    expect(screen.getByLabelText(/^país$/i).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    expect(await screen.findByRole('option', { name: 'México' })).toBeTruthy()
    fireEvent.click(screen.getByLabelText(/recibir sms/i))
    expect(screen.getByText(/se requiere un teléfono/i)).toBeTruthy()
  })

  it('la región depende del país y se limpia al cambiar de país', async () => {
    renderRegistro()
    const pais = screen.getByLabelText(/^país$/i)
    const region = screen.getByLabelText(/^estado \/ región$/i)

    expect(region.disabled).toBe(true)

    expect((await screen.findByRole('option', { name: 'México' })).value).toBe('MX')
    fireEvent.change(pais, { target: { value: 'MX' } })
    expect(pais.value).toBe('MX')
    await waitFor(() => expect(region.disabled).toBe(false))
    expect(obtenerRegiones).toHaveBeenCalledWith('MX')

    fireEvent.change(region, { target: { value: 'Oaxaca' } })
    expect(region.value).toBe('Oaxaca')

    fireEvent.change(pais, { target: { value: '' } })
    expect(region.value).toBe('')
    expect(region.disabled).toBe(true)
    expect(screen.getByText('Primero selecciona un país válido.')).toBeTruthy()
  })

  it('muestra regiones del nuevo país y descarta respuestas tardías del anterior', async () => {
    obtenerPaises.mockResolvedValue([
      { codigo: 'MX', nombre: 'México' }, { codigo: 'AR', nombre: 'Argentina' },
    ])
    let resolverMexico
    obtenerRegiones.mockImplementation((codigo) => codigo === 'MX'
      ? new Promise((resolve) => { resolverMexico = resolve })
      : Promise.resolve([{ nombre: 'Córdoba' }, { nombre: 'Buenos Aires' }]))
    renderRegistro()
    const pais = screen.getByLabelText(/^país$/i)
    const region = screen.getByLabelText(/^estado \/ región$/i)
    await screen.findByRole('option', { name: 'México' })

    fireEvent.change(pais, { target: { value: 'MX' } })
    expect(region.disabled).toBe(true)
    fireEvent.change(pais, { target: { value: 'AR' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Córdoba' })).toBeTruthy())
    fireEvent.change(region, { target: { value: 'Córdoba' } })
    expect(region.value).toBe('Córdoba')

    resolverMexico([{ nombre: 'Oaxaca' }])
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Oaxaca' })).toBeNull())
    expect(region.value).toBe('Córdoba')
    expect(obtenerRegiones).toHaveBeenCalledWith('AR')
  })

  it('bloquea regiones no verificadas si el catálogo las devuelve vacías', async () => {
    obtenerPaises.mockResolvedValue([
      { codigo: 'MX', nombre: 'México' }, { codigo: 'AR', nombre: 'Argentina' },
    ])
    obtenerRegiones.mockResolvedValue([])
    renderRegistro()
    const pais = screen.getByLabelText(/^país$/i)
    await waitFor(() => expect(screen.getByRole('option', { name: 'Argentina' })).toBeTruthy())
    fireEvent.change(pais, { target: { value: 'AR' } })
    expect(await screen.findByText(/no tiene regiones verificadas/i)).toBeTruthy()
    expect(screen.getByLabelText(/^estado \/ región$/i).disabled).toBe(true)
  })

  it('sin backend no ofrece países inventados ni simula un registro', async () => {
    obtenerPaises.mockRejectedValue(new Error('offline'))
    obtenerRegiones.mockRejectedValue(new Error('offline'))
    const adaptador = vi.fn()
    renderRegistro({ adaptador })

    const pais = screen.getByLabelText(/^país$/i)
    expect(await screen.findByText(/no se pudo cargar el catálogo de países/i)).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'México' })).toBeNull()
    expect(pais.value).toBe('')
    expect(screen.getByLabelText(/^estado \/ región$/i).disabled).toBe(true)
    expect(screen.getByLabelText(/^fecha de nacimiento$/i).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(screen.getByText('El país es obligatorio.')).toBeTruthy()
    expect(adaptador).not.toHaveBeenCalled()
    expect(screen.queryByText('Pantalla de inicio de sesión')).toBeNull()
  })

  it('mantiene SMS y WhatsApp desmarcados por defecto y permite marcarlos', () => {
    renderRegistro()
    const sms = screen.getByLabelText(/recibir sms/i)
    const whatsapp = screen.getByLabelText(/recibir whatsapp/i)

    expect(sms.checked).toBe(false)
    expect(whatsapp.checked).toBe(false)

    fireEvent.click(sms)
    expect(sms.checked).toBe(true)
    expect(whatsapp.checked).toBe(false)
  })

  it('envía el payload previsto, deshabilita el botón y navega a /login', async () => {
    let resolver
    const adaptador = vi.fn(() => new Promise((resolve) => { resolver = resolve }))
    const { adaptador: adaptadorUsuario } = renderRegistro({ adaptador })
    expect(adaptadorUsuario).toBe(adaptador)

    await completarFormulario()
    const boton = screen.getByRole('button', { name: /crear cuenta/i })
    fireEvent.click(boton)

    expect(screen.getByRole('button', { name: /creando cuenta/i }).disabled).toBe(true)
    await waitFor(() => expect(adaptador).toHaveBeenCalledOnce())

    const config = adaptador.mock.calls[0][0]
    const payload = JSON.parse(config.data)
    expect(config.url).toBe('/api/auth/register')
    expect(config.skipAuth).toBe(true)
    expect(payload).not.toHaveProperty('confirmarContrasena')
    expect(payload).not.toHaveProperty('aceptarTerminos')
    expect(payload).toMatchObject({
      nombre: 'Mariana González',
      nombreUsuario: 'maria_insectos',
      correo: 'maria@ejemplo.com',
      fechaNacimiento: '1995-05-20',
      paisCodigo: 'MX',
      estadoRegion: 'Oaxaca',
      recibirSms: false,
      recibirWhatsapp: false,
    })

    resolver({
      data: { idUsuario: 1 },
      status: 201,
      statusText: 'Created',
      headers: {},
      config,
    })

    expect(await screen.findByText('Pantalla de inicio de sesión')).toBeTruthy()
  })

  it('muestra errores de campo devueltos por el backend', async () => {
    const adaptador = vi.fn((config) => Promise.reject({
      config,
      response: {
        status: 422,
        data: {
          message: 'Los datos enviados no son válidos',
          details: [{ field: 'correo', message: 'El correo ya está registrado' }],
        },
      },
    }))
    renderRegistro({ adaptador })

    await completarFormulario()
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    expect(await screen.findByText('El correo ya está registrado')).toBeTruthy()
    expect(screen.getByLabelText(/^correo electrónico$/i).getAttribute('aria-invalid')).toBe('true')
  })

  it('informa conflictos 409, fallos de conexión y endpoint ausente', async () => {
    const casos = [
      {
        nombre: 'conflicto',
        error: (config) => ({ config, response: { status: 409, data: { message: 'correo duplicado' } } }),
        texto: /ya est[aá]n registrad/i,
      },
      {
        nombre: 'conexión',
        error: (config) => ({ config, userMessage: 'No se pudo conectar con el backend' }),
        texto: /no se pudo conectar/i,
      },
      {
        nombre: 'endpoint ausente',
        error: (config) => ({ config, response: { status: 404, data: { message: 'Recurso no encontrado' } } }),
        texto: /no se encontró el servicio de registro/i,
      },
    ]

    for (const caso of casos) {
      const adaptador = vi.fn((config) => Promise.reject(caso.error(config)))
      const { unmount } = renderRegistro({ adaptador })

      await completarFormulario()
      fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

      expect(await screen.findByRole('alert')).toBeTruthy()
      expect(screen.getByRole('alert').textContent).toMatch(caso.texto)
      unmount()
    }
  })

  it('no envía contraseñas al resolver errores del servidor', async () => {
    const adaptador = vi.fn((config) => Promise.reject({
      config,
      response: { status: 500, data: { message: 'Error interno del servidor' } },
    }))
    renderRegistro({ adaptador })

    await completarFormulario()
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).not.toContain('ClaveSegura1!')
  })
})
