import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import {
  REGISTRO_DISPONIBLE,
  normalizarErrorRegistro,
  registrarUsuario,
} from '../services/authService'
import {
  CAMPOS_VALIDABLES,
  VALORES_INICIALES,
  validarCampo,
  validarFormulario,
} from '../utils/validacionRegistro'
import './registro.css'

const prefijo = 'registro'

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
  if (campo === 'paisCodigo') {
    return String(valor).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
  }
  return valor
}

function hoyISO() {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
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

function IconoBuscar() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
      <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 15l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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

export default function Registro({ servicioDisponible = REGISTRO_DISPONIBLE }) {
  const navigate = useNavigate()
  const [valores, setValores] = useState({ ...VALORES_INICIALES })
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)

  function actualizarCampo(evento) {
    const { name, type, checked, value } = evento.target
    const valor = normalizarValor(name, type === 'checkbox' ? checked : value)
    const siguientes = { ...valores, [name]: valor }

    if (name === 'paisCodigo' && valor !== valores.paisCodigo) {
      siguientes.estadoRegion = ''
    }

    setValores(siguientes)
    setErrores((actuales) => {
      const proximos = { ...actuales, [name]: validarCampo(name, siguientes) }
      if (name === 'paisCodigo') {
        proximos.estadoRegion = validarCampo('estadoRegion', siguientes)
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
        'Registro no disponible: el backend aún no expone POST /api/auth/register. Se habilitará con la actividad 052.',
      )
      return
    }

    setEnviando(true)
    try {
      await registrarUsuario(valores)
      navigate('/login', { replace: true, state: { registroExitoso: true } })
    } catch (error) {
      const { message, fieldErrors } = normalizarErrorRegistro(error)
      setErrores((actuales) => ({ ...actuales, ...fieldErrors }))
      setErrorGeneral(message)
    } finally {
      setEnviando(false)
    }
  }

  const botonDeshabilitado = enviando || !servicioDisponible

  return (
    <main className="registro-shell relative min-h-screen bg-neutral-900 font-['Mulish'] text-white lg:grid lg:h-screen lg:grid-cols-2">
      <PanelInstitucional />

      <section className="relative flex justify-center overflow-y-auto bg-neutral-900 px-5 py-10 sm:px-8 lg:h-full lg:min-h-0 lg:min-w-0 lg:overflow-y-auto lg:px-16 lg:pb-16 lg:pt-20">
        <div className="absolute right-4 top-4 z-20 hidden items-center rounded-full border border-zinc-800 bg-zinc-900/90 px-1 py-1 shadow-lg backdrop-blur-md sm:flex lg:right-16">
          <div className="flex items-center gap-1 rounded-full bg-neutral-800 p-1">
            <span className="rounded-full bg-lime-400 px-3 py-1.5 text-xs font-semibold text-neutral-950">
              Registro
            </span>
            <button
              type="button"
              disabled
              title="Recuperación de contraseña disponible próximamente"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Recuperar Contraseña
            </button>
          </div>
          <span aria-hidden="true" className="mx-2 h-4 w-px bg-zinc-800" />
          <button
            type="button"
            disabled
            aria-label="Búsqueda no disponible"
            title="Búsqueda no disponible"
            className="flex size-8 items-center justify-center rounded-full text-gray-400 disabled:cursor-not-allowed"
          >
            <IconoBuscar />
          </button>
        </div>

        <div className="w-full min-w-0 max-w-[384px] lg:my-auto">
          <div className="flex flex-col items-start gap-1">
            <h2 className="font-['Plus_Jakarta_Sans'] text-3xl font-bold leading-9 text-white">
              Crea tu cuenta
            </h2>
            <p className="text-sm leading-5 text-gray-400">
              Comparte observaciones y conecta con personas que aman los insectos.
            </p>
          </div>

          {!servicioDisponible && (
            <div
              role="status"
              className="mt-5 rounded-lg border border-amber-700/60 bg-amber-950/40 px-3 py-2.5 text-xs leading-4 text-amber-200"
            >
              Registro no disponible: el backend aún no expone <strong>POST /api/auth/register</strong>.
              Se habilitará con la actividad 052.
            </div>
          )}

          <form onSubmit={manejarEnvio} noValidate className="mt-5 flex flex-col gap-4">
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
                onChange={actualizarCampo}
                onBlur={validarAlSalir}
                aria-invalid={Boolean(errores.correo)}
                aria-describedby={describir('correo', errores)}
                className={claseInput(Boolean(errores.correo))}
                placeholder="ej. correo@ejemplo.com"
              />
              <MensajeError campo="correo" errores={errores} />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Etiqueta htmlFor={idDe('fechaNacimiento')}>Fecha de nacimiento</Etiqueta>
                <input
                  id={idDe('fechaNacimiento')}
                  name="fechaNacimiento"
                  type="date"
                  lang="es"
                  max={hoyISO()}
                  value={valores.fechaNacimiento}
                  onChange={actualizarCampo}
                  onBlur={validarAlSalir}
                  aria-invalid={Boolean(errores.fechaNacimiento)}
                  aria-describedby={describir('fechaNacimiento', errores)}
                  className={claseInput(Boolean(errores.fechaNacimiento))}
                />
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
                <input
                  id={idDe('paisCodigo')}
                  name="paisCodigo"
                  type="text"
                  inputMode="text"
                  maxLength={2}
                  value={valores.paisCodigo}
                  onChange={actualizarCampo}
                  onBlur={validarAlSalir}
                  aria-invalid={Boolean(errores.paisCodigo)}
                  aria-describedby={describir('paisCodigo', errores, true)}
                  className={claseInput(Boolean(errores.paisCodigo), 'uppercase')}
                  placeholder="Código ISO"
                />
                <p id={idAyuda('paisCodigo')} className="text-xs leading-4 text-gray-500">
                  Catálogo pendiente del backend 052 · escribe el código ISO alfa-2.
                </p>
                <MensajeError campo="paisCodigo" errores={errores} />
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <Etiqueta htmlFor={idDe('estadoRegion')}>Estado / Región</Etiqueta>
                <input
                  id={idDe('estadoRegion')}
                  name="estadoRegion"
                  type="text"
                  maxLength={100}
                  disabled={!valores.paisCodigo}
                  value={valores.estadoRegion}
                  onChange={actualizarCampo}
                  onBlur={validarAlSalir}
                  aria-invalid={Boolean(errores.estadoRegion)}
                  aria-describedby={describir('estadoRegion', errores)}
                  className={claseInput(Boolean(errores.estadoRegion))}
                  placeholder={valores.paisCodigo ? 'Estado o región' : 'Primero elige país'}
                />
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
              {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
              {!enviando && (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-4">
                  <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </form>

          <p className="pt-1 text-center text-xs leading-4 text-gray-400">
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
