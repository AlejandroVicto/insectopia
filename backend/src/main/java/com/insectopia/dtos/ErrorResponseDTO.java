package com.insectopia.dtos;

import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatusCode;

public record ErrorResponseDTO(
		String timestamp,
		int status,
		String error,
		String message,
		String path,
		List<FieldErrorDTO> details) {

	public record FieldErrorDTO(String field, String message) {
	}

	public static ErrorResponseDTO of(HttpStatusCode status, String message, String path) {
		return new ErrorResponseDTO(
				Instant.now().toString(),
				status.value(),
				reasonPhrase(status.value()),
				message,
				path,
				List.of());
	}

	public static ErrorResponseDTO of(
			HttpStatusCode status,
			String message,
			String path,
			List<FieldErrorDTO> details) {
		return new ErrorResponseDTO(
				Instant.now().toString(),
				status.value(),
				reasonPhrase(status.value()),
				message,
				path,
				details == null ? List.of() : List.copyOf(details));
	}

	private static String reasonPhrase(int status) {
		return switch (status) {
			case 400 -> "Bad Request";
			case 401 -> "Unauthorized";
			case 403 -> "Forbidden";
			case 404 -> "Not Found";
			case 409 -> "Conflict";
			case 422 -> "Unprocessable Entity";
			case 500 -> "Internal Server Error";
			case 503 -> "Service Unavailable";
			default -> "Error";
		};
	}
}
