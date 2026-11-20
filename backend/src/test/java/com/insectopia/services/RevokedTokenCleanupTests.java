package com.insectopia.services;

import static org.mockito.Mockito.*;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import com.insectopia.repository.TokenRevocadoRepository;

class RevokedTokenCleanupTests {
    @Test void soloSolicitaBorrarLasRevocacionesAnterioresAUTCActual() {
        TokenRevocadoRepository revoked = mock(TokenRevocadoRepository.class);
        Instant now = Instant.parse("2026-11-20T12:30:00Z");
        new RevokedTokenCleanup(revoked, Clock.fixed(now, ZoneOffset.UTC)).deleteExpired();
        verify(revoked).deleteByFechaExpiracionBefore(LocalDateTime.ofInstant(now, ZoneOffset.UTC));
        verifyNoMoreInteractions(revoked);
    }
}
