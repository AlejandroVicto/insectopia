import { useState } from 'react'
import ModalContainer from '../modales/ModalContainer'

const textos = {
  rol: {
    etiqueta: 'CAMBIO DE ROL · AUDITORÍA', titulo: '¿Confirmar cambio de rol?',
    descripcion: 'Cambiarás los permisos asociados a la cuenta seleccionada. Verifica que sea el rol adecuado.',
    nota: 'El cambio deberá quedar registrado con la fecha y el administrador responsable.',
    boton: 'Confirmar cambio de rol', acento: 'lima',
  },
  eliminacion: {
    etiqueta: 'ELIMINACIÓN IRREVERSIBLE', titulo: '¿Eliminar esta cuenta definitivamente?',
    descripcion: 'Se eliminarán físicamente la cuenta, sus publicaciones y sus datos propios. No se podrá reactivar.',
    nota: 'Los aportes de terceros y registros históricos se preservan desligados o anonimizados.',
    boton: 'Eliminar cuenta definitivamente', acento: 'rojo',
  },
  desactivacion: {
    etiqueta: 'ACCIÓN ADMINISTRATIVA SENSIBLE', titulo: '¿Desactivar esta cuenta?',
    descripcion: 'La cuenta dejará de estar activa, pero sus registros no se borrarán. El administrador podrá reactivarla.',
    nota: 'Desactivar la cuenta no elimina sus publicaciones ni su información.',
    boton: 'Desactivar cuenta', acento: 'rojo',
  },
  reactivacion: {
    etiqueta: 'ACCIÓN ADMINISTRATIVA SENSIBLE', titulo: '¿Reactivar esta cuenta?',
    descripcion: 'La cuenta volverá a estar activa y podrá acceder según su rol.',
    nota: 'El backend comprobará las reglas de seguridad antes de permitir el cambio.',
    boton: 'Reactivar cuenta', acento: 'lima',
  },
}

// El backend vuelve a verificar las protecciones, aunque la interfaz impida acciones conocidas.
export default function ConfirmarCambioAdministrativo({ tipo, usuario, anterior, nuevo, enviando = false, error, onClose, onConfirm }) {
  const [aceptado, setAceptado] = useState(false)
  const texto = textos[tipo]
  if (!texto || !usuario || !anterior || !nuevo) return null
  return <ModalContainer titleId="admin-confirmar-titulo" descriptionId="admin-confirmar-descripcion"
    title={texto.titulo} description={texto.descripcion} eyebrow={texto.etiqueta} acento={texto.acento}
    ancho={600} closeDisabled={enviando} onClose={onClose}>
    <div className="space-y-4 overflow-y-auto px-7 py-6 text-xs text-[#f3f8ef]">
      <div className="rounded-xl bg-[#141d17] p-4">
        <p className="text-[10px] font-semibold text-[#a5b7a7]">Usuario</p>
        <p className="mt-1 break-words font-semibold">{usuario.nombre} · @{usuario.nombreUsuario} · id_usuario {usuario.idUsuario}</p>
      </div>
      <div className={`grid grid-cols-2 gap-4 rounded-xl p-4 ${texto.acento === 'rojo' ? 'bg-[#372b28]' : 'bg-[#223127]'}`}>
        <div><p className="text-[10px] font-semibold text-[#a5b7a7]">VALOR ACTUAL</p><p className="mt-2 font-display text-base font-bold">{anterior}</p></div>
        <div><p className="text-[10px] font-semibold text-[#a5b7a7]">VALOR NUEVO</p><p className={`mt-2 font-display text-base font-bold ${texto.acento === 'rojo' ? 'text-red-300' : 'text-lime-400'}`}>{nuevo}</p></div>
      </div>
      <p className="leading-5 text-[#a5b7a7]">{texto.nota}</p>
      {tipo === 'eliminacion' && <label className="flex items-start gap-2 rounded-xl border border-red-400/40 p-3 text-red-200">
        <input type="checkbox" checked={aceptado} onChange={(e) => setAceptado(e.target.checked)} />
        Entiendo que eliminar esta cuenta es irreversible y no podrá recuperarse.
      </label>}
      {error && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-950/40 p-3 text-red-200">{error}</p>}
      <div className="flex gap-3">
        <button type="button" data-modal-autofocus="" disabled={enviando} onClick={onClose}
          className="admin-boton-secundario w-1/3 border border-[#35483a] bg-[#223127] px-4 py-3 text-center font-semibold">Cancelar</button>
        <button type="button" disabled={enviando || (tipo === 'eliminacion' && !aceptado)} onClick={onConfirm}
          className={`w-2/3 rounded-xl px-4 py-3 font-semibold disabled:opacity-50 ${texto.acento === 'rojo' ? 'bg-red-400 text-[#161e19]' : 'bg-lime-400 text-[#161e19]'}`}>
          {enviando ? 'Procesando…' : texto.boton}
        </button>
      </div>
    </div>
  </ModalContainer>
}
