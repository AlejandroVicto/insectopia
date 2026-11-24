import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../auth/useAuth'
import { ROLES } from '../auth/roles'
import { adaptarRespuestaLogin } from '../services/loginService'
import {
  GOOGLE_REGISTRO_PATH,
  intercambiarCodigoGoogle,
  limpiarParametroCodigo,
} from '../services/googleService'
import './login.css'

const DESTINOS_POR_ROL = {
  [ROLES.USUARIO]: '/app',
  [ROLES.MODERADOR]: '/moderacion',
  [ROLES.ADMINISTRADOR]: '/administracion',
}

function destinoSeguro(role) {
  return DESTINOS_POR_ROL[role] ?? '/app'
}

function PANEL({ titulo, mensaje, error = false, cargando = false }) {
  return (
    <main className="login-shell min-h-dvh bg-zinc-900 font-['Mulish'] text-white lg:grid lg:h-dvh lg:place-items-center">
      <section className="mx-auto w-full max-w-[520px] px-5 py-12 sm:px-8">
        <img src={logo} alt="Insectopia" className="mx-auto mb-8 w-40 object-contain" />
        <div
          role={error ? 'alert' : 'status'}
          aria-busy={cargando}
          className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-6 py-7 text-center"
        >
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-stone-50">{titulo}</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{mensaje}</p>
          {!cargando && (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/login" className="rounded-md bg-lime-400 px-5 py-2.5 text-sm font-bold text-neutral-950 hover:bg-lime-300">
                Ir al inicio de sesión
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default function GoogleResultado() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const iniciado = useRef(false)
  const activo = useRef(false)
  const [vista, setVista] = useState({ titulo: 'Verificando Google', mensaje: 'Estamos validando la respuesta de Google…', cargando: true })

  useEffect(() => {
    activo.current = true
    const yaIniciado = iniciado.current
    iniciado.current = true

    const actualizar = (valor) => {
      if (activo.current) setVista(valor)
    }
    const fallar = (mensaje, titulo = 'No pudimos continuar') => actualizar({
      titulo,
      mensaje,
      error: true,
      cargando: false,
    })

    // En StrictMode el efecto se monta dos veces: solo el primero intercambia,
    // pero ambos montajes deben poder terminar la navegación.
    if (yaIniciado) return () => { activo.current = false }

    try {
      const code = new URLSearchParams(window.location.search).get('code')
      limpiarParametroCodigo()

      if (!code) {
        fallar('No recibimos una respuesta válida de Google. Vuelve a intentarlo desde el inicio de sesión.')
        return () => { activo.current = false }
      }

      intercambiarCodigoGoogle(code)
        .then((data) => {
          if (!activo.current) return
          switch (data?.estado) {
            case 'LOGIN_COMPLETO': {
              const sesion = adaptarRespuestaLogin(data.auth)
              setSession(sesion)
              const mensaje = data.mensaje || 'Sesión iniciada correctamente.'
              if (data.origen === 'vinculacion') {
                navigate('/app/configuracion?seccion=seguridad', {
                  replace: true,
                  state: { googleMensaje: mensaje },
                })
              } else {
                navigate(destinoSeguro(sesion.user.role), { replace: true })
              }
              return
            }
            case 'REGISTRO_PENDIENTE': {
              if (typeof data.registrationToken !== 'string' || !data.registrationToken.trim()) {
                fallar('El registro de Google no es válido. Inicia sesión con Google nuevamente.')
                return
              }
              navigate(GOOGLE_REGISTRO_PATH, {
                replace: true,
                state: { registrationToken: data.registrationToken, perfil: data.perfil ?? {} },
              })
              return
            }
            case 'VINCULACION_REQUERIDA':
              actualizar({
                titulo: 'Vinculación requerida',
                mensaje: data.mensaje || 'Ya existe una cuenta con ese correo. Inicia sesión con tu método actual y vincula Google desde Configuración.',
                error: false,
                cargando: false,
              })
              return
            case 'ERROR_CONTROLADO':
            default:
              fallar(data?.mensaje || 'No se pudo completar la autenticación con Google.')
          }
        })
        .catch(() => fallar('No se pudo verificar la respuesta de Google. Inténtalo de nuevo.'))
    } catch {
      fallar('No se pudo verificar la respuesta de Google. Inténtalo de nuevo.')
    }

    return () => { activo.current = false }
  }, [navigate, setSession])

  return <PANEL {...vista} />
}
