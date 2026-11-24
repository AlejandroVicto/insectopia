// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import api from '../services/api'
import { LOGIN_ENDPOINT } from '../services/loginService'
import { useAuth } from '../auth/useAuth'
import { AuthProvider } from '../auth/AuthProvider'
import Login from './Login'

const adaptadorOriginal = api.defaults.adapter

function respuesta(config, data, status = 200) {
  return Promise.resolve({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config,
  })
}

function respuestaExitosa(role = 'ADMINISTRADOR', data = null) {
  return vi.fn((config) => respuesta(config, data ?? {
    token: 'token-de-prueba',
    user: { id: 7, role, name: 'María', email: 'maria@ejemplo.com' },
  }))
}

function rechazar(config, status, data) {
  const error = new Error('Fallo simulado')
  error.config = config
  error.response = { status, data, config }
  return Promise.reject(error)
}

function SesionProbe() {
  const { role, isAuthenticated } = useAuth()
  return <><p>Sesión: {isAuthenticated ? role : 'sin sesión'}</p>
    <button onClick={() => api.get('/api/auth/me')}>Consultar perfil protegido</button></>
}

function renderLogin({
  disponible = true,
  adaptador = respuestaExitosa(),
  estado = undefined,
} = {}) {
  api.defaults.adapter = adaptador
  const entrada = estado ? { pathname: '/login', state: estado } : '/login'
  const resultado = render(
    <MemoryRouter initialEntries={[entrada]}>
      <AuthProvider>
        <SesionProbe />
        <Routes>
          <Route path="/login" element={<Login servicioDisponible={disponible} />} />
          <Route path="/registro" element={<p>Pantalla de registro</p>} />
          <Route path="/recuperar-contrasena" element={<p>Pantalla de recuperación</p>} />
          <Route path="/app" element={<p>Área general</p>} />
          <Route path="/app/mensajes" element={<p>Mensajes recientes</p>} />
          <Route path="/moderacion" element={<p>Área moderación</p>} />
          <Route path="/administracion" element={<p>Área administración</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
  return { ...resultado, adaptador }
}

function completarFormulario() {
  fireEvent.change(screen.getByLabelText('Correo'), {
    target: { value: '  MARIA@EJEMPLO.COM  ' },
  })
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'clave-cualquiera' },
  })
}

function enviar() {
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

afterEach(() => {
  api.defaults.adapter = adaptadorOriginal
  cleanup()
})

describe('pantalla de inicio de sesión', () => {
  it('informa que el servicio no está disponible y no envía credenciales', () => {
    const { adaptador } = renderLogin({ disponible: false })

    expect(
      screen.getAllByRole('status').some((nodo) => /no disponible/i.test(nodo.textContent)),
    ).toBe(true)
    expect(screen.getByRole('button', { name: 'Iniciar sesión' }).disabled).toBe(true)
    expect(adaptador).not.toHaveBeenCalled()
    expect(screen.getByText('Sesión: sin sesión')).toBeTruthy()
  })

  it('valida correo y contraseña al enviar con mensajes accesibles', () => {
    renderLogin()

    enviar()

    expect(screen.getByText('El correo electrónico es obligatorio.')).toBeTruthy()
    expect(screen.getByText('La contraseña es obligatoria.')).toBeTruthy()

    const correo = screen.getByLabelText('Correo')
    expect(correo.getAttribute('aria-invalid')).toBe('true')
    expect(correo.getAttribute('aria-describedby')).toContain('login-correo-error')
    expect(screen.getByLabelText('Contraseña').getAttribute('aria-invalid')).toBe('true')
  })

  it('normaliza espacios y valida el formato al escribir y al salir', () => {
    const { adaptador } = renderLogin()
    const correo = screen.getByLabelText('Correo')

    fireEvent.change(correo, { target: { value: '  maria@ejemplo.com  ' } })
    expect(correo.value).toBe('maria@ejemplo.com')
    expect(screen.queryByText(/correo electrónico válido/i)).toBeNull()

    fireEvent.change(correo, { target: { value: 'correo-invalido' } })
    expect(screen.getByText(/correo electrónico válido/i)).toBeTruthy()
    fireEvent.blur(correo)
    expect(screen.getByText(/correo electrónico válido/i)).toBeTruthy()
    expect(adaptador).not.toHaveBeenCalled()
  })

  it('muestra y oculta la contraseña mediante un botón accesible', () => {
    renderLogin()
    const contrasena = screen.getByLabelText('Contraseña')

    expect(contrasena.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: /mostrar contraseña/i }))
    expect(screen.getByLabelText('Contraseña').type).toBe('text')

    fireEvent.click(screen.getByRole('button', { name: /ocultar contraseña/i }))
    expect(screen.getByLabelText('Contraseña').type).toBe('password')
  })

  it('expone los enlaces de registro y recuperación', () => {
    renderLogin()

    expect(screen.getByRole('link', { name: /crea una ahora/i }).getAttribute('href')).toBe('/registro')
    expect(screen.getByRole('link', { name: /has olvidado tu contraseña/i }).getAttribute('href')).toBe(
      '/recuperar-contrasena',
    )
  })

  it('mantiene solo a Google, a ancho completo y sin sesión ficticia', async () => {
    const { adaptador } = renderLogin()

    const google = screen.getByRole('button', { name: /google/i })
    expect(google.disabled).toBe(true)
    expect(google.getAttribute('aria-label')).toMatch(/no disponible/i)
    expect(google.className).toContain('w-full')
    expect(google.parentElement.className).toContain('w-full')
    expect(google.parentElement.querySelectorAll('button')).toHaveLength(1)

    expect(screen.queryByRole('button', { name: /facebook/i })).toBeNull()
    expect(screen.queryByText(/facebook/i)).toBeNull()
    expect(await screen.findByText(/google estará disponible cuando se integre OAuth/i)).toBeTruthy()

    fireEvent.click(google)

    expect(adaptador.mock.calls.map(([config]) => config.url)).toEqual(['/api/google/config'])
    expect(screen.getByText('Sesión: sin sesión')).toBeTruthy()
  })

  it('muestra el estado de carga y deshabilita el botón durante el envío', async () => {
    renderLogin({ adaptador: vi.fn(() => new Promise(() => {})) })
    completarFormulario()

    enviar()

    const boton = screen.getByRole('button', { name: /iniciando sesión/i })
    expect(boton.disabled).toBe(true)
    expect(screen.getByLabelText('Correo').disabled).toBe(false)
  })

  it('muestra un error 401 sin revelar qué credencial falló', async () => {
    const adaptador = vi.fn((config) => rechazar(config, 401, { message: 'Autenticación requerida' }))
    renderLogin({ adaptador })
    completarFormulario()

    enviar()

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/correo o contraseña incorrectos/i))
    expect(screen.getByText('Sesión: sin sesión')).toBeTruthy()
  })

  it('muestra errores de validación del backend junto al campo', async () => {
    const adaptador = vi.fn((config) => rechazar(config, 422, {
      message: 'Los datos enviados no son válidos',
      details: [{ field: 'email', message: 'Formato de correo inválido' }],
    }))
    renderLogin({ adaptador })
    completarFormulario()

    enviar()

    await waitFor(() => expect(screen.getByText('Formato de correo inválido')).toBeTruthy())
    expect(screen.getByLabelText('Correo').getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('informa errores de conexión', async () => {
    const adaptador = vi.fn(() => Promise.reject(new Error('sin red')))
    renderLogin({ adaptador })
    completarFormulario()

    enviar()

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/no se pudo conectar/i))
  })

  it('envía el correo como identificador, crea la sesión y redirige según el rol', async () => {
    const { adaptador } = renderLogin({ adaptador: respuestaExitosa('ADMINISTRADOR') })
    completarFormulario()

    enviar()

    await waitFor(() => expect(screen.getByText('Área administración')).toBeTruthy())
    const llamadaLogin = llamadaA(adaptador, LOGIN_ENDPOINT)
    expect(JSON.parse(llamadaLogin.data)).toEqual({
      correo: 'maria@ejemplo.com',
      contrasena: 'clave-cualquiera',
    })
    expect(llamadaLogin.url).toBe(LOGIN_ENDPOINT)
    expect(llamadaLogin.skipAuth).toBe(true)
    expect(screen.getByText('Sesión: ADMINISTRADOR')).toBeTruthy()
  })

  it('acepta el JSON definitivo de Spring y envía Bearer desde AuthProvider', async () => {
    const adaptador = vi.fn((config) => respuesta(config, config.url === LOGIN_ENDPOINT
      ? { token: 'jwt-firmado', user: { id: 7, role: 'USUARIO', name: 'María', email: 'maria@ejemplo.com', nombreUsuario: 'maria', avatarUrl: null } }
      : { id: 7, role: 'USUARIO' }))
    renderLogin({ adaptador })
    completarFormulario()
    enviar()
    await waitFor(() => expect(screen.getByText('Área general')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Consultar perfil protegido' }))
    await waitFor(() => expect(llamadaA(adaptador, '/api/auth/me')).toBeTruthy())
    expect(llamadaA(adaptador, '/api/auth/me').headers.get('Authorization')).toBe('Bearer jwt-firmado')
  })

  it.each([
    ['USUARIO', 'Área general'],
    ['MODERADOR', 'Área moderación'],
  ])('redirige a %s a su área correspondiente', async (role, destino) => {
    renderLogin({ adaptador: respuestaExitosa(role) })
    completarFormulario()

    enviar()

    await waitFor(() => expect(screen.getByText(destino)).toBeTruthy())
    expect(screen.getByText(`Sesión: ${role}`)).toBeTruthy()
  })

  it('preserva el destino original solicitado cuando es una ruta interna segura', async () => {
    renderLogin({
      adaptador: respuestaExitosa('USUARIO'),
      estado: { from: '/app/mensajes?tab=recientes' },
    })
    completarFormulario()

    enviar()

    await waitFor(() => expect(screen.getByText('Mensajes recientes')).toBeTruthy())
    expect(screen.queryByText('Área general')).toBeNull()
    expect(screen.getByText('Sesión: USUARIO')).toBeTruthy()
  })

  it('ignora destinos externos en state.from', async () => {
    renderLogin({
      adaptador: respuestaExitosa('MODERADOR'),
      estado: { from: 'https://sitio-externo.example/login' },
    })
    completarFormulario()

    enviar()

    await waitFor(() => expect(screen.getByText('Área moderación')).toBeTruthy())
  })
})

function llamadaA(adaptador, url) {
  return adaptador.mock.calls.map(([config]) => config).find((config) => config.url === url)
}
