// Contrato visual y validaciones compartidas por los cuatro modales de publicaciones (actividad 061).
// Los valores de esta lista son propuestas de interfaz: el backend actual (V3/V7) solo expone
// contenido, imagen y, para reportes, motivo/descripcion. Nada de aquí se envía a la API salvo
// MOTIVOS_REPORTE, que es la selección real del formulario de reporte.

export const LIMITES = {
  contenidoMin: 10,
  contenidoMax: 2000,
  imagenMaxBytes: 5 * 1024 * 1024,
  descripcionMin: 10,
  descripcionMax: 500,
}

export const TIPOS_IMAGEN_ACEPTADOS = ['image/jpeg', 'image/png']

export const ORDENES_TAXONOMICOS = [
  'Coleoptera (escarabajos)',
  'Lepidoptera (mariposas)',
  'Hymenoptera (abejas y avispas)',
  'Diptera (moscas)',
  'Hemiptera (chinches)',
  'Otro orden',
]

export const NIVELES_CERTEZA = [
  'Orden identificado',
  'Familia probable',
  'Familia confirmada',
  'Género probable',
  'Especie confirmada (nivel 4)',
]

export const VISIBILIDADES = [
  'Público (red abierta de biodiversidad)',
  'Solo seguidores',
  'Privado',
]

// Códigos estables para el campo `motivo` (VARCHAR(100) en la migración V7).
// Las etiquetas son solo presentación; el backend aún debe confirmar los valores admitidos.
export const MOTIVOS_REPORTE = [
  { value: 'CONTENIDO_INAPROPIADO', label: 'Contenido inapropiado' },
  { value: 'DATOS_FICTICIOS', label: 'Datos ficticios o engañosos' },
  { value: 'SPAM', label: 'Spam o publicidad' },
  { value: 'IMAGEN_NO_RELACIONADA', label: 'Imagen no relacionada con insectos' },
  { value: 'LENGUAJE_OFENSIVO', label: 'Lenguaje ofensivo' },
  { value: 'OTRO', label: 'Otro motivo' },
]

export const AVISO_PROPUESTA = 'Orden taxonómico, certeza, ubicación y visibilidad son propuestas del diseño: la API actual no las admite y no se enviarán.'

export const AVISO_IMAGEN = 'La vista previa y el FormData son locales: adjuntar archivos al envío aún no está disponible. Quita la imagen para guardar solo el texto.'

export const CLASE_ETIQUETA = 'mb-1.5 block text-xs font-semibold tracking-tight text-[#d6e2d2]'
export const CLASE_CONTROL = 'w-full min-w-0 rounded-xl border border-[#40584a] bg-[#141d17] px-4 py-2.5 text-sm leading-5 text-[#f3f8ef] placeholder:text-[#83998a] focus:border-lime-400 focus:outline-none focus:ring-2 focus:ring-lime-400/30 disabled:cursor-not-allowed disabled:opacity-60'
export const CLASE_ERROR = 'mt-1 text-xs leading-4 text-red-300'
export const CLASE_PISTA = 'mt-1 text-xs leading-4 text-[#a5b7a7]'
export const CLASE_AVISO = 'rounded-xl border border-[#466046] bg-[#26382a] px-4 py-3 text-xs leading-5 text-lime-100'
export const CLASE_BOTON_SECUNDARIO = 'rounded-xl bg-[#35423a] px-5 py-2.5 text-sm font-semibold text-[#f3f8ef] transition hover:bg-[#465649] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400'
export const CLASE_BOTON_PRIMARIO = 'rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-bold text-[#161e19] transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200'
export const CLASE_BOTON_PELIGRO = 'rounded-xl bg-pink-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300'

export function describirCampo(id, { error, pista } = {}) {
  return [pista ? `${id}-pista` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
}
