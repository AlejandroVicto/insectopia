package com.insectopia.services;

import java.sql.SQLException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.dtos.RegisterRequestDTO;
import com.insectopia.dtos.RegisterResponseDTO;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.models.Usuario;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;

@Service
public class AuthService {
    private static final Pattern MYSQL_KEY = Pattern.compile("for key ['`]?([^'` ]+)['`]?");
    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final CatalogoUbicacionesService catalogo;

    public AuthService(UsuarioRepository usuarios, RolRepository roles,
            PasswordEncoder passwordEncoder, CatalogoUbicacionesService catalogo) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.catalogo = catalogo;
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
