package com.insectopia.controllers;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.CatalogoNoDisponibleException;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.ResourceNotFoundException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

class GlobalExceptionHandlerTests {

	private MockMvc mockMvc;

	@BeforeEach
	void setUp() throws Exception {
		LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
		validator.afterPropertiesSet();

		this.mockMvc = MockMvcBuilders.standaloneSetup(new PruebasController())
				.setControllerAdvice(new GlobalExceptionHandler())
				.setValidator(validator)
				.build();
	}

	@Test
	void validacionBeanValidationDevuelve400ConDetallesSinValoresRechazados() throws Exception {
		mockMvc.perform(post("/pruebas/validacion")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"nombre\":\"\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.timestamp").exists())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.error").value("Bad Request"))
				.andExpect(jsonPath("$.message").value("Los datos enviados no son válidos"))
				.andExpect(jsonPath("$.path").value("/pruebas/validacion"))
				.andExpect(jsonPath("$.details[0].field").value("nombre"))
				.andExpect(jsonPath("$.details[0].message").value("El nombre es obligatorio"))
				.andExpect(content().string(not(containsString("rejectedValue"))));
	}

	@Test
	void jsonInvalidoDevuelve400SinDetallesInternos() throws Exception {
		mockMvc.perform(post("/pruebas/validacion")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"nombre\":"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message")
						.value("El cuerpo de la solicitud es inválido o no se pudo analizar"))
				.andExpect(jsonPath("$.details").isArray())
				.andExpect(jsonPath("$.details").isEmpty())
				.andExpect(content().string(not(containsString("HttpMessageNotReadableException"))))
				.andExpect(content().string(not(containsString("JsonParseException"))));
	}

	@Test
	void recursoNoEncontradoDevuelve404() throws Exception {
		mockMvc.perform(get("/pruebas/no-encontrado"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.error").value("Not Found"))
				.andExpect(jsonPath("$.message").value("Recurso no encontrado"))
				.andExpect(jsonPath("$.path").value("/pruebas/no-encontrado"));
	}

	@Test
	void proveedorNoDisponibleDevuelve503Controlado() throws Exception {
		mockMvc.perform(get("/pruebas/catalogo-no-disponible"))
				.andExpect(status().isServiceUnavailable())
				.andExpect(jsonPath("$.error").value("Service Unavailable"))
				.andExpect(jsonPath("$.message").value("El catálogo de ubicaciones no está disponible en este momento."))
				.andExpect(jsonPath("$.details").isEmpty());
	}

	@Test
	void recursoDuplicadoDevuelve409SinExponerDetalles() throws Exception {
		mockMvc.perform(get("/pruebas/duplicado"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.error").value("Conflict"))
				.andExpect(jsonPath("$.message").value("El recurso ya existe"))
				.andExpect(content().string(not(containsString("correo@ejemplo.invalid"))));
	}

	@Test
	void violacionDeIntegridadDeDatosDevuelve409SinSql() throws Exception {
		mockMvc.perform(get("/pruebas/integridad"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(content().string(not(containsString("Duplicate entry"))))
				.andExpect(content().string(not(containsString("INSERT INTO"))));
	}

	@Test
	void reglaDeNegocioDevuelve422ConMensajeSeguro() throws Exception {
		mockMvc.perform(get("/pruebas/regla-negocio"))
				.andExpect(status().is(422))
				.andExpect(jsonPath("$.status").value(422))
				.andExpect(jsonPath("$.error").value("Unprocessable Entity"))
				.andExpect(jsonPath("$.message")
						.value("No se puede publicar un evento que ya finalizó"));
	}

	@Test
	void errorInesperadoDevuelve500Generico() throws Exception {
		mockMvc.perform(get("/pruebas/error"))
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.status").value(500))
				.andExpect(jsonPath("$.error").value("Internal Server Error"))
				.andExpect(jsonPath("$.message").value("Error interno del servidor"))
				.andExpect(content().string(not(containsString("SECRETO_SQL"))))
				.andExpect(content().string(not(containsString("GlobalExceptionHandlerTests"))))
				.andExpect(content().string(not(containsString("at com.insectopia"))));
	}

	@Test
	void illegalArgumentInternoDevuelve500SinExponerMensaje() throws Exception {
		mockMvc.perform(get("/pruebas/argumento-interno"))
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.status").value(500))
				.andExpect(jsonPath("$.message").value("Error interno del servidor"))
				.andExpect(jsonPath("$.details").isArray())
				.andExpect(jsonPath("$.details").isEmpty())
				.andExpect(content().string(not(containsString("SECRETO_INTERNO"))));
	}

	/**
	 * Controlador exclusivo de pruebas: no se registra en la aplicación y no crea endpoints reales.
	 */
	@RestController
	static class PruebasController {

		@PostMapping("/pruebas/validacion")
		public String validar(@Valid @RequestBody SolicitudDTO solicitud) {
			return "ok";
		}

		@GetMapping("/pruebas/no-encontrado")
		public String noEncontrado() {
			throw new ResourceNotFoundException("Usuario", 99L);
		}

		@GetMapping("/pruebas/catalogo-no-disponible")
		public String catalogoNoDisponible() {
			throw new CatalogoNoDisponibleException();
		}

		@GetMapping("/pruebas/duplicado")
		public String duplicado() {
			throw new DuplicateResourceException("correo@ejemplo.invalid ya existe");
		}

		@GetMapping("/pruebas/integridad")
		public String integridad() {
			throw new DataIntegrityViolationException("Duplicate entry 'x' for key usuarios.correo");
		}

		@GetMapping("/pruebas/regla-negocio")
		public String reglaDeNegocio() {
			throw new BusinessRuleException("No se puede publicar un evento que ya finalizó");
		}

		@GetMapping("/pruebas/error")
		public String error() {
			throw new IllegalStateException("SECRETO_SQL");
		}

		@GetMapping("/pruebas/argumento-interno")
		public String argumentoInterno() {
			throw new IllegalArgumentException("SECRETO_INTERNO");
		}
	}

	public static class SolicitudDTO {

		@NotBlank(message = "El nombre es obligatorio")
		private String nombre;

		public String getNombre() {
			return nombre;
		}

		public void setNombre(String nombre) {
			this.nombre = nombre;
		}
	}
}
