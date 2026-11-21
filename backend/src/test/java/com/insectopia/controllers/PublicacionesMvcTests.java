package com.insectopia.controllers;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insectopia.dtos.publicaciones.AutorResumenDTO;
import com.insectopia.dtos.publicaciones.ComentarioResponseDTO;
import com.insectopia.dtos.publicaciones.PublicacionCreateRequestDTO;
import com.insectopia.dtos.publicaciones.PublicacionResponseDTO;
import com.insectopia.dtos.publicaciones.ReaccionEstadoDTO;
import com.insectopia.exceptions.DuplicateResourceException;
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
import com.insectopia.services.PublicacionesService;

import tools.jackson.databind.json.JsonMapper;

@WebMvcTest({PublicacionesController.class, ComentariosController.class, ReaccionesController.class})
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class, JwtAuthenticationFilter.class})
class PublicacionesMvcTests {

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
    @Autowired private JsonMapper json;
    @Autowired private JwtService jwt;

    @MockitoBean private PublicacionesService service;
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
        usuario.setPaisCodigo("ES");
        usuario.setEstadoRegion("Madrid");
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

    private static AutorResumenDTO autor() {
        return new AutorResumenDTO(7L, "María", "maria", null);
    }

    private static PublicacionResponseDTO publicacion() {
        return new PublicacionResponseDTO(24L, autor(), "Avistamiento en el jardín", null,
                LocalDateTime.of(2026, 11, 20, 8, 0), "VISIBLE", 2, 5, "ME_GUSTA");
    }

    @Test
    void endpointsRequierenAutenticacion() throws Exception {
        mvc.perform(get("/api/publicaciones")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
        mvc.perform(get("/api/publicaciones/24")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/publicaciones").contentType(MediaType.APPLICATION_JSON)
                .content("{\"contenido\":\"texto\"}")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/publicaciones/24/comentarios")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/publicaciones/24/reaccion")).andExpect(status().isUnauthorized());
        verify(service, never()).listar(anyInt(), anyInt(), anyString(), any(), any());
    }

    @Test
    void listadoPaginadoEsCompatibleConElAdaptadorDeInicio() throws Exception {
        when(service.listar(0, 10, "global", "escarabajo", principal))
                .thenReturn(new PageImpl<>(List.of(publicacion()), PageRequest.of(0, 10), 1));

        mvc.perform(bearer(get("/api/publicaciones")
                        .param("page", "0").param("size", "10")
                        .param("feed", "global").param("q", "escarabajo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(24))
                .andExpect(jsonPath("$.content[0].autor.id").value(7))
                .andExpect(jsonPath("$.content[0].autor.nombre").value("María"))
                .andExpect(jsonPath("$.content[0].autor.nombreUsuario").value("maria"))
                .andExpect(jsonPath("$.content[0].contenido").value("Avistamiento en el jardín"))
                .andExpect(jsonPath("$.content[0].totalComentarios").value(2))
                .andExpect(jsonPath("$.content[0].totalReacciones").value(5))
                .andExpect(jsonPath("$.content[0].reaccionUsuario").value("ME_GUSTA"))
                .andExpect(jsonPath("$.content[0].estado").value("VISIBLE"))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(true))
                .andExpect(jsonPath("$.content[0].contrasena").doesNotExist())
                .andExpect(jsonPath("$.content[0].autor.correo").doesNotExist())
                .andExpect(jsonPath("$.content[0].comentarios").doesNotExist());
    }

    @Test
    void validaParametrosDePaginacionYFeed() throws Exception {
        mvc.perform(bearer(get("/api/publicaciones").param("page", "-1")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        mvc.perform(bearer(get("/api/publicaciones").param("size", "0")))
                .andExpect(status().isBadRequest());
        mvc.perform(bearer(get("/api/publicaciones").param("size", "51")))
                .andExpect(status().isBadRequest());
        mvc.perform(bearer(get("/api/publicaciones").param("feed", "recientes")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Los datos enviados no son válidos"));
        verify(service, never()).listar(anyInt(), anyInt(), anyString(), any(), any());
    }

    @Test
    void consultaIndividualValidaYOcultaDatosSensibles() throws Exception {
        when(service.obtener(24L, principal)).thenReturn(publicacion());
        mvc.perform(bearer(get("/api/publicaciones/24")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(24))
                .andExpect(jsonPath("$.autor.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.autor.token").doesNotExist());

        when(service.obtener(-1L, principal)).thenThrow(new ResourceNotFoundException("publicación", -1L));
        mvc.perform(bearer(get("/api/publicaciones/-1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Recurso no encontrado"));
    }

    @Test
    void creacionValidaDevuelve201YLugar() throws Exception {
        when(service.crear(any(PublicacionCreateRequestDTO.class), any(InsectopiaUserDetails.class)))
                .thenReturn(publicacion());

        mvc.perform(bearer(post("/api/publicaciones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(
                                new PublicacionCreateRequestDTO("Hallazgo confirmado", null)))))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION, "/api/publicaciones/24"))
                .andExpect(jsonPath("$.id").value(24))
                .andExpect(jsonPath("$.autor.nombreUsuario").value("maria"));

        org.mockito.ArgumentCaptor<InsectopiaUserDetails> captor =
                org.mockito.ArgumentCaptor.forClass(InsectopiaUserDetails.class);
        verify(service).crear(any(PublicacionCreateRequestDTO.class), captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals(7L, captor.getValue().idUsuario());
    }

    @Test
    void creacionInvalidaDevuelve400ConDetalleDeCampo() throws Exception {
        mvc.perform(bearer(post("/api/publicaciones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contenido\":\"   \"}")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0].field").value("contenido"));
        verify(service, never()).crear(any(), any());
    }

    @Test
    void comentariosConsultanyCreanConAutorDelPrincipal() throws Exception {
        ComentarioResponseDTO comentario = new ComentarioResponseDTO(3L, 24L, autor(),
                "Muy interesante", LocalDateTime.of(2026, 11, 20, 9, 0));
        when(service.listarComentarios(eq(24L), eq(0), eq(10), any(InsectopiaUserDetails.class)))
                .thenReturn(new PageImpl<>(List.of(comentario)));
        when(service.crearComentario(eq(24L), any(), any(InsectopiaUserDetails.class)))
                .thenReturn(comentario);

        mvc.perform(bearer(get("/api/publicaciones/24/comentarios")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(3))
                .andExpect(jsonPath("$.content[0].autor.nombreUsuario").value("maria"));

        mvc.perform(bearer(post("/api/publicaciones/24/comentarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contenido\":\"Muy interesante\"}")))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.LOCATION,
                        "/api/publicaciones/24/comentarios/3"))
                .andExpect(jsonPath("$.contenido").value("Muy interesante"));

        mvc.perform(bearer(post("/api/publicaciones/24/comentarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contenido\":\"\"}")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reaccionesDevuelvenEstadoRealYConflictoPorDuplicado() throws Exception {
        when(service.estadoReaccion(eq(24L), any(InsectopiaUserDetails.class)))
                .thenReturn(new ReaccionEstadoDTO(24L, true, "ME_GUSTA", 5));
        when(service.reaccionar(eq(24L), any(InsectopiaUserDetails.class)))
                .thenReturn(new ReaccionEstadoDTO(24L, true, "ME_GUSTA", 6))
                .thenThrow(new DuplicateResourceException("publicacionId", "Ya reaccionaste a esta publicación"));
        when(service.quitarReaccion(eq(24L), any(InsectopiaUserDetails.class)))
                .thenReturn(new ReaccionEstadoDTO(24L, false, null, 5));

        mvc.perform(bearer(get("/api/publicaciones/24/reaccion")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reaccionada").value(true))
                .andExpect(jsonPath("$.total").value(5));

        mvc.perform(bearer(post("/api/publicaciones/24/reaccion")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(6));

        mvc.perform(bearer(post("/api/publicaciones/24/reaccion")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.details[0].field").value("publicacionId"))
                .andExpect(jsonPath("$.details[0].message").value("Ya reaccionaste a esta publicación"));

        mvc.perform(bearer(delete("/api/publicaciones/24/reaccion")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reaccionada").value(false))
                .andExpect(jsonPath("$.tipo").value(nullValue()));
    }

    @Test
    void accesoDenegadoDevuelve403() throws Exception {
        when(service.obtener(eq(25L), any(InsectopiaUserDetails.class)))
                .thenThrow(new AccessDeniedException("No tienes acceso a esta publicación"));

        mvc.perform(bearer(get("/api/publicaciones/25")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void recursoInexistenteEnComentariosOReaccionesDa404() throws Exception {
        when(service.listarComentarios(eq(-1L), anyInt(), anyInt(), any(InsectopiaUserDetails.class)))
                .thenThrow(new ResourceNotFoundException("publicación", -1L));
        when(service.reaccionar(eq(-1L), any(InsectopiaUserDetails.class)))
                .thenThrow(new ResourceNotFoundException("publicación", -1L));

        mvc.perform(bearer(get("/api/publicaciones/-1/comentarios"))).andExpect(status().isNotFound());
        mvc.perform(bearer(post("/api/publicaciones/-1/reaccion"))).andExpect(status().isNotFound());
        verify(service, never()).crearComentario(anyLong(), any(), any());
    }
}
