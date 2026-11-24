package com.insectopia.dtos;

import java.time.Instant;

public record GoogleLinkStartResponseDTO(String authorizationUrl, Instant expiraEn) {
}
