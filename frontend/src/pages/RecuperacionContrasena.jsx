import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { validarCampo } from '../utils/validacionRegistro'
import {
  clasificarErrorRecuperacion,
  mensajeErrorRecuperacion,
  restablecerContrasena,
  solicitarRecuperacion,
} from '../services/recuperacionService'
import './recuperacion.css'

function Icono({ tipo, className = '' }) {
  const trazo = {
    correo: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    escudo: <><path d="M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    advertencia: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 4h.01" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m7.5 12 3 3 6-6" /></>,
    volver: <path d="m12 5-7 7 7 7M5 12h15" />,
    ojo: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  }
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{trazo[tipo]}</svg>
}

function PanelInstitucional() {
  return <aside className="recuperacion-marca">
    <div className="recuperacion-orbita recuperacion-orbita-uno" aria-hidden="true" />
    <div className="recuperacion-orbita recuperacion-orbita-dos" aria-hidden="true" />
    <div className="recuperacion-logo" aria-label="Insectopia" role="img"><img src={logo} alt="" /><span>Insectopia</span></div>
    <div className="recuperacion-relato">
      <p className="recuperacion-insignia"><span aria-hidden="true" />RED CIENTÍFICA &amp; UNIVERSITARIA</p>
      <p className="recuperacion-lema">Vuelve a explorar<br />la biodiversidad<br />con Insectopia.</p>
      <p className="recuperacion-descripcion">Tus observaciones, comunidades y descubrimientos<br />te esperan. Recupera el acceso de forma segura.</p>
      <div className="recuperacion-pilares">
        <div><strong>OBSERVA</strong><span>Explora especies</span></div>
        <div><strong>COMPARTE</strong><span>Documenta hallazgos</span></div>
        <div><strong>CONECTA</strong><span>Ciencia ciudadana</span></div>
      </div>
    </div>
    <footer className="recuperacion-marca-pie"><span>© Insectopia 2026. Todos los derechos reservados.</span><span>Biodiversidad &amp; Ciencia Abierta</span></footer>
  </aside>
}

function Layout({ children }) {
  return <main className="recuperacion-shell">
    <PanelInstitucional />
    <section className="recuperacion-panel" aria-label="Seguridad de cuenta">
      <header className="recuperacion-cabecera"><span className="recuperacion-etiqueta">CUENTA&nbsp; / &nbsp;SEGURIDAD</span></header>
      <div className="recuperacion-contenido">{children}</div>
    </section>
  </main>
}

function BotonPrincipal({ children, ...props }) {
  return <button className="recuperacion-primario" {...props}>{children}</button>
}

function Volver({ icono = false }) {
  return <Link className="recuperacion-volver" to="/login">{icono && <Icono tipo="volver" className="recuperacion-icono-pequeno" />}Volver a iniciar sesión</Link>
}

function Nota({ tipo, titulo, children }) {
  return <div className="recuperacion-nota"><Icono tipo={tipo} className="recuperacion-icono-pequeno" /><div><strong>{titulo}</strong><p>{children}</p></div></div>
}

function Campo({ id, etiqueta, error, ayuda, children }) {
  return <div className="recuperacion-grupo">
    <label htmlFor={id}>{etiqueta}</label>
    {children}
    {ayuda && <p className="recuperacion-ayuda" id={`${id}-ayuda`}>{ayuda}</p>}
    {error && <p className="recuperacion-error" id={`${id}-error`} role="alert">{error}</p>}
  </div>
}

function ErrorGeneral({ mensaje }) {
  return mensaje && <p role="alert" className="recuperacion-error-general">{mensaje}</p>
}

function Solicitud({ onEnviado }) {
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState('')
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const pendiente = useRef(false)
  async function enviar(event) {
    event.preventDefault()
    if (pendiente.current) return
    const mensaje = validarCampo('correo', { correo }) || ''
    setError(mensaje)
    setErrorGeneral('')
    if (mensaje) { document.getElementById('recuperacion-correo')?.focus(); return }
    pendiente.current = true
    setEnviando(true)
    try {
      await solicitarRecuperacion(correo)
      onEnviado()
    } catch (e) {
      setErrorGeneral(mensajeErrorRecuperacion(e))
    } finally {
      pendiente.current = false
      setEnviando(false)
    }
  }
  return <div className="recuperacion-vista recuperacion-solicitud">
    <h1>¿Olvidaste tu <br />contraseña?</h1>
    <p className="recuperacion-intro">Ingresa el correo asociado a tu cuenta. Te<br />enviaremos un enlace seguro de un solo uso.</p>
    <form onSubmit={enviar} noValidate>
      <ErrorGeneral mensaje={errorGeneral} />
      <Campo id="recuperacion-correo" etiqueta="CORREO ELECTRÓNICO" error={error}>
        <input id="recuperacion-correo" type="email" autoComplete="email" value={correo} maxLength={151} placeholder="ej. correo@ejemplo.com" aria-invalid={Boolean(error)} aria-describedby={error ? 'recuperacion-correo-error' : undefined} onChange={(e) => { setCorreo(e.target.value); setError(validarCampo('correo', { correo: e.target.value }) || ''); setErrorGeneral('') }} onBlur={() => setError(validarCampo('correo', { correo }) || '')} />
      </Campo>
      <BotonPrincipal type="submit" disabled={enviando}>{enviando ? 'Enviando enlace…' : 'Enviar enlace de recuperación'}</BotonPrincipal>
      {enviando && <p role="status" className="recuperacion-cargando">Procesando solicitud…</p>}
    </form>
    <Volver icono />
  </div>
}

function CorreoEnviado({ onRepetir }) {
  return <div className="recuperacion-vista recuperacion-enviado" role="status">
    <div className="recuperacion-medallon"><Icono tipo="correo" /></div>
    <h1>Revisa tu correo</h1>
    <p className="recuperacion-intro">Si el correo está asociado a una cuenta de Insectopia,<br />recibirás un enlace para crear una nueva contraseña.</p>
    <Nota tipo="escudo" titulo="Revisa también la carpeta de spam">El enlace caduca y solo puede utilizarse una vez.</Nota>
    <Link className="recuperacion-primario" to="/login">Volver a iniciar sesión</Link>
    <button type="button" className="recuperacion-secundario" onClick={onRepetir}>¿No llegó? Solicita un nuevo enlace.</button>
  </div>
}

function Clave({ token, onExito, onInvalido }) {
  const [valores, setValores] = useState({ contrasena: '', confirmarContrasena: '' })
  const [errores, setErrores] = useState({})
  const [visible, setVisible] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const pendiente = useRef(false)
  function cambiar(campo, valor) {
    const siguientes = { ...valores, [campo]: valor }
    setValores(siguientes)
    setErrores((actuales) => ({ ...actuales,
      [campo]: validarCampo(campo, siguientes) || '',
      ...(campo === 'contrasena' && actuales.confirmarContrasena ? { confirmarContrasena: validarCampo('confirmarContrasena', siguientes) || '' } : {}),
    }))
    setErrorGeneral('')
  }
  async function enviar(event) {
    event.preventDefault()
    if (pendiente.current) return
    if (!token) { onInvalido(); return }
    const nuevos = Object.fromEntries(['contrasena', 'confirmarContrasena'].map((campo) => [campo, validarCampo(campo, valores) || '']))
    setErrores(nuevos)
    setErrorGeneral('')
    const primero = Object.keys(nuevos).find((campo) => nuevos[campo])
    if (primero) { document.getElementById(`recuperacion-${primero}`)?.focus(); return }
    pendiente.current = true
    setEnviando(true)
    try {
      await restablecerContrasena(token, valores.contrasena)
      onExito()
    } catch (e) {
      if (clasificarErrorRecuperacion(e, 'restablecer') === 'token') onInvalido()
      else setErrorGeneral(mensajeErrorRecuperacion(e))
    } finally {
      pendiente.current = false
      setEnviando(false)
    }
  }
  return <div className="recuperacion-vista recuperacion-clave">
    <h1>Crea una nueva<br />contraseña</h1>
    <p className="recuperacion-intro">Elige una contraseña segura para volver a<br />acceder a tu cuenta de Insectopia.</p>
    <form onSubmit={enviar} noValidate>
      <ErrorGeneral mensaje={errorGeneral} />
      {['contrasena', 'confirmarContrasena'].map((campo) => {
        const id = `recuperacion-${campo}`
        const etiqueta = campo === 'contrasena' ? 'NUEVA CONTRASEÑA' : 'CONFIRMAR CONTRASEÑA'
        return <Campo key={campo} id={id} etiqueta={etiqueta} error={errores[campo]} ayuda={campo === 'contrasena' ? 'Mín. 8 caracteres · mayúscula · número · símbolo' : undefined}>
          <div className="recuperacion-input-clave">
            <input id={id} type={visible[campo] ? 'text' : 'password'} autoComplete="new-password" value={valores[campo]} placeholder={campo === 'contrasena' ? 'Escribe una contraseña segura' : 'Repite tu nueva contraseña'} aria-invalid={Boolean(errores[campo])} aria-describedby={[campo === 'contrasena' && `${id}-ayuda`, errores[campo] && `${id}-error`].filter(Boolean).join(' ') || undefined} onChange={(e) => cambiar(campo, e.target.value)} onBlur={() => setErrores((actual) => ({ ...actual, [campo]: validarCampo(campo, valores) || '' }))} />
            <button type="button" aria-label={`${visible[campo] ? 'Ocultar' : 'Mostrar'} ${campo === 'contrasena' ? 'nueva contraseña' : 'confirmación de contraseña'}`} aria-pressed={Boolean(visible[campo])} onClick={() => setVisible((actual) => ({ ...actual, [campo]: !actual[campo] }))}><Icono tipo="ojo" className="recuperacion-icono-pequeno" /></button>
          </div>
        </Campo>
      })}
      <BotonPrincipal type="submit" disabled={enviando}>{enviando ? 'Guardando contraseña…' : 'Guardar nueva contraseña'}</BotonPrincipal>
      {enviando && <p role="status" className="recuperacion-cargando">Actualizando contraseña…</p>}
    </form>
    <p className="recuperacion-recordatorio"><Icono tipo="escudo" className="recuperacion-icono-pequeno" /> El enlace caduca y es de un solo uso.</p>
    <Link className="recuperacion-secundario" to="/login">¿Ya tienes acceso?&nbsp; Iniciar sesión</Link>
  </div>
}

function EstadoFinal({ exito }) {
  return <div className={`recuperacion-vista ${exito ? 'recuperacion-exito' : 'recuperacion-invalido'}`} role="status">
    <div className={`recuperacion-medallon ${exito ? '' : 'recuperacion-medallon-error'}`}><Icono tipo={exito ? 'check' : 'advertencia'} /></div>
    <h1>{exito ? 'Contraseña actualizada' : <>Este enlace ya <br />no es válido</>}</h1>
    <p className="recuperacion-intro">{exito ? <>Tu contraseña se actualizó correctamente.<br />Vuelve a iniciar sesión con tu nueva contraseña.</> : <>El enlace es incorrecto, venció o ya fue utilizado.<br />Solicita uno nuevo para continuar de forma segura.</>}</p>
    {exito && <Nota tipo="escudo" titulo="Tu cuenta vuelve a estar protegida">Si tenías sesiones abiertas en otros dispositivos, ciérralas por seguridad.</Nota>}
    <Link className="recuperacion-primario" to={exito ? '/login' : '/recuperar-contrasena'}>{exito ? 'Volver a iniciar sesión' : 'Solicitar otro enlace'}</Link>
    {exito ? <p className="recuperacion-epilogo">Ya puedes acceder con tu nueva contraseña.</p> : <Volver icono />}
  </div>
}

export default function RecuperacionContrasena({ restablecer = false }) {
  const location = useLocation()
  const navigate = useNavigate()
  // Solo memoria de este montaje; se elimina la query del historial antes de pintar.
  const [token, setToken] = useState(() => restablecer ? new URLSearchParams(location.search).get('token')?.trim() || '' : '')
  const [estado, setEstado] = useState(() => restablecer && !new URLSearchParams(location.search).get('token')?.trim() ? 'invalido' : restablecer ? 'clave' : 'solicitud')
  useLayoutEffect(() => {
    // BrowserRouter: limpiar el historial antes de pintar, sin guardar el token.
    if (restablecer && location.search && window.location.pathname === location.pathname && window.location.search === location.search) {
      window.history.replaceState(window.history.state, '', `${location.pathname}${location.hash}`)
    }
  }, [restablecer, location.pathname, location.search, location.hash])
  useEffect(() => {
    // El router debe estar montado para aceptar navigate (MemoryRouter y BrowserRouter).
    if (restablecer && location.search) navigate(`${location.pathname}${location.hash}`, { replace: true })
    // Una sola vez al montar: el token permanece únicamente en memoria.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function invalidar() { setToken(''); setEstado('invalido') }
  function finalizar() { setToken(''); setEstado('exito') }
  return <Layout>
    {estado === 'solicitud' && <Solicitud onEnviado={() => setEstado('enviado')} />}
    {estado === 'enviado' && <CorreoEnviado onRepetir={() => setEstado('solicitud')} />}
    {estado === 'clave' && <Clave token={token} onExito={finalizar} onInvalido={invalidar} />}
    {estado === 'invalido' && <EstadoFinal exito={false} />}
    {estado === 'exito' && <EstadoFinal exito />}
  </Layout>
}
