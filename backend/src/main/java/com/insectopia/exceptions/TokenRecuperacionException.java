package com.insectopia.exceptions;

/** Rechazo explícito de un enlace de recuperación. Nunca describe la cuenta asociada. */
public class TokenRecuperacionException extends RuntimeException {

    public enum Motivo {
        INVALID("TOKEN_INVALID", "El enlace de recuperación no es válido."),
        EXPIRED("TOKEN_EXPIRED", "El enlace de recuperación venció."),
        USED("TOKEN_USED", "El enlace de recuperación ya fue utilizado.");

        private final String code;
        private final String message;

        Motivo(String code, String message) {
            this.code = code;
            this.message = message;
        }

        public String code() {
            return code;
        }

        public String message() {
            return message;
        }
    }

    private final Motivo motivo;

    public TokenRecuperacionException(Motivo motivo) {
        super(motivo.message());
        this.motivo = motivo;
    }

    public Motivo motivo() {
        return motivo;
    }

    public String code() {
        return motivo.code();
    }
}
