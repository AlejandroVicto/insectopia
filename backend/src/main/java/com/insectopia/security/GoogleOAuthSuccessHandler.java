package com.insectopia.security;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.insectopia.services.GoogleOAuthService;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * No crea ninguna sesión de aplicación: convierte la identidad OIDC verificada
 * en un código opaco de un solo uso que el frontend intercambia por su JWT.
 */
@Component
public class GoogleOAuthSuccessHandler implements AuthenticationSuccessHandler {

    private final GoogleOAuthService google;

    public GoogleOAuthSuccessHandler(GoogleOAuthService google) {
        this.google = google;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {
        OAuthResponseHeaders.apply(response);
        if (!(authentication.getPrincipal() instanceof OidcUser oidc)) {
            response.sendRedirect(google.urlFallo("id_token_invalido"));
            return;
        }

        var idToken = oidc.getIdToken();
        var userInfo = oidc.getUserInfo();
        GoogleOAuthState estado = GoogleOAuthState.from(request);
        String nombre = primero(idToken.getFullName(), userInfo == null ? null : userInfo.getFullName());
        String foto = primero(idToken.getPicture(), userInfo == null ? null : userInfo.getPicture());

        response.sendRedirect(google.procesarIdentidad(
                idToken.getSubject(),
                idToken.getEmail(),
                nombre,
                foto,
                idToken.getEmailVerified(),
                estado.intent(),
                estado.linkToken()));
    }

    private static String primero(String... valores) {
        for (String valor : valores) {
            if (valor != null && !valor.isBlank()) return valor;
        }
        return null;
    }
}
