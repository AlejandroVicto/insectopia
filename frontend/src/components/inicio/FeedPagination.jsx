export default function FeedPagination({ page, totalPages, first, last, onChange, label = 'Páginas del inicio' }) {
  if (totalPages <= 1 && page === 0) return null
  return <nav aria-label={label} className="inicio-card flex items-center justify-between gap-3 px-4 py-3 text-xs">
    <button type="button" className="inicio-page" disabled={first} onClick={() => onChange(page - 1)}>Anterior</button>
    <span>Página {page + 1} de {Math.max(totalPages, 1)}</span>
    <button type="button" className="inicio-page" disabled={last} onClick={() => onChange(page + 1)}>Siguiente</button>
  </nav>
}
