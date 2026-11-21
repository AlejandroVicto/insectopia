import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import api from './services/api'
import ProtectedRoute from './auth/ProtectedRoute'
import { ROUTE_ROLES } from './auth/roles'
import Login from './pages/Login'
import Registro from './pages/Registro'
import SectionPlaceholder from './pages/SectionPlaceholder'
import PrivateLayout from './layout/PrivateLayout'
import Inicio from './pages/Inicio'
import Mensajes from './pages/Mensajes'
import Notificaciones from './pages/Notificaciones'
import PublicacionDetalle from './pages/PublicacionDetalle'

const MENSAJE_INICIAL = 'Verificando conexión con el backend...'

const ESTADOS = {
  cargando: {
    contenedor: 'border-sky-200 bg-sky-50 text-sky-800',
    indicador: 'bg-sky-500 animate-pulse',
    titulo: 'Comprobando conexión',
  },
  exito: {
    contenedor: 'border-green-200 bg-green-50 text-green-800',
    indicador: 'bg-green-500',
    titulo: 'Conexión exitosa',
  },
  error: {
    contenedor: 'border-red-200 bg-red-50 text-red-800',
    indicador: 'bg-red-500',
    titulo: 'Error de conexión',
  },
}

function ConnectionCheck() {
  const [estado, setEstado] = useState('cargando')
  const [mensaje, setMensaje] = useState(MENSAJE_INICIAL)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true

    const verificarConexion = async () => {
      try {
        const { data } = await api.get('/api/health')

        if (!activo) return

        if (data?.status !== 'ok') {
          setEstado('error')
          setMensaje('La respuesta del backend no tiene el formato esperado. Revisa VITE_API_URL.')
          return
        }

        setEstado('exito')
        setMensaje(data.message ?? 'Backend conectado correctamente')
      } catch (error) {
        if (!activo) return

        setEstado('error')

        if (error.userMessage) {
          setMensaje(error.userMessage)
        } else if (error.response) {
          setMensaje(`El backend respondió con estado HTTP ${error.response.status}.`)
        } else if (error.code === 'ECONNABORTED') {
          setMensaje('La solicitud al backend agotó el tiempo de espera.')
        } else {
          setMensaje('No se pudo conectar con el backend. Verifica VITE_API_URL y que el servidor esté en ejecución.')
        }
      }
    }

    verificarConexion()

    return () => {
      activo = false
    }
  }, [intento])

  const estilo = ESTADOS[estado]

  const reintentar = () => {
    setEstado('cargando')
    setMensaje(MENSAJE_INICIAL)
    setIntento((valor) => valor + 1)
  }

  return (
    <main className="min-h-screen bg-emerald-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl p-10 shadow-xl text-center">
        <h1 className="text-4xl font-bold text-emerald-700">
          Insectopia
        </h1>

        <p className="mt-4 text-gray-600">
          React + Vite + Tailwind CSS
        </p>

        <p className="mt-2 text-green-600 font-semibold">
          Frontend configurado correctamente
        </p>

        <section
          className={`mt-8 rounded-xl border p-5 text-left ${estilo.contenedor}`}
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 shrink-0 rounded-full ${estilo.indicador}`} />
            <h2 className="font-semibold">{estilo.titulo}</h2>
          </div>

          <p className="mt-2 text-sm">{mensaje}</p>

          <p className="mt-1 text-xs opacity-75">
            Endpoint: GET /api/health
          </p>
        </section>

        <button
          type="button"
          onClick={reintentar}
          disabled={estado === 'cargando'}
          className="mt-6 w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {estado === 'cargando' ? 'Verificando...' : 'Verificar de nuevo'}
        </button>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ConnectionCheck />} />
      <Route path="/health" element={<ConnectionCheck />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.generales} />}>
        <Route element={<PrivateLayout />}>
          <Route path="/app" element={<Inicio />} />
          <Route path="/app/mensajes" element={<Mensajes />} />
          <Route path="/app/notificaciones" element={<Notificaciones />} />
          <Route path="/app/publicaciones/:id" element={<PublicacionDetalle />} />
          <Route path="/app/eventos" element={<SectionPlaceholder title="Eventos" />} />
          <Route path="/app/perfil" element={<SectionPlaceholder title="Mi perfil" />} />
          <Route path="/app/configuracion" element={<SectionPlaceholder title="Configuración" />} />
          <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.moderacion} />}>
            <Route path="/moderacion" element={<SectionPlaceholder title="Moderación" />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ROUTE_ROLES.administracion} />}>
            <Route path="/administracion" element={<SectionPlaceholder title="Administración" />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<main className="p-6">Página no encontrada.</main>} />
    </Routes>
  )
}
