package com.insectopia.controllers;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insectopia.dtos.admin.AdminResumenDTO;
import com.insectopia.dtos.admin.AdminUsuarioResponseDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.TokenRevocadoRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.CustomUserDetailsService;
import com.insectopia.security.JwtAuthenticationFilter;
import com.insectopia.security.JwtService;
import com.insectopia.security.SecurityConfig;
import com.insectopia.services.AdminService;
import com.insectopia.services.AdminEliminacionService;

@WebMvcTest(AdminController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class, JwtAuthenticationFilter.class})
class AdminMvcTests {
    private static final String SECRET = secret();
    @DynamicPropertySource static void jwt(DynamicPropertyRegistry registry) {
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
    @MockitoBean AdminService service;
    @MockitoBean AdminEliminacionService eliminacion;
    @MockitoBean UsuarioRepository usuarios;
    @MockitoBean TokenRevocadoRepository revocados;
    Usuario cuenta;
    String token;

    @BeforeEach void preparar() { prepararRol("ADMINISTRADOR"); }

    private void prepararRol(String nombre) {
        cuenta = new Usuario();
        cuenta.setIdUsuario(7L);
        cuenta.setCorreo("admin@example.invalid");
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

    @Test void accesoLimitadoEnHttpYMetodos() throws Exception {
        mvc.perform(get("/api/admin/usuarios")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/usuarios").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        for (String role : new String[]{"USUARIO", "MODERADOR"}) {
            prepararRol(role);
            mvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isForbidden());
            mvc.perform(patch("/api/admin/usuarios/8/rol").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"rol\":\"ADMINISTRADOR\"}"))
                    .andExpect(status().isForbidden());
            mvc.perform(delete("/api/admin/usuarios/8").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(service);
    }

    @Test void eliminacionExigeAdministradorYResponde204() throws Exception {
        mvc.perform(delete("/api/admin/usuarios/8")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/admin/usuarios/8").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());
        verify(eliminacion).eliminar(eq(8L), any());
    }

    @Test void tokenConVersionRevocadaNoAccede() throws Exception {
        cuenta.setVersionToken(1);
        mvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test void administradorPuedeConsultarResumenYPaginacionPeroNoSeExponenSecretos() throws Exception {
        when(service.resumen(any())).thenReturn(new AdminResumenDTO(12, 10, 1, 1, 2));
        mvc.perform(get("/api/admin/usuarios/resumen").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalUsuarios").value(12))
                .andExpect(jsonPath("$.cuentasDesactivadas").value(2));
        mvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .param("q", "ana").param("rol", "USUARIO").param("estado", "ACTIVO")
                .param("page", "1").param("size", "5"))
                .andExpect(status().isOk());
        verify(service).listar(eq("ana"), eq("USUARIO"), eq(EstadoUsuario.ACTIVO), eq(1), eq(5),
                eq("fechaRegistro"), eq("desc"), any());
        Usuario objetivo = new Usuario();
        objetivo.setIdUsuario(8L);
        objetivo.setRol(cuenta.getRol());
        objetivo.setNombre("Nombre de prueba");
        objetivo.setNombreUsuario("prueba");
        objetivo.setCorreo("prueba@example.invalid");
        objetivo.setContrasena("hash-que-no-se-envia");
        objetivo.setPaisCodigo("MX");
        objetivo.setEstadoRegion("Oaxaca");
        when(service.detalle(eq(8L), any())).thenReturn(AdminUsuarioResponseDTO.from(objetivo, 7L));
        mvc.perform(get("/api/admin/usuarios/8").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ACTIVO"))
                .andExpect(jsonPath("$.estadoRegion").value("Oaxaca"))
                .andExpect(jsonPath("$.contrasena").doesNotExist())
                .andExpect(jsonPath("$.versionToken").doesNotExist());
    }

    @Test void entradasInvalidasYReglaDeNegocioDevuelven400Y422() throws Exception {
        mvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .param("size", "51")).andExpect(status().isBadRequest());
        mvc.perform(patch("/api/admin/usuarios/8/estado").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"SUSPENDIDO\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details").isNotEmpty());
        mvc.perform(post("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Ana\",\"nombreUsuario\":\"ana\",\"correo\":\"ana@example.invalid\","
                        + "\"fechaNacimiento\":\"2999-01-01\",\"paisCodigo\":\"MX\",\"estadoRegion\":\"Oaxaca\","
                        + "\"contrasena\":\"Segura123!\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.details[0].field").value("fechaNacimiento"));
        when(service.cambiarEstado(eq(8L), eq(EstadoUsuario.DESACTIVADO), any()))
                .thenThrow(new BusinessRuleException("No se puede retirar al último administrador activo."));
        mvc.perform(patch("/api/admin/usuarios/8/estado").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"DESACTIVADO\"}"))
                .andExpect(status().isUnprocessableEntity());
        when(service.detalle(eq(999L), any())).thenThrow(new ResourceNotFoundException("usuario", 999L));
        mvc.perform(get("/api/admin/usuarios/999").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
        when(service.cambiarRol(eq(8L), eq("USUARIO"), any()))
                .thenThrow(new DuplicateResourceException("nombreUsuario", "Ya existe"));
        mvc.perform(patch("/api/admin/usuarios/8/rol").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"rol\":\"USUARIO\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.details[0].field").value("nombreUsuario"));
    }
}
