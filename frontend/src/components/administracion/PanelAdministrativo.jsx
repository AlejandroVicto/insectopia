const ESTADOS = ['ACTIVO', 'BLOQUEADO', 'DESACTIVADO']
const INDICADORES = [
  ['Total usuarios', 'totalUsuarios'], ['Rol USUARIO', 'usuarios'], ['Rol MODERADOR', 'moderadores'],
  ['Rol ADMINISTRADOR', 'administradores'], ['Cuentas desactivadas', 'cuentasDesactivadas'],
]
const campo = 'h-11 min-w-0 rounded-xl border border-[#35483a] bg-[#141d17] px-3 text-xs text-[#f3f8ef] disabled:cursor-not-allowed disabled:opacity-60'

export function IndicadoresAdministrativos({ resumen }) {
  return <section aria-label="Indicadores de usuarios" className="grid grid-cols-5 gap-3">
    {INDICADORES.map(([nombre, clave]) => <div key={clave} className="relative min-w-0 rounded-2xl border border-[#35483a] bg-[#19261e] p-4">
      <p className="text-xs font-semibold text-[#a5b7a7]">{nombre}</p>
      <p className="mt-1 font-display text-2xl font-bold" aria-label={`${nombre}: ${resumen?.[clave] ?? 'no disponible'}`}>{resumen?.[clave] ?? '—'}</p>
      <span aria-hidden="true" className="absolute right-4 top-4 size-2.5 rounded-full bg-[#a8e223]" />
    </div>)}
  </section>
}

export function FiltrosAdministrativos({ busqueda, setBusqueda, rol, setRol, estado, setEstado, roles, restablecer, actualizar, cargando }) {
  return <section aria-label="Filtros de usuarios" className="grid grid-cols-[minmax(240px,2fr)_repeat(2,minmax(140px,1fr))_auto_auto] items-center gap-3 rounded-2xl border border-[#35483a] bg-[#19261e] p-4">
    <label className="sr-only" htmlFor="admin-busqueda">Buscar nombre, usuario o correo</label>
    <input id="admin-busqueda" type="search" maxLength={100} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="⌕  Buscar nombre, @usuario o correo" className={campo} />
    <label className="sr-only" htmlFor="admin-rol">Filtrar por rol</label>
    <select id="admin-rol" className={campo} value={rol} onChange={(e) => setRol(e.target.value)}>
      <option value="">Rol: Todos</option>
      {roles.map((item) => <option key={item.nombre} value={item.nombre}>{item.nombre}</option>)}
    </select>
    <label className="sr-only" htmlFor="admin-estado">Filtrar por estado</label>
    <select id="admin-estado" className={campo} value={estado} onChange={(e) => setEstado(e.target.value)}>
      <option value="">Estado: Todos</option>
      {ESTADOS.map((item) => <option key={item}>{item}</option>)}
    </select>
    <button type="button" onClick={restablecer} className="admin-boton-secundario h-11 whitespace-nowrap">Restablecer filtros</button>
    <button type="button" onClick={actualizar} disabled={cargando} className="admin-boton-primario h-11 whitespace-nowrap">↻ Actualizar</button>
  </section>
}

export function TablaAdministrativa({ pagina, seleccionadoId, seleccionar, irPagina, cargando, error, reintentar }) {
  return <section aria-labelledby="admin-tabla-titulo" className="overflow-hidden rounded-2xl border border-[#35483a] bg-[#19261e]">
    <div className="px-5 py-4">
      <h2 id="admin-tabla-titulo" className="font-display text-lg font-bold">Usuarios registrados</h2>
      <p className="mt-1 text-xs text-[#a5b7a7]">Consulta miembros, revisa su estado y administra sus permisos.</p>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[780px] table-fixed text-left text-xs">
      <thead className="bg-[#223127] text-[10px] font-semibold uppercase text-[#a5b7a7]"><tr>
        <th scope="col" className="w-[25%] px-4 py-4">Usuario</th><th scope="col" className="w-[24%] px-2">Correo</th>
        <th scope="col" className="w-[15%] px-2">Rol</th><th scope="col" className="w-[14%] px-2">Estado</th>
        <th scope="col" className="w-[14%] px-2">Región</th><th scope="col" className="w-[8%] px-2">Acción</th>
      </tr></thead>
      <tbody>{cargando || error || !pagina?.content?.length ? <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-[#a5b7a7]">
        {cargando ? 'Cargando usuarios…' : error ? <><span role="alert">{error}</span> <button type="button" onClick={reintentar} className="text-[#a8e223]">Reintentar</button></> : 'No se encontraron usuarios para estos filtros.'}
      </td></tr> : pagina.content.map((usuario) => <tr key={usuario.idUsuario} className={`border-t border-[#35483a] ${seleccionadoId === usuario.idUsuario ? 'bg-[#253721]' : ''}`}>
        <td className="px-4 py-3"><span className="font-semibold">{usuario.nombre}</span><span className="block text-[#a5b7a7]">@{usuario.nombreUsuario}</span></td>
        <td className="break-all px-2">{usuario.correo}</td><td className="px-2">{usuario.rol}</td><td className="px-2">{usuario.estado}</td>
        <td className="px-2">{usuario.estadoRegion}, {usuario.paisCodigo}</td>
        <td className="px-2"><button type="button" onClick={() => seleccionar(usuario.idUsuario)} className="text-[#a8e223]">Ver ficha</button></td>
      </tr>)}</tbody>
    </table></div>
    <div className="flex items-center justify-between gap-4 border-t border-[#35483a] px-5 py-4 text-xs text-[#a5b7a7]">
      <span>{pagina ? `Página ${pagina.number + 1} de ${Math.max(1, pagina.totalPages)} · ${pagina.totalElements} usuarios` : 'Paginación no disponible'}</span>
      <div className="flex gap-3"><button type="button" disabled={cargando || !pagina || pagina.first} onClick={() => irPagina(pagina.number - 1)} className="text-[#a8e223]">‹ Anterior</button>
        <button type="button" disabled={cargando || !pagina || pagina.last} onClick={() => irPagina(pagina.number + 1)} className="text-[#a8e223]">Siguiente ›</button></div>
    </div>
  </section>
}

function fecha(valor) { return valor ? new Date(`${valor}Z`).toLocaleString('es-ES') : 'No disponible' }

export function FichaAdministrativa({ usuario, cargando, error, reintentar, roles, rol, setRol, confirmarRol, confirmarEstado, confirmarEliminar, editar, alta, ocupado }) {
  const bloqueado = ocupado || !usuario || usuario.protegida || usuario.cuentaPropia
  return <section aria-labelledby="admin-ficha-titulo" className="rounded-2xl border border-[#35483a] bg-[#19261e] p-5">
    <h2 id="admin-ficha-titulo" className="font-display text-lg font-bold">Gestionar usuario</h2>
    <p className="mt-1 text-xs text-[#a5b7a7]">Información, actividad y permisos del miembro seleccionado</p>
    <button type="button" onClick={alta} className="admin-boton-primario mt-5 w-full">+ Alta de usuario</button>
    {cargando ? <p role="status" className="mt-5">Cargando ficha…</p> : error ? <p role="alert" className="mt-5 text-red-300">{error} <button type="button" onClick={reintentar} className="text-[#a8e223]">Reintentar</button></p> : usuario ? <>
      <div className="mt-5 rounded-xl bg-[#141d17] p-4 text-xs leading-5"><p className="font-semibold">{usuario.nombre} · @{usuario.nombreUsuario}</p>
        <p className="break-all text-[#a5b7a7]">{usuario.correo}</p><p className="text-[#a5b7a7]">{usuario.estadoRegion}, {usuario.paisCodigo} · {usuario.estado}</p>
        {(usuario.protegida || usuario.cuentaPropia) && <p className="mt-2 text-amber-200">{usuario.protegida ? 'Cuenta de evaluación protegida.' : 'No puedes gestionar tu propia cuenta.'}</p>}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-[#141d17] p-4 text-xs">
        <div><p className="text-[10px] font-semibold text-[#a5b7a7]">FECHA DE REGISTRO</p><p className="mt-2">{fecha(usuario.fechaRegistro)}</p></div>
        <div><p className="text-[10px] font-semibold text-[#a5b7a7]">ÚLTIMA ACTUALIZACIÓN</p><p className="mt-2">{fecha(usuario.fechaActualizacion)}</p></div>
      </div>
      <label htmlFor="admin-rol-usuario" className="mt-6 block text-[10px] font-semibold text-[#a5b7a7]">ROL DEL USUARIO</label>
      <select id="admin-rol-usuario" disabled={bloqueado || usuario.estado !== 'ACTIVO'} value={rol} onChange={(e) => setRol(e.target.value)} className={`${campo} mt-2 w-full`}>
        <option value={usuario.rol}>{usuario.rol}</option>{roles.filter((item) => item.nombre !== usuario.rol).map((item) => <option key={item.nombre} value={item.nombre}>{item.nombre}</option>)}
      </select>
      <label htmlFor="admin-estado-usuario" className="mt-5 block text-[10px] font-semibold text-[#a5b7a7]">ESTADO DE LA CUENTA</label>
      <select id="admin-estado-usuario" disabled={bloqueado} value={usuario.estado} onChange={(e) => confirmarEstado(e.target.value)} className={`${campo} mt-2 w-full`}>
        {ESTADOS.filter((item) => item !== 'BLOQUEADO' || usuario.estado === 'BLOQUEADO').map((item) => <option key={item}>{item}</option>)}
      </select>
      <p className="mt-4 rounded-xl bg-[#223127] p-3 text-xs text-[#a5b7a7]">Los permisos dependen del rol asignado; no se editan individualmente.</p>
      <button type="button" disabled={bloqueado || usuario.estado !== 'ACTIVO' || rol === usuario.rol} onClick={confirmarRol} className="admin-boton-primario mt-5 w-full">Guardar cambios de rol</button>
      <button type="button" disabled={bloqueado} onClick={editar} className="admin-boton-secundario mt-3 w-full">Editar datos</button>
      <button type="button" disabled={bloqueado} onClick={() => confirmarEliminar(usuario)} className="admin-boton-secundario mt-3 w-full text-red-300">Eliminar cuenta</button>
      <button type="button" disabled={bloqueado || usuario.estado === 'DESACTIVADO'} onClick={() => confirmarEstado('DESACTIVADO')} className="admin-boton-secundario mt-3 w-full text-red-300">Desactivar cuenta</button>
      {usuario.estado !== 'ACTIVO' && <button type="button" disabled={bloqueado} onClick={() => confirmarEstado('ACTIVO')} className="admin-boton-secundario mt-3 w-full">Reactivar cuenta</button>}
    </> : <p className="mt-5 rounded-xl bg-[#141d17] p-4 text-xs leading-5 text-[#a5b7a7]">Selecciona un usuario para consultar su ficha.</p>}
  </section>
}

export function HistorialAdministrativo({ usuarioId, pagina, cargando, error, reintentar, irPagina }) {
  return <section aria-labelledby="admin-historial-titulo" className="rounded-2xl border border-[#35483a] bg-[#19261e] p-5">
    <h2 id="admin-historial-titulo" className="font-display text-base font-bold">Historial de cambios de rol</h2>
    {!usuarioId ? <p className="mt-2 text-xs text-[#a5b7a7]">Selecciona un usuario para consultar su historial.</p>
      : cargando ? <p role="status" className="mt-2 text-xs">Cargando auditoría…</p>
        : error ? <p role="alert" className="mt-2 text-xs text-red-300">{error} <button type="button" onClick={reintentar} className="text-[#a8e223]">Reintentar</button></p>
          : <><div className="mt-3 space-y-2 text-xs">{pagina?.content?.length ? pagina.content.map((registro) => <div key={registro.idAuditoria} className="rounded-xl bg-[#141d17] p-3">
            <p>{registro.rolAnterior} → {registro.rolNuevo}</p><p className="text-[#a5b7a7]">{registro.nombreAdministrador} · {fecha(registro.fechaCambio)}</p>
          </div>) : <p className="text-[#a5b7a7]">Sin cambios de rol registrados.</p>}</div>
            {pagina && <div className="mt-3 flex justify-between text-xs"><span>Página {pagina.number + 1} de {Math.max(1, pagina.totalPages)}</span>
              <div className="flex gap-3"><button type="button" disabled={pagina.first} onClick={() => irPagina(pagina.number - 1)}>‹ Anterior historial</button>
                <button type="button" disabled={pagina.last} onClick={() => irPagina(pagina.number + 1)}>Siguiente historial ›</button></div></div>}</>}
  </section>
}
