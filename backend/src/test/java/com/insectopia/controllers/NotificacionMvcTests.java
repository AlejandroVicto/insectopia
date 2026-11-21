package com.insectopia.controllers;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insectopia.dtos.notificaciones.*;
import com.insectopia.dtos.publicaciones.AutorResumenDTO;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.repository.TokenRevocadoRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.*;
import com.insectopia.services.NotificacionService;

@WebMvcTest(NotificacionController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class, JwtAuthenticationFilter.class})
class NotificacionMvcTests {
    private static final String SECRET;
    static {
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
        SECRET = Base64.getEncoder().encodeToString(bytes);
    }

    @DynamicPropertySource static void config(DynamicPropertyRegistry registry) {
        registry.add("app.jwt.secret", () -> SECRET);
        registry.add("app.jwt.expiration", () -> 60_000);
    }

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @MockitoBean NotificacionService service;
    @MockitoBean UsuarioRepository usuarios;
    @MockitoBean TokenRevocadoRepository revocados;
    private String token;
    private InsectopiaUserDetails principal;

    @BeforeEach void setup() {
        Usuario u = new Usuario(); u.setIdUsuario(7L); u.setCorreo("maria@example.invalid");
        u.setContrasena("hash"); u.setVersionToken(0); u.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        Rol rol = new Rol(); rol.setNombre("USUARIO"); u.setRol(rol);
        when(usuarios.findById(7L)).thenReturn(Optional.of(u));
        token = jwt.issue(u);
        principal = new InsectopiaUserDetails(7L, u.getCorreo(), "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder auth(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request) {
        return request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
    }

    @Test void sinJwtTodasLasOperacionesDevuelven401() throws Exception {
        mvc.perform(get("/api/notificaciones")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/notificaciones/no-leidas/count")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/notificaciones/9/leer")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/notificaciones/leer-todas")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/notificaciones/9")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test void listadoContratoYFiltros() throws Exception {
        var n = new NotificacionResponseDTO(9L, "COMENTARIO", "Alguien comentó tu publicación",
                new AutorResumenDTO(2L, "A", "a", null), LocalDateTime.of(2026, 11, 20, 9, 0), false,
                new RecursoNotificacionDTO("PUBLICACION", 24L, true, "/api/publicaciones/24"));
        when(service.listar(0, 10, "todas", principal))
                .thenReturn(new PageImpl<>(List.of(n), PageRequest.of(0, 10), 1));
        mvc.perform(auth(get("/api/notificaciones"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(9))
                .andExpect(jsonPath("$.content[0].actor.nombreUsuario").value("a"))
                .andExpect(jsonPath("$.content[0].recurso.apiUrl").value("/api/publicaciones/24"))
                .andExpect(jsonPath("$.content[0].destinatario").doesNotExist())
                .andExpect(jsonPath("$.content[0].actor.correo").doesNotExist())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.number").value(0)).andExpect(jsonPath("$.size").value(10));
        when(service.listar(1, 5, "no-leidas", principal)).thenReturn(new PageImpl<>(List.of()));
        when(service.listar(0, 10, "leidas", principal)).thenReturn(new PageImpl<>(List.of()));
        mvc.perform(auth(get("/api/notificaciones").param("page", "1").param("size", "5")
                .param("filtro", "no-leidas"))).andExpect(status().isOk());
        mvc.perform(auth(get("/api/notificaciones").param("filtro", "leidas"))).andExpect(status().isOk());
        verify(service).listar(1, 5, "no-leidas", principal);
    }

    @Test void validacionYJwtInvalido() throws Exception {
        for (String query : List.of("page=-1", "size=0", "size=51", "filtro=otro", "page=abc")) {
            mvc.perform(auth(get("/api/notificaciones?" + query))).andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/notificaciones").header(HttpHeaders.AUTHORIZATION, "Bearer inválido"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test void contadorLecturaBorradoYAjenoIgualQueInexistente() throws Exception {
        when(service.contar(principal)).thenReturn(new NoLeidasCountDTO(2));
        mvc.perform(auth(get("/api/notificaciones/no-leidas/count"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(2));
        when(service.leerTodas(principal)).thenReturn(new NoLeidasCountDTO(0));
        mvc.perform(auth(patch("/api/notificaciones/leer-todas"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));
        when(service.leer(9L, principal)).thenReturn(new NotificacionResponseDTO(9L, "REACCION", "Aviso",
                null, LocalDateTime.of(2026, 11, 20, 9, 0), true, null));
        mvc.perform(auth(patch("/api/notificaciones/9/leer"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.leida").value(true));
        mvc.perform(auth(delete("/api/notificaciones/9"))).andExpect(status().isNoContent());
        verify(service).eliminar(9L, principal);
        when(service.leer(eq(20L), any())).thenThrow(new ResourceNotFoundException("notificación", 20L));
        when(service.leer(eq(21L), any())).thenThrow(new ResourceNotFoundException("notificación", 21L));
        mvc.perform(auth(patch("/api/notificaciones/20/leer"))).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Recurso no encontrado"));
        mvc.perform(auth(patch("/api/notificaciones/21/leer"))).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Recurso no encontrado"));
    }
}
