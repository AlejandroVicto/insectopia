package com.insectopia.dtos;

public record GoogleExchangeResponseDTO(
        String estado,
        String codigo,
        String mensaje,
        String origen,
        AuthResponseDTO auth,
        String registrationToken,
        GoogleProfileDTO perfil) {

    public static GoogleExchangeResponseDTO login(AuthResponseDTO auth, String mensaje) {
        return new GoogleExchangeResponseDTO("LOGIN_COMPLETO", null, mensaje,
                "login", auth, null, null);
    }

    public static GoogleExchangeResponseDTO vinculacion(AuthResponseDTO auth, String mensaje) {
        return new GoogleExchangeResponseDTO("LOGIN_COMPLETO", null, mensaje,
                "vinculacion", auth, null, null);
    }

    public static GoogleExchangeResponseDTO pendiente(String registrationToken,
            GoogleProfileDTO perfil) {
        return new GoogleExchangeResponseDTO("REGISTRO_PENDIENTE", null,
                "Completa tu perfil para crear la cuenta.", "registro", null,
                registrationToken, perfil);
    }

    public static GoogleExchangeResponseDTO vinculacionRequerida(String mensaje) {
        return new GoogleExchangeResponseDTO("VINCULACION_REQUERIDA", null, mensaje,
                "login", null, null, null);
    }

    public static GoogleExchangeResponseDTO error(String codigo, String mensaje) {
        return new GoogleExchangeResponseDTO("ERROR_CONTROLADO", codigo, mensaje,
                "login", null, null, null);
    }
}
