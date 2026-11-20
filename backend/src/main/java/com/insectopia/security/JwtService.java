package com.insectopia.security;

import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

	private final SecretKey key;
	private final long expirationMillis;
	private final Clock clock;

	/** JWT_SECRET must be a Base64-encoded key with at least 256 bits of entropy. */
	@Autowired
	public JwtService(
			@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.expiration}") long expirationMillis) {
		this(secret, expirationMillis, Clock.systemUTC());
	}

	JwtService(String secret, long expirationMillis, Clock clock) {
		byte[] bytes;
		try {
			bytes = Base64.getDecoder().decode(secret);
		} catch (IllegalArgumentException | NullPointerException exception) {
			throw new IllegalStateException("JWT_SECRET debe ser una clave Base64 válida", exception);
		}
		if (bytes.length < 32 || expirationMillis <= 0) {
			throw new IllegalStateException("Clave JWT insuficiente o duración de token inválida");
		}
		this.key = Keys.hmacShaKeyFor(bytes);
		this.expirationMillis = expirationMillis;
		this.clock = clock;
	}

	public String issue(Usuario usuario) {
		if (usuario.getIdUsuario() == null || usuario.getIdUsuario() <= 0
				|| usuario.getEstado() != EstadoUsuario.ACTIVO
				|| usuario.getVersionToken() == null || usuario.getVersionToken() < 0
				|| usuario.getRol() == null) {
			throw new IllegalArgumentException("Usuario no elegible para un token");
		}
		String role = usuario.getRol().getNombre();
		Permissions.authoritiesFor(role); // Never issue an unknown role.
		Instant now = clock.instant();
		return Jwts.builder()
				.subject(usuario.getIdUsuario().toString())
				.id(UUID.randomUUID().toString())
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plusMillis(expirationMillis)))
				.claim("role", role)
				.claim("version", usuario.getVersionToken())
				.signWith(key, Jwts.SIG.HS256)
				.compact();
	}

	public TokenClaims validate(String token) {
		Claims claims = Jwts.parser()
				.verifyWith(key)
				.clock(() -> Date.from(clock.instant()))
				.build()
				.parseSignedClaims(token)
				.getPayload();
		try {
			long userId = Long.parseLong(claims.getSubject());
			String jti = claims.getId();
			String role = claims.get("role", String.class);
			Integer version = claims.get("version", Integer.class);
			if (userId <= 0 || jti == null || !UUID.fromString(jti).toString().equals(jti)
					|| claims.getIssuedAt() == null || claims.getExpiration() == null
					|| !claims.getExpiration().after(claims.getIssuedAt())
					|| claims.getIssuedAt().after(Date.from(clock.instant()))
					|| version == null || version < 0) {
				throw new IllegalArgumentException("Claims JWT inválidos");
			}
			Permissions.authoritiesFor(role);
			return new TokenClaims(userId, jti, role, version, claims.getExpiration().toInstant());
		} catch (IllegalArgumentException | JwtException exception) {
			throw new IllegalArgumentException("Claims JWT inválidos", exception);
		}
	}

	public record TokenClaims(long userId, String jti, String role, int version, Instant expiresAt) {
	}
}
