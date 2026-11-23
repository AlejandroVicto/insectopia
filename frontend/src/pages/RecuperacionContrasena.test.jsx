// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import api, { bindApiSession } from '../services/api'
import Login from './Login'
import RecuperacionContrasena from './RecuperacionContrasena'

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ setSession: vi.fn() }) }))
const original = api.defaults.adapter
function respuesta(config, status = 200) { return Promise.resolve({ config, status, data: {}, headers: {} }) }
function fallo(config, status, data) {
  const error = new Error('Error de prueba')
  error.config = config
  if (status) error.response = { status, data, config }
  return Promise.reject(error)
}
function Ruta() { const { pathname, search } = useLocation(); return <p data-testid="ruta">{pathname}{search}</p> }
function montar(ruta = '/recuperar-contrasena', adapter = vi.fn((config) => respuesta(config))) {
  api.defaults.adapter = adapter
  render(<MemoryRouter initialEntries={[ruta]}><Ruta /><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/recuperar-contrasena" element={<RecuperacionContrasena />} />
    <Route path="/restablecer-contrasena" element={<RecuperacionContrasena restablecer />} />
  </Routes></MemoryRouter>)
  return adapter
}
afterEach(() => { cleanup(); api.defaults.adapter = original })

describe('recuperación de contraseña', () => {
  it('entra desde el login y conserva la navegación pública', () => {
    montar('/login')
    fireEvent.click(screen.getByRole('link', { name: /has olvidado tu contraseña/i }))
    expect(screen.getByRole('heading', { name: /olvidaste tu contraseña/i })).toBeTruthy()
    expect(screen.getByTestId('ruta').textContent).toBe('/recuperar-contrasena')
    fireEvent.click(screen.getByRole('link', { name: /volver a iniciar sesión/i }))
    expect(screen.getByTestId('ruta').textContent).toBe('/login')
  })

  it('muestra el flujo sin enlaces ni textos redundantes del panel', () => {
    montar()
    expect(screen.queryByText('Te enviaremos instrucciones si existe una cuenta asociada.')).toBeNull()
    expect(screen.queryByText('La respuesta no confirma si existe una cuenta.')).toBeNull()
    expect(screen.queryByText(/INSECTOPIA\s*\/\s*SEGURIDAD DE CUENTA/)).toBeNull()
    expect(screen.queryByRole('link', { name: /iniciar sesión.*→/ })).toBeNull()
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toBeTruthy()
  })

  it('valida correo vacío, formato y longitud; corrige al escribir', () => {
    const adapter = montar()
    fireEvent.click(screen.getByRole('button', { name: /enviar enlace/i }))
    const campo = screen.getByLabelText('CORREO ELECTRÓNICO')
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    expect(campo.getAttribute('aria-describedby')).toContain('recuperacion-correo-error')
    expect(screen.getByRole('alert').textContent).toMatch(/obligatorio/)
    fireEvent.change(campo, { target: { value: 'incorrecto' } })
    expect(screen.getByRole('alert').textContent).toMatch(/válido/)
    fireEvent.change(campo, { target: { value: `${'a'.repeat(150)}@ejemplo.com` } })
    expect(screen.getByRole('alert').textContent).toMatch(/150/)
    fireEvent.change(campo, { target: { value: 'maria@ejemplo.com' } })
    expect(campo.getAttribute('aria-invalid')).toBe('false')
    expect(adapter).not.toHaveBeenCalled()
  })

  it('envía solo correo sin JWT, muestra respuesta genérica y permite volver a solicitar', async () => {
    const unbind = bindApiSession({ getToken: () => 'jwt-antiguo', onUnauthorized: vi.fn() })
    try {
      const adapter = montar()
      fireEvent.change(screen.getByLabelText('CORREO ELECTRÓNICO'), { target: { value: 'MARIA@EJEMPLO.COM' } })
      fireEvent.click(screen.getByRole('button', { name: /enviar enlace/i }))
      await screen.findByRole('heading', { name: 'Revisa tu correo' })
      expect(screen.getByText(/Si el correo está asociado a una cuenta de Insectopia/)).toBeTruthy()
      expect(screen.queryByText(/maria@ejemplo.com/i)).toBeNull()
      expect(screen.queryByRole('link', { name: /crear una nueva contraseña/i })).toBeNull()
      expect(adapter).toHaveBeenCalledOnce()
      const config = adapter.mock.calls[0][0]
      expect(config.url).toBe('/api/auth/forgot-password')
      expect(JSON.parse(config.data)).toEqual({ correo: 'maria@ejemplo.com' })
      expect(config.skipAuth).toBe(true)
      expect(config.headers.get('Authorization')).toBeUndefined()
      fireEvent.click(screen.getByRole('button', { name: /solicita un nuevo enlace/i }))
      expect(screen.getByLabelText('CORREO ELECTRÓNICO')).toBeTruthy()
    } finally { unbind() }
  })

  it('bloquea dobles envíos; en error de conexión permite reintentar sin inventar éxito', async () => {
    let rechazar
    let intentos = 0
    const adapter = montar(undefined, vi.fn((config) => {
      intentos += 1
      if (intentos > 1) return respuesta(config)
      return new Promise((resolve, reject) => { rechazar = () => fallo(config).catch(reject) })
    }))
    fireEvent.change(screen.getByLabelText('CORREO ELECTRÓNICO'), { target: { value: 'maria@ejemplo.com' } })
    const boton = screen.getByRole('button', { name: /enviar enlace/i })
    fireEvent.click(boton)
    fireEvent.submit(boton.closest('form'))
    await waitFor(() => expect(adapter).toHaveBeenCalledOnce())
    expect(boton.disabled).toBe(true)
    rechazar()
    await screen.findByRole('alert')
    expect(screen.queryByText('Revisa tu correo')).toBeNull()
    expect(boton.disabled).toBe(false)
    fireEvent.click(boton)
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(2))
  })

  it('sin token muestra estado seguro, sin llamar al backend', () => {
    const adapter = montar('/restablecer-contrasena')
    expect(screen.getByRole('heading', { name: /este enlace ya no es válido/i })).toBeTruthy()
    expect(screen.queryByLabelText('NUEVA CONTRASEÑA')).toBeNull()
    expect(adapter).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('link', { name: 'Solicitar otro enlace' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/recuperar-contrasena')
  })

  it('con token limpia la URL, valida complejidad, coincidencia y permite ver/ocultar ambos campos', async () => {
    const adapter = montar('/restablecer-contrasena?token=secreto-de-prueba')
    await waitFor(() => expect(screen.getByTestId('ruta').textContent).toBe('/restablecer-contrasena'))
    const nueva = screen.getByLabelText('NUEVA CONTRASEÑA')
    const confirmar = screen.getByLabelText('CONFIRMAR CONTRASEÑA')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))
    expect(nueva.getAttribute('aria-invalid')).toBe('true')
    expect(confirmar.getAttribute('aria-describedby')).toContain('recuperacion-confirmarContrasena-error')
    for (const [clave, mensaje] of [['corta', '8 caracteres'], ['largasinmayuscula1!', 'mayúscula'], ['LargaSinNumero!', 'número'], ['LargaSinSimbolo1', 'especial']]) {
      fireEvent.change(nueva, { target: { value: clave } })
      expect(document.getElementById('recuperacion-contrasena-error').textContent).toMatch(new RegExp(mensaje))
    }
    fireEvent.change(nueva, { target: { value: 'SeguraClave1!' } })
    fireEvent.change(confirmar, { target: { value: 'Distinta1!' } })
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nueva contraseña' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar confirmación de contraseña' }))
    expect(nueva.type).toBe('text')
    expect(confirmar.type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar nueva contraseña' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar confirmación de contraseña' }))
    expect(nueva.type).toBe('password')
    expect(confirmar.type).toBe('password')
    expect(adapter).not.toHaveBeenCalled()
  })

  it('envía token y contraseña solamente; éxito únicamente tras respuesta confirmada', async () => {
    let resolver
    const adapter = montar('/restablecer-contrasena?token=secreto', vi.fn((config) => new Promise((resolve) => { resolver = () => resolve(respuesta(config)) })))
    fireEvent.change(screen.getByLabelText('NUEVA CONTRASEÑA'), { target: { value: 'SeguraClave1!' } })
    fireEvent.change(screen.getByLabelText('CONFIRMAR CONTRASEÑA'), { target: { value: 'SeguraClave1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))
    expect(screen.queryByText('Contraseña actualizada')).toBeNull()
    await waitFor(() => expect(adapter).toHaveBeenCalledOnce())
    const config = adapter.mock.calls[0][0]
    expect(config.url).toBe('/api/auth/reset-password')
    expect(config.skipAuth).toBe(true)
    expect(config.headers.get('Authorization')).toBeUndefined()
    expect(JSON.parse(config.data)).toEqual({ token: 'secreto', contrasena: 'SeguraClave1!' })
    resolver()
    await screen.findByRole('heading', { name: 'Contraseña actualizada' })
    fireEvent.click(screen.getByRole('link', { name: 'Volver a iniciar sesión' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/login')
  })

  it.each(['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_USED'])('bloquea token rechazado %s', async (code) => {
    montar('/restablecer-contrasena?token=secreto', vi.fn((config) => fallo(config, 400, { code })))
    fireEvent.change(screen.getByLabelText('NUEVA CONTRASEÑA'), { target: { value: 'SeguraClave1!' } })
    fireEvent.change(screen.getByLabelText('CONFIRMAR CONTRASEÑA'), { target: { value: 'SeguraClave1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))
    await screen.findByRole('heading', { name: /este enlace ya no es válido/i })
    expect(screen.queryByLabelText('NUEVA CONTRASEÑA')).toBeNull()
  })

  it('no confunde errores técnicos con tokens vencidos', async () => {
    montar('/restablecer-contrasena?token=secreto', vi.fn((config) => fallo(config, 404, { message: 'Not Found' })))
    fireEvent.change(screen.getByLabelText('NUEVA CONTRASEÑA'), { target: { value: 'SeguraClave1!' } })
    fireEvent.change(screen.getByLabelText('CONFIRMAR CONTRASEÑA'), { target: { value: 'SeguraClave1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))
    await screen.findByRole('alert')
    expect(screen.getByLabelText('NUEVA CONTRASEÑA')).toBeTruthy()
    expect(screen.queryByText('Contraseña actualizada')).toBeNull()
  })

  it('no persiste el token y no deja rastros en la URL ni mensajes', async () => {
    const setLocal = vi.spyOn(Storage.prototype, 'setItem')
    try {
      montar('/restablecer-contrasena?token=super-secreto', vi.fn((config) => fallo(config, 400, { code: 'TOKEN_INVALID' })))
      await waitFor(() => expect(screen.getByTestId('ruta').textContent).not.toContain('super-secreto'))
      fireEvent.change(screen.getByLabelText('NUEVA CONTRASEÑA'), { target: { value: 'SeguraClave1!' } })
      fireEvent.change(screen.getByLabelText('CONFIRMAR CONTRASEÑA'), { target: { value: 'SeguraClave1!' } })
      fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }))
      await waitFor(() => expect(screen.getByRole('heading', { name: /este enlace ya no es válido/i })).toBeTruthy())
      expect(document.body.textContent).not.toContain('super-secreto')
      expect(setLocal).not.toHaveBeenCalled()
    } finally { setLocal.mockRestore() }
  })
})
