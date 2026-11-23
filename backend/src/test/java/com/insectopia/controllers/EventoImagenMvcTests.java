package com.insectopia.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;
import java.security.SecureRandom;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.insectopia.dtos.eventos.EventoResponseDTO;
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
import com.insectopia.services.EventoService;

@WebMvcTest(EventoController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class, JwtAuthenticationFilter.class})
class EventoImagenMvcTests {
    private static final String SECRET = secret();

    @DynamicPropertySource
    static void jwt(DynamicPropertyRegistry registry) {
        registry.add("app.jwt.secret", () -> SECRET);
        registry.add("app.jwt.expiration", () -> 60_000);
    }

    private static String secret() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    @Autowired MockMvc mvc;
    @Autowired JwtService jwtService;
    @MockitoBean EventoService service;
    @MockitoBean UsuarioRepository usuarios;
    @MockitoBean TokenRevocadoRepository revocados;
    String token;

    @BeforeEach void preparar() {
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(7L);
        usuario.setCorreo("usuario@example.test");
        usuario.setContrasena("hash");
        usuario.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        usuario.setPaisCodigo("MX");
        usuario.setEstadoRegion("Oaxaca");
        usuario.setEstado(EstadoUsuario.ACTIVO);
        usuario.setVersionToken(0);
        Rol rol = new Rol();
        rol.setNombre("USUARIO");
        usuario.setRol(rol);
        when(usuarios.findById(7L)).thenReturn(Optional.of(usuario));
        token = jwtService.issue(usuario);
    }

    @Test void multipartAceptaJpgPngTrasAutenticacionYEntregaDto() throws Exception {
        var foto = new MockMultipartFile("imagen", "foto.png", "image/png", new byte[]{1, 2, 3});
        mvc.perform(multipart("/api/eventos/24/imagen").file(foto))
                .andExpect(status().isUnauthorized());
        var respuesta = new EventoResponseDTO(24L, "Evento", "Descripción", "Oaxaca",
                "eventos/11111111-1111-1111-1111-111111111111.png",
                LocalDateTime.of(2027, 1, 5, 9, 0), LocalDateTime.of(2027, 1, 5, 18, 0),
                30, 0L, EstadoEvento.PENDIENTE, new EventoResponseDTO.ProponentePublico("Nombre", "usuario"),
                null, true, null);
        when(service.subirImagen(eq(24L), any(), any())).thenReturn(respuesta);
        mvc.perform(multipart("/api/eventos/24/imagen").file(foto)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imagen").value("eventos/11111111-1111-1111-1111-111111111111.png"));
        verify(service).subirImagen(eq(24L), any(), any());
    }

    @Test void rutaDeLecturaExisteSinJwtYNoAdmiteJsonComoArchivo() throws Exception {
        when(service.leerImagen(24L, null)).thenReturn(new EventoService.ImagenEvento(
                new ByteArrayResource(new byte[]{1, 2, 3}), MediaType.IMAGE_PNG));
        mvc.perform(get("/api/eventos/24/imagen")).andExpect(status().isOk());
        mvc.perform(multipart("/api/eventos/24/imagen")
                .contentType(MediaType.APPLICATION_JSON).content("{}")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnsupportedMediaType());
    }
}
