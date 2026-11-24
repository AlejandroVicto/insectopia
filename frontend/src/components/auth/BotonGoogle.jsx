import { useEffect, useState } from 'react'
import { obtenerConfiguracionGoogle, redirigirAGoogle } from '../../services/googleService'

function IconoGoogle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1a6 6 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6A6 6 0 0 1 12 6Z" />
    </svg>
  )
}

const NO_DISPONIBLE = 'Google estará disponible cuando se integre OAuth.'
const CARGANDO = 'Comprobando disponibilidad de Google…'
const DISPONIBLE = 'Continuarás a Google para autorizar el acceso. No pedimos permisos a tus otros servicios.'

export default function BotonGoogle() {
  const [estado, setEstado] = useState('cargando')
  const [loginUrl, setLoginUrl] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    const controller = new AbortController()
    obtenerConfiguracionGoogle({ senal: controller.signal })
      .then((config) => {
        if (!activo) return
        setLoginUrl(config.loginUrl)
        setEstado(config.enabled ? 'disponible' : 'no_disponible')
      })
      .catch(() => {
        if (!activo || controller.signal.aborted) return
        setEstado('no_disponible')
      })
    return () => {
      activo = false
      controller.abort()
    }
  }, [])

  const disponible = estado === 'disponible'
  const mensaje = estado === 'cargando' ? CARGANDO : availableMessage()

  function availableMessage() {
    if (error) return error
    if (estado === 'disponible') return DISPONIBLE
    if (estado === 'no_disponible') return NO_DISPONIBLE
    return NO_DISPONIBLE
  }

  function iniciar() {
    if (!disponible) return
    setError('')
    try {
      redirigirAGoogle(loginUrl)
    } catch {
      setError('No se pudo iniciar el acceso con Google. Inténtalo más tarde.')
    }
  }

  const etiqueta = disponible
    ? 'Continuar con Google'
    : `Google no disponible: ${NO_DISPONIBLE}`

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={!disponible}
        aria-label={etiqueta}
        title={etiqueta}
        onClick={iniciar}
        className="flex h-14 w-full min-w-0 items-center justify-center gap-3 rounded-md border border-neutral-200 bg-white px-4 text-base font-bold text-black transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-black/60 disabled:opacity-70"
      >
        <IconoGoogle />
        <span>Google</span>
      </button>
      <p role="status" className="mt-3 text-xs leading-5 text-zinc-400">{mensaje}</p>
    </div>
  )
}
