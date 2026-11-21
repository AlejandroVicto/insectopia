import { useState } from 'react'
import Avatar from './Avatar'
import PublicationActions from './PublicationActions'
import ComentariosPanel from './ComentariosPanel'

function formatDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function PublicationCard({
  post,
  demo = false,
  user,
  onComentar,
  onReaccion,
  reaccionando = false,
  comentariosAbiertos = false,
  onCerrarComentarios,
  onComentarioCreado,
  onEditar,
  onEliminar,
  onReportar,
}) {
  const [failedImage, setFailedImage] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const esAutor = user?.id != null && String(user.id) === String(post.autor?.id)
  const esAdmin = user?.role === 'ADMINISTRADOR'
  const puedeGestionar = esAutor || esAdmin

  function elegir(accion) {
    setMenuAbierto(false)
    accion?.(post)
  }

  return <article aria-label={`Publicación ${post.id}`} className="inicio-card min-w-0 p-4">
    <header className="flex items-center gap-3">
      <Avatar name={post.autor.nombre} src={post.autor.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--inicio-text)]">{post.autor.nombre}</p>
        <p className="truncate text-xs text-[var(--inicio-muted)]">@{post.autor.nombreUsuario} · {formatDate(post.fechaPublicacion)}</p>
      </div>
      <div className="relative shrink-0">
        <button type="button" disabled={demo} aria-expanded={!demo && menuAbierto}
          title={demo ? 'Acciones disponibles al integrar permisos del backend' : 'Más opciones'}
          aria-label={`Más opciones para publicación ${post.id}`}
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          className="text-xl text-[var(--inicio-muted)] disabled:cursor-not-allowed">···</button>
        {!demo && menuAbierto && <div role="menu" aria-label={`Acciones de publicación ${post.id}`}
          className="inicio-card absolute right-0 top-full z-20 mt-1 w-56 p-2 shadow-xl">
          {puedeGestionar && <>
            <button type="button" role="menuitem" onClick={() => elegir(onEditar)} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-[var(--inicio-soft)]">Editar publicación</button>
            <button type="button" role="menuitem" onClick={() => elegir(onEliminar)} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-red-300 hover:bg-[var(--inicio-soft)]">Eliminar publicación</button>
          </>}
          {!esAutor && <button type="button" role="menuitem" onClick={() => elegir(onReportar)} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-[var(--inicio-soft)]">Reportar publicación</button>}
          <p className="mt-1 border-t border-[var(--inicio-border)] px-3 pt-2 text-[10px] leading-4 text-[var(--inicio-muted)]">
            Editar, eliminar y reportar aún no están disponibles: el backend solo confirma consulta, creación, comentarios y reacciones. Si lo intentas, verás el error real.
          </p>
        </div>}
      </div>
    </header>
    {post.titulo && <h2 className="mt-4 font-display text-base font-bold leading-snug text-[var(--inicio-text)]">{post.titulo}</h2>}
    <p className={`${post.titulo ? 'mt-1' : 'mt-4'} whitespace-pre-line break-words text-xs leading-5 text-[var(--inicio-muted)]`}>{post.contenido}</p>
    {post.imagenUrl && failedImage !== post.imagenUrl && <div className="mt-4 overflow-hidden rounded-xl bg-[var(--inicio-inset)]">
      <img src={post.imagenUrl} alt={post.imagenAlt || `Imagen de la publicación de ${post.autor.nombre}`}
        onError={() => setFailedImage(post.imagenUrl)} className="aspect-[2.4/1] w-full object-cover" />
    </div>}
    {post.imagenUrl && failedImage === post.imagenUrl && <p className="mt-4 rounded-xl border border-[var(--inicio-border)] p-4 text-xs text-[var(--inicio-muted)]">Imagen no disponible</p>}
    <div className="mt-4">
      <PublicationActions post={post} demo={demo} onComentar={onComentar} onReaccion={onReaccion} reaccionando={reaccionando} />
      {!demo && comentariosAbiertos && <ComentariosPanel publicacion={post} onClose={onCerrarComentarios} onComentarioCreado={onComentarioCreado} />}
    </div>
  </article>
}
