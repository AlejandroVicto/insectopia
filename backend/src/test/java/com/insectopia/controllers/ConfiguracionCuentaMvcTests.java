package com.insectopia.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insectopia.dtos.ConfiguracionPerfilResponseDTO;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.repository.TokenRevocadoRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.CustomUserDetailsService;
import com.insectopia.security.JwtAuthenticationFilter;
import com.insectopia.security.JwtService;
import com.insectopia.security.SecurityConfig;
import com.insectopia.services.ConfiguracionCuentaService;
import com.insectopia.services.UsuarioService;

@WebMvcTest({UsuarioController.class, AvatarUsuarioController.class})
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class, JwtAuthenticationFilter.class})
class ConfiguracionCuentaMvcTests {
    private static final String SECRET = clave();
    private static String clave() {
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }
    @DynamicPropertySource static void propiedades(DynamicPropertyRegistry r) {
        r.add("app.jwt.secret", () -> SECRET);
        r.add("app.jwt.expiration", () -> 60_000);
    }
    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @MockitoBean UsuarioRepository usuarios;
    @MockitoBean TokenRevocadoRepository revocados;
    @MockitoBean ConfiguracionCuentaService configuracion;
    @MockitoBean UsuarioService perfil;
    String bearer;

    @BeforeEach void iniciar() {
        Usuario u = new Usuario(); u.setIdUsuario(7L); u.setCorreo("uno@test.invalid");
        u.setContrasena("hash"); u.setVersionToken(0);
        Rol rol = new Rol(); rol.setNombre("USUARIO"); u.setRol(rol);
        when(usuarios.findById(7L)).thenReturn(Optional.of(u));
        bearer = "Bearer " + jwt.issue(u);
    }

    private String perfilJson() {
        return """
                {"nombre":"María","nombreUsuario":"  MARIA_2  ","biografia":null,
                "genero":"Femenino","paisCodigo":"mx","estadoRegion":"Jalisco",
                "fechaNacimiento":"2000-02-02","telefono":null}
                """;
    }

    @Test void sinJwtEs401YLaLecturaPrivadaNoFiltraRoles() throws Exception {
        mvc.perform(get("/api/usuarios/me/configuracion")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/usuarios/me/preferencias").contentType(MediaType.APPLICATION_JSON)
                .content("{\"recibirSms\":true,\"recibirWhatsapp\":false}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/usuarios/me").contentType(MediaType.APPLICATION_JSON).content(perfilJson()))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/usuarios/me/contrasena").contentType(MediaType.APPLICATION_JSON)
                .content("{\"contrasenaActual\":\"Actual123!\",\"contrasenaNueva\":\"Nueva456!\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test void preferenciasSoloDelPrincipalYValidacionEstricta() throws Exception {
        mvc.perform(put("/api/usuarios/me/preferencias").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"recibirSms\":true}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/usuarios/me/preferencias").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"recibirSms\":true,\"recibirWhatsapp\":false,\"idUsuario\":9}"))
                .andExpect(status().isBadRequest());
        when(configuracion.actualizarPreferencias(any(), any())).thenReturn(
                new ConfiguracionPerfilResponseDTO(7L, "María", "maria", null, null, "MX", "Jalisco",
                        LocalDate.of(2000, 2, 2), "+521234567890", "uno@test.invalid", null, true, false));
        mvc.perform(put("/api/usuarios/me/preferencias").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"recibirSms\":true,\"recibirWhatsapp\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.recibirSms").value(true))
                .andExpect(jsonPath("$.recibirWhatsapp").value(false));
        verify(configuracion).actualizarPreferencias(any(), any());
    }

    @Test void edicionNormalizaYNoAdmiteCamposAdministrativos() throws Exception {
        ConfiguracionPerfilResponseDTO dto = new ConfiguracionPerfilResponseDTO(7L, "María", "maria_2", null,
                "Femenino", "MX", "Jalisco", LocalDate.of(2000, 2, 2), null, "uno@test.invalid", null, false, false);
        when(configuracion.actualizar(any(), any())).thenReturn(dto);
        mvc.perform(put("/api/usuarios/me").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(perfilJson()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nombreUsuario").value("maria_2"))
                .andExpect(jsonPath("$.correo").value("uno@test.invalid"));
        org.mockito.ArgumentCaptor<com.insectopia.dtos.ActualizarPerfilRequestDTO> captura =
                org.mockito.ArgumentCaptor.forClass(com.insectopia.dtos.ActualizarPerfilRequestDTO.class);
        verify(configuracion).actualizar(captura.capture(), any());
        org.junit.jupiter.api.Assertions.assertEquals("maria_2", captura.getValue().nombreUsuario());
        org.junit.jupiter.api.Assertions.assertEquals("MX", captura.getValue().paisCodigo());
        mvc.perform(put("/api/usuarios/me").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(perfilJson().replaceFirst("\\{", "{\"rol\":\"ADMINISTRADOR\",")))
                .andExpect(status().isBadRequest());
    }

    @Test void validacionDeFechaNombreYContrasenaDebil() throws Exception {
        mvc.perform(put("/api/usuarios/me").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(perfilJson().replace("María", "María 123")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details[0].field").value("nombre"));
        mvc.perform(put("/api/usuarios/me").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(perfilJson().replace("2000-02-02", "2099-02-02")))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/usuarios/me/contrasena").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"contrasenaActual\":\"Actual123!\",\"contrasenaNueva\":\"debil\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test void fotoRequiereJwtYMultipartNoSeleccionaOtraCuenta() throws Exception {
        var archivo = new MockMultipartFile("imagen", "foto.png", "image/png", new byte[]{1, 2});
        mvc.perform(multipart("/api/usuarios/me/avatar").file(archivo)).andExpect(status().isUnauthorized());
        mvc.perform(multipart("/api/usuarios/me/avatar").file(archivo).header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isOk());
        verify(configuracion).subirAvatar(any(), any());
    }

    @Test void tokenAnteriorRechazadoTrasIncrementarVersionDeCuenta() throws Exception {
        Usuario actualizado = usuarios.findById(7L).orElseThrow();
        when(configuracion.cambiarContrasena(any(), any())).thenAnswer(invocacion -> {
            actualizado.setVersionToken(1);
            return new com.insectopia.dtos.CambiarContrasenaResponseDTO("Contraseña actualizada correctamente.", true);
        });
        mvc.perform(put("/api/usuarios/me/contrasena").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"contrasenaActual\":\"Actual123!\",\"contrasenaNueva\":\"Nueva456!\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.requiereReautenticacion").value(true))
                .andExpect(jsonPath("$.token").doesNotExist());
        mvc.perform(get("/api/usuarios/me/configuracion").header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isUnauthorized());
    }
}
