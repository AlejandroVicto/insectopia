package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.RETURNS_MOCKS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;

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
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoPublicacion;
import com.insectopia.repository.ComentarioRepository;
import com.insectopia.repository.PublicacionRepository;
import com.insectopia.repository.ReaccionRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

@ExtendWith(MockitoExtension.class)
class PublicacionesServiceTests {

    @Mock private PublicacionRepository publicaciones;
    @Mock private ComentarioRepository comentarios;
    @Mock private ReaccionRepository reacciones;
    @Mock private UsuarioRepository usuarios;
    @Mock private NotificacionService notificaciones;
    @InjectMocks private PublicacionesService service;

    private InsectopiaUserDetails principal;
    private Usuario autor;
    private Publicacion publicacion;

    @BeforeEach
    void setUp() {
        autor = usuario(7L, "USUARIO", "María", "maria");
        principal = new InsectopiaUserDetails(7L, "maria@example.test", "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
        publicacion = publicacion(24L, autor, EstadoPublicacion.VISIBLE,
                "Escarabajo metálico encontrado bajo hojas de encino.");
    }

    @Test
    void listaPaginaEnBaseDeDatosConOrdenEstableYDatosPublicos() {
        when(publicaciones.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(publicacion)));
        when(comentarios.countByPublicacion_IdPublicacion(24L)).thenReturn(2L);
        when(reacciones.countByPublicacion_IdPublicacion(24L)).thenReturn(5L);
        when(reacciones.findByPublicacion_IdPublicacionAndUsuario_IdUsuario(24L, 7L))
                .thenReturn(Optional.of(reaccion("ME_GUSTA")));

        Page<PublicacionResponseDTO> pagina = service.listar(0, 10, "global", null, principal);

        assertEquals(1, pagina.getTotalElements());
        PublicacionResponseDTO dto = pagina.getContent().getFirst();
        assertEquals(24L, dto.id());
        assertEquals(7L, dto.autor().id());
        assertEquals("maria", dto.autor().nombreUsuario());
        assertEquals(2L, dto.totalComentarios());
        assertEquals(5L, dto.totalReacciones());
        assertEquals("ME_GUSTA", dto.reaccionUsuario());
        assertNull(dto.autor().avatarUrl());

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(publicaciones).findAll(any(Specification.class), captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(10, captor.getValue().getPageSize());
        assertEquals("fechaPublicacion", captor.getValue().getSort().getOrderFor("fechaPublicacion").getProperty());
        assertEquals("idPublicacion", captor.getValue().getSort().getOrderFor("idPublicacion").getProperty());
    }

    @Test
    void rechazaFeedDesconocido() {
        assertThrows(BusinessRuleException.class,
                () -> service.listar(0, 10, "recientes", null, principal));
        verify(publicaciones, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    @Test
    void filtroGlobalBuscaContenidoConLikeEscapado() {
        ArgumentCaptor<Specification> captor = ArgumentCaptor.forClass(Specification.class);
        when(publicaciones.findAll(captor.capture(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service.listar(0, 10, "global", "  50%  ", principal);

        Root root = mock(Root.class, RETURNS_MOCKS);
        CriteriaQuery query = mock(CriteriaQuery.class, RETURNS_MOCKS);
        CriteriaBuilder builder = mock(CriteriaBuilder.class, RETURNS_MOCKS);
        ((Specification<Publicacion>) captor.getValue()).toPredicate(root, query, builder);

        verify(builder).like(any(Expression.class), eq("%50\\%%"), eq('\\'));
        verify(query, never()).subquery(Long.class);
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    @Test
    void filtroParaTiIncluyePropiasYSeguidasMedianteSubconsulta() {
        ArgumentCaptor<Specification> captor = ArgumentCaptor.forClass(Specification.class);
        when(publicaciones.findAll(captor.capture(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service.listar(0, 10, "para-ti", null, principal);

        Root root = mock(Root.class, RETURNS_MOCKS);
        CriteriaQuery query = mock(CriteriaQuery.class, RETURNS_MOCKS);
        CriteriaBuilder builder = mock(CriteriaBuilder.class, RETURNS_MOCKS);
        ((Specification<Publicacion>) captor.getValue()).toPredicate(root, query, builder);

        verify(query).subquery(Long.class);
        verify(builder).or(any(Predicate.class), any(Predicate.class));
    }

    @Test
    void consultaPublicacionVisibleYOcultaSegunAutorOModerador() {
        when(publicaciones.findById(24L)).thenReturn(Optional.of(publicacion));
        when(comentarios.countByPublicacion_IdPublicacion(24L)).thenReturn(0L);
        when(reacciones.countByPublicacion_IdPublicacion(24L)).thenReturn(0L);
        when(reacciones.findByPublicacion_IdPublicacionAndUsuario_IdUsuario(24L, 7L))
                .thenReturn(Optional.empty());

        InsectopiaUserDetails otro = new InsectopiaUserDetails(9L, "otro@example.test", "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));

        publicacion.setEstado(EstadoPublicacion.OCULTA);
        assertEquals(24L, service.obtener(24L, principal).id()); // el autor sí puede verla
        assertThrows(AccessDeniedException.class, () -> service.obtener(24L, otro));

        InsectopiaUserDetails moderador = new InsectopiaUserDetails(9L, "mod@example.test", "hash", "MODERADOR", 0,
                Permissions.authoritiesFor("MODERADOR"));
        assertEquals(24L, service.obtener(24L, moderador).id());
    }

    @Test
    void recursoInexistenteDaNotFound() {
        when(publicaciones.findById(-1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.obtener(-1L, principal));
    }

    @Test
    void creaPublicacionConAutorDelPrincipalYContenidoNormalizado() {
        when(usuarios.findById(7L)).thenReturn(Optional.of(autor));

        PublicacionResponseDTO creada = service.crear(
                new PublicacionCreateRequestDTO("  Observación de campo  ", null),
                principal);

        ArgumentCaptor<Publicacion> captor = ArgumentCaptor.forClass(Publicacion.class);
        verify(publicaciones).save(captor.capture());
        assertEquals(7L, captor.getValue().getUsuario().getIdUsuario());
        assertEquals("Observación de campo", captor.getValue().getContenido());
        assertNull(captor.getValue().getImagen());
        assertEquals(EstadoPublicacion.VISIBLE, captor.getValue().getEstado());
        assertEquals("Observación de campo", creada.contenido());
    }

    @Test
    void rechazaCreacionVaciaOMuyLarga() {
        assertThrows(BusinessRuleException.class,
                () -> service.crear(new PublicacionCreateRequestDTO("Texto", "https://img.test/a.jpg"), principal));
        assertThrows(BusinessRuleException.class,
                () -> service.crear(new PublicacionCreateRequestDTO("   ", null), principal));
        assertThrows(BusinessRuleException.class,
                () -> service.crear(new PublicacionCreateRequestDTO("x".repeat(5001), null), principal));
        verify(publicaciones, never()).save(any());
    }

    @Test
    void listaYCreaComentariosConAutorDelPrincipal() {
        Comentario comentario = new Comentario();
        comentario.setIdComentario(3L);
        comentario.setPublicacion(publicacion);
        comentario.setUsuario(autor);
        comentario.setContenido("Muy interesante");
        comentario.setFechaComentario(LocalDateTime.of(2026, 11, 20, 8, 0));

        when(publicaciones.findById(24L)).thenReturn(Optional.of(publicacion));
        when(comentarios.findByPublicacion_IdPublicacionOrderByFechaComentarioAsc(24L, Pageable.ofSize(10)))
                .thenReturn(new PageImpl<>(List.of(comentario)));
        when(usuarios.findById(7L)).thenReturn(Optional.of(autor));

        Page<ComentarioResponseDTO> pagina = service.listarComentarios(24L, 0, 10, principal);
        assertEquals(3L, pagina.getContent().getFirst().id());
        assertEquals("maria", pagina.getContent().getFirst().autor().nombreUsuario());

        ComentarioResponseDTO creado = service.crearComentario(
                24L, new ComentarioCreateRequestDTO("  Muy interesante  "), principal);
        ArgumentCaptor<Comentario> captor = ArgumentCaptor.forClass(Comentario.class);
        verify(comentarios).save(captor.capture());
        assertEquals(7L, captor.getValue().getUsuario().getIdUsuario());
        assertEquals("Muy interesante", captor.getValue().getContenido());
        assertEquals("Muy interesante", creado.contenido());
        verify(notificaciones).porComentario(publicacion, autor);
    }

    @Test
    void rechazaComentarioVacio() {
        when(publicaciones.findById(24L)).thenReturn(Optional.of(publicacion));
        assertThrows(BusinessRuleException.class,
                () -> service.crearComentario(24L, new ComentarioCreateRequestDTO("   "), principal));
        verify(comentarios, never()).save(any());
        verifyNoInteractions(notificaciones);
    }

    @Test
    void reaccionOwnStateEsRealYEvitaDuplicados() {
        when(publicaciones.findById(24L)).thenReturn(Optional.of(publicacion));
        when(reacciones.countByPublicacion_IdPublicacion(24L)).thenReturn(1L);
        when(reacciones.findByPublicacion_IdPublicacionAndUsuario_IdUsuario(24L, 7L))
                .thenReturn(Optional.of(reaccion("ME_GUSTA")));
        when(usuarios.findById(7L)).thenReturn(Optional.of(autor));

        ReaccionEstadoDTO estado = service.reaccionar(24L, principal);
        assertTrue(estado.reaccionada());
        assertEquals("ME_GUSTA", estado.tipo());
        assertEquals(1L, estado.total());

        ArgumentCaptor<Reaccion> captor = ArgumentCaptor.forClass(Reaccion.class);
        verify(reacciones).saveAndFlush(captor.capture());
        assertEquals(7L, captor.getValue().getUsuario().getIdUsuario());
        assertEquals(24L, captor.getValue().getPublicacion().getIdPublicacion());
        verify(notificaciones).porReaccion(publicacion, autor);
    }

    @Test
    void reaccionDuplicadaLanzaConflictoInclusoSiLaUnicidadLoRechaza() {
        when(publicaciones.findById(24L)).thenReturn(Optional.of(publicacion));
        when(reacciones.existsByPublicacion_IdPublicacionAndUsuario_IdUsuario(24L, 7L)).thenReturn(true);
        assertThrows(DuplicateResourceException.class, () -> service.reaccionar(24L, principal));
        verifyNoInteractions(notificaciones);
        verify(reacciones, never()).saveAndFlush(any());

        when(reacciones.existsByPublicacion_IdPublicacionAndUsuario_IdUsuario(24L, 7L)).thenReturn(false);
        when(usuarios.findById(7L)).thenReturn(Optional.of(autor));
        when(reacciones.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uk_reacciones"));
        assertThrows(DuplicateResourceException.class, () -> service.reaccionar(24L, principal));
    }

    @Test
    void quitarReaccionSoloBorraLaPropia() {
        Reaccion propia = reaccion("ME_GUSTA");
        when(publicaciones.findById(24L)).thenReturn(Optional.of(publicacion));
        when(reacciones.findByPublicacion_IdPublicacionAndUsuario_IdUsuario(24L, 7L))
                .thenReturn(Optional.of(propia))
                .thenReturn(Optional.empty());
        when(reacciones.countByPublicacion_IdPublicacion(24L)).thenReturn(0L);

        ReaccionEstadoDTO estado = service.quitarReaccion(24L, principal);
        verify(reacciones).delete(propia);
        assertFalse(estado.reaccionada());
        assertEquals(0L, estado.total());

        when(reacciones.findByPublicacion_IdPublicacionAndUsuario_IdUsuario(24L, 7L))
                .thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.quitarReaccion(24L, principal));
    }

    private static Usuario usuario(Long id, String rol, String nombre, String alias) {
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(id);
        usuario.setCorreo(alias + "@example.test");
        usuario.setNombre(nombre);
        usuario.setNombreUsuario(alias);
        usuario.setFotoPerfil(null);
        return usuario;
    }

    private static Publicacion publicacion(Long id, Usuario autor, EstadoPublicacion estado, String contenido) {
        Publicacion publicacion = new Publicacion();
        publicacion.setIdPublicacion(id);
        publicacion.setUsuario(autor);
        publicacion.setContenido(contenido);
        publicacion.setEstado(estado);
        publicacion.setFechaPublicacion(LocalDateTime.of(2026, 11, 20, 8, 0));
        publicacion.setImagen(null);
        return publicacion;
    }

    private static Reaccion reaccion(String tipo) {
        Reaccion reaccion = new Reaccion();
        reaccion.setTipo(tipo);
        return reaccion;
    }
}
