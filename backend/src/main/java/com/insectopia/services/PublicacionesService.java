package com.insectopia.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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
import com.insectopia.dtos.publicaciones.PublicacionUpdateRequestDTO;
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
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.ComentarioRepository;
import com.insectopia.repository.PublicacionRepository;
import com.insectopia.repository.ReaccionRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.http.MediaType;
import org.springframework.core.io.Resource;

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
    private static final Sort ORDEN_PROPIO = Sort.by(
            Sort.Order.desc("fechaPublicacion"), Sort.Order.desc("idPublicacion"));

    private final PublicacionRepository publicaciones;
    private final ComentarioRepository comentarios;
    private final ReaccionRepository reacciones;
    private final UsuarioRepository usuarios;
    private final AlmacenamientoImagenesService imagenes;
    private final NotificacionService notificaciones;

    public PublicacionesService(
            PublicacionRepository publicaciones,
            ComentarioRepository comentarios,
            ReaccionRepository reacciones,
            UsuarioRepository usuarios,
            AlmacenamientoImagenesService imagenes, NotificacionService notificaciones) {
        this.publicaciones = publicaciones;
        this.comentarios = comentarios;
        this.reacciones = reacciones;
        this.usuarios = usuarios;
        this.imagenes = imagenes;
        this.notificaciones = notificaciones;
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
            condiciones.add(builder.equal(root.get("usuario").get("estado"), EstadoUsuario.ACTIVO));
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

    /** Actividad 074: conteo visible propio, compartido con el DTO de perfil. */
    @Transactional(readOnly = true)
    public long contarPropiasVisibles(Long idUsuario) {
        return publicaciones.countByUsuario_IdUsuarioAndEstado(
                idUsuario, EstadoPublicacion.VISIBLE);
    }

    /**
     * Actividad 074: publicaciones propias visibles con paginación en base de datos.
     * Los totales y la reacción propia se resuelven en tres consultas agrupadas
     * para toda la página, no una consulta por publicación.
     */
    @Transactional(readOnly = true)
    public Page<PublicacionResponseDTO> listarPropias(
            int page, int size, InsectopiaUserDetails principal) {
        return listarVisiblesDe(principal.idUsuario(), page, size, principal);
    }

    /** Mismo filtro y agregaciones del perfil propio; el autor lo valida el servicio de usuarios. */
    @Transactional(readOnly = true)
    public Page<PublicacionResponseDTO> listarVisiblesDe(
            Long idAutor, int page, int size, InsectopiaUserDetails principal) {
        Pageable pagina = PageRequest.of(page, size, ORDEN_PROPIO);
        Page<Publicacion> propias = publicaciones.findPropiasVisibles(
                idAutor, EstadoPublicacion.VISIBLE, pagina);
        List<Long> ids = propias.getContent().stream()
                .map(Publicacion::getIdPublicacion)
                .toList();
        Map<Long, Long> totalesComentarios = ids.isEmpty()
                ? Map.of() : indiceConteos(comentarios.contarPorPublicaciones(ids));
        Map<Long, Long> totalesReacciones = ids.isEmpty()
                ? Map.of() : indiceConteos(reacciones.contarPorPublicaciones(ids));
        Map<Long, String> reaccionesPropias = ids.isEmpty()
                ? Map.of() : indiceTipos(reacciones.tiposDelUsuario(ids, principal.idUsuario()));

        return propias.map(publicacion -> PublicacionResponseDTO.from(
                publicacion,
                totalesComentarios.getOrDefault(publicacion.getIdPublicacion(), 0L),
                totalesReacciones.getOrDefault(publicacion.getIdPublicacion(), 0L),
                reaccionesPropias.get(publicacion.getIdPublicacion())));
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
        if (datos.imagen() != null) {
            throw new BusinessRuleException("Sube la imagen mediante el endpoint multipart de la publicación");
        }
        Usuario autor = usuario(principal);
        Publicacion publicacion = new Publicacion();
        publicacion.setUsuario(autor);
        publicacion.setContenido(contenido);
        publicacion.setEstado(EstadoPublicacion.VISIBLE);
        publicaciones.save(publicacion);
        // Una publicación recién creada no puede tener comentarios ni reacciones aún.
        return PublicacionResponseDTO.from(publicacion, 0, 0, null);
    }

    @Transactional
    public PublicacionResponseDTO editar(Long id, PublicacionUpdateRequestDTO datos, InsectopiaUserDetails principal) {
        Publicacion publicacion = editable(id, principal);
        if (datos != null && datos.imagen() != null) {
            throw new BusinessRuleException("Usa el endpoint multipart para modificar la imagen");
        }
        String contenido = datos == null ? null : datos.contenidoNormalizado();
        if (contenido == null || contenido.isBlank() || contenido.length() > CONTENIDO_MAX) {
            throw new BusinessRuleException("El contenido debe tener entre 1 y 5000 caracteres");
        }
        publicacion.setContenido(contenido);
        publicaciones.saveAndFlush(publicacion);
        return mapear(publicacion, principal);
    }

    @Transactional
    public void eliminar(Long id, InsectopiaUserDetails principal) {
        Publicacion publicacion = bloquear(id);
        autorizarEdicion(publicacion, principal);
        if (publicacion.getEstado() != EstadoPublicacion.ELIMINADA) {
            publicacion.setEstado(EstadoPublicacion.ELIMINADA);
            publicaciones.saveAndFlush(publicacion);
        }
    }

    @Transactional
    public PublicacionResponseDTO subirImagen(Long id, MultipartFile archivo, InsectopiaUserDetails principal) {
        Publicacion publicacion = editable(id, principal);
        String anterior = publicacion.getImagen();
        String nuevo = imagenes.guardar(archivo);
        try {
            publicacion.setImagen(nuevo);
            publicaciones.saveAndFlush(publicacion);
            sincronizarArchivos(nuevo, anterior);
            return mapear(publicacion, principal);
        } catch (RuntimeException exception) {
            imagenes.eliminar(nuevo);
            throw exception;
        }
    }

    @Transactional
    public void quitarImagen(Long id, InsectopiaUserDetails principal) {
        Publicacion publicacion = editable(id, principal);
        String anterior = publicacion.getImagen();
        if (anterior == null) return;
        publicacion.setImagen(null);
        publicaciones.saveAndFlush(publicacion);
        sincronizarArchivos(null, anterior);
    }

    @Transactional(readOnly = true)
    public ImagenPublicacion leerImagen(Long id) {
        Publicacion publicacion = existente(id);
        if (publicacion.getEstado() != EstadoPublicacion.VISIBLE || publicacion.getImagen() == null
                || publicacion.getUsuario().getEstado() != EstadoUsuario.ACTIVO) {
            throw new ResourceNotFoundException("imagen de la publicación", id);
        }
        return new ImagenPublicacion(imagenes.leer(publicacion.getImagen()),
                publicacion.getImagen().endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG);
    }

    public record ImagenPublicacion(Resource resource, MediaType tipo) { }

    private void sincronizarArchivos(String nuevo, String anterior) {
        // El filesystem no participa en la transacción JPA. El nuevo se compensa en rollback;
        // el anterior solo se elimina después del commit. Nunca se elimina una referencia vigente.
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Se requiere una transacción para gestionar fotografías");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED) {
                    if (anterior != null) imagenes.eliminar(anterior);
                } else if (nuevo != null) {
                    imagenes.eliminar(nuevo);
                }
            }
        });
    }

    private Publicacion editable(Long id, InsectopiaUserDetails principal) {
        Publicacion publicacion = bloquear(id);
        autorizarEdicion(publicacion, principal);
        if (publicacion.getEstado() == EstadoPublicacion.ELIMINADA) {
            throw new BusinessRuleException("La publicación está eliminada");
        }
        return publicacion;
    }

    private void autorizarEdicion(Publicacion publicacion, InsectopiaUserDetails principal) {
        if (principal == null || (!esAutor(publicacion, principal)
                && !("ADMINISTRADOR".equals(principal.role()) && principal.getAuthorities().stream()
                        .anyMatch(a -> Permissions.MODULO_ADMINISTRAR.equals(a.getAuthority()))))) {
            throw new AccessDeniedException("No tienes permiso para modificar esta publicación");
        }
    }

    private Publicacion existente(Long id) {
        return publicaciones.findById(id).orElseThrow(() -> new ResourceNotFoundException("publicación", id));
    }

    private Publicacion bloquear(Long id) {
        return publicaciones.bloquearParaEscritura(id)
                .orElseThrow(() -> new ResourceNotFoundException("publicación", id));
    }

    @Transactional(readOnly = true)
    public Page<ComentarioResponseDTO> listarComentarios(
            Long idPublicacion, int page, int size, InsectopiaUserDetails principal) {
        publicacionAccesible(idPublicacion, principal);
        Pageable pagina = PageRequest.of(page, size);
        return comentarios
                .findByPublicacion_IdPublicacionAndUsuario_EstadoOrderByFechaComentarioAsc(
                        idPublicacion, EstadoUsuario.ACTIVO, pagina)
                .map(ComentarioResponseDTO::from);
    }

    @Transactional
    public ComentarioResponseDTO crearComentario(
            Long idPublicacion,
            ComentarioCreateRequestDTO datos,
            InsectopiaUserDetails principal) {
        Publicacion publicacion = publicacionAccesible(idPublicacion, principal);
        if (publicacion.getEstado() != EstadoPublicacion.VISIBLE) {
            throw new BusinessRuleException("La publicación no admite nuevas interacciones");
        }
        String contenido = datos == null ? null : datos.contenidoNormalizado();
        if (contenido == null || contenido.isBlank()) {
            throw new BusinessRuleException("El contenido del comentario es obligatorio");
        }
        if (contenido.length() > COMENTARIO_MAX) {
            throw new BusinessRuleException("El comentario no puede superar los 1000 caracteres");
        }
        Comentario comentario = new Comentario();
        comentario.setPublicacion(publicacion);
        Usuario actor = usuario(principal);
        comentario.setUsuario(actor);
        comentario.setContenido(contenido);
        comentarios.save(comentario);
        notificaciones.porComentario(publicacion, actor);
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
        if (publicacion.getEstado() != EstadoPublicacion.VISIBLE) {
            throw new BusinessRuleException("La publicación no admite nuevas interacciones");
        }
        if (reacciones.existsByPublicacion_IdPublicacionAndUsuario_IdUsuario(
                publicacion.getIdPublicacion(), principal.idUsuario())) {
            throw new DuplicateResourceException("publicacionId", "Ya reaccionaste a esta publicación");
        }
        Reaccion reaccion = new Reaccion();
        reaccion.setPublicacion(publicacion);
        Usuario actor = usuario(principal);
        reaccion.setUsuario(actor);
        reaccion.setTipo(TIPO_REACCION);
        try {
            reacciones.saveAndFlush(reaccion);
        } catch (DataIntegrityViolationException exception) {
            // La unicidad de la base manda si dos peticiones llegan a la vez.
            throw new DuplicateResourceException("publicacionId", "Ya reaccionaste a esta publicación");
        }
        notificaciones.porReaccion(publicacion, actor);
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
        if (publicacion.getEstado() == EstadoPublicacion.ELIMINADA) {
            throw new ResourceNotFoundException("publicación", id);
        }
        if (publicacion.getUsuario().getEstado() != EstadoUsuario.ACTIVO && !esModerador(principal)) {
            throw new ResourceNotFoundException("publicación", id);
        }
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

    private static Map<Long, Long> indiceConteos(List<Object[]> filas) {
        Map<Long, Long> indice = new HashMap<>();
        for (Object[] fila : filas) {
            indice.put(((Number) fila[0]).longValue(), ((Number) fila[1]).longValue());
        }
        return indice;
    }

    private static Map<Long, String> indiceTipos(List<Object[]> filas) {
        Map<Long, String> indice = new HashMap<>();
        for (Object[] fila : filas) {
            indice.put(((Number) fila[0]).longValue(), (String) fila[1]);
        }
        return indice;
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
                comentarios.countByPublicacion_IdPublicacionAndUsuario_Estado(id, EstadoUsuario.ACTIVO),
                reacciones.countByPublicacion_IdPublicacionAndUsuario_Estado(id, EstadoUsuario.ACTIVO),
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
                reacciones.countByPublicacion_IdPublicacionAndUsuario_Estado(idPublicacion, EstadoUsuario.ACTIVO));
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
