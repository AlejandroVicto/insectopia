// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotificacionCard from './NotificacionCard'
import { fechaNotificacion } from './fechaNotificacion'

afterEach(cleanup)

const base = {
  id: 9, tipo: 'COMENTARIO', contenido: 'Alguien comentó tu publicación',
  actor: { id: 2, nombre: 'Ana', nombreUsuario: 'ana' },
  fechaCreacion: '2026-11-20T09:00:00', leida: false,
  recurso: { tipo: 'PUBLICACION', id: 24, disponible: true, apiUrl: '/api/publicaciones/24' },
}

describe('fila reutilizable de notificación', () => {
  it('muestra tipo, contenido, fecha, estado textual, enlace React y acciones independientes', () => {
    const read = vi.fn(); const remove = vi.fn()
    render(<MemoryRouter><NotificacionCard notificacion={base} onRead={read} onDelete={remove} /></MemoryRouter>)
    const row = screen.getByRole('article', { name: 'Notificación 9' })
    expect(within(row).getByRole('heading', { name: '@ana comentó tu publicación' })).toBeTruthy()
    expect(within(row).getByText(base.contenido)).toBeTruthy()
    expect(within(row).getByText('No leída')).toBeTruthy()
    expect(within(row).getByText(/Hace |nov/)).toBeTruthy()
    expect(within(row).getByRole('link', { name: 'Ver publicación' }).getAttribute('href')).toBe('/app/publicaciones/24')
    expect(within(row).getByRole('link', { name: 'Ver publicación' }).getAttribute('href')).not.toContain('/api/')
    expect(within(row).queryByText('Contenido no disponible')).toBeNull()
    fireEvent.click(within(row).getByRole('button', { name: 'Marcar leída' }))
    fireEvent.click(within(row).getByRole('button', { name: 'Eliminar notificación 9' }))
    expect(read).toHaveBeenCalledWith(9)
    expect(remove).toHaveBeenCalledWith(9)
  })

  it('distingue leída, recurso no disponible y conserva su lectura', () => {
    const read = vi.fn()
    const { rerender } = render(<MemoryRouter><NotificacionCard notificacion={{ ...base, leida: true }} onRead={read} onDelete={() => {}} /></MemoryRouter>)
    expect(screen.getByText('Leída')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Marcar leída' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Ver publicación' })).toBeTruthy()
    rerender(<MemoryRouter><NotificacionCard notificacion={{ ...base, recurso: { tipo: 'PUBLICACION', id: null, disponible: false, apiUrl: null } }} onRead={read} onDelete={() => {}} /></MemoryRouter>)
    expect(screen.getByText('Contenido no disponible')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Marcar leída' }))
    expect(read).toHaveBeenCalledWith(9)
  })

  it('bloquea envío mientras procesa y presenta error sin simular lectura', () => {
    render(<MemoryRouter><NotificacionCard notificacion={base} pending error="No se pudo marcar" onRead={() => {}} onDelete={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Marcando…' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Eliminar notificación 9' }).disabled).toBe(true)
    expect(screen.getByRole('alert').textContent).toContain('No se pudo marcar')
    expect(screen.getByText('No leída')).toBeTruthy()
  })

  it('resuelve reportes y tipos desconocidos sin inventar enlaces ni identidad', () => {
    const { rerender } = render(<MemoryRouter><NotificacionCard notificacion={{ ...base, tipo: 'REPORTE_RECHAZADO', actor: null,
      contenido: 'Tu reporte fue rechazado', recurso: { tipo: 'REPORTE', id: 8, disponible: false, apiUrl: null } }} onRead={() => {}} onDelete={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Tu reporte fue rechazado' })).toBeTruthy()
    rerender(<MemoryRouter><NotificacionCard notificacion={{ ...base, tipo: 'FUTURO', actor: null, recurso: null }} onRead={() => {}} onDelete={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Nueva actividad' })).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
    expect(fechaNotificacion('no válido')).toBe('Fecha no disponible')
    expect(fechaNotificacion('2026-11-20T09:00:00', new Date('2026-11-20T09:12:00').getTime())).toBe('Hace 12 min')
  })

  it('enlaza una reacción por su ID y rechaza ID, tipo o URL de API no verificables', () => {
    const { rerender } = render(<MemoryRouter><NotificacionCard notificacion={{ ...base, tipo: 'REACCION', recurso: { ...base.recurso, id: 48, apiUrl: '/api/publicaciones/48' } }} onRead={() => {}} onDelete={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Ver publicación' }).getAttribute('href')).toBe('/app/publicaciones/48')
    for (const recurso of [
      { ...base.recurso, id: '48' },
      { ...base.recurso, id: 48, apiUrl: 'https://otro-sitio.test/api/publicaciones/48' },
      { ...base.recurso, tipo: 'MENSAJE' },
      { ...base.recurso, disponible: false },
    ]) {
      rerender(<MemoryRouter><NotificacionCard notificacion={{ ...base, recurso }} onRead={() => {}} onDelete={() => {}} /></MemoryRouter>)
      expect(screen.queryByRole('link')).toBeNull()
    }
    rerender(<MemoryRouter><NotificacionCard notificacion={{ ...base, tipo: 'NUEVO_MENSAJE', recurso: { tipo: 'MENSAJE', id: 48, disponible: true, apiUrl: null } }} onRead={() => {}} onDelete={() => {}} /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Ir a conversación' })).toBeNull()
  })

  it('un mensaje real usa el ID de conversación y no el de mensaje', () => {
    const open = vi.fn()
    render(<MemoryRouter><NotificacionCard notificacion={{ ...base, tipo: 'MENSAJE', contenido: 'Te envió un mensaje privado',
      recurso: { tipo: 'MENSAJE', id: 80, conversacionId: 5, disponible: true, apiUrl: '/api/conversaciones/5' } }}
      onRead={() => {}} onDelete={() => {}} onNavigate={open} /></MemoryRouter>)
    const row = screen.getByRole('article', { name: 'Notificación 9' })
    expect(within(row).getByRole('heading', { name: '@ana te envió un mensaje privado' })).toBeTruthy()
    const link = within(row).getByRole('link', { name: 'Ir a conversación' })
    expect(link.getAttribute('href')).toBe('/app/mensajes?conversacion=5')
    fireEvent.click(link)
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), '/app/mensajes?conversacion=5')
    fireEvent.click(within(row).getByRole('heading'))
    expect(open).toHaveBeenCalledTimes(2)
    expect(row.textContent).not.toContain('Secreto')
  })
})
