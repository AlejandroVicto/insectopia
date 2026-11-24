package com.insectopia.security;

import java.io.IOException;

import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import com.insectopia.services.GoogleOAuthService;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Redirige siempre a un código controlado, sin exponer detalles del error OAuth. */
@Component
public class GoogleOAuthFailureHandler implements AuthenticationFailureHandler {

    private final GoogleOAuthService google;

    public GoogleOAuthFailureHandler(GoogleOAuthService google) {
        this.google = google;
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {
        OAuthResponseHeaders.apply(response);
        response.sendRedirect(google.urlFallo(request.getParameter("error")));
    }
}
