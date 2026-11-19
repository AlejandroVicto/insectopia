// @vitest-environment jsdom
import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import api, { bindApiSession } from './api'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import App from '../App'

const originalAdapter = api.defaults.adapter
const originalBaseURL = api.defaults.baseURL
let unbind

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'https://api.insectopia.test')
  api.defaults.baseURL = import.meta.env.VITE_API_URL
  api.defaults.adapter = originalAdapter
})
afterEach(() => {
  unbind?.()
  unbind = null
  api.defaults.adapter = originalAdapter
  api.defaults.baseURL = originalBaseURL
  vi.unstubAllEnvs()
  cleanup()
})

function success(config) {
  return Promise.resolve({ data: { status: 'ok' }, status: 200, statusText: 'OK', headers: {}, config })
}

function fail(config, status) {
  return Promise.reject({ config, response: { status } })
}

describe('cliente Axios', () => {
  it('adjunta Bearer con token activo y nunca a /api/health', async () => {
    const adapter = vi.fn(success)
    api.defaults.adapter = adapter
    unbind = bindApiSession({ getToken: () => 'jwt-de-prueba', onUnauthorized: vi.fn() })
    await api.get('/api/privado')
    expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer jwt-de-prueba')
    await api.get('/api/health')
    expect(adapter.mock.calls[1][0].headers.get('Authorization')).toBeUndefined()
    await api.get('https://api.insectopia.test/api/privado')
    expect(adapter.mock.calls[2][0].headers.get('Authorization')).toBe('Bearer jwt-de-prueba')
    await api.get('/api/privado', { skipAuth: true })
    expect(adapter.mock.calls[3][0].headers.get('Authorization')).toBeUndefined()
  })

  it('no envía Bearer a URLs externas, ni con baseURL sobrescrito o protocolo distinto', async () => {
    const adapter = vi.fn(success)
    api.defaults.adapter = adapter
    unbind = bindApiSession({ getToken: () => 'jwt-de-prueba', onUnauthorized: vi.fn() })
    await api.get('https://externo.example/api/privado')
    await api.get('/api/privado', { baseURL: 'https://externo.example' })
    await api.get('http://api.insectopia.test/api/privado')
    await api.get('//externo.example/api/privado')
    for (const [config] of adapter.mock.calls) {
      expect(config.headers.get('Authorization')).toBeUndefined()
      expect(config.sessionToken).toBeUndefined()
    }
  })

  it('sin sesión no envía Authorization, ni siquiera con token vacío', async () => {
    const adapter = vi.fn(success)
    api.defaults.adapter = adapter
    await api.get('/api/privado')
    expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBeUndefined()
    unbind = bindApiSession({ getToken: () => '  ', onUnauthorized: vi.fn() })
    await api.get('/api/privado')
    expect(adapter.mock.calls[1][0].headers.get('Authorization')).toBeUndefined()
  })

  it('401 solo invalida la sesión que envió el token; 403 conserva la sesión', async () => {
    const invalidate = vi.fn()
    unbind = bindApiSession({ getToken: () => 'activo', onUnauthorized: invalidate })
    api.defaults.adapter = (config) => fail(config, 403)
    await expect(api.get('/api/privado')).rejects.toMatchObject({ userMessage: expect.stringContaining('permisos') })
    expect(invalidate).not.toHaveBeenCalled()
    api.defaults.adapter = (config) => fail(config, 401)
    await expect(api.get('/api/health')).rejects.toMatchObject({ response: { status: 401 } })
    expect(invalidate).not.toHaveBeenCalled()
    await expect(api.get('/api/privado')).rejects.toMatchObject({ userMessage: expect.stringContaining('sesión') })
    expect(invalidate).toHaveBeenCalledOnce()
    expect(invalidate).toHaveBeenCalledWith('activo')
  })

  it('un 401 externo no invalida la sesión, aunque se envíen metadatos de sesión en la configuración', async () => {
    const invalidate = vi.fn()
    unbind = bindApiSession({ getToken: () => 'activo', onUnauthorized: invalidate })
    api.defaults.adapter = (config) => fail(config, 401)
    await expect(api.get('https://externo.example/privado', { sessionToken: 'activo' }))
      .rejects.toMatchObject({ response: { status: 401 } })
    await expect(api.get('/api/privado', { baseURL: 'https://externo.example' }))
      .rejects.toMatchObject({ response: { status: 401 } })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('distingue red y timeout sin invalidar sesión', async () => {
    const invalidate = vi.fn()
    unbind = bindApiSession({ getToken: () => 'activo', onUnauthorized: invalidate })
    api.defaults.adapter = (config) => Promise.reject(new axios.AxiosError('sin conexión', 'ERR_NETWORK', config))
    await expect(api.get('/api/privado')).rejects.toMatchObject({ userMessage: expect.stringContaining('conectar') })
    api.defaults.adapter = (config) => Promise.reject(new axios.AxiosError('timeout', 'ECONNABORTED', config))
    await expect(api.get('/api/privado')).rejects.toMatchObject({ userMessage: expect.stringContaining('tiempo') })
    expect(invalidate).not.toHaveBeenCalled()
  })
})

function SessionProbe() {
  const { token, setSession } = useAuth()
  const location = useLocation()
  return (
    <>
      <button onClick={() => setSession({ token: 'solo-test', user: { id: 2, role: 'USUARIO' } })}>Sesión</button>
      <button onClick={() => setSession({ token: 'nuevo-test', user: { id: 2, role: 'USUARIO' } })}>Renovar</button>
      <button onClick={() => { api.get('/api/privado').catch(() => {}) }}>Solicitar</button>
      <p>Token: {token ?? 'ninguno'}</p>
      <p>Destino: {location.state?.from ?? 'ninguno'}</p>
    </>
  )
}

it('un 401 del token actual limpia el contexto y redirige al login con destino', async () => {
  api.defaults.adapter = (config) => fail(config, 401)
  render(
    <MemoryRouter initialEntries={['/privado?pagina=2']}>
      <AuthProvider>
        <SessionProbe />
        <Routes>
          <Route path="/privado" element={<p>Privado</p>} />
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByText('Sesión'))
  fireEvent.click(screen.getByText('Solicitar'))
  await waitFor(() => expect(screen.getByText('Login')).toBeTruthy())
  expect(screen.getByText('Token: ninguno')).toBeTruthy()
  expect(screen.getByText('Destino: /privado?pagina=2')).toBeTruthy()
})

it('la pantalla de conexión sigue disponible en la ruta pública sin Bearer', async () => {
  const adapter = vi.fn(success)
  api.defaults.adapter = adapter
  render(
    <MemoryRouter initialEntries={['/health']}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  )
  expect(await screen.findByText('Conexión exitosa')).toBeTruthy()
  expect(adapter.mock.calls[0][0].url).toBe('/api/health')
  expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBeUndefined()
})

it('un 401 retrasado de un token anterior no borra una sesión renovada', async () => {
  let rejectRequest
  const adapter = vi.fn(() => new Promise((resolve, reject) => { rejectRequest = reject }))
  api.defaults.adapter = adapter
  render(
    <MemoryRouter initialEntries={['/privado']}>
      <AuthProvider>
        <SessionProbe />
        <Routes>
          <Route path="/privado" element={<p>Privado</p>} />
          <Route path="/login" element={<p>Login</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByText('Sesión'))
  fireEvent.click(screen.getByText('Solicitar'))
  await waitFor(() => expect(adapter).toHaveBeenCalledOnce())
  fireEvent.click(screen.getByText('Renovar'))
  await act(async () => {
    rejectRequest({ config: adapter.mock.calls[0][0], response: { status: 401 } })
  })
  expect(screen.getByText('Token: nuevo-test')).toBeTruthy()
  expect(screen.getByText('Privado')).toBeTruthy()
  expect(screen.queryByText('Login')).toBeNull()
})
