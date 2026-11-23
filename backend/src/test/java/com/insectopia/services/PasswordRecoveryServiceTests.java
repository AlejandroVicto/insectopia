package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import com.insectopia.dtos.ForgotPasswordRequestDTO;
import com.insectopia.dtos.MensajeResponseDTO;
import com.insectopia.dtos.ResetPasswordRequestDTO;
import com.insectopia.exceptions.TokenRecuperacionException;
import com.insectopia.models.TokenRecuperacion;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.TokenRecuperacionRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.PasswordRecoveryRateLimiter;
import com.insectopia.security.ProtectedAccounts;

class PasswordRecoveryServiceTests {

    private static final Instant AHORA = Instant.parse("2026-01-01T12:00:00Z");
    private static final LocalDateTime CREACION = LocalDateTime.ofInstant(AHORA, ZoneOffset.UTC);
    private static final String TOKEN = "tokenOriginal";
    private static final String HASH = "hashSha256";

    private UsuarioRepository usuarios;
    private TokenRecuperacionRepository tokens;
    private RecoveryTokenGenerator generador;
    private PasswordEncoder codificador;
    private EmailService correo;
    private PasswordRecoveryRateLimiter limite;
    private PlatformTransactionManager gestor;
    private PasswordRecoveryService service;

    @BeforeEach
    void setUp() {
        usuarios = mock(UsuarioRepository.class);
        tokens = mock(TokenRecuperacionRepository.class);
        generador = mock(RecoveryTokenGenerator.class);
        codificador = new BCryptPasswordEncoder(4);
        correo = mock(EmailService.class);
        limite = mock(PasswordRecoveryRateLimiter.class);
        gestor = mock(PlatformTransactionManager.class);
        when(gestor.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(limite.permitir(anyString(), anyString())).thenReturn(true);

        PasswordRecoveryProperties properties = new PasswordRecoveryProperties("local", "",
                "http://localhost:5173", "no-reply@insectopia.invalid", 15,
                60, 3, 15, 30, 15, 10_000);
        service = new PasswordRecoveryService(usuarios, tokens, generador, codificador,
                correo, limite, properties, gestor, Clock.fixed(AHORA, ZoneOffset.UTC));
    }

    @Test
    void solicitudValidaPersisteSoloElHashConfirmaAntesDeEnviarYEliminaEnlacesPrevios() {
        when(generador.generar()).thenReturn(new RecoveryTokenGenerator.Generado(TOKEN, HASH));
        when(usuarios.findByCorreo("persona@ejemplo.com")).thenReturn(Optional.of(usuario()));
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario()));

        MensajeResponseDTO respuesta = service.solicitar(
                new ForgotPasswordRequestDTO("  PERSONA@Ejemplo.com "), "1.2.3.4");

        assertEquals(PasswordRecoveryService.MENSAJE_GENERICO, respuesta.message());
        ArgumentCaptor<TokenRecuperacion> captor = ArgumentCaptor.forClass(TokenRecuperacion.class);
        verify(tokens).save(captor.capture());
        TokenRecuperacion guardado = captor.getValue();
        assertEquals(HASH, guardado.getTokenHash());
        assertFalse(TOKEN.equals(guardado.getTokenHash()));
        assertEquals(CREACION, guardado.getFechaCreacion());
        assertEquals(CREACION.plusMinutes(15), guardado.getFechaExpiracion());
        assertEquals(null, guardado.getFechaUso());
        verify(tokens).invalidarPendientes(7L, CREACION, -1L);
        verify(correo).enviarRecuperacion(eq("persona@ejemplo.com"),
                argThat(enlace -> enlace.contains(TOKEN)
                        && enlace.startsWith("http://localhost:5173/restablecer-contrasena?token=")));
        verify(gestor).commit(any());
    }

    @Test
    void correoInexistenteInactivoOProtegidoDevuelveLaMismaRespuestaSinGuardarNiEnviar() {
        when(usuarios.findByCorreo("persona@ejemplo.com")).thenReturn(Optional.empty());
        assertEquals(PasswordRecoveryService.MENSAJE_GENERICO,
                service.solicitar(new ForgotPasswordRequestDTO("persona@ejemplo.com"), "1.2.3.4").message());

        Usuario inactivo = usuario();
        inactivo.setEstado(EstadoUsuario.BLOQUEADO);
        when(usuarios.findByCorreo("persona@ejemplo.com")).thenReturn(Optional.of(inactivo));
        assertEquals(PasswordRecoveryService.MENSAJE_GENERICO,
                service.solicitar(new ForgotPasswordRequestDTO("persona@ejemplo.com"), "1.2.3.4").message());

        Usuario protegido = usuario();
        protegido.setNombreUsuario(ProtectedAccounts.EVALUATION_ADMIN_USERNAME);
        when(usuarios.findByCorreo("persona@ejemplo.com")).thenReturn(Optional.of(protegido));
        assertEquals(PasswordRecoveryService.MENSAJE_GENERICO,
                service.solicitar(new ForgotPasswordRequestDTO("persona@ejemplo.com"), "1.2.3.4").message());

        verify(tokens, never()).save(any());
        verifyNoInteractions(correo);
    }

    @Test
    void elLimiteSeAplicaAntesDeBuscarLaCuenta() {
        when(limite.permitir("persona@ejemplo.com", "9.9.9.9")).thenReturn(false);

        MensajeResponseDTO respuesta = service.solicitar(
                new ForgotPasswordRequestDTO("persona@ejemplo.com"), "9.9.9.9");

        assertEquals(PasswordRecoveryService.MENSAJE_GENERICO, respuesta.message());
        verifyNoInteractions(usuarios, tokens, generador, correo);
    }

    @Test
    void falloSMTPNoCambiaLaRespuestaNiImpideElTokenYaConfirmado() {
        when(generador.generar()).thenReturn(new RecoveryTokenGenerator.Generado(TOKEN, HASH));
        when(usuarios.findByCorreo("persona@ejemplo.com")).thenReturn(Optional.of(usuario()));
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario()));
        doThrow(new MailSendException("SMTP caído")).when(correo)
                .enviarRecuperacion(anyString(), anyString());

        MensajeResponseDTO respuesta = service.solicitar(
                new ForgotPasswordRequestDTO("persona@ejemplo.com"), "1.2.3.4");

        assertEquals(PasswordRecoveryService.MENSAJE_GENERICO, respuesta.message());
        verify(tokens).save(any());
    }

    @Test
    void tokenValidoCambiaBCryptIncrementaVersionTokenEInvalidaLosDemas() {
        Preparado preparado = prepararTokenValido();

        MensajeResponseDTO respuesta = service.restablecer(
                new ResetPasswordRequestDTO(TOKEN, "NuevaClave123!"));

        assertEquals(PasswordRecoveryService.MENSAJE_ACTUALIZADA, respuesta.message());
        assertTrue(codificador.matches("NuevaClave123!", preparado.usuario.getContrasena()));
        assertFalse(codificador.matches("ClaveAnterior1!", preparado.usuario.getContrasena()));
        assertEquals(3, preparado.usuario.getVersionToken());
        assertNotNull(preparado.token.getFechaUso());
        assertEquals(CREACION, preparado.token.getFechaUso());
        verify(tokens).invalidarPendientes(7L, CREACION, 5L);
    }

    @Test
    void tokenInexistenteSeRechazaSinTocarLaCuenta() {
        when(generador.hash(TOKEN)).thenReturn(HASH);
        when(tokens.idUsuarioPorHash(HASH)).thenReturn(Optional.empty());

        TokenRecuperacionException exception = assertThrows(TokenRecuperacionException.class,
                () -> service.restablecer(new ResetPasswordRequestDTO(TOKEN, "NuevaClave123!")));

        assertEquals("TOKEN_INVALID", exception.code());
        verify(usuarios, never()).bloquearPorId(anyLong());
    }

    @Test
    void tokenVencidoYTokenUsadoTienenCodigosDistintosYSinEfectos() {
        Preparado vencido = prepararTokenValido();
        vencido.token.setFechaExpiracion(CREACION.minusSeconds(1));
        TokenRecuperacionException expirado = assertThrows(TokenRecuperacionException.class,
                () -> service.restablecer(new ResetPasswordRequestDTO(TOKEN, "NuevaClave123!")));
        assertEquals("TOKEN_EXPIRED", expirado.code());
        assertTrue(codificador.matches("ClaveAnterior1!", vencido.usuario.getContrasena()));
        assertEquals(2, vencido.usuario.getVersionToken());

        Preparado usado = prepararTokenValido();
        usado.token.setFechaUso(CREACION.minusMinutes(1));
        TokenRecuperacionException reutilizado = assertThrows(TokenRecuperacionException.class,
                () -> service.restablecer(new ResetPasswordRequestDTO(TOKEN, "NuevaClave123!")));
        assertEquals("TOKEN_USED", reutilizado.code());
        assertEquals(2, usado.usuario.getVersionToken());
    }

    @Test
    void cuentaNoElegibleRecibeTokenInvalido() {
        Preparado preparado = prepararTokenValido();
        preparado.usuario.setEstado(EstadoUsuario.DESACTIVADO);

        TokenRecuperacionException exception = assertThrows(TokenRecuperacionException.class,
                () -> service.restablecer(new ResetPasswordRequestDTO(TOKEN, "NuevaClave123!")));

        assertEquals("TOKEN_INVALID", exception.code());
        verify(tokens, never()).invalidarPendientes(anyLong(), any(), anyLong());
    }

    @Test
    void unaSegundaPeticionConElMismoTokenEsRechazadaTrasElPrimerUso() {
        Preparado preparado = prepararTokenValido();
        ResetPasswordRequestDTO request = new ResetPasswordRequestDTO(TOKEN, "NuevaClave123!");

        service.restablecer(request);
        TokenRecuperacionException second = assertThrows(TokenRecuperacionException.class,
                () -> service.restablecer(request));

        assertEquals("TOKEN_USED", second.code());
        assertEquals(3, preparado.usuario.getVersionToken());
        verify(tokens, org.mockito.Mockito.times(1)).invalidarPendientes(7L, CREACION, 5L);
    }

    @Test
    void unFalloDuranteLaActualizacionProvocaRollback() {
        prepararTokenValido();
        doThrow(new IllegalStateException("error MySQL simulado"))
                .when(tokens).invalidarPendientes(anyLong(), any(), anyLong());

        assertThrows(IllegalStateException.class,
                () -> service.restablecer(new ResetPasswordRequestDTO(TOKEN, "NuevaClave123!")));

        verify(gestor).rollback(any());
    }

    private Preparado prepararTokenValido() {
        Usuario usuario = usuario();
        TokenRecuperacion token = token(usuario, AHORA.plusSeconds(15 * 60));
        when(generador.hash(TOKEN)).thenReturn(HASH);
        when(tokens.idUsuarioPorHash(HASH)).thenReturn(Optional.of(7L));
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario));
        when(tokens.bloquearPorHash(HASH)).thenReturn(Optional.of(token));
        return new Preparado(usuario, token);
    }

    private static Usuario usuario() {
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(7L);
        usuario.setCorreo("persona@ejemplo.com");
        usuario.setNombreUsuario("persona");
        usuario.setEstado(EstadoUsuario.ACTIVO);
        usuario.setVersionToken(2);
        usuario.setContrasena(new BCryptPasswordEncoder(4).encode("ClaveAnterior1!"));
        return usuario;
    }

    private static TokenRecuperacion token(Usuario usuario, Instant expiracion) {
        TokenRecuperacion token = new TokenRecuperacion();
        token.setIdToken(5L);
        token.setUsuario(usuario);
        token.setTokenHash(HASH);
        token.setFechaCreacion(CREACION);
        token.setFechaExpiracion(LocalDateTime.ofInstant(expiracion, ZoneOffset.UTC));
        return token;
    }

    private record Preparado(Usuario usuario, TokenRecuperacion token) {
    }
}
