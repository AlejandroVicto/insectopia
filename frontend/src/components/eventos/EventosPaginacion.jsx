export default function EventosPaginacion({ page, totalPages, first, last, onChange }) {
  if (totalPages <= 1 && page === 0) return null
  return (
    <nav aria-label="Páginas de eventos" className="evt-paginacion evt-panel">
      <button type="button" className="evt-btn evt-btn--ghost" disabled={first} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <span>Página {page + 1} de {Math.max(totalPages, 1)}</span>
      <button type="button" className="evt-btn evt-btn--ghost" disabled={last} onClick={() => onChange(page + 1)}>
        Siguiente
      </button>
    </nav>
  )
}
