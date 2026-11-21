package com.insectopia.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.dtos.publicaciones.ComentarioCreateRequestDTO;
import com.insectopia.dtos.publicaciones.ComentarioResponseDTO;
import com.insectopia.dtos.publicaciones.PublicacionCreateRequestDTO;
import com.insectopia.dtos.publicaciones.PublicacionResponseDTO;
import com.insectopia.dtos.publicaciones.ReaccionEstadoDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Comentario;
import com.insectopia.models.Publicacion;
import com.insectopia.models.Reaccion;
import com.insectopia.models.Seguidor;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoPublicacion;
import com.insectopia.repository.ComentarioRepository;
import com.insectopia.repository.PublicacionRepository;
import com.insectopia.repository.ReaccionRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;

import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

/** Reglas de negocio del inicio (059): publicaciones, comentarios y reacciones propias. */
@Service
public class PublicacionesService {

    public static final String FEED_PARA_TI = "para-ti";
    public static final String FEED_GLOBAL = "global";
    public static final String TIPO_REACCION = "ME_GUSTA";
    private static final int CONTENIDO_MAX = 5000;
    private static final int COMENTARIO_MAX = 1000;

    private final PublicacionRepository publicaciones;
    private final ComentarioRepository comentarios;
    private final ReaccionRepository reacciones;
    private final UsuarioRepository usuarios;

    public PublicacionesService(
            PublicacionRepository publicaciones,
            ComentarioRepository comentarios,
            ReaccionRepository reacciones,
            UsuarioRepository usuarios) {
        this.publicaciones = publicaciones;
        this.comentarios = comentarios;
        this.reacciones = reacciones;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public Page<PublicacionResponseDTO> listar(
            int page, int size, String feed, String q, InsectopiaUserDetails principal) {
        String vista = feed == null || feed.isBlank() ? FEED_PARA_TI : feed;
        if (!FEED_PARA_TI.equals(vista) && !FEED_GLOBAL.equals(vista)) {
            throw new BusinessRuleException("El feed debe ser 'para-ti' o 'global'");
        }
        String busqueda = normalizarBusqueda(q);
        Pageable pagina = PageRequest.of(page, size,
                Sort.by(Sort.Order.desc("fechaPublicacion"), Sort.Order.desc("idPublicacion")));

        Specification<Publicacion> filtros = (root, query, builder) -> {
            List<Predicate> condiciones = new ArrayList<>();
            condiciones.add(builder.equal(root.get("estado"), EstadoPublicacion.VISIBLE));
            if (busqueda != null) {
                condiciones.add(builder.like(
                        builder.lower(root.get("contenido")),
                        "%" + escaparLike(busqueda.toLowerCase(Locale.ROOT)) + "%",
                        '\\'));
            }
            if (FEED_PARA_TI.equals(vista)) {
                Subquery<Long> seguidos = query.subquery(Long.class);
                Root<Seguidor> relacion = seguidos.from(Seguidor.class);
                seguidos.select(relacion.get("seguido").get("idUsuario"));
                seguidos.where(builder.equal(
                        relacion.get("seguidor").get("idUsuario"), principal.idUsuario()));
                condiciones.add(builder.or(
                        builder.equal(root.get("usuario").get("idUsuario"), principal.idUsuario()),
                        root.get("usuario").get("idUsuario").in(seguidos)));
            }
            return builder.and(condiciones.toArray(Predicate[]::new));
        };

        return publicaciones.findAll(filtros, pagina)
                .map(publicacion -> mapear(publicacion, principal));
    }

    @Transactional(readOnly = true)
    public PublicacionResponseDTO obtener(Long id, InsectopiaUserDetails principal) {
        return mapear(publicacionAccesible(id, principal), principal);
    }

    @Transactional
    public PublicacionResponseDTO crear(
            PublicacionCreateRequestDTO datos, InsectopiaUserDetails principal) {
        String contenido = datos == null ? null : datos.contenidoNormalizado();
        if (contenido == null || contenido.isBlank()) {
            throw new BusinessRuleException("El contenido de la publicación es obligatorio");
        }
        if (contenido.length() > CONTENIDO_MAX) {
            throw new BusinessRuleException("El contenido no puede superar los 5000 caracteres");
        }
        Usuario autor = usuario(principal);
        Publicacion publicacion = new Publicacion();
        publicacion.setUsuario(autor);
        publicacion.setContenido(contenido);
        publicacion.setImagen(datos.imagenNormalizada());
        publicacion.setEstado(EstadoPublicacion.VISIBLE);
        publicaciones.save(publicacion);
        // Una publicación recién creada no puede tener comentarios ni reacciones aún.
        return PublicacionResponseDTO.from(publicacion, 0, 0, null);
    }

    @Transactional(readOnly = true)
    public Page<ComentarioResponseDTO> listarComentarios(
            Long idPublicacion, int page, int size, InsectopiaUserDetails principal) {
        publicacionAccesible(idPublicacion, principal);
        Pageable pagina = PageRequest.of(page, size);
        return comentarios
                .findByPublicacion_IdPublicacionOrderByFechaComentarioAsc(idPublicacion, pagina)
                .map(ComentarioResponseDTO::from);
    }

    @Transactional
    public ComentarioResponseDTO crearComentario(
            Long idPublicacion,
            ComentarioCreateRequestDTO datos,
            InsectopiaUserDetails principal) {
        Publicacion publicacion = publicacionAccesible(idPublicacion, principal);
        String contenido = datos == null ? null : datos.contenidoNormalizado();
        if (contenido == null || contenido.isBlank()) {
            throw new BusinessRuleException("El contenido del comentario es obligatorio");
        }
        if (contenido.length() > COMENTARIO_MAX) {
            throw new BusinessRuleException("El comentario no puede superar los 1000 caracteres");
        }
        Comentario comentario = new Comentario();
        comentario.setPublicacion(publicacion);
        comentario.setUsuario(usuario(principal));
        comentario.setContenido(contenido);
        comentarios.save(comentario);
        return ComentarioResponseDTO.from(comentario);
    }

    @Transactional(readOnly = true)
    public ReaccionEstadoDTO estadoReaccion(Long idPublicacion, InsectopiaUserDetails principal) {
        Publicacion publicacion = publicacionAccesible(idPublicacion, principal);
        return estado(publicacion.getIdPublicacion(), principal.idUsuario());
    }

    @Transactional
    public ReaccionEstadoDTO reaccionar(Long idPublicacion, InsectopiaUserDetails principal) {
        Publicacion publicacion = publicacionAccesible(idPublicacion, principal);
        if (reacciones.existsByPublicacion_IdPublicacionAndUsuario_IdUsuario(
                publicacion.getIdPublicacion(), principal.idUsuario())) {
            throw new DuplicateResourceException("publicacionId", "Ya reaccionaste a esta publicación");
        }
        Reaccion reaccion = new Reaccion();
        reaccion.setPublicacion(publicacion);
        reaccion.setUsuario(usuario(principal));
        reaccion.setTipo(TIPO_REACCION);
        try {
            reacciones.saveAndFlush(reaccion);
        } catch (DataIntegrityViolationException exception) {
            // La unicidad de la base manda si dos peticiones llegan a la vez.
            throw new DuplicateResourceException("publicacionId", "Ya reaccionaste a esta publicación");
        }
        return estado(publicacion.getIdPublicacion(), principal.idUsuario());
    }

    @Transactional
    public ReaccionEstadoDTO quitarReaccion(Long idPublicacion, InsectopiaUserDetails principal) {
        Publicacion publicacion = publicacionAccesible(idPublicacion, principal);
        Reaccion reaccion = reacciones
                .findByPublicacion_IdPublicacionAndUsuario_IdUsuario(
                        publicacion.getIdPublicacion(), principal.idUsuario())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "reacción de la publicación", idPublicacion));
        reacciones.delete(reaccion);
        return estado(publicacion.getIdPublicacion(), principal.idUsuario());
    }

    private Publicacion publicacionAccesible(Long id, InsectopiaUserDetails principal) {
        if (id == null) {
            throw new ResourceNotFoundException("publicación", id);
        }
        Publicacion publicacion = publicaciones.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("publicación", id));
        boolean visible = publicacion.getEstado() == EstadoPublicacion.VISIBLE;
        if (!visible && !esAutor(publicacion, principal) && !esModerador(principal)) {
            throw new AccessDeniedException("No tienes acceso a esta publicación");
        }
        return publicacion;
    }

    private boolean esAutor(Publicacion publicacion, InsectopiaUserDetails principal) {
        return publicacion.getUsuario() != null
                && publicacion.getUsuario().getIdUsuario() != null
                && publicacion.getUsuario().getIdUsuario().equals(principal.idUsuario());
    }

    private boolean esModerador(InsectopiaUserDetails principal) {
        return principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> "ROLE_MODERADOR".equals(authority)
                        || "ROLE_ADMINISTRADOR".equals(authority));
    }

    private Usuario usuario(InsectopiaUserDetails principal) {
        return usuarios.findById(principal.idUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("usuario", principal.idUsuario()));
    }

    private PublicacionResponseDTO mapear(
            Publicacion publicacion, InsectopiaUserDetails principal) {
        Long id = publicacion.getIdPublicacion();
        String tipoPropio = reacciones
                .findByPublicacion_IdPublicacionAndUsuario_IdUsuario(id, principal.idUsuario())
                .map(Reaccion::getTipo)
                .orElse(null);
        return PublicacionResponseDTO.from(
                publicacion,
                comentarios.countByPublicacion_IdPublicacion(id),
                reacciones.countByPublicacion_IdPublicacion(id),
                tipoPropio);
    }

    private ReaccionEstadoDTO estado(Long idPublicacion, Long idUsuario) {
        String tipoPropio = reacciones.findByPublicacion_IdPublicacionAndUsuario_IdUsuario(idPublicacion, idUsuario)
                .map(Reaccion::getTipo)
                .orElse(null);
        return new ReaccionEstadoDTO(
                idPublicacion,
                tipoPropio != null,
                tipoPropio,
                reacciones.countByPublicacion_IdPublicacion(idPublicacion));
    }

    private String normalizarBusqueda(String q) {
        if (q == null || q.isBlank()) {
            return null;
        }
        String texto = q.trim();
        return texto.length() > 100 ? texto.substring(0, 100) : texto;
    }

    private String escaparLike(String texto) {
        return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
