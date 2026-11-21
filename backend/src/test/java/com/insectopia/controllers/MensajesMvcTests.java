package com.insectopia.controllers;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

import com.insectopia.dtos.mensajes.ConversacionResponseDTO;
import com.insectopia.dtos.mensajes.InterlocutorDTO;
import com.insectopia.dtos.mensajes.MensajeCreateRequestDTO;
import com.insectopia.dtos.mensajes.MensajeResponseDTO;
import com.insectopia.dtos.mensajes.UltimoMensajeDTO;
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
import com.insectopia.services.MensajesService;

@WebMvcTest(MensajesController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class, JwtAuthenticationFilter.class})
class MensajesMvcTests {

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

    @MockitoBean private MensajesService service;
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

    private static ConversacionResponseDTO conversacion() {
        return new ConversacionResponseDTO(
                15L,
                new InterlocutorDTO(9L, "TinkyW", "tinky", null, true),
                new UltimoMensajeDTO(101L, "Hola", LocalDateTime.of(2026, 11, 20, 8, 40)),
                2,
                false);
    }

    private static MensajeResponseDTO mensaje() {
        return new MensajeResponseDTO(
                101L, 15L, 9L, "Hola", LocalDateTime.of(2026, 11, 20, 8, 40), null);
    }

    @Test
    void endpointsRequierenAutenticacion() throws Exception {
        mvc.perform(get("/api/conversaciones")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
        mvc.perform(get("/api/conversaciones/15/mensajes")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/conversaciones/15/mensajes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contenido\":\"Hola\"}"))
                .andExpect(status().isUnauthorized());
        verify(service, never()).listar(anyInt(), anyInt(), any(), eq(false), any());
    }

    @Test
    void bandejaEsCompatibleConElAdaptadorYNoExponeDatosSensibles() throws Exception {
        when(service.listar(0, 20, "tinky", true, principal))
                .thenReturn(new PageImpl<>(List.of(conversacion()), PageRequest.of(0, 20), 1));

        mvc.perform(bearer(get("/api/conversaciones")
                        .param("page", "0").param("size", "20")
                        .param("q", "tinky").param("noLeidos", "true")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(15))
                .andExpect(jsonPath("$.content[0].interlocutor.id").value(9))
                .andExpect(jsonPath("$.content[0].interlocutor.nombre").value("TinkyW"))
                .andExpect(jsonPath("$.content[0].interlocutor.nombreUsuario").value("tinky"))
                .andExpect(jsonPath("$.content[0].interlocutor.loSigo").value(true))
                .andExpect(jsonPath("$.content[0].ultimoMensaje.id").value(101))
                .andExpect(jsonPath("$.content[0].ultimoMensaje.contenido").value("Hola"))
                .andExpect(jsonPath("$.content[0].noLeidos").value(2))
                .andExpect(jsonPath("$.content[0].oculta").value(false))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.last").value(true))
                .andExpect(jsonPath("$.content[0].interlocutor.correo").doesNotExist())
                .andExpect(jsonPath("$.content[0].contrasena").doesNotExist())
                .andExpect(jsonPath("$.content[0].token").doesNotExist());
    }

    @Test
    void validaParametrosDePaginacion() throws Exception {
        mvc.perform(bearer(get("/api/conversaciones").param("page", "-1")))
                .andExpect(status().isBadRequest());
        mvc.perform(bearer(get("/api/conversaciones").param("size", "0")))
                .andExpect(status().isBadRequest());
        mvc.perform(bearer(get("/api/conversaciones").param("size", "51")))
                .andExpect(status().isBadRequest());
        mvc.perform(bearer(get("/api/conversaciones/15/mensajes").param("size", "101")))
                .andExpect(status().isBadRequest());
        verify(service, never()).listar(anyInt(), anyInt(), any(), eq(false), any());
    }

    @Test
    void historialEsCompatibleConElAdaptador() throws Exception {
        when(service.listarMensajes(eq(15L), eq(0), eq(30), any(InsectopiaUserDetails.class)))
                .thenReturn(new PageImpl<>(List.of(mensaje()), PageRequest.of(0, 30), 1));

        mvc.perform(bearer(get("/api/conversaciones/15/mensajes")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(101))
                .andExpect(jsonPath("$.content[0].conversacionId").value(15))
                .andExpect(jsonPath("$.content[0].remitenteId").value(9))
                .andExpect(jsonPath("$.content[0].contenido").value("Hola"))
                .andExpect(jsonPath("$.content[0].fechaEnvio").value("2026-11-20T08:40:00"))
                .andExpect(jsonPath("$.content[0].fechaLectura").value(nullValue()))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(30))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void envioDevuelve201YRemitenteVieneDelPrincipal() throws Exception {
        when(service.enviar(eq(15L), any(MensajeCreateRequestDTO.class),
                any(InsectopiaUserDetails.class))).thenReturn(mensaje());

        mvc.perform(bearer(post("/api/conversaciones/15/mensajes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contenido\":\"Hola\"}")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(101))
                .andExpect(jsonPath("$.conversacionId").value(15))
                .andExpect(jsonPath("$.remitenteId").value(9))
                .andExpect(jsonPath("$.contenido").value("Hola"));

        org.mockito.ArgumentCaptor<InsectopiaUserDetails> captor =
                org.mockito.ArgumentCaptor.forClass(InsectopiaUserDetails.class);
        verify(service).enviar(eq(15L), any(MensajeCreateRequestDTO.class), captor.capture());
        org.junit.jupiter.api.Assertions.assertEquals(7L, captor.getValue().idUsuario());
    }

    @Test
    void contenidoInvalidoDevuelve400ConDetalleDeCampo() throws Exception {
        mvc.perform(bearer(post("/api/conversaciones/15/mensajes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contenido\":\"   \"}")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0].field").value("contenido"));
        mvc.perform(bearer(post("/api/conversaciones/15/mensajes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contenido\":\"" + "x".repeat(5001) + "\"}")))
                .andExpect(status().isBadRequest());
        verify(service, never()).enviar(any(), any(), any());
    }

    @Test
    void conversacionAjenaDevuelve403SinDatos() throws Exception {
        when(service.listarMensajes(eq(25L), eq(0), eq(30), any(InsectopiaUserDetails.class)))
                .thenThrow(new AccessDeniedException("No tienes acceso a esta conversación"));
        when(service.enviar(eq(25L), any(MensajeCreateRequestDTO.class),
                any(InsectopiaUserDetails.class)))
                .thenThrow(new AccessDeniedException("No tienes acceso a esta conversación"));

        mvc.perform(bearer(get("/api/conversaciones/25/mensajes")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.content").doesNotExist());
        mvc.perform(bearer(post("/api/conversaciones/25/mensajes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contenido\":\"Hola\"}")))
                .andExpect(status().isForbidden());
    }

    @Test
    void conversacionInexistenteDevuelve404() throws Exception {
        when(service.listarMensajes(eq(-1L), eq(0), eq(30), any(InsectopiaUserDetails.class)))
                .thenThrow(new ResourceNotFoundException("conversación", -1L));
        when(service.enviar(eq(-1L), any(MensajeCreateRequestDTO.class),
                any(InsectopiaUserDetails.class)))
                .thenThrow(new ResourceNotFoundException("conversación", -1L));

        mvc.perform(bearer(get("/api/conversaciones/-1/mensajes")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Recurso no encontrado"));
        mvc.perform(bearer(post("/api/conversaciones/-1/mensajes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contenido\":\"Hola\"}")))
                .andExpect(status().isNotFound());
    }
}
