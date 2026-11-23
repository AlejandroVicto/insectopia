// Traduce los DTO propuestos de /api/eventos al modelo de presentación de la pantalla 069.
// El modelo Java real (Evento) sólo tiene: idEvento, proponente, moderador, título,
// descripción, ubicación, imagen, fechaInicio, fechaFin, cupoMaximo, estado,
// motivoResolución y fechas de resolución/creación/actualización.
// No se inventan tipo, modalidad, coordenadas ni etiquetas taxonómicas.

const ESTADOS = Object.freeze({
  PENDIENTE: { etiqueta: 'Pendiente de aprobación', tono: 'pendiente' },
  APROBADO: { etiqueta: 'Aprobado', tono: 'aprobado' },
  RECHAZADO: { etiqueta: 'Rechazado', tono: 'rechazado' },
  CANCELADO: { etiqueta: 'Cancelado', tono: 'cancelado' },
})

const INSCRIPCIONES = Object.freeze({
  INSCRITO: 'Inscrito',
  CANCELADO: 'Inscripción cancelada',
})

const OPCIONES_FECHA = Object.freeze({
  timeZone: 'UTC',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const OPCIONES_HORA = Object.freeze({ timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false })

const formatoFecha = new Intl.DateTimeFormat('es-ES', OPCIONES_FECHA)
const formatoHora = new Intl.DateTimeFormat('es-ES', OPCIONES_HORA)

function texto(valor) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null
}

function idValido(valor) {
  return (typeof valor === 'string' && valor.trim().length > 0)
    || (Number.isSafeInteger(valor) && valor > 0)
}

function natural(valor) {
  return Number.isSafeInteger(valor) && valor >= 0 ? valor : null
}

function urlImagen(valor, id) {
  const imagen = texto(valor)
  if (!imagen) return null
  if (/^eventos\/[0-9a-f-]{36}\.(jpg|png)$/i.test(imagen)) {
    const ruta = `/api/eventos/${encodeURIComponent(String(id))}/imagen`
    try {
      return import.meta.env.VITE_API_URL ? new URL(ruta, import.meta.env.VITE_API_URL).href : ruta
    } catch {
      return ruta
    }
  }
  // Se descartan esquemas no visuales (javascript:, data:text/html, etc.).
  return /^(https?:\/\/|\/)/i.test(imagen) ? imagen : null
}

// LocalDateTime de Java no incluye zona. Se interpreta como hora local "de pared"
// y se fija UTC sólo para formatear, de modo que el navegador no desplace el día.
function fechaUTC(valor) {
  const fechaTexto = texto(valor)
  if (!fechaTexto) return null
  const piezas = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(fechaTexto)
  if (!piezas) return null
  const [, anio, mes, dia, hora = '00', minuto = '00'] = piezas
  const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia), Number(hora), Number(minuto)))
  if (fecha.getUTCFullYear() !== Number(anio) || fecha.getUTCMonth() !== Number(mes) - 1
      || fecha.getUTCDate() !== Number(dia)) return null
  return fecha
}

function proponentePublico(valor) {
  if (texto(valor)) return texto(valor)
  if (!valor || typeof valor !== 'object') return null
  const nombre = texto(valor.nombre ?? valor.name)
  const usuario = texto(valor.nombreUsuario ?? valor.username)
  if (!nombre && !usuario) return null
  return { nombre, usuario }
}

export function adaptarEvento(raw, opciones = {}) {
  const id = raw?.id ?? raw?.idEvento
  const titulo = texto(raw?.titulo)
  const inicio = fechaUTC(raw?.fechaInicio)
  if (!idValido(id) || !titulo || !inicio) {
    throw new Error('El DTO de evento no contiene los datos mínimos')
  }

  const fin = fechaUTC(raw?.fechaFin)
  const estadoServidor = texto(raw?.estado)?.toUpperCase() ?? null
  const estado = estadoServidor && ESTADOS[estadoServidor] ? estadoServidor : null
  const apariencia = estado ? ESTADOS[estado] : { etiqueta: 'Sin estado confirmado', tono: 'neutro' }
  const inscripcionServidor = texto(raw?.estadoInscripcion ?? raw?.inscripcionEstado ?? raw?.miInscripcion)?.toUpperCase() ?? null
  const inscripcionEtiqueta = INSCRIPCIONES[inscripcionServidor] ?? null
  const cupoMaximo = natural(raw?.cupoMaximo)
  const participantes = natural(raw?.participantesConfirmados ?? raw?.totalParticipantes ?? raw?.numeroParticipantes)
  const cupoDisponible = cupoMaximo !== null && participantes !== null ? participantes < cupoMaximo : null
  const idUsuario = opciones.idUsuario
  const esPropio = raw?.esPropio === true
    || raw?.esMiPropuesta === true
    || opciones.propia === true
    || (idUsuario != null && raw?.idProponente != null && String(raw.idProponente) === String(idUsuario))

  return {
    id,
    titulo,
    descripcion: texto(raw?.descripcion),
    ubicacion: texto(raw?.ubicacion),
    imagenUrl: urlImagen(raw?.imagen, id),
    fechaInicio: texto(raw.fechaInicio),
    fechaFin: texto(raw.fechaFin),
    fechaInicioTexto: formatoFecha.format(inicio),
    fechaFinTexto: fin ? formatoFecha.format(fin) : null,
    rangoFechas: fin && formatoFecha.format(fin) !== formatoFecha.format(inicio)
      ? `${formatoFecha.format(inicio)} – ${formatoFecha.format(fin)}`
      : formatoFecha.format(inicio),
    horaInicio: formatoHora.format(inicio),
    horaFin: fin ? formatoHora.format(fin) : null,
    esPasado: (fin ?? inicio).getTime() < Date.now(),
    cupoMaximo,
    participantesConfirmados: participantes,
    cupoDisponible,
    estado,
    estadoEtiqueta: apariencia.etiqueta,
    estadoTono: apariencia.tono,
    inscripcionEstado: inscripcionEtiqueta ? inscripcionServidor : null,
    inscripcionEtiqueta,
    proponente: proponentePublico(raw?.proponentePublico ?? raw?.proponente),
    esPropio,
    // Sólo se expone cuando el DTO lo incluye. Se muestra únicamente en
    // propuestas propias rechazadas; nunca se inventa ni se edita.
    motivoResolucion: texto(raw?.motivoResolucion),
  }
}

export function adaptarPaginaEventos(raw, opciones = {}) {
  if (!raw || !Array.isArray(raw.content) || !Number.isInteger(raw.number) || raw.number < 0
      || !Number.isInteger(raw.size) || raw.size <= 0 || !Number.isInteger(raw.totalPages)
      || raw.totalPages < 0 || !Number.isInteger(raw.totalElements) || raw.totalElements < 0
      || typeof raw.first !== 'boolean' || typeof raw.last !== 'boolean') {
    throw new Error('El formato de paginación de eventos no es válido')
  }
  return {
    content: raw.content.map((evento) => adaptarEvento(evento, opciones)),
    number: raw.number,
    size: raw.size,
    totalPages: raw.totalPages,
    totalElements: raw.totalElements,
    first: raw.first,
    last: raw.last,
  }
}
