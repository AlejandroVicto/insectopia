package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
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
import org.springframework.security.access.AccessDeniedException;

import com.insectopia.dtos.moderacion.RechazarPropuestaRequestDTO;
import com.insectopia.exceptions.EventoConflictoException;
import com.insectopia.exceptions.EventoValidacionException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Evento;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoEvento;
import com.insectopia.repository.EventoRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;

@ExtendWith(MockitoExtension.class)
class ModeracionServiceTests {
    @Mock EventoRepository eventos;
    @Mock UsuarioRepository usuarios;
    @Mock NotificacionService notificaciones;
    ModeracionService service;
    InsectopiaUserDetails principal;
    Usuario moderador;
    Evento evento;

    @BeforeEach void preparar() {
        service = new ModeracionService(eventos, usuarios, notificaciones);
        moderador = usuario(9);
        principal = new InsectopiaUserDetails(9L, "mod@example.invalid", "hash", "MODERADOR", 0,
                Permissions.authoritiesFor("MODERADOR"));
        evento = new Evento();
        evento.setIdEvento(12L);
        evento.setProponente(usuario(7));
        evento.setTitulo("Polillas de Oaxaca");
        evento.setDescripcion("Muestreo nocturno");
        evento.setUbicacion("Oaxaca");
        evento.setFechaInicio(LocalDateTime.of(2027, 2, 1, 9, 0));
        evento.setFechaFin(LocalDateTime.of(2027, 2, 1, 18, 0));
        evento.setCupoMaximo(30);
        evento.setFechaCreacion(LocalDateTime.of(2026, 11, 20, 10, 0));
        evento.setEstado(EstadoEvento.PENDIENTE);
    }

    private static Usuario usuario(long id) {
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(id);
        usuario.setNombre("Nombre " + id);
        usuario.setNombreUsuario("usuario" + id);
        com.insectopia.models.Rol rol = new com.insectopia.models.Rol();
        rol.setNombre("MODERADOR");
        usuario.setRol(rol);
        return usuario;
    }

    private static InsectopiaUserDetails principal(String rol, long id) {
        return new InsectopiaUserDetails(id, rol.toLowerCase() + "@example.invalid", "hash", rol, 0,
                Permissions.authoritiesFor(rol));
    }

    @Test void listadoPorDefectoSoloPendientesConFiltrosYPaginacionEstable() {
        LocalDate desde = LocalDate.of(2027, 1, 1);
        LocalDate hasta = LocalDate.of(2027, 1, 31);
        when(eventos.listarParaModeracion(eq(EstadoEvento.PENDIENTE), eq("%oaxaca%"),
                eq(desde.atStartOfDay()), eq(hasta.plusDays(1).atStartOfDay()), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(evento)));
        var pagina = service.listarPropuestas(1, 5, " Oaxaca ", null, desde, hasta, principal);
        assertEquals(1, pagina.getTotalElements());
        var dto = pagina.getContent().getFirst();
        assertEquals(12L, dto.idEvento());
        assertEquals(EstadoEvento.PENDIENTE, dto.estado());
        assertEquals(7L, dto.proponente().idUsuario());
        assertNull(dto.moderadorId());
        assertNull(dto.motivoResolucion());
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(eventos).listarParaModeracion(any(), any(), any(), any(), captor.capture());
        assertEquals(1, captor.getValue().getPageNumber());
        assertEquals(5, captor.getValue().getPageSize());
        assertEquals("fechaCreacion: DESC,idEvento: DESC", captor.getValue().getSort().toString());
    }

    @Test void listadoRechazaUsuarioEstadoNoModerableYRangoInvertido() {
        InsectopiaUserDetails usuario = principal("USUARIO", 7);
        assertThrows(AccessDeniedException.class,
                () -> service.listarPropuestas(0, 20, null, null, null, null, usuario));
        assertThrows(EventoValidacionException.class,
                () -> service.listarPropuestas(0, 20, null, EstadoEvento.CANCELADO, null, null, principal));
        assertThrows(EventoValidacionException.class, () -> service.listarPropuestas(0, 20, null, null,
                LocalDate.of(2027, 2, 2), LocalDate.of(2027, 2, 1), principal));
        verifyNoInteractions(eventos);
    }

    @Test void administradorPuedeListarHistorialResuelto() {
        when(eventos.listarParaModeracion(eq(EstadoEvento.RECHAZADO), isNull(), isNull(), isNull(), any()))
                .thenReturn(new PageImpl<>(List.of()));
        service.listarPropuestas(0, 20, null, EstadoEvento.RECHAZADO, null, null, principal("ADMINISTRADOR", 10));
        verify(eventos).listarParaModeracion(eq(EstadoEvento.RECHAZADO), isNull(), isNull(), isNull(), any());
    }

    @Test void apruebaSoloPendienteYRegistraModeradorJWTFechaYAviso() {
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        when(usuarios.findById(9L)).thenReturn(Optional.of(moderador));
        var respuesta = service.aprobar(12L, principal);
        assertEquals(EstadoEvento.APROBADO, evento.getEstado());
        assertSame(moderador, evento.getModerador());
        assertNotNull(evento.getFechaResolucion());
        assertNull(evento.getMotivoResolucion());
        assertEquals(9L, respuesta.moderadorId());
        assertEquals(EstadoEvento.APROBADO, respuesta.estado());
        verify(eventos).saveAndFlush(evento);
        verify(notificaciones).porResolucionEvento(evento, moderador, true);
    }

    @Test void rechazaConMotivoNormalizadoYAvisoDistinto() {
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        when(usuarios.findById(9L)).thenReturn(Optional.of(moderador));
        var respuesta = service.rechazar(12L, new RechazarPropuestaRequestDTO("  Motivo suficiente  "), principal);
        assertEquals(EstadoEvento.RECHAZADO, evento.getEstado());
        assertEquals("Motivo suficiente", evento.getMotivoResolucion());
        assertEquals("Motivo suficiente", respuesta.motivoResolucion());
        assertNotNull(respuesta.fechaResolucion());
        verify(eventos).saveAndFlush(evento);
        verify(notificaciones).porResolucionEvento(evento, moderador, false);
    }

    @Test void resolucionRechazaRolRealInvalidoAunqueElPrincipalTengaAutoridades() {
        com.insectopia.models.Rol rol = new com.insectopia.models.Rol();
        rol.setNombre("USUARIO");
        moderador.setRol(rol);
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        when(usuarios.findById(9L)).thenReturn(Optional.of(moderador));
        assertThrows(AccessDeniedException.class, () -> service.aprobar(12L, principal));
        verify(eventos, never()).saveAndFlush(any());
        verifyNoInteractions(notificaciones);
    }

    @Test void resolucionRepetidaDaConflictoSinGuardarNiAvisarDosVeces() {
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        when(usuarios.findById(9L)).thenReturn(Optional.of(moderador));
        service.aprobar(12L, principal);
        assertThrows(EventoConflictoException.class,
                () -> service.rechazar(12L, new RechazarPropuestaRequestDTO("Motivo"), principal));
        assertEquals(EstadoEvento.APROBADO, evento.getEstado());
        verify(eventos, times(1)).saveAndFlush(evento);
        verify(notificaciones, times(1)).porResolucionEvento(any(), any(), anyBoolean());
    }

    @Test void rechazoVacioNoBloqueaNiNotifica() {
        assertThrows(EventoValidacionException.class,
                () -> service.rechazar(12L, new RechazarPropuestaRequestDTO("  "), principal));
        verifyNoInteractions(eventos, notificaciones);
    }

    @Test void eventoInexistenteOModeradorInexistenteNoResuelven() {
        when(eventos.bloquear(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.aprobar(99L, principal));
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        when(usuarios.findById(9L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.aprobar(12L, principal));
        verify(eventos, never()).saveAndFlush(any());
        verifyNoInteractions(notificaciones);
    }
}
