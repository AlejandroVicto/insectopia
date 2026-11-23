package com.insectopia.controllers;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.SecureRandom;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insectopia.dtos.ForgotPasswordRequestDTO;
import com.insectopia.dtos.MensajeResponseDTO;
import com.insectopia.dtos.ResetPasswordRequestDTO;
import com.insectopia.exceptions.TokenRecuperacionException;
import com.insectopia.exceptions.TokenRecuperacionException.Motivo;
import com.insectopia.repository.TokenRevocadoRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.CustomUserDetailsService;
import com.insectopia.security.JwtAuthenticationFilter;
import com.insectopia.security.JwtService;
import com.insectopia.security.SecurityConfig;
import com.insectopia.services.AuthService;
import com.insectopia.services.PasswordRecoveryService;

/** Contrato HTTP exacto con el frontend 055 (actividades 056/090). */
@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class, JwtAuthenticationFilter.class})
class AuthControllerPasswordRecoveryTests {

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

    @MockitoBean private AuthService authService;
    @MockitoBean private PasswordRecoveryService recovery;
    @MockitoBean private UsuarioRepository usuarios;
    @MockitoBean private TokenRevocadoRepository revocados;

    @Test
    void forgotPasswordDevuelve202GenericoYNormalizaElCorreo() throws Exception {
        when(recovery.solicitar(any(), anyString()))
                .thenReturn(MensajeResponseDTO.of(PasswordRecoveryService.MENSAJE_GENERICO));

        mvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"  USUARIO@Ejemplo.com \"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value(PasswordRecoveryService.MENSAJE_GENERICO));

        ArgumentCaptor<ForgotPasswordRequestDTO> captor = ArgumentCaptor.forClass(ForgotPasswordRequestDTO.class);
        org.mockito.Mockito.verify(recovery).solicitar(captor.capture(), anyString());
        assertEquals("usuario@ejemplo.com", captor.getValue().correo());
    }

    @Test
    void forgotPasswordRechazaCorreoInvalido() throws Exception {
        mvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"correo\":\"no-es-un-correo\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("válidos")));
    }

    @Test
    void resetPasswordAceptaSoloTokenYContrasenaSinRecortarLaContrasena() throws Exception {
        when(recovery.restablecer(any()))
                .thenReturn(MensajeResponseDTO.of(PasswordRecoveryService.MENSAJE_ACTUALIZADA));

        mvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"abcDEF123_-  \",\"contrasena\":\"  Clave123!  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(PasswordRecoveryService.MENSAJE_ACTUALIZADA));

        ArgumentCaptor<ResetPasswordRequestDTO> captor = ArgumentCaptor.forClass(ResetPasswordRequestDTO.class);
        org.mockito.Mockito.verify(recovery).restablecer(captor.capture());
        assertEquals("abcDEF123_-", captor.getValue().token());
        assertEquals("  Clave123!  ", captor.getValue().contrasena());
    }

    @Test
    void resetPasswordDevuelveCodigoReconocibleParaTokenVencido() throws Exception {
        doThrow(new TokenRecuperacionException(Motivo.EXPIRED))
                .when(recovery).restablecer(any());

        mvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"abc\",\"contrasena\":\"NuevaClave123!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("TOKEN_EXPIRED"))
                .andExpect(jsonPath("$.message").value(containsString("venció")));
    }

    @Test
    void resetPasswordRechazaContrasenaQueNoCumpleReglasDeRegistro() throws Exception {
        mvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"abc\",\"contrasena\":\"corta1!\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details").isArray());

        org.mockito.Mockito.verify(recovery, org.mockito.Mockito.never()).restablecer(any());
    }
}
