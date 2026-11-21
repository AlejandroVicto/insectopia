import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'
import { crearPublicacion, subirImagenPublicacion } from '../../services/publicacionesService'
import { mensajeErrorApi } from '../../services/erroresApi'
import { LIMITES, TIPOS_IMAGEN_ACEPTADOS } from '../../constants/modalesPublicaciones'

const pendiente = 'La creación de publicaciones está disponible en la vista conectada al backend.'

export default function PostComposer({ user, demo = false, onSuccess }) {
  const [contenido, setContenido] = useState('')
  const [imagen, setImagen] = useState(null)
  const [vistaPrevia, setVistaPrevia] = useState(null)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [creada, setCreada] = useState(null)
  const enviandoRef = useRef(false)
  const archivoRef = useRef(null)

  useEffect(() => () => {
    if (vistaPrevia && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(vistaPrevia)
  }, [vistaPrevia])

  function seleccionarImagen(event) {
    const archivo = event.target.files?.[0] ?? null
    if (!archivo) {
      setImagen(null)
      setVistaPrevia(null)
      return
    }
    if (!TIPOS_IMAGEN_ACEPTADOS.includes(archivo.type) || archivo.size === 0 || archivo.size > LIMITES.imagenMaxBytes) {
      setError('Selecciona una fotografía JPG o PNG de hasta 5 MB que no esté vacía.')
      setImagen(null)
      setVistaPrevia(null)
      event.target.value = ''
      return
    }
    setError('')
    setImagen(archivo)
    setVistaPrevia(typeof URL.createObjectURL === 'function' ? URL.createObjectURL(archivo) : null)
  }

  function quitarImagen() {
    setImagen(null)
    setVistaPrevia(null)
    setError('')
    if (archivoRef.current) archivoRef.current.value = ''
  }

  async function publicar(event) {
    event.preventDefault()
    if (demo || enviandoRef.current) return
    if (!creada && (contenido.trim().length < LIMITES.contenidoMin || contenido.trim().length > LIMITES.contenidoMax)) {
      setError(`Las notas de campo deben tener entre ${LIMITES.contenidoMin} y ${LIMITES.contenidoMax} caracteres.`)
      return
    }

    setError('')
    enviandoRef.current = true
    setEnviando(true)
    let publicacion = creada
    try {
      if (!publicacion) {
        const { data } = await crearPublicacion({ contenido })
        if (data?.id == null) throw new Error('La respuesta no contiene el ID de la publicación')
        publicacion = data
        setCreada(data)
      }
      if (imagen) {
        try {
          const { data } = await subirImagenPublicacion(publicacion.id, imagen)
          publicacion = data
        } catch (fallo) {
          onSuccess?.(publicacion) // El texto ya existe en el feed aunque la foto no se haya subido.
          throw fallo
        }
      }
      onSuccess?.(publicacion)
      setContenido('')
      quitarImagen()
      setCreada(null)
    } catch (fallo) {
      setError(mensajeErrorApi(fallo, publicacion
        ? `La publicación #${publicacion.id} ya se guardó, pero falló la foto. Reintenta aquí sin crear otra publicación.`
        : 'No se pudo publicar el hallazgo.'))
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return <section aria-label="Nueva publicación" className="inicio-card p-4">
    <form onSubmit={publicar} aria-busy={enviando}>
      <div className="flex items-start gap-3">
        <Avatar name={user?.name} src={user?.avatarUrl} />
        <label htmlFor="inicio-contenido" className="sr-only">Notas de campo y morfología</label>
        <textarea id="inicio-contenido" value={contenido}
          onChange={(event) => { setContenido(event.target.value); setError('') }}
          disabled={demo || enviando || Boolean(creada)} maxLength={LIMITES.contenidoMax} rows={3}
          placeholder="Comparte un nuevo avistamiento…"
          className="inicio-inset min-h-20 min-w-0 flex-1 resize-y rounded-xl px-4 py-3 text-xs text-[var(--inicio-text)] placeholder:text-[var(--inicio-muted)] disabled:cursor-not-allowed" />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="inicio-imagen" className="mb-1 block text-xs text-[var(--inicio-muted)]">Agregar imagen (JPG o PNG, máximo 5 MB)</label>
          <input id="inicio-imagen" ref={archivoRef} type="file" accept="image/jpeg,image/png"
            disabled={demo || enviando} onChange={seleccionarImagen}
            className="max-w-full text-xs text-[var(--inicio-text)] file:mr-2 file:rounded-lg file:border-0 file:bg-lime-400 file:px-3 file:py-1 file:font-semibold file:text-[#161e19] disabled:cursor-not-allowed" />
        </div>
        <button type="submit" aria-label={creada && imagen ? 'Reintentar fotografía' : creada ? 'Terminar sin fotografía' : 'Publicar'}
          disabled={demo || enviando}
          className="inicio-primary px-5 py-2 text-xs disabled:cursor-not-allowed">
          {enviando ? 'Publicando…' : creada && imagen ? 'Reintentar fotografía' : creada ? 'Terminar sin fotografía' : 'Publicar →'}
        </button>
      </div>
      {vistaPrevia && <img src={vistaPrevia} alt={`Vista previa de ${imagen.name}`} className="mt-3 max-h-48 w-full rounded-xl object-contain" />}
      {imagen && <button type="button" onClick={quitarImagen} disabled={enviando}
        className="mt-2 text-xs font-semibold text-lime-300">Quitar imagen</button>}
      {creada && <p role="status" className="mt-2 text-xs text-lime-300">La publicación #{creada.id} ya se guardó. Puedes reintentar la fotografía sin duplicarla.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
      {demo && <p className="sr-only">{pendiente}</p>}
    </form>
  </section>
}
