package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import com.insectopia.dtos.publicaciones.PublicacionResponseDTO;
import com.insectopia.models.Publicacion;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoPublicacion;
import com.insectopia.repository.ComentarioRepository;
import com.insectopia.repository.PublicacionRepository;
import com.insectopia.repository.ReaccionRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;

/** Actividad 074: paginación en base de datos y agregados sin N+1. */
@ExtendWith(MockitoExtension.class)
class PublicacionesServicePropiasTests {

    @Mock private PublicacionRepository publicaciones;
    @Mock private ComentarioRepository comentarios;
    @Mock private ReaccionRepository reacciones;
    @Mock private UsuarioRepository usuarios;
    @Mock private AlmacenamientoImagenesService imagenes;
    @Mock private NotificacionService notificaciones;
    @InjectMocks private PublicacionesService service;

    private InsectopiaUserDetails principal;

    @BeforeEach
    void setUp() {
        principal = new InsectopiaUserDetails(7L, "maria@example.test", "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
    }

    private static Publicacion publicacion(Long id, LocalDateTime fecha) {
        Usuario autor = new Usuario();
        autor.setIdUsuario(7L);
        autor.setNombre("María");
        autor.setNombreUsuario("maria");
        Publicacion publicacion = new Publicacion();
        publicacion.setIdPublicacion(id);
        publicacion.setUsuario(autor);
        publicacion.setContenido("Avistamiento " + id);
        publicacion.setEstado(EstadoPublicacion.VISIBLE);
        publicacion.setFechaPublicacion(fecha);
        return publicacion;
    }

    @Test
    void listaSoloPropiasVisiblesConOrdenEstableYPaginacionEnBaseDeDatos() {
        Publicacion reciente = publicacion(31L, LocalDateTime.of(2026, 11, 20, 10, 0));
        Publicacion anterior = publicacion(30L, LocalDateTime.of(2026, 11, 20, 9, 0));
        Pageable esperado = PageRequest.of(0, 10,
                Sort.by(Sort.Order.desc("fechaPublicacion"), Sort.Order.desc("idPublicacion")));
        when(publicaciones.findPropiasVisibles(7L, EstadoPublicacion.VISIBLE, esperado))
                .thenReturn(new PageImpl<>(List.of(reciente, anterior), esperado, 2));

        service.listarPropias(0, 10, principal);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(publicaciones).findPropiasVisibles(eq(7L), eq(EstadoPublicacion.VISIBLE), captor.capture());
        Pageable usado = captor.getValue();
        assertAll(
                () -> assertEquals(0, usado.getPageNumber()),
                () -> assertEquals(10, usado.getPageSize()),
                () -> assertEquals(List.of("fechaPublicacion", "idPublicacion"),
                        usado.getSort().stream().map(Sort.Order::getProperty).toList()),
                () -> assertEquals(List.of(Sort.Direction.DESC, Sort.Direction.DESC),
                        usado.getSort().stream().map(Sort.Order::getDirection).toList()));
    }

    @Test
    void mapeaConAgregadosAgrupadosSinUnaConsultaPorPublicacion() {
        Publicacion reciente = publicacion(31L, LocalDateTime.of(2026, 11, 20, 10, 0));
        Publicacion anterior = publicacion(30L, LocalDateTime.of(2026, 11, 20, 9, 0));
        Pageable pagina = PageRequest.of(0, 10,
                Sort.by(Sort.Order.desc("fechaPublicacion"), Sort.Order.desc("idPublicacion")));
        when(publicaciones.findPropiasVisibles(eq(7L), eq(EstadoPublicacion.VISIBLE), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(reciente, anterior), pagina, 2));
        when(comentarios.contarPorPublicaciones(List.of(31L, 30L)))
                .thenReturn(List.<Object[]>of(new Object[] { 31L, 2L }));
        when(reacciones.contarPorPublicaciones(List.of(31L, 30L)))
                .thenReturn(List.<Object[]>of(new Object[] { 31L, 5L }));
        when(reacciones.tiposDelUsuario(List.of(31L, 30L), 7L))
                .thenReturn(List.<Object[]>of(new Object[] { 31L, "ME_GUSTA" }));

        var resultado = service.listarPropias(0, 10, principal);

        PublicacionResponseDTO primera = resultado.getContent().get(0);
        PublicacionResponseDTO segunda = resultado.getContent().get(1);
        assertAll(
                () -> assertEquals(2, resultado.getContent().size()),
                () -> assertEquals(2L, resultado.getTotalElements()),
                () -> assertEquals(31L, primera.id()),
                () -> assertEquals(7L, primera.autor().id()),
                () -> assertEquals("VISIBLE", primera.estado()),
                () -> assertEquals(2L, primera.totalComentarios()),
                () -> assertEquals(5L, primera.totalReacciones()),
                () -> assertEquals("ME_GUSTA", primera.reaccionUsuario()),
                () -> assertEquals(30L, segunda.id()),
                () -> assertEquals(0L, segunda.totalComentarios()),
                () -> assertEquals(0L, segunda.totalReacciones()),
                () -> assertNull(segunda.reaccionUsuario()));
        verify(comentarios).contarPorPublicaciones(List.of(31L, 30L));
        verify(reacciones).contarPorPublicaciones(List.of(31L, 30L));
        verify(reacciones).tiposDelUsuario(List.of(31L, 30L), 7L);
        verify(comentarios, never()).countByPublicacion_IdPublicacion(anyLong());
        verify(reacciones, never()).countByPublicacion_IdPublicacion(anyLong());
        verify(reacciones, never()).findByPublicacion_IdPublicacionAndUsuario_IdUsuario(anyLong(), anyLong());
    }

    @Test
    void paginaVaciaNoConsultaConteos() {
        Pageable pagina = PageRequest.of(0, 10,
                Sort.by(Sort.Order.desc("fechaPublicacion"), Sort.Order.desc("idPublicacion")));
        when(publicaciones.findPropiasVisibles(7L, EstadoPublicacion.VISIBLE, pagina))
                .thenReturn(new PageImpl<>(List.of(), pagina, 0));

        var resultado = service.listarPropias(0, 10, principal);

        assertAll(
                () -> assertEquals(List.of(), resultado.getContent()),
                () -> assertEquals(0L, resultado.getTotalElements()),
                () -> assertEquals(pagina, resultado.getPageable()));
        verifyNoInteractions(comentarios, reacciones);
    }

    @Test
    void conteoVisibleUsaElMismoCriterioQueElListado() {
        when(publicaciones.countByUsuario_IdUsuarioAndEstado(7L, EstadoPublicacion.VISIBLE))
                .thenReturn(9L);

        assertEquals(9L, service.contarPropiasVisibles(7L));
        verify(publicaciones).countByUsuario_IdUsuarioAndEstado(7L, EstadoPublicacion.VISIBLE);
    }
}
