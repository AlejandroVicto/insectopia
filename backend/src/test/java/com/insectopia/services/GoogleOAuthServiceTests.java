package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doReturn;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.insectopia.dtos.AuthResponseDTO;
import com.insectopia.dtos.GoogleConfigResponseDTO;
import com.insectopia.dtos.GoogleExchangeResponseDTO;
import com.insectopia.dtos.GoogleLinkStartResponseDTO;
import com.insectopia.dtos.GoogleRegisterRequestDTO;
import com.insectopia.dtos.GoogleTokenRequestDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.models.IdentidadOAuth;
import com.insectopia.models.OAuthCodigoIntercambio;
import com.insectopia.models.OAuthRegistroPendiente;
import com.insectopia.models.OAuthVinculacionPendiente;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.IdentidadOAuthRepository;
import com.insectopia.repository.OAuthCodigoIntercambioRepository;
import com.insectopia.repository.OAuthRegistroPendienteRepository;
import com.insectopia.repository.OAuthVinculacionPendienteRepository;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.JwtService;

class GoogleOAuthServiceTests {

    private static final String SUB = "google-sub-123456";
    private static final String CORREO = "maria@test.invalid";

    private UsuarioRepository usuarios;
    private RolRepository roles;
    private IdentidadOAuthRepository identidades;
    private OAuthCodigoIntercambioRepository codigos;
    private OAuthRegistroPendienteRepository registros;
    private OAuthVinculacionPendienteRepository vinculaciones;
    private OAuthTokenService tokens;
    private CatalogoUbicacionesService catalogo;
    private PasswordEncoder encoder;
    private JwtService jwt;
    private GoogleOAuthService service;
    private Rol rolUsuario;

    @BeforeEach
    void configurar() {
        usuarios = mock(UsuarioRepository.class);
        roles = mock(RolRepository.class);
        identidades = mock(IdentidadOAuthRepository.class);
        codigos = mock(OAuthCodigoIntercambioRepository.class);
        registros = mock(OAuthRegistroPendienteRepository.class);
        vinculaciones = mock(OAuthVinculacionPendienteRepository.class);
        tokens = spy(new OAuthTokenService());
        catalogo = mock(CatalogoUbicacionesService.class);
        encoder = new BCryptPasswordEncoder();
        jwt = mock(JwtService.class);

        service = new GoogleOAuthService(usuarios, roles, identidades, codigos, registros,
                vinculaciones, tokens, catalogo, encoder, jwt);
        ReflectionTestUtils.setField(service, "enabled", true);
        ReflectionTestUtils.setField(service, "clientId", "cliente-id");
        ReflectionTestUtils.setField(service, "clientSecret", "secreto");
        ReflectionTestUtils.setField(service, "redirectUri", "http://localhost:8080/login/oauth2/code/google");
        ReflectionTestUtils.setField(service, "frontendBaseUrl", "http://localhost:5173");
        ReflectionTestUtils.setField(service, "exchangeMinutes", 5L);
        ReflectionTestUtils.setField(service, "registrationMinutes", 15L);
        ReflectionTestUtils.setField(service, "linkMinutes", 5L);

        rolUsuario = rol("USUARIO");
        when(roles.findByNombre("USUARIO")).thenReturn(Optional.of(rolUsuario));
        when(jwt.issue(any(Usuario.class))).thenReturn("jwt-de-prueba");
        when(codigos.saveAndFlush(any(OAuthCodigoIntercambio.class)))
                .thenAnswer(invocacion -> invocacion.getArgument(0));
    }

    @Test
    void sinCredencialesLaConfiguracionDeshabilitaGoogleYNoEmiteCodigos() {
        ReflectionTestUtils.setField(service, "enabled", false);

        GoogleConfigResponseDTO config = service.configuracion();
        assertFalse(config.enabled());
        assertEquals("/oauth2/authorization/google", config.loginUrl());

        service.procesarIdentidad(SUB, CORREO, "María", null, true, "login", null);
        assertEquals("GOOGLE_DESHABILITADO", unicoCodigo().getCodigoError());
        assertEquals("GOOGLE_DESHABILITADO", service.intercambiar("cualquiera").codigo());
        verify(usuarios, never()).saveAndFlush(any());
    }

    @Test
    void correoLocalSinVinculoDaVinculacionRequeridaYNuncaAutoVincula() {
        when(identidades.findByProveedorAndSubject(GoogleOAuthService.PROVEEDOR, SUB)).thenReturn(Optional.empty());
        when(usuarios.findByCorreo(CORREO)).thenReturn(Optional.of(usuario(1L, "maria", "USUARIO", true)));
        doReturn("codigo-opaco").when(tokens).generar();

        String url = service.procesarIdentidad(SUB, CORREO, "María", null, true, "login", null);

        OAuthCodigoIntercambio code = unicoCodigo();
        assertEquals(GoogleOAuthService.ESTADO_VINCULACION_REQUERIDA, code.getEstado());
        assertEquals(SUB, code.getSubject());
        assertEquals(CORREO, code.getCorreo());
        assertEquals(null, code.getIdUsuario());
        assertTrue(url.contains("code=codigo-opaco"), url);
        assertNotNull(url);
        verify(usuarios, never()).saveAndFlush(any());
        verify(identidades, never()).saveAndFlush(any());

        when(codigos.findByCodigoHash(tokens.hash("codigo-opaco"))).thenReturn(Optional.of(code));
        when(codigos.consumir(anyString(), any(LocalDateTime.class))).thenReturn(1);
        GoogleExchangeResponseDTO respuesta = service.intercambiar("codigo-opaco");
        assertEquals(GoogleOAuthService.ESTADO_VINCULACION_REQUERIDA, respuesta.estado());
        assertEquals(null, respuesta.auth());
    }

    @Test
    void usuarioNuevoSoloSeCreaTrasCompletarElPerfilVerificado() {
        when(identidades.findByProveedorAndSubject(GoogleOAuthService.PROVEEDOR, SUB)).thenReturn(Optional.empty());
        when(usuarios.findByCorreo(CORREO)).thenReturn(Optional.empty());
        doReturn("codigo-opaco").when(tokens).generar();
        when(registros.guardarORenovar(anyString(), eq(SUB), eq(CORREO), eq("María"),
                nullable(String.class), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(1);
        when(registros.findBySubject(SUB)).thenReturn(Optional.of(registroPendiente(11L)));

        String url = service.procesarIdentidad(SUB, CORREO, "María", null, true, "login", null);

        OAuthCodigoIntercambio code = unicoCodigo();
        assertEquals(GoogleOAuthService.ESTADO_REGISTRO, code.getEstado());
        assertEquals(11L, code.getIdRegistro());
        assertTrue(url.contains("code=codigo-opaco"), url);
        verify(usuarios, never()).saveAndFlush(any());

        doReturn("token-registro").when(tokens).generar();
        when(codigos.findByCodigoHash(tokens.hash("codigo-opaco"))).thenReturn(Optional.of(code));
        when(codigos.consumir(anyString(), any(LocalDateTime.class))).thenReturn(1);
        when(registros.findById(11L)).thenReturn(Optional.of(registroPendiente(11L)));
        GoogleExchangeResponseDTO pendiente = service.intercambiar("codigo-opaco");
        assertEquals(GoogleOAuthService.ESTADO_REGISTRO, pendiente.estado());
        assertEquals(CORREO, pendiente.perfil().email());
        assertEquals(null, pendiente.auth());
        verify(usuarios, never()).saveAndFlush(any());

        when(registros.findByTokenHash(tokens.hash("token-registro")))
                .thenReturn(Optional.of(registroPendiente(11L)));
        when(registros.consumir(anyString(), any(LocalDateTime.class))).thenReturn(1);
        when(usuarios.existsByCorreo(CORREO)).thenReturn(false);
        when(usuarios.existsByNombreUsuario("maria.google")).thenReturn(false);
        when(identidades.existsByProveedorAndSubject(GoogleOAuthService.PROVEEDOR, SUB)).thenReturn(false);
        when(catalogo.validarRegion("MX", "Jalisco")).thenReturn("Jalisco");
        when(usuarios.saveAndFlush(any(Usuario.class))).thenAnswer(invocacion -> {
            Usuario usuario = invocacion.getArgument(0);
            usuario.setIdUsuario(99L);
            return usuario;
        });

        AuthResponseDTO auth = service.completarRegistro(
                new GoogleTokenRequestDTO("token-registro"), datosRegistro());

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarios).saveAndFlush(captor.capture());
        Usuario creado = captor.getValue();
        assertEquals("USUARIO", creado.getRol().getNombre());
        assertEquals(Boolean.FALSE, creado.getAccesoLocalValido());
        assertEquals(CORREO, creado.getCorreo());
        assertTrue(creado.getContrasena().startsWith("$2"));
        assertFalse(encoder.matches("password", creado.getContrasena()));
        assertFalse(encoder.matches("token-registro", creado.getContrasena()));

        ArgumentCaptor<IdentidadOAuth> identidad = ArgumentCaptor.forClass(IdentidadOAuth.class);
        verify(identidades).saveAndFlush(identidad.capture());
        assertEquals(99L, identidad.getValue().getIdUsuario());
        assertEquals(SUB, identidad.getValue().getSubject());
        assertEquals("jwt-de-prueba", auth.token());
    }

    @Test
    void segundoIngresoConElMismoSubRenuevaElPendienteEInvalidaElTokenAnterior() {
        when(identidades.findByProveedorAndSubject(GoogleOAuthService.PROVEEDOR, SUB)).thenReturn(Optional.empty());
        when(usuarios.findByCorreo(CORREO)).thenReturn(Optional.empty());
        doReturn("token-nuevo", "codigo-segundo").when(tokens).generar();
        when(registros.guardarORenovar(anyString(), eq(SUB), eq(CORREO), eq("María"),
                nullable(String.class), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(2);
        when(registros.findBySubject(SUB)).thenReturn(Optional.of(registroPendiente(11L)));

        String url = service.procesarIdentidad(SUB, CORREO, "María", null, true, "login", null);

        OAuthCodigoIntercambio code = unicoCodigo();
        assertEquals(GoogleOAuthService.ESTADO_REGISTRO, code.getEstado());
        assertEquals(11L, code.getIdRegistro());
        assertTrue(url.contains("code=codigo-segundo"), url);

        ArgumentCaptor<String> hash = ArgumentCaptor.forClass(String.class);
        verify(registros).guardarORenovar(hash.capture(), eq(SUB), eq(CORREO), eq("María"),
                nullable(String.class), any(LocalDateTime.class), any(LocalDateTime.class));
        assertEquals(tokens.hash("token-nuevo"), hash.getValue());
        assertNotEquals("hash-inicial", hash.getValue());
        verify(registros, never()).saveAndFlush(any(OAuthRegistroPendiente.class));
        verify(registros, never()).delete(any(OAuthRegistroPendiente.class));
    }

    @Test
    void intentosConcurrentesConElMismoSubCompartenUnaSolaFilaPendiente() {
        when(identidades.findByProveedorAndSubject(GoogleOAuthService.PROVEEDOR, SUB)).thenReturn(Optional.empty());
        when(usuarios.findByCorreo(CORREO)).thenReturn(Optional.empty());
        doReturn("token-a", "codigo-a", "token-b", "codigo-b").when(tokens).generar();
        when(registros.guardarORenovar(anyString(), eq(SUB), eq(CORREO), eq("María"),
                nullable(String.class), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(1, 2);
        when(registros.findBySubject(SUB)).thenReturn(Optional.of(registroPendiente(11L)));

        service.procesarIdentidad(SUB, CORREO, "María", null, true, "login", null);
        service.procesarIdentidad(SUB, CORREO, "María", null, true, "login", null);

        ArgumentCaptor<OAuthCodigoIntercambio> captor = ArgumentCaptor.forClass(OAuthCodigoIntercambio.class);
        verify(codigos, times(2)).saveAndFlush(captor.capture());
        assertEquals(11L, captor.getAllValues().get(0).getIdRegistro());
        assertEquals(11L, captor.getAllValues().get(1).getIdRegistro());
        verify(registros, times(2)).guardarORenovar(anyString(), eq(SUB), eq(CORREO), eq("María"),
                nullable(String.class), any(LocalDateTime.class), any(LocalDateTime.class));
        verify(registros, never()).saveAndFlush(any(OAuthRegistroPendiente.class));
        verify(registros, never()).delete(any(OAuthRegistroPendiente.class));
    }

    @Test
    void vinculacionRechazaUnSubjectYaAsociadoAOtraCuenta() {
        doReturn("link-token").when(tokens).generar();
        when(vinculaciones.findByTokenHash(tokens.hash("link-token")))
                .thenReturn(Optional.of(vinculacionPendiente(3L, "maria")));
        solicitanteNormal();
        when(identidades.existsByProveedorAndSubject(GoogleOAuthService.PROVEEDOR, SUB)).thenReturn(true);

        String url = service.procesarIdentidad(SUB, CORREO, "María", null, true,
                "vinculacion", "link-token");

        OAuthCodigoIntercambio code = unicoCodigo();
        assertEquals(GoogleOAuthService.ESTADO_ERROR, code.getEstado());
        assertEquals("GOOGLE_YA_VINCULADO", code.getCodigoError());
        assertTrue(url.contains("code="));
        verify(vinculaciones, never()).fijarSubject(anyString(), anyString(), any(LocalDateTime.class));
    }

    @Test
    void vinculacionExigeTokenValidoYSuUsuarioSigueSiendoElegible() {
        solicitanteNormal();
        doReturn("link-token").when(tokens).generar();
        when(vinculaciones.findByTokenHash(tokens.hash("link-token")))
                .thenReturn(Optional.of(vinculacionPendiente(3L, "maria")));
        when(identidades.existsByProveedorAndSubject(GoogleOAuthService.PROVEEDOR, SUB)).thenReturn(false);
        when(vinculaciones.fijarSubject(anyString(), anyString(), any(LocalDateTime.class))).thenReturn(1);
        when(vinculaciones.consumir(anyString(), any(LocalDateTime.class))).thenReturn(1);

        String url = service.procesarIdentidad(SUB, CORREO, "María", null, true,
                "vinculacion", "link-token");

        OAuthCodigoIntercambio code = unicoCodigo();
        assertEquals(GoogleOAuthService.ESTADO_LOGIN, code.getEstado());
        assertEquals("vinculacion", code.getOrigen());
        assertEquals(3L, code.getIdUsuario());
        assertTrue(url.contains("code="));

        when(usuarios.findById(3L)).thenReturn(Optional.of(usuario(3L, "maria", "USUARIO", true)));
        when(codigos.findByCodigoHash(anyString())).thenReturn(Optional.of(code));
        when(codigos.consumir(anyString(), any(LocalDateTime.class))).thenReturn(1);
        GoogleExchangeResponseDTO respuesta = service.intercambiar(codigoDe(url));
        assertEquals(GoogleOAuthService.ESTADO_LOGIN, respuesta.estado());
        assertEquals("vinculacion", respuesta.origen());
        assertNotNull(respuesta.auth());
    }

    @Test
    void vinculacionRechazaUnTokenInvalido() {
        String url = service.procesarIdentidad(SUB, CORREO, "María", null, true,
                "vinculacion", "token con espacios");

        assertEquals("VINCULACION_INVALIDA", unicoCodigo().getCodigoError());
        assertTrue(url.contains("code="));
        verify(vinculaciones, never()).findByTokenHash(anyString());
    }

    @Test
    void iniciarVinculacionGeneraUnTokenCortoLigadoAlUsuarioAutenticado() {
        when(usuarios.findById(7L)).thenReturn(Optional.of(usuario(7L, "maria", "USUARIO", true)));
        when(identidades.existsByProveedorAndIdUsuario(GoogleOAuthService.PROVEEDOR, 7L)).thenReturn(false);
        doReturn("link-token").when(tokens).generar();

        GoogleLinkStartResponseDTO respuesta = service.iniciarVinculacion(principal(7L, CORREO));

        assertTrue(respuesta.authorizationUrl().contains("intent=vinculacion"));
        assertTrue(respuesta.authorizationUrl().contains("linkToken=link-token"));
        assertNotNull(respuesta.expiraEn());
        ArgumentCaptor<OAuthVinculacionPendiente> captor =
                ArgumentCaptor.forClass(OAuthVinculacionPendiente.class);
        verify(vinculaciones).saveAndFlush(captor.capture());
        assertEquals(7L, captor.getValue().getIdUsuario());
        assertEquals(tokens.hash("link-token"), captor.getValue().getTokenHash());
    }

    @Test
    void noSePuedeVincularNiDesvincularUnaCuentaAdministrativaODEvaluacion() {
        Usuario admin = usuario(4L, "demo.marina.vega", "ADMINISTRADOR", true);
        when(usuarios.findById(4L)).thenReturn(Optional.of(admin));
        InsectopiaUserDetails principal = principal(4L, CORREO);

        assertThrows(BusinessRuleException.class, () -> service.iniciarVinculacion(principal));
        assertThrows(BusinessRuleException.class, () -> service.desvincular(principal));
        verify(vinculaciones, never()).saveAndFlush(any());
        verify(identidades, never()).deleteByIdUsuarioAndProveedor(anyLong(), anyString());

        doReturn("link-token").when(tokens).generar();
        when(vinculaciones.findByTokenHash(tokens.hash("link-token")))
                .thenReturn(Optional.of(vinculacionPendiente(4L, "demo.marina.vega")));
        service.procesarIdentidad(SUB, CORREO, "María", null, true, "vinculacion", "link-token");
        assertEquals("VINCULACION_INVALIDA", unicoCodigo().getCodigoError());
    }

    @Test
    void desvincularNoDejaUnaCuentaSinMetodoDeAccesoValido() {
        Usuario googleOnly = usuario(5L, "maria.google", "USUARIO", false);
        when(usuarios.findById(5L)).thenReturn(Optional.of(googleOnly));
        when(identidades.countByIdUsuario(5L)).thenReturn(1L);

        BusinessRuleException error = assertThrows(BusinessRuleException.class,
                () -> service.desvincular(principal(5L, CORREO)));
        assertTrue(error.getMessage().contains("único método de acceso"));
        verify(identidades, never()).deleteByIdUsuarioAndProveedor(anyLong(), anyString());

        Usuario conPassword = usuario(6L, "maria.local", "USUARIO", true);
        when(usuarios.findById(6L)).thenReturn(Optional.of(conPassword));
        when(identidades.countByIdUsuario(6L)).thenReturn(1L);
        service.desvincular(principal(6L, CORREO));
        verify(identidades).deleteByIdUsuarioAndProveedor(6L, GoogleOAuthService.PROVEEDOR);
    }

    @Test
    void cancelarRegistroConsumeElTokenParaQueNoSeReutilice() {
        OAuthRegistroPendiente pendiente = registroPendiente(11L);
        when(registros.findByTokenHash(tokens.hash("token-registro"))).thenReturn(Optional.of(pendiente));
        when(registros.consumir(anyString(), any(LocalDateTime.class))).thenReturn(1);

        service.cancelarRegistro(new GoogleTokenRequestDTO("token-registro"));

        assertNotNull(pendiente.getFechaUso());
        verify(registros).saveAndFlush(pendiente);
    }

    private void solicitanteNormal() {
        when(usuarios.findById(3L)).thenReturn(Optional.of(usuario(3L, "maria", "USUARIO", true)));
    }

    private static GoogleRegisterRequestDTO datosRegistro() {
        return new GoogleRegisterRequestDTO("María", "maria.google", LocalDate.of(2000, 1, 4),
                "Femenino", "MX", "Jalisco", "+521234567890", false, false, true);
    }

    private static OAuthRegistroPendiente registroPendiente(long id) {
        OAuthRegistroPendiente pendiente = new OAuthRegistroPendiente();
        ReflectionTestUtils.setField(pendiente, "idRegistro", id);
        pendiente.setTokenHash("hash-inicial");
        pendiente.setSubject(SUB);
        pendiente.setCorreo(CORREO);
        pendiente.setNombre("María");
        pendiente.setFechaCreacion(LocalDateTime.now(ZoneOffset.UTC));
        pendiente.setFechaExpiracion(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(15));
        return pendiente;
    }

    private static OAuthVinculacionPendiente vinculacionPendiente(long id, String nombreUsuario) {
        OAuthVinculacionPendiente pendiente = new OAuthVinculacionPendiente();
        ReflectionTestUtils.setField(pendiente, "idVinculacion", id);
        pendiente.setIdUsuario(id);
        pendiente.setTokenHash("hash-inicial");
        pendiente.setFechaCreacion(LocalDateTime.now(ZoneOffset.UTC));
        pendiente.setFechaExpiracion(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(5));
        assertNotNull(nombreUsuario);
        return pendiente;
    }

    private static Usuario usuario(long id, String nombreUsuario, String rol, boolean accesoLocalValido) {
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(id);
        usuario.setNombre("María");
        usuario.setNombreUsuario(nombreUsuario);
        usuario.setCorreo(CORREO);
        usuario.setContrasena("$2a$10$hash-de-prueba-no-valido-para-login");
        usuario.setFechaNacimiento(LocalDate.of(2000, 1, 1));
        usuario.setPaisCodigo("MX");
        usuario.setEstadoRegion("Jalisco");
        usuario.setRol(rol(rol));
        usuario.setAccesoLocalValido(accesoLocalValido);
        usuario.setEstado(EstadoUsuario.ACTIVO);
        return usuario;
    }

    private static Rol rol(String nombre) {
        Rol rol = new Rol();
        rol.setNombre(nombre);
        return rol;
    }

    private static InsectopiaUserDetails principal(long id, String correo) {
        return new InsectopiaUserDetails(id, correo, "hash", "USUARIO", 0, List.of());
    }

    private OAuthCodigoIntercambio unicoCodigo() {
        ArgumentCaptor<OAuthCodigoIntercambio> captor = ArgumentCaptor.forClass(OAuthCodigoIntercambio.class);
        verify(codigos, atLeastOnce()).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private static String estadoDe(String url) {
        String query = java.net.URI.create(url).getQuery();
        return Arrays.stream(query.split("&"))
                .filter(parametro -> parametro.startsWith("codigo=") || parametro.startsWith("code="))
                .map(parametro -> parametro.substring(parametro.indexOf('=') + 1))
                .findFirst()
                .orElseThrow();
    }

    private static String codigoDe(String url) {
        String query = java.net.URI.create(url).getQuery();
        return Arrays.stream(query.split("&"))
                .filter(parametro -> parametro.startsWith("code="))
                .map(parametro -> parametro.substring("code=".length()))
                .findFirst()
                .orElseThrow();
    }
}
