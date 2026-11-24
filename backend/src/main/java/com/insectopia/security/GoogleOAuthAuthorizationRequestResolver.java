package com.insectopia.security;

import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;

import jakarta.servlet.http.HttpServletRequest;

/** Añade la intención al estado aleatorio generado por Spring, sin reemplazarlo. */
public final class GoogleOAuthAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private final DefaultOAuth2AuthorizationRequestResolver delegate;

    public GoogleOAuthAuthorizationRequestResolver(ClientRegistrationRepository registrations) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(registrations);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        return conEstado(delegate.resolve(request), request);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        return conEstado(delegate.resolve(request, clientRegistrationId), request);
    }

    private static OAuth2AuthorizationRequest conEstado(OAuth2AuthorizationRequest solicitud,
            HttpServletRequest request) {
        if (solicitud == null || !"google".equals(solicitud.getAttribute(OAuth2ParameterNames.REGISTRATION_ID))) {
            return solicitud;
        }
        String estado = solicitud.getState();
        if (estado == null || estado.isBlank()) {
            return solicitud;
        }
        return OAuth2AuthorizationRequest.from(solicitud)
                .state(GoogleOAuthState.appendTo(estado, request))
                .build();
    }
}
