package com.insectopia.controllers;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insectopia.dtos.UsuarioPublicoDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.TokenRevocadoRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.CustomUserDetailsService;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.JwtAuthenticationFilter;
import com.insectopia.security.JwtService;
import com.insectopia.security.Permissions;
import com.insectopia.security.SecurityConfig;
import com.insectopia.services.SeguidorService;

/** Actividad 076: autenticación, contrato JSON, idempotencia y códigos HTTP. */
@WebMvcTest(SeguidorController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class, JwtAuthenticationFilter.class})
class SeguidorControllerMvcTests {

    private static final String SECRET = testSecret();

    @DynamicPropertySource
    static void jwtConfiguration(DynamicPropertyRegistry registry) {
        registry.add("app.jwt.secret", () -> SECRET);
        registry.add("app.jwt.expiration", () -> 60_000);
    }

    private static String testSecret() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwt;

    @MockitoBean private SeguidorService service;
    @MockitoBean private UsuarioRepository usuarios;
    @MockitoBean private TokenRevocadoRepository revocados;

    private String token;
    private InsectopiaUserDetails principal;

    @BeforeEach
    void setUp() {
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(7L);
        usuario.setCorreo("yo@example.test");
        usuario.setNombre("Yo");
        usuario.setNombreUsuario("yo");
        usuario.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        usuario.setPaisCodigo("MX");
        usuario.setEstadoRegion("Oaxaca");
        usuario.setContrasena("hash");
        usuario.setEstado(EstadoUsuario.ACTIVO);
        usuario.setVersionToken(0);
        Rol rol = new Rol();
        rol.setNombre("USUARIO");
        usuario.setRol(rol);
        when(usuarios.findById(7L)).thenReturn(Optional.of(usuario));
        token = jwt.issue(usuario);
        principal = new InsectopiaUserDetails(7L, "yo@example.test", "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder bearer(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request) {
        return request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
    }

    private static UsuarioPublicoDTO persona(Long id) {
        return new UsuarioPublicoDTO(id, "Clara", "clara", null, "Observación",
                Boolean.TRUE, 12, 4);
    }

    @Test
    void endpointsRequierenJwt() throws Exception {
        mvc.perform(get("/api/usuarios/me/seguidores")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/usuarios/11")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/usuarios/11/seguir")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/usuarios/11/seguir")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    @WithMockUser(username = "sin-permiso", authorities = "ROLE_OTRO")
    void sinAutoridadContenidoLeerDevuelve403() throws Exception {
        mvc.perform(get("/api/usuarios/me/seguidores")).andExpect(status().isForbidden());
        mvc.perform(get("/api/usuarios/11")).andExpect(status().isForbidden());
        mvc.perform(post("/api/usuarios/11/seguir")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/usuarios/11/seguir")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void listadoUsaElPrincipalYOcultaDatosPrivados() throws Exception {
        when(service.listarSeguidores(0, 20, "", principal)).thenReturn(
                PaginaDTO.from(new PageImpl<>(List.of(persona(11L)), PageRequest.of(0, 20), 1)));

        mvc.perform(bearer(get("/api/usuarios/me/seguidores")
                        .param("idUsuario", "999")
                        .header("X-Usuario-Id", "999")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(11))
                .andExpect(jsonPath("$.content[0].nombre").value("Clara"))
                .andExpect(jsonPath("$.content[0].nombreUsuario").value("clara"))
                .andExpect(jsonPath("$.content[0].avatarUrl").value(nullValue()))
                .andExpect(jsonPath("$.content[0].descripcion").value("Observación"))
                .andExpect(jsonPath("$.content[0].loSigo").value(true))
                .andExpect(jsonPath("$.content[0].totalSeguidores").value(12))
                .andExpect(jsonPath("$.content[0].totalSeguidos").value(4))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(true))
                .andExpect(jsonPath("$.content[0].correo").doesNotExist())
                .andExpect(jsonPath("$.content[0].telefono").doesNotExist())
                .andExpect(jsonPath("$.content[0].contrasena").doesNotExist())
                .andExpect(jsonPath("$.content[0].ubicacion").doesNotExist())
                .andExpect(content().string(not(containsString("yo@example.test"))));

        ArgumentCaptor<InsectopiaUserDetails> captor =
                ArgumentCaptor.forClass(InsectopiaUserDetails.class);
        verify(service).listarSeguidores(anyInt(), anyInt(), any(), captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals(7L, captor.getValue().idUsuario());
    }

    @Test
    void listadoValidaPaginaTamanoYBusqueda() throws Exception {
        when(service.listarSeguidores(1, 50, "ana", principal)).thenReturn(
                PaginaDTO.from(new PageImpl<>(List.of(), PageRequest.of(1, 50), 0)));

        mvc.perform(bearer(get("/api/usuarios/me/seguidores")
                        .param("page", "1").param("size", "50").param("q", "ana")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.size").value(50))
                .andExpect(jsonPath("$.content.length()").value(0));
        verify(service).listarSeguidores(1, 50, "ana", principal);
        clearInvocations(service);

        mvc.perform(bearer(get("/api/usuarios/me/seguidores").param("page", "-1")))
                .andExpect(status().isBadRequest());
        mvc.perform(bearer(get("/api/usuarios/me/seguidores").param("size", "0")))
                .andExpect(status().isBadRequest());
        mvc.perform(bearer(get("/api/usuarios/me/seguidores").param("size", "51")))
                .andExpect(status().isBadRequest());
        mvc.perform(bearer(get("/api/usuarios/me/seguidores").param("q", "a".repeat(101))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Los datos enviados no son válidos"));
        verify(service, never()).listarSeguidores(anyInt(), anyInt(), any(), any());
    }

    @Test
    void perfilPublicoEsSeguroYMapea404() throws Exception {
        when(service.perfilPublico(11L, principal)).thenReturn(persona(11L));

        mvc.perform(bearer(get("/api/usuarios/11").param("idUsuario", "999")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(11))
                .andExpect(jsonPath("$.loSigo").value(true))
                .andExpect(jsonPath("$.totalSeguidores").value(12))
                .andExpect(jsonPath("$.totalSeguidos").value(4))
                .andExpect(jsonPath("$.correo").doesNotExist())
                .andExpect(jsonPath("$.contrasena").doesNotExist())
                .andExpect(jsonPath("$.telefono").doesNotExist())
                .andExpect(jsonPath("$.fechaNacimiento").doesNotExist())
                .andExpect(jsonPath("$.genero").doesNotExist())
                .andExpect(jsonPath("$.paisCodigo").doesNotExist())
                .andExpect(jsonPath("$.estadoRegion").doesNotExist())
                .andExpect(jsonPath("$.versionToken").doesNotExist());
        verify(service).perfilPublico(11L, principal);

        when(service.perfilPublico(12L, principal))
                .thenThrow(new ResourceNotFoundException("usuario", 12L));
        mvc.perform(bearer(get("/api/usuarios/12")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Recurso no encontrado"));
    }

    @Test
    void seguirDistingueCreacionIdempotenciaYErrores() throws Exception {
        when(service.seguir(11L, principal)).thenReturn(new SeguidorService.ResultadoSeguir(true));
        mvc.perform(bearer(post("/api/usuarios/11/seguir")))
                .andExpect(status().isCreated());

        when(service.seguir(11L, principal)).thenReturn(new SeguidorService.ResultadoSeguir(false));
        mvc.perform(bearer(post("/api/usuarios/11/seguir")))
                .andExpect(status().isOk());

        when(service.seguir(12L, principal)).thenThrow(
                new RegistrationValidationException("id", "No puedes seguirte a ti mismo"));
        mvc.perform(bearer(post("/api/usuarios/12/seguir")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0].field").value("id"));

        when(service.seguir(13L, principal)).thenThrow(new AccessDeniedException("Denegado"));
        mvc.perform(bearer(post("/api/usuarios/13/seguir")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        mvc.perform(bearer(post("/api/usuarios/0/seguir")))
                .andExpect(status().isBadRequest());
        verify(service, never()).seguir(0L, principal);
    }

    @Test
    void dejarSeguirEs204EIdempotente() throws Exception {
        mvc.perform(bearer(delete("/api/usuarios/11/seguir")))
                .andExpect(status().isNoContent());
        mvc.perform(bearer(delete("/api/usuarios/11/seguir")))
                .andExpect(status().isNoContent());

        verify(service, times(2)).dejarSeguir(11L, principal);
    }
}
