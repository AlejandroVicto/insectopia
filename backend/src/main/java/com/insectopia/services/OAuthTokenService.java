package com.insectopia.services;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

import org.springframework.stereotype.Service;

/** Genera secretos opacos de un solo uso y guarda únicamente su hash SHA-256. */
@Service
public class OAuthTokenService {

    private static final int BYTES = 32;
    private final SecureRandom random = new SecureRandom();

    public String generar() {
        byte[] valor = new byte[BYTES];
        random.nextBytes(valor);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(valor);
    }

    /** Contraseña desconocida para cuentas Google-only; solo se conserva el hash BCrypt resultante. */
    public String generarContrasenaDesconocida() {
        byte[] valor = new byte[48];
        random.nextBytes(valor);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(valor);
    }

    public String hash(String valor) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException("Token OAuth vacío");
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(valor.getBytes(StandardCharsets.UTF_8));
            StringBuilder resultado = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                resultado.append(String.format("%02x", b & 0xff));
            }
            return resultado.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 no disponible", exception);
        }
    }
}
