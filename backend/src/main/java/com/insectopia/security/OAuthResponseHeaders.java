package com.insectopia.security;

import jakarta.servlet.http.HttpServletResponse;

/** Evita que códigos opacos, JWT o respuestas OIDC queden en cachés o referrers. */
public final class OAuthResponseHeaders {

    private OAuthResponseHeaders() { }

    public static void apply(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Expires", "0");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("X-Content-Type-Options", "nosniff");
    }
}
