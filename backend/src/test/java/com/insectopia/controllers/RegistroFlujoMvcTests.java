package com.insectopia.controllers;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.TokenRevocadoRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.CustomUserDetailsService;
import com.insectopia.security.JwtAuthenticationFilter;
import com.insectopia.security.JwtService;
import com.insectopia.security.SecurityConfig;
import com.insectopia.services.AuthService;
import com.insectopia.services.CatalogoUbicacionesService;
import com.insectopia.services.CountriesNowClient;
import com.insectopia.services.CountriesNowFixtures;
import com.insectopia.services.PasswordRecoveryService;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, AuthService.class, CatalogoUbicacionesService.class})
class RegistroFlujoMvcTests {
    @Autowired MockMvc mvc;
    @MockitoBean UsuarioRepository usuarios;
    @MockitoBean RolRepository roles;
    @MockitoBean JwtService jwt;
    @MockitoBean CustomUserDetailsService details;
    @MockitoBean TokenRevocadoRepository revoked;
    @MockitoBean CountriesNowClient provider;
    @MockitoBean PasswordRecoveryService passwordRecovery;

    private static final String BODY = """
            {"nombre":" María ","nombreUsuario":"MARIA","correo":" MARIA@example.com ",
             "fechaNacimiento":"2002-04-21","paisCodigo":"mx","estadoRegion":"oaxaca",
             "contrasena":"Ejemplo#2026"}
            """;

    @BeforeEach void setup() {
        CountriesNowFixtures.stub(provider);
        Rol role = new Rol();
        role.setNombre("USUARIO");
        when(roles.findByNombre("USUARIO")).thenReturn(Optional.of(role));
        when(usuarios.saveAndFlush(any())).thenAnswer(invocation -> {
            Usuario saved = invocation.getArgument(0);
            saved.setIdUsuario(123L);
            return saved;
        });
    }

    @Test void postSinJwtEjecutaServicioRealYHashConRepositoriosAislados() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idUsuario").value(123))
                .andExpect(jsonPath("$.nombre").value("María"))
                .andExpect(jsonPath("$.nombreUsuario").value("maria"))
                .andExpect(jsonPath("$.correo").value("maria@example.com"))
                .andExpect(jsonPath("$.rol").value("USUARIO"))
                .andExpect(jsonPath("$.contrasena").doesNotExist());
        var captor = org.mockito.ArgumentCaptor.forClass(Usuario.class);
        verify(usuarios).saveAndFlush(captor.capture());
        assertEquals("Oaxaca", captor.getValue().getEstadoRegion());
        assertTrue(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder()
                .matches("Ejemplo#2026", captor.getValue().getContrasena()));
    }

    @Test void regionIncompatibleYDuplicadoNoGuardan() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(BODY.replace("oaxaca", "Madrid")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details[0].field").value("estadoRegion"));
        when(usuarios.existsByCorreo("maria@example.com")).thenReturn(true);
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.details[0].field").value("correo"));
        verify(usuarios, never()).saveAndFlush(any());
    }

    @Test void nombreConNumerosYTelefonoCortoSeRechazanSinGuardar() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(BODY.replace("María", "María 42")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details[0].field").value("nombre"));
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(BODY.replace("\"contrasena\"", "\"telefono\":\"12345\",\"contrasena\"")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details[0].field").value("telefono"));
        verify(usuarios, never()).saveAndFlush(any());
    }
}
