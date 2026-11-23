export function FeedLoading() {
  return <div role="status" aria-label="Cargando publicaciones" className="grid gap-4 animate-pulse">
    {[1, 2].map((id) => <div key={id} className="inicio-card h-72 p-4"><div className="inicio-inset h-10 w-2/5 rounded-lg"/><div className="inicio-inset mt-5 h-5 w-3/4 rounded-lg"/><div className="inicio-inset mt-5 h-36 rounded-lg"/></div>)}
    <span className="sr-only">Cargando publicaciones…</span>
  </div>
}

export function FeedEmpty({ filtered, onClear, titulo = 'Aún no hay avistamientos', mensaje }) {
  const texto = mensaje ?? (filtered ? 'Prueba otra búsqueda o cambia de vista.' : 'Vuelve más tarde para descubrir novedades.')
  return <section className="inicio-card px-6 py-12 text-center" role="status">
    <h2 className="font-display text-lg font-bold">{titulo}</h2>
    <p className="mt-2 text-sm text-[var(--inicio-muted)]">{texto}</p>
    {filtered && <button type="button" onClick={onClear} className="inicio-primary mt-5 px-5 py-2 text-xs">Limpiar filtros</button>}
  </section>
}

export function FeedError({ onRetry, titulo = 'No pudimos cargar el inicio', mensaje = 'Comprueba la conexión e inténtalo de nuevo.' }) {
  return <section className="inicio-card px-6 py-12 text-center" role="alert">
    <h2 className="font-display text-lg font-bold">{titulo}</h2>
    <p className="mt-2 text-sm text-[var(--inicio-muted)]">{mensaje}</p>
    <button type="button" onClick={onRetry} className="inicio-primary mt-5 px-5 py-2 text-xs">Reintentar</button>
  </section>
}
