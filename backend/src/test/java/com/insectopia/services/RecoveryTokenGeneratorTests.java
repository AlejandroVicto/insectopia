package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class RecoveryTokenGeneratorTests {

    private final RecoveryTokenGenerator generador = new RecoveryTokenGenerator();

    @Test
    void generaBase64UrlSinPaddingCon256BitsYAlmacenaSoloElHash() {
        RecoveryTokenGenerator.Generado token = generador.generar();

        assertEquals(43, token.valor().length());
        assertTrue(token.valor().matches("[A-Za-z0-9_-]{43}"));
        assertFalse(token.valor().contains("="));
        assertEquals(64, token.hash().length());
        assertTrue(token.hash().matches("[0-9a-f]{64}"));
        assertEquals(generador.hash(token.valor()), token.hash());
        assertNotEquals(token.valor(), token.hash());
        assertFalse(token.toString().contains(token.valor()));
        assertFalse(token.toString().contains(token.hash()));
    }

    @Test
    void cadaSolicitudProduceUnTokenDistinto() {
        assertNotEquals(generador.generar().valor(), generador.generar().valor());
    }
}
