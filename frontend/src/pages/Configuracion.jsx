import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ROLES } from '../auth/roles'
import { adaptarPerfil } from '../adapters/perfilAdapter'
import { actualizarMiPerfil, consultarConfiguracionPerfil, consultarMiPerfil, subirAvatar, quitarAvatar } from '../services/perfilService'
import { obtenerPaises, obtenerRegiones } from '../services/catalogoService'
import { mensajeErrorApi } from '../services/erroresApi'
import {
  consultarVinculoGoogle,
  desvincularGoogle,
  iniciarVinculacionGoogle,
  normalizarErrorGoogle,
  obtenerConfiguracionGoogle,
  redirigirAGoogle,
} from '../services/googleService'
import { LIMITES, TIPOS_IMAGEN_ACEPTADOS } from '../constants/modalesPublicaciones'
import Avatar from '../components/inicio/Avatar'
import CambiarContrasenaModal from '../components/seguridad/CambiarContrasenaModal'
import {
  VALORES_INICIALES_CONFIGURACION,
  validarCampoConfiguracion,
  validarCorreoConfiguracion,
  validarFormularioConfiguracion,
} from '../utils/validacionConfiguracion'
import './configuracion.css'

const CAMPOS_EDITABLES = [
  'nombre', 'nombreUsuario', 'biografia', 'genero',
  'paisCodigo', 'estadoRegion', 'fechaNacimiento', 'telefono',
]
const ACEPTAR_IMAGEN = 'image/jpeg,image/png'
const TEXTO_PENDIENTE = 'Los cambios se envían al servidor al guardar. Si no se confirman, permanecen solo en esta pantalla.'

function idCampo(campo) {
  return `config-${campo}`
}

function idError(campo) {
  return `${idCampo(campo)}-error`
}

function idAyuda(campo) {
  return `${idCampo(campo)}-ayuda`
}

function describir(campo, error, ayuda) {
  return [ayuda && idAyuda(campo), error && idError(campo)].filter(Boolean).join(' ') || undefined
}

function propsCampo(campo, error, ayuda) {
  return {
    id: idCampo(campo),
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describir(campo, error, ayuda),
  }
}

function Mensaje({ campo, error, ayuda }) {
  return <>
    {ayuda && <p id={idAyuda(campo)} className="mt-1 text-[11px] leading-4 text-[var(--conf-muted)]">{ayuda}</p>}
    {error && <p id={idError(campo)} role="alert" className="mt-1 text-[11px] leading-4 text-red-400">{error}</p>}
  </>
}

function aniosDesde(fecha) {
  if (!fecha || Number.isNaN(Date.parse(fecha))) return '—'
  const milisegundos = Date.now() - Date.parse(fecha)
  if (!Number.isFinite(milisegundos) || milisegundos < 0) return '—'
  return String(Math.floor(milisegundos / (365.25 * 24 * 60 * 60 * 1000)))
}

function Tab({ id, seccion, actual, onSelect, children }) {
  const seleccionada = seccion === actual
  return <button
    type="button"
    id={id}
    role="tab"
    aria-selected={seleccionada}
    aria-controls={`panel-${seccion}`}
    tabIndex={seleccionada ? 0 : -1}
    onClick={() => onSelect(seccion)}
    className="configuracion-tab"
  >{children}</button>
}

function Campo({ campo, etiqueta, error, ayuda, children, className = '' }) {
  return <div className={className}>
    <label htmlFor={idCampo(campo)} className="configuracion-label">{etiqueta}</label>
    <div className="mt-2">{children}</div>
    <Mensaje campo={campo} error={error} ayuda={ayuda} />
  </div>
}

function CampoIdentidad({ campo, etiqueta, error, prefijo, children }) {
  return <div className="min-w-0">
    <label htmlFor={idCampo(campo)} className="configuracion-label">{etiqueta}</label>
    <div className={`configuracion-identidad-input mt-2${error ? ' configuracion-identidad-input--error' : ''}`}>
      {prefijo && <span aria-hidden="true" className="configuracion-identidad-prefijo">{prefijo}</span>}
      {children}
    </div>
    <Mensaje campo={campo} error={error} />
  </div>
}

export default function Configuracion() {
  const { user, token, setSession, clearSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const seccion = params.get('seccion') === 'seguridad' ? 'seguridad' : 'perfil'
  const [estado, setEstado] = useState('cargando')
  const [perfil, setPerfil] = useState(null)
  const [correoRespaldo, setCorreoRespaldo] = useState('')
  const [intento, setIntento] = useState(0)
  const [valores, setValores] = useState({ ...VALORES_INICIALES_CONFIGURACION })
  const [inicial, setInicial] = useState({ ...VALORES_INICIALES_CONFIGURACION })
  const [tocados, setTocados] = useState({})
  const [errores, setErrores] = useState({})
  const [paises, setPaises] = useState([])
  const [regionesEstado, setRegionesEstado] = useState({ codigo: '', error: '', datos: [] })
  const [errorCatalogo, setErrorCatalogo] = useState('')
  const [mensajeCompartir, setMensajeCompartir] = useState('')
  const [fotoInicial, setFotoInicial] = useState(null)
  const [fotoActual, setFotoActual] = useState(null)
  const [archivoFoto, setArchivoFoto] = useState(null)
  const [vistaPrevia, setVistaPrevia] = useState(null)
  const [errorFoto, setErrorFoto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState('')
  const [mensajeGuardado, setMensajeGuardado] = useState('')
  const [modalContrasena, setModalContrasena] = useState(false)
  const [contrasenaActualizada, setContrasenaActualizada] = useState('')
  const [googleEstado, setGoogleEstado] = useState('cargando')
  const [googleVinculado, setGoogleVinculado] = useState(false)
  const [googleMensaje, setGoogleMensaje] = useState(location.state?.googleMensaje ?? '')
  const [googleAccion, setGoogleAccion] = useState('')
  const regionRequest = useRef(0)
  const archivoFotoRef = useRef(null)
  const guardandoRef = useRef(false)

  const correo = user?.email || correoRespaldo
  const errorCorreo = validarCorreoConfiguracion(correo)
  const codigoPais = /^[A-Z]{2}$/.test(valores.paisCodigo) ? valores.paisCodigo : ''
  const vigente = regionesEstado.codigo === codigoPais
  const regiones = useMemo(() => (vigente ? regionesEstado.datos : []), [vigente, regionesEstado.datos])
  const errorRegiones = vigente ? regionesEstado.error : ''
  const cargandoRegiones = Boolean(codigoPais) && !vigente
  const catalogo = useMemo(() => ({ paises, regiones }), [paises, regiones])
  const fotoPendiente = Boolean(archivoFoto) || fotoActual !== fotoInicial
  const hayCambios = fotoPendiente || CAMPOS_EDITABLES.some((campo) => valores[campo] !== inicial[campo])

  useEffect(() => {
    let activo = true
    const controller = new AbortController()

    function aplicar(datos, resumen) {
      if (!activo) return
      const adaptado = adaptarPerfil(datos)
      const siguiente = {
        ...VALORES_INICIALES_CONFIGURACION,
        nombre: adaptado.nombre,
        nombreUsuario: adaptado.nombreUsuario,
        biografia: adaptado.biografia ?? '',
        genero: datos.genero ?? '',
        paisCodigo: adaptado.paisCodigo ?? '',
        estadoRegion: adaptado.estadoRegion ?? '',
        fechaNacimiento: datos.fechaNacimiento ?? '',
        telefono: datos.telefono ?? '',
      }
      setPerfil({ ...adaptado, fechaRegistro: resumen?.fechaRegistro,
        seguidores: resumen?.totalSeguidores, publicaciones: resumen?.totalPublicaciones })
      setCorreoRespaldo(datos.correo ?? '')
      setValores(siguiente)
      setInicial(siguiente)
      setTocados({})
      setErrores({})
      setFotoInicial(adaptado.fotoPerfil)
      setFotoActual(adaptado.fotoPerfil)
      setArchivoFoto(null)
      setVistaPrevia(null)
      setErrorFoto('')
      setErrorGuardado('')
      setMensajeGuardado('')
      setEstado('success')
    }

    Promise.all([
      consultarConfiguracionPerfil({ signal: controller.signal }),
      consultarMiPerfil({ signal: controller.signal }).catch(() => ({ data: null })),
    ]).then(([{ data }, { data: resumen }]) => aplicar(data, resumen))
      .catch(() => { if (activo && !controller.signal.aborted) setEstado('error') })

    return () => {
      activo = false
      controller.abort()
    }
  }, [intento])

  useEffect(() => {
    let activo = true
    obtenerPaises()
      .then((datos) => {
        if (!activo) return
        if (!Array.isArray(datos) || !datos.length) throw new Error('Catálogo vacío')
        setPaises(datos)
        setErrorCatalogo('')
      })
      .catch(() => { if (activo) setErrorCatalogo('Catálogo de países no disponible.') })
    return () => { activo = false }
  }, [])

  useEffect(() => {
    if (!codigoPais) {
      regionRequest.current += 1
      return undefined
    }
    const actual = ++regionRequest.current
    let activo = true
    obtenerRegiones(codigoPais)
      .then((datos) => {
        if (!activo || actual !== regionRequest.current) return
        setRegionesEstado({ codigo: codigoPais, error: '', datos: Array.isArray(datos) ? datos : [] })
      })
      .catch(() => {
        if (!activo || actual !== regionRequest.current) return
        setRegionesEstado({ codigo: codigoPais, error: 'Regiones no disponibles para el país seleccionado.', datos: [] })
      })
    return () => { activo = false }
  }, [codigoPais])

  useEffect(() => {
    if (seccion !== 'seguridad') return undefined
    let activo = true
    const controller = new AbortController()
    setGoogleEstado('cargando')
    Promise.all([
      obtenerConfiguracionGoogle({ senal: controller.signal }),
      consultarVinculoGoogle({ senal: controller.signal }),
    ]).then(([config, vinculo]) => {
      if (!activo) return
      setGoogleVinculado(vinculo.vinculado)
      setGoogleEstado(config.enabled ? 'listo' : 'no_disponible')
    }).catch(() => {
      if (activo && !controller.signal.aborted) setGoogleEstado('error')
    })
    return () => {
      activo = false
      controller.abort()
    }
  }, [seccion])

  useEffect(() => () => {
    if (vistaPrevia && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(vistaPrevia)
  }, [vistaPrevia])

  const validar = useCallback((campo, valoresActuales = valores) => {
    setErrores((prev) => ({ ...prev, [campo]: validarCampoConfiguracion(campo, valoresActuales, catalogo) }))
  }, [catalogo, valores])

  function cambiar(campo, valor) {
    const normalizado = campo === 'nombreUsuario' ? String(valor).toLowerCase() : valor
    const siguiente = { ...valores, [campo]: normalizado }
    if (campo === 'paisCodigo' && normalizado !== valores.paisCodigo) {
      siguiente.estadoRegion = ''
    }
    setValores(siguiente)
    setErrorGuardado('')
    setMensajeGuardado('')
    if (tocados[campo]) validar(campo, siguiente)
    if (siguiente.estadoRegion !== valores.estadoRegion) {
      setErrores((prev) => ({ ...prev, estadoRegion: undefined }))
      setTocados((prev) => ({ ...prev, estadoRegion: false }))
    }
  }

  function marcar(campo) {
    setTocados((prev) => ({ ...prev, [campo]: true }))
    validar(campo)
  }

  function seleccionarFoto(event) {
    const archivo = event.target.files?.[0] ?? null
    if (!archivo) return
    if (!TIPOS_IMAGEN_ACEPTADOS.includes(archivo.type)
      || archivo.size === 0
      || archivo.size > LIMITES.imagenMaxBytes) {
      setErrorFoto('Selecciona una imagen JPG o PNG de hasta 5 MB que no esté vacía.')
      if (archivoFotoRef.current) archivoFotoRef.current.value = ''
      return
    }
    const url = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(archivo) : null
    setErrorFoto('')
    setErrorGuardado('')
    setMensajeGuardado('')
    setArchivoFoto(archivo)
    setVistaPrevia(url)
    setFotoActual(url ?? fotoInicial)
  }

  function cancelarFoto() {
    setArchivoFoto(null)
    setVistaPrevia(null)
    setFotoActual(fotoInicial)
    setErrorFoto('')
    if (archivoFotoRef.current) archivoFotoRef.current.value = ''
  }

  function quitarFoto() {
    setArchivoFoto(null)
    setVistaPrevia(null)
    setFotoActual(null)
    setErrorFoto('')
    if (archivoFotoRef.current) archivoFotoRef.current.value = ''
  }

  async function guardar(event) {
    event.preventDefault()
    if (guardandoRef.current) return
    setErrorGuardado('')
    setMensajeGuardado('')

    const hayDatos = CAMPOS_EDITABLES.some((campo) => valores[campo] !== inicial[campo])
    if (hayDatos && cargandoRegiones) {
      setErrorGuardado('Espera a que terminen de cargar las regiones antes de guardar.')
      return
    }

    const nuevosErrores = hayDatos ? validarFormularioConfiguracion(valores, catalogo) : {}
    if (errorRegiones && valores.estadoRegion) {
      nuevosErrores.estadoRegion = 'Selecciona una región válida para el país indicado.'
    }
    if (Object.keys(nuevosErrores).length) {
      setErrores(nuevosErrores)
      setTocados(Object.keys(VALORES_INICIALES_CONFIGURACION)
        .reduce((acc, campo) => ({ ...acc, [campo]: true }), {}))
      setErrorGuardado('Revisa los campos marcados antes de guardar.')
      return
    }

    if (!hayCambios) return
    guardandoRef.current = true
    setGuardando(true)
    let datosConfirmados = false
    try {
      if (hayDatos) {
        const { data } = await actualizarMiPerfil(valores)
        const confirmado = adaptarPerfil(data)
        const siguiente = {
          ...valores, nombre: confirmado.nombre, nombreUsuario: confirmado.nombreUsuario,
          biografia: data.biografia ?? '', genero: data.genero ?? '', paisCodigo: data.paisCodigo,
          estadoRegion: data.estadoRegion, fechaNacimiento: data.fechaNacimiento, telefono: data.telefono ?? '',
        }
        setValores(siguiente)
        setInicial(siguiente)
        setPerfil((prev) => ({ ...prev, ...confirmado }))
        if (user && token) setSession({ token, user: { ...user, name: confirmado.nombre } })
        datosConfirmados = true
      }
      if (fotoPendiente) {
        const respuesta = archivoFoto ? await subirAvatar(archivoFoto) : await quitarAvatar()
        const urlConfirmada = archivoFoto ? adaptarPerfil(respuesta.data).fotoPerfil : null
        setFotoInicial(urlConfirmada)
        setFotoActual(urlConfirmada)
        setArchivoFoto(null)
        setVistaPrevia(null)
        if (archivoFotoRef.current) archivoFotoRef.current.value = ''
        setPerfil((prev) => ({ ...prev, fotoPerfil: urlConfirmada }))
        if (user && token) setSession({ token, user: { ...user, name: valores.nombre, avatarUrl: urlConfirmada } })
      }
      setMensajeGuardado('Tus cambios se guardaron.')
    } catch (error) {
      const status = error?.response?.status
      if (!datosConfirmados && Array.isArray(error?.response?.data?.details)) {
        const porCampo = Object.fromEntries(error.response.data.details
          .filter(({ field }) => CAMPOS_EDITABLES.includes(field))
          .map(({ field, message }) => [field, message]))
        setErrores(porCampo)
        setTocados((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(porCampo).map((campo) => [campo, true])) }))
      }
      setErrorGuardado(datosConfirmados && fotoPendiente
        ? `Los datos se guardaron, pero la foto no. Puedes reintentar solo la fotografía. ${mensajeErrorApi(error, '')}`
        : [404, 405].includes(status)
        ? 'La actualización de perfil aún no está disponible en el servidor. Tus cambios siguen pendientes.'
        : mensajeErrorApi(error, 'No se pudo guardar. Tus cambios siguen pendientes.'))
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  function cancelar() {
    setValores({ ...inicial })
    setErrores({})
    setTocados({})
    setErrorGuardado('')
    setMensajeGuardado('')
    cancelarFoto()
  }

  function seleccionarSeccion(siguiente) {
    const next = new URLSearchParams(params)
    next.set('seccion', siguiente)
    setParams(next, { replace: true })
  }

  function alTeclearTabs(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    seleccionarSeccion(seccion === 'perfil' ? 'seguridad' : 'perfil')
  }

  function irAReautenticar() {
    setModalContrasena(false)
    clearSession()
    navigate('/login', {
      replace: true,
      state: { from: location.pathname + location.search + location.hash },
    })
  }

  async function vincularGoogle() {
    if (googleAccion) return
    setGoogleAccion('vinculando')
    setGoogleMensaje('')
    try {
      const { authorizationUrl } = await iniciarVinculacionGoogle()
      redirigirAGoogle(authorizationUrl)
    } catch (error) {
      setGoogleMensaje(normalizarErrorGoogle(error).message)
      setGoogleAccion('')
    }
  }

  async function desvincularCuentaGoogle() {
    if (googleAccion) return
    setGoogleAccion('desvinculando')
    setGoogleMensaje('')
    try {
      await desvincularGoogle()
      setGoogleVinculado(false)
      setGoogleMensaje('La identidad de Google se desvinculó correctamente.')
    } catch (error) {
      setGoogleMensaje(normalizarErrorGoogle(error).message)
    } finally {
      setGoogleAccion('')
    }
  }

  async function compartir() {
    if (!navigator.clipboard?.writeText) {
      setMensajeCompartir('Copia el enlace desde la barra del navegador.')
      return
    }
    try {
      await navigator.clipboard.writeText(window.location.href)
      setMensajeCompartir('Enlace del perfil copiado.')
    } catch {
      setMensajeCompartir('No se pudo copiar el enlace. Cópialo desde la barra del navegador.')
    }
  }

  const avatar = fotoActual
  const nombre = valores.nombre || user?.name || 'Tu perfil'
  const alias = valores.nombreUsuario || perfil?.nombreUsuario || 'usuario'
  const correoMostrado = correo || 'Correo no disponible en la sesión'

  return <div className="configuracion">
    <div className="configuracion-contenedor">
      <div className="configuracion-encabezado">
        <div>
          <p className="configuracion-label uppercase tracking-widest text-[var(--conf-lime)]">TU CUENTA</p>
          <h1>Configuración</h1>
        </div>
        <Link to="/app/perfil" className="configuracion-secondary">← Volver a Mi perfil</Link>
      </div>

      <div role="tablist" aria-label="Secciones de configuración" onKeyDown={alTeclearTabs} className="configuracion-tabs">
        <Tab id="tab-perfil" seccion="perfil" actual={seccion} onSelect={seleccionarSeccion}>Perfil</Tab>
        <Tab id="tab-seguridad" seccion="seguridad" actual={seccion} onSelect={seleccionarSeccion}>Seguridad</Tab>
      </div>


      {estado === 'cargando' && <div role="status" className="configuracion-card configuracion-card--seccion text-sm text-[var(--conf-muted)]">
        Cargando tu configuración...
        <div aria-hidden="true" className="mt-4 h-9 rounded-xl bg-[var(--conf-soft)]" />
        <div aria-hidden="true" className="mt-3 h-20 rounded-xl bg-[var(--conf-soft)]" />
      </div>}

      {estado === 'error' && <div role="alert" className="configuracion-card configuracion-card--seccion">
        <strong>No pudimos cargar tu configuración</strong>
        <p className="mt-2 text-xs text-[var(--conf-muted)]">Comprueba tu conexión e inténtalo de nuevo.</p>
        <button type="button" className="configuracion-secondary mt-4" onClick={() => {
          setEstado('cargando')
          setIntento((n) => n + 1)
        }}>Reintentar</button>
      </div>}

      {estado === 'success' && <div className="configuracion-canvas">
        <div className="configuracion-cuerpo">
          {seccion === 'perfil' && <section className="configuracion-card configuracion-card--seccion" aria-label="Foto y datos de perfil">
            <div className="configuracion-perfil-cabecera">
            <span className="configuracion-perfil-avatar">
              {vistaPrevia
                ? <img src={vistaPrevia} alt="Vista previa de tu nueva foto de perfil" className="size-full object-cover" />
                : <Avatar name={nombre} src={avatar} />}
            </span>
            <div className="configuracion-perfil-datos">
              <div className="configuracion-grupo">
                <CampoIdentidad campo="nombre" etiqueta="Nombre" error={errores.nombre}>
                  <input {...propsCampo('nombre', errores.nombre)} className="configuracion-identidad-control" maxLength={100}
                    value={valores.nombre} onChange={(event) => cambiar('nombre', event.target.value)} onBlur={() => marcar('nombre')} />
                </CampoIdentidad>
                <CampoIdentidad campo="nombreUsuario" etiqueta="Nombre de usuario" error={errores.nombreUsuario} prefijo="@">
                  <input {...propsCampo('nombreUsuario', errores.nombreUsuario)} className="configuracion-identidad-control min-w-0 flex-1 font-bold" maxLength={30}
                    value={valores.nombreUsuario} onChange={(event) => cambiar('nombreUsuario', event.target.value)} onBlur={() => marcar('nombreUsuario')} />
                </CampoIdentidad>
              </div>
              <input ref={archivoFotoRef} id="config-foto" type="file" accept={ACEPTAR_IMAGEN} className="sr-only"
                aria-describedby="foto-ayuda" onChange={seleccionarFoto} />
              <div className="configuracion-acciones-foto">
                <button type="button" className="configuracion-primary" aria-describedby="foto-ayuda"
                  onClick={() => archivoFotoRef.current?.click()}>Cambiar foto</button>
                {(archivoFoto || (fotoInicial && fotoActual !== fotoInicial))
                  && <button type="button" className="configuracion-secondary" onClick={cancelarFoto}>
                    {archivoFoto ? 'Cancelar selección' : 'Recuperar imagen anterior'}
                  </button>}
                {fotoActual && <button type="button" className="configuracion-secondary" onClick={quitarFoto}>Quitar imagen</button>}
              </div>
              <p id="foto-ayuda" className="mt-2 text-[11px] leading-4 text-[var(--conf-muted)]">
                JPG o PNG de hasta 5 MB. La imagen se enviará al guardar los cambios.
              </p>
              {archivoFoto && <p role="status" className="mt-1 truncate text-[11px] text-[var(--conf-lime)]">Archivo seleccionado: {archivoFoto.name}</p>}
              {errorFoto && <p role="alert" className="mt-1 text-[11px] text-red-400">{errorFoto}</p>}
            </div>
          </div>
        </section>}

        <form onSubmit={guardar} aria-busy={guardando}>
          {seccion === 'perfil' && <div
            id="panel-perfil"
            role="tabpanel"
            aria-labelledby="tab-perfil"
            className="configuracion-panel"
          >
            <section className="configuracion-card configuracion-card--seccion" aria-labelledby="titulo-presentacion">
              <h3 id="titulo-presentacion" className="configuracion-titulo-seccion">Presentación</h3>
              <Campo campo="biografia" etiqueta="Biografía" error={errores.biografia} ayuda="Máximo 500 caracteres.">
                <textarea {...propsCampo('biografia', errores.biografia, true)} className="configuracion-textarea" maxLength={500}
                  value={valores.biografia} onChange={(event) => cambiar('biografia', event.target.value)} onBlur={() => marcar('biografia')}
                  placeholder="Cuéntale a la comunidad qué observas..." />
              </Campo>
            </section>

            <section className="configuracion-card configuracion-card--seccion" aria-labelledby="titulo-genero">
              <h3 id="titulo-genero" className="configuracion-titulo-seccion">Género</h3>
              <Campo campo="genero" etiqueta="Identidad" error={errores.genero} ayuda="Opcional.">
                <select {...propsCampo('genero', errores.genero, true)} className="configuracion-select"
                  value={valores.genero} onChange={(event) => cambiar('genero', event.target.value)} onBlur={() => marcar('genero')}>
                  <option value="">Seleccionar</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Otro">Otro</option>
                  <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                </select>
              </Campo>
            </section>

            <section className="configuracion-card configuracion-card--seccion" aria-labelledby="titulo-ubicacion">
              <h3 id="titulo-ubicacion" className="configuracion-titulo-seccion">Ubicación</h3>
              <div className="configuracion-grupo">
                <Campo campo="paisCodigo" etiqueta="País" error={errores.paisCodigo}
                  ayuda={errorCatalogo || (cargandoRegiones ? 'Cargando regiones...' : undefined)}>
                  <select {...propsCampo('paisCodigo', errores.paisCodigo, Boolean(errorCatalogo || cargandoRegiones))}
                    className="configuracion-select" disabled={Boolean(errorCatalogo)}
                    value={valores.paisCodigo}
                    onChange={(event) => cambiar('paisCodigo', event.target.value.toUpperCase())}
                    onBlur={() => marcar('paisCodigo')}>
                    <option value="">Selecciona un país</option>
                    {paises.map((pais) => <option key={pais.codigo} value={pais.codigo}>{pais.nombre}</option>)}
                    {!paises.length && valores.paisCodigo && <option value={valores.paisCodigo}>{valores.paisCodigo}</option>}
                  </select>
                </Campo>
                <Campo campo="estadoRegion" etiqueta="Estado" error={errores.estadoRegion} ayuda={errorRegiones || undefined}>
                  <select {...propsCampo('estadoRegion', errores.estadoRegion, Boolean(errorRegiones))}
                    className="configuracion-select" disabled={!codigoPais || cargandoRegiones || Boolean(errorRegiones)}
                    value={valores.estadoRegion}
                    onChange={(event) => cambiar('estadoRegion', event.target.value)}
                    onBlur={() => marcar('estadoRegion')}>
                    <option value="">Selecciona una región</option>
                    {regiones.map((region) => <option key={region.nombre} value={region.nombre}>{region.nombre}</option>)}
                    {(!regiones.length || errorRegiones) && valores.estadoRegion && <option value={valores.estadoRegion}>{valores.estadoRegion}</option>}
                  </select>
                </Campo>
              </div>
            </section>

            <section className="configuracion-card configuracion-card--seccion" aria-labelledby="titulo-nacimiento">
              <h3 id="titulo-nacimiento" className="configuracion-titulo-seccion">Fecha de nacimiento</h3>
              <Campo campo="fechaNacimiento" etiqueta="Fecha" error={errores.fechaNacimiento} ayuda="Obligatoria.">
                <input {...propsCampo('fechaNacimiento', errores.fechaNacimiento, true)} type="date" className="configuracion-input"
                  value={valores.fechaNacimiento} onChange={(event) => cambiar('fechaNacimiento', event.target.value)} onBlur={() => marcar('fechaNacimiento')} />
              </Campo>
            </section>

            <section className="configuracion-card configuracion-card--seccion" aria-labelledby="titulo-contacto">
              <h3 id="titulo-contacto" className="configuracion-titulo-seccion">Información de contacto</h3>
              <div className="configuracion-grupo">
                <Campo campo="correo" etiqueta="Correo electrónico" error={errorCorreo} ayuda="Correo confirmado en tu sesión.">
                  <input {...propsCampo('correo', errorCorreo, true)} type="email" className="configuracion-input" readOnly value={correoMostrado} />
                </Campo>
                <Campo campo="telefono" etiqueta="Teléfono" error={errores.telefono} ayuda="Opcional.">
                  <input {...propsCampo('telefono', errores.telefono, true)} type="tel" className="configuracion-input"
                    value={valores.telefono} onChange={(event) => cambiar('telefono', event.target.value)} onBlur={() => marcar('telefono')}
                    placeholder="Sin dato de perfil" />
                </Campo>
              </div>
            </section>
          </div>}

          {seccion === 'seguridad' && <div
            id="panel-seguridad"
            role="tabpanel"
            aria-labelledby="tab-seguridad"
            className="configuracion-panel"
          >
            {contrasenaActualizada && <p role="status" className="configuracion-card configuracion-card--seccion text-xs text-[var(--conf-lime)]">
              {contrasenaActualizada}
            </p>}

            <section className="configuracion-card configuracion-card--seccion" aria-labelledby="titulo-sesion">
              <h3 id="titulo-sesion" className="configuracion-titulo-seccion">Inicio de sesión y recuperación</h3>
              <Campo campo="correo" etiqueta="Correo de la cuenta" error={errorCorreo}>
                <input {...propsCampo('correo', errorCorreo, true)} type="email" className="configuracion-input" readOnly value={correoMostrado} />
              </Campo>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--conf-muted)]">
                El correo es de solo lectura. Para recuperarlo utiliza el flujo de recuperación de contraseña.
              </p>
            </section>

            <section className="configuracion-card configuracion-card--seccion" aria-labelledby="titulo-password">
              <h3 id="titulo-password" className="configuracion-titulo-seccion">Contraseña</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--conf-muted)]">
                Actualiza la contraseña de tu cuenta desde un diálogo seguro. La confirmación se envía solo cuando el backend responde correctamente.
              </p>
              <div className="configuracion-acciones-foto">
                <button
                  type="button"
                  className="configuracion-primary"
                  aria-haspopup="dialog"
                  onClick={() => setModalContrasena(true)}
                >
                  Cambiar contraseña
                </button>
              </div>
            </section>

            <section className="configuracion-card configuracion-card--seccion" aria-labelledby="titulo-google">
              <h3 id="titulo-google" className="configuracion-titulo-seccion">Google</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--conf-muted)]">
                {googleVinculado
                  ? 'Tu cuenta tiene una identidad de Google vinculada.'
                  : 'Vincula Google para iniciar sesión con tu cuenta de Google. La vinculación requiere confirmar tu identidad en el proveedor.'}
              </p>
              {googleMensaje && (
                <p role="status" className="mt-3 text-xs leading-5 text-[var(--conf-lime)]">{googleMensaje}</p>
              )}
              {googleEstado === 'error' && (
                <p role="alert" className="mt-3 text-xs leading-5 text-red-400">
                  No se pudo consultar el estado de Google. Inténtalo de nuevo recargando la pantalla.
                </p>
              )}
              {user?.role === ROLES.ADMINISTRADOR ? (
                <p role="status" className="mt-3 text-xs leading-5 text-[var(--conf-muted)]">
                  Las cuentas administrativas o de evaluación no pueden vincular ni desvincular Google.
                </p>
              ) : googleEstado === 'no_disponible' ? (
                <p role="status" className="mt-3 text-xs leading-5 text-[var(--conf-muted)]">
                  Google no está configurado en este entorno. El inicio de sesión con contraseña sigue disponible.
                </p>
              ) : googleEstado === 'listo' ? (
                <div className="configuracion-acciones-foto">
                  {googleVinculado ? (
                    <button
                      type="button"
                      className="configuracion-secondary"
                      disabled={Boolean(googleAccion)}
                      onClick={desvincularCuentaGoogle}
                    >
                      {googleAccion === 'desvinculando' ? 'Desvinculando…' : 'Desvincular Google'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="configuracion-primary"
                      disabled={Boolean(googleAccion)}
                      onClick={vincularGoogle}
                    >
                      {googleAccion === 'vinculando' ? 'Abriendo Google…' : 'Vincular Google'}
                    </button>
                  )}
                </div>
              ) : null}
            </section>
          </div>}

          {seccion === 'perfil' && <div className="configuracion-card configuracion-guardado">
            <div className="min-w-0 flex-1">
              {errorGuardado && <p role="alert" className="text-xs text-red-400">{errorGuardado}</p>}
              {mensajeGuardado && <p role="status" className="text-xs text-[var(--conf-lime)]">{mensajeGuardado}</p>}
              <p id="guardado-pendiente" className="text-xs font-semibold text-[var(--conf-lime)]">
                {hayCambios ? 'Tienes cambios pendientes de guardar.' : TEXTO_PENDIENTE}
              </p>
            </div>
            <div className="configuracion-guardado-acciones">
              <button type="button" className="configuracion-secondary" onClick={cancelar} disabled={!hayCambios || guardando}>Cancelar</button>
              <button type="submit" className="configuracion-primary" disabled={!hayCambios || guardando} aria-describedby="guardado-pendiente">
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>}
        </form>
      </div>

        {seccion === 'perfil' && <aside className="configuracion-card configuracion-summary" aria-label="Resumen del perfil">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="configuracion-valor truncate text-xs">@{alias}</p>
              <button type="button" className="configuracion-secondary" onClick={compartir}>Compartir</button>
            </div>
            <p aria-live="polite" className="mt-1 text-[10px] text-[var(--conf-muted)]">{mensajeCompartir}</p>
            <dl className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-[10px] text-[var(--conf-muted)]">Seguidores</dt>
                <dd className="configuracion-valor text-xs">{perfil?.seguidores ?? '—'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-[10px] text-[var(--conf-muted)]">Contribución</dt>
                <dd className="configuracion-valor text-xs">{perfil?.publicaciones ?? '—'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-[10px] text-[var(--conf-muted)]">Edad en Insectopia</dt>
                <dd className="configuracion-valor text-xs">{aniosDesde(perfil?.fechaRegistro)}</dd>
              </div>
            </dl>
          </div>
        </aside>}
      </div>}

      {modalContrasena && <CambiarContrasenaModal
        correo={correoMostrado}
        alias={alias}
        onClose={() => { if (contrasenaActualizada) irAReautenticar(); else setModalContrasena(false) }}
        onSuccess={(resultado) => setContrasenaActualizada(resultado?.requiereReautenticacion
          ? 'Contraseña actualizada. Inicia sesión nuevamente para continuar.'
          : 'Contraseña actualizada correctamente.')}
        onReauth={irAReautenticar}
      />}
    </div>
  </div>
}
