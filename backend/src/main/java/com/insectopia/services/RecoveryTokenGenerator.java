package com.insectopia.services;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

import org.springframework.stereotype.Component;

/** Genera 256 bits de entropía y persiste únicamente el SHA-256 hexadecimal. */
@Component
public class RecoveryTokenGenerator {

    private static final int BYTES = 32;
    private final SecureRandom random;

    public RecoveryTokenGenerator() {
        this(new SecureRandom());
    }

    RecoveryTokenGenerator(SecureRandom random) {
        this.random = random;
    }

    public Generado generar() {
        byte[] entropy = new byte[BYTES];
        random.nextBytes(entropy);
        String valor = Base64.getUrlEncoder().withoutPadding().encodeToString(entropy);
        return new Generado(valor, hash(valor));
    }

    public String hash(String valor) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(valor.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 no disponible", exception);
        }
    }

    public record Generado(String valor, String hash) {
        @Override
        public String toString() {
            return "Generado[valor=[REDACTED], hash=[REDACTED]]";
        }
    }
}
