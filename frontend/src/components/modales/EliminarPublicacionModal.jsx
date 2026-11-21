import { useRef, useState } from 'react'
import ModalContainer from './ModalContainer'
import { eliminarPublicacion } from '../../services/publicacionesService'
import { mensajeErrorApi } from '../../services/erroresApi'
import { CLASE_BOTON_PELIGRO, CLASE_BOTON_SECUNDARIO } from '../../constants/modalesPublicaciones'

function fechaLegible(valor) {
  if (!valor || Number.isNaN(Date.parse(valor))) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor))
}

function EliminarPublicacionForm({ publicacion, onClose, onSuccess }) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const enviandoRef = useRef(false)

  async function handleConfirm() {
    if (enviandoRef.current) return
    enviandoRef.current = true
    setEnviando(true)
    setError('')
    try {
      await eliminarPublicacion(publicacion?.id ?? publicacion?.idPublicacion)
      onSuccess?.(publicacion)
      onClose?.()
    } catch (fallo) {
      setError(mensajeErrorApi(fallo, 'No se pudo eliminar la publicación.'))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  const contenido = publicacion?.contenido?.trim() ?? ''
  const resumen = contenido.length > 160 ? `${contenido.slice(0, 157)}…` : contenido

  return (
    <ModalContainer
      titleId="eliminar-publicacion-titulo"
      descriptionId="eliminar-publicacion-descripcion"
      title="Eliminar publicación"
      description="Confirma antes de continuar"
      onClose={onClose}
      closeLabel="Cerrar confirmación de eliminación"
      closeDisabled={enviando}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
          <p className="rounded-xl border border-red-500/40 bg-[#3a2227] px-4 py-3 text-sm leading-5 text-red-100">
            La publicación dejará de mostrarse; sus comentarios, reacciones y reportes se conservarán.
          </p>
          <p className="rounded-xl border border-[#466046] bg-[#26382a] px-4 py-3 text-xs leading-5 text-lime-100">
            La eliminación lógica se confirmará únicamente cuando responda el backend.
          </p>

          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-semibold tracking-tight text-[#d6e2d2]">Publicación seleccionada</p>
            <div className="rounded-xl border border-[#40584a] bg-[#141d17] px-4 py-3.5">
              <p className="break-words text-sm leading-5 text-[#f3f8ef]">{resumen || 'Sin descripción disponible'}</p>
              <p className="mt-2 break-words text-xs text-[#a5b7a7]">
                {publicacion?.autor?.nombre ?? 'Autor no disponible'} · {fechaLegible(publicacion?.fechaPublicacion)}
              </p>
              <p className="mt-1 text-xs text-[#a5b7a7]">Identificador: {String(publicacion?.id ?? publicacion?.idPublicacion ?? 'no disponible')}</p>
            </div>
          </div>

          <p className="text-base font-bold leading-6 text-stone-100">¿Seguro que deseas eliminar esta publicación?</p>
          <p className="text-xs leading-5 text-[#a5b7a7]">La eliminación solo se considera realizada cuando el backend confirma la operación.</p>
        </div>

        <footer className="shrink-0 border-t border-[#35483a] px-6 py-4 sm:px-8">
          {error && <div role="alert" className="mb-3 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs leading-5 text-red-200">{error}</div>}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              data-modal-autofocus=""
              disabled={enviando}
              onClick={onClose}
              className={CLASE_BOTON_SECUNDARIO}
            >
              Cancelar
            </button>
            <button type="button" disabled={enviando} onClick={handleConfirm} className={CLASE_BOTON_PELIGRO}>
              {enviando ? 'Eliminando…' : 'Eliminar publicación'}
            </button>
          </div>
        </footer>
      </div>
    </ModalContainer>
  )
}

export default function EliminarPublicacionModal({ open = true, ...props }) {
  return open ? <EliminarPublicacionForm {...props} /> : null
}
