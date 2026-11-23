package com.insectopia.services;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.insectopia.dtos.ActualizarPerfilRequestDTO;
import com.insectopia.dtos.CambiarContrasenaRequest;
import com.insectopia.dtos.CambiarContrasenaResponseDTO;
import com.insectopia.dtos.ConfiguracionPerfilResponseDTO;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.TokenRecuperacionRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;

@Service
public class ConfiguracionCuentaService {
    private static final Pattern NOMBRE = Pattern.compile("[0-9a-fA-F-]{36}\\.(jpg|png)");
    private static final int MAX_INTENTOS = 5;
    private static final long VENTANA_MS = 15 * 60_000L;
    private final Map<Long, Intentos> intentos = new HashMap<>();
    private record Intentos(int cantidad, long hasta) { }

    private final UsuarioRepository usuarios;
    private final TokenRecuperacionRepository tokens;
    private final PasswordEncoder encoder;
    private final CatalogoUbicacionesService catalogo;
    private final AlmacenamientoImagenesService imagenes;
    private final LimpiezaArchivosCuentaService limpieza;
    private final String baseUrl;

    public ConfiguracionCuentaService(UsuarioRepository usuarios, TokenRecuperacionRepository tokens,
            PasswordEncoder encoder, CatalogoUbicacionesService catalogo,
            @Qualifier("imagenesAvatares") AlmacenamientoImagenesService imagenes,
            LimpiezaArchivosCuentaService limpieza,
            @Value("${app.api.public-url:http://localhost:8080}") String baseUrl) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.encoder = encoder;
        this.catalogo = catalogo;
        this.imagenes = imagenes;
        this.limpieza = limpieza;
        if (!baseUrl.matches("https?://[^/?#]+(?:/[^?#]*)?")) throw new IllegalArgumentException("URL pública inválida");
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    private Long id(InsectopiaUserDetails principal) {
        if (principal == null || principal.idUsuario() == null)
            throw new AuthenticationCredentialsNotFoundException("Autenticación requerida");
        return principal.idUsuario();
    }

    private Usuario propio(InsectopiaUserDetails principal) {
        Long id = id(principal);
        Usuario usuario = usuarios.bloquearPorId(id).orElseThrow(() -> new ResourceNotFoundException("usuario", id));
        if (usuario.getEstado() != EstadoUsuario.ACTIVO) throw new ResourceNotFoundException("usuario", id);
        // El filtro puede haber validado el JWT antes de esperar este bloqueo.
        if (!usuario.getVersionToken().equals(principal.versionToken())
                || !usuario.getRol().getNombre().equals(principal.role()))
            throw new BadCredentialsException("Credencial desactualizada");
        return usuario;
    }

    @Transactional(readOnly = true)
    public ConfiguracionPerfilResponseDTO consultar(InsectopiaUserDetails principal) {
        Long id = id(principal);
        Usuario usuario = usuarios.findById(id).orElseThrow(() -> new ResourceNotFoundException("usuario", id));
        if (usuario.getEstado() != EstadoUsuario.ACTIVO) throw new ResourceNotFoundException("usuario", id);
        return ConfiguracionPerfilResponseDTO.from(usuario);
    }

    @Transactional
    public ConfiguracionPerfilResponseDTO actualizar(ActualizarPerfilRequestDTO datos, InsectopiaUserDetails principal) {
        Usuario usuario = propio(principal);
        if (usuarios.existsByNombreUsuarioAndIdUsuarioNot(datos.nombreUsuario(), usuario.getIdUsuario()))
            throw AuthService.duplicate("nombreUsuario");
        String region = catalogo.validarRegion(datos.paisCodigo(), datos.estadoRegion());
        usuario.setNombre(datos.nombre());
        usuario.setNombreUsuario(datos.nombreUsuario());
        usuario.setBiografia(datos.biografia());
        usuario.setGenero(datos.genero());
        usuario.setPaisCodigo(datos.paisCodigo());
        usuario.setEstadoRegion(region);
        usuario.setFechaNacimiento(datos.fechaNacimiento());
        usuario.setTelefono(datos.telefono());
        try {
            usuarios.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException exception) {
            var duplicado = AuthService.uniqueConflict(exception);
            if (duplicado != null && "nombreUsuario".equals(duplicado.getField())) throw duplicado;
            throw exception;
        }
        return ConfiguracionPerfilResponseDTO.from(usuario);
    }

    @Transactional
    public CambiarContrasenaResponseDTO cambiarContrasena(CambiarContrasenaRequest datos, InsectopiaUserDetails principal) {
        Usuario usuario = propio(principal); // Usuario antes que tokens: mismo orden que la recuperación.
        Long id = usuario.getIdUsuario();
        if (bloqueado(id) || !encoder.matches(datos.contrasenaActual(), usuario.getContrasena())) {
            fallo(id);
            throw new RegistrationValidationException("contrasenaActual", "La contraseña actual no es correcta.");
        }
        if (encoder.matches(datos.contrasenaNueva(), usuario.getContrasena()))
            throw new RegistrationValidationException("contrasenaNueva", "La nueva contraseña debe ser diferente.");
        usuario.setContrasena(encoder.encode(datos.contrasenaNueva()));
        usuario.setVersionToken(usuario.getVersionToken() + 1);
        usuarios.saveAndFlush(usuario);
        tokens.invalidarPendientes(id, LocalDateTime.now(ZoneOffset.UTC), -1L);
        limpiarIntentos(id);
        return new CambiarContrasenaResponseDTO("Contraseña actualizada correctamente.", true);
    }

    private synchronized boolean bloqueado(Long id) {
        Intentos estado = intentos.get(id);
        return estado != null && estado.hasta() > System.currentTimeMillis() && estado.cantidad() >= MAX_INTENTOS;
    }
    private synchronized void fallo(Long id) {
        long ahora = System.currentTimeMillis();
        if (intentos.size() >= 10_000 && !intentos.containsKey(id)) intentos.clear();
        Intentos previo = intentos.get(id);
        intentos.put(id, previo == null || previo.hasta() <= ahora
                ? new Intentos(1, ahora + VENTANA_MS) : new Intentos(previo.cantidad() + 1, previo.hasta()));
    }
    private synchronized void limpiarIntentos(Long id) { intentos.remove(id); }

    @Transactional
    public ConfiguracionPerfilResponseDTO subirAvatar(MultipartFile archivo, InsectopiaUserDetails principal) {
        Usuario usuario = propio(principal);
        String anterior = nombreLocal(usuario);
        String nuevo = imagenes.guardarAvatar(archivo);
        // Registrar antes de persistir: la sincronización también cubre fallos en commit.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED) imagenes.confirmarAvatar(nuevo);
                else imagenes.eliminarAvatarPendiente(nuevo);
            }
        });
        usuario.setFotoPerfil(url(usuario.getIdUsuario(), nuevo));
        if (anterior != null) limpieza.registrar("avatar", anterior); // outbox en la misma transacción
        usuarios.saveAndFlush(usuario);
        return ConfiguracionPerfilResponseDTO.from(usuario);
    }

    @Transactional
    public void quitarAvatar(InsectopiaUserDetails principal) {
        Usuario usuario = propio(principal);
        String anterior = nombreLocal(usuario);
        if (usuario.getFotoPerfil() == null) return;
        usuario.setFotoPerfil(null);
        if (anterior != null) limpieza.registrar("avatar", anterior);
        usuarios.saveAndFlush(usuario);
    }

    public record Avatar(Resource resource, MediaType tipo) { }

    @Transactional(readOnly = true)
    public Avatar leerAvatar(Long id) {
        Usuario usuario = usuarios.findById(id).orElseThrow(() -> new ResourceNotFoundException("avatar", id));
        if (usuario.getEstado() != EstadoUsuario.ACTIVO) throw new ResourceNotFoundException("avatar", id);
        String nombre = nombreLocal(usuario);
        if (nombre == null) throw new ResourceNotFoundException("avatar", id);
        return new Avatar(imagenes.leer(nombre), nombre.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG);
    }

    private String url(Long id, String nombre) {
        return baseUrl + "/api/usuarios/" + id + "/avatar?v=" + nombre;
    }
    private String nombreLocal(Usuario usuario) {
        String ruta = usuario.getFotoPerfil();
        String prefijo = baseUrl + "/api/usuarios/" + usuario.getIdUsuario() + "/avatar?v=";
        if (ruta == null || !ruta.startsWith(prefijo)) return null;
        String nombre = ruta.substring(prefijo.length());
        return NOMBRE.matcher(nombre).matches() ? nombre : null;
    }
}
