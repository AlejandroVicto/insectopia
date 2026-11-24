package com.insectopia.security;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Estado OAuth opaco con un sufijo interno que permite recuperar la intención sin
 * sustituir ni debilitar el estado aleatorio validado por Spring Security.
 */
public record GoogleOAuthState(String intent, String linkToken) {

    public static final String INTENT_LOGIN = "login";
    public static final String INTENT_VINCULACION = "vinculacion";
    public static final Pattern ES_TOKEN_VINCULACION = Pattern.compile("[A-Za-z0-9_-]{1,128}");

    private static final String SEPARADOR = "|";
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    public static String appendTo(String estadoAleatorio, HttpServletRequest request) {
        String intent = INTENT_VINCULACION.equalsIgnoreCase(request.getParameter("intent"))
                ? INTENT_VINCULACION : INTENT_LOGIN;
        String payload = intent;
        if (INTENT_VINCULACION.equals(intent)) {
            String token = request.getParameter("linkToken");
            if (token != null && ES_TOKEN_VINCULACION.matcher(token).matches()) {
                payload = intent + SEPARADOR + token;
            }
        }
        return estadoAleatorio + "."
                + ENCODER.encodeToString(payload.getBytes(StandardCharsets.UTF_8));
    }

    public static GoogleOAuthState from(HttpServletRequest request) {
        String state = request.getParameter("state");
        if (state == null || state.isBlank()) {
            return new GoogleOAuthState(INTENT_LOGIN, null);
        }
        int punto = state.lastIndexOf('.');
        if (punto < 0 || punto == state.length() - 1) {
            return new GoogleOAuthState(INTENT_LOGIN, null);
        }
        try {
            String payload = new String(DECODER.decode(state.substring(punto + 1)), StandardCharsets.UTF_8);
            String[] partes = payload.split("\\|", -1);
            String intent = partes.length > 0 && INTENT_VINCULACION.equals(partes[0])
                    ? INTENT_VINCULACION : INTENT_LOGIN;
            String token = intent.equals(INTENT_VINCULACION) && partes.length == 2
                    && ES_TOKEN_VINCULACION.matcher(partes[1]).matches() ? partes[1] : null;
            return new GoogleOAuthState(intent, token);
        } catch (IllegalArgumentException exception) {
            return new GoogleOAuthState(INTENT_LOGIN, null);
        }
    }
}
