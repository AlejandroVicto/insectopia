import { Link } from 'react-router-dom'

export default function SectionPlaceholder({ title }) {
  return (
    <main className="min-h-screen bg-emerald-950 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-emerald-800">{title}</h1>
        <p className="mt-3 text-gray-700">La interfaz de esta sección se incorporará más adelante.</p>
        <Link className="mt-6 inline-block font-semibold text-emerald-700 underline" to="/">Volver al inicio</Link>
      </section>
    </main>
  )
}
