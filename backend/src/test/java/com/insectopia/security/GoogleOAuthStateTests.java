package com.insectopia.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class GoogleOAuthStateTests {

    private static final String ESTADO_ALEATORIO = "b7b6c0f4-d9d5-4b0e-b1b3-df6e6d51f9a0";

    @Test
    void conservaElEstadoAleatorioYSoloAnadeLaIntencionDeLogin() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/oauth2/authorization/google");

        String estado = GoogleOAuthState.appendTo(ESTADO_ALEATORIO, request);

        assertTrue(estado.startsWith(ESTADO_ALEATORIO + "."));
        assertEquals("login", decodificar(estado));
        GoogleOAuthState resultado = GoogleOAuthState.from(conEstado(estado));
        assertEquals(GoogleOAuthState.INTENT_LOGIN, resultado.intent());
        assertNull(resultado.linkToken());
    }

    @Test
    void recuperaLaIntencionDeVinculacionYSuToken() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/oauth2/authorization/google");
        request.setParameter("intent", "vinculacion");
        request.setParameter("linkToken", "token_opaco_ABC-123_xyz");

        String estado = GoogleOAuthState.appendTo(ESTADO_ALEATORIO, request);

        assertEquals("vinculacion|token_opaco_ABC-123_xyz", decodificar(estado));
        GoogleOAuthState resultado = GoogleOAuthState.from(conEstado(estado));
        assertEquals(GoogleOAuthState.INTENT_VINCULACION, resultado.intent());
        assertEquals("token_opaco_ABC-123_xyz", resultado.linkToken());
    }

    @Test
    void descartaTokensMalformadosYIntencionesDesconocidas() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/oauth2/authorization/google");
        request.setParameter("intent", "administrador");
        request.setParameter("linkToken", "token con espacios");

        String estado = GoogleOAuthState.appendTo(ESTADO_ALEATORIO, request);

        assertEquals("login", decodificar(estado));

        String intencionDesconocida = ESTADO_ALEATORIO + "."
                + Base64.getUrlEncoder().withoutPadding().encodeToString(
                        "administrador|admin".getBytes(StandardCharsets.UTF_8));
        GoogleOAuthState resultado = GoogleOAuthState.from(conEstado(intencionDesconocida));
        assertEquals(GoogleOAuthState.INTENT_LOGIN, resultado.intent());
        assertNull(resultado.linkToken());

        String tokenMalformado = ESTADO_ALEATORIO + "."
                + Base64.getUrlEncoder().withoutPadding().encodeToString(
                        "vinculacion|admin|extra".getBytes(StandardCharsets.UTF_8));
        GoogleOAuthState conTokenInvalido = GoogleOAuthState.from(conEstado(tokenMalformado));
        assertEquals(GoogleOAuthState.INTENT_VINCULACION, conTokenInvalido.intent());
        assertNull(conTokenInvalido.linkToken());
    }

    @Test
    void unEstadoSinSufijoSeTrataComoLogin() {
        GoogleOAuthState resultado = GoogleOAuthState.from(conEstado(ESTADO_ALEATORIO));

        assertEquals(GoogleOAuthState.INTENT_LOGIN, resultado.intent());
        assertNull(resultado.linkToken());
    }

    private static String decodificar(String estado) {
        String sufijo = estado.substring(estado.lastIndexOf('.') + 1);
        return new String(Base64.getUrlDecoder().decode(sufijo), StandardCharsets.UTF_8);
    }

    private static MockHttpServletRequest conEstado(String state) {
        MockHttpServletRequest callback = new MockHttpServletRequest("GET", "/login/oauth2/code/google");
        callback.setParameter("state", state);
        return callback;
    }
}
