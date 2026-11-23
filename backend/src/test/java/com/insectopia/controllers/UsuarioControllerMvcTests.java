package com.insectopia.controllers;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insectopia.dtos.MiPerfilResponseDTO;
import com.insectopia.dtos.publicaciones.AutorResumenDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.dtos.publicaciones.PublicacionResponseDTO;
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
import com.insectopia.services.UsuarioService;

/** Actividad 074: contrato HTTP, autenticación, privacidad y paginación. */
@WebMvcTest(UsuarioController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class, JwtAuthenticationFilter.class})
class UsuarioControllerMvcTests {

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

    @MockitoBean private UsuarioService service;
    @MockitoBean private UsuarioRepository usuarios;
    @MockitoBean private TokenRevocadoRepository revocados;

    private String token;
    private InsectopiaUserDetails principal;

    @BeforeEach
    void setUp() {
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(7L);
        usuario.setCorreo("maria@example.test");
        usuario.setNombre("María");
        usuario.setNombreUsuario("maria");
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
        principal = new InsectopiaUserDetails(7L, "maria@example.test", "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder bearer(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request) {
        return request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
    }

    private static MiPerfilResponseDTO perfil() {
        return new MiPerfilResponseDTO(7L, "María", "maria", null, null, "MX", "Oaxaca",
                LocalDateTime.of(2024, 3, 5, 10, 30), 12, 4, 9);
    }

    private static PublicacionResponseDTO publicacion() {
        return new PublicacionResponseDTO(31L, new AutorResumenDTO(7L, "María", "maria", null),
                "Avistamiento propio", null, LocalDateTime.of(2026, 11, 20, 8, 0),
                "VISIBLE", 2, 5, "ME_GUSTA");
    }

    @Test
    void endpointsRequierenJwt() throws Exception {
        mvc.perform(get("/api/usuarios/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
        mvc.perform(get("/api/usuarios/me/publicaciones"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
        verifyNoInteractions(service);
    }

    @Test
    @WithMockUser(username = "sin-permiso", authorities = "ROLE_OTRO")
    void sinAutorizacionDevuelve403() throws Exception {
        mvc.perform(get("/api/usuarios/me"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
        verifyNoInteractions(service);
    }

    @Test
    void perfilExponeSoloElContratoPrivadoYLosNulosOpcionales() throws Exception {
        when(service.miPerfil(principal)).thenReturn(perfil());

        mvc.perform(bearer(get("/api/usuarios/me")
                        .param("idUsuario", "999")
                        .header("X-Usuario-Id", "999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idUsuario\":999}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idUsuario").value(7))
                .andExpect(jsonPath("$.nombre").value("María"))
                .andExpect(jsonPath("$.nombreUsuario").value("maria"))
                .andExpect(jsonPath("$.fotoPerfil").value(nullValue()))
                .andExpect(jsonPath("$.biografia").value(nullValue()))
                .andExpect(jsonPath("$.paisCodigo").value("MX"))
                .andExpect(jsonPath("$.estadoRegion").value("Oaxaca"))
                .andExpect(jsonPath("$.fechaRegistro").value("2024-03-05T10:30:00"))
                .andExpect(jsonPath("$.totalSeguidores").value(12))
                .andExpect(jsonPath("$.totalSeguidos").value(4))
                .andExpect(jsonPath("$.totalPublicaciones").value(9))
                .andExpect(jsonPath("$.correo").doesNotExist())
                .andExpect(jsonPath("$.contrasena").doesNotExist())
                .andExpect(jsonPath("$.telefono").doesNotExist())
                .andExpect(jsonPath("$.fechaNacimiento").doesNotExist())
                .andExpect(jsonPath("$.genero").doesNotExist())
                .andExpect(jsonPath("$.recibirSms").doesNotExist())
                .andExpect(jsonPath("$.recibirWhatsapp").doesNotExist())
                .andExpect(jsonPath("$.versionToken").doesNotExist())
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.preferencias").doesNotExist())
                .andExpect(content().string(not(containsString("maria@example.test"))));

        ArgumentCaptor<InsectopiaUserDetails> captor =
                ArgumentCaptor.forClass(InsectopiaUserDetails.class);
        verify(service).miPerfil(captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals(7L, captor.getValue().idUsuario());
    }

    @Test
    void perfilInexistenteEs404Controlado() throws Exception {
        when(service.miPerfil(principal)).thenThrow(new ResourceNotFoundException("usuario", 7L));

        mvc.perform(bearer(get("/api/usuarios/me")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Recurso no encontrado"));
    }

    @Test
    void publicacionesUsanValoresPorDefectoYContratoDePagina() throws Exception {
        when(service.publicacionesPropias(0, 10, principal)).thenReturn(
                PaginaDTO.from(new PageImpl<>(List.of(publicacion()), PageRequest.of(0, 10), 1)));

        mvc.perform(bearer(get("/api/usuarios/me/publicaciones")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(31))
                .andExpect(jsonPath("$.content[0].autor.id").value(7))
                .andExpect(jsonPath("$.content[0].contenido").value("Avistamiento propio"))
                .andExpect(jsonPath("$.content[0].estado").value("VISIBLE"))
                .andExpect(jsonPath("$.content[0].totalComentarios").value(2))
                .andExpect(jsonPath("$.content[0].totalReacciones").value(5))
                .andExpect(jsonPath("$.content[0].reaccionUsuario").value("ME_GUSTA"))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(true))
                .andExpect(jsonPath("$.content[0].autor.correo").doesNotExist())
                .andExpect(jsonPath("$.content[0].comentarios").doesNotExist());

        verify(service).publicacionesPropias(0, 10, principal);
    }

    @Test
    void paginacionValidaEInvalida() throws Exception {
        when(service.publicacionesPropias(1, 50, principal)).thenReturn(
                PaginaDTO.from(new PageImpl<>(List.of(), PageRequest.of(1, 50), 0)));

        mvc.perform(bearer(get("/api/usuarios/me/publicaciones")
                        .param("page", "1").param("size", "50")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.size").value(50))
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.first").value(false));
        verify(service).publicacionesPropias(1, 50, principal);
        clearInvocations(service);

        mvc.perform(bearer(get("/api/usuarios/me/publicaciones").param("page", "-1")))
                .andExpect(status().isBadRequest());
        mvc.perform(bearer(get("/api/usuarios/me/publicaciones").param("size", "0")))
                .andExpect(status().isBadRequest());
        mvc.perform(bearer(get("/api/usuarios/me/publicaciones").param("size", "51")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Los datos enviados no son válidos"));
        mvc.perform(bearer(get("/api/usuarios/me/publicaciones").param("page", "abc")))
                .andExpect(status().isBadRequest());
        verify(service, never()).publicacionesPropias(anyInt(), anyInt(), any());
        verifyNoInteractions(service);
    }

    @Test
    void publicacionesAjenasNoAparecenYConteoDelPerfilCoincide() throws Exception {
        when(service.publicacionesPropias(0, 10, principal)).thenReturn(
                PaginaDTO.from(new PageImpl<>(List.of(publicacion()), PageRequest.of(0, 1), 9)));
        when(service.miPerfil(principal)).thenReturn(perfil());

        String pagina = mvc.perform(bearer(get("/api/usuarios/me/publicaciones")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].autor.id").value(7))
                .andExpect(jsonPath("$.content[0].autor.nombreUsuario").value("maria"))
                .andExpect(jsonPath("$.content[1]").doesNotExist())
                .andExpect(jsonPath("$.totalElements").value(9))
                .andReturn().getResponse().getContentAsString();

        mvc.perform(bearer(get("/api/usuarios/me")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPublicaciones").value(9));
        org.junit.jupiter.api.Assertions.assertTrue(pagina.contains("\"totalElements\":9"));
    }
}
