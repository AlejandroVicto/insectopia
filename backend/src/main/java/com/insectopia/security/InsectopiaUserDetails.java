package com.insectopia.security;

import java.util.Collection;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Immutable snapshot of the current database record, never built from untrusted JWT authorities. */
public record InsectopiaUserDetails(
		Long idUsuario,
		String correo,
		String passwordHash,
		String role,
		int versionToken,
		Collection<? extends GrantedAuthority> authorities) implements UserDetails {

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return authorities;
	}

	@Override
	public String getPassword() {
		return passwordHash;
	}

	@Override
	public String getUsername() {
		return correo;
	}

	@Override
	public String toString() {
		return "InsectopiaUserDetails[idUsuario=" + idUsuario + "]";
	}
}
