package com.insectopia.security;

import java.util.ArrayList;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** Authorities for method-level checks (e.g. @PreAuthorize("hasAuthority('EVENTO_RESOLVER')")). */
public final class Permissions {

	public static final String CONTENIDO_LEER = "CONTENIDO_LEER";
	public static final String EVENTO_PROPONER = "EVENTO_PROPONER";
	public static final String PUBLICACION_REPORTAR = "PUBLICACION_REPORTAR";
	public static final String EVENTO_REVISAR = "EVENTO_REVISAR";
	public static final String EVENTO_RESOLVER = "EVENTO_RESOLVER";
	public static final String REPORTE_REVISAR = "REPORTE_REVISAR";
	public static final String REPORTE_RESOLVER = "REPORTE_RESOLVER";
	public static final String USUARIO_GESTIONAR = "USUARIO_GESTIONAR";
	public static final String ROL_ASIGNAR = "ROL_ASIGNAR";
	public static final String MODULO_ADMINISTRAR = "MODULO_ADMINISTRAR";

	private static final List<String> USER = List.of(
			CONTENIDO_LEER, EVENTO_PROPONER, PUBLICACION_REPORTAR);
	private static final List<String> MODERATOR = List.of(
			EVENTO_REVISAR, EVENTO_RESOLVER, REPORTE_REVISAR, REPORTE_RESOLVER);
	private static final List<String> ADMIN = List.of(
			USUARIO_GESTIONAR, ROL_ASIGNAR, MODULO_ADMINISTRAR);

	private Permissions() {
	}

	public static List<GrantedAuthority> authoritiesFor(String role) {
		if (!"USUARIO".equals(role) && !"MODERADOR".equals(role) && !"ADMINISTRADOR".equals(role)) {
			throw new IllegalArgumentException("Rol no reconocido");
		}
		List<GrantedAuthority> authorities = new ArrayList<>();
		authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
		USER.forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
		if (!"USUARIO".equals(role)) {
			MODERATOR.forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
		}
		if ("ADMINISTRADOR".equals(role)) {
			ADMIN.forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
		}
		return List.copyOf(authorities);
	}
}
