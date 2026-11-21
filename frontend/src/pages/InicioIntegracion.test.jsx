// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { AuthProvider } from '../auth/AuthProvider'
import { useAuth } from '../auth/useAuth'
import { ROUTE_ROLES } from '../auth/roles'
import ProtectedRoute from '../auth/ProtectedRoute'
import PrivateLayout from '../layout/PrivateLayout'
import Inicio from './Inicio'

const originalAdapter = api.defaults.adapter
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter })

const publicacion = (id = 15) => ({
  id,
  autor: { id: 7, nombre: 'María', nombreUsuario: 'maria', avatarUrl: null },
  contenido: 'Avistamiento de prueba con texto suficiente',
  imagenUrl: null,
  fechaPublicacion: '2026-11-20T08:00:00',
  estado: 'VISIBLE',
  totalComentarios: 2,
  totalReacciones: 5,
})
const pagina = (content) => ({ content, number: 0, size: 10, totalPages: 1, totalElements: content.length, first: true, last: true })
const ok = (config, data) => Promise.resolve({ status: 200, data, config, headers: {} })
const fallo = (config, status, data) => Promise.reject(Object.assign(new Error('Fallo de prueba'), {
  config, response: { status, data, config },
}))

function LoginControl() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  return <button onClick={() => {
    setSession({ token: 'jwt-de-prueba', user: { id: 7, role: 'USUARIO', name: 'Usuaria Real', email: 'usuaria@ejemplo.test' } })
    navigate('/app')
  }}>Preparar sesión</button>
}

function renderInicio(adapter) {
  api.defaults.adapter = adapter
  render(<MemoryRouter initialEntries={['/login']}><AuthProvider>
    <LoginControl />
    <Routes>
      <Route path="/login" element={<p>Pantalla de login</p>} />
      <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.generales} />}>
        <Route element={<PrivateLayout />}>
          <Route path="/app" element={<Inicio demo={false} />} />
        </Route>
      </Route>
    </Routes>
  </AuthProvider></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Preparar sesión' }))
  return adapter
}

describe('integración Inicio (059) con modales (061) y API (060)', () => {
  it('abre Crear desde el composer y recarga el feed solo después del 201', async () => {
    const adapter = vi.fn((config) => config.method === 'post' && config.url === '/api/publicaciones'
      ? ok(config, { ...publicacion(99), contenido: 'Nuevo hallazgo registrado' })
      : ok(config, pagina([publicacion()])))
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar observación' })
    fireEvent.change(within(dialogo).getByLabelText('Notas de campo y morfología'), { target: { value: 'Nuevo hallazgo registrado' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Publicar hallazgo' }))

    await waitFor(() => expect(adapter.mock.calls.some(([config]) => config.method === 'post' && config.url === '/api/publicaciones')).toBe(true))
    const creacion = adapter.mock.calls.find(([config]) => config.method === 'post' && config.url === '/api/publicaciones')
    expect(JSON.parse(creacion[0].data)).toEqual({ contenido: 'Nuevo hallazgo registrado' })
    expect(creacion[0].headers.get('Authorization')).toBe('Bearer jwt-de-prueba')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(adapter.mock.calls.filter(([config]) => config.method === 'get').length).toBeGreaterThanOrEqual(2)
  })

  it('abre un único modal desde el texto y desde el acceso de imagen del composer, sin avisos técnicos', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([publicacion()])))
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())
    expect(screen.queryByText(/actividad 060|actividad 062/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Comparte un nuevo avistamiento/ }))
    expect(screen.getByRole('dialog', { name: 'Registrar observación' })).toBeTruthy()
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    fireEvent.click(screen.getByRole('button', { name: /Macro HD/ }))
    expect(screen.getByRole('dialog', { name: 'Registrar observación' })).toBeTruthy()
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
  })

  it('abre Crear desde el botón superior y recarga el feed solo tras el 201', async () => {
    const adapter = vi.fn((config) => config.method === 'post' && config.url === '/api/publicaciones'
      ? ok(config, { ...publicacion(99), contenido: 'Hallazgo desde el botón superior' })
      : ok(config, pagina([publicacion()])))
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: '+ Crear publicación' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar observación' })
    fireEvent.change(within(dialogo).getByLabelText('Notas de campo y morfología'), {
      target: { value: 'Hallazgo desde el botón superior' },
    })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Publicar hallazgo' }))

    await waitFor(() => expect(adapter.mock.calls.some(([config]) => config.method === 'post' && config.url === '/api/publicaciones')).toBe(true))
    const creacion = adapter.mock.calls.find(([config]) => config.method === 'post' && config.url === '/api/publicaciones')
    expect(JSON.parse(creacion[0].data)).toEqual({ contenido: 'Hallazgo desde el botón superior' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(adapter.mock.calls.filter(([config]) => config.method === 'get').length).toBeGreaterThanOrEqual(2)
  })

  it('bloquea el envío con foto desde el botón superior sin contactar a la API', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([publicacion()])))
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: '+ Crear publicación' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar observación' })
    fireEvent.change(within(dialogo).getByLabelText('Notas de campo y morfología'), {
      target: { value: 'Observación con foto pendiente de carga' },
    })
    const archivo = new File([new Uint8Array([1, 2, 3])], 'macro.jpg', { type: 'image/jpeg' })
    fireEvent.change(within(dialogo).getByLabelText(/Captura macro/), { target: { files: [archivo] } })

    const publicar = within(dialogo).getByRole('button', { name: 'Publicar hallazgo' })
    expect(publicar.disabled).toBe(true)
    fireEvent.click(publicar)
    expect(adapter.mock.calls.some(([config]) => config.method === 'post')).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Registrar observación' })).toBeTruthy()
  })

  it('reacciona y quita la reacción con POST/DELETE y actualiza el contador sin recargar el feed', async () => {
    const adapter = vi.fn((config) => {
      if (config.url === '/api/publicaciones/15/reaccion') {
        return config.method === 'post'
          ? ok(config, { publicacionId: 15, reaccionada: true, tipo: 'ME_GUSTA', total: 6 })
          : ok(config, { publicacionId: 15, reaccionada: false, tipo: null, total: 5 })
      }
      return ok(config, pagina([publicacion()]))
    })
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Me gusta: 5' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Me gusta: 6' }).getAttribute('aria-pressed')).toBe('true'))
    expect(adapter.mock.calls.some(([config]) => config.method === 'post' && config.url === '/api/publicaciones/15/reaccion')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Me gusta: 6' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Me gusta: 5' }).getAttribute('aria-pressed')).toBe('false'))
    expect(adapter.mock.calls.some(([config]) => config.method === 'delete' && config.url === '/api/publicaciones/15/reaccion')).toBe(true)
    expect(adapter.mock.calls.filter(([config]) => config.method === 'get').length).toBe(1)
  })

  it('abre comentarios, muestra los del backend y publica uno con JWT', async () => {
    const existente = {
      id: 31, publicacionId: 15,
      autor: { id: 7, nombre: 'María', nombreUsuario: 'maria', avatarUrl: null },
      contenido: 'Comentario existente de prueba', fechaComentario: '2026-11-20T09:00:00',
    }
    const adapter = vi.fn((config) => {
      if (config.url === '/api/publicaciones/15/comentarios') {
        return config.method === 'get'
          ? ok(config, pagina([existente]))
          : ok(config, { ...existente, id: 32, contenido: 'Comentario nuevo de prueba' })
      }
      return ok(config, pagina([publicacion()]))
    })
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Comentar: 2' }))
    const panel = await screen.findByRole('region', { name: 'Comentarios de la publicación 15' })
    expect(within(panel).getByText('Comentario existente de prueba')).toBeTruthy()
    fireEvent.change(within(panel).getByLabelText('Escribe tu comentario'), { target: { value: 'Comentario nuevo de prueba' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Enviar comentario' }))

    await waitFor(() => expect(within(panel).getByText('Comentario nuevo de prueba')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Comentar: 3' })).toBeTruthy()
    const creacion = adapter.mock.calls.find(([config]) => config.method === 'post' && config.url === '/api/publicaciones/15/comentarios')
    expect(JSON.parse(creacion[0].data)).toEqual({ contenido: 'Comentario nuevo de prueba' })
    expect(creacion[0].headers.get('Authorization')).toBe('Bearer jwt-de-prueba')
  })

  it('abre Editar, muestra el error real del backend y no simula éxito (dependencia 062)', async () => {
    const adapter = vi.fn((config) => config.method === 'put'
      ? fallo(config, 405, { message: 'Método no permitido' })
      : ok(config, pagina([publicacion()])))
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones para publicación 15' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar publicación' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar publicación' })
    expect(within(dialogo).getByText(/La edición aún no está disponible en el backend/)).toBeTruthy()

    fireEvent.change(within(dialogo).getByLabelText('Notas de campo y morfología'), { target: { value: 'Texto editado de prueba' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(within(dialogo).getByText('Método no permitido')).toBeTruthy())
    expect(screen.getByRole('dialog', { name: 'Editar publicación' })).toBeTruthy()
    expect(adapter.mock.calls.filter(([config]) => config.method === 'get').length).toBe(1)
  })
})
