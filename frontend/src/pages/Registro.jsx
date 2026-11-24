import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../auth/useAuth'
import { ROLES } from '../auth/roles'
import {
  normalizarErrorRegistro,
  registrarUsuario,
} from '../services/authService'
import { obtenerPaises, obtenerRegiones } from '../services/catalogoService'
import {
  cancelarRegistroGoogle,
  completarRegistroGoogle,
  normalizarErrorGoogle,
} from '../services/googleService'
import { adaptarRespuestaLogin } from '../services/loginService'
import {
  CAMPOS_VALIDABLES,
  VALORES_INICIALES,
  validarCampo,
  validarFormulario,
} from '../utils/validacionRegistro'
import {
  CAMPOS_VALIDABLES_GOOGLE,
  VALORES_INICIALES_GOOGLE,
  validarCampoGoogle,
  validarFormularioGoogle,
} from '../utils/validacionRegistroGoogle'
import './registro.css'

const prefijo = 'registro'
const TOKEN_GOOGLE = /^[A-Za-z0-9_-]{1,128}$/
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

function idAyuda(campo) {
  return `${idDe(campo)}-ayuda`
}

function describir(campo, errores, conAyuda = false) {
  const ids = []
  if (conAyuda) ids.push(idAyuda(campo))
  if (errores[campo]) ids.push(idError(campo))
  return ids.length > 0 ? ids.join(' ') : undefined
}

function claseInput(hayError, extra = '') {
  return [
    'registro-campo h-10 w-full rounded-lg bg-neutral-800 px-3.5 text-sm text-white outline outline-1 -outline-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-60',
    hayError
      ? 'registro-campo--error outline-red-500 focus:outline-red-400'
      : 'outline-zinc-800 focus:outline-lime-400',
    extra,
  ].join(' ')
}

function normalizarValor(campo, valor) {
  if (campo === 'nombreUsuario') return String(valor).toLowerCase()
  return valor
}

function Etiqueta({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold uppercase leading-4 tracking-wide text-gray-300"
    >
      {children}
    </label>
  )
}

function MensajeError({ campo, errores }) {
  if (!errores[campo]) return null
  return (
    <p id={idError(campo)} className="mt-1 text-xs leading-4 text-red-400">
      {errores[campo]}
    </p>
  )
}

function IconoOjo({ tachado = false }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
      <path
        d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      {tachado && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" />}
    </svg>
  )
}

function IconoCheck() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4 text-emerald-500">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconoChevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4 text-gray-400">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PanelInstitucional() {
  return (
    <aside className="relative flex min-w-0 flex-col overflow-hidden border-b border-zinc-800 bg-neutral-950 px-6 py-8 lg:h-full lg:min-h-0 lg:border-b-0 lg:border-r lg:px-16 lg:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-lime-400/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-64 size-96 rounded-full bg-green-800/20 blur-3xl" />

      <div
        role="img"
        aria-label="Insectopia"
        className="relative inline-flex h-12 w-52 items-center gap-2.5 rounded-lg bg-neutral-900/80 px-2.5 ring-1 ring-zinc-800"
      >
        <img src={logo} alt="" className="size-9 shrink-0 object-contain" />
        <span aria-hidden="true" className="font-['Plus_Jakarta_Sans'] text-lg font-bold tracking-tight text-white">
          Insectopia
        </span>
      </div>

      <div className="relative flex w-full max-w-[512px] flex-1 flex-col justify-center py-10 lg:py-20">
        <div className="flex flex-col items-start gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-lime-400">
            <span aria-hidden="true" className="size-2 rounded-full bg-lime-400" />
            Red científica &amp; universitaria
          </div>

          <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold leading-tight tracking-tight text-white lg:text-5xl lg:leading-[48px]">
            Únete a la mayor red
            <br />
            de observación
            <br />
            entomológica
          </h1>

          <p className="max-w-[512px] text-base leading-6 text-gray-400">
            Catalogación taxonómica, identificación colaborativa con biólogos y
            <br className="hidden lg:block" /> archivo geoespacial de especies en tiempo real.
          </p>

          <div className="grid w-full grid-cols-3 gap-4 border-t border-neutral-800 pt-6">
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-white lg:text-2xl">Observa</p>
              <p className="text-xs leading-4 text-gray-400">Insectos y biodiversidad</p>
            </div>
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-white lg:text-2xl">Comparte</p>
              <p className="text-xs leading-4 text-gray-400">Tus hallazgos</p>
            </div>
            <div>
              <p className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-white lg:text-2xl">Conecta</p>
              <p className="text-xs leading-4 text-gray-400">Con la comunidad</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden justify-between gap-4 text-xs text-gray-500 lg:flex">
        <span>© Insectopia 2026. Todos los derechos reservados.</span>
        <span className="font-['Plus_Jakarta_Sans']">Biodiversidad &amp; Ciencia Abierta</span>
      </div>
    </aside>
  )
}

function RegistroGoogleNoDisponible({ mensaje }) {
  return (
    <main className="registro-shell relative min-h-screen bg-neutral-900 font-['Mulish'] text-white lg:grid lg:place-items-center">
      <section className="mx-auto w-full max-w-[520px] px-5 py-12 text-center sm:px-8">
        <img src={logo} alt="Insectopia" className="mx-auto mb-6 w-40 object-contain" />
        <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold">No pudimos continuar el registro</h2>
        <p role="alert" className="mt-3 text-sm leading-6 text-gray-400">
          {mensaje}
        </p>
        <Link to="/login" className="mt-6 inline-block rounded-lg bg-lime-400 px-5 py-2.5 text-sm font-bold text-neutral-950 hover:bg-lime-300">
          Volver al inicio de sesión
        </Link>
      </section>
    </main>
  )
}

export default function Registro({ modo = 'normal' }) {
  const navigate = useNavigate()
  const ubicacion = useLocation()
  const { setSession } = useAuth()

  const estadoGoogle = ubicacion.state?.registrationToken ? ubicacion.state : null
  const esGoogle = modo === 'google' || Boolean(estadoGoogle)
  const tokenGoogle = String(estadoGoogle?.registrationToken ?? '')
  const tokenGoogleValido = TOKEN_GOOGLE.test(tokenGoogle)
  const perfilGoogle = estadoGoogle?.perfil ?? {}
  const correoGoogle = String(perfilGoogle?.correo ?? perfilGoogle?.email ?? '').trim()
  const correoGoogleValido = !validarCampo('correo', { correo: correoGoogle })
  const registrarGoogle = esGoogle && tokenGoogleValido && correoGoogleValido

  const validar = esGoogle ? validarCampoGoogle : validarCampo
  const validarTodo = esGoogle ? validarFormularioGoogle : validarFormulario
  const camposValidables = esGoogle ? CAMPOS_VALIDABLES_GOOGLE : CAMPOS_VALIDABLES

  const valoresIniciales = registrarGoogle
    ? {
      ...VALORES_INICIALES_GOOGLE,
      correo: correoGoogle,
      nombre: String(perfilGoogle?.nombre ?? '').trim().slice(0, 100),
    }
    : { ...VALORES_INICIALES }

  const [valores, setValores] = useState(valoresIniciales)
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const fechaRef = useRef(null)
  const [paises, setPaises] = useState([])
  const [regiones, setRegiones] = useState([])
  const [cargandoPaises, setCargandoPaises] = useState(true)
  const [cargandoRegiones, setCargandoRegiones] = useState(false)
  const [errorCatalogo, setErrorCatalogo] = useState('')
  const [errorRegiones, setErrorRegiones] = useState('')
  const [intentosCatalogo, setIntentosCatalogo] = useState(0)

  useEffect(() => {
    if (esGoogle && !registrarGoogle) return undefined
    let activo = true
    obtenerPaises()
      .then((datos) => {
        if (!activo) return
        if (!Array.isArray(datos) || datos.length === 0) throw new Error('Catálogo vacío')
        setPaises(datos)
        setErrorCatalogo('')
      })
      .catch(() => {
        if (activo) {
          setErrorCatalogo('No se pudo cargar el catálogo de países. Comprueba el backend e inténtalo de nuevo.')
        }
      })
      .finally(() => {
        if (activo) setCargandoPaises(false)
      })
    return () => { activo = false }
  }, [intentosCatalogo, esGoogle, registrarGoogle])

  useEffect(() => {
    const codigo = valores.paisCodigo
    if (!codigo) return undefined
    let activo = true
    obtenerRegiones(codigo)
      .then((datos) => {
        if (!activo) return
        if (!Array.isArray(datos) || datos.length === 0) {
          setRegiones([])
          setErrorRegiones('Este país no tiene regiones verificadas. Selecciona otro país.')
          return
        }
        setRegiones(datos)
        setErrorRegiones('')
      })
      .catch(() => {
        if (!activo) return
        setErrorRegiones('No se pudieron cargar las regiones. Selecciona el país de nuevo.')
      })
      .finally(() => {
        if (activo) setCargandoRegiones(false)
      })
    return () => { activo = false }
  }, [valores.paisCodigo])

  function actualizarCampo(evento) {
    const { name, type, checked, value } = evento.target
    const valor = normalizarValor(name, type === 'checkbox' ? checked : value)
    const siguientes = { ...valores, [name]: valor }

    if (name === 'paisCodigo' && valor !== valores.paisCodigo) {
      siguientes.estadoRegion = ''
      setRegiones([])
      setErrorRegiones('')
      setCargandoRegiones(Boolean(valor))
    }

    setValores(siguientes)
    setErrores((actuales) => {
      const catalogo = { paises, regiones: name === 'paisCodigo' ? [] : regiones }
      const proximos = { ...actuales, [name]: validar(name, siguientes, catalogo) }
      if (name === 'paisCodigo') {
        proximos.estadoRegion = validar('estadoRegion', siguientes)
      }
      if (name === 'recibirSms' || name === 'recibirWhatsapp' || (esGoogle && name === 'telefono')) {
        proximos.telefono = validar('telefono', siguientes)
      }
      if (name === 'contrasena') {
        proximos.confirmarContrasena = validarCampo('confirmarContrasena', siguientes)
      }
      return proximos
    })
    setErrorGeneral('')
  }

  function validarAlSalir(evento) {
    const { name } = evento.target
    setErrores((actuales) => ({
      ...actuales,
      [name]: validar(name, valores, { paises, regiones }),
    }))
  }

  async function manejarEnvio(evento) {
    evento.preventDefault()

    if (esGoogle && !registrarGoogle) return

    const erroresEnvio = validarTodo(valores, { paises, regiones })
    setErrores(erroresEnvio)
    setErrorGeneral('')

    if (Object.keys(erroresEnvio).length > 0) {
      const primerCampo = camposValidables.find((campo) => erroresEnvio[campo])
      document.getElementById(idDe(primerCampo))?.focus()
      return
    }

    if (!paises.length || (cargandoRegiones && !regiones.length) || (errorRegiones && !regiones.length)) {
      setErrorGeneral('Espera a que se cargue el catálogo de ubicaciones o vuelve a intentarlo.')
      return
    }

    setEnviando(true)
    try {
      if (esGoogle) {
        const data = await completarRegistroGoogle(tokenGoogle, valores)
        const sesion = adaptarRespuestaLogin(data)
        setSession(sesion)
        navigate(DESTINOS_POR_ROL[sesion.user.role] ?? '/app', { replace: true })
      } else {
        await registrarUsuario(valores)
        navigate('/login', { replace: true, state: { registroExitoso: true } })
      }
    } catch (error) {
      const { message, fieldErrors } = esGoogle ? normalizarErrorGoogle(error) : normalizarErrorRegistro(error)
      setErrores((actuales) => ({ ...actuales, ...fieldErrors }))
      setErrorGeneral(message)
    } finally {
      setEnviando(false)
    }
  }

  async function cancelarRegistro() {
    if (cancelando) return
    setCancelando(true)
    try {
      await cancelarRegistroGoogle(tokenGoogle)
    } catch {
      // La navegación cancela el flujo aunque no podamos confirmar la invalidación remota.
    } finally {
      navigate('/login', { replace: true, state: { googleCancelado: true } })
    }
  }

  if (esGoogle && !registrarGoogle) {
    return (
      <RegistroGoogleNoDisponible
        mensaje={
          tokenGoogleValido
            ? 'El registro de Google no es válido. Inicia sesión con Google nuevamente.'
            : 'El registro temporal de Google no está disponible. Inicia sesión con Google nuevamente para continuar.'
        }
      />
    )
  }

  const botonDeshabilitado = enviando || cancelando

  return (
    <main className="registro-shell relative min-h-screen bg-neutral-900 font-['Mulish'] text-white lg:grid lg:h-screen lg:grid-cols-2">
      <PanelInstitucional />

      <section className="relative flex justify-center overflow-y-auto bg-neutral-900 px-5 py-10 sm:px-8 lg:h-full lg:min-h-0 lg:min-w-0 lg:overflow-y-auto lg:px-16 lg:pb-16 lg:pt-20">
        <div className="w-full min-w-0 max-w-[384px] lg:my-auto">
          <div className="flex flex-col items-start gap-1">
            <h2 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold leading-9 text-white">
              Crea tu cuenta
            </h2>
            <p className="text-sm leading-5 text-gray-400">
              Comparte observaciones y conecta con personas que aman los insectos.
            </p>
          </div>

          <form onSubmit={manejarEnvio} noValidate className="mt-5 flex flex-col gap-4">
            {errorCatalogo && (
              <div role="status" className="rounded-lg border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
                {errorCatalogo}{' '}
                <button type="button" className="underline" onClick={() => {
                  setCargandoPaises(true)
                  setIntentosCatalogo((intentos) => intentos + 1)
                }}>Reintentar</button>
              </div>
            )}
            {errorGeneral && (
              <div
                role="alert"
                className="rounded-lg border border-red-700/60 bg-red-950/40 px-3 py-2.5 text-xs leading-4 text-red-200"
              >
                {errorGeneral}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Etiqueta htmlFor={idDe('nombreUsuario')}>Nombre de usuario</Etiqueta>
              <div className="relative">
                <input
                  id={idDe('nombreUsuario')}
                  name="nombreUsuario"
                  type="text"
                  autoComplete="username"
                  value={valores.nombreUsuario}
                  onChange={actualizarCampo}
                  onBlur={validarAlSalir}
                  aria-invalid={Boolean(errores.nombreUsuario)}
                  aria-describedby={describir('nombreUsuario', errores, true)}
                  className={claseInput(Boolean(errores.nombreUsuario), 'pl-8')}
                  placeholder="maria_insectos"
                />
                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                  @
                </span>
              </div>
              <p id={idAyuda('nombreUsuario')} className="text-xs leading-4 text-gray-500">
                3–30 caracteres · minúsculas, números, _ y .
              </p>
              <MensajeError campo="nombreUsuario" errores={errores} />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Etiqueta htmlFor={idDe('nombre')}>Nombre completo</Etiqueta>
              <input
                id={idDe('nombre')}
                name="nombre"
                type="text"
                autoComplete="name"
                value={valores.nombre}
                onChange={actualizarCampo}
                onBlur={validarAlSalir}
                aria-invalid={Boolean(errores.nombre)}
                aria-describedby={describir('nombre', errores)}
                  className={claseInput(Boolean(errores.nombre))}
                  placeholder="ej. Mariana González"
                  maxLength={100}
              />
              <MensajeError campo="nombre" errores={errores} />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Etiqueta htmlFor={idDe('correo')}>Correo electrónico</Etiqueta>
              <input
                id={idDe('correo')}
                name="correo"
                type="email"
                autoComplete="email"
                value={valores.correo}
                onChange={esGoogle ? undefined : actualizarCampo}
                onBlur={esGoogle ? undefined : validarAlSalir}
                readOnly={esGoogle}
                aria-invalid={Boolean(errores.correo)}
                aria-describedby={describir('correo', errores, esGoogle)}
                className={claseInput(Boolean(errores.correo), esGoogle ? 'cursor-not-allowed text-gray-300' : '')}
                placeholder="ej. correo@ejemplo.com"
              />
              {esGoogle && (
                <p id={idAyuda('correo')} className="text-xs leading-4 text-gray-500">
                  Verificado por Google. No se puede modificar ni se envía desde este formulario.
                </p>
              )}
              <MensajeError campo="correo" errores={errores} />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Etiqueta htmlFor={idDe('fechaNacimiento')}>Fecha de nacimiento</Etiqueta>
                <div className="relative">
                  <input
                    ref={fechaRef}
                    id={idDe('fechaNacimiento')}
                    name="fechaNacimiento"
                    type="date"
                    lang="es"
                    value={valores.fechaNacimiento}
                    onChange={actualizarCampo}
                    onBlur={validarAlSalir}
                    aria-invalid={Boolean(errores.fechaNacimiento)}
                    aria-describedby={describir('fechaNacimiento', errores)}
                    className={claseInput(Boolean(errores.fechaNacimiento), 'min-w-0 pr-12')}
                  />
                  <button
                    type="button"
                    aria-label="Abrir calendario de fecha de nacimiento"
                    onClick={() => {
                      const input = fechaRef.current
                      if (typeof input?.showPicker === 'function') {
                        try {
                          input.showPicker()
                          return
                        } catch {
                          // Algunos navegadores no permiten abrir el selector nativo.
                        }
                      }
                      input?.focus()
                    }}
                    className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-gray-300 hover:text-lime-400 focus-visible:outline-2 focus-visible:outline-lime-400"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
                      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M7 3v4m10-4v4M3 10h18" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  </button>
                </div>
                <MensajeError campo="fechaNacimiento" errores={errores} />
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <Etiqueta htmlFor={idDe('genero')}>Género (opcional)</Etiqueta>
                <div className="relative">
                  <select
                    id={idDe('genero')}
                    name="genero"
                    value={valores.genero}
                    onChange={actualizarCampo}
                    onBlur={validarAlSalir}
                    className={claseInput(false, 'appearance-none pr-10')}
                  >
                    <option value="">Seleccionar</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Otro">Otro</option>
                    <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                  </select>
                  <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <IconoChevron />
                  </span>
                </div>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Etiqueta htmlFor={idDe('paisCodigo')}>País</Etiqueta>
                <select
                  id={idDe('paisCodigo')}
                  name="paisCodigo"
                  value={valores.paisCodigo}
                  onChange={actualizarCampo}
                  onBlur={validarAlSalir}
                  aria-busy={cargandoPaises}
                  aria-invalid={Boolean(errores.paisCodigo)}
                  aria-describedby={describir('paisCodigo', errores)}
                  className={claseInput(Boolean(errores.paisCodigo), 'appearance-none')}
                >
                  <option value="">{cargandoPaises ? 'Cargando países…' : errorCatalogo && !paises.length ? 'Países no disponibles' : 'Selecciona un país'}</option>
                  {paises.map((pais) => <option key={pais.codigo} value={pais.codigo}>{pais.nombre}</option>)}
                </select>
                <MensajeError campo="paisCodigo" errores={errores} />
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <Etiqueta htmlFor={idDe('estadoRegion')}>Estado / Región</Etiqueta>
                <select
                  id={idDe('estadoRegion')}
                  name="estadoRegion"
                  disabled={!valores.paisCodigo || cargandoRegiones || Boolean(errorRegiones)}
                  aria-busy={cargandoRegiones}
                  value={valores.estadoRegion}
                  onChange={actualizarCampo}
                  onBlur={validarAlSalir}
                  aria-invalid={Boolean(errores.estadoRegion)}
                  aria-describedby={[describir('estadoRegion', errores), errorRegiones ? 'registro-regiones-catalogo-error' : ''].filter(Boolean).join(' ') || undefined}
                  className={claseInput(Boolean(errores.estadoRegion), 'appearance-none')}
                >
                  <option value="">{cargandoRegiones ? 'Cargando regiones…' : 'Selecciona una región'}</option>
                  {regiones.map((region) => <option key={region.nombre} value={region.nombre}>{region.nombre}</option>)}
                </select>
                {errorRegiones && <p role="alert" id="registro-regiones-catalogo-error" className="text-xs text-red-400">{errorRegiones}</p>}
                <MensajeError campo="estadoRegion" errores={errores} />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Etiqueta htmlFor={idDe('telefono')}>Teléfono (opcional)</Etiqueta>
              <input
                id={idDe('telefono')}
                name="telefono"
                type="tel"
                autoComplete="tel"
                maxLength={20}
                value={valores.telefono}
                onChange={actualizarCampo}
                onBlur={validarAlSalir}
                  aria-invalid={Boolean(errores.telefono)}
                  aria-describedby={describir('telefono', errores)}
                className={claseInput(Boolean(errores.telefono))}
                  placeholder="Ej. +52 951 123 4567"
                />
                <MensajeError campo="telefono" errores={errores} />
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-300">
              <label htmlFor={idDe('recibirSms')} className="flex cursor-pointer items-center gap-2">
                <input
                  id={idDe('recibirSms')}
                  name="recibirSms"
                  type="checkbox"
                  checked={valores.recibirSms}
                  onChange={actualizarCampo}
                  className="size-4 rounded accent-lime-400"
                />
                Recibir SMS
              </label>
              <label htmlFor={idDe('recibirWhatsapp')} className="flex cursor-pointer items-center gap-2">
                <input
                  id={idDe('recibirWhatsapp')}
                  name="recibirWhatsapp"
                  type="checkbox"
                  checked={valores.recibirWhatsapp}
                  onChange={actualizarCampo}
                  className="size-4 rounded accent-lime-400"
                />
                Recibir WhatsApp
              </label>
            </div>

            {!esGoogle && (
            <>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Etiqueta htmlFor={idDe('contrasena')}>Contraseña</Etiqueta>
              <div className="relative">
                <input
                  id={idDe('contrasena')}
                  name="contrasena"
                  type={mostrarContrasena ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={valores.contrasena}
                  onChange={actualizarCampo}
                  onBlur={validarAlSalir}
                  aria-invalid={Boolean(errores.contrasena)}
                  aria-describedby={describir('contrasena', errores, true)}
                  className={claseInput(Boolean(errores.contrasena), 'pr-10')}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasena((visible) => !visible)}
                  aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-200 focus-visible:outline-2 focus-visible:outline-lime-400"
                >
                  <IconoOjo tachado={mostrarContrasena} />
                </button>
              </div>
              <p id={idAyuda('contrasena')} className="text-xs leading-4 text-gray-500">
                Mínimo 8 caracteres · una mayúscula · un número · un carácter especial.
              </p>
              <MensajeError campo="contrasena" errores={errores} />
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <Etiqueta htmlFor={idDe('confirmarContrasena')}>Confirmar contraseña</Etiqueta>
              <div className="relative">
                <input
                  id={idDe('confirmarContrasena')}
                  name="confirmarContrasena"
                  type={mostrarConfirmacion ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={valores.confirmarContrasena}
                  onChange={actualizarCampo}
                  onBlur={validarAlSalir}
                  aria-invalid={Boolean(errores.confirmarContrasena)}
                  aria-describedby={describir('confirmarContrasena', errores)}
                  className={claseInput(Boolean(errores.confirmarContrasena), 'pr-10')}
                  placeholder="••••••••••••"
                />
                {valores.confirmarContrasena && !errores.confirmarContrasena && (
                  <span aria-hidden="true" className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2">
                    <IconoCheck />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacion((visible) => !visible)}
                  aria-label={mostrarConfirmacion ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-200 focus-visible:outline-2 focus-visible:outline-lime-400"
                >
                  <IconoOjo tachado={mostrarConfirmacion} />
                </button>
              </div>
              <MensajeError campo="confirmarContrasena" errores={errores} />
            </div>
            </>
            )}

            <div className="flex flex-col gap-1">
              <div className="flex items-start gap-2.5">
                <input
                  id={idDe('aceptarTerminos')}
                  name="aceptarTerminos"
                  type="checkbox"
                  checked={valores.aceptarTerminos}
                  onChange={actualizarCampo}
                  onBlur={validarAlSalir}
                  aria-invalid={Boolean(errores.aceptarTerminos)}
                  aria-describedby={describir('aceptarTerminos', errores)}
                  className="mt-0.5 size-4 shrink-0 rounded accent-lime-400"
                />
                <label htmlFor={idDe('aceptarTerminos')} className="text-xs leading-4 text-gray-300">
                  Acepto los Términos de Servicio y el aviso de privacidad de Insectopia.
                </label>
              </div>
              <MensajeError campo="aceptarTerminos" errores={errores} />
            </div>

            <button
              type="submit"
              disabled={botonDeshabilitado}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-lime-400 text-sm font-bold text-neutral-950 shadow-sm transition hover:bg-lime-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Creando cuenta…' : esGoogle ? 'Crear cuenta con Google' : 'Crear cuenta'}
              {!enviando && (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
                  <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            {esGoogle && (
              <button
                type="button"
                onClick={cancelarRegistro}
                disabled={botonDeshabilitado}
                className="h-10 w-full rounded-lg border border-zinc-700 text-sm font-bold text-gray-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelando ? 'Cancelando…' : 'Cancelar y volver al inicio de sesión'}
              </button>
            )}
          </form>

          {esGoogle && (
            <p className="pt-1 text-center text-xs leading-4 text-gray-400">
              Tu cuenta se crea solo al completar este formulario. No se solicita ninguna contraseña.
            </p>
          )}

          <p className="pt-6 text-center text-xs leading-4 text-gray-400">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="font-semibold text-lime-400 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
