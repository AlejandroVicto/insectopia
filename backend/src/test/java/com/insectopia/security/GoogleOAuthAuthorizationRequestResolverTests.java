package com.insectopia.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

class GoogleOAuthAuthorizationRequestResolverTests {

    private final ClientRegistrationRepository registrations = new InMemoryClientRegistrationRepository(
            registracion("google"), registracion("otro-proveedor"));
    private final GoogleOAuthAuthorizationRequestResolver resolver =
            new GoogleOAuthAuthorizationRequestResolver(registrations);

    @Test
    void conservaStateAleatorioAnexaLaIntencionYMantieneElNonceOidc() throws Exception {
        MockHttpServletRequest request = solicitud("google");
        request.setParameter("intent", "vinculacion");
        request.setParameter("linkToken", "token_opaco_123");

        OAuth2AuthorizationRequest authorization = resolver.resolve(request);

        assertNotNull(authorization);
        assertEquals(Set.of("openid", "email", "profile"), authorization.getScopes());
        assertNotNull(authorization.getAttribute("nonce"));

        String state = authorization.getState();
        assertTrue(state.contains("."));
        assertFalse(state.substring(0, state.lastIndexOf('.')).isBlank());
        assertEquals("vinculacion|token_opaco_123", decodificar(state));

        Map<String, String> parametros = parametros(authorization.getAuthorizationRequestUri());
        assertEquals(state, parametros.get("state"));
        // Spring Security 7 envía el hash del nonce y conserva el original en la sesión
        // para validar el claim nonce del id_token sin aceptar uno manipulado.
        Object nonce = authorization.getAttribute("nonce");
        assertEquals(hashSinRelleno(String.valueOf(nonce)), parametros.get("nonce"));
        assertEquals("cliente-de-prueba", parametros.get("client_id"));
    }

    @Test
    void elLoginSinParametrosSoloAnexaLaIntencionPorDefecto() {
        OAuth2AuthorizationRequest authorization = resolver.resolve(solicitud("google"));

        assertNotNull(authorization);
        assertEquals("login", decodificar(authorization.getState()));
        assertNotNull(authorization.getAttribute("nonce"));
    }

    @Test
    void noModificaOtrasRegistraciones() {
        OAuth2AuthorizationRequest authorization = resolver.resolve(solicitud("otro-proveedor"));

        assertNotNull(authorization);
        assertFalse(authorization.getState().contains("."));
    }

    private static MockHttpServletRequest solicitud(String registrationId) {
        String uri = "/oauth2/authorization/" + registrationId;
        MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
        request.setServletPath(uri);
        request.setRequestURI(uri);
        return request;
    }

    private static String hashSinRelleno(String valor) throws Exception {
        byte[] hash = java.security.MessageDigest.getInstance("SHA-256")
                .digest(valor.getBytes(StandardCharsets.US_ASCII));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
    }

    private static Map<String, String> parametros(String uri) {
        Map<String, String> resultado = new HashMap<>();
        for (String parametro : URI.create(uri).getQuery().split("&")) {
            int separador = parametro.indexOf('=');
            resultado.put(parametro.substring(0, separador),
                    URLDecoder.decode(parametro.substring(separador + 1), StandardCharsets.UTF_8));
        }
        return resultado;
    }

    private static String decodificar(String state) {
        String sufijo = state.substring(state.lastIndexOf('.') + 1);
        return new String(Base64.getUrlDecoder().decode(sufijo), StandardCharsets.UTF_8);
    }

    private static ClientRegistration registracion(String id) {
        return ClientRegistration.withRegistrationId(id)
                .clientId("cliente-de-prueba")
                .clientSecret("secreto-de-prueba")
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("http://localhost:8080/login/oauth2/code/" + id)
                .scope("openid", "email", "profile")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
                .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .issuerUri("https://accounts.google.com")
                .userNameAttributeName("sub")
                .clientName(id)
                .build();
    }
}
