const views = [{ value: 'para-ti', label: 'Para ti' }, { value: 'global', label: 'Global' }]

export default function FeedFilters({ value, onChange }) {
  return <nav aria-label="Vistas del inicio" className="inicio-card flex items-center gap-2 px-3 py-2.5">
    {views.map((view) => <button key={view.value} type="button" aria-pressed={value === view.value}
      onClick={() => onChange(view.value)} className={`inicio-filter ${value === view.value ? 'inicio-filter-active' : ''}`}>
      <span aria-hidden="true">{view.value === 'para-ti' ? '●' : '◎'}</span>{view.label}
    </button>)}
  </nav>
}
