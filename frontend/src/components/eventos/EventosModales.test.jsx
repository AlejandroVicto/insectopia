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
    expect(screen.getByRole('status').textContent).toBe(
      'El formulario está disponible para su revisión. El envío de propuestas se habilitará cuando esté integrado el backend de eventos (actividad 070).',
    )

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
    expect(cuerpo.contains(screen.getByLabelText('URL de imagen (opcional)'))).toBe(true)
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

  it('EditarEventoModal fija cabecera y pie y mantiene el aviso 070 dentro del área desplazable', () => {
    render(<EditarEventoModal evento={propuestaEditable()} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Editar propuesta' })
    const cabecera = dialog.querySelector('header')
    const contenido = dialog.querySelector('[data-modal-content]')
    const formulario = contenido?.querySelector('[data-evento-formulario]')
    const cuerpo = formulario?.querySelector('[data-evento-cuerpo]')
    const pie = formulario?.querySelector('[data-evento-pie]')
    const aviso = screen.getByRole('status')

    expect(dialog.style.height).toContain('88dvh')
    expect(dialog.style.maxHeight).toBe(dialog.style.height)
    expect(cabecera.parentElement).toBe(dialog)
    expect(cabecera.className).toContain('shrink-0')
    expect(cuerpo.className).toContain('overflow-y-auto')
    expect(cuerpo.className).toContain('pb-12')
    expect(pie.className).toContain('shrink-0')
    expect(formulario.lastElementChild).toBe(pie)
    expect(cuerpo.contains(aviso)).toBe(true)
    expect(pie.contains(aviso)).toBe(false)
    expect(aviso.textContent).toBe(
      'El formulario está disponible para su revisión. Los cambios podrán guardarse cuando esté integrado el backend de eventos (actividad 070).',
    )
    for (const etiqueta of ['Fecha de finalización *', 'Cupo máximo *', 'URL de imagen (opcional)']) {
      expect(cuerpo.contains(screen.getByLabelText(etiqueta))).toBe(true)
    }
    expect(pie.contains(screen.getByRole('button', { name: 'Cancelar' }))).toBe(true)
    expect(pie.contains(screen.getByRole('button', { name: 'Guardar cambios' }))).toBe(true)
  })

  it('EditarEventoModal coloca el aviso posterior al guardado dentro del scroll sin escribir ni simular éxito', async () => {
    const adapter = vi.fn()
    api.defaults.adapter = adapter
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(<EditarEventoModal evento={propuestaEditable()} onClose={onClose} onSuccess={onSuccess} />)

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    const aviso = await screen.findByText('La edición estará disponible cuando se integre el servicio de eventos.')
    const contenedorAviso = aviso.closest('[data-evento-aviso]')
    const cuerpo = document.querySelector('[data-evento-cuerpo]')
    const pie = document.querySelector('[data-evento-pie]')

    expect(aviso.getAttribute('role')).toBe('status')
    expect(contenedorAviso).toBeTruthy()
    expect(cuerpo.contains(contenedorAviso)).toBe(true)
    expect(pie.contains(contenedorAviso)).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Editar propuesta' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(adapter).not.toHaveBeenCalled()
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

  it('ConfirmarInscripcionModal exige confirmación explícita y muestra la indisponibilidad sin optimismo', async () => {
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(<ConfirmarInscripcionModal evento={evento()} onClose={onClose} onSuccess={onSuccess} />)

    expect(screen.getByRole('status').textContent).toBe('La inscripción se habilitará cuando esté integrado el backend de participación en eventos (actividad 072).')
    const confirmar = screen.getByRole('button', { name: 'Confirmar inscripción' })
    expect(confirmar.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo explícitamente mi participación/ }))
    expect(confirmar.disabled).toBe(false)

    fireEvent.click(confirmar)
    await waitFor(() => expect(
      screen.getAllByRole('status').some((nodo) => /actividad 072/.test(nodo.textContent)),
    ).toBe(true))
    expect(onClose).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('ConfirmarInscripcionModal integra el aviso 072 y el resultado del botón en el área desplazable', async () => {
    const adapter = vi.fn()
    api.defaults.adapter = adapter
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(<ConfirmarInscripcionModal evento={evento()} onClose={onClose} onSuccess={onSuccess} />)
    const cuerpo = document.querySelector('[data-evento-cuerpo]')
    const pie = document.querySelector('[data-evento-pie]')
    const avisoInicial = screen.getByRole('status')

    expect(cuerpo.contains(avisoInicial)).toBe(true)
    expect(pie.contains(avisoInicial)).toBe(false)
    expect(avisoInicial.textContent).toBe(
      'La inscripción se habilitará cuando esté integrado el backend de participación en eventos (actividad 072).',
    )
    expect(pie.contains(screen.getByRole('button', { name: 'Confirmar inscripción' }))).toBe(true)

    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo explícitamente/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar inscripción' }))
    const aviso = await screen.findByText('La inscripción estará disponible cuando se integre el servicio de participación (actividad 072).')
    const contenedorAviso = aviso.closest('[data-evento-aviso]')

    expect(aviso.getAttribute('role')).toBe('status')
    expect(cuerpo.contains(contenedorAviso)).toBe(true)
    expect(pie.contains(contenedorAviso)).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Confirmar inscripción' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(adapter).not.toHaveBeenCalled()
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

  it('CancelarInscripcionModal integra el aviso 072 y el resultado del botón en el área desplazable', async () => {
    const adapter = vi.fn()
    api.defaults.adapter = adapter
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    const inscrito = evento({ inscripcionEstado: 'INSCRITO', inscripcionEtiqueta: 'Inscrito' })
    render(<CancelarInscripcionModal evento={inscrito} onClose={onClose} onSuccess={onSuccess} />)
    const cuerpo = document.querySelector('[data-evento-cuerpo]')
    const pie = document.querySelector('[data-evento-pie]')
    const avisoInicial = screen.getByRole('status')

    expect(cuerpo.contains(avisoInicial)).toBe(true)
    expect(pie.contains(avisoInicial)).toBe(false)
    expect(avisoInicial.textContent).toBe(
      'La cancelación se habilitará cuando esté integrado el backend de participación en eventos (actividad 072).',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }))
    const aviso = await screen.findByText('La cancelación estará disponible cuando se integre el servicio de participación (actividad 072).')
    const contenedorAviso = aviso.closest('[data-evento-aviso]')

    expect(aviso.getAttribute('role')).toBe('status')
    expect(cuerpo.contains(contenedorAviso)).toBe(true)
    expect(pie.contains(contenedorAviso)).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Cancelar inscripción' })).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(adapter).not.toHaveBeenCalled()
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
