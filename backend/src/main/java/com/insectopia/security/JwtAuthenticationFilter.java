package com.insectopia.security;

import java.io.IOException;
import java.util.Collections;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.insectopia.repository.TokenRevocadoRepository;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	private final JwtService jwtService;
	private final CustomUserDetailsService users;
	private final TokenRevocadoRepository revoked;
	private final AuthenticationEntryPoint entryPoint;

	public JwtAuthenticationFilter(JwtService jwtService, CustomUserDetailsService users,
			TokenRevocadoRepository revoked, AuthenticationEntryPoint entryPoint) {
		this.jwtService = jwtService;
		this.users = users;
		this.revoked = revoked;
		this.entryPoint = entryPoint;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		String path = request.getServletPath();
		if ("GET".equals(request.getMethod()) && "/api/health".equals(path)) {
			return true;
		}
		return "POST".equals(request.getMethod()) && ("/api/auth/login".equals(path)
				|| "/api/auth/register".equals(path)
				|| "/api/auth/forgot-password".equals(path)
				|| "/api/auth/reset-password".equals(path));
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
			FilterChain chain) throws ServletException, IOException {
		var headers = Collections.list(request.getHeaders(HttpHeaders.AUTHORIZATION));
		if (headers.isEmpty()) {
			chain.doFilter(request, response);
			return;
		}
		try {
			if (headers.size() != 1 || !headers.getFirst().regionMatches(true, 0, "Bearer ", 0, 7)
					|| headers.getFirst().length() <= 7
					|| !headers.getFirst().substring(7).equals(headers.getFirst().substring(7).trim())) {
				throw new BadCredentialsException("Credencial inválida");
			}
			JwtService.TokenClaims claims = jwtService.validate(headers.getFirst().substring(7));
			if (revoked.existsByJti(claims.jti())) {
				throw new BadCredentialsException("Credencial revocada");
			}
			InsectopiaUserDetails user = users.loadById(claims.userId());
			if (!user.role().equals(claims.role()) || user.versionToken() != claims.version()) {
				throw new BadCredentialsException("Credencial desactualizada");
			}
			var context = SecurityContextHolder.createEmptyContext();
			context.setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
			SecurityContextHolder.setContext(context);
		} catch (JwtException | IllegalArgumentException | org.springframework.security.core.AuthenticationException exception) {
			SecurityContextHolder.clearContext();
			entryPoint.commence(request, response, new BadCredentialsException("Credencial inválida"));
			return;
		}
		chain.doFilter(request, response);
	}
}
