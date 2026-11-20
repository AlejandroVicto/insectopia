package com.insectopia.dtos;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

class RegisterRequestDTOTests {
    private static LocalValidatorFactoryBean validator;

    @BeforeAll static void setup() {
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
    }

    @AfterAll static void close() { validator.close(); }

    static RegisterRequestDTO request(String nombre, String username, String correo, LocalDate fecha,
            String genero, String pais, String region, String telefono, String password, Boolean sms, Boolean whatsapp) {
        return new RegisterRequestDTO(nombre, username, correo, fecha, genero, pais, region, telefono, password, sms, whatsapp);
    }

    private RegisterRequestDTO with(String nombre, String username, String correo, LocalDate fecha,
            String genero, String pais, String region, String telefono, String password) {
        return request(nombre, username, correo, fecha, genero, pais, region, telefono, password, null, null);
    }

    private Set<String> fields(RegisterRequestDTO request) {
        return validator.validate(request).stream().map(v -> v.getPropertyPath().toString()).collect(Collectors.toSet());
    }

    @Test void solicitudValidaConOpcionalesAusentesYNormalizacion() {
        var dto = with(" María ", "MARIA.insectos", " MARIA@Example.COM ", LocalDate.of(2000, 1, 1),
                null, "mx", " Oaxaca ", null, "Ejemplo#2026");
        assertTrue(fields(dto).isEmpty());
        assertEquals("María", dto.nombre());
        assertEquals("maria.insectos", dto.nombreUsuario());
        assertEquals("maria@example.com", dto.correo());
        assertEquals("MX", dto.paisCodigo());
        assertEquals("Oaxaca", dto.estadoRegion());
        assertFalse(dto.recibirSms());
        assertFalse(dto.recibirWhatsapp());
    }

    @ParameterizedTest
    @CsvSource({"' ',nombre", "'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',nombre",
            "ab,nombreUsuario", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,nombreUsuario", "'a@b',nombreUsuario",
            "malformado,correo", "' ,',correo", "' ',paisCodigo", "XYZ,paisCodigo", "' ',estadoRegion",
            "'bad!',telefono", "'123',telefono", "'short',contrasena", "'ejemplo#2026',contrasena",
            "'Ejemplo#abcd',contrasena", "'Ejemplo2026',contrasena"})
    void rechazaCamposInvalidos(String value, String field) {
        var dto = with(field.equals("nombre") ? value : "María", field.equals("nombreUsuario") ? value : "maria",
                field.equals("correo") ? value : "maria@example.com", LocalDate.of(2000, 1, 1),
                null, field.equals("paisCodigo") ? value : "MX", field.equals("estadoRegion") ? value : "Oaxaca",
                field.equals("telefono") ? value : null, field.equals("contrasena") ? value : "Ejemplo#2026");
        assertTrue(fields(dto).contains(field), field + ": " + value);
    }

    @Test void correoDemasiadoLargoYFechaFutura() {
        var dto = with("María", "maria", "x".repeat(145) + "@example.com", LocalDate.now().plusDays(1),
                null, "MX", "Oaxaca", null, "Ejemplo#2026");
        assertTrue(fields(dto).containsAll(Set.of("correo", "fechaNacimiento")));
    }

    @Test void generoOpcionalOInvalido() {
        assertTrue(fields(with("María", "maria", "maria@example.com", LocalDate.now(), "", "MX", "Oaxaca", "", "Ejemplo#2026")).isEmpty());
        assertTrue(fields(with("María", "maria", "maria@example.com", LocalDate.now(), "inventado", "MX", "Oaxaca", null, "Ejemplo#2026")).contains("genero"));
    }

    @Test void contrasenaNoSeRecorta() {
        var dto = with("María", "maria", "maria@example.com", LocalDate.now(), null, "MX", "Oaxaca", null, " Ejemplo#2026 ");
        assertEquals(" Ejemplo#2026 ", dto.contrasena());
        assertFalse(dto.toString().contains("Ejemplo#2026"));
    }

    @Test void nombreSoloAdmiteLetrasYEspaciosIncluyendoAcentos() {
        assertTrue(fields(with("María José", "maria", "maria@example.com", LocalDate.now(),
                null, "MX", "Oaxaca", null, "Ejemplo#2026")).isEmpty());
        for (String invalid : new String[] {"María 123", "Ana!", "José_ Pérez"}) {
            assertTrue(fields(with(invalid, "maria", "maria@example.com", LocalDate.now(),
                    null, "MX", "Oaxaca", null, "Ejemplo#2026")).contains("nombre"), invalid);
        }
    }
}
