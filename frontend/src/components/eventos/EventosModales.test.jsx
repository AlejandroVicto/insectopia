// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProponerEventoModal from './ProponerEventoModal'
import EditarEventoModal from './EditarEventoModal'
import EventoDetallesModal from './EventoDetallesModal'
import ConfirmarInscripcionModal from './ConfirmarInscripcionModal'
import CancelarInscripcionModal from './CancelarInscripcionModal'
import api from '../../services/api'

const adaptadorOriginal = api.defaults.adapter

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  api.defaults.adapter = adaptadorOriginal
})

function evento(overrides = {}) {
  return {
    id: 501,
    titulo: 'Bioblitz nocturno Sierra Sur',
    descripcion: 'Registro nocturno no letal de heteróceros.',
    ubicacion: 'San José del Pacífico, Oaxaca',
    imagenUrl: null,
    fechaInicio: '2027-01-05T09:00:00',
    fechaFin: '2027-01-07T18:00:00',
    fechaInicioTexto: '05 ene 2027',
    fechaFinTexto: '07 ene 2027',
    rangoFechas: '05 ene 2027 – 07 ene 2027',
    horaInicio: '09:00',
    horaFin: '18:00',
    cupoMaximo: 30,
    participantesConfirmados: 10,
    cupoDisponible: true,
    estado: 'APROBADO',
    estadoEtiqueta: 'Aprobado',
    estadoTono: 'aprobado',
    esPasado: false,
    inscripcionEstado: null,
    inscripcionEtiqueta: null,
    esPropio: false,
    motivoResolucion: null,
    ...overrides,
  }
}

function propuestaEditable(overrides = {}) {
  return evento({
    esPropio: true,
    estado: 'PENDIENTE',
    estadoEtiqueta: 'Pendiente de aprobación',
    estadoTono: 'pendiente',
    ...overrides,
  })
}

function completarFormulario() {
  fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Bioblitz de polillas 2027' } })
  fireEvent.change(screen.getByLabelText('Descripción *'), { target: { value: 'Muestreo con sábanas de reflexión y registro fotográfico.' } })
  fireEvent.change(screen.getByLabelText('Ubicación *'), { target: { value: 'Sierra Sur, Oaxaca' } })
  fireEvent.change(screen.getByLabelText('Fecha de inicio *'), { target: { value: '2027-01-05' } })
  fireEvent.change(screen.getByLabelText('Hora de inicio *'), { target: { value: '09:00' } })
  fireEvent.change(screen.getByLabelText('Fecha de finalización *'), { target: { value: '2027-01-07' } })
  fireEvent.change(screen.getByLabelText('Hora de finalización *'), { target: { value: '18:00' } })
  fireEvent.change(screen.getByLabelText('Cupo máximo *'), { target: { value: '30' } })
}

function archivo(nombre = 'macro.png', tipo = 'image/png', size = 3) {
  return new File([new Uint8Array(size)], nombre, { type: tipo })
}

function ArnésDetalle() {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}>Abrir ficha</button>
      {abierto && <EventoDetallesModal evento={evento()} onClose={() => setAbierto(false)} />}
    </>
  )
}

describe('modales de eventos 071', () => {
  it('selecciona y sustituye desde el campo sin botones adicionales; rechaza formatos y tamaños inválidos', () => {
    const crear = vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:primera').mockReturnValueOnce('blob:segunda')
    const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    try {
      render(<ProponerEventoModal onClose={vi.fn()} />)
      const input = screen.getByLabelText('Imagen del evento (opcional)')
      expect(input.type).toBe('file')
      expect(input.accept).toBe('image/jpeg,image/png')
      fireEvent.change(input, { target: { files: [archivo('macro.gif', 'image/gif')] } })
      expect(screen.getByRole('alert').textContent).toContain('JPG o PNG')
      fireEvent.change(input, { target: { files: [archivo('grande.png', 'image/png', 5 * 1024 * 1024 + 1)] } })
      expect(screen.getByRole('alert').textContent).toContain('5 MB')
      fireEvent.change(input, { target: { files: [archivo()] } })
      expect(screen.getByAltText('Vista previa de macro.png').src).toContain('blob:primera')
      fireEvent.change(input, { target: { files: [archivo('otra.jpg', 'image/jpeg')] } })
      expect(screen.getByAltText('Vista previa de otra.jpg').src).toContain('blob:segunda')
      expect(revocar).toHaveBeenCalledWith('blob:primera')
      expect(screen.queryByRole('button', { name: 'Sustituir imagen' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Quitar imagen seleccionada' })).toBeNull()
      expect(crear).toHaveBeenCalledTimes(2)
    } finally {
      crear.mockRestore()
      revocar.mockRestore()
    }
  })

  it('crea una sola vez, conserva el ID y reintenta exclusivamente la imagen tras fallo', async () => {
    const guardar = vi.fn().mockResolvedValue({ data: { idEvento: 501, estado: 'PENDIENTE' } })
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    let fallar = true
    const adapter = vi.fn((config) => {
      if (fallar) return Promise.reject(Object.assign(new Error('red'), { config, response: { status: 503 } }))
      return Promise.resolve({ data: { idEvento: 501, imagen: 'eventos/11111111-1111-1111-1111-111111111111.png' }, config, status: 200 })
    })
    api.defaults.adapter = adapter
    render(<ProponerEventoModal onClose={onClose} onSuccess={onSuccess} onGuardar={guardar} />)
    completarFormulario()
    fireEvent.change(screen.getByLabelText('Imagen del evento (opcional)'), { target: { files: [archivo()] } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar propuesta' }))
    await waitFor(() => expect(adapter).toHaveBeenCalledTimes(1))
    expect(adapter.mock.calls[0][0].data).toBeInstanceOf(FormData)
    expect(adapter.mock.calls[0][0].data.get('imagen').name).toBe('macro.png')
    expect(adapter.mock.calls[0][0].url).toBe('/api/eventos/501/imagen')
    expect(guardar).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar fotografía' })).toBeTruthy())
    expect(onSuccess).toHaveBeenCalledTimes(1)
    fallar = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar fotografía' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(guardar).toHaveBeenCalledTimes(1)
  })

  it('explica cuándo falta la ruta de subida en un backend sin actualizar y conserva la propuesta', async () => {
    const guardar = vi.fn().mockResolvedValue({ data: { idEvento: 502 } })
    api.defaults.adapter = (config) => Promise.reject(Object.assign(new Error('No encontrado'), {
      config, response: { status: 404, data: { message: 'Recurso no encontrado' } },
    }))
    render(<ProponerEventoModal onGuardar={guardar} onClose={vi.fn()} />)
    completarFormulario()
    fireEvent.change(screen.getByLabelText('Imagen del evento (opcional)'), { target: { files: [archivo()] } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar propuesta' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/reinicia el backend/i)
    expect(screen.getByRole('button', { name: 'Reintentar fotografía' })).toBeTruthy()
    expect(guardar).toHaveBeenCalledTimes(1)
  })

  it('edita sin borrar la imagen existente y permite retirarla sin repetir el PATCH', async () => {
    const editar = vi.fn().mockResolvedValue({ data: { idEvento: 501 } })
    const quitar = vi.fn().mockResolvedValue({ status: 204 })
    const onSuccess = vi.fn()
    const { unmount } = render(<EditarEventoModal evento={propuestaEditable({ imagenUrl: '/foto.jpg' })}
      onGuardar={editar} onQuitarImagen={quitar} onSuccess={onSuccess} />)
    fireEvent.click(screen.getByRole('button', { name: 'Quitar fotografía actual' }))
    await waitFor(() => expect(quitar).toHaveBeenCalledWith(501))
    expect(editar).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Quitar fotografía actual' })).toBeNull())
    unmount()
    render(<EditarEventoModal evento={propuestaEditable({ imagenUrl: '/foto.jpg' })}
      onGuardar={editar} onSuccess={onSuccess} />)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(editar).toHaveBeenCalledTimes(1))
    expect(editar.mock.calls[0][0].imagen).toBeNull()
  })

  it('sustituye fotografía al editar y reintenta solo el archivo sin repetir PATCH', async () => {
    const editar = vi.fn().mockResolvedValue({ data: { idEvento: 501 } })
    let intentos = 0
    const adapter = vi.fn((config) => {
      intentos += 1
      if (intentos === 1) return Promise.reject(Object.assign(new Error('red'), { config, response: { status: 503 } }))
      return Promise.resolve({ config, status: 200, data: { idEvento: 501 } })
    })
    api.defaults.adapter = adapter
    const cerrar = vi.fn()
    render(<EditarEventoModal evento={propuestaEditable()} onGuardar={editar} onClose={cerrar} />)
    fireEvent.change(screen.getByLabelText('Imagen del evento (opcional)'), { target: { files: [archivo('nueva.jpg', 'image/jpeg')] } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar fotografía' })).toBeTruthy())
    expect(editar).toHaveBeenCalledTimes(1)
    expect(cerrar).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Título *').disabled).toBe(true)
    expect(screen.getByLabelText('Imagen del evento (opcional)').disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar fotografía' }))
    await waitFor(() => expect(cerrar).toHaveBeenCalledTimes(1))
    expect(editar).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      '/api/eventos/501/imagen', '/api/eventos/501/imagen',
    ])
  })
  it('ProponerEventoModal valida, construye un payload sólo con columnas reales y no inventa éxito', async () => {
    const onClose = vi.fn()
    const onGuardar = vi.fn().mockResolvedValue({})
    const onSuccess = vi.fn()
    render(<ProponerEventoModal onClose={onClose} onGuardar={onGuardar} onSuccess={onSuccess} />)

    const dialog = screen.getByRole('dialog', {
      name: 'Proponer nuevo evento / bioblitz',
      description: 'Registra una iniciativa para revisión del comité taxonómico de Insectopia.',
    })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBe('evt-proponer-titulo')
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement).toBe(screen.getByLabelText('Título *'))
    expect(screen.getByLabelText('Fecha de inicio *').getAttribute('type')).toBe('date')
    expect(screen.getByLabelText('Hora de inicio *').getAttribute('type')).toBe('time')
    expect(screen.queryByText(/actividad 070/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Enviar propuesta' }))
    const errores = (await screen.findAllByRole('alert')).map((nodo) => nodo.textContent)
    expect(errores).toContain('Escribe el título del evento.')
    expect(errores).toContain('Escribe una descripción para el evento.')
    expect(errores).toContain('El cupo máximo debe ser un entero mayor que cero.')
    expect(onGuardar).not.toHaveBeenCalled()

    completarFormulario()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar propuesta' }))
    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1))

    const payload = onGuardar.mock.calls[0][0]
    expect(payload).toEqual({
      titulo: 'Bioblitz de polillas 2027',
      descripcion: 'Muestreo con sábanas de reflexión y registro fotográfico.',
      ubicacion: 'Sierra Sur, Oaxaca',
      imagen: null,
      fechaInicio: '2027-01-05T09:00:00',
      fechaFin: '2027-01-07T18:00:00',
      cupoMaximo: 30,
    })
    expect(JSON.stringify(payload)).not.toMatch(/tipo_evento|categoria|modalidad|taxones|coordenadas|gps|mapa|rol_cientifico|equipo|permiso|etica/i)
    expect(onSuccess).toHaveBeenCalledWith(payload)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('mantiene cabecera y pie visibles con cuerpo desplazable y espacio inferior suficiente', () => {
    render(<ProponerEventoModal onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Proponer nuevo evento / bioblitz' })
    const contenido = dialog.querySelector('[data-modal-content]')
    const formulario = contenido?.querySelector('[data-evento-formulario]')
    const cuerpo = formulario?.querySelector('[data-evento-cuerpo]')
    const pie = formulario?.querySelector('[data-evento-pie]')

    expect(contenido).toBeTruthy()
    expect(contenido.className).toContain('min-h-0')
    expect(contenido.className).toContain('flex-1')
    expect(formulario.parentElement).toBe(contenido)
    expect(formulario.className).toContain('overflow-hidden')
    expect(cuerpo.className).toContain('overflow-y-auto')
    expect(cuerpo.className).toContain('pb-12')
    expect(pie.className).toContain('shrink-0')
    expect(formulario.lastElementChild).toBe(pie)

    expect(cuerpo.contains(screen.getByLabelText('Fecha de finalización *'))).toBe(true)
    expect(cuerpo.contains(screen.getByLabelText('Cupo máximo *'))).toBe(true)
    expect(cuerpo.contains(screen.getByLabelText('Imagen del evento (opcional)'))).toBe(true)
    expect(pie.contains(screen.getByRole('button', { name: 'Cancelar' }))).toBe(true)
    expect(pie.contains(screen.getByRole('button', { name: 'Enviar propuesta' }))).toBe(true)
  })

  it('bloquea doble envío, carga y cierre mientras la propuesta está en curso', async () => {
    let resolver
    const onClose = vi.fn()
    const onGuardar = vi.fn(() => new Promise((resolve) => { resolver = resolve }))
    render(<ProponerEventoModal onClose={onClose} onGuardar={onGuardar} />)
    completarFormulario()

    const enviar = screen.getByRole('button', { name: 'Enviar propuesta' })
    fireEvent.click(enviar)
    fireEvent.click(enviar)
    expect(onGuardar).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Guardando…' }).disabled).toBe(true)
    expect(document.querySelector('form[aria-busy]').getAttribute('aria-busy')).toBe('true')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()

    resolver({})
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('EditarEventoModal precarga la propuesta propia pendiente y no envía moderación', async () => {
    const onClose = vi.fn()
    const onGuardar = vi.fn().mockResolvedValue({})
    render(
      <EditarEventoModal
        evento={evento({ esPropio: true, estado: 'PENDIENTE', estadoEtiqueta: 'Pendiente de aprobación', estadoTono: 'pendiente' })}
        onClose={onClose}
        onGuardar={onGuardar}
      />,
    )

    expect(screen.getByLabelText('Título *').value).toBe('Bioblitz nocturno Sierra Sur')
    expect(screen.getByLabelText('Ubicación *').value).toBe('San José del Pacífico, Oaxaca')
    expect(screen.getByLabelText('Cupo máximo *').value).toBe('30')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1))

    const payload = onGuardar.mock.calls[0][0]
    expect(Object.keys(payload).sort()).toEqual([
      'cupoMaximo', 'descripcion', 'fechaFin', 'fechaInicio', 'imagen', 'titulo', 'ubicacion',
    ])
    expect(payload.fechaInicio).toBe('2027-01-05T09:00:00')
  })

  it('EditarEventoModal fija cabecera y pie sin avisos de backend pendiente', () => {
    render(<EditarEventoModal evento={propuestaEditable()} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Editar propuesta' })
    const cabecera = dialog.querySelector('header')
    const contenido = dialog.querySelector('[data-modal-content]')
    const formulario = contenido?.querySelector('[data-evento-formulario]')
    const cuerpo = formulario?.querySelector('[data-evento-cuerpo]')
    const pie = formulario?.querySelector('[data-evento-pie]')

    expect(dialog.style.height).toContain('88dvh')
    expect(dialog.style.maxHeight).toBe(dialog.style.height)
    expect(cabecera.parentElement).toBe(dialog)
    expect(cabecera.className).toContain('shrink-0')
    expect(cuerpo.className).toContain('overflow-y-auto')
    expect(cuerpo.className).toContain('pb-12')
    expect(pie.className).toContain('shrink-0')
    expect(formulario.lastElementChild).toBe(pie)
    expect(screen.queryByText(/actividad 070/)).toBeNull()
    for (const etiqueta of ['Fecha de finalización *', 'Cupo máximo *', 'Imagen del evento (opcional)']) {
      expect(cuerpo.contains(screen.getByLabelText(etiqueta))).toBe(true)
    }
    expect(pie.contains(screen.getByRole('button', { name: 'Cancelar' }))).toBe(true)
    expect(pie.contains(screen.getByRole('button', { name: 'Guardar cambios' }))).toBe(true)
  })

  it('EditarEventoModal coloca el error HTTP dentro del scroll sin simular éxito', async () => {
    const adapter = vi.fn((config) => Promise.reject(Object.assign(new Error('Error HTTP'), {
      config, response: { status: 409, data: { message: 'Propuesta ya resuelta' } },
    })))
    api.defaults.adapter = adapter
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(<EditarEventoModal evento={propuestaEditable()} onClose={onClose} onSuccess={onSuccess} />)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    const aviso = await screen.findByText('Propuesta ya resuelta')
    const contenedorAviso = aviso.closest('[data-evento-aviso]')
    const cuerpo = document.querySelector('[data-evento-cuerpo]')
    const pie = document.querySelector('[data-evento-pie]')

    expect(aviso.getAttribute('role')).toBe('alert')
    expect(contenedorAviso).toBeTruthy()
    expect(cuerpo.contains(contenedorAviso)).toBe(true)
    expect(pie.contains(contenedorAviso)).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Editar propuesta' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0][0].url).toBe('/api/eventos/501')
  })

  it('EditarEventoModal bloquea la edición de propuestas ajenas o resueltas', () => {
    cleanup()
    render(<EditarEventoModal evento={evento()} onClose={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toMatch(/Sólo puedes editar tus propias propuestas/)
    expect(screen.queryByLabelText('Título *')).toBeNull()

    cleanup()
    render(<EditarEventoModal evento={evento({ esPropio: true, estado: 'RECHAZADO' })} onClose={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toMatch(/Sólo se pueden editar propuestas pendientes/)
  })

  it('EventoDetallesModal muestra el motivo real sólo en propuestas propias rechazadas', () => {
    render(
      <EventoDetallesModal
        evento={evento({ esPropio: true, estado: 'RECHAZADO', motivoResolucion: 'Falta el permiso vigente' })}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole('region', { name: 'Motivo del rechazo' })).toBeTruthy()
    expect(screen.getByText('Falta el permiso vigente')).toBeTruthy()
    expect(screen.queryByText(/Coordenadas GPS|mapa de monitoreo|equipo técnico|etiquetas taxonómicas/i)).toBeNull()
  })

  it('EventoDetallesModal oculta el motivo de propuestas ajenas aunque el DTO lo traiga', () => {
    render(
      <EventoDetallesModal
        evento={evento({ estado: 'RECHAZADO', motivoResolucion: 'Motivo privado del proponente' })}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByRole('region', { name: 'Motivo del rechazo' })).toBeNull()
    expect(screen.queryByText('Motivo privado del proponente')).toBeNull()
  })

  it('ConfirmarInscripcionModal exige confirmación y sólo actualiza al recibir respuesta', async () => {
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    let resolver
    const onConfirmar = vi.fn(() => new Promise((resolve) => { resolver = resolve }))
    render(<ConfirmarInscripcionModal evento={evento()} onClose={onClose} onSuccess={onSuccess} onConfirmar={onConfirmar} />)

    expect(screen.queryByText(/actividad 072/)).toBeNull()
    const confirmar = screen.getByRole('button', { name: 'Confirmar inscripción' })
    expect(confirmar.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo explícitamente mi participación/ }))
    expect(confirmar.disabled).toBe(false)

    fireEvent.click(confirmar)
    expect(onConfirmar).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    resolver({})
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })

  it('ConfirmarInscripcionModal muestra errores HTTP dentro del área desplazable', async () => {
    const adapter = vi.fn((config) => Promise.reject(Object.assign(new Error('Error HTTP'), {
      config, response: { status: 409, data: { message: 'Sin cupo disponible' } },
    })))
    api.defaults.adapter = adapter
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(<ConfirmarInscripcionModal evento={evento()} onClose={onClose} onSuccess={onSuccess} />)
    const cuerpo = document.querySelector('[data-evento-cuerpo]')
    const pie = document.querySelector('[data-evento-pie]')
    expect(screen.queryByText(/actividad 072/)).toBeNull()
    expect(pie.contains(screen.getByRole('button', { name: 'Confirmar inscripción' }))).toBe(true)

    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo explícitamente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscripción' }))
    const aviso = await screen.findByText('Sin cupo disponible')
    const contenedorAviso = aviso.closest('[data-evento-aviso]')

    expect(aviso.getAttribute('role')).toBe('alert')
    expect(cuerpo.contains(contenedorAviso)).toBe(true)
    expect(pie.contains(contenedorAviso)).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Confirmar inscripción' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0][0].url).toBe('/api/eventos/501/participantes/me')
  })

  it('muestra errores reales del servicio con role alert y sin cerrar el diálogo', async () => {
    const onClose = vi.fn()
    const errorBackend = Object.assign(new Error('Conflicto'), {
      response: { status: 409, data: { message: 'Cupo modificado por otro participante' } },
    })
    const onConfirmar = vi.fn().mockRejectedValue(errorBackend)
    render(
      <ConfirmarInscripcionModal evento={evento()} onClose={onClose} onConfirmar={onConfirmar} />,
    )
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo explícitamente mi participación/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscripción' }))
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toMatch(/Cupo modificado/)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ConfirmarInscripcionModal confirma sólo después de la respuesta del servicio', async () => {
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    const onConfirmar = vi.fn().mockResolvedValue({})
    render(
      <ConfirmarInscripcionModal
        evento={evento()}
        onClose={onClose}
        onSuccess={onSuccess}
        onConfirmar={onConfirmar}
      />,
    )
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo explícitamente mi participación/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscripción' }))
    await waitFor(() => expect(onConfirmar).toHaveBeenCalledWith(501))
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 501 }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ConfirmarInscripcionModal bloquea eventos sin cupo confirmado', () => {
    render(
      <ConfirmarInscripcionModal
        evento={evento({ cupoDisponible: null })}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
      />,
    )
    expect(screen.getByText(/todavía no confirmó el cupo disponible/)).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: /Confirmo explícitamente/ }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Confirmar inscripción' }).disabled).toBe(true)
  })

  it('CancelarInscripcionModal bloquea la cancelación sin inscripción activa', () => {
    render(<CancelarInscripcionModal evento={evento()} onClose={vi.fn()} onConfirmar={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toMatch(/No tienes una inscripción activa/)
    expect(screen.getByRole('button', { name: 'Confirmar cancelación' }).disabled).toBe(true)
  })

  it('CancelarInscripcionModal confirma sólo con inscripción activa y sin decrementos locales', async () => {
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    const onConfirmar = vi.fn().mockResolvedValue({})
    const inscrito = evento({ inscripcionEstado: 'INSCRITO', inscripcionEtiqueta: 'Inscrito' })
    render(
      <CancelarInscripcionModal
        evento={inscrito}
        onClose={onClose}
        onSuccess={onSuccess}
        onConfirmar={onConfirmar}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }))
    await waitFor(() => expect(onConfirmar).toHaveBeenCalledWith(501))
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(inscrito.cupoMaximo).toBe(30)
    expect(inscrito.participantesConfirmados).toBe(10)
  })

  it('CancelarInscripcionModal muestra errores HTTP dentro del área desplazable', async () => {
    const adapter = vi.fn((config) => Promise.reject(Object.assign(new Error('Error HTTP'), {
      config, response: { status: 409, data: { message: 'Inscripción ya cancelada' } },
    })))
    api.defaults.adapter = adapter
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    const inscrito = evento({ inscripcionEstado: 'INSCRITO', inscripcionEtiqueta: 'Inscrito' })
    render(<CancelarInscripcionModal evento={inscrito} onClose={onClose} onSuccess={onSuccess} />)
    const cuerpo = document.querySelector('[data-evento-cuerpo]')
    const pie = document.querySelector('[data-evento-pie]')
    expect(screen.queryByText(/actividad 072/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }))
    const aviso = await screen.findByText('Inscripción ya cancelada')
    const contenedorAviso = aviso.closest('[data-evento-aviso]')

    expect(aviso.getAttribute('role')).toBe('alert')
    expect(cuerpo.contains(contenedorAviso)).toBe(true)
    expect(pie.contains(contenedorAviso)).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Cancelar inscripción' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0][0].method).toBe('delete')
    expect(inscrito.cupoMaximo).toBe(30)
    expect(inscrito.participantesConfirmados).toBe(10)
  })

  it('atrampa el foco, cierra con Escape y restaura el elemento de apertura', () => {
    render(<ArnésDetalle />)
    const apertura = screen.getByRole('button', { name: 'Abrir ficha' })
    apertura.focus()
    fireEvent.click(apertura)

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar', exact: true }))
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar diálogo' }))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(apertura)
    expect(document.body.style.overflow).toBe('')
  })

  it.each([
    ['ProponerEventoModal', ProponerEventoModal, {}],
    ['EditarEventoModal', EditarEventoModal, { evento: evento() }],
    ['EventoDetallesModal', EventoDetallesModal, { evento: evento() }],
    ['ConfirmarInscripcionModal', ConfirmarInscripcionModal, { evento: evento() }],
    ['CancelarInscripcionModal', CancelarInscripcionModal, { evento: evento() }],
  ])('%s no renderiza nada cuando open es false', (_nombre, Modal, props) => {
    const { container } = render(<Modal open={false} {...props} />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
