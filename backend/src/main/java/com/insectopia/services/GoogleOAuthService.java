package com.insectopia.services;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import com.insectopia.dtos.AuthResponseDTO;
import com.insectopia.dtos.GoogleConfigResponseDTO;
import com.insectopia.dtos.GoogleExchangeResponseDTO;
import com.insectopia.dtos.GoogleLinkStartResponseDTO;
import com.insectopia.dtos.GoogleProfileDTO;
import com.insectopia.dtos.GoogleRegisterRequestDTO;
import com.insectopia.dtos.GoogleTokenRequestDTO;
import com.insectopia.dtos.GoogleVinculoResponseDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.models.IdentidadOAuth;
import com.insectopia.models.OAuthCodigoIntercambio;
import com.insectopia.models.OAuthRegistroPendiente;
import com.insectopia.models.OAuthVinculacionPendiente;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.IdentidadOAuthRepository;
import com.insectopia.repository.OAuthCodigoIntercambioRepository;
import com.insectopia.repository.OAuthRegistroPendienteRepository;
import com.insectopia.repository.OAuthVinculacionPendienteRepository;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.GoogleOAuthState;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.JwtService;
import com.insectopia.security.ProtectedAccounts;

@Service
public class GoogleOAuthService {

    public static final String PROVEEDOR = IdentidadOAuth.PROVEEDOR_GOOGLE;
    public static final String ESTADO_LOGIN = "LOGIN_COMPLETO";
    public static final String ESTADO_REGISTRO = "REGISTRO_PENDIENTE";
    public static final String ESTADO_VINCULACION_REQUERIDA = "VINCULACION_REQUERIDA";
    public static final String ESTADO_ERROR = "ERROR_CONTROLADO";

    private static final Pattern MYSQL_KEY = Pattern.compile("for key ['`]?([^'` ]+)['`]?");
    private static final String MENSAJE_VINCULACION = "Ya existe una cuenta con ese correo. Inicia sesión con tu método actual y vincula Google desde Configuración.";

    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final IdentidadOAuthRepository identidades;
    private final OAuthCodigoIntercambioRepository codigos;
    private final OAuthRegistroPendienteRepository registros;
    private final OAuthVinculacionPendienteRepository vinculaciones;
    private final OAuthTokenService tokens;
    private final CatalogoUbicacionesService catalogo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Value("${app.google.oauth-enabled:false}")
    private boolean enabled;

    @Value("${app.google.client-id:}")
    private String clientId;

    @Value("${app.google.client-secret:}")
    private String clientSecret;

    @Value("${app.google.redirect-uri:}")
    private String redirectUri;

    @Value("${app.google.frontend-base-url:${app.frontend.base-url:http://localhost:5173}}")
    private String frontendBaseUrl;

    @Value("${app.google.exchange-code-minutes:5}")
    private long exchangeMinutes;

    @Value("${app.google.registration-minutes:15}")
    private long registrationMinutes;

    @Value("${app.google.link-minutes:5}")
    private long linkMinutes;

    public GoogleOAuthService(UsuarioRepository usuarios, RolRepository roles,
            IdentidadOAuthRepository identidades, OAuthCodigoIntercambioRepository codigos,
            OAuthRegistroPendienteRepository registros,
            OAuthVinculacionPendienteRepository vinculaciones, OAuthTokenService tokens,
            CatalogoUbicacionesService catalogo, PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.identidades = identidades;
        this.codigos = codigos;
        this.registros = registros;
        this.vinculaciones = vinculaciones;
        this.tokens = tokens;
        this.catalogo = catalogo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public GoogleConfigResponseDTO configuracion() {
        return new GoogleConfigResponseDTO(configurado(), "/oauth2/authorization/google");
    }

    /** Procesa la identidad OIDC ya verificada por Spring Security. */
    @Transactional
    public String procesarIdentidad(String subject, String correo, String nombre, String fotoUrl,
            Boolean correoVerificado, String intent, String linkToken) {
        if (!configurado()) {
            return urlError("GOOGLE_DESHABILITADO", "El inicio de sesión con Google no está disponible.");
        }
        if (subject == null || subject.isBlank() || correo == null || correo.isBlank()
                || !Boolean.TRUE.equals(correoVerificado)) {
            return urlError("CORREO_NO_VERIFICADO",
                    "Google no confirmó una dirección de correo verificada para esta cuenta.");
        }
        String sub = subject.trim();
        String email = correo.trim().toLowerCase(Locale.ROOT);
        String nombreGoogle = limitar(nombre, 100, email);

        if (GoogleOAuthState.INTENT_VINCULACION.equals(intent)) {
            return procesarVinculacion(sub, email, nombreGoogle, fotoUrl, linkToken);
        }
        return procesarIngreso(sub, email, nombreGoogle, fotoUrl);
    }

    private String procesarIngreso(String sub, String email, String nombre, String fotoUrl) {
        var identity = identidades.findByProveedorAndSubject(PROVEEDOR, sub);
        if (identity.isPresent()) {
            Usuario usuario = usuarios.findById(identity.get().getIdUsuario()).orElse(null);
            if (usuario == null || usuario.getEstado() != EstadoUsuario.ACTIVO) {
                return urlError("CUENTA_NO_DISPONIBLE", "Esta cuenta no está disponible.");
            }
            String code = crearCodigo(ESTADO_LOGIN, GoogleOAuthState.INTENT_LOGIN, usuario.getIdUsuario(),
                    sub, null, null, null, null, null,
                    "Sesión iniciada con Google.");
            return urlResultado(code);
        }

        // El correo verificado nunca basta para enlazar: solo evita crear un segundo usuario.
        if (usuarios.findByCorreo(email).isPresent()) {
            String code = crearCodigo(ESTADO_VINCULACION_REQUERIDA, GoogleOAuthState.INTENT_LOGIN,
                    null, sub, email, nombre, fotoUrl, null, null, MENSAJE_VINCULACION);
            return urlResultado(code);
        }

        String registrationToken = tokens.generar();
        LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
        int guardado = registros.guardarORenovar(tokens.hash(registrationToken), sub, email,
                nombre, limitar(fotoUrl, 500, null), ahora, ahora.plusMinutes(registrationMinutes));
        OAuthRegistroPendiente pendiente = guardado > 0
                ? registros.findBySubject(sub).orElse(null)
                : null;
        if (pendiente == null) {
            return urlError("REGISTRO_NO_DISPONIBLE",
                    "No se pudo preparar el registro con Google. Inténtalo de nuevo.");
        }

        String code = crearCodigo(ESTADO_REGISTRO, GoogleOAuthState.INTENT_LOGIN, null, sub, email,
                nombre, fotoUrl, pendiente.getIdRegistro(), null,
                "Completa tu perfil para crear la cuenta.");
        return urlResultado(code);
    }

    private String procesarVinculacion(String sub, String email, String nombre, String fotoUrl,
            String linkToken) {
        if (linkToken == null || !GoogleOAuthState.ES_TOKEN_VINCULACION.matcher(linkToken).matches()) {
            return urlError("VINCULACION_INVALIDA", "La solicitud de vinculación no es válida.");
        }
        String hash = tokens.hash(linkToken);
        OAuthVinculacionPendiente solicitud = vinculaciones.findByTokenHash(hash).orElse(null);
        LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
        if (solicitud == null || solicitud.getFechaUso() != null
                || solicitud.getFechaExpiracion() == null
                || !solicitud.getFechaExpiracion().isAfter(ahora)) {
            return urlError("VINCULACION_INVALIDA", "La solicitud de vinculación expiró. Vuelve a intentarlo.");
        }
        // El token pertenece a un usuario autenticado, pero su rol o estado pueden haber
        // cambiado durante la ventana de cinco minutos: se vuelve a comprobar aquí.
        Usuario destinatario = usuarios.findById(solicitud.getIdUsuario()).orElse(null);
        if (destinatario == null || destinatario.getEstado() != EstadoUsuario.ACTIVO
                || esCuentaProtegida(destinatario)) {
            return urlError("VINCULACION_INVALIDA", "La solicitud de vinculación ya no es válida.");
        }
        if (identidades.existsByProveedorAndSubject(PROVEEDOR, sub)) {
            return urlError("GOOGLE_YA_VINCULADO", "Esa identidad de Google ya está vinculada.");
        }
        if (vinculaciones.fijarSubject(hash, sub, ahora) != 1
                || vinculaciones.consumir(hash, ahora) != 1) {
            return urlError("VINCULACION_INVALIDA", "La solicitud de vinculación ya fue utilizada.");
        }

        String code = crearCodigo(ESTADO_LOGIN, GoogleOAuthState.INTENT_VINCULACION,
                solicitud.getIdUsuario(), sub, email, nombre, fotoUrl, null, null,
                "Cuenta vinculada correctamente.");
        return urlResultado(code);
    }

    /** Consume el código opaco y devuelve únicamente el estado controlado correspondiente. */
    @Transactional
    public GoogleExchangeResponseDTO intercambiar(String codeRaw) {
        if (!configurado()) {
            return GoogleExchangeResponseDTO.error("GOOGLE_DESHABILITADO",
                    "El inicio de sesión con Google no está disponible.");
        }
        if (codeRaw == null || codeRaw.isBlank()) {
            return GoogleExchangeResponseDTO.error("CODIGO_INVALIDO", "El código de intercambio no es válido.");
        }
        String hash = tokens.hash(codeRaw);
        OAuthCodigoIntercambio code = codigos.findByCodigoHash(hash).orElse(null);
        LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
        if (code == null || codigos.consumir(hash, ahora) != 1) {
            return GoogleExchangeResponseDTO.error("CODIGO_INVALIDO",
                    "El enlace de Google expiró o ya fue utilizado. Inténtalo de nuevo.");
        }

        return switch (code.getEstado() == null ? "" : code.getEstado()) {
            case ESTADO_LOGIN -> loginDesdeCodigo(code);
            case ESTADO_REGISTRO -> registroDesdeCodigo(code, ahora);
            case ESTADO_VINCULACION_REQUERIDA -> GoogleExchangeResponseDTO.vinculacionRequerida(
                    mensajeSeguro(code, MENSAJE_VINCULACION));
            case ESTADO_ERROR -> GoogleExchangeResponseDTO.error(
                    code.getCodigoError() == null ? "ERROR_CONTROLADO" : code.getCodigoError(),
                    mensajeSeguro(code, "No se pudo completar la autenticación con Google."));
            default -> GoogleExchangeResponseDTO.error("ERROR_CONTROLADO",
                    "No se pudo completar la autenticación con Google.");
        };
    }

    private GoogleExchangeResponseDTO loginDesdeCodigo(OAuthCodigoIntercambio code) {
        Usuario usuario = usuarios.findById(code.getIdUsuario()).orElse(null);
        if (usuario == null || usuario.getEstado() != EstadoUsuario.ACTIVO) {
            return GoogleExchangeResponseDTO.error("CUENTA_NO_DISPONIBLE", "Esta cuenta no está disponible.");
        }
        if (GoogleOAuthState.INTENT_VINCULACION.equals(code.getOrigen())) {
            return GoogleExchangeResponseDTO.vinculacion(auth(usuario), mensajeSeguro(code,
                    "Cuenta vinculada correctamente."));
        }
        return GoogleExchangeResponseDTO.login(auth(usuario), mensajeSeguro(code, "Sesión iniciada con Google."));
    }

    private GoogleExchangeResponseDTO registroDesdeCodigo(OAuthCodigoIntercambio code, LocalDateTime ahora) {
        OAuthRegistroPendiente pendiente = registros.findById(code.getIdRegistro()).orElse(null);
        if (pendiente == null || pendiente.getFechaUso() != null
                || pendiente.getFechaExpiracion() == null
                || !pendiente.getFechaExpiracion().isAfter(ahora)) {
            return GoogleExchangeResponseDTO.error("REGISTRO_EXPIRADO",
                    "El registro de Google expiró. Inicia sesión con Google nuevamente.");
        }
        String registrationToken = tokens.generar();
        pendiente.setTokenHash(tokens.hash(registrationToken));
        registros.saveAndFlush(pendiente);
        return GoogleExchangeResponseDTO.pendiente(registrationToken, new GoogleProfileDTO(
                pendiente.getCorreo(), pendiente.getNombre(), pendiente.getFotoUrl()));
    }

    @Transactional
    public AuthResponseDTO completarRegistro(GoogleTokenRequestDTO request,
            GoogleRegisterRequestDTO datos) {
        if (!configurado()) {
            throw new BusinessRuleException("El registro con Google no está disponible.");
        }
        if (!Boolean.TRUE.equals(datos.aceptarTerminos())) {
            throw new RegistrationValidationException("aceptarTerminos",
                    "Debes aceptar los términos y el aviso de privacidad.");
        }
        String hash = tokens.hash(request.token());
        OAuthRegistroPendiente pendiente = registros.findByTokenHash(hash).orElse(null);
        LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
        if (pendiente == null || registros.consumir(hash, ahora) != 1
                || pendiente.getFechaExpiracion() == null
                || !pendiente.getFechaExpiracion().isAfter(ahora)) {
            throw new BusinessRuleException("El registro de Google expiró o ya fue utilizado.");
        }
        if (usuarios.existsByCorreo(pendiente.getCorreo())) {
            throw new BusinessRuleException(MENSAJE_VINCULACION);
        }
        if (usuarios.existsByNombreUsuario(datos.nombreUsuario())) {
            throw AuthService.duplicate("nombreUsuario");
        }
        if (identidades.existsByProveedorAndSubject(PROVEEDOR, pendiente.getSubject())) {
            throw new BusinessRuleException("Esa identidad de Google ya está vinculada a otra cuenta.");
        }
        String region = catalogo.validarRegion(datos.paisCodigo(), datos.estadoRegion());
        if ((Boolean.TRUE.equals(datos.recibirSms()) || Boolean.TRUE.equals(datos.recibirWhatsapp()))
                && datos.telefono() == null) {
            throw new RegistrationValidationException("telefono",
                    "Se requiere un teléfono para recibir comunicaciones.");
        }
        if (Boolean.TRUE.equals(datos.recibirSms()) && !SmsSettings.e164(datos.telefono())) {
            throw new RegistrationValidationException("telefono",
                    "Para recibir SMS se requiere un teléfono E.164.");
        }
        var rol = roles.findByNombre("USUARIO")
                .orElseThrow(() -> new IllegalStateException("Falta el rol USUARIO"));

        Usuario usuario = new Usuario();
        usuario.setRol(rol);
        usuario.setNombre(datos.nombre());
        usuario.setNombreUsuario(datos.nombreUsuario());
        usuario.setCorreo(pendiente.getCorreo());
        usuario.setContrasena(passwordEncoder.encode(tokens.generarContrasenaDesconocida()));
        usuario.setAccesoLocalValido(Boolean.FALSE);
        usuario.setFechaNacimiento(datos.fechaNacimiento());
        usuario.setGenero(datos.genero());
        usuario.setPaisCodigo(datos.paisCodigo());
        usuario.setEstadoRegion(region);
        usuario.setTelefono(datos.telefono());
        usuario.setRecibirSms(datos.recibirSms());
        usuario.setRecibirWhatsapp(datos.recibirWhatsapp());

        try {
            usuario = usuarios.saveAndFlush(usuario);
            identidades.saveAndFlush(new IdentidadOAuth(usuario.getIdUsuario(), PROVEEDOR,
                    pendiente.getSubject(), ahora));
        } catch (DataIntegrityViolationException exception) {
            DuplicateResourceException duplicate = mapUniqueConflict(exception);
            if (duplicate != null) throw duplicate;
            throw exception;
        }
        pendiente.setFechaUso(ahora);
        registros.saveAndFlush(pendiente);
        return auth(usuario);
    }

    @Transactional
    public void cancelarRegistro(GoogleTokenRequestDTO request) {
        String hash = tokens.hash(request.token());
        OAuthRegistroPendiente pendiente = registros.findByTokenHash(hash).orElse(null);
        if (pendiente == null || pendiente.getFechaUso() != null) return;
        LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
        if (registros.consumir(hash, ahora) == 1) {
            pendiente.setFechaUso(ahora);
            registros.saveAndFlush(pendiente);
        }
    }

    @Transactional
    public GoogleLinkStartResponseDTO iniciarVinculacion(InsectopiaUserDetails principal) {
        validarDisponibilidad();
        Usuario usuario = usuarioValido(principal);
        if (esCuentaProtegida(usuario)) {
            throw new BusinessRuleException(
                    "Esta cuenta administrativa o de evaluación no puede vincular Google.");
        }
        if (identidades.existsByProveedorAndIdUsuario(PROVEEDOR, usuario.getIdUsuario())) {
            throw new BusinessRuleException("Esta cuenta ya tiene una identidad de Google vinculada.");
        }
        String token = tokens.generar();
        LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
        OAuthVinculacionPendiente solicitud = new OAuthVinculacionPendiente();
        solicitud.setTokenHash(tokens.hash(token));
        solicitud.setIdUsuario(usuario.getIdUsuario());
        solicitud.setFechaCreacion(ahora);
        solicitud.setFechaExpiracion(ahora.plusMinutes(linkMinutes));
        vinculaciones.saveAndFlush(solicitud);

        String authorizationUrl = "/oauth2/authorization/google?intent="
                + GoogleOAuthState.INTENT_VINCULACION + "&linkToken="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
        return new GoogleLinkStartResponseDTO(authorizationUrl,
                solicitud.getFechaExpiracion().toInstant(ZoneOffset.UTC));
    }

    @Transactional(readOnly = true)
    public GoogleVinculoResponseDTO consultarVinculo(InsectopiaUserDetails principal) {
        Usuario usuario = usuarioValido(principal);
        boolean vinculado = identidades.existsByProveedorAndIdUsuario(PROVEEDOR, usuario.getIdUsuario());
        return new GoogleVinculoResponseDTO(vinculado, vinculado ? PROVEEDOR : null);
    }

    @Transactional
    public void desvincular(InsectopiaUserDetails principal) {
        Usuario usuario = usuarioValido(principal);
        if (esCuentaProtegida(usuario)) {
            throw new BusinessRuleException(
                    "Esta cuenta administrativa o de evaluación no puede desvincular Google.");
        }
        long total = identidades.countByIdUsuario(usuario.getIdUsuario());
        if (total == 0) return;
        if (total == 1 && !Boolean.TRUE.equals(usuario.getAccesoLocalValido())) {
            throw new BusinessRuleException(
                    "Google es tu único método de acceso. Establece una contraseña antes de desvincularlo.");
        }
        identidades.deleteByIdUsuarioAndProveedor(usuario.getIdUsuario(), PROVEEDOR);
    }

    /** Crea un código de error controlado sin revelar el motivo interno del fallo. */
    @Transactional
    public String urlFallo(String errorGoogle) {
        boolean cancelado = "access_denied".equalsIgnoreCase(errorGoogle);
        return urlError(cancelado ? "GOOGLE_CANCELADO" : "GOOGLE_ERROR",
                cancelado ? "Inicio de sesión con Google cancelado."
                        : "No se pudo completar la autenticación con Google.");
    }

    private boolean configurado() {
        return enabled
                && clientId != null && !clientId.isBlank()
                && clientSecret != null && !clientSecret.isBlank()
                && redirectUri != null && !redirectUri.isBlank();
    }

    private void validarDisponibilidad() {
        if (!configurado()) {
            throw new BusinessRuleException("La vinculación con Google no está disponible.");
        }
    }

    private Usuario usuarioValido(InsectopiaUserDetails principal) {
        if (principal == null) {
            throw new BusinessRuleException("Debes iniciar sesión para realizar esta acción.");
        }
        Usuario usuario = usuarios.findById(principal.idUsuario())
                .orElseThrow(() -> new BusinessRuleException("La cuenta no existe."));
        if (usuario.getEstado() != EstadoUsuario.ACTIVO) {
            throw new BusinessRuleException("Esta cuenta no está disponible.");
        }
        return usuario;
    }

    private static boolean esCuentaProtegida(Usuario usuario) {
        return ProtectedAccounts.EVALUATION_ADMIN_USERNAME.equalsIgnoreCase(usuario.getNombreUsuario())
                || (usuario.getRol() != null
                        && "ADMINISTRADOR".equalsIgnoreCase(usuario.getRol().getNombre()));
    }

    private AuthResponseDTO auth(Usuario usuario) {
        return new AuthResponseDTO(jwtService.issue(usuario), AuthResponseDTO.UserDTO.from(usuario));
    }

    private String crearCodigo(String estado, String origen, Long idUsuario, String subject,
            String correo, String nombre, String fotoUrl, Long idRegistro, String codigoError,
            String mensaje) {
        String raw = tokens.generar();
        LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
        OAuthCodigoIntercambio entidad = new OAuthCodigoIntercambio();
        entidad.setCodigoHash(tokens.hash(raw));
        entidad.setEstado(estado);
        entidad.setOrigen(origen);
        entidad.setIdUsuario(idUsuario);
        entidad.setSubject(limitar(subject, 255, null));
        entidad.setCorreo(limitar(correo, 150, null));
        entidad.setNombre(limitar(nombre, 100, null));
        entidad.setFotoUrl(limitar(fotoUrl, 500, null));
        entidad.setIdRegistro(idRegistro);
        entidad.setCodigoError(limitar(codigoError, 50, null));
        entidad.setMensaje(limitar(mensaje, 255, null));
        entidad.setFechaCreacion(ahora);
        entidad.setFechaExpiracion(ahora.plusMinutes(exchangeMinutes));
        codigos.saveAndFlush(entidad);
        return raw;
    }

    private String urlError(String codigo, String mensaje) {
        String raw = crearCodigo(ESTADO_ERROR, "error", null, null, null, null, null,
                null, codigo, mensaje);
        return urlResultado(raw);
    }

    private String urlResultado(String code) {
        String base = frontendBaseUrl == null ? "" : frontendBaseUrl.trim().replaceAll("/+$", "");
        return UriComponentsBuilder.fromUriString(base)
                .path("/auth/google/resultado")
                .queryParam("code", code)
                .build()
                .toUriString();
    }

    private static String mensajeSeguro(OAuthCodigoIntercambio code, String fallback) {
        return code.getMensaje() == null || code.getMensaje().isBlank()
                ? fallback : code.getMensaje();
    }

    private static String limitar(String valor, int max, String fallback) {
        if (valor == null || valor.isBlank()) return fallback;
        String limpio = valor.trim();
        return limpio.length() <= max ? limpio : limpio.substring(0, max);
    }

    private static DuplicateResourceException mapUniqueConflict(DataIntegrityViolationException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql && sql.getErrorCode() == 1062 && "23000".equals(sql.getSQLState())) {
                Matcher matcher = MYSQL_KEY.matcher(sql.getMessage() == null ? "" : sql.getMessage());
                if (matcher.find()) {
                    String key = matcher.group(1);
                    if (key.contains("uk_usuarios_correo")) return AuthService.duplicate("correo");
                    if (key.contains("uk_usuarios_nombre_usuario")) return AuthService.duplicate("nombreUsuario");
                    if (key.contains("uk_identidades_oauth_proveedor_subject")) {
                        return new DuplicateResourceException("Google ya está vinculado a otra cuenta.");
                    }
                }
            }
        }
        return null;
    }
}
