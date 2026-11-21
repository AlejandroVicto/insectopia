package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.*;
import com.insectopia.models.enums.*;
import com.insectopia.repository.NotificacionRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;

@ExtendWith(MockitoExtension.class)
class NotificacionServiceTests {
    @Mock NotificacionRepository repository;
    NotificacionService service;
    Usuario autor, actor;
    Publicacion publicacion;
    Notificacion aviso;

    private InsectopiaUserDetails principal(long id) {
        return new InsectopiaUserDetails(id, "test@example.invalid", "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
    }

    @BeforeEach void setup() {
        service = new NotificacionService(repository);
        autor = new Usuario(); autor.setIdUsuario(1L); autor.setEstado(EstadoUsuario.ACTIVO);
        actor = new Usuario(); actor.setIdUsuario(2L); actor.setNombre("A"); actor.setNombreUsuario("a");
        actor.setEstado(EstadoUsuario.ACTIVO);
        publicacion = new Publicacion(); publicacion.setIdPublicacion(24L);
        publicacion.setUsuario(autor); publicacion.setEstado(EstadoPublicacion.VISIBLE);
        aviso = new Notificacion(); aviso.setIdNotificacion(9L); aviso.setDestinatario(autor);
        aviso.setActor(actor); aviso.setPublicacion(publicacion); aviso.setTipo(NotificacionService.COMENTARIO);
        aviso.setContenido("Alguien comentó tu publicación");
        aviso.setFechaCreacion(LocalDateTime.of(2026, 11, 20, 9, 0));
    }

    @Test void paginaYFiltraEnBDConOrdenEstableYPrincipal() {
        when(repository.findByDestinatario_IdUsuario(eq(1L), any())).thenReturn(new PageImpl<>(List.of(aviso)));
        var pagina = service.listar(0, 10, "todas", principal(1));
        assertEquals(9L, pagina.getContent().getFirst().id());
        assertEquals("/api/publicaciones/24", pagina.getContent().getFirst().recurso().apiUrl());
        assertEquals(2L, pagina.getContent().getFirst().actor().id());
        ArgumentCaptor<Pageable> orden = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findByDestinatario_IdUsuario(eq(1L), orden.capture());
        assertEquals(org.springframework.data.domain.Sort.Direction.DESC,
                orden.getValue().getSort().getOrderFor("fechaCreacion").getDirection());
        assertEquals(org.springframework.data.domain.Sort.Direction.DESC,
                orden.getValue().getSort().getOrderFor("idNotificacion").getDirection());
        when(repository.findByDestinatario_IdUsuarioAndLeida(eq(2L), anyBoolean(), any()))
                .thenReturn(new PageImpl<>(List.of()));
        service.listar(1, 5, "no-leidas", principal(2));
        service.listar(0, 10, "leidas", principal(2));
        verify(repository).findByDestinatario_IdUsuarioAndLeida(eq(2L), eq(false), any());
        verify(repository).findByDestinatario_IdUsuarioAndLeida(eq(2L), eq(true), any());
    }

    @Test void cuentaLeeYEliminaSoloPropias() {
        when(repository.countByDestinatario_IdUsuarioAndLeidaFalse(1L)).thenReturn(2L, 0L);
        assertEquals(2, service.contar(principal(1)).count());
        when(repository.findByIdNotificacionAndDestinatario_IdUsuario(9L, 1L)).thenReturn(Optional.of(aviso));
        assertTrue(service.leer(9L, principal(1)).leida());
        assertTrue(service.leer(9L, principal(1)).leida());
        assertEquals(0, service.leerTodas(principal(1)).count());
        verify(repository).marcarTodasLeidas(1L);
        service.eliminar(9L, principal(1));
        verify(repository).delete(aviso);
        assertThrows(ResourceNotFoundException.class, () -> service.leer(9L, principal(2)));
        assertThrows(ResourceNotFoundException.class, () -> service.eliminar(9L, principal(2)));
        verify(repository, never()).findById(9L);
    }

    @Test void recursoEliminadoOcultoAjenoYActorInactivoNoExponenDatos() {
        when(repository.findByDestinatario_IdUsuario(eq(1L), any())).thenReturn(new PageImpl<>(List.of(aviso)));
        publicacion.setEstado(EstadoPublicacion.ELIMINADA);
        var eliminado = service.listar(0, 10, "todas", principal(1)).getContent().getFirst();
        assertFalse(eliminado.recurso().disponible());
        assertNull(eliminado.recurso().apiUrl()); assertNull(eliminado.recurso().id());
        publicacion.setEstado(EstadoPublicacion.OCULTA);
        publicacion.setUsuario(actor);
        var inaccesible = service.listar(0, 10, "todas", principal(1)).getContent().getFirst();
        assertFalse(inaccesible.recurso().disponible());
        actor.setEstado(EstadoUsuario.DESACTIVADO);
        assertNull(service.listar(0, 10, "todas", principal(1)).getContent().getFirst().actor());
        aviso.setPublicacion(null);
        assertNull(service.listar(0, 10, "todas", principal(1)).getContent().getFirst().recurso().apiUrl());
    }

    @Test void comentarioYReaccionSoloDeOtrosYSinDuplicados() {
        service.porComentario(publicacion, actor);
        verify(repository).save(argThat(n -> n.getTipo().equals("COMENTARIO") && n.getDestinatario() == autor));
        service.porComentario(publicacion, autor);
        service.porReaccion(publicacion, autor);
        verify(repository, times(1)).save(any());
        when(repository.existsByDestinatario_IdUsuarioAndActor_IdUsuarioAndPublicacion_IdPublicacionAndTipo(
                1L, 2L, 24L, "REACCION")).thenReturn(false, true);
        service.porReaccion(publicacion, actor);
        service.porReaccion(publicacion, actor);
        verify(repository, times(2)).save(any());
    }

    @Test void resolucionOcultaIdentidadDelModeradorYNoNotificaPropias() {
        Reporte r = new Reporte(); r.setIdReporte(8L); r.setReportante(autor);
        r.setEstado(EstadoReporte.RECHAZADO);
        service.porResolucion(r, autor);
        verify(repository, never()).save(any());
        service.porResolucion(r, actor);
        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(repository).save(captor.capture());
        assertEquals("REPORTE_RECHAZADO", captor.getValue().getTipo());
        assertNull(captor.getValue().getActor());
        aviso.setReporte(r); aviso.setPublicacion(null); aviso.setTipo("REPORTE_RECHAZADO");
        when(repository.findByDestinatario_IdUsuario(eq(1L), any())).thenReturn(new PageImpl<>(List.of(aviso)));
        var dto = service.listar(0, 10, "todas", principal(1)).getContent().getFirst();
        assertNull(dto.actor()); assertNull(dto.recurso().apiUrl());
        assertEquals(8L, dto.recurso().id()); assertFalse(dto.recurso().disponible());
    }

    @Test void mensajeGeneraAvisoPrivadoConConversacionRealYNoParaRemitente() {
        Conversacion conversacion = new Conversacion(); conversacion.setIdConversacion(5L);
        Mensaje mensaje = new Mensaje(); mensaje.setIdMensaje(80L); mensaje.setConversacion(conversacion);
        mensaje.setRemitente(actor); mensaje.setContenido("Secreto");
        service.porMensaje(mensaje, autor, actor);
        service.porMensaje(mensaje, actor, actor);
        ArgumentCaptor<Notificacion> captor = ArgumentCaptor.forClass(Notificacion.class);
        verify(repository, times(1)).save(captor.capture());
        Notificacion creada = captor.getValue();
        assertSame(mensaje, creada.getMensaje()); assertSame(actor, creada.getActor());
        assertSame(autor, creada.getDestinatario()); assertFalse(creada.getLeida());
        assertEquals("MENSAJE", creada.getTipo()); assertFalse(creada.getContenido().contains("Secreto"));
        when(repository.findByDestinatario_IdUsuario(eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(creada)));
        var dto = service.listar(0, 10, "todas", principal(1)).getContent().getFirst();
        assertEquals(5L, dto.recurso().conversacionId());
        assertEquals(80L, dto.recurso().id());
        assertEquals("/api/conversaciones/5", dto.recurso().apiUrl());
        assertEquals("a", dto.actor().nombreUsuario());
    }
}
