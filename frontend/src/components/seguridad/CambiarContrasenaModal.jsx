import { useEffect, useRef, useState } from 'react'
import ModalContainer from '../modales/ModalContainer'
import {
  CLASE_BOTON_PRIMARIO,
  CLASE_BOTON_SECUNDARIO,
  CLASE_ERROR,
  CLASE_ETIQUETA,
  CLASE_PISTA,
} from '../../constants/modalesPublicaciones'
import { cambiarContrasena } from '../../services/seguridadService'
import {
  REQUISITOS_CONTRASENA,
  VALORES_INICIALES_SEGURIDAD,
  validarConfirmarContrasena,
  validarContrasenaActual,
  validarContrasenaNueva,
  validarFormularioSeguridad,
  requisitosCumplidos,
} from '../../utils/validacionSeguridad'
import './seguridad.css'

const ID_TITULO = 'seguridad-cambiar-titulo'
const ID_DESCRIPCION = 'seguridad-cambiar-descripcion'
const DESCRIPCION = 'Usarás esta contraseña para iniciar sesión en tu cuenta de Insectopia. Debe tener al menos 8 caracteres e incluir mayúscula, número y carácter especial.'

function CampoContrasena({
  id,
  etiqueta,
  toggleLabel,
  valor,
  error,
  visible,
  autoComplete,
  ayuda,
  onChange,
  onBlur,
  onToggle,
  autoFocus = false,
}) {
  const descritoPor = [ayuda ? `${id}-ayuda` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined

  return <div className="seguridad-campo">
    <label htmlFor={id} className={CLASE_ETIQUETA}>{etiqueta}</label>
    <div className={`seguridad-control${error ? ' seguridad-control--error' : ''}`}>
      <input
        id={id}
        name={id}
        type={visible ? 'text' : 'password'}
        className="seguridad-input"
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={descritoPor}
        {...(autoFocus ? { 'data-modal-autofocus': '' } : {})}
      />
      <button
        type="button"
        className="seguridad-ver"
        onClick={onToggle}
        aria-pressed={visible}
        aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${toggleLabel}`}
      >
        {visible ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
    {ayuda && <p id={`${id}-ayuda`} className={CLASE_PISTA}>{ayuda}</p>}
    {error && <p id={`${id}-error`} role="alert" className={CLASE_ERROR}>{error}</p>}
  </div>
}

export default function CambiarContrasenaModal({
  correo = '',
  alias = '',
  onClose,
  onSuccess,
  onReauth,
  onSubmit = cambiarContrasena,
  opcionesServicio,
}) {
  const [valores, setValores] = useState({ ...VALORES_INICIALES_SEGURIDAD })
  const [errores, setErrores] = useState({})
  const [tocados, setTocados] = useState({})
  const [visibles, setVisibles] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [requiereReauth, setRequiereReauth] = useState(false)
  const [confirmandoCierre, setConfirmandoCierre] = useState(false)
  const enviandoRef = useRef(false)
  const controladorRef = useRef(null)
  const cerrarRef = useRef(null)

  const hayValores = Object.values(valores).some((valor) => String(valor).length > 0)
  const cumplidos = requisitosCumplidos(valores.contrasenaNueva)

  useEffect(() => () => controladorRef.current?.abort(), [])

  useEffect(() => {
    if (mensajeExito || requiereReauth) cerrarRef.current?.focus()
  }, [mensajeExito, requiereReauth])

  function limpiarValores() {
    setValores({ ...VALORES_INICIALES_SEGURIDAD })
    setErrores({})
    setTocados({})
    setVisibles({})
    setErrorGeneral('')
    setMensajeExito('')
    setRequiereReauth(false)
    setConfirmandoCierre(false)
  }

  function cerrar() {
    controladorRef.current?.abort()
    limpiarValores()
    onClose?.()
  }

  function solicitarCierre() {
    if (enviando) return
    if (confirmandoCierre) {
      setConfirmandoCierre(false)
      return
    }
    if (hayValores && !mensajeExito) {
      setConfirmandoCierre(true)
      return
    }
    cerrar()
  }

  function cambiar(campo, valor) {
    setValores((anterior) => ({ ...anterior, [campo]: valor }))
    setErrorGeneral('')
    if (campo === 'contrasenaNueva') {
      setErrores((anterior) => ({
        ...anterior,
        confirmarContrasena: tocados.confirmarContrasena
          ? validarConfirmarContrasena(valores.confirmarContrasena, valor)
          : undefined,
      }))
    }
    if (tocados[campo]) {
      setErrores((anterior) => ({
        ...anterior,
        [campo]: validarCampo(campo, valor, valores),
      }))
    }
  }

  function validarCampo(campo, valor, estado = valores) {
    if (campo === 'contrasenaActual') return validarContrasenaActual(valor)
    if (campo === 'contrasenaNueva') return validarContrasenaNueva(valor)
    return validarConfirmarContrasena(valor, estado.contrasenaNueva)
  }

  function marcar(campo) {
    setTocados((anterior) => ({ ...anterior, [campo]: true }))
    setErrores((anterior) => ({ ...anterior, [campo]: validarCampo(campo, valores[campo]) }))
  }

  function alternarVisible(campo) {
    setVisibles((anterior) => ({ ...anterior, [campo]: !anterior[campo] }))
  }

  async function enviar(event) {
    event.preventDefault()
    if (enviandoRef.current || mensajeExito) return

    const porCampo = validarFormularioSeguridad(valores)
    const nuevosErrores = Object.fromEntries(
      Object.entries(porCampo).filter(([, mensaje]) => Boolean(mensaje)),
    )
    setTocados({
      contrasenaActual: true,
      contrasenaNueva: true,
      confirmarContrasena: true,
    })
    setErrores(nuevosErrores)
    setErrorGeneral('')
    if (Object.keys(nuevosErrores).length) {
      setErrorGeneral('Revisa los campos marcados antes de continuar.')
      return
    }

    controladorRef.current = new AbortController()
    enviandoRef.current = true
    setEnviando(true)
    try {
      const resultado = await onSubmit(valores, {
        signal: controladorRef.current.signal,
        ...opcionesServicio,
      })
      limpiarValores()
      const nuevaSesion = Boolean(resultado?.requiereReautenticacion)
      setRequiereReauth(nuevaSesion)
      setMensajeExito(nuevaSesion
        ? 'Tu contraseña se actualizó. Por seguridad, inicia sesión nuevamente.'
        : 'Tu contraseña se actualizó correctamente.')
      onSuccess?.(resultado)
    } catch (error) {
      if (error?.name === 'AbortError') return
      setErrorGeneral(error?.message || 'No se pudo cambiar la contraseña. Inténtalo de nuevo.')
      const delServidor = error?.fieldErrors ?? {}
      setErrores(delServidor)
      if (Object.keys(delServidor).length) {
        setTocados({
          contrasenaActual: true,
          contrasenaNueva: true,
          confirmarContrasena: true,
        })
      }
      if (error?.codigo === 'sesion_expirada') setRequiereReauth(true)
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  return <ModalContainer
    titleId={ID_TITULO}
    descriptionId={ID_DESCRIPCION}
    title="Cambiar contraseña"
    description={DESCRIPCION}
    onClose={solicitarCierre}
    closeLabel="Cerrar cambio de contraseña"
    closeDisabled={enviando}
    ancho="530px"
    className="seguridad-modal"
  >
    <form onSubmit={enviar} aria-busy={enviando} className="seguridad-formulario">
      <div className="seguridad-cuerpo">
        <div className="seguridad-cuenta">
          <span aria-hidden="true" className="seguridad-cuenta-icono">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" strokeLinecap="round" />
            </svg>
          </span>
          <div className="seguridad-cuenta-datos">
            <p
              className="seguridad-cuenta-correo"
              title={correo || undefined}
              aria-label={correo ? `Correo de la cuenta: ${correo}` : undefined}
            >
              {correo || 'Correo no disponible en la sesión'}
            </p>
            <p className="seguridad-cuenta-estado">Cuenta activa de Insectopia</p>
          </div>
          {alias && <span className="seguridad-cuenta-alias">@{alias}</span>}
        </div>

        <div className="seguridad-requisitos-contenedor">
          <p className="seguridad-ayuda-titulo">Cómo crear una contraseña segura</p>
          <ul className="seguridad-requisitos">
            {REQUISITOS_CONTRASENA.map((requisito) => (
              <li
                key={requisito.id}
                className={cumplidos[requisito.id] ? 'seguridad-requisito--ok' : undefined}
              >
                <span aria-hidden="true">{cumplidos[requisito.id] ? '✓' : '•'}</span>
                {requisito.texto}
              </li>
            ))}
          </ul>
        </div>

        <div className="seguridad-campos">
          <CampoContrasena
            id="seguridad-contrasena-actual"
            etiqueta="Contraseña actual"
            toggleLabel="contraseña actual"
            valor={valores.contrasenaActual}
            error={errores.contrasenaActual}
            visible={visibles.contrasenaActual}
            autoComplete="current-password"
            onChange={(valor) => cambiar('contrasenaActual', valor)}
            onBlur={() => marcar('contrasenaActual')}
            onToggle={() => alternarVisible('contrasenaActual')}
            autoFocus
          />
          <CampoContrasena
            id="seguridad-contrasena-nueva"
            etiqueta="Contraseña nueva"
            toggleLabel="contraseña nueva"
            valor={valores.contrasenaNueva}
            error={errores.contrasenaNueva}
            visible={visibles.contrasenaNueva}
            autoComplete="new-password"
            onChange={(valor) => cambiar('contrasenaNueva', valor)}
            onBlur={() => marcar('contrasenaNueva')}
            onToggle={() => alternarVisible('contrasenaNueva')}
          />
          <CampoContrasena
            id="seguridad-confirmar-contrasena"
            etiqueta="Repetir contraseña nueva"
            toggleLabel="confirmación"
            valor={valores.confirmarContrasena}
            error={errores.confirmarContrasena}
            visible={visibles.confirmarContrasena}
            autoComplete="new-password"
            onChange={(valor) => cambiar('confirmarContrasena', valor)}
            onBlur={() => marcar('confirmarContrasena')}
            onToggle={() => alternarVisible('confirmarContrasena')}
          />
        </div>

        <p className="seguridad-recordatorio">
          ¿Olvidaste tu contraseña? <span>La recuperación se habilitará con el servicio 080.</span>
        </p>
      </div>

      <footer className="seguridad-pie">
        {errorGeneral && <div role="alert" className="seguridad-aviso-error">{errorGeneral}</div>}
        {mensajeExito && <div role="status" className="seguridad-aviso-exito">{mensajeExito}</div>}
        {requiereReauth && <button
          ref={cerrarRef}
          type="button"
          className="seguridad-reautenticar"
          onClick={onReauth}
        >
          Ir a iniciar sesión
        </button>}

        {confirmandoCierre && <div role="alert" className="seguridad-descartar">
          <p>Los valores escritos se borrarán al cerrar este diálogo.</p>
          <div className="seguridad-descartar-acciones">
            <button type="button" className={CLASE_BOTON_SECUNDARIO} onClick={() => setConfirmandoCierre(false)}>
              Mantener abierto
            </button>
            <button type="button" className={CLASE_BOTON_PRIMARIO} onClick={cerrar}>
              Descartar y cerrar
            </button>
          </div>
        </div>}

        <div className="seguridad-acciones">
          {mensajeExito
            ? <button
              ref={!requiereReauth ? cerrarRef : undefined}
              type="button"
              className={CLASE_BOTON_PRIMARIO}
              onClick={cerrar}
            >
              Cerrar
            </button>
            : <>
              <button type="button" className={CLASE_BOTON_SECUNDARIO} disabled={enviando} onClick={solicitarCierre}>
                Cancelar
              </button>
              <button type="submit" className={CLASE_BOTON_PRIMARIO} disabled={enviando}>
                {enviando ? 'Cambiando…' : 'Cambiar contraseña'}
              </button>
            </>}
        </div>
      </footer>
    </form>
  </ModalContainer>
}
