package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import com.insectopia.dtos.eventos.EventoRequestDTO;
import com.insectopia.dtos.eventos.EventoUpdateRequestDTO;

import jakarta.validation.Validation;
import tools.jackson.databind.json.JsonMapper;

class EventoRequestDTOTests {
    @Test void exigeCamposValidosYNoAceptaValoresAdministrativos() {
        try (var fabrica = Validation.buildDefaultValidatorFactory()) {
            var validador = fabrica.getValidator();
            var inicio = LocalDateTime.of(2027, 1, 5, 9, 0);
            var invalido = new EventoRequestDTO(" ", " ", " ", "x".repeat(501), inicio, inicio, 0);
            var campos = validador.validate(invalido).stream()
                    .map(v -> v.getPropertyPath().toString()).toList();
            assertTrue(campos.contains("titulo"));
            assertTrue(campos.contains("descripcion"));
            assertTrue(campos.contains("ubicacion"));
            assertTrue(campos.contains("imagen"));
            assertTrue(campos.contains("cupoMaximo"));
            var largos = new EventoRequestDTO("a".repeat(151), "Descripción", "x".repeat(256), null,
                    null, null, 1);
            var limites = validador.validate(largos).stream()
                    .map(v -> v.getPropertyPath().toString()).toList();
            assertTrue(limites.containsAll(java.util.List.of("titulo", "ubicacion", "fechaInicio", "fechaFin")));
            assertTrue(validador.validate(new EventoRequestDTO("Título", "Descripción", "Oaxaca", null,
                    inicio, inicio.plusDays(1), 30)).isEmpty());
        }
        JsonMapper mapper = JsonMapper.builder().build();
        String datos = """
                {"titulo":"Evento","descripcion":"Desc","ubicacion":"Oaxaca",
                 "fechaInicio":"2027-01-05T09:00:00","fechaFin":"2027-01-07T18:00:00","cupoMaximo":30}
                """;
        assertThrows(Exception.class, () -> mapper.readValue(datos.replace("\"cupoMaximo\"",
                "\"estado\":\"APROBADO\",\"cupoMaximo\""), EventoRequestDTO.class));
        assertThrows(Exception.class, () -> mapper.readValue(datos.replace("\"cupoMaximo\"",
                "\"idProponente\":7,\"cupoMaximo\""), EventoUpdateRequestDTO.class));
    }
}
