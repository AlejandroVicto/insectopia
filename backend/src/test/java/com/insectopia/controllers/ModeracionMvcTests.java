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
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insectopia.dtos.moderacion.PropuestaEventoDTO;
import com.insectopia.exceptions.EventoConflictoException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoEvento;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.TokenRevocadoRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.CustomUserDetailsService;
import com.insectopia.security.JwtAuthenticationFilter;
import com.insectopia.security.JwtService;
import com.insectopia.security.SecurityConfig;
import com.insectopia.services.ModeracionService;

@WebMvcTest(ModeracionController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class, JwtAuthenticationFilter.class})
class ModeracionMvcTests {
    private static final String SECRET = secreto();

    @DynamicPropertySource static void jwt(DynamicPropertyRegistry registry) {
        registry.add("app.jwt.secret", () -> SECRET);
        registry.add("app.jwt.expiration", () -> 60_000);
    }

    private static String secreto() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    @Autowired MockMvc mvc;
    @Autowired JwtService jwtService;
    @MockitoBean ModeracionService service;
    @MockitoBean UsuarioRepository usuarios;
    @MockitoBean TokenRevocadoRepository revocados;
    Usuario cuenta;
    String token;

    @BeforeEach void preparar() { prepararRol("MODERADOR"); }

    private void prepararRol(String nombre) {
        cuenta = new Usuario();
        cuenta.setIdUsuario(7L);
        cuenta.setCorreo(nombre.toLowerCase() + "@example.invalid");
        cuenta.setContrasena("hash");
        cuenta.setVersionToken(0);
        cuenta.setEstado(EstadoUsuario.ACTIVO);
        cuenta.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        Rol rol = new Rol();
        rol.setNombre(nombre);
        cuenta.setRol(rol);
        when(usuarios.findById(7L)).thenReturn(Optional.of(cuenta));
        token = jwtService.issue(cuenta);
    }

    private PropuestaEventoDTO respuesta(Long id, EstadoEvento estado, String motivo) {
        return new PropuestaEventoDTO(id, "Polillas", "Muestreo", "Oaxaca", null,
                LocalDateTime.of(2027, 2, 1, 9, 0), LocalDateTime.of(2027, 2, 1, 18, 0), 30,
                LocalDateTime.of(2026, 11, 20, 10, 0), estado,
                new PropuestaEventoDTO.Proponente(7L, "Nombre", "proponente"), 7L, motivo,
                LocalDateTime.of(2026, 11, 22, 12, 0));
    }

    @Test void accesoRestringidoAModeradoresYAdministradores() throws Exception {
        mvc.perform(get("/api/moderacion/eventos/propuestas")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/moderacion/eventos/12/aprobar")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/moderacion/eventos/12/rechazar")
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"x\"}"))
                .andExpect(status().isUnauthorized());
        prepararRol("USUARIO");
        mvc.perform(get("/api/moderacion/eventos/propuestas")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/moderacion/eventos/12/aprobar")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/moderacion/eventos/12/rechazar")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"x\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
        prepararRol("ADMINISTRADOR");
        when(service.listarPropuestas(anyInt(), anyInt(), nullable(String.class), nullable(EstadoEvento.class),
                nullable(LocalDate.class), nullable(LocalDate.class), any()))
                .thenReturn(new PageImpl<>(List.of()));
        mvc.perform(get("/api/moderacion/eventos/propuestas")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isOk());
    }

    @Test void listadoDevuelvePaginaContratadaConFiltros() throws Exception {
        when(service.listarPropuestas(eq(1), eq(5), eq("oaxaca"), eq(EstadoEvento.PENDIENTE),
                eq(LocalDate.of(2027, 1, 1)), eq(LocalDate.of(2027, 1, 31)), any()))
                .thenReturn(new PageImpl<>(List.of(respuesta(12L, EstadoEvento.PENDIENTE, null)),
                        PageRequest.of(1, 5), 6));
        mvc.perform(get("/api/moderacion/eventos/propuestas")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .param("page", "1").param("size", "5").param("q", "oaxaca")
                .param("estado", "PENDIENTE")
                .param("fechaDesde", "2027-01-01").param("fechaHasta", "2027-01-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].idEvento").value(12))
                .andExpect(jsonPath("$.content[0].estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.content[0].proponente.nombreUsuario").value("proponente"))
                .andExpect(jsonPath("$.content[0].motivoResolucion").doesNotExist())
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.size").value(5))
                .andExpect(jsonPath("$.totalElements").value(6))
                .andExpect(jsonPath("$.totalPages").value(2));
        verify(service).listarPropuestas(eq(1), eq(5), eq("oaxaca"), eq(EstadoEvento.PENDIENTE),
                eq(LocalDate.of(2027, 1, 1)), eq(LocalDate.of(2027, 1, 31)), any());
    }

    @Test void aprobarYRechazarEntreganResolucionConTrazabilidad() throws Exception {
        when(service.aprobar(eq(12L), any())).thenReturn(respuesta(12L, EstadoEvento.APROBADO, null));
        when(service.rechazar(eq(12L), any(), any()))
                .thenReturn(respuesta(12L, EstadoEvento.RECHAZADO, "Fecha incompatible"));
        mvc.perform(patch("/api/moderacion/eventos/12/aprobar")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("APROBADO"))
                .andExpect(jsonPath("$.moderadorId").value(7))
                .andExpect(jsonPath("$.fechaResolucion").exists());
        mvc.perform(patch("/api/moderacion/eventos/12/rechazar")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Fecha incompatible\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("RECHAZADO"))
                .andExpect(jsonPath("$.motivoResolucion").value("Fecha incompatible"));
        verify(service).aprobar(eq(12L), any());
        verify(service).rechazar(eq(12L), argThat(datos -> "Fecha incompatible".equals(datos.motivo())), any());
    }

    @Test void entradasInvalidasYConflictosDevuelvenCodigosContratados() throws Exception {
        mvc.perform(get("/api/moderacion/eventos/propuestas")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token).param("size", "51"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/moderacion/eventos/12/rechazar")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details").isNotEmpty());
        mvc.perform(patch("/api/moderacion/eventos/12/rechazar")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"x\",\"estado\":\"RECHAZADO\"}"))
                .andExpect(status().isBadRequest());
        when(service.aprobar(eq(12L), any())).thenThrow(new EventoConflictoException("Ya resuelta"));
        mvc.perform(patch("/api/moderacion/eventos/12/aprobar")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict());
        when(service.aprobar(eq(99L), any())).thenThrow(new ResourceNotFoundException("evento", 99L));
        mvc.perform(patch("/api/moderacion/eventos/99/aprobar")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }
}
