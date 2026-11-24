// @vitest-environment jsdom
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import GoogleResultado from './GoogleResultado'
import { intercambiarCodigoGoogle, limpiarParametroCodigo } from '../services/googleService'

vi.mock('../services/googleService', () => ({
  GOOGLE_REGISTRO_PATH: '/registro',
  intercambiarCodigoGoogle: vi.fn(),
  limpiarParametroCodigo: vi.fn(),
}))

const urlOriginal = window.location.href

function SesionProbe() {
  const { role, isAuthenticated } = useAuth()
  return <output data-testid="sesion">{isAuthenticated ? role : 'sin sesión'}</output>
}

function RegistroProbe() {
  const location = useLocation()
  return (
    <div>
      <p>Formulario tradicional en modo Google</p>
      <output data-testid="registro-token">{location.state?.registrationToken}</output>
      <output data-testid="registro-correo">{location.state?.perfil?.email}</output>
    </div>
  )
}

function ConfiguracionProbe() {
  const location = useLocation()
  return <output data-testid="mensaje-vinculo">{location.state?.googleMensaje}</output>
}

function renderResultado({ code = 'codigo_opaco_123', respuesta, estricto = false, rechazo } = {}) {
  const query = code ? `?code=${code}&state=estado&error=none` : ''
  window.history.replaceState(null, '', `/auth/google/resultado${query}`)
  if (rechazo) intercambiarCodigoGoogle.mockRejectedValue(rechazo)
  else intercambiarCodigoGoogle.mockResolvedValue(respuesta)

  const pantalla = (
    <MemoryRouter initialEntries={[`/auth/google/resultado${query}`]}>
      <AuthProvider>
        <SesionProbe />
        <Routes>
          <Route path="/auth/google/resultado" element={<GoogleResultado />} />
          <Route path="/app" element={<p>Área general</p>} />
          <Route path="/app/configuracion" element={<ConfiguracionProbe />} />
          <Route path="/registro" element={<RegistroProbe />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

  return render(estricto ? <StrictMode>{pantalla}</StrictMode> : pantalla)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.history.replaceState(null, '', urlOriginal)
})

describe('GoogleResultado', () => {
  it('intercambia el código opaco, limpia la URL y crea la sesión con el JWT del backend', async () => {
    renderResultado({
      respuesta: {
        estado: 'LOGIN_COMPLETO',
        auth: {
          token: 'jwt-del-backend',
          user: { id: 7, role: 'USUARIO', name: 'María', email: 'maria@test.invalid' },
        },
      },
    })

    expect(await screen.findByText('Área general')).toBeTruthy()
    expect(screen.getByTestId('sesion').textContent).toBe('USUARIO')
    expect(limpiarParametroCodigo).toHaveBeenCalledTimes(1)
    expect(intercambiarCodigoGoogle).toHaveBeenCalledWith('codigo_opaco_123')
  })

  it('no crea ninguna sesión cuando el registro está pendiente y lleva el token por router state', async () => {
    renderResultado({
      respuesta: {
        estado: 'REGISTRO_PENDIENTE',
        registrationToken: 'token_registro_opaco',
        perfil: { email: 'maria@test.invalid', nombre: 'María' },
      },
    })

    expect(await screen.findByText('Formulario tradicional en modo Google')).toBeTruthy()
    expect(screen.getByTestId('registro-token').textContent).toBe('token_registro_opaco')
    expect(screen.getByTestId('registro-correo').textContent).toBe('maria@test.invalid')
    expect(screen.getByTestId('sesion').textContent).toBe('sin sesión')
  })

  it('explica que hace falta vincular sin inventar una cuenta', async () => {
    renderResultado({
      respuesta: {
        estado: 'VINCULACION_REQUERIDA',
        mensaje: 'Ya existe una cuenta con ese correo.',
      },
    })

    expect(await screen.findByText('Vinculación requerida')).toBeTruthy()
    expect(screen.getByText('Ya existe una cuenta con ese correo.')).toBeTruthy()
    expect(screen.getByTestId('sesion').textContent).toBe('sin sesión')
    expect(screen.getByRole('link', { name: /ir al inicio de sesión/i })).toBeTruthy()
  })

  it('vuelve a configuración tras una vinculación exitosa', async () => {
    renderResultado({
      respuesta: {
        estado: 'LOGIN_COMPLETO',
        origen: 'vinculacion',
        mensaje: 'Google quedó vinculado.',
        auth: {
          token: 'jwt-del-backend',
          user: { id: 7, role: 'USUARIO', name: 'María', email: 'maria@test.invalid' },
        },
      },
    })

    expect(await screen.findByTestId('mensaje-vinculo')).toBeTruthy()
    expect(screen.getByTestId('mensaje-vinculo').textContent).toBe('Google quedó vinculado.')
    expect(screen.getByTestId('sesion').textContent).toBe('USUARIO')
  })

  it('rechaza una respuesta sin código sin llamar al backend', async () => {
    renderResultado({ code: null })

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText(/no recibimos una respuesta válida de google/i)).toBeTruthy()
    expect(limpiarParametroCodigo).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(intercambiarCodigoGoogle).not.toHaveBeenCalled())
  })

  it('en StrictMode intercambia una sola vez y completa la navegación', async () => {
    renderResultado({
      estricto: true,
      respuesta: {
        estado: 'REGISTRO_PENDIENTE',
        registrationToken: 'token_strict',
        perfil: { email: 'maria@test.invalid' },
      },
    })

    expect(await screen.findByText('Formulario tradicional en modo Google')).toBeTruthy()
    expect(screen.getByTestId('registro-token').textContent).toBe('token_strict')
    expect(intercambiarCodigoGoogle).toHaveBeenCalledTimes(1)
    expect(limpiarParametroCodigo).toHaveBeenCalledTimes(1)
  })

  it('muestra un error visible si el intercambio falla', async () => {
    renderResultado({ rechazo: new Error('backend caído') })

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText(/no se pudo verificar la respuesta de google/i)).toBeTruthy()
    expect(screen.queryByText(/verificando google/i)).toBeNull()
    expect(intercambiarCodigoGoogle).toHaveBeenCalledTimes(1)
  })
})
