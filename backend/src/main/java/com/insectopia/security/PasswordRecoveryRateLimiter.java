package com.insectopia.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.insectopia.services.PasswordRecoveryProperties;

/**
 * Límite acotado en memoria para una sola instancia. Los contadores se reinician
 * al reiniciar la aplicación. Se aplica antes de buscar la cuenta, por lo que no
 * revela si el correo existe.
 */
@Component
public class PasswordRecoveryRateLimiter {

    private final PasswordRecoveryProperties properties;
    private final Clock clock;
    private final ConcurrentHashMap<String, Intentos> porCorreo = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Intentos> porOrigen = new ConcurrentHashMap<>();

    @Autowired
    public PasswordRecoveryRateLimiter(PasswordRecoveryProperties properties) {
        this(properties, Clock.systemUTC());
    }

    PasswordRecoveryRateLimiter(PasswordRecoveryProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public boolean permitir(String correoNormalizado, String origen) {
        Instant ahora = clock.instant();
        limpiar(porCorreo, ahora);
        limpiar(porOrigen, ahora);
        boolean correoPermitido = registrar(porCorreo, correoNormalizado, ahora,
                properties.emailMinimumInterval(), properties.emailMaxAttempts(), properties.emailWindow());
        boolean origenPermitido = registrar(porOrigen, origen == null ? "desconocido" : origen, ahora,
                Duration.ZERO, properties.ipMaxAttempts(), properties.ipWindow());
        return correoPermitido && origenPermitido;
    }

    private boolean registrar(ConcurrentHashMap<String, Intentos> mapa, String clave, Instant ahora,
            Duration intervaloMinimo, int maximo, Duration ventana) {
        synchronized (mapa) {
            if (!mapa.containsKey(clave) && mapa.size() >= properties.maxTrackedOrigins()) {
                return false;
            }
            Intentos registro = mapa.computeIfAbsent(clave, ignored -> new Intentos());
            return registro.registrar(ahora, intervaloMinimo, maximo, ventana);
        }
    }

    private void limpiar(ConcurrentHashMap<String, Intentos> mapa, Instant ahora) {
        synchronized (mapa) {
            Duration ventana = properties.emailWindow().compareTo(properties.ipWindow()) >= 0
                    ? properties.emailWindow() : properties.ipWindow();
            Instant corte = ahora.minus(ventana);
            Iterator<String> claves = mapa.keySet().iterator();
            while (claves.hasNext()) {
                Intentos registro = mapa.get(claves.next());
                if (registro != null && registro.ultimo != null && registro.ultimo.isBefore(corte)) {
                    claves.remove();
                }
            }
        }
    }

    private static final class Intentos {
        private final Deque<Instant> fechas = new ArrayDeque<>();
        private Instant ultimo;

        private boolean registrar(Instant ahora, Duration intervaloMinimo, int maximo, Duration ventana) {
            while (!fechas.isEmpty() && fechas.peekFirst().isBefore(ahora.minus(ventana))) {
                fechas.removeFirst();
            }
            boolean permiteIntervalo = ultimo == null || !ahora.isBefore(ultimo.plus(intervaloMinimo));
            if (!permiteIntervalo || fechas.size() >= maximo) return false;
            fechas.addLast(ahora);
            ultimo = ahora;
            return true;
        }
    }
}
