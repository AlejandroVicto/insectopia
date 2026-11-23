export default function ModeracionPaginacion({ pagina, totalPaginas, first, last, onChange }) {
  const paginaActual = totalPaginas > 0 ? pagina + 1 : 0
  const anteriorDeshabilitado = first || pagina <= 0
  const siguienteDeshabilitado = last || totalPaginas <= 0 || pagina >= totalPaginas - 1

  return (
    <nav aria-label="Páginas de moderación" className="mod-paginacion">
      <button
        type="button"
        className="mod-btn mod-btn--secundario"
        onClick={() => onChange(pagina - 1)}
        disabled={anteriorDeshabilitado}
      >
        ‹ Anterior
      </button>
      <p aria-live="polite">Página {paginaActual} de {totalPaginas}</p>
      <button
        type="button"
        className="mod-btn mod-btn--secundario"
        onClick={() => onChange(pagina + 1)}
        disabled={siguienteDeshabilitado}
      >
        Siguiente ›
      </button>
    </nav>
  )
}
