package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.junit.jupiter.api.Test;

class OAuthTokenServiceTests {

    private final OAuthTokenService tokens = new OAuthTokenService();

    @Test
    void generaSecretosOpacosAleatoriosYUnicos() {
        String primero = tokens.generar();
        String segundo = tokens.generar();

        assertTrue(primero.matches("[A-Za-z0-9_-]{43}"));
        assertNotEquals(primero, segundo);
        assertFalse(primero.contains("="));
    }

    @Test
    void guardaSoloHashSha256Estable() throws Exception {
        String hash = tokens.hash("abc");

        assertEquals(64, hash.length());
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", hash);
        assertEquals(hash, tokens.hash("abc"));
        assertNotEquals(hash, tokens.hash("abd"));

        byte[] esperado = MessageDigest.getInstance("SHA-256").digest("abc".getBytes(StandardCharsets.UTF_8));
        assertEquals(java.util.HexFormat.of().formatHex(esperado), hash);
    }

    @Test
    void laContrasenaDesconocidaNoSeReutilizaNiSeGuardaEnClaro() {
        String secreto = tokens.generarContrasenaDesconocida();

        assertTrue(secreto.matches("[A-Za-z0-9_-]{64}"));
        assertNotEquals(secreto, tokens.generarContrasenaDesconocida());
        assertFalse(tokens.hash(secreto).equals(secreto));
    }
}
