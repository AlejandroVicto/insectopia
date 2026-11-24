package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.insectopia.dtos.eventos.EventoRequestDTO;
import com.insectopia.dtos.eventos.EventoUpdateRequestDTO;
import com.insectopia.exceptions.EventoConflictoException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Evento;
import com.insectopia.models.ParticipanteEvento;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoEvento;
import com.insectopia.models.enums.EstadoParticipanteEvento;
import com.insectopia.models.ids.ParticipanteEventoId;
import com.insectopia.repository.EventoRepository;
import com.insectopia.repository.ParticipanteEventoRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;

@ExtendWith(MockitoExtension.class)
class EventoServiceTests {
    @Mock EventoRepository eventos;
    @Mock ParticipanteEventoRepository participantes;
    @Mock UsuarioRepository usuarios;
    @Mock NotificacionService notificaciones;
    @Mock SmsService sms;
    @Mock AlmacenamientoImagenesService imagenes;
    EventoService service;
    InsectopiaUserDetails actual;
    Usuario proponente;
    Usuario inscrito;
    Evento evento;

    @BeforeEach void preparar() {
        service = new EventoService(eventos, participantes, usuarios, notificaciones, sms, imagenes, "America/Mexico_City");
        actual = principal(7);
        proponente = usuario(7);
        inscrito = usuario(8);
        evento = new Evento();
        evento.setIdEvento(12L);
        evento.setProponente(proponente);
        evento.setTitulo("Polillas");
        evento.setDescripcion("Muestreo de insectos");
        evento.setUbicacion("Oaxaca");
        evento.setFechaInicio(LocalDateTime.now(ZoneId.of("America/Mexico_City")).plusDays(20));
        evento.setFechaFin(evento.getFechaInicio().plusHours(3));
        evento.setCupoMaximo(1);
        evento.setEstado(EstadoEvento.APROBADO);
    }

    static InsectopiaUserDetails principal(long id) {
        return new InsectopiaUserDetails(id, "usuario@example.test", "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
    }

    static Usuario usuario(long id) {
        Usuario u = new Usuario(); u.setIdUsuario(id); u.setNombre("Nombre"); u.setNombreUsuario("usuario" + id);
        return u;
    }

    EventoRequestDTO datos() {
        return new EventoRequestDTO(" Nuevo evento ", " Actividad ", " Oaxaca ", null,
                evento.getFechaInicio(), evento.getFechaFin(), 5);
    }

    EventoUpdateRequestDTO edicion() {
        EventoRequestDTO d = datos();
        return new EventoUpdateRequestDTO(d.titulo(), d.descripcion(), d.ubicacion(), d.imagen(),
                d.fechaInicio(), d.fechaFin(), d.cupoMaximo());
    }

    @Test void creaPendienteConProponenteAutenticadoSinCamposAdministrativos() {
        when(usuarios.getReferenceById(7L)).thenReturn(proponente);
        when(eventos.save(any(Evento.class))).thenAnswer(i -> {
            Evento e = i.getArgument(0); e.setIdEvento(21L); return e;
        });
        var dto = service.crear(datos(), actual);
        assertEquals(EstadoEvento.PENDIENTE, dto.estado());
        assertEquals(21L, dto.idEvento());
        assertTrue(dto.esPropio());
        ArgumentCaptor<Evento> captor = ArgumentCaptor.forClass(Evento.class);
        verify(eventos).save(captor.capture());
        assertSame(proponente, captor.getValue().getProponente());
        assertNull(captor.getValue().getModerador());
        assertNull(captor.getValue().getMotivoResolucion());
        assertEquals("Nuevo evento", captor.getValue().getTitulo());
    }

    @Test void validaFechasEImagenAntesDeGuardar() {
        var anterior = new EventoRequestDTO("x", "y", "z", null,
                LocalDateTime.now(ZoneId.of("America/Mexico_City")).minusDays(1), evento.getFechaFin(), 1);
        assertThrows(IllegalArgumentException.class, () -> service.crear(anterior, actual));
        var invertido = new EventoRequestDTO("x", "y", "z", null,
                evento.getFechaFin(), evento.getFechaInicio(), 1);
        assertThrows(IllegalArgumentException.class, () -> service.crear(invertido, actual));
        var imagen = new EventoRequestDTO("x", "y", "z", "/../privado", evento.getFechaInicio(), evento.getFechaFin(), 1);
        assertThrows(IllegalArgumentException.class, () -> service.crear(imagen, actual));
        verifyNoInteractions(eventos);
    }

    @Test void publicoSoloAprobadoConOrdenEstableYBusquedaAntesDePaginar() {
        when(eventos.listarPublicos(eq(EstadoEvento.APROBADO), eq("%oaxaca%"), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(evento)));
        var pagina = service.listar(0, 10, "Oaxaca", null, "", null, null, false, principal(8));
        assertEquals(1, pagina.getTotalElements());
        assertFalse(pagina.getContent().getFirst().esPropio());
        assertNull(pagina.getContent().getFirst().motivoResolucion());
        assertEquals(0, pagina.getContent().getFirst().participantesConfirmados());
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(eventos).listarPublicos(any(), any(), any(), any(), captor.capture());
        assertEquals("fechaInicio: ASC,idEvento: ASC", captor.getValue().getSort().toString());
        assertThrows(IllegalArgumentException.class,
                () -> service.listar(0, 10, null, EstadoEvento.PENDIENTE, "", null, null, false, actual));
    }

    @Test void navbarBuscaSoloTitulosAprobadosSinUsarDescripcionNiUbicacion() {
        when(eventos.buscarTitulosPublicos(eq(EstadoEvento.APROBADO), eq("%polillas%"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(evento)));
        var pagina = service.buscarTitulos("Polillas", 5, principal(8));
        assertEquals("Polillas", pagina.getContent().getFirst().titulo());
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(eventos).buscarTitulosPublicos(eq(EstadoEvento.APROBADO), eq("%polillas%"), captor.capture());
        assertEquals(5, captor.getValue().getPageSize());
        assertTrue(service.buscarTitulos("   ", 5, actual).isEmpty());
    }

    @Test void proximosCalculadosEnZonaLocalConLimitesDeTreintaDias() {
        when(eventos.listarPublicos(eq(EstadoEvento.APROBADO), isNull(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of()));
        service.listar(1, 5, null, null, "", null, null, true, actual);
        ArgumentCaptor<LocalDateTime> desde = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> hasta = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(eventos).listarPublicos(any(), any(), desde.capture(), hasta.capture(), any());
        assertEquals(30, java.time.Duration.between(desde.getValue(), hasta.getValue()).toDays());
        assertThrows(IllegalArgumentException.class,
                () -> service.listar(0, 10, null, null, "pasados", null, null, true, actual));
    }

    @Test void propiosYPertenenciasSiempreFiltranPorJwtYNoFiltranMotivosPrivados() {
        when(eventos.listarPropios(eq(7L), eq(EstadoEvento.RECHAZADO), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(evento)));
        evento.setEstado(EstadoEvento.RECHAZADO);
        evento.setMotivoResolucion("Motivo reservado");
        assertEquals("Motivo reservado", service.propias(0, 10, null, EstadoEvento.RECHAZADO, "", null, null, actual)
                .getContent().getFirst().motivoResolucion());
        when(eventos.listarParticipaciones(eq(8L), isNull(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(evento)));
        assertNull(service.misParticipaciones(0, 10, null, null, "", null, null, principal(8))
                .getContent().getFirst().motivoResolucion());
        assertThrows(IllegalArgumentException.class,
                () -> service.propias(0, 10, null, null, "", LocalDate.now().plusDays(1), LocalDate.now(), actual));
    }

    @Test void editaSoloPropuestaPendientePropiaYNoPermiteResolverla() {
        evento.setEstado(EstadoEvento.PENDIENTE);
        evento.setImagen("eventos/11111111-1111-1111-1111-111111111111.jpg");
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        assertThrows(ResourceNotFoundException.class, () -> service.editar(12L, edicion(), principal(8)));
        assertEquals("Nuevo evento", service.editar(12L, edicion(), actual).titulo());
        assertEquals("eventos/11111111-1111-1111-1111-111111111111.jpg", evento.getImagen());
        evento.setEstado(EstadoEvento.RECHAZADO);
        assertThrows(EventoConflictoException.class, () -> service.editar(12L, edicion(), actual));
    }

    @Test void cancelaLogicamenteSoloSinParticipantesActivos() {
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        when(participantes.countByEvento_IdEventoAndEstado(12L, EstadoParticipanteEvento.INSCRITO))
                .thenReturn(1L, 0L);
        assertThrows(EventoConflictoException.class, () -> service.cancelarEvento(12L, actual));
        assertEquals(EstadoEvento.APROBADO, evento.getEstado());
        service.cancelarEvento(12L, actual);
        assertEquals(EstadoEvento.CANCELADO, evento.getEstado());
    }

    @Test void inscripcionBloqueaVerificaCupoYCreaUnAvisoSoloAlCambiarEstado() {
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        when(usuarios.getReferenceById(8L)).thenReturn(inscrito);
        var respuesta = service.inscribir(12L, principal(8));
        assertEquals(EstadoParticipanteEvento.INSCRITO, respuesta.estadoInscripcion());
        assertEquals(1, respuesta.participantesConfirmados());
        ArgumentCaptor<ParticipanteEvento> captor = ArgumentCaptor.forClass(ParticipanteEvento.class);
        verify(participantes).save(captor.capture());
        assertEquals(new ParticipanteEventoId(12L, 8L), captor.getValue().getId());
        verify(notificaciones).porParticipacion(evento, inscrito, true);
        verify(sms).registrar(12L, 8L, false);
        when(participantes.findById(new ParticipanteEventoId(12L, 8L)))
                .thenReturn(Optional.of(captor.getValue()));
        assertThrows(EventoConflictoException.class, () -> service.inscribir(12L, principal(8)));
        verify(notificaciones, times(1)).porParticipacion(evento, inscrito, true);
        verify(sms, times(1)).registrar(12L, 8L, false);
    }

    @Test void rechazaEstadosFechasYCupoSinCrearAvisos() {
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        evento.setEstado(EstadoEvento.PENDIENTE);
        assertThrows(EventoConflictoException.class, () -> service.inscribir(12L, principal(8)));
        evento.setEstado(EstadoEvento.CANCELADO);
        assertThrows(EventoConflictoException.class, () -> service.inscribir(12L, principal(8)));
        evento.setEstado(EstadoEvento.APROBADO);
        evento.setFechaInicio(LocalDateTime.now(ZoneId.of("America/Mexico_City")).minusDays(1));
        assertThrows(EventoConflictoException.class, () -> service.inscribir(12L, principal(8)));
        evento.setFechaInicio(LocalDateTime.now(ZoneId.of("America/Mexico_City")).plusDays(1));
        when(participantes.countByEvento_IdEventoAndEstado(12L, EstadoParticipanteEvento.INSCRITO)).thenReturn(1L);
        assertThrows(EventoConflictoException.class, () -> service.inscribir(12L, principal(8)));
        verifyNoInteractions(notificaciones);
        verifyNoInteractions(sms);
    }

    @Test void cancelarYReinscribirReutilizaLaMismaClaveCompuesta() {
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        ParticipanteEvento p = new ParticipanteEvento();
        p.setId(new ParticipanteEventoId(12L, 8L));
        p.setUsuario(inscrito);
        p.setEvento(evento);
        p.setEstado(EstadoParticipanteEvento.INSCRITO);
        when(participantes.findById(p.getId())).thenReturn(Optional.of(p));
        service.cancelarInscripcion(12L, principal(8));
        assertEquals(EstadoParticipanteEvento.CANCELADO, p.getEstado());
        assertNotNull(p.getFechaCancelacion());
        verify(notificaciones).porParticipacion(evento, inscrito, false);
        verify(sms).cancelar(12L, 8L);
        assertThrows(EventoConflictoException.class, () -> service.cancelarInscripcion(12L, principal(8)));
        service.inscribir(12L, principal(8));
        assertEquals(EstadoParticipanteEvento.INSCRITO, p.getEstado());
        assertNull(p.getFechaCancelacion());
        verify(participantes).save(same(p));
    }

    @Test void consentimientoSePropagaYUnFalloExternoNoOcurreDuranteInscripcion() {
        inscrito.setRecibirSms(true);
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        when(usuarios.getReferenceById(8L)).thenReturn(inscrito);
        service.inscribir(12L, principal(8));
        verify(sms).registrar(12L, 8L, true);
        verify(notificaciones).porParticipacion(evento, inscrito, true);
    }

    @Test void imagenSoloPendientePropiaSeGuardaEnDirectorioEventosYLimpiaAnteriorTrasCommit() {
        String anterior = "11111111-1111-1111-1111-111111111111.jpg";
        String nuevo = "22222222-2222-2222-2222-222222222222.png";
        evento.setImagen("eventos/" + anterior);
        evento.setEstado(EstadoEvento.PENDIENTE);
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        var archivo = new MockMultipartFile("imagen", "nueva.png", "image/png", new byte[]{1, 2, 3});
        assertThrows(ResourceNotFoundException.class, () -> service.subirImagen(12L, archivo, principal(8)));
        evento.setEstado(EstadoEvento.APROBADO);
        assertThrows(EventoConflictoException.class, () -> service.subirImagen(12L, archivo, actual));
        verifyNoInteractions(imagenes);
        evento.setEstado(EstadoEvento.PENDIENTE);
        when(imagenes.guardar(archivo)).thenReturn(nuevo);
        TransactionSynchronizationManager.initSynchronization();
        try {
            assertEquals("eventos/" + nuevo, service.subirImagen(12L, archivo, actual).imagen());
            verify(eventos).saveAndFlush(evento);
            verify(imagenes, never()).eliminar(anterior);
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));
            verify(imagenes).eliminar(anterior);
            verify(imagenes, never()).eliminar(nuevo);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test void rollbackEliminaArchivoNuevoYConservaAnterior() {
        String nuevo = "22222222-2222-2222-2222-222222222222.png";
        evento.setEstado(EstadoEvento.PENDIENTE);
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        var archivo = new MockMultipartFile("imagen", "nueva.png", "image/png", new byte[]{1});
        when(imagenes.guardar(archivo)).thenReturn(nuevo);
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.subirImagen(12L, archivo, actual);
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
            verify(imagenes).eliminar(nuevo);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test void lecturaPendienteTambienLaPuedeHacerModeradorConAutoridad() {
        String nombre = "11111111-1111-1111-1111-111111111111.jpg";
        evento.setImagen("eventos/" + nombre);
        evento.setEstado(EstadoEvento.PENDIENTE);
        when(eventos.findById(12L)).thenReturn(Optional.of(evento));
        when(imagenes.leer(nombre)).thenReturn(mock(org.springframework.core.io.Resource.class));
        var moderador = new InsectopiaUserDetails(9L, "mod@example.invalid", "hash", "MODERADOR", 0,
                Permissions.authoritiesFor("MODERADOR"));
        assertEquals(org.springframework.http.MediaType.IMAGE_JPEG, service.leerImagen(12L, moderador).tipo());
    }

    @Test void borrarImagenRespetaPermisosYLecturaPendientePrivada() {
        String nombre = "11111111-1111-1111-1111-111111111111.jpg";
        evento.setImagen("eventos/" + nombre);
        evento.setEstado(EstadoEvento.PENDIENTE);
        when(eventos.findById(12L)).thenReturn(Optional.of(evento));
        assertThrows(ResourceNotFoundException.class, () -> service.leerImagen(12L, principal(8)));
        when(imagenes.leer(nombre)).thenReturn(mock(org.springframework.core.io.Resource.class));
        assertEquals(org.springframework.http.MediaType.IMAGE_JPEG, service.leerImagen(12L, actual).tipo());
        evento.setEstado(EstadoEvento.APROBADO);
        assertEquals(org.springframework.http.MediaType.IMAGE_JPEG, service.leerImagen(12L, null).tipo());
        evento.setEstado(EstadoEvento.PENDIENTE);
        when(eventos.bloquear(12L)).thenReturn(Optional.of(evento));
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.quitarImagen(12L, actual);
            assertNull(evento.getImagen());
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));
            verify(imagenes).eliminar(nombre);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
