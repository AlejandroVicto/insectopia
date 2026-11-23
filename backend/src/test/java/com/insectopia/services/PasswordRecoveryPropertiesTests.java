package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PasswordRecoveryPropertiesTests {

    private static PasswordRecoveryProperties properties(
            String entorno, String perfiles, String url, String remitente) {
        return new PasswordRecoveryProperties(entorno, perfiles, url, remitente, 15,
                60, 3, 15, 30, 15, 10_000);
    }

    @Test
    void construyeElEnlaceSinUsarCabecerasYCodificaElToken() {
        PasswordRecoveryProperties properties = properties(
                "local", "", "http://localhost:5173", "no-reply@insectopia.invalid");

        String enlace = properties.construirEnlace("a+b/c=");

        assertEquals("http://localhost:5173/restablecer-contrasena?token=a%2Bb%2Fc%3D", enlace);
        assertEquals(15, properties.expirationMinutes());
    }

    @Test
    void produccionExigeHttpsDominioRealYRemitenteReal() {
        assertThrows(IllegalStateException.class, () -> properties(
                "production", "", "http://insectopia.org", "no-reply@insectopia.org"));
        assertThrows(IllegalStateException.class, () -> properties(
                "production", "", "https://localhost", "no-reply@insectopia.org"));
        assertThrows(IllegalStateException.class, () -> properties(
                "production", "", "https://DOMINIO_REAL", "no-reply@DOMINIO_REAL"));
        assertThrows(IllegalStateException.class, () -> properties(
                "production", "", "https://insectopia.org", "no-reply@insectopia.invalid"));

        PasswordRecoveryProperties validas = properties(
                "production", "", "https://insectopia.org", "no-reply@insectopia.org");
        assertTrue(validas.construirEnlace("abc").startsWith("https://"));
    }

    @Test
    void elPerfilDeProduccionTambienActivaLaValidacion() {
        assertThrows(IllegalStateException.class, () -> properties(
                "local", "prod", "http://localhost:5173", "no-reply@insectopia.invalid"));
    }
}
