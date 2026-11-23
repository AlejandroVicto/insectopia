package com.insectopia.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Constructor;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.insectopia.services.PasswordRecoveryProperties;

class PasswordRecoveryRateLimiterTests {

    @Test
    void aplicaIntervaloMinimoYLimitePorCorreo() {
        Reloj reloj = new Reloj();
        PasswordRecoveryProperties properties = new PasswordRecoveryProperties("local", "",
                "http://localhost:5173", "no-reply@insectopia.invalid", 15,
                60, 3, 15, 30, 15, 10_000);
        PasswordRecoveryRateLimiter limite = new PasswordRecoveryRateLimiter(properties, reloj);

        assertTrue(limite.permitir("uno@ejemplo.com", "1.1.1.1"));
        assertFalse(limite.permitir("uno@ejemplo.com", "2.2.2.2"));
        reloj.avanzar(Duration.ofSeconds(61));
        assertTrue(limite.permitir("uno@ejemplo.com", "3.3.3.3"));
        assertFalse(limite.permitir("uno@ejemplo.com", "4.4.4.4"));
    }

    @Test
    void limitaTambienPorOrigenConCorreosDistintos() {
        Reloj reloj = new Reloj();
        PasswordRecoveryProperties properties = new PasswordRecoveryProperties("local", "",
                "http://localhost:5173", "no-reply@insectopia.invalid", 15,
                0, 10, 15, 2, 15, 10_000);
        PasswordRecoveryRateLimiter limite = new PasswordRecoveryRateLimiter(properties, reloj);

        assertTrue(limite.permitir("uno@ejemplo.com", "10.0.0.1"));
        assertTrue(limite.permitir("dos@ejemplo.com", "10.0.0.1"));
        assertFalse(limite.permitir("tres@ejemplo.com", "10.0.0.1"));
        assertTrue(limite.permitir("tres@ejemplo.com", "10.0.0.2"));
    }

    @Test
    void elConstructorPublicoEstaMarcadoParaLaInyeccionDeSpring() throws Exception {
        Constructor<PasswordRecoveryRateLimiter> constructor =
                PasswordRecoveryRateLimiter.class.getConstructor(PasswordRecoveryProperties.class);

        assertNotNull(constructor.getAnnotation(Autowired.class));
    }

    private static final class Reloj extends Clock {
        private Instant ahora = Instant.parse("2026-01-01T00:00:00Z");

        private void avanzar(Duration duracion) {
            ahora = ahora.plus(duracion);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return this;
        }

        @Override
        public Instant instant() {
            return ahora;
        }
    }
}
