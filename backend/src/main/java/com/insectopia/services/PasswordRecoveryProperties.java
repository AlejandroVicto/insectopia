package com.insectopia.services;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

/**
 * Configuración única de recuperación y correo. Los mismos valores sirven en local
 * (Mailpit) y en el VPS (Postfix local); sólo cambian las variables de entorno.
 */
@Component
public class PasswordRecoveryProperties {

    private static final Set<String> PRODUCTION_ENVIRONMENTS = Set.of("prod", "production", "vps");
    private static final Set<String> RESERVED_HOSTS = Set.of(
            "localhost", "127.0.0.1", "::1", "domain_real", "dominio_real");

    private final URI frontendBaseUrl;
    private final boolean produccion;
    private final String mailFrom;
    private final int expirationMinutes;
    private final Duration emailMinimumInterval;
    private final int emailMaxAttempts;
    private final Duration emailWindow;
    private final int ipMaxAttempts;
    private final Duration ipWindow;
    private final int maxTrackedOrigins;

    public PasswordRecoveryProperties(
            @Value("${app.environment:local}") String environment,
            @Value("${spring.profiles.active:}") String perfiles,
            @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl,
            @Value("${app.mail.from:no-reply@insectopia.invalid}") String mailFrom,
            @Value("${app.password-reset.expiration-minutes:15}") int expirationMinutes,
            @Value("${app.password-reset.rate-limit.email-min-interval-seconds:60}") long emailMinimumIntervalSeconds,
            @Value("${app.password-reset.rate-limit.email-max-attempts:3}") int emailMaxAttempts,
            @Value("${app.password-reset.rate-limit.email-window-minutes:15}") long emailWindowMinutes,
            @Value("${app.password-reset.rate-limit.ip-max-attempts:30}") int ipMaxAttempts,
            @Value("${app.password-reset.rate-limit.ip-window-minutes:15}") long ipWindowMinutes,
            @Value("${app.password-reset.rate-limit.max-tracked-origins:10000}") int maxTrackedOrigins) {
        String entorno = environment == null ? "" : environment.trim().toLowerCase(Locale.ROOT);
        boolean perfilProduccion = Arrays.stream((perfiles == null ? "" : perfiles).split(","))
                .map(String::trim)
                .map(valor -> valor.toLowerCase(Locale.ROOT))
                .anyMatch(PRODUCTION_ENVIRONMENTS::contains);
        this.produccion = PRODUCTION_ENVIRONMENTS.contains(entorno) || perfilProduccion;
        this.frontendBaseUrl = parseBaseUrl(frontendBaseUrl);
        this.mailFrom = mailFrom == null ? "" : mailFrom.trim();
        this.expirationMinutes = expirationMinutes;
        this.emailMinimumInterval = Duration.ofSeconds(emailMinimumIntervalSeconds);
        this.emailMaxAttempts = emailMaxAttempts;
        this.emailWindow = Duration.ofMinutes(emailWindowMinutes);
        this.ipMaxAttempts = ipMaxAttempts;
        this.ipWindow = Duration.ofMinutes(ipWindowMinutes);
        this.maxTrackedOrigins = maxTrackedOrigins;
        validar();
    }

    private static URI parseBaseUrl(String valor) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalStateException("APP_FRONTEND_BASE_URL es obligatoria");
        }
        try {
            return URI.create(valor.trim());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("APP_FRONTEND_BASE_URL no es una URI válida", exception);
        }
    }

    private void validar() {
        String scheme = frontendBaseUrl.getScheme() == null ? "" : frontendBaseUrl.getScheme().toLowerCase(Locale.ROOT);
        String host = frontendBaseUrl.getHost() == null ? "" : frontendBaseUrl.getHost().toLowerCase(Locale.ROOT);
        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            throw new IllegalStateException("APP_FRONTEND_BASE_URL debe usar http o https");
        }
        if (host.isEmpty()) {
            throw new IllegalStateException("APP_FRONTEND_BASE_URL debe incluir un host");
        }
        if (expirationMinutes < 1 || expirationMinutes > 1440) {
            throw new IllegalStateException("PASSWORD_RESET_EXPIRATION_MINUTES debe estar entre 1 y 1440");
        }
        if (emailMinimumInterval.isNegative() || emailMaxAttempts < 1 || emailWindow.isZero()
                || ipMaxAttempts < 1 || ipWindow.isZero() || maxTrackedOrigins < 1) {
            throw new IllegalStateException("Los límites de recuperación no son válidos");
        }

        if (produccion) {
            if (!"https".equals(scheme)) {
                throw new IllegalStateException("APP_FRONTEND_BASE_URL debe usar HTTPS en producción");
            }
            if (RESERVED_HOSTS.contains(host) || host.endsWith(".invalid") || host.endsWith(".example")
                    || host.endsWith(".test") || host.contains("dominio") || host.contains("domain")) {
                throw new IllegalStateException("APP_FRONTEND_BASE_URL no puede ser de desarrollo en producción");
            }
            String dominioCorreo = correoDominio(mailFrom);
            if (dominioCorreo.isEmpty() || dominioCorreo.endsWith(".invalid")
                    || dominioCorreo.endsWith(".example") || dominioCorreo.endsWith(".test")
                    || dominioCorreo.contains("dominio") || dominioCorreo.contains("domain")) {
                throw new IllegalStateException("MAIL_FROM debe usar el dominio real en producción");
            }
        }
    }

    private static String correoDominio(String correo) {
        int arroba = correo.lastIndexOf('@');
        return arroba < 0 ? "" : correo.substring(arroba + 1).toLowerCase(Locale.ROOT);
    }

    /** Construye la URL pública sin usar el encabezado Host de la petición. */
    public String construirEnlace(String token) {
        // Codificación explícita del valor: +, / o = no deben alterar el query,
        // aunque el token generado sea Base64URL y no los contenga.
        String tokenCodificado = UriUtils.encode(token, StandardCharsets.UTF_8);
        return UriComponentsBuilder.fromUri(frontendBaseUrl)
                .replacePath("/restablecer-contrasena")
                .replaceQuery(null)
                .queryParam("token", tokenCodificado)
                .build()
                .toUriString();
    }

    public String mailFrom() {
        return mailFrom;
    }

    public int expirationMinutes() {
        return expirationMinutes;
    }

    public Duration emailMinimumInterval() {
        return emailMinimumInterval;
    }

    public int emailMaxAttempts() {
        return emailMaxAttempts;
    }

    public Duration emailWindow() {
        return emailWindow;
    }

    public int ipMaxAttempts() {
        return ipMaxAttempts;
    }

    public Duration ipWindow() {
        return ipWindow;
    }

    public int maxTrackedOrigins() {
        return maxTrackedOrigins;
    }
}
