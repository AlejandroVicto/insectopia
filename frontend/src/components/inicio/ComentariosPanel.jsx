import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'
import CampoModal from '../modales/CampoModal'
import { crearComentario, listarComentarios } from '../../services/comentariosService'
import { mensajeErrorApi } from '../../services/erroresApi'

const MAXIMO = 1000

function formatDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

// Panel inline: solo pide comentarios cuando el usuario abre la conversación.
// Nunca muestra comentarios inventados ni marca un envío como exitoso sin respuesta del backend.
export default function ComentariosPanel({ publicacion, onClose, onComentarioCreado }) {
  const id = publicacion?.id ?? publicacion?.idPublicacion
  const [comentarios, setComentarios] = useState([])
  const [estado, setEstado] = useState('loading')
  const [error, setError] = useState('')
  const [contenido, setContenido] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [retry, setRetry] = useState(0)
  const enviandoRef = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    listarComentarios(id, { size: 50, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        setComentarios(Array.isArray(data?.content) ? data.content : [])
        setEstado('success')
      })
      .catch((fallo) => {
        if (controller.signal.aborted) return
        setError(mensajeErrorApi(fallo, 'No se pudieron cargar los comentarios.'))
        setEstado('error')
      })
    return () => controller.abort()
  }, [id, retry])

  async function handleSubmit(evento) {
    evento.preventDefault()
    if (enviandoRef.current) return
    const texto = contenido.trim()
    if (!texto) {
      setError('Escribe un comentario antes de enviarlo.')
      return
    }
    if (texto.length > MAXIMO) {
      setError(`El comentario no puede superar los ${MAXIMO} caracteres.`)
      return
    }

    enviandoRef.current = true
    setEnviando(true)
    setError('')
    try {
      const { data } = await crearComentario(id, { contenido: texto })
      setComentarios((actuales) => [...actuales, data])
      setContenido('')
      onComentarioCreado?.(publicacion)
    } catch (fallo) {
      setError(mensajeErrorApi(fallo, 'No se pudo publicar el comentario.'))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return (
    <section aria-label={`Comentarios de la publicación ${id}`} className="inicio-inset mt-3 rounded-xl p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold text-[var(--inicio-text)]">Comentarios</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar comentarios"
          className="rounded-lg px-2 py-1 text-xs text-[var(--inicio-muted)] hover:bg-[var(--inicio-soft)]">Cerrar</button>
      </div>

      {estado === 'loading' && <p role="status" className="mt-3 text-xs text-[var(--inicio-muted)]">Cargando comentarios…</p>}
      {estado === 'error' && <div role="alert" className="mt-3 rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-200">
        {error}
        <button type="button" onClick={() => { setEstado('loading'); setRetry((valor) => valor + 1) }} className="ml-2 underline">Reintentar</button>
      </div>}
      {estado === 'success' && (comentarios.length === 0
        ? <p className="mt-3 text-xs text-[var(--inicio-muted)]">Sin comentarios todavía.</p>
        : <ul className="mt-3 space-y-3">
          {comentarios.map((comentario) => <li key={comentario.id} className="flex items-start gap-2">
            <Avatar name={comentario.autor?.nombre} src={comentario.autor?.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1 rounded-lg bg-[var(--inicio-card)] px-3 py-2">
              <p className="text-[11px] font-bold text-[var(--inicio-text)]">
                {comentario.autor?.nombre ?? 'Autor no disponible'}
                <span className="ml-1 font-normal text-[var(--inicio-muted)]">@{comentario.autor?.nombreUsuario ?? 'usuario'}</span>
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-[var(--inicio-text)]">{comentario.contenido}</p>
              <p className="mt-1 text-[10px] text-[var(--inicio-muted)]">{formatDate(comentario.fechaComentario)}</p>
            </div>
          </li>)}
        </ul>)}

      <form onSubmit={handleSubmit} aria-busy={enviando} className="mt-3 border-t border-[var(--inicio-border)] pt-3">
        <CampoModal id={`comentario-${id}`} etiqueta="Escribe tu comentario" error={estado === 'error' ? '' : error}>
          <textarea
            id={`comentario-${id}`}
            value={contenido}
            onChange={(evento) => { setContenido(evento.target.value); if (error) setError('') }}
            rows={2}
            maxLength={MAXIMO}
            disabled={enviando}
            className="w-full resize-y rounded-xl border border-[var(--inicio-border)] bg-[var(--inicio-card)] px-3 py-2 text-xs text-[var(--inicio-text)] outline-none focus:border-[var(--inicio-lime)]"
            placeholder="Comparte una observación sobre este hallazgo…"
          />
        </CampoModal>
        <div className="mt-2 flex justify-end">
          <button type="submit" disabled={enviando || !contenido.trim()}
            className="inicio-primary px-4 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50">
            {enviando ? 'Enviando…' : 'Enviar comentario'}
          </button>
        </div>
      </form>
    </section>
  )
}
