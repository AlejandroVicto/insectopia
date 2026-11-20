import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../auth/useAuth'
import { ROLES } from '../auth/roles'
import {
  LOGIN_DISPONIBLE,
  adaptarRespuestaLogin,
  iniciarSesion,
  normalizarErrorLogin,
} from '../services/loginService'
import './login.css'

const prefijo = 'login'
const CAMPOS_VALIDABLES = ['correo', 'contrasena']
const VALORES_INICIALES = { correo: '', contrasena: '' }

const DESTINOS_POR_ROL = {
  [ROLES.USUARIO]: '/app',
  [ROLES.MODERADOR]: '/moderacion',
  [ROLES.ADMINISTRADOR]: '/administracion',
}

function idDe(campo) {
  return `${prefijo}-${campo}`
}

function idError(campo) {
  return `${idDe(campo)}-error`
}

function describir(campo, errores) {
  return errores[campo] ? idError(campo) : undefined
}

function claseInput(hayError, extra = '') {
  return [
    'login-campo h-14 w-full rounded-md border px-4 text-base font-bold outline-none transition',
    'placeholder:font-bold focus:ring-2 focus:ring-lime-400/70 disabled:cursor-not-allowed disabled:opacity-60',
    hayError ? 'border-red-500 focus:border-red-500' : 'border-black/10 focus:border-lime-500',
    extra,
  ].join(' ')
}

function validarCampo(campo, valores) {
  if (campo === 'correo') {
    const correo = String(valores.correo ?? '').trim()
    if (!correo) return 'El correo electrónico es obligatorio.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return 'Ingresa un correo electrónico válido.'
  }

  if (campo === 'contrasena' && !valores.contrasena) {
    // Para login solo se exige presencia: no se aplican reglas de complejidad de registro.
    return 'La contraseña es obligatoria.'
  }

  return ''
}

function validarFormulario(valores) {
  const errores = {}
  for (const campo of CAMPOS_VALIDABLES) {
    const mensaje = validarCampo(campo, valores)
    if (mensaje) errores[campo] = mensaje
  }
  return errores
}

// Solo rutas internas: nunca se navega a una URL externa desde state.from.
function destinoSeguro(destino, role) {
  if (
    typeof destino === 'string' &&
    destino.startsWith('/') &&
    !destino.startsWith('//') &&
    !destino.includes('\\')
  ) {
    return destino
  }
  return DESTINOS_POR_ROL[role] ?? '/app'
}

function Etiqueta({ htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="text-base font-bold text-stone-50">
      {children}
    </label>
  )
}

function MensajeError({ campo, errores }) {
  if (!errores[campo]) return null
  return (
    <p id={idError(campo)} className="text-xs font-semibold text-red-400">
      {errores[campo]}
    </p>
  )
}

function IconoOjo({ visible }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      {!visible && <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  )
}

function IconoGoogle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1a6 6 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6A6 6 0 0 1 12 6Z" />
    </svg>
  )
}

function PanelInstitucional() {
  return (
    <aside className="relative flex min-w-0 flex-col items-center justify-center overflow-hidden border-b border-zinc-800 bg-zinc-900 px-6 py-8 lg:h-full lg:border-b-0 lg:border-r lg:border-neutral-700 lg:px-12 lg:py-8 xl:py-12">
      <div aria-hidden="true" className="absolute -left-24 -top-24 size-80 rounded-full bg-lime-400/10 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-24 size-80 rounded-full bg-green-800/20 blur-3xl" />
      <img
        src={logo}
        alt=""
        className="relative z-10 max-h-[36dvh] w-full max-w-[180px] object-contain sm:max-w-[260px] lg:max-h-[46dvh] lg:max-w-[511px]"
      />
      <p className="relative z-10 mt-4 font-['Plus_Jakarta_Sans'] text-4xl font-extrabold tracking-tight text-white lg:mt-6 lg:text-5xl">
        Insectopia
      </p>
    </aside>
  )
}

function BotonProveedor({ nombre, children }) {
  const mensaje = `${nombre} no disponible: inicio de sesión externo aún no implementado.`
  return (
    <button
      type="button"
      disabled
      aria-label={mensaje}
      title={mensaje}
      className="flex h-14 w-full min-w-0 items-center justify-center gap-3 rounded-md border border-neutral-200 bg-gray-100 px-4 text-base font-bold text-black/60 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {children}
      <span aria-hidden="true">{nombre}</span>
    </button>
  )
}

export default function Login({ servicioDisponible = LOGIN_DISPONIBLE }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSession } = useAuth()
  const [valores, setValores] = useState({ ...VALORES_INICIALES })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mostrarContrasena, setMostrarContrasena] = useState(false)

  function actualizarCampo(evento) {
    const { name, value } = evento.target
    const valor = name === 'correo' ? value.trim() : value
    const siguientes = { ...valores, [name]: valor }

    setValores(siguientes)
    setErrores((actuales) => ({
      ...actuales,
      [name]: validarCampo(name, siguientes),
    }))
    setErrorGeneral('')
  }

  function validarAlSalir(evento) {
    const { name } = evento.target
    setErrores((actuales) => ({
      ...actuales,
      [name]: validarCampo(name, valores),
    }))
  }

  async function manejarEnvio(evento) {
    evento.preventDefault()

    const erroresEnvio = validarFormulario(valores)
    setErrores(erroresEnvio)
    setErrorGeneral('')

    if (Object.keys(erroresEnvio).length > 0) {
      const primerCampo = CAMPOS_VALIDABLES.find((campo) => erroresEnvio[campo])
      document.getElementById(idDe(primerCampo))?.focus()
      return
    }

    if (!servicioDisponible) {
      setErrorGeneral(
        'Inicio de sesión no disponible: el backend aún no expone POST /api/auth/login. Se habilitará con la actividad 054.',
      )
      return
    }

    setEnviando(true)
    try {
      const respuesta = await iniciarSesion(valores)
      const sesion = adaptarRespuestaLogin(respuesta?.data)
      setSession(sesion)
      navigate(destinoSeguro(location.state?.from, sesion.user.role), { replace: true })
    } catch (error) {
      const { message, fieldErrors } = normalizarErrorLogin(error)
      setErrores((actuales) => ({ ...actuales, ...fieldErrors }))
      setErrorGeneral(message)
    } finally {
      setEnviando(false)
    }
  }

  const botonDeshabilitado = enviando || !servicioDisponible

  return (
    <main className="login-shell min-h-dvh bg-zinc-900 font-['Mulish'] text-white lg:grid lg:h-dvh lg:grid-cols-[55%_45%]">
      <PanelInstitucional />

      <section className="flex min-w-0 justify-center overflow-visible bg-zinc-900 px-5 py-8 sm:px-8 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:px-12 lg:py-8 xl:py-10">
        <div className="w-full min-w-0 max-w-[500px] lg:my-auto">
          <h1 className="text-4xl font-normal text-stone-50">Bienvenido</h1>

          {!servicioDisponible && (
            <div
              role="status"
              className="mt-4 rounded-md border border-amber-700/60 bg-amber-950/40 px-3 py-2.5 text-xs leading-5 text-amber-200"
            >
              Inicio de sesión no disponible: el backend aún no expone{' '}
              <strong>POST /api/auth/login</strong>. Se habilitará con la actividad 054.
            </div>
          )}

          <form onSubmit={manejarEnvio} noValidate className="mt-6 flex flex-col gap-4">
            {errorGeneral && (
              <div
                role="alert"
                className="rounded-md border border-red-700/60 bg-red-950/40 px-3 py-2.5 text-sm text-red-200"
              >
                {errorGeneral}
              </div>
            )}

            <div className="flex min-w-0 flex-col gap-2">
              <Etiqueta htmlFor={idDe('correo')}>Correo</Etiqueta>
              <input
                id={idDe('correo')}
                name="correo"
                type="email"
                autoComplete="email"
                value={valores.correo}
                onChange={actualizarCampo}
                onBlur={validarAlSalir}
                aria-invalid={Boolean(errores.correo)}
                aria-describedby={describir('correo', errores)}
                placeholder="Ingresa tu correo"
                className={claseInput(Boolean(errores.correo))}
              />
              <MensajeError campo="correo" errores={errores} />
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex min-w-0 items-baseline justify-between gap-4">
                <Etiqueta htmlFor={idDe('contrasena')}>Contraseña</Etiqueta>
                <Link
                  to="/recuperar-contrasena"
                  className="text-sm font-bold text-stone-50 underline decoration-lime-400/70 underline-offset-4 hover:text-lime-300"
                >
                  ¿Has olvidado tu contraseña?
                </Link>
              </div>
              <div className="relative min-w-0">
                <input
                  id={idDe('contrasena')}
                  name="contrasena"
                  type={mostrarContrasena ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={valores.contrasena}
                  onChange={actualizarCampo}
                  onBlur={validarAlSalir}
                  aria-invalid={Boolean(errores.contrasena)}
                  aria-describedby={describir('contrasena', errores)}
                  placeholder="Ingresa tu contraseña"
                  className={claseInput(Boolean(errores.contrasena), 'pr-14')}
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasena((visible) => !visible)}
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={mostrarContrasena}
                  className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-zinc-600 hover:text-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-lime-500"
                >
                  <IconoOjo visible={mostrarContrasena} />
                </button>
              </div>
              <MensajeError campo="contrasena" errores={errores} />
            </div>

            <button
              type="submit"
              disabled={botonDeshabilitado}
              className="h-14 w-full rounded-md bg-gradient-to-r from-lime-500 to-stone-600 text-base font-bold text-white shadow-lg transition hover:brightness-110 focus:outline-2 focus:outline-offset-2 focus:outline-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-base font-bold text-stone-50">O inicia sesión con</p>
            <div className="mt-4 w-full">
              <BotonProveedor nombre="Google">
                <IconoGoogle />
              </BotonProveedor>
            </div>
            <p role="status" className="mt-3 text-xs text-zinc-400">
              Google estará disponible cuando se integre OAuth.
            </p>
          </div>

          <p className="mt-6 text-center text-base font-bold text-stone-50">
            ¿No tienes una cuenta?{' '}
            <Link to="/registro" className="text-lime-500 hover:text-lime-400 hover:underline">
              Crea una ahora
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
