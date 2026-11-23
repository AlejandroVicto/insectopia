package com.insectopia.dtos;

import static org.junit.jupiter.api.Assertions.*;
import java.time.LocalDate;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import jakarta.validation.Validation;

class ActualizarPerfilRequestDTOTests {
    @Test void validaLongitudesFormatoYObligatoriosSinGuardarNulos() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var datos = new ActualizarPerfilRequestDTO("María 123", "xy", "x".repeat(501),
                    "Inventado", "123", "", LocalDate.now().plusDays(1), "123");
            var campos = validator.validate(datos).stream()
                    .map(error -> error.getPropertyPath().toString()).collect(Collectors.toSet());
            assertTrue(campos.containsAll(java.util.Set.of("nombre", "nombreUsuario", "biografia", "genero",
                    "paisCodigo", "estadoRegion", "fechaNacimiento", "telefono")));
            var sinFecha = new ActualizarPerfilRequestDTO("María", "maria", null, "", "mx",
                    "Jalisco", null, "");
            assertEquals(java.util.Set.of("fechaNacimiento"), validator.validate(sinFecha).stream()
                    .map(error -> error.getPropertyPath().toString()).collect(Collectors.toSet()));
            assertNull(sinFecha.genero());
            assertNull(sinFecha.telefono());
        }
    }
}
