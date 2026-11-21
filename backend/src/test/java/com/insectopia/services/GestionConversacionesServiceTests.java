package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.dtos.mensajes.ConversacionResponseDTO;
import com.insectopia.dtos.mensajes.InterlocutorDTO;
import com.insectopia.dtos.mensajes.SeguidoResponseDTO;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Conversacion;
import com.insectopia.models.ParticipanteConversacion;
import com.insectopia.models.Seguidor;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.models.ids.ParticipanteConversacionId;
import com.insectopia.models.ids.SeguidorId;
import com.insectopia.repository.ConversacionRepository;
import com.insectopia.repository.ParticipanteConversacionRepository;
import com.insectopia.repository.SeguidorRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.GestionConversacionesService.ResultadoAbrir;

@ExtendWith(MockitoExtension.class)
class GestionConversacionesServiceTests {

    private static final Long YO = 7L;
    private static final Long DESTINATARIO = 9L;
    private static final Long ID_CONVERSACION = 15L;
    private static final String CLAVE = "directa:7:9";

    @Mock private TransactionTemplate transacciones;
    @Mock private ConversacionRepository conversaciones;
    @Mock private ParticipanteConversacionRepository participantes;
    @Mock private SeguidorRepository seguidores;
    @Mock private UsuarioRepository usuarios;
    @Mock private MensajesService mensajes;

    private GestionConversacionesService service;
    private InsectopiaUserDetails principal;
    private Usuario yo;
    private Usuario destinatario;
    private Conversacion conversacion;
    private ConversacionResponseDTO dto;

    @BeforeEach
    void setUp() {
        service = new GestionConversacionesService(
                transacciones, conversaciones, participantes, seguidores, usuarios, mensajes);
        yo = usuario(YO, "María", "maria", "Bio propia");
        destinatario = usuario(DESTINATARIO, "TinkyW", "tinky", "Observación de escarabajos");
        principal = new InsectopiaUserDetails(YO, "maria@example.test", "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
        conversacion = new Conversacion();
        conversacion.setIdConversacion(ID_CONVERSACION);
        conversacion.setClaveDirecta(CLAVE);
        dto = new ConversacionResponseDTO(
                ID_CONVERSACION,
                new InterlocutorDTO(DESTINATARIO, "TinkyW", "tinky", null, true),
                null,
                0L,
                false);
        lenient().when(usuarios.findById(YO)).thenReturn(Optional.of(yo));
        lenient().when(usuarios.findById(DESTINATARIO)).thenReturn(Optional.of(destinatario));
        ejecutarTransacciones();
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    private void ejecutarTransacciones() {
        lenient().when(transacciones.execute(any(TransactionCallback.class))).thenAnswer(invocation -> {
            TransactionCallback callback = invocation.getArgument(0);
            return callback.doInTransaction(mock(TransactionStatus.class));
        });
    }

    @Test
    void seguidosMapeaSoloCamposPublicosConLosigoExplícito() {
        when(seguidores.buscarSeguidos(eq(YO), eq("%tinky%"), eq(EstadoUsuario.ACTIVO),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(
                        List.of(relacion(yo, destinatario)), PageRequest.of(0, 20), 1));

        Page<SeguidoResponseDTO> pagina = service.listarSeguidos(0, 20, " TINKY ", principal);

        SeguidoResponseDTO seguido = pagina.getContent().getFirst();
        assertEquals(DESTINATARIO, seguido.id());
        assertEquals("TinkyW", seguido.nombre());
        assertEquals("tinky", seguido.nombreUsuario());
        assertEquals("Observación de escarabajos", seguido.descripcion());
        assertEquals(Boolean.TRUE, seguido.loSigo());
        assertEquals(1, pagina.getTotalElements());

        ArgumentCaptor<Pageable> paginaCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(seguidores).buscarSeguidos(eq(YO), eq("%tinky%"), eq(EstadoUsuario.ACTIVO),
                paginaCaptor.capture());
        assertEquals(0, paginaCaptor.getValue().getPageNumber());
        assertEquals(20, paginaCaptor.getValue().getPageSize());
    }

    @Test
    void seguidosDevuelvePaginaVaciaSinFiltrarEnMemoria() {
        when(seguidores.buscarSeguidos(eq(YO), eq(null), eq(EstadoUsuario.ACTIVO),
                any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(1, 20), 0));

        Page<SeguidoResponseDTO> pagina = service.listarSeguidos(1, 20, null, principal);

        assertTrue(pagina.getContent().isEmpty());
        assertEquals(0, pagina.getTotalElements());
        assertEquals(1, pagina.getNumber());
    }

    @Test
    void crearExigeSeguimientoYGuardaExactamenteDosParticipantes() {
        when(conversaciones.findByClaveDirecta(CLAVE)).thenReturn(Optional.empty());
        when(participantes.findDirectasPorParticipantes(eq(YO), eq(DESTINATARIO), anyCollection()))
                .thenReturn(List.of());
        when(seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(YO, DESTINATARIO))
                .thenReturn(true);
        when(conversaciones.saveAndFlush(any(Conversacion.class))).thenAnswer(invocation -> {
            Conversacion guardada = invocation.getArgument(0);
            guardada.setIdConversacion(ID_CONVERSACION);
            return guardada;
        });
        when(participantes.findConUsuariosPorConversaciones(List.of(ID_CONVERSACION)))
                .thenReturn(List.of(
                        participante(conversacion, yo, false),
                        participante(conversacion, destinatario, false)));
        when(participantes.countByConversacion_IdConversacion(ID_CONVERSACION)).thenReturn(2L);
        when(mensajes.conversacionPorId(ID_CONVERSACION, principal)).thenReturn(dto);

        ResultadoAbrir resultado = service.abrir(DESTINATARIO, principal);

        assertTrue(resultado.creada());
        assertEquals(dto, resultado.conversacion());
        verify(conversaciones).saveAndFlush(any(Conversacion.class));
        ArgumentCaptor<ParticipanteConversacion> captor =
                ArgumentCaptor.forClass(ParticipanteConversacion.class);
        verify(participantes, times(2)).saveAndFlush(captor.capture());
        assertEquals(List.of(YO, DESTINATARIO), captor.getAllValues().stream()
                .map(fila -> fila.getUsuario().getIdUsuario()).toList());
        assertTrue(captor.getAllValues().stream()
                .allMatch(fila -> Boolean.FALSE.equals(fila.getOculta())));
    }

    @Test
    void reutilizarExistenteNoExigeSeguimientoYDesocultaSoloAlSolicitante() {
        ParticipanteConversacion mia = participante(conversacion, yo, true);
        ParticipanteConversacion ajena = participante(conversacion, destinatario, true);
        when(conversaciones.findByClaveDirecta(CLAVE)).thenReturn(Optional.of(conversacion));
        when(participantes.findConUsuariosPorConversaciones(List.of(ID_CONVERSACION)))
                .thenReturn(List.of(mia, ajena));
        when(participantes.countByConversacion_IdConversacion(ID_CONVERSACION)).thenReturn(2L);
        when(mensajes.conversacionPorId(ID_CONVERSACION, principal)).thenReturn(dto);

        ResultadoAbrir resultado = service.abrir(DESTINATARIO, principal);

        assertFalse(resultado.creada());
        assertFalse(mia.getOculta());
        assertTrue(ajena.getOculta());
        verify(seguidores, never())
                .existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(YO, DESTINATARIO);
        verify(conversaciones, never()).saveAndFlush(any());
        verify(participantes, never()).saveAndFlush(any());
        verify(participantes).save(mia);
    }

    @Test
    void reutilizaConversacionSemillaCuyaclaveNoEsLaGeneradaPor066() {
        when(conversaciones.findByClaveDirecta(CLAVE)).thenReturn(Optional.empty());
        when(participantes.findDirectasPorParticipantes(eq(YO), eq(DESTINATARIO), anyCollection()))
                .thenReturn(List.of(conversacion));
        when(participantes.findConUsuariosPorConversaciones(List.of(ID_CONVERSACION)))
                .thenReturn(List.of(
                        participante(conversacion, yo, false),
                        participante(conversacion, destinatario, false)));
        when(participantes.countByConversacion_IdConversacion(ID_CONVERSACION)).thenReturn(2L);
        when(mensajes.conversacionPorId(ID_CONVERSACION, principal)).thenReturn(dto);

        ResultadoAbrir resultado = service.abrir(DESTINATARIO, principal);

        assertFalse(resultado.creada());
        verify(conversaciones, never()).saveAndFlush(any());
    }

    @Test
    void nuevaConversacionConDestinatarioNoSeguidoEstaDenegada() {
        when(conversaciones.findByClaveDirecta(CLAVE)).thenReturn(Optional.empty());
        when(participantes.findDirectasPorParticipantes(eq(YO), eq(DESTINATARIO), anyCollection()))
                .thenReturn(List.of());
        when(seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(YO, DESTINATARIO))
                .thenReturn(false);

        assertThrows(AccessDeniedException.class, () -> service.abrir(DESTINATARIO, principal));
        verify(conversaciones, never()).saveAndFlush(any());
        verify(participantes, never()).saveAndFlush(any());
    }

    @Test
    void autoconversacionEsErrorDeValidacion() {
        assertThrows(RegistrationValidationException.class, () -> service.abrir(YO, principal));
        verifyNoInteraccionesDeEscritura();
    }

    @Test
    void destinatarioInexistenteOInactivoNoCreaConversacion() {
        when(usuarios.findById(DESTINATARIO)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.abrir(DESTINATARIO, principal));

        destinatario.setEstado(EstadoUsuario.BLOQUEADO);
        when(usuarios.findById(DESTINATARIO)).thenReturn(Optional.of(destinatario));
        assertThrows(ResourceNotFoundException.class, () -> service.abrir(DESTINATARIO, principal));
        verifyNoInteraccionesDeEscritura();
    }

    @Test
    void carreraPorClaveUnicaReutilizaAlGanadorSinDuplicar() {
        when(conversaciones.findByClaveDirecta(CLAVE))
                .thenReturn(Optional.empty(), Optional.of(conversacion));
        when(participantes.findDirectasPorParticipantes(eq(YO), eq(DESTINATARIO), anyCollection()))
                .thenReturn(List.of());
        when(seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(YO, DESTINATARIO))
                .thenReturn(true);
        when(conversaciones.saveAndFlush(any(Conversacion.class)))
                .thenThrow(new DataIntegrityViolationException("clave duplicada"));
        when(participantes.findConUsuariosPorConversaciones(List.of(ID_CONVERSACION)))
                .thenReturn(List.of(
                        participante(conversacion, yo, false),
                        participante(conversacion, destinatario, false)));
        when(participantes.countByConversacion_IdConversacion(ID_CONVERSACION)).thenReturn(2L);
        when(mensajes.conversacionPorId(ID_CONVERSACION, principal)).thenReturn(dto);

        ResultadoAbrir resultado = service.abrir(DESTINATARIO, principal);

        assertFalse(resultado.creada());
        verify(conversaciones, times(2)).findByClaveDirecta(CLAVE);
        verify(conversaciones, times(1)).saveAndFlush(any());
        verify(participantes, never()).saveAndFlush(any());
    }

    @Test
    void ocultarSoloModificaLaFilaDelAutenticado() {
        ParticipanteConversacion mia = participante(conversacion, yo, false);
        when(conversaciones.existsById(ID_CONVERSACION)).thenReturn(true);
        when(participantes.findByConversacion_IdConversacionAndUsuario_IdUsuario(
                ID_CONVERSACION, YO)).thenReturn(Optional.of(mia));

        service.ocultar(ID_CONVERSACION, principal);

        assertTrue(mia.getOculta());
        verify(participantes).save(mia);
    }

    @Test
    void ocultarRechazaConversacionInexistenteYAjena() {
        when(conversaciones.existsById(15L)).thenReturn(false);
        assertThrows(ResourceNotFoundException.class, () -> service.ocultar(15L, principal));

        when(conversaciones.existsById(16L)).thenReturn(true);
        when(participantes.findByConversacion_IdConversacionAndUsuario_IdUsuario(16L, YO))
                .thenReturn(Optional.empty());
        assertThrows(AccessDeniedException.class, () -> service.ocultar(16L, principal));
    }

    private void verifyNoInteraccionesDeEscritura() {
        verify(conversaciones, never()).saveAndFlush(any());
        verify(participantes, never()).saveAndFlush(any());
        verify(participantes, never()).save(any());
    }

    private static Usuario usuario(Long id, String nombre, String alias, String biografia) {
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(id);
        usuario.setNombre(nombre);
        usuario.setNombreUsuario(alias);
        usuario.setBiografia(biografia);
        usuario.setEstado(EstadoUsuario.ACTIVO);
        return usuario;
    }

    private static Seguidor relacion(Usuario seguidor, Usuario seguido) {
        Seguidor relacion = new Seguidor();
        relacion.setId(new SeguidorId(seguidor.getIdUsuario(), seguido.getIdUsuario()));
        relacion.setSeguidor(seguidor);
        relacion.setSeguido(seguido);
        return relacion;
    }

    private static ParticipanteConversacion participante(
            Conversacion conversacion, Usuario usuario, boolean oculta) {
        ParticipanteConversacion participante = new ParticipanteConversacion();
        participante.setId(new ParticipanteConversacionId(
                conversacion.getIdConversacion(), usuario.getIdUsuario()));
        participante.setConversacion(conversacion);
        participante.setUsuario(usuario);
        participante.setFechaIngreso(LocalDateTime.now());
        participante.setOculta(oculta);
        return participante;
    }
}
