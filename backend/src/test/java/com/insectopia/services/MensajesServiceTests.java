package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import com.insectopia.dtos.mensajes.ConversacionResponseDTO;
import com.insectopia.dtos.mensajes.MensajeCreateRequestDTO;
import com.insectopia.dtos.mensajes.MensajeResponseDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Conversacion;
import com.insectopia.models.Mensaje;
import com.insectopia.models.ParticipanteConversacion;
import com.insectopia.models.Usuario;
import com.insectopia.models.ids.ParticipanteConversacionId;
import com.insectopia.repository.ConteoNoLeidosProjection;
import com.insectopia.repository.ConversacionRepository;
import com.insectopia.repository.MensajeRepository;
import com.insectopia.repository.ParticipanteConversacionRepository;
import com.insectopia.repository.SeguidorRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;

@ExtendWith(MockitoExtension.class)
class MensajesServiceTests {

    @Mock private ConversacionRepository conversaciones;
    @Mock private ParticipanteConversacionRepository participantes;
    @Mock private MensajeRepository mensajes;
    @Mock private UsuarioRepository usuarios;
    @Mock private SeguidorRepository seguidores;
    @Mock private NotificacionService notificaciones;
    @InjectMocks private MensajesService service;

    private InsectopiaUserDetails principal;
    private Usuario yo;
    private Usuario interlocutor;
    private Conversacion conversacion;

    @BeforeEach
    void setUp() {
        yo = usuario(7L, "María", "maria");
        interlocutor = usuario(9L, "TinkyW", "tinky");
        principal = new InsectopiaUserDetails(7L, "maria@example.test", "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
        conversacion = new Conversacion();
        conversacion.setIdConversacion(15L);
        conversacion.setClaveDirecta("7:9");
        conversacion.setFechaCreacion(LocalDateTime.of(2026, 11, 20, 8, 0));
    }

    @Test
    void bandejaMapeaInterlocutorUltimoMensajeYNoLeidosDelServidor() {
        ParticipanteConversacion fila = participante(conversacion, yo, false);
        when(participantes.buscarBandeja(eq(7L), isNull(), eq(false), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(fila), PageRequest.of(0, 20), 1));
        when(participantes.findConUsuariosPorConversaciones(anyCollection()))
                .thenReturn(List.of(fila, participante(conversacion, interlocutor, false)));
        when(mensajes.findUltimosPorConversacion(anyCollection())).thenReturn(List.of(mensaje(101L)));
        ConteoNoLeidosProjection conteo = conteo(15L, 2L);
        when(mensajes.contarNoLeidos(eq(7L), anyCollection())).thenReturn(List.of(conteo));
        when(seguidores.findIdsSeguidos(eq(7L), anyCollection())).thenReturn(List.of(9L));

        Page<ConversacionResponseDTO> pagina = service.listar(0, 20, null, false, principal);

        assertEquals(1, pagina.getTotalElements());
        ConversacionResponseDTO dto = pagina.getContent().getFirst();
        assertEquals(15L, dto.id());
        assertEquals(9L, dto.interlocutor().id());
        assertEquals("TinkyW", dto.interlocutor().nombre());
        assertEquals("tinky", dto.interlocutor().nombreUsuario());
        assertEquals(Boolean.TRUE, dto.interlocutor().loSigo());
        assertEquals(101L, dto.ultimoMensaje().id());
        assertEquals("Hola", dto.ultimoMensaje().contenido());
        assertEquals(2L, dto.noLeidos());
        assertEquals(false, dto.oculta());
    }

    @Test
    void bandejaIgnoraOcultasInclusoSiLaConsultaLasDevuelve() {
        when(participantes.buscarBandeja(eq(7L), isNull(), eq(false), any(Pageable.class)))
                .thenReturn(new PageImpl<>(
                        List.of(participante(conversacion, yo, true)), PageRequest.of(0, 20), 1));

        Page<ConversacionResponseDTO> pagina = service.listar(0, 20, null, false, principal);

        assertEquals(0, pagina.getContent().size());
        verify(participantes, never()).findConUsuariosPorConversaciones(anyCollection());
        verify(mensajes, never()).findUltimosPorConversacion(anyCollection());
    }

    @Test
    void bandejaNormalizaBusquedaAplicaFiltroNoLeidosYPaginaEnServidor() {
        when(participantes.buscarBandeja(eq(7L), any(), eq(true), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(1, 10), 0));

        service.listar(1, 10, "  50%_ ", true, principal);

        ArgumentCaptor<String> busqueda = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Pageable> pagina = ArgumentCaptor.forClass(Pageable.class);
        verify(participantes).buscarBandeja(eq(7L), busqueda.capture(), eq(true), pagina.capture());
        assertEquals("%50\\%\\_%", busqueda.getValue());
        assertEquals(1, pagina.getValue().getPageNumber());
        assertEquals(10, pagina.getValue().getPageSize());
        assertEquals(org.springframework.data.domain.Sort.unsorted(), pagina.getValue().getSort());
        verify(participantes, never()).findConUsuariosPorConversaciones(anyCollection());
    }

    @Test
    void conversacionPorIdDevuelveElMismoDtoCompletoQueLaBandeja() {
        ParticipanteConversacion mia = participante(conversacion, yo, true);
        ParticipanteConversacion ajena = participante(conversacion, interlocutor, false);
        when(conversaciones.findById(15L)).thenReturn(Optional.of(conversacion));
        when(participantes.existsByConversacion_IdConversacionAndUsuario_IdUsuario(15L, 7L))
                .thenReturn(true);
        when(participantes.findConUsuariosPorConversaciones(List.of(15L)))
                .thenReturn(List.of(mia, ajena));
        when(seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(7L, 9L))
                .thenReturn(false);
        when(mensajes.findUltimosPorConversacion(List.of(15L)))
                .thenReturn(List.of(mensaje(101L)));
        ConteoNoLeidosProjection conteo = conteo(15L, 3L);
        when(mensajes.contarNoLeidos(7L, List.of(15L)))
                .thenReturn(List.of(conteo));

        ConversacionResponseDTO dto = service.conversacionPorId(15L, principal);

        assertEquals(15L, dto.id());
        assertEquals(9L, dto.interlocutor().id());
        assertEquals(Boolean.FALSE, dto.interlocutor().loSigo());
        assertEquals(101L, dto.ultimoMensaje().id());
        assertEquals(3L, dto.noLeidos());
        assertTrue(dto.oculta());
    }

    @Test
    void historialVerificaPertenenciaYOrdenEstable() {
        when(conversaciones.findById(15L)).thenReturn(Optional.of(conversacion));
        when(participantes.existsByConversacion_IdConversacionAndUsuario_IdUsuario(15L, 7L))
                .thenReturn(true);
        when(mensajes.findByConversacion_IdConversacionOrderByFechaEnvioDescIdMensajeDesc(
                eq(15L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(mensaje(101L)), PageRequest.of(0, 30), 1));

        Page<MensajeResponseDTO> pagina = service.listarMensajes(15L, 0, 30, principal);

        MensajeResponseDTO dto = pagina.getContent().getFirst();
        assertEquals(101L, dto.id());
        assertEquals(15L, dto.conversacionId());
        assertEquals(9L, dto.remitenteId());
        assertEquals("Hola", dto.contenido());
        assertNull(dto.fechaLectura());
        ArgumentCaptor<Pageable> paginaCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(mensajes).findByConversacion_IdConversacionOrderByFechaEnvioDescIdMensajeDesc(
                eq(15L), paginaCaptor.capture());
        assertEquals("fechaEnvio",
                paginaCaptor.getValue().getSort().getOrderFor("fechaEnvio").getProperty());
        assertEquals(org.springframework.data.domain.Sort.Direction.DESC,
                paginaCaptor.getValue().getSort().getOrderFor("fechaEnvio").getDirection());
        assertEquals("idMensaje",
                paginaCaptor.getValue().getSort().getOrderFor("idMensaje").getProperty());
        assertEquals(org.springframework.data.domain.Sort.Direction.DESC,
                paginaCaptor.getValue().getSort().getOrderFor("idMensaje").getDirection());
    }

    @Test
    void historialDeConversacionAjenaNoConsultaMensajes() {
        when(conversaciones.findById(15L)).thenReturn(Optional.of(conversacion));
        when(participantes.existsByConversacion_IdConversacionAndUsuario_IdUsuario(15L, 7L))
                .thenReturn(false);

        assertThrows(AccessDeniedException.class,
                () -> service.listarMensajes(15L, 0, 30, principal));
        verify(mensajes, never())
                .findByConversacion_IdConversacionOrderByFechaEnvioDescIdMensajeDesc(
                        any(), any());
    }

    @Test
    void enviarGuardaConRemitenteDelJwtYDevuelveDtoPersistido() {
        when(participantes.countByConversacion_IdConversacion(15L)).thenReturn(2L);
        when(conversaciones.findById(15L)).thenReturn(Optional.of(conversacion));
        when(participantes.existsByConversacion_IdConversacionAndUsuario_IdUsuario(15L, 7L))
                .thenReturn(true);
        when(usuarios.findById(7L)).thenReturn(Optional.of(yo));
        when(mensajes.saveAndFlush(any(Mensaje.class))).thenAnswer(invocation -> {
            Mensaje guardado = invocation.getArgument(0);
            guardado.setIdMensaje(102L);
            return guardado;
        });
        ParticipanteConversacion mia = participante(conversacion, yo, false);
        ParticipanteConversacion ajena = participante(conversacion, interlocutor, true);
        when(participantes.findConUsuariosPorConversaciones(List.of(15L)))
                .thenReturn(List.of(mia, ajena));

        MensajeResponseDTO dto = service.enviar(
                15L, new MensajeCreateRequestDTO("  Hola, ¿qué especie?  "), principal);

        ArgumentCaptor<Mensaje> captor = ArgumentCaptor.forClass(Mensaje.class);
        verify(mensajes).saveAndFlush(captor.capture());
        assertEquals(7L, captor.getValue().getRemitente().getIdUsuario());
        assertEquals(15L, captor.getValue().getConversacion().getIdConversacion());
        assertEquals("Hola, ¿qué especie?", captor.getValue().getContenido());
        assertNotNull(captor.getValue().getFechaEnvio());
        assertEquals(102L, dto.id());
        assertEquals(15L, dto.conversacionId());
        assertEquals(7L, dto.remitenteId());
        assertNull(dto.fechaLectura());
        assertFalse(mia.getOculta(), "el remitente conserva su estado");
        assertFalse(ajena.getOculta(), "el mensaje reaparece solo para el destinatario");
        verify(participantes).save(ajena);
        verify(notificaciones).porMensaje(any(Mensaje.class), eq(interlocutor), eq(yo));
        verify(notificaciones, never()).porMensaje(any(), eq(yo), any());
    }

    @Test
    void enviarRechazaContenidoVacioOMuyLargo() {
        when(conversaciones.findById(15L)).thenReturn(Optional.of(conversacion));
        when(participantes.existsByConversacion_IdConversacionAndUsuario_IdUsuario(15L, 7L))
                .thenReturn(true);

        assertThrows(BusinessRuleException.class,
                () -> service.enviar(15L, new MensajeCreateRequestDTO("   "), principal));
        assertThrows(BusinessRuleException.class,
                () -> service.enviar(15L, new MensajeCreateRequestDTO("x".repeat(5001)), principal));
        verify(mensajes, never()).saveAndFlush(any());
        verify(notificaciones, never()).porMensaje(any(), any(), any());
    }

    @Test
    void falloAlGuardarNoGeneraAviso() {
        when(participantes.countByConversacion_IdConversacion(15L)).thenReturn(2L);
        when(conversaciones.findById(15L)).thenReturn(Optional.of(conversacion));
        when(participantes.existsByConversacion_IdConversacionAndUsuario_IdUsuario(15L, 7L)).thenReturn(true);
        when(usuarios.findById(7L)).thenReturn(Optional.of(yo));
        when(mensajes.saveAndFlush(any())).thenThrow(new IllegalStateException("falló MySQL"));
        assertThrows(IllegalStateException.class,
                () -> service.enviar(15L, new MensajeCreateRequestDTO("Hola"), principal));
        verify(notificaciones, never()).porMensaje(any(), any(), any());
    }

    @Test
    void lecturaAvanzaSoloHastaMensajeRecibidoYNoRetrocede() {
        when(conversaciones.findById(15L)).thenReturn(Optional.of(conversacion));
        when(participantes.existsByConversacion_IdConversacionAndUsuario_IdUsuario(15L, 7L)).thenReturn(true);
        ParticipanteConversacion mia = participante(conversacion, yo, false);
        when(participantes.bloquearParaLectura(15L, 7L)).thenReturn(Optional.of(mia));
        when(participantes.findConUsuariosPorConversaciones(List.of(15L)))
                .thenReturn(List.of(mia, participante(conversacion, interlocutor, false)));
        when(mensajes.findUltimosPorConversacion(List.of(15L))).thenReturn(List.of(mensaje(102L)));
        ConteoNoLeidosProjection cero = conteo(15L, 0L);
        when(mensajes.contarNoLeidos(7L, List.of(15L))).thenReturn(List.of(cero));
        Mensaje primero = mensaje(101L);
        Mensaje posterior = mensaje(102L); posterior.setFechaEnvio(primero.getFechaEnvio());
        when(mensajes.findByIdMensajeAndConversacion_IdConversacion(101L, 15L)).thenReturn(Optional.of(primero));
        when(mensajes.findByIdMensajeAndConversacion_IdConversacion(102L, 15L)).thenReturn(Optional.of(posterior));
        assertEquals(0L, service.registrarLectura(15L,
                new com.insectopia.dtos.mensajes.LecturaConversacionRequestDTO(101L), principal).noLeidos());
        assertEquals(101L, mia.getIdUltimoMensajeLeido());
        service.registrarLectura(15L, new com.insectopia.dtos.mensajes.LecturaConversacionRequestDTO(102L), principal);
        service.registrarLectura(15L, new com.insectopia.dtos.mensajes.LecturaConversacionRequestDTO(101L), principal);
        assertEquals(102L, mia.getIdUltimoMensajeLeido());
        verify(participantes, org.mockito.Mockito.times(2)).saveAndFlush(mia);
    }

    @Test
    void lecturaRechazaMensajePropioODeOtroChatYParticipanteAjeno() {
        when(conversaciones.findById(15L)).thenReturn(Optional.of(conversacion));
        when(participantes.existsByConversacion_IdConversacionAndUsuario_IdUsuario(15L, 7L)).thenReturn(true);
        Mensaje propio = mensaje(101L); propio.setRemitente(yo);
        when(mensajes.findByIdMensajeAndConversacion_IdConversacion(101L, 15L)).thenReturn(Optional.of(propio));
        assertThrows(BusinessRuleException.class, () -> service.registrarLectura(15L,
                new com.insectopia.dtos.mensajes.LecturaConversacionRequestDTO(101L), principal));
        assertThrows(ResourceNotFoundException.class, () -> service.registrarLectura(15L,
                new com.insectopia.dtos.mensajes.LecturaConversacionRequestDTO(999L), principal));
        when(participantes.existsByConversacion_IdConversacionAndUsuario_IdUsuario(15L, 7L)).thenReturn(false);
        assertThrows(AccessDeniedException.class, () -> service.registrarLectura(15L,
                new com.insectopia.dtos.mensajes.LecturaConversacionRequestDTO(101L), principal));
        verify(participantes, never()).saveAndFlush(any());
    }

    @Test
    void enviarRechazaConversacionInexistenteYAjena() {
        when(conversaciones.findById(-1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.enviar(-1L, new MensajeCreateRequestDTO("Hola"), principal));

        when(conversaciones.findById(15L)).thenReturn(Optional.of(conversacion));
        when(participantes.existsByConversacion_IdConversacionAndUsuario_IdUsuario(15L, 7L))
                .thenReturn(false);
        assertThrows(AccessDeniedException.class,
                () -> service.enviar(15L, new MensajeCreateRequestDTO("Hola"), principal));
        verify(mensajes, never()).saveAndFlush(any());
    }

    private static Usuario usuario(Long id, String nombre, String alias) {
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(id);
        usuario.setNombre(nombre);
        usuario.setNombreUsuario(alias);
        return usuario;
    }

    private static ParticipanteConversacion participante(
            Conversacion conversacion, Usuario usuario, boolean oculta) {
        ParticipanteConversacion participante = new ParticipanteConversacion();
        participante.setId(new ParticipanteConversacionId(
                conversacion.getIdConversacion(), usuario.getIdUsuario()));
        participante.setConversacion(conversacion);
        participante.setUsuario(usuario);
        participante.setOculta(oculta);
        return participante;
    }

    private Mensaje mensaje(Long id) {
        Mensaje mensaje = new Mensaje();
        mensaje.setIdMensaje(id);
        mensaje.setConversacion(conversacion);
        mensaje.setRemitente(interlocutor);
        mensaje.setContenido("Hola");
        mensaje.setFechaEnvio(LocalDateTime.of(2026, 11, 20, 8, 40));
        return mensaje;
    }

    private static ConteoNoLeidosProjection conteo(Long idConversacion, long total) {
        ConteoNoLeidosProjection projection = mock(ConteoNoLeidosProjection.class);
        lenient().when(projection.getConversacionId()).thenReturn(idConversacion);
        when(projection.getTotal()).thenReturn(total);
        return projection;
    }
}
