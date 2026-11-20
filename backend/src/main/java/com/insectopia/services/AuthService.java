package com.insectopia.services;

import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.dtos.RegisterRequestDTO;
import com.insectopia.dtos.RegisterResponseDTO;
import com.insectopia.dtos.LoginRequestDTO;
import com.insectopia.dtos.AuthResponseDTO;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.JwtService;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.models.Usuario;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.repository.TokenRevocadoRepository;

@Service
public class AuthService {
    private static final Pattern MYSQL_KEY = Pattern.compile("for key ['`]?([^'` ]+)['`]?");
    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final CatalogoUbicacionesService catalogo;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final TokenRevocadoRepository revoked;

    public AuthService(UsuarioRepository usuarios, RolRepository roles,
            PasswordEncoder passwordEncoder, CatalogoUbicacionesService catalogo,
            AuthenticationManager authenticationManager, JwtService jwtService,
            TokenRevocadoRepository revoked) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.catalogo = catalogo;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.revoked = revoked;
    }

    @Transactional(readOnly = true)
    public AuthResponseDTO login(LoginRequestDTO request) {
        try {
            var authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.correo(), request.contrasena()));
            InsectopiaUserDetails principal = (InsectopiaUserDetails) authentication.getPrincipal();
            Usuario usuario = usuarios.findById(principal.idUsuario())
                    .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));
            if (usuario.getEstado() != EstadoUsuario.ACTIVO || usuario.getRol() == null
                    || !usuario.getCorreo().equals(principal.correo())
                    || !usuario.getRol().getNombre().equals(principal.role())
                    || !usuario.getVersionToken().equals(principal.versionToken())) {
                throw new BadCredentialsException("Credenciales inválidas");
            }
            return new AuthResponseDTO(jwtService.issue(usuario), AuthResponseDTO.UserDTO.from(usuario));
        } catch (AuthenticationException exception) {
            // No indication whether the address exists or the account is inactive.
            throw new BadCredentialsException("Credenciales inválidas");
        }
    }

    @Transactional(readOnly = true)
    public AuthResponseDTO.UserDTO me(InsectopiaUserDetails principal) {
        Usuario usuario = usuarios.findById(principal.idUsuario())
                .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));
        return AuthResponseDTO.UserDTO.from(usuario);
    }

    @Transactional
    public void logout(String authorization, InsectopiaUserDetails principal) {
        if (principal == null || authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)
                || authorization.length() <= 7) {
            throw new BadCredentialsException("Credencial inválida");
        }
        JwtService.TokenClaims claims;
        try {
            claims = jwtService.validate(authorization.substring(7)); // Signature and expiration verified first.
        } catch (RuntimeException exception) {
            throw new BadCredentialsException("Credencial inválida");
        }
        if (claims.userId() != principal.idUsuario() || !claims.role().equals(principal.role())
                || claims.version() != principal.versionToken() || revoked.existsByJti(claims.jti())) {
            throw new BadCredentialsException("Credencial inválida");
        }
        revoked.revokeIfAbsent(claims.jti(), principal.idUsuario(),
                LocalDateTime.ofInstant(Instant.now(), ZoneOffset.UTC),
                LocalDateTime.ofInstant(claims.expiresAt(), ZoneOffset.UTC));
        // The transaction commits before the controller can send 204. Database errors propagate as 5xx.
    }

    @Transactional
    public RegisterResponseDTO register(RegisterRequestDTO request) {
        // The request record normalizes only non-secret fields; validation is performed at the HTTP boundary.
        if (usuarios.existsByCorreo(request.correo())) {
            throw duplicate("correo");
        }
        if (usuarios.existsByNombreUsuario(request.nombreUsuario())) {
            throw duplicate("nombreUsuario");
        }
        String region = catalogo.validarRegion(request.paisCodigo(), request.estadoRegion());
        if ((request.recibirSms() || request.recibirWhatsapp()) && request.telefono() == null) {
            throw new com.insectopia.exceptions.RegistrationValidationException(
                    "telefono", "Se requiere un teléfono para recibir comunicaciones.");
        }
        var rol = roles.findByNombre("USUARIO")
                .orElseThrow(() -> new IllegalStateException("Falta el rol USUARIO"));

        Usuario usuario = new Usuario();
        usuario.setRol(rol);
        usuario.setNombre(request.nombre());
        usuario.setNombreUsuario(request.nombreUsuario());
        usuario.setCorreo(request.correo());
        usuario.setContrasena(passwordEncoder.encode(request.contrasena()));
        usuario.setFechaNacimiento(request.fechaNacimiento());
        usuario.setGenero(request.genero());
        usuario.setPaisCodigo(request.paisCodigo());
        usuario.setEstadoRegion(region);
        usuario.setTelefono(request.telefono());
        usuario.setRecibirSms(request.recibirSms());
        usuario.setRecibirWhatsapp(request.recibirWhatsapp());

        try {
            // Flush inside the transaction to translate concurrent UNIQUE violations before returning 201.
            usuario = usuarios.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException exception) {
            DuplicateResourceException duplicate = uniqueConflict(exception);
            if (duplicate != null) {
                throw duplicate;
            }
            throw exception;
        }
        return new RegisterResponseDTO(usuario.getIdUsuario(), usuario.getNombre(),
                usuario.getNombreUsuario(), usuario.getCorreo(), rol.getNombre(), "Cuenta creada correctamente");
    }

    private static DuplicateResourceException duplicate(String field) {
        return new DuplicateResourceException(field, field.equals("correo")
                ? "Este correo ya está registrado." : "Este nombre de usuario ya está en uso.");
    }

    private static DuplicateResourceException uniqueConflict(DataIntegrityViolationException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql && sql.getErrorCode() == 1062 && "23000".equals(sql.getSQLState())) {
                Matcher matcher = MYSQL_KEY.matcher(sql.getMessage() == null ? "" : sql.getMessage());
                if (matcher.find()) {
                    String key = matcher.group(1);
                    if (key.equals("uk_usuarios_correo") || key.equals("usuarios.uk_usuarios_correo")) {
                        return duplicate("correo");
                    }
                    if (key.equals("uk_usuarios_nombre_usuario") || key.equals("usuarios.uk_usuarios_nombre_usuario")) {
                        return duplicate("nombreUsuario");
                    }
                }
            }
        }
        return null;
    }
}
