import { Link, useLocation } from 'react-router-dom'

export default function LoginPlaceholder() {
  const { state } = useLocation()
  return (
    <main className="min-h-screen bg-emerald-950 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-emerald-800">Acceso a Insectopia</h1>
        <p className="mt-3 text-gray-700">El formulario de inicio de sesión se incorporará próximamente.</p>
        {state?.from && <p className="mt-3 text-sm text-gray-600">Destino pendiente: {state.from}</p>}
        <Link className="mt-6 inline-block font-semibold text-emerald-700 underline" to="/">
          Volver a la comprobación de conexión
        </Link>
      </section>
    </main>
  )
}
