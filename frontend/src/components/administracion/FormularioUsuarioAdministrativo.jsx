import { useEffect, useState } from 'react'
import ModalContainer from '../modales/ModalContainer'
import { obtenerPaises, obtenerRegiones } from '../../services/catalogoService'
import { construirPayloadRegistro, normalizarErrorRegistro, telefonoInputRegistro } from '../../services/authService'
import { mensajeErrorApi } from '../../services/erroresApi'
import { VALORES_INICIALES, CAMPOS_VALIDABLES, validarCampo } from '../../utils/validacionRegistro'

const etiquetas = {
  nombre: 'Nombre', nombreUsuario: 'Nombre de usuario', correo: 'Correo', fechaNacimiento: 'Fecha de nacimiento',
  genero: 'Género', paisCodigo: 'País', estadoRegion: 'Región', telefono: 'Teléfono',
  contrasena: 'Contraseña', confirmarContrasena: 'Confirmar contraseña',
}
const campos = ['nombre', 'nombreUsuario', 'correo', 'fechaNacimiento', 'genero', 'paisCodigo', 'estadoRegion', 'telefono', 'contrasena', 'confirmarContrasena']
const clase = 'mt-1 h-10 w-full rounded-xl border border-[#35483a] bg-[#141d17] px-3 text-sm text-[#f3f8ef]'

export default function FormularioUsuarioAdministrativo({ usuario, onClose, onSave }) {
  const edicion = Boolean(usuario)
  const [valores, setValores] = useState(() => ({ ...VALORES_INICIALES, ...usuario, contrasena: '', confirmarContrasena: '', genero: usuario?.genero ?? '', telefono: telefonoInputRegistro(usuario?.telefono ?? '') }))
  const [paises, setPaises] = useState([])
  const [regiones, setRegiones] = useState([])
  const [errorCatalogo, setErrorCatalogo] = useState('')
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true
    Promise.resolve().then(() => { if (activo) setCargandoCatalogo(true) })
    Promise.all([obtenerPaises(), valores.paisCodigo ? obtenerRegiones(valores.paisCodigo) : Promise.resolve([])])
      .then(([lista, regionesIniciales]) => {
        if (!activo) return
        if (!Array.isArray(lista) || !lista.length) throw new Error('Catálogo vacío')
        setPaises(lista); setRegiones(regionesIniciales); setErrorCatalogo('')
      }).catch(() => { if (activo) setErrorCatalogo('No se pudo cargar el catálogo de ubicaciones.') })
      .finally(() => { if (activo) setCargandoCatalogo(false) })
    return () => { activo = false }
    // La recarga es explícita; el país inicial sólo se consulta al montar el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intento])

  function cambiar(campo, valor) {
    let siguienteValor = campo === 'nombreUsuario' ? valor.toLowerCase() : valor
    if (campo === 'telefono') siguienteValor = String(valor).replace(/\D/g, '').slice(0, 10)
    const siguiente = { ...valores, [campo]: siguienteValor }
    if (campo === 'paisCodigo') {
      siguiente.estadoRegion = ''
      setRegiones([])
      setErrorCatalogo('')
    }
    setValores(siguiente)
    setErrores((prev) => ({ ...prev, [campo]: undefined, ...(campo === 'paisCodigo' ? { estadoRegion: undefined } : {}) }))
  }

  useEffect(() => {
    if (!valores.paisCodigo || !paises.length) return undefined
    let activo = true
    obtenerRegiones(valores.paisCodigo).then((lista) => {
      if (activo) { setRegiones(lista); setErrorCatalogo('') }
    }).catch(() => { if (activo) { setRegiones([]); setErrorCatalogo('No se pudieron cargar las regiones del país.') } })
    return () => { activo = false }
  }, [valores.paisCodigo, paises])

  async function guardar(e) {
    e.preventDefault()
    if (enviando || cargandoCatalogo || errorCatalogo) return
    const nuevos = {}
    for (const campo of CAMPOS_VALIDABLES.filter((item) => item !== 'aceptarTerminos')) {
      if (edicion && !valores.contrasena && ['contrasena', 'confirmarContrasena'].includes(campo)) continue
      const mensaje = validarCampo(campo, valores, { paises, regiones })
      if (mensaje) nuevos[campo] = mensaje
    }
    if (Object.keys(nuevos).length) { setErrores(nuevos); return }
    setEnviando(true); setError('')
    try {
      // Construir siempre desde los campos editables; jamás reenviar id, rol, estado o fechas de auditoría.
      await onSave(construirPayloadRegistro(valores))
    } catch (fallo) {
      const normalizado = normalizarErrorRegistro(fallo)
      setErrores(normalizado.fieldErrors)
      setError([400, 409].includes(fallo.response?.status) ? normalizado.message : mensajeErrorApi(fallo))
    } finally { setEnviando(false) }
  }

  return <ModalContainer titleId="admin-form-titulo" descriptionId="admin-form-descripcion"
    title={edicion ? 'Editar usuario' : 'Alta de usuario'} description="Completa los datos autorizados para esta cuenta."
    closeDisabled={enviando} onClose={onClose} ancho={660}>
    <form onSubmit={guardar} className="space-y-4 overflow-y-auto p-7 text-xs">
      {cargandoCatalogo && <p role="status">Cargando ubicaciones…</p>}
      {errorCatalogo && <p role="alert" className="text-red-300">{errorCatalogo} <button type="button" onClick={() => setIntento((n) => n + 1)} className="text-[#a8e223]">Reintentar</button></p>}
      <div className="grid grid-cols-2 gap-4">{campos.map((campo) => <div key={campo} className={['nombre', 'correo'].includes(campo) ? 'col-span-2' : ''}>
        <label htmlFor={`admin-form-${campo}`} className="font-semibold text-[#a5b7a7]">{etiquetas[campo]}{edicion && campo === 'contrasena' ? ' (opcional)' : ''}</label>
        {campo === 'paisCodigo' ? <select id={`admin-form-${campo}`} value={valores[campo] ?? ''} onChange={(e) => cambiar(campo, e.target.value)} className={clase}>
          <option value="">Selecciona un país</option>{paises.map((item) => <option key={item.codigo} value={item.codigo}>{item.nombre}</option>)}
        </select> : campo === 'estadoRegion' ? <select id={`admin-form-${campo}`} value={valores[campo] ?? ''} onChange={(e) => cambiar(campo, e.target.value)} className={clase}>
          <option value="">Selecciona una región</option>{regiones.map((item) => <option key={item.nombre} value={item.nombre}>{item.nombre}</option>)}
        </select> : campo === 'genero' ? <select id={`admin-form-${campo}`} value={valores[campo] ?? ''} onChange={(e) => cambiar(campo, e.target.value)} className={clase}>
          <option value="">No indicado</option>{['Femenino', 'Masculino', 'Otro', 'Prefiero no decirlo'].map((item) => <option key={item}>{item}</option>)}
        </select> : campo === 'telefono' ? <div className="relative mt-1">
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#a5b7a7]">+52</span>
          <input id={`admin-form-${campo}`} type="tel" inputMode="numeric" autoComplete="off" maxLength={10} placeholder="(Ej. 9516430789)"
            value={valores[campo] ?? ''} onChange={(e) => cambiar(campo, e.target.value)} className={`${clase} mt-0 pl-12`} />
        </div> : <input id={`admin-form-${campo}`} type={campo.includes('contrasena') || campo === 'confirmarContrasena' ? 'password' : campo === 'fechaNacimiento' ? 'date' : campo === 'correo' ? 'email' : 'text'}
          autoComplete="off" value={valores[campo] ?? ''} onChange={(e) => cambiar(campo, e.target.value)} className={clase} />}
        {errores[campo] && <p role="alert" className="mt-1 text-red-300">{errores[campo]}</p>}
      </div>)}</div>
      <div className="flex gap-5"><label className="flex items-center gap-2">
        <input type="checkbox" checked={Boolean(valores.recibirSms)} onChange={(e) => cambiar('recibirSms', e.target.checked)} />Recibir SMS</label></div>
      {error && <p role="alert" className="rounded-xl bg-red-950/40 p-3 text-red-200">{error}</p>}
      <div className="flex gap-3"><button type="button" disabled={enviando} onClick={onClose} className="admin-boton-secundario flex-1">Cancelar</button>
        <button type="submit" disabled={enviando || cargandoCatalogo || Boolean(errorCatalogo)} className="admin-boton-primario flex-1">{enviando ? 'Guardando…' : edicion ? 'Guardar usuario' : 'Crear usuario'}</button></div>
    </form>
  </ModalContainer>
}
