package com.insectopia.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.UsuarioRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

	private final UsuarioRepository usuarios;

	public CustomUserDetailsService(UsuarioRepository usuarios) {
		this.usuarios = usuarios;
	}

	@Override
	@Transactional(readOnly = true)
	public UserDetails loadUserByUsername(String correo) throws UsernameNotFoundException {
		return principal(usuarios.findByCorreo(correo).orElseThrow(this::notFound));
	}

	@Transactional(readOnly = true)
	public InsectopiaUserDetails loadById(long id) {
		return principal(usuarios.findById(id).orElseThrow(this::notFound));
	}

	private InsectopiaUserDetails principal(Usuario usuario) {
		if (usuario.getEstado() != EstadoUsuario.ACTIVO || usuario.getRol() == null
				|| usuario.getVersionToken() == null || usuario.getVersionToken() < 0) {
			throw notFound();
		}
		try {
			String role = usuario.getRol().getNombre();
			return new InsectopiaUserDetails(usuario.getIdUsuario(), usuario.getCorreo(),
					usuario.getContrasena(), role, usuario.getVersionToken(), Permissions.authoritiesFor(role));
		} catch (IllegalArgumentException exception) {
			throw notFound();
		}
	}

	private UsernameNotFoundException notFound() {
		return new UsernameNotFoundException("Usuario no disponible");
	}
}
