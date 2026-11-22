import { adaptarPaginaEventos } from '../adapters/eventosAdapter'

// Fixtures editoriales explícitos. Sólo se usan con VITE_EVENTOS_MOCK=true.
// No se envían al backend, no se mezclan con MySQL y jamás registran escrituras.
// Las forma de los objetos sigue el DTO propuesto, con campos que existen en Evento.java.
export const eventosDemo = [
  {
    idEvento: 9001,
    titulo: 'Bioblitz nocturno Sierra Sur: polillas Sphingidae',
    descripcion: 'Registro nocturno no letal de heteróceros con sábanas de reflexión y fotografía taxonómica comunitaria.',
    ubicacion: 'San José del Pacífico, Oaxaca',
    imagen: null,
    fechaInicio: '2026-12-05T19:30:00',
    fechaFin: '2026-12-07T03:00:00',
    cupoMaximo: 30,
    participantesConfirmados: 24,
    estado: 'APROBADO',
    proponentePublico: { nombre: 'Dra. Claudia Montes', nombreUsuario: 'Dra_Montes' },
  },
  {
    idEvento: 9002,
    titulo: 'Simposio Internacional de Coleópteros Neotropicales',
    descripcion: 'Ponencias sobre filogenia y morfometría de Buprestidae, Cerambycidae y Scarabaeidae.',
    ubicacion: 'Auditorio Ciencias',
    imagen: null,
    fechaInicio: '2027-02-18T09:00:00',
    fechaFin: '2027-02-20T18:00:00',
    cupoMaximo: 200,
    participantesConfirmados: 142,
    estado: 'APROBADO',
    proponentePublico: 'Comité de Taxonomía',
  },
  {
    idEvento: 9003,
    titulo: 'Muestreo guiado de himenópteros polinizadores urbanos',
    descripcion: 'Identificación en campo de abejas nativas, bombus y avispas parasitoides del jardín botánico.',
    ubicacion: 'Jardín Botánico Central',
    imagen: null,
    fechaInicio: '2026-12-28T08:00:00',
    fechaFin: '2026-12-28T13:00:00',
    cupoMaximo: 20,
    participantesConfirmados: 20,
    estado: 'APROBADO',
    estadoInscripcion: 'INSCRITO',
    proponentePublico: null,
  },
  {
    idEvento: 9004,
    titulo: 'Propuesta: monitoreo de libélulas en el humedal La Pradera',
    descripcion: 'Muestreo mensual de odonatos para completar el inventario local de la reserva comunitaria.',
    ubicacion: 'Humedal La Pradera',
    imagen: null,
    fechaInicio: '2027-03-12T09:00:00',
    fechaFin: '2027-03-12T14:00:00',
    cupoMaximo: 15,
    participantesConfirmados: null,
    estado: 'PENDIENTE',
    esPropio: true,
    proponentePublico: null,
  },
  {
    idEvento: 9005,
    titulo: 'Propuesta: expedición a la zona de reserva estricta',
    descripcion: 'Propuesta ilustrativa de un evento rechazado por no contar con permiso de colecta.',
    ubicacion: 'Reserva estricta El Cedral',
    imagen: null,
    fechaInicio: '2027-01-09T08:00:00',
    fechaFin: '2027-01-09T16:00:00',
    cupoMaximo: 12,
    participantesConfirmados: 0,
    estado: 'RECHAZADO',
    esPropio: true,
    motivoResolucion: 'La propuesta no incluía el permiso de colecta científica vigente para el género solicitado.',
    proponentePublico: null,
  },
  {
    idEvento: 9006,
    titulo: 'Muestreo de escarabajos del bosque nuboso',
    descripcion: 'Evento finalizado: registro de Chrysina limbata y otros escarabajos en el sendero La Cascada.',
    ubicacion: 'Sendero La Cascada',
    imagen: null,
    fechaInicio: '2026-10-10T09:00:00',
    fechaFin: '2026-10-10T15:00:00',
    cupoMaximo: 18,
    participantesConfirmados: 16,
    estado: 'APROBADO',
    proponentePublico: null,
  },
]

const propiasDemo = new Set([9004, 9005])

function pagina(lista, page, size) {
  const totalElements = lista.length
  const totalPages = Math.ceil(totalElements / size)
  return adaptarPaginaEventos({
    content: lista.slice(page * size, (page + 1) * size),
    number: page,
    size,
    totalPages,
    totalElements,
    first: page === 0,
    last: page >= totalPages - 1,
  })
}

function texto(valor) {
  return typeof valor === 'string' ? valor.trim().toLocaleLowerCase('es') : ''
}

export function consultarEventosDemo({
  page = 0,
  size = 10,
  q = '',
  estado = '',
  periodo = '',
  fechaDesde = '',
  fechaHasta = '',
} = {}) {
  const busqueda = texto(q)
  const filtrados = eventosDemo.filter((evento) => {
    const coincideTexto = !busqueda
      || `${evento.titulo} ${evento.descripcion} ${evento.ubicacion}`.toLocaleLowerCase('es').includes(busqueda)
    const coincideEstado = !estado || evento.estado === estado
    const inicio = evento.fechaInicio.slice(0, 10)
    const coincideDesde = !fechaDesde || inicio >= fechaDesde
    const coincideHasta = !fechaHasta || inicio <= fechaHasta
    const ahora = new Date().toISOString().slice(0, 10)
    const coincidePeriodo = !periodo
      || (periodo === 'futuros' && inicio >= ahora)
      || (periodo === 'pasados' && inicio < ahora)
    return coincideTexto && coincideEstado && coincideDesde && coincideHasta && coincidePeriodo
  })
  return pagina(filtrados, page, size)
}

export function consultarMisPropuestasDemo({ page = 0, size = 10 } = {}) {
  return pagina(eventosDemo.filter((evento) => propiasDemo.has(evento.idEvento)), page, size)
}
