package com.insectopia.dtos;

import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatusCode;

/** Error reconocible por el frontend 055 sin revelar datos de la cuenta. */
public record TokenErrorResponseDTO(
        String code,
        String timestamp,
        int status,
        String error,
        String message,
        String path,
        List<FieldErrorDTO> details) {

    public record FieldErrorDTO(String field, String message) {
    }

    public static TokenErrorResponseDTO of(String code, HttpStatusCode status, String message, String path) {
        return new TokenErrorResponseDTO(code, Instant.now().toString(), status.value(),
                reasonPhrase(status.value()), message, path, List.of());
    }

    private static String reasonPhrase(int status) {
        return switch (status) {
            case 400 -> "Bad Request";
            case 401 -> "Unauthorized";
            case 404 -> "Not Found";
            case 409 -> "Conflict";
            case 422 -> "Unprocessable Entity";
            case 429 -> "Too Many Requests";
            case 500 -> "Internal Server Error";
            case 503 -> "Service Unavailable";
            default -> "Error";
        };
    }
}
