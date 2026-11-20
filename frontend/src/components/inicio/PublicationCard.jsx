import { useState } from 'react'
import Avatar from './Avatar'
import PublicationActions from './PublicationActions'

function formatDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function PublicationCard({ post }) {
  const [failedImage, setFailedImage] = useState(null)
  return <article aria-label={`Publicación ${post.id}`} className="inicio-card min-w-0 p-4">
    <header className="flex items-center gap-3">
      <Avatar name={post.autor.nombre} src={post.autor.avatarUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--inicio-text)]">{post.autor.nombre}</p>
        <p className="truncate text-xs text-[var(--inicio-muted)]">@{post.autor.nombreUsuario} · {formatDate(post.fechaPublicacion)}</p>
      </div>
      <button type="button" disabled title="Acciones disponibles al integrar permisos del backend" aria-label={`Más opciones para publicación ${post.id}`} className="text-xl text-[var(--inicio-muted)] disabled:cursor-not-allowed">···</button>
    </header>
    {post.titulo && <h2 className="mt-4 font-display text-base font-bold leading-snug text-[var(--inicio-text)]">{post.titulo}</h2>}
    <p className={`${post.titulo ? 'mt-1' : 'mt-4'} whitespace-pre-line break-words text-xs leading-5 text-[var(--inicio-muted)]`}>{post.contenido}</p>
    {post.imagenUrl && failedImage !== post.imagenUrl && <div className="mt-4 overflow-hidden rounded-xl bg-[var(--inicio-inset)]">
      <img src={post.imagenUrl} alt={post.imagenAlt || `Imagen de la publicación de ${post.autor.nombre}`}
        onError={() => setFailedImage(post.imagenUrl)} className="aspect-[2.4/1] w-full object-cover" />
    </div>}
    {post.imagenUrl && failedImage === post.imagenUrl && <p className="mt-4 rounded-xl border border-[var(--inicio-border)] p-4 text-xs text-[var(--inicio-muted)]">Imagen no disponible</p>}
    <div className="mt-4"><PublicationActions post={post} /></div>
  </article>
}
