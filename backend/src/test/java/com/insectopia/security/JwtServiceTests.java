package com.insectopia.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

class JwtServiceTests {

	private static final Instant NOW = Instant.parse("2026-11-18T12:00:00Z");
	private String secret;
	private JwtService service;
	private Usuario user;

	@BeforeEach
	void setUp() {
		byte[] key = new byte[32];
		new SecureRandom().nextBytes(key);
		secret = Base64.getEncoder().encodeToString(key);
		service = new JwtService(secret, 60_000, Clock.fixed(NOW, ZoneOffset.UTC));
		user = new Usuario();
		user.setIdUsuario(42L);
		user.setVersionToken(3);
		user.setEstado(EstadoUsuario.ACTIVO);
		Rol role = new Rol();
		role.setNombre("USUARIO");
		user.setRol(role);
	}

	@Test
	void emiteClaimsFirmadosConIdentidadJtiRolVersionYFechas() {
		String token = service.issue(user);
		var parsed = Jwts.parser().verifyWith(Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret)))
				.clock(() -> Date.from(NOW)).build().parseSignedClaims(token).getPayload();
		assertEquals("42", parsed.getSubject());
		assertEquals("USUARIO", parsed.get("role", String.class));
		assertEquals(3, parsed.get("version", Integer.class));
		assertEquals(Date.from(NOW), parsed.getIssuedAt());
		assertEquals(Date.from(NOW.plusSeconds(60)), parsed.getExpiration());
		assertEquals(UUID.fromString(parsed.getId()).toString(), parsed.getId());
		assertEquals(36, parsed.getId().length());
		assertEquals(42L, service.validate(token).userId());
		assertNotEquals(token, service.issue(user));
	}

	@Test
	void rechazaFirmaAjenaYTokenManipulado() {
		String token = service.issue(user);
		byte[] other = new byte[32];
		new SecureRandom().nextBytes(other);
		JwtService otherService = new JwtService(Base64.getEncoder().encodeToString(other), 60_000,
				Clock.fixed(NOW, ZoneOffset.UTC));
		assertThrows(JwtException.class, () -> otherService.validate(token));
		String tampered = token.substring(0, token.lastIndexOf('.') + 1)
				+ (token.charAt(token.lastIndexOf('.') + 1) == 'A' ? 'B' : 'A')
				+ token.substring(token.lastIndexOf('.') + 2);
		assertThrows(JwtException.class, () -> service.validate(tampered));
	}

	@Test
	void rechazaVencidoMalformadoYSinClaimsRequeridos() {
		String token = service.issue(user);
		JwtService later = new JwtService(secret, 60_000, Clock.fixed(NOW.plusSeconds(61), ZoneOffset.UTC));
		assertThrows(JwtException.class, () -> later.validate(token));
		assertThrows(JwtException.class, () -> service.validate("abc.def.ghi"));
		assertThrows(RuntimeException.class, () -> service.validate(""));
		String missingJti = Jwts.builder().subject("42").issuedAt(Date.from(NOW))
				.expiration(Date.from(NOW.plusSeconds(60))).claim("role", "USUARIO")
				.claim("version", 3)
				.signWith(Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret)), Jwts.SIG.HS256).compact();
		assertThrows(IllegalArgumentException.class, () -> service.validate(missingJti));
	}

	@Test
	void rechazaClaveDebilConfiguracionInvalidaYUsuarioInactivo() {
		assertThrows(IllegalStateException.class, () -> new JwtService(
				Base64.getEncoder().encodeToString(new byte[16]), 60_000));
		assertThrows(IllegalStateException.class, () -> new JwtService("mal-formado", 60_000));
		assertThrows(IllegalStateException.class, () -> new JwtService(secret, 0));
		user.setEstado(EstadoUsuario.BLOQUEADO);
		assertThrows(IllegalArgumentException.class, () -> service.issue(user));
	}
}
