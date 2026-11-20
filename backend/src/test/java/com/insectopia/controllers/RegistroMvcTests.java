package com.insectopia.controllers;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insectopia.dtos.RegisterRequestDTO;
import com.insectopia.dtos.RegisterResponseDTO;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.repository.TokenRevocadoRepository;
import com.insectopia.security.CustomUserDetailsService;
import com.insectopia.security.JwtAuthenticationFilter;
import com.insectopia.security.JwtService;
import com.insectopia.security.SecurityConfig;
import com.insectopia.services.AuthService;
import com.insectopia.services.CatalogoUbicacionesService;
import com.insectopia.services.CountriesNowClient;
import com.insectopia.services.CountriesNowFixtures;

@WebMvcTest({AuthController.class, CatalogosController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CatalogoUbicacionesService.class})
class RegistroMvcTests {
    @Autowired MockMvc mvc;
    @MockitoBean AuthService auth;
    @MockitoBean JwtService jwt;
    @MockitoBean CustomUserDetailsService users;
    @MockitoBean TokenRevocadoRepository revoked;
    @MockitoBean CountriesNowClient provider;

    @BeforeEach void setup() {
        CountriesNowFixtures.stub(provider);
    }

    private static final String VALID = """
            {"nombre":"María González","nombreUsuario":"maria.insectos","correo":"maria@example.com",
             "fechaNacimiento":"2002-04-21","genero":"Femenino","paisCodigo":"MX",
             "estadoRegion":"Oaxaca","telefono":null,"contrasena":"Ejemplo#2026",
             "recibirSms":false,"recibirWhatsapp":false}
            """;

    @Test void registroPublicoDevuelve201SinSecretosNiElevacion() throws Exception {
        when(auth.register(any())).thenAnswer(invocation -> {
            RegisterRequestDTO dto = invocation.getArgument(0);
            org.junit.jupiter.api.Assertions.assertEquals("maria.insectos", dto.nombreUsuario());
            return new RegisterResponseDTO(16L, dto.nombre(), dto.nombreUsuario(), dto.correo(),
                    "USUARIO", "Cuenta creada correctamente");
        });
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(VALID.substring(0, VALID.lastIndexOf('}')) + ",\"rol\":\"ADMINISTRADOR\",\"idRol\":1}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idUsuario").value(16))
                .andExpect(jsonPath("$.nombreUsuario").value("maria.insectos"))
                .andExpect(jsonPath("$.rol").value("USUARIO"))
                .andExpect(jsonPath("$.mensaje").value("Cuenta creada correctamente"))
                .andExpect(jsonPath("$.contrasena").doesNotExist())
                .andExpect(jsonPath("$.fechaNacimiento").doesNotExist())
                .andExpect(content().string(not(containsString("Ejemplo#2026"))));
        verify(auth).register(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"nombreUsuario", "correo", "contrasena", "paisCodigo", "fechaNacimiento", "telefono"})
    void erroresDeCamposTienenNombreJsonYNoIncluyenSecretos(String field) throws Exception {
        String replacement = field.equals("fechaNacimiento") ? "2999-01-01" : field.equals("telefono") ? "abc" : "";
        String invalid = VALID.replaceFirst("\"" + field + "\":(\"[^\"]*\"|null)", "\"" + field + "\":\"" + replacement + "\"");
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0].field").value(field))
                .andExpect(content().string(not(containsString("Ejemplo#2026"))));
        verifyNoInteractions(auth);
    }

    @Test void jsonMalformadoEs400() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{\"contrasena\":"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400))
                .andExpect(content().string(not(containsString("Exception"))));
    }

    @Test void fechaImposibleTieneDetalleSinExponerEntrada() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(VALID.replace("2002-04-21", "2002-02-30")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0].field").value("fechaNacimiento"));
    }

    @Test void duplicadoEs409ConCampoSeguro() throws Exception {
        when(auth.register(any())).thenThrow(new DuplicateResourceException("nombreUsuario", "Este nombre de usuario ya está en uso."));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.details[0].field").value("nombreUsuario"))
                .andExpect(content().string(not(containsString("Ejemplo#2026"))));
    }

    @Test void catalogosPublicosSoloLecturaYApiRestanteProtegida() throws Exception {
        mvc.perform(get("/api/catalogos/paises")).andExpect(status().isOk())
                .andExpect(jsonPath("$[1].codigo").value("MX"))
                .andExpect(jsonPath("$[1].nombre").value("México"));
        mvc.perform(get("/api/catalogos/paises/mx/regiones")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].nombre").value("Oaxaca"));
        mvc.perform(get("/api/catalogos/paises/ES/regiones")).andExpect(status().isNotFound());
        mvc.perform(post("/api/catalogos/paises")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/usuarios")).andExpect(status().isUnauthorized());
    }
}
