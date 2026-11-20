package com.insectopia.controllers;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Base64;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.TokenRevocadoRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.CustomUserDetailsService;
import com.insectopia.security.JwtAuthenticationFilter;
import com.insectopia.security.JwtService;
import com.insectopia.security.SecurityConfig;
import com.insectopia.services.AuthService;
import com.insectopia.services.CatalogoUbicacionesService;

import tools.jackson.databind.json.JsonMapper;

@WebMvcTest({AuthController.class, LoginFlujoMvcTests.Probe.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtService.class,
        CustomUserDetailsService.class, AuthService.class, LoginFlujoMvcTests.Probe.class})
class LoginFlujoMvcTests {
    @DynamicPropertySource
    static void jwtProperties(DynamicPropertyRegistry registry) {
        registry.add("app.jwt.secret", () -> Base64.getEncoder().encodeToString(new byte[32]));
        registry.add("app.jwt.expiration", () -> 60000);
    }

    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired JwtService jwt;
    @Autowired PasswordEncoder encoder;
    @MockitoBean UsuarioRepository usuarios;
    @MockitoBean RolRepository roles;
    @MockitoBean TokenRevocadoRepository revoked;
    @MockitoBean CatalogoUbicacionesService catalogo;

    private Usuario user;

    @BeforeEach void setup() {
        user = new Usuario();
        user.setIdUsuario(7L);
        user.setNombre("María");
        user.setCorreo("maria@example.com");
        user.setNombreUsuario("maria");
        user.setContrasena(encoder.encode("clave")); // login has no registration complexity rule
        Rol rol = new Rol();
        rol.setNombre("USUARIO");
        user.setRol(rol);
        when(usuarios.findByCorreo("maria@example.com")).thenAnswer(invocation -> Optional.of(user));
        when(usuarios.findById(7L)).thenAnswer(invocation -> Optional.of(user));
    }

    private String login(String correo, String contrasena) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new Credentials(correo, contrasena))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(7))
                .andExpect(jsonPath("$.user.name").value("María"))
                .andExpect(jsonPath("$.user.email").value("maria@example.com"))
                .andExpect(jsonPath("$.user.nombreUsuario").value("maria"))
                .andExpect(jsonPath("$.user.contrasena").doesNotExist())
                .andExpect(jsonPath("$.user.fechaNacimiento").doesNotExist())
                .andReturn().getResponse().getContentAsString();
    }

    record Credentials(String correo, String contrasena) { }

    @Test void correoNormalizadoBcryptJwtYAccesoProtegido() throws Exception {
        String response = login(" MARIA@EXAMPLE.COM ", "clave");
        String token = json.readTree(response).get("token").asText();
        var claims = jwt.validate(token);
        assertEquals(7L, claims.userId());
        assertEquals("USUARIO", claims.role());
        assertEquals(0, claims.version());
        mvc.perform(get("/api/login-probe").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
        mvc.perform(get("/api/login-probe")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value("maria@example.com"))
                .andExpect(jsonPath("$.contrasena").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {"USUARIO", "MODERADOR", "ADMINISTRADOR"})
    void emiteRolesReconocidos(String role) throws Exception {
        user.getRol().setNombre(role);
        String token = json.readTree(login("maria@example.com", "clave")).get("token").asText();
        assertEquals(role, jwt.validate(token).role());
        mvc.perform(get("/api/login-probe").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test void contrasenaIncorrectaYCorreoInexistenteNoEnumeran() throws Exception {
        for (String body : new String[] {"{\"correo\":\"maria@example.com\",\"contrasena\":\"incorrecta\"}",
                "{\"correo\":\"nadie@example.com\",\"contrasena\":\"clave\"}"}) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Correo o contraseña incorrectos."))
                    .andExpect(jsonPath("$.details").isEmpty());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"DESACTIVADO", "BLOQUEADO"})
    void cuentasInactivasNoRevelanEstado(String estado) throws Exception {
        user.setEstado(EstadoUsuario.valueOf(estado));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"maria@example.com\",\"contrasena\":\"clave\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Correo o contraseña incorrectos."));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{\"correo\":\"invalido\",\"contrasena\":\"clave\"}",
            "{\"correo\":\"\",\"contrasena\":\"clave\"}",
            "{\"correo\":\"maria@example.com\",\"contrasena\":\"\"}", "{}"})
    void datosInvalidosDan400(String body) throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details").isNotEmpty());
        verify(usuarios, never()).findByCorreo(anyString());
    }

    @RestController
    static class Probe {
        @GetMapping("/api/login-probe")
        @PreAuthorize("hasAuthority('ROLE_USUARIO') or hasAuthority('ROLE_MODERADOR') or hasAuthority('ROLE_ADMINISTRADOR')")
        String secured() { return "ok"; }
    }
}
