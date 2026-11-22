// Avisos de operación de los modales 071. Nunca afirma éxito: sólo informa
// disponibilidad o muestra el error devuelto por el servicio.
export default function EventoModalAviso({ mensaje, tipo = 'info' }) {
  if (!mensaje) return null
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-xs leading-5 ${
        tipo === 'error'
          ? 'border-red-500/40 bg-red-950/40 text-red-200'
          : 'border-[#466046] bg-[#26382a] text-lime-100'
      }`}
    >
      {mensaje}
    </div>
  )
}
