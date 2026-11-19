package com.insectopia.security;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import com.insectopia.repository.PublicacionRepository;

/** Use with @PreAuthorize("hasAuthority('...') and @resourceAccess.ownsPublication(authentication, #publicationId)"). */
@Component("resourceAccess")
public class ResourceAccess {
	private final PublicacionRepository publicaciones;

	public ResourceAccess(PublicacionRepository publicaciones) {
		this.publicaciones = publicaciones;
	}

	/** The resource owner comes from the database, not from a client-supplied owner id. */
	public boolean ownsPublication(Authentication authentication, Long publicationId) {
		return publicationId != null && authentication != null && authentication.isAuthenticated()
				&& authentication.getPrincipal() instanceof InsectopiaUserDetails user
				&& publicaciones.existsByIdPublicacionAndUsuario_IdUsuario(publicationId, user.idUsuario());
	}
}
