// Validación y payload del formulario 071. Sólo se envían columnas reales de
// Evento.java: titulo, descripcion, ubicacion, imagen, fechaInicio, fechaFin y
// cupoMaximo. Nunca se construyen id, estado ni campos de moderación.

export const LIMITES_EVENTO = Object.freeze({
  titulo: 150,
  ubicacion: 255,
  imagen: 500,
})

export const VALORES_VACIOS_EVENTO = Object.freeze({
  titulo: '',
  descripcion: '',
  ubicacion: '',
  imagen: '',
  fechaInicio: '',
  horaInicio: '',
  fechaFin: '',
  horaFin: '',
  cupoMaximo: '',
})

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : ''
}

function parteFecha(valor) {
  const coincidencia = /^(\d{4}-\d{2}-\d{2})/.exec(texto(valor))
  return coincidencia ? coincidencia[1] : ''
}

function parteHora(valor) {
  const coincidencia = /(?:T|\s)(\d{2}:\d{2})/.exec(texto(valor))
  return coincidencia ? coincidencia[1] : ''
}

export function valoresDesdeEvento(evento) {
  if (!evento) return { ...VALORES_VACIOS_EVENTO }
  return {
    titulo: texto(evento.titulo),
    descripcion: texto(evento.descripcion),
    ubicacion: texto(evento.ubicacion),
    imagen: texto(evento.imagenUrl ?? evento.imagen),
    fechaInicio: parteFecha(evento.fechaInicio),
    horaInicio: parteHora(evento.fechaInicio),
    fechaFin: parteFecha(evento.fechaFin),
    horaFin: parteHora(evento.fechaFin),
    cupoMaximo: evento.cupoMaximo ?? '',
  }
}

export function urlImagenSegura(valor) {
  const imagen = texto(valor)
  if (!imagen) return true
  if (imagen.length > LIMITES_EVENTO.imagen) return false
  return /^(https?:\/\/[^\s<>"']+|\/[^\s<>"']*)$/i.test(imagen)
}

function fechaValida(valor) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (!coincidencia) return false
  const [, anioTexto, mesTexto, diaTexto] = coincidencia
  const anio = Number(anioTexto)
  const mes = Number(mesTexto)
  const dia = Number(diaTexto)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return fecha.getUTCFullYear() === anio
    && fecha.getUTCMonth() === mes - 1
    && fecha.getUTCDate() === dia
}

function horaValida(valor) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor)
}

function fechaHora(valores, prefijo) {
  const fecha = valores[`fecha${prefijo}`]
  const hora = valores[`hora${prefijo}`]
  if (!fechaValida(fecha) || !horaValida(hora)) return null
  return `${fecha}T${hora}:00`
}

export function validarEvento(valores = {}) {
  const errores = {}
  const titulo = texto(valores.titulo)
  const descripcion = texto(valores.descripcion)
  const ubicacion = texto(valores.ubicacion)
  const imagen = texto(valores.imagen)
  const cupo = valores.cupoMaximo == null ? '' : String(valores.cupoMaximo).trim()

  if (!titulo) errores.titulo = 'Escribe el título del evento.'
  else if (titulo.length > LIMITES_EVENTO.titulo) errores.titulo = `El título no puede superar ${LIMITES_EVENTO.titulo} caracteres.`

  if (!descripcion) errores.descripcion = 'Escribe una descripción para el evento.'

  if (!ubicacion) errores.ubicacion = 'Indica la ubicación del evento.'
  else if (ubicacion.length > LIMITES_EVENTO.ubicacion) errores.ubicacion = `La ubicación no puede superar ${LIMITES_EVENTO.ubicacion} caracteres.`

  if (!valores.fechaInicio || !fechaValida(valores.fechaInicio)) errores.fechaInicio = 'Selecciona una fecha de inicio válida.'
  if (!horaValida(valores.horaInicio)) errores.horaInicio = 'Indica una hora de inicio válida.'
  if (!valores.fechaFin || !fechaValida(valores.fechaFin)) errores.fechaFin = 'Selecciona una fecha de finalización válida.'
  if (!horaValida(valores.horaFin)) errores.horaFin = 'Indica una hora de finalización válida.'

  const inicio = fechaHora(valores, 'Inicio')
  const fin = fechaHora(valores, 'Fin')
  if (inicio && fin && fin <= inicio) {
    errores.fechaFin = 'La fecha de finalización debe ser posterior a la de inicio.'
  }

  if (!cupo || !/^\d+$/.test(cupo) || !Number.isSafeInteger(Number(cupo)) || Number(cupo) <= 0) {
    errores.cupoMaximo = 'El cupo máximo debe ser un entero mayor que cero.'
  }

  if (!urlImagenSegura(imagen)) {
    errores.imagen = `Usa una URL http(s) o una ruta relativa de hasta ${LIMITES_EVENTO.imagen} caracteres.`
  }

  return errores
}

export function construirPayloadEvento(valores = {}) {
  return {
    titulo: texto(valores.titulo),
    descripcion: texto(valores.descripcion),
    ubicacion: texto(valores.ubicacion),
    imagen: texto(valores.imagen) || null,
    fechaInicio: fechaHora(valores, 'Inicio'),
    fechaFin: fechaHora(valores, 'Fin'),
    cupoMaximo: Number(valores.cupoMaximo),
  }
}
