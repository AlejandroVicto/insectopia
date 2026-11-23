import { useCallback, useEffect, useState } from 'react'
import { FichaAdministrativa, FiltrosAdministrativos, HistorialAdministrativo, IndicadoresAdministrativos, TablaAdministrativa } from '../components/administracion/PanelAdministrativo'
import ConfirmarCambioAdministrativo from '../components/administracion/ConfirmarCambioAdministrativo'
import FormularioUsuarioAdministrativo from '../components/administracion/FormularioUsuarioAdministrativo'
import { cambiarEstado, cambiarRol, crearUsuario, editarUsuario, eliminarUsuario, listarUsuarios, obtenerAuditoria, obtenerResumen, obtenerRoles, obtenerUsuario } from '../services/adminService'
import { mensajeErrorApi } from '../services/erroresApi'
import './administracion.css'

export default function Administracion() {
  const [busqueda, setBusqueda] = useState('')
  const [q, setQ] = useState('')
  const [rolFiltro, setRolFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [numeroPagina, setNumeroPagina] = useState(0)
  const [pagina, setPagina] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [roles, setRoles] = useState([])
  const [seleccionadoId, setSeleccionadoId] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [rolNuevo, setRolNuevo] = useState('')
  const [historial, setHistorial] = useState(null)
  const [paginaHistorial, setPaginaHistorial] = useState(0)
  const [revision, setRevision] = useState(0)
  const [cargandoLista, setCargandoLista] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [errorLista, setErrorLista] = useState('')
  const [errorResumen, setErrorResumen] = useState('')
  const [errorRoles, setErrorRoles] = useState('')
  const [errorDetalle, setErrorDetalle] = useState('')
  const [errorHistorial, setErrorHistorial] = useState('')
  const [aviso, setAviso] = useState('')
  const [confirmacion, setConfirmacion] = useState(null)
  const [formulario, setFormulario] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [errorConfirmacion, setErrorConfirmacion] = useState('')

  const actualizar = useCallback(() => setRevision((n) => n + 1), [])

  useEffect(() => {
    const timer = setTimeout(() => { setNumeroPagina(0); setQ(busqueda.trim()) }, 350)
    return () => clearTimeout(timer)
  }, [busqueda])

  useEffect(() => {
    let activo = true
    Promise.resolve().then(() => { if (activo) { setCargandoLista(true); setErrorLista('') } })
    listarUsuarios({ q, rol: rolFiltro || undefined, estado: estadoFiltro || undefined, page: numeroPagina, size: 10 })
      .then((datos) => { if (activo) { setPagina(datos); if (numeroPagina > 0 && datos.totalPages && numeroPagina >= datos.totalPages) setNumeroPagina(datos.totalPages - 1) } })
      .catch((error) => { if (activo) { setPagina(null); setErrorLista(mensajeErrorApi(error)) } })
      .finally(() => { if (activo) setCargandoLista(false) })
    return () => { activo = false }
  }, [q, rolFiltro, estadoFiltro, numeroPagina, revision])

  useEffect(() => {
    let activo = true
    obtenerResumen().then((datos) => { if (activo) { setResumen(datos); setErrorResumen('') } })
      .catch((error) => { if (activo) { setResumen(null); setErrorResumen(mensajeErrorApi(error)) } })
    obtenerRoles().then((datos) => { if (activo) { setRoles(datos); setErrorRoles('') } })
      .catch((error) => { if (activo) { setRoles([]); setErrorRoles(mensajeErrorApi(error)) } })
    return () => { activo = false }
  }, [revision])

  useEffect(() => {
    if (seleccionadoId === null) return undefined
    let activo = true
    Promise.resolve().then(() => { if (activo) { setCargandoDetalle(true); setErrorDetalle(''); setUsuario(null) } })
    obtenerUsuario(seleccionadoId).then((datos) => { if (activo) { setUsuario(datos); setRolNuevo(datos.rol) } })
      .catch((error) => { if (activo) setErrorDetalle(mensajeErrorApi(error)) })
      .finally(() => { if (activo) setCargandoDetalle(false) })
    return () => { activo = false }
  }, [seleccionadoId, revision])

  useEffect(() => {
    if (seleccionadoId === null) return undefined
    let activo = true
    Promise.resolve().then(() => { if (activo) { setCargandoHistorial(true); setErrorHistorial(''); setHistorial(null) } })
    obtenerAuditoria(seleccionadoId, paginaHistorial).then((datos) => { if (activo) {
      setHistorial(datos)
      if (paginaHistorial > 0 && datos.totalPages && paginaHistorial >= datos.totalPages) setPaginaHistorial(datos.totalPages - 1)
    } }).catch((error) => { if (activo) setErrorHistorial(mensajeErrorApi(error)) })
      .finally(() => { if (activo) setCargandoHistorial(false) })
    return () => { activo = false }
  }, [seleccionadoId, paginaHistorial, revision])

  function seleccionar(id) {
    setSeleccionadoId(id)
    setPaginaHistorial(0)
    setUsuario(null); setHistorial(null); setAviso('')
  }

  function confirmarEstado(estado) {
    if (!usuario || usuario.protegida || usuario.cuentaPropia || usuario.estado === estado) return
    setErrorConfirmacion('')
    setConfirmacion({ tipo: estado === 'BLOQUEADO' ? 'bloqueo' : estado === 'DESACTIVADO' ? 'desactivacion' : 'reactivacion', usuario, anterior: usuario.estado, nuevo: estado })
  }

  function confirmarRol() {
    if (!usuario || usuario.protegida || usuario.cuentaPropia || usuario.estado !== 'ACTIVO' || !roles.some((item) => item.nombre === rolNuevo) || rolNuevo === usuario.rol) return
    setErrorConfirmacion('')
    setConfirmacion({ tipo: 'rol', usuario, anterior: usuario.rol, nuevo: rolNuevo })
  }

  function confirmarEliminar(objetivo) {
    if (!objetivo || objetivo.protegida || objetivo.cuentaPropia) return
    setErrorConfirmacion('')
    setConfirmacion({ tipo: 'eliminacion', usuario: objetivo, anterior: objetivo.estado, nuevo: 'ELIMINADA' })
  }

  async function confirmar() {
    if (!confirmacion || procesando) return
    setProcesando(true); setErrorConfirmacion('')
    try {
      if (confirmacion.tipo === 'eliminacion') {
        await eliminarUsuario(confirmacion.usuario.idUsuario)
        setSeleccionadoId(null); setUsuario(null); setHistorial(null); setPaginaHistorial(0)
      } else if (confirmacion.tipo === 'rol') await cambiarRol(confirmacion.usuario.idUsuario, confirmacion.nuevo)
      else await cambiarEstado(confirmacion.usuario.idUsuario, confirmacion.nuevo)
      setConfirmacion(null); setAviso(confirmacion.tipo === 'eliminacion' ? 'Cuenta eliminada definitivamente.' : 'Cambio guardado correctamente.'); actualizar()
    } catch (error) {
      setErrorConfirmacion(mensajeErrorApi(error))
      // La protección del último administrador puede cambiar por concurrencia: traer datos actuales.
      actualizar()
    } finally { setProcesando(false) }
  }

  async function guardarFormulario(valores) {
    const resultado = formulario === 'alta' ? await crearUsuario(valores) : await editarUsuario(usuario.idUsuario, valores)
    setFormulario(null); setAviso(formulario === 'alta' ? 'Usuario creado correctamente.' : 'Usuario actualizado correctamente.')
    setSeleccionadoId(resultado.idUsuario); setPaginaHistorial(0); actualizar()
  }

  return <div className="administracion h-full overflow-x-auto overflow-y-auto bg-[#111713] text-[#f3f8ef]">
    <div className="mx-auto min-w-[1020px] max-w-[1600px] space-y-5 p-6">
      <header><h1 className="font-display text-3xl font-bold">Administración de usuarios y roles</h1>
        <p className="mt-2 text-xs text-[#a5b7a7]">Gestiona usuarios, permisos y seguridad de la comunidad Insectopia.</p>
        <p className="mt-3 text-[10px] font-semibold tracking-wide text-[#a8e223]">PANEL DE ADMINISTRACIÓN · Acceso exclusivo para administradores</p></header>
      {(aviso || errorResumen || errorRoles) && <div role={errorResumen || errorRoles ? 'alert' : 'status'} className="rounded-xl border border-[#55633e] bg-[#253121] px-4 py-3 text-sm leading-6 text-[#e1efc1]">
        {errorResumen && `No se pudo cargar el resumen: ${errorResumen}. `}{errorRoles && `No se pudieron cargar los roles: ${errorRoles}. `}{aviso}
        {(errorResumen || errorRoles) && <button type="button" onClick={actualizar} className="ml-2 text-[#a8e223]">Reintentar</button>}
      </div>}
      <IndicadoresAdministrativos resumen={resumen} />
      <FiltrosAdministrativos busqueda={busqueda} setBusqueda={setBusqueda} rol={rolFiltro} setRol={(valor) => { setRolFiltro(valor); setNumeroPagina(0) }}
        estado={estadoFiltro} setEstado={(valor) => { setEstadoFiltro(valor); setNumeroPagina(0) }} roles={roles}
        restablecer={() => { setBusqueda(''); setQ(''); setRolFiltro(''); setEstadoFiltro(''); setNumeroPagina(0) }} actualizar={actualizar} cargando={cargandoLista} />
      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4">
        <div className="min-w-0 space-y-4"><TablaAdministrativa pagina={pagina} seleccionadoId={seleccionadoId} seleccionar={seleccionar} irPagina={setNumeroPagina}
          cargando={cargandoLista} error={errorLista} reintentar={actualizar} />
          <HistorialAdministrativo usuarioId={seleccionadoId} pagina={historial} cargando={cargandoHistorial} error={errorHistorial} reintentar={actualizar} irPagina={setPaginaHistorial} /></div>
        <FichaAdministrativa usuario={usuario} cargando={cargandoDetalle} error={errorDetalle} reintentar={actualizar} roles={roles}
          rol={rolNuevo} setRol={setRolNuevo} confirmarRol={confirmarRol} confirmarEstado={confirmarEstado} confirmarEliminar={confirmarEliminar}
          editar={() => setFormulario('edicion')} alta={() => setFormulario('alta')} ocupado={procesando} />
      </div>
    </div>
    {confirmacion && <ConfirmarCambioAdministrativo {...confirmacion} enviando={procesando} error={errorConfirmacion}
      onClose={() => setConfirmacion(null)} onConfirm={confirmar} />}
    {formulario && <FormularioUsuarioAdministrativo key={`${formulario}-${usuario?.idUsuario ?? ''}`} usuario={formulario === 'edicion' ? usuario : null}
      onClose={() => setFormulario(null)} onSave={guardarFormulario} />}
  </div>
}
