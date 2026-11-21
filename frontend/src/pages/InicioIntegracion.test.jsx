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

vi.mock('../services/notificacionesService', async (original) => ({
  ...await original(), contarNoLeidas: () => Promise.resolve({ data: { count: 0 } }),
}))

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
  it('publica texto directamente desde el composer y recarga el feed tras el 201', async () => {
    const adapter = vi.fn((config) => config.method === 'post' && config.url === '/api/publicaciones'
      ? ok(config, { ...publicacion(99), contenido: 'Nuevo hallazgo registrado' })
      : ok(config, pagina([publicacion()])))
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())

    const composer = screen.getByRole('region', { name: 'Nueva publicación' })
    fireEvent.change(within(composer).getByLabelText('Notas de campo y morfología'), { target: { value: 'Nuevo hallazgo registrado' } })
    fireEvent.click(within(composer).getByRole('button', { name: 'Publicar' }))

    await waitFor(() => expect(adapter.mock.calls.some(([config]) => config.method === 'post' && config.url === '/api/publicaciones')).toBe(true))
    const creacion = adapter.mock.calls.find(([config]) => config.method === 'post' && config.url === '/api/publicaciones')
    expect(JSON.parse(creacion[0].data)).toEqual({ contenido: 'Nuevo hallazgo registrado' })
    expect(creacion[0].headers.get('Authorization')).toBe('Bearer jwt-de-prueba')
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(within(composer).getByLabelText('Notas de campo y morfología').value).toBe(''))
    expect(adapter.mock.calls.filter(([config]) => config.method === 'get').length).toBeGreaterThanOrEqual(2)
  })

  it('muestra textarea y selector de imagen en Inicio sin abrir un modal', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([publicacion()])))
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())
    expect(screen.queryByText(/actividad 060|actividad 062/)).toBeNull()

    const composer = screen.getByRole('region', { name: 'Nueva publicación' })
    expect(within(composer).getByPlaceholderText('Comparte un nuevo avistamiento…')).toBeTruthy()
    expect(within(composer).getByLabelText(/Agregar imagen/).type).toBe('file')
    expect(within(composer).queryByText(/Macro HD|Ubicación/)).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
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

  it('crea desde Inicio y sube la foto con JWT al ID creado sin abrir el modal', async () => {
    const adapter = vi.fn((config) => {
      if (config.method === 'post' && config.url === '/api/publicaciones') return ok(config, publicacion(99))
      if (config.method === 'post' && config.url === '/api/publicaciones/99/imagen') {
        return ok(config, { ...publicacion(99), imagenUrl: '/api/publicaciones/99/imagen' })
      }
      return ok(config, pagina([publicacion()]))
    })
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())

    const composer = screen.getByRole('region', { name: 'Nueva publicación' })
    fireEvent.change(within(composer).getByLabelText('Notas de campo y morfología'), {
      target: { value: 'Observación con foto pendiente de carga' },
    })
    const archivo = new File([new Uint8Array([1, 2, 3])], 'macro.jpg', { type: 'image/jpeg' })
    fireEvent.change(within(composer).getByLabelText(/Agregar imagen/), { target: { files: [archivo] } })

    const publicar = within(composer).getByRole('button', { name: 'Publicar' })
    expect(publicar.disabled).toBe(false)
    fireEvent.click(publicar)
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(within(composer).getByLabelText('Notas de campo y morfología').value).toBe(''))
    const posts = adapter.mock.calls.filter(([config]) => config.method === 'post').map(([config]) => config)
    expect(posts.map((config) => config.url)).toEqual(['/api/publicaciones', '/api/publicaciones/99/imagen'])
    expect(posts[1].data.get('imagen').name).toBe('macro.jpg')
    expect(posts[1].headers.get('Authorization')).toBe('Bearer jwt-de-prueba')
  })

  it('si falla la foto del composer reintenta con el mismo ID sin duplicar el texto', async () => {
    let fallaImagen = true
    const adapter = vi.fn((config) => {
      if (config.method === 'post' && config.url === '/api/publicaciones') return ok(config, publicacion(99))
      if (config.method === 'post' && config.url === '/api/publicaciones/99/imagen') {
        return fallaImagen ? fallo(config, 500, { message: 'No se pudo guardar la fotografía' })
          : ok(config, { ...publicacion(99), imagenUrl: '/api/publicaciones/99/imagen' })
      }
      return ok(config, pagina([publicacion()]))
    })
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())
    const composer = screen.getByRole('region', { name: 'Nueva publicación' })
    fireEvent.change(within(composer).getByLabelText('Notas de campo y morfología'), {
      target: { value: 'Hallazgo con fotografía de prueba' },
    })
    fireEvent.change(within(composer).getByLabelText(/Agregar imagen/), {
      target: { files: [new File(['foto'], 'macro.png', { type: 'image/png' })] },
    })
    fireEvent.click(within(composer).getByRole('button', { name: 'Publicar' }))
    await waitFor(() => expect(within(composer).getByRole('button', { name: 'Reintentar fotografía' })).toBeTruthy())
    expect(within(composer).getByRole('alert').textContent).toContain('No se pudo guardar la fotografía')
    expect(within(composer).getByLabelText('Notas de campo y morfología').disabled).toBe(true)
    fallaImagen = false
    fireEvent.click(within(composer).getByRole('button', { name: 'Reintentar fotografía' }))
    await waitFor(() => expect(within(composer).getByLabelText('Notas de campo y morfología').value).toBe(''))
    const posts = adapter.mock.calls.filter(([config]) => config.method === 'post').map(([config]) => config.url)
    expect(posts).toEqual(['/api/publicaciones', '/api/publicaciones/99/imagen', '/api/publicaciones/99/imagen'])
  })

  it('valida texto e imagen antes de publicar desde Inicio', async () => {
    const adapter = vi.fn((config) => ok(config, pagina([publicacion()])))
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())
    const composer = screen.getByRole('region', { name: 'Nueva publicación' })
    fireEvent.click(within(composer).getByRole('button', { name: 'Publicar' }))
    expect(within(composer).getByRole('alert').textContent).toContain('entre 10 y 2000 caracteres')
    fireEvent.change(within(composer).getByLabelText(/Agregar imagen/), {
      target: { files: [new File(['no es foto'], 'foto.svg', { type: 'image/svg+xml' })] },
    })
    expect(within(composer).getByRole('alert').textContent).toContain('JPG o PNG')
    expect(adapter.mock.calls.some(([config]) => config.method === 'post')).toBe(false)
  })

  it('bloquea envíos repetidos desde Inicio mientras se crea la publicación', async () => {
    let confirmar
    const adapter = vi.fn((config) => config.method === 'post'
      ? new Promise((resolve) => { confirmar = () => resolve({ status: 201, data: publicacion(99), config, headers: {} }) })
      : ok(config, pagina([publicacion()])))
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())
    const composer = screen.getByRole('region', { name: 'Nueva publicación' })
    fireEvent.change(within(composer).getByLabelText('Notas de campo y morfología'), {
      target: { value: 'Nueva observación entomológica' },
    })
    const boton = within(composer).getByRole('button', { name: 'Publicar' })
    fireEvent.click(boton)
    fireEvent.click(boton)
    await waitFor(() => expect(adapter.mock.calls.filter(([config]) => config.method === 'post')).toHaveLength(1))
    expect(boton.disabled).toBe(true)
    confirmar()
    await waitFor(() => expect(within(composer).getByLabelText('Notas de campo y morfología').value).toBe(''))
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

  it('abre Editar, muestra el error real del backend y no simula éxito', async () => {
    const adapter = vi.fn((config) => config.method === 'put'
      ? fallo(config, 405, { message: 'Método no permitido' })
      : ok(config, pagina([publicacion()])))
    renderInicio(adapter)
    await waitFor(() => expect(screen.getByRole('article', { name: 'Publicación 15' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones para publicación 15' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar publicación' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar publicación' })
    expect(within(dialogo).getByText(/Solo el autor o un administrador autorizado/)).toBeTruthy()

    fireEvent.change(within(dialogo).getByLabelText('Notas de campo y morfología'), { target: { value: 'Texto editado de prueba' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(within(dialogo).getByText('Método no permitido')).toBeTruthy())
    expect(screen.getByRole('dialog', { name: 'Editar publicación' })).toBeTruthy()
    expect(adapter.mock.calls.filter(([config]) => config.method === 'get').length).toBe(1)
  })
})
