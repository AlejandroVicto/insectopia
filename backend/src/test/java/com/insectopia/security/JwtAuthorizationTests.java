package com.insectopia.security;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;
import java.util.Date;
import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import com.insectopia.controllers.HealthController;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.TokenRevocadoRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.repository.PublicacionRepository;

@WebMvcTest
@Import({SecurityConfig.class, JwtService.class, CustomUserDetailsService.class,
		JwtAuthenticationFilter.class, ResourceAccess.class, HealthController.class,
		JwtAuthorizationTests.ProbeController.class, JwtAuthorizationTests.Actions.class})
class JwtAuthorizationTests {

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
	@Autowired private JwtService jwt;
	@Autowired private CustomUserDetailsService detailsService;
	@MockitoBean private UsuarioRepository usuarios;
	@MockitoBean private TokenRevocadoRepository revocados;
	@MockitoBean private PublicacionRepository publicaciones;

	private Usuario user;
	private Rol role;

	@BeforeEach
	void setUp() {
		user = new Usuario();
		user.setIdUsuario(42L);
		user.setCorreo("persona@example.test");
		user.setNombreUsuario("persona");
		user.setFechaNacimiento(LocalDate.of(1990, 1, 1));
		user.setPaisCodigo("ES");
		user.setEstadoRegion("Madrid");
		user.setContrasena("hash");
		user.setEstado(EstadoUsuario.ACTIVO);
		user.setVersionToken(0);
		role = new Rol();
		role.setNombre("USUARIO");
		user.setRol(role);
		when(usuarios.findById(anyLong())).thenAnswer(invocation ->
				invocation.getArgument(0, Long.class).equals(42L) ? Optional.of(user) : Optional.empty());
	}

	private String token() {
		return jwt.issue(user);
	}

	private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder bearer(String path, String token) {
		return get(path).header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
	}

	@Test
	void publicasSinTokenYProtegidasSinToken() throws Exception {
		mvc.perform(get("/api/health")).andExpect(status().isOk());
		mvc.perform(get("/api/probe/read")).andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.details").isArray());
		mvc.perform(get("/api/probe/read").header(HttpHeaders.AUTHORIZATION, "Bearer "))
				.andExpect(status().isUnauthorized());
		mvc.perform(get("/api/probe/read").header(HttpHeaders.AUTHORIZATION, "Basic abc"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void tokenValidoConPermisoActualAccede() throws Exception {
		mvc.perform(bearer("/api/probe/read", token())).andExpect(status().isOk());
		mvc.perform(bearer("/api/probe/propose", token())).andExpect(status().isOk());
	}

	@Test
	void firmaInvalidaMalformacionYRevocacionDevuelven401Json() throws Exception {
		String valid = token();
		String bad = valid.substring(0, valid.lastIndexOf('.') + 1) + "INVALID";
		mvc.perform(bearer("/api/probe/read", bad)).andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401));
		mvc.perform(bearer("/api/probe/read", "malformed"))
				.andExpect(status().isUnauthorized());
		var claims = jwt.validate(valid);
		when(revocados.existsByJti(claims.jti())).thenReturn(true);
		mvc.perform(bearer("/api/probe/read", valid)).andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.details").isArray());
	}

	@Test
	void tokenVencidoYElevacionFirmadaSinRolRealDevuelven401() throws Exception {
		byte[] bytes = Base64.getDecoder().decode(SECRET);
		String expired = Jwts.builder().subject("42").id(java.util.UUID.randomUUID().toString())
				.issuedAt(Date.from(Instant.now().minusSeconds(120)))
				.expiration(Date.from(Instant.now().minusSeconds(60)))
				.claim("role", "USUARIO").claim("version", 0)
				.signWith(Keys.hmacShaKeyFor(bytes), Jwts.SIG.HS256).compact();
		mvc.perform(bearer("/api/probe/read", expired)).andExpect(status().isUnauthorized());
		String elevated = Jwts.builder().subject("42").id(java.util.UUID.randomUUID().toString())
				.issuedAt(Date.from(Instant.now()))
				.expiration(Date.from(Instant.now().plusSeconds(60)))
				.claim("role", "ADMINISTRADOR").claim("version", 0)
				.signWith(Keys.hmacShaKeyFor(bytes), Jwts.SIG.HS256).compact();
		mvc.perform(bearer("/api/probe/assign", elevated)).andExpect(status().isUnauthorized());
	}

	@Test
	void usuarioInexistenteBloqueadoODesactivadoEsRechazado() throws Exception {
		String valid = token();
		when(usuarios.findById(42L)).thenReturn(Optional.empty());
		mvc.perform(bearer("/api/probe/read", valid)).andExpect(status().isUnauthorized());
		when(usuarios.findById(42L)).thenReturn(Optional.of(user));
		user.setEstado(EstadoUsuario.BLOQUEADO);
		mvc.perform(bearer("/api/probe/read", valid)).andExpect(status().isUnauthorized());
		user.setEstado(EstadoUsuario.DESACTIVADO);
		mvc.perform(bearer("/api/probe/read", valid)).andExpect(status().isUnauthorized());
	}

	@Test
	void cambiosDeRolYVersionInvalidanElTokenAnterior() throws Exception {
		String valid = token();
		role.setNombre("MODERADOR");
		mvc.perform(bearer("/api/probe/read", valid)).andExpect(status().isUnauthorized());
		role.setNombre("USUARIO");
		user.setVersionToken(1);
		mvc.perform(bearer("/api/probe/read", valid)).andExpect(status().isUnauthorized());
	}

	@Test
	void rolesNoEscalanPrivilegios() throws Exception {
		mvc.perform(bearer("/api/probe/approve", token())).andExpect(status().isForbidden());
		mvc.perform(bearer("/api/probe/resolve", token())).andExpect(status().isForbidden());
		mvc.perform(bearer("/api/probe/assign", token())).andExpect(status().isForbidden());
		role.setNombre("MODERADOR");
		mvc.perform(bearer("/api/probe/approve", token())).andExpect(status().isOk());
		mvc.perform(bearer("/api/probe/resolve", token())).andExpect(status().isOk());
		mvc.perform(bearer("/api/probe/assign", token())).andExpect(status().isForbidden());
		role.setNombre("ADMINISTRADOR");
		mvc.perform(bearer("/api/probe/assign", token())).andExpect(status().isOk());
	}

	@Test
	void soloPropietarioPuedeAccederASuRecurso() throws Exception {
		String valid = token();
		when(publicaciones.existsByIdPublicacionAndUsuario_IdUsuario(7L, 42L)).thenReturn(true);
		mvc.perform(bearer("/api/probe/publication/7", valid)).andExpect(status().isOk());
		mvc.perform(bearer("/api/probe/publication/8", valid)).andExpect(status().isForbidden());
	}

	@Test
	void cargaPorCorreoUsaRolRealYRechazaEstadoNoActivo() {
		when(usuarios.findByCorreo("persona@example.test")).thenReturn(Optional.of(user));
		var details = detailsService.loadUserByUsername("persona@example.test");
		org.junit.jupiter.api.Assertions.assertTrue(details.getAuthorities().stream()
				.anyMatch(authority -> authority.getAuthority().equals("ROLE_USUARIO")));
		user.setEstado(EstadoUsuario.BLOQUEADO);
		org.junit.jupiter.api.Assertions.assertThrows(
				org.springframework.security.core.userdetails.UsernameNotFoundException.class,
				() -> detailsService.loadUserByUsername("persona@example.test"));
	}

	@Service
	static class Actions {
		@PreAuthorize("hasAuthority('CONTENIDO_LEER')")
		public String read() { return "ok"; }

		@PreAuthorize("hasAuthority('EVENTO_PROPONER')")
		public String propose() { return "ok"; }

		@PreAuthorize("hasAuthority('EVENTO_RESOLVER')")
		public String approve() { return "ok"; }

		@PreAuthorize("hasAuthority('REPORTE_RESOLVER')")
		public String resolve() { return "ok"; }

		@PreAuthorize("hasAuthority('ROL_ASIGNAR')")
		public String assign() { return "ok"; }

		@PreAuthorize("hasAuthority('CONTENIDO_LEER') and @resourceAccess.ownsPublication(authentication, #publicationId)")
		public String publication(Long publicationId) { return "ok"; }
	}

	@RestController
	@RequestMapping("/api/probe")
	static class ProbeController {
		private final Actions actions;
		ProbeController(Actions actions) { this.actions = actions; }
		@GetMapping("/read") String read() { return actions.read(); }
		@GetMapping("/propose") String propose() { return actions.propose(); }
		@GetMapping("/approve") String approve() { return actions.approve(); }
		@GetMapping("/resolve") String resolve() { return actions.resolve(); }
		@GetMapping("/assign") String assign() { return actions.assign(); }
		@GetMapping("/publication/{publicationId}") String publication(@PathVariable Long publicationId) {
			return actions.publication(publicationId);
		}
	}
}
