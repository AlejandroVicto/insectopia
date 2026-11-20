package com.insectopia.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.insectopia.controllers.HealthController;
import com.insectopia.repository.TokenRevocadoRepository;

import tools.jackson.databind.json.JsonMapper;

@WebMvcTest({HealthController.class, SecurityConfigTests.SecurityProbeController.class})
@Import({
		HealthController.class,
		SecurityConfig.class,
		JwtAuthenticationFilter.class,
		SecurityConfigTests.SecurityProbeController.class
})
class SecurityConfigTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JsonMapper jsonMapper;

	@MockitoBean
	private JwtService jwtService;

	@MockitoBean
	private CustomUserDetailsService users;

	@MockitoBean
	private TokenRevocadoRepository revoked;

	@Test
	void healthEsPublico() throws Exception {
		mockMvc.perform(get("/api/health"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("ok"));
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"/api/auth/login",
			"/api/auth/register",
			"/api/auth/forgot-password",
			"/api/auth/reset-password"
	})
	void soloPostDeAuthEsPublico(String ruta) throws Exception {
		// No hay controlador en producción: un 404 confirma que la petición pasó la seguridad.
		mockMvc.perform(post(ruta))
				.andExpect(status().isNotFound());

		mockMvc.perform(get(ruta))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401))
				.andExpect(jsonPath("$.details").isArray())
				.andExpect(jsonPath("$.details").isEmpty())
				.andExpect(jsonPath("$.path").value(ruta));
	}

	@ParameterizedTest
	@ValueSource(strings = {"/api/auth/logout", "/api/usuarios", "/api/publicaciones"})
	void rutasProtegidasDevuelven401SinAutenticar(String ruta) throws Exception {
		mockMvc.perform(get(ruta))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401))
				.andExpect(jsonPath("$.error").value("Unauthorized"))
				.andExpect(jsonPath("$.message").value("Autenticación requerida"))
				.andExpect(jsonPath("$.timestamp").isString())
				.andExpect(jsonPath("$.details").isArray())
				.andExpect(jsonPath("$.details").isEmpty())
				.andExpect(jsonPath("$.path").value(ruta));
	}

	@Test
	void accesoDenegadoDevuelve403Json() throws Exception {
		mockMvc.perform(get("/api/security-probe/admin")
						.with(user("usuario").roles("USER")))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403))
				.andExpect(jsonPath("$.error").value("Forbidden"))
				.andExpect(jsonPath("$.message").value("Acceso denegado"))
				.andExpect(jsonPath("$.timestamp").isString())
				.andExpect(jsonPath("$.details").isArray())
				.andExpect(jsonPath("$.details").isEmpty())
				.andExpect(jsonPath("$.path").value("/api/security-probe/admin"));
	}

	@Test
	void usuarioAutorizadoPuedeAccederAlRecursoProtegido() throws Exception {
		mockMvc.perform(get("/api/security-probe/admin")
						.with(user("admin").roles("ADMIN")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("ok"));
	}

	@Test
	void preflightConOrigenPermitidoDevuelveCors() throws Exception {
		mockMvc.perform(options("/api/health")
						.header(HttpHeaders.ORIGIN, "http://localhost:5173")
						.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
						.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization"))
				.andExpect(status().isOk())
				.andExpect(header().string(
						HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN,
						"http://localhost:5173"))
				.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS))
				.andExpect(header().string(
						HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
						containsString("Authorization")))
				.andExpect(header().string(
						HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS,
						containsString("GET")));
	}

	@Test
	void preflightConOrigenNoPermitidoSeRechaza() throws Exception {
		mockMvc.perform(options("/api/health")
						.header(HttpHeaders.ORIGIN, "https://origen-no-autorizado.example")
						.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
				.andExpect(status().isForbidden());
	}

	@Test
	void orConfigurableSoloAceptaOrigenesExplicitos() {
		SecurityConfig config = new SecurityConfig(jsonMapper,
				"http://localhost:5173, https://app.insectopia.test");

		UrlBasedCorsConfigurationSource source =
				(UrlBasedCorsConfigurationSource) config.corsConfigurationSource();
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/health");
		request.addHeader(HttpHeaders.ORIGIN, "https://app.insectopia.test");
		CorsConfiguration cors = source.getCorsConfiguration(request);

		assertNotNull(cors);
		assertEquals(
				List.of("http://localhost:5173", "https://app.insectopia.test"),
				cors.getAllowedOrigins());
		assertFalse(cors.getAllowedOrigins().contains("*"));

		assertThrows(
				IllegalStateException.class,
				() -> new SecurityConfig(jsonMapper, "*"));
		assertThrows(
				IllegalStateException.class,
				() -> new SecurityConfig(jsonMapper, "https://*.insectopia.test"));
	}

	@Test
	void passwordEncoderSigueSiendoBcrypt() {
		PasswordEncoder encoder = new SecurityConfig(jsonMapper, "http://localhost:5173").passwordEncoder();

		assertInstanceOf(BCryptPasswordEncoder.class, encoder);
		String hash = encoder.encode("Demo1234!");
		assertTrue(encoder.matches("Demo1234!", hash));
		assertTrue(!hash.equals("Demo1234!"));
	}

	@RestController
	@RequestMapping("/api/security-probe")
	static class SecurityProbeController {

		@GetMapping("/admin")
		@PreAuthorize("hasRole('ADMIN')")
		public Map<String, String> admin() {
			return Map.of("status", "ok");
		}
	}
}
