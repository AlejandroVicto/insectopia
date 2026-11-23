package com.insectopia.services;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.dtos.MiPerfilResponseDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.dtos.publicaciones.PublicacionResponseDTO;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Usuario;
import com.insectopia.repository.SeguidorRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;

/** Actividad 074: perfil privado y publicaciones propias del usuario autenticado. */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarios;
    private final SeguidorRepository seguidores;
    private final PublicacionesService publicaciones;

    public UsuarioService(
            UsuarioRepository usuarios,
            SeguidorRepository seguidores,
            PublicacionesService publicaciones) {
        this.usuarios = usuarios;
        this.seguidores = seguidores;
        this.publicaciones = publicaciones;
    }

    @Transactional(readOnly = true)
    public MiPerfilResponseDTO miPerfil(InsectopiaUserDetails principal) {
        Long idUsuario = idAutenticado(principal);
        Usuario usuario = usuarios.findById(idUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("usuario", idUsuario));
        return MiPerfilResponseDTO.from(
                usuario,
                seguidores.countBySeguido_IdUsuario(idUsuario),
                seguidores.countBySeguidor_IdUsuario(idUsuario),
                publicaciones.contarPropiasVisibles(idUsuario));
    }

    @Transactional(readOnly = true)
    public PaginaDTO<PublicacionResponseDTO> publicacionesPropias(
            int page, int size, InsectopiaUserDetails principal) {
        Long idUsuario = idAutenticado(principal);
        if (!usuarios.existsById(idUsuario)) {
            throw new ResourceNotFoundException("usuario", idUsuario);
        }
        return PaginaDTO.from(publicaciones.listarPropias(page, size, principal));
    }

    private Long idAutenticado(InsectopiaUserDetails principal) {
        if (principal == null || principal.idUsuario() == null) {
            throw new AuthenticationCredentialsNotFoundException("Autenticación requerida");
        }
        return principal.idUsuario();
    }
}
