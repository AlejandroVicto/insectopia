package com.insectopia.services;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.dtos.ForgotPasswordRequestDTO;
import com.insectopia.dtos.MensajeResponseDTO;
import com.insectopia.dtos.ResetPasswordRequestDTO;
import com.insectopia.exceptions.TokenRecuperacionException;
import com.insectopia.exceptions.TokenRecuperacionException.Motivo;
import com.insectopia.models.TokenRecuperacion;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.TokenRecuperacionRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.PasswordRecoveryRateLimiter;
import com.insectopia.security.ProtectedAccounts;

/** Flujo completo de recuperación: solicitud, token de un solo uso y cambio atómico. */
@Service
public class PasswordRecoveryService {

    public static final String MENSAJE_GENERICO =
            "Si el correo está asociado a una cuenta de Insectopia, recibirás un enlace para crear una nueva contraseña.";
    public static final String MENSAJE_ACTUALIZADA = "Tu contraseña se actualizó correctamente.";

    private static final Logger log = LoggerFactory.getLogger(PasswordRecoveryService.class);
    private static final long SIN_TOKEN = -1L;

    private final UsuarioRepository usuarios;
    private final TokenRecuperacionRepository tokens;
    private final RecoveryTokenGenerator generador;
    private final PasswordEncoder codificador;
    private final EmailService correo;
    private final PasswordRecoveryRateLimiter limite;
    private final PasswordRecoveryProperties properties;
    private final Clock clock;
    private final TransactionTemplate transaccion;

    public PasswordRecoveryService(
            UsuarioRepository usuarios,
            TokenRecuperacionRepository tokens,
            RecoveryTokenGenerator generador,
            PasswordEncoder codificador,
            EmailService correo,
            PasswordRecoveryRateLimiter limite,
            PasswordRecoveryProperties properties,
            PlatformTransactionManager gestor,
            Clock clock) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.generador = generador;
        this.codificador = codificador;
        this.correo = correo;
        this.limite = limite;
        this.properties = properties;
        this.clock = clock;
        this.transaccion = new TransactionTemplate(gestor);
    }

    /**
     * Siempre devuelve el mismo DTO y el mismo código. El límite se aplica antes de
     * consultar la cuenta para que existencia y no existencia sean indistinguibles.
     */
    public MensajeResponseDTO solicitar(ForgotPasswordRequestDTO request, String origen) {
        String destinatario = request.correo();

        if (!limite.permitir(destinatario, origen)) {
            log.debug("Solicitud de recuperación omitida por límite de frecuencia");
            return MensajeResponseDTO.of(MENSAJE_GENERICO);
        }

        RecoveryTokenGenerator.Generado generado = generador.generar();
        Instant ahora = clock.instant();
        AtomicReference<String> correoEnviable = new AtomicReference<>();

        // La transacción se confirma antes de cualquier envío SMTP.
        transaccion.executeWithoutResult(estado -> {
            Optional<Usuario> encontrado = usuarios.findByCorreo(destinatario);
            if (encontrado.isEmpty() || !elegible(encontrado.get())) {
                return;
            }
            // Serializar emisión y cambios de contraseña: cuenta antes que tokens.
            Usuario usuario = usuarios.bloquearPorId(encontrado.get().getIdUsuario()).orElse(null);
            if (usuario == null || !elegible(usuario)) return;
            LocalDateTime creacion = LocalDateTime.ofInstant(ahora, ZoneOffset.UTC);
            tokens.invalidarPendientes(usuario.getIdUsuario(), creacion, SIN_TOKEN);
            TokenRecuperacion registro = new TokenRecuperacion();
            registro.setUsuario(usuario);
            registro.setTokenHash(generado.hash());
            registro.setFechaCreacion(creacion);
            registro.setFechaExpiracion(creacion.plusMinutes(properties.expirationMinutes()));
            tokens.save(registro);
            correoEnviable.set(usuario.getCorreo());
        });

        String correoDestino = correoEnviable.get();
        if (correoDestino != null) {
            String enlace = properties.construirEnlace(generado.valor());
            try {
                correo.enviarRecuperacion(correoDestino, enlace);
            } catch (MailException exception) {
                // El token ya está confirmado; el usuario puede volver a solicitarlo
                // tras el intervalo configurado. Nunca se revela si la cuenta existe.
                log.warn("No se pudo enviar el correo de recuperación a {} ({})",
                        EmailService.enmascarar(correoDestino), exception.getClass().getSimpleName());
            }
        }
        return MensajeResponseDTO.of(MENSAJE_GENERICO);
    }

    /** Cambia la contraseña y revoca JWT anteriores en una única transacción. */
    public MensajeResponseDTO restablecer(ResetPasswordRequestDTO request) {
        String hash = generador.hash(request.token());
        Long idUsuario = tokens.idUsuarioPorHash(hash)
                .orElseThrow(() -> new TokenRecuperacionException(Motivo.INVALID));

        // Bloquear primero la cuenta serializa las peticiones del mismo usuario
        // y evita interbloqueos entre enlaces distintos de esa cuenta.
        transaccion.executeWithoutResult(estado -> {
            Usuario usuario = usuarios.bloquearPorId(idUsuario)
                    .orElseThrow(() -> new TokenRecuperacionException(Motivo.INVALID));
            if (!elegible(usuario)) {
                throw new TokenRecuperacionException(Motivo.INVALID);
            }

            TokenRecuperacion token = tokens.bloquearPorHash(hash)
                    .orElseThrow(() -> new TokenRecuperacionException(Motivo.INVALID));
            if (!idUsuario.equals(token.getUsuario().getIdUsuario())) {
                throw new TokenRecuperacionException(Motivo.INVALID);
            }
            if (token.getFechaUso() != null) {
                throw new TokenRecuperacionException(Motivo.USED);
            }
            LocalDateTime ahora = LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
            if (token.getFechaExpiracion() == null || !token.getFechaExpiracion().isAfter(ahora)) {
                throw new TokenRecuperacionException(Motivo.EXPIRED);
            }

            // La contraseña del DTO no se recorta ni se transforma antes de BCrypt.
            usuario.setContrasena(codificador.encode(request.contrasena()));
            // Tras un restablecimiento existe una contraseña local conocida por el usuario.
            usuario.setAccesoLocalValido(Boolean.TRUE);
            int version = usuario.getVersionToken() == null ? 0 : usuario.getVersionToken();
            usuario.setVersionToken(version + 1);
            token.setFechaUso(ahora);
            tokens.invalidarPendientes(idUsuario, ahora, token.getIdToken());
        });

        return MensajeResponseDTO.of(MENSAJE_ACTUALIZADA);
    }

    private static boolean elegible(Usuario usuario) {
        return usuario.getEstado() == EstadoUsuario.ACTIVO
                && !ProtectedAccounts.EVALUATION_ADMIN_USERNAME.equalsIgnoreCase(usuario.getNombreUsuario());
    }
}
