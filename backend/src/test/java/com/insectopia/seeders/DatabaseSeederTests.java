package com.insectopia.seeders;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.models.Comentario;
import com.insectopia.models.Conversacion;
import com.insectopia.models.Evento;
import com.insectopia.models.Mensaje;
import com.insectopia.models.Notificacion;
import com.insectopia.models.ParticipanteConversacion;
import com.insectopia.models.ParticipanteEvento;
import com.insectopia.models.Publicacion;
import com.insectopia.models.Reaccion;
import com.insectopia.models.Reporte;
import com.insectopia.models.Rol;
import com.insectopia.models.Seguidor;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoEvento;
import com.insectopia.models.enums.EstadoParticipanteEvento;
import com.insectopia.models.enums.EstadoPublicacion;
import com.insectopia.models.enums.EstadoReporte;
import com.insectopia.models.ids.ParticipanteConversacionId;
import com.insectopia.models.ids.ParticipanteEventoId;
import com.insectopia.models.ids.SeguidorId;
import com.insectopia.repository.ComentarioRepository;
import com.insectopia.repository.ConversacionRepository;
import com.insectopia.repository.EventoRepository;
import com.insectopia.repository.MensajeRepository;
import com.insectopia.repository.NotificacionRepository;
import com.insectopia.repository.ParticipanteConversacionRepository;
import com.insectopia.repository.ParticipanteEventoRepository;
import com.insectopia.repository.PublicacionRepository;
import com.insectopia.repository.ReaccionRepository;
import com.insectopia.repository.ReporteRepository;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.SeguidorRepository;
import com.insectopia.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DatabaseSeederTests {

    private static final String CLAVE_DEMO = "Demo1234!";

    @Mock
    private RolRepository rolRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PublicacionRepository publicacionRepository;

    @Mock
    private ComentarioRepository comentarioRepository;

    @Mock
    private ReaccionRepository reaccionRepository;

    @Mock
    private ConversacionRepository conversacionRepository;

    @Mock
    private ParticipanteConversacionRepository participanteConversacionRepository;

    @Mock
    private MensajeRepository mensajeRepository;

    @Mock
    private EventoRepository eventoRepository;

    @Mock
    private ParticipanteEventoRepository participanteEventoRepository;

    @Mock
    private SeguidorRepository seguidorRepository;

    @Mock
    private NotificacionRepository notificacionRepository;

    @Mock
    private ReporteRepository reporteRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final AtomicLong secuencia = new AtomicLong();
    private final Map<String, Rol> roles = new LinkedHashMap<>();
    private final Map<String, Usuario> usuariosPorCorreo = new LinkedHashMap<>();
    private final Map<String, Publicacion> publicacionesPorMarca = new LinkedHashMap<>();
    private final Map<Long, List<Comentario>> comentariosPorPublicacion = new LinkedHashMap<>();
    private final Map<String, Reaccion> reaccionesPorClave = new LinkedHashMap<>();
    private final Map<String, Conversacion> conversacionesPorClave = new LinkedHashMap<>();
    private final Map<String, ParticipanteConversacion> participantesPorClave =
            new LinkedHashMap<>();
    private final Map<Long, List<Mensaje>> mensajesPorConversacion =
            new LinkedHashMap<>();
    private final Map<String, Evento> eventosPorMarca = new LinkedHashMap<>();
    private final Map<String, ParticipanteEvento> participantesEventoPorClave =
            new LinkedHashMap<>();
    private final Map<String, Seguidor> seguidoresPorClave = new LinkedHashMap<>();
    private final Map<String, Reporte> reportesPorClave = new LinkedHashMap<>();
    private final Map<String, Notificacion> notificacionesPorMarca =
            new LinkedHashMap<>();

    private DatabaseSeeder seeder;

    @BeforeEach
    void configurar() {

        long id = 1L;
        for (String nombre : List.of("ADMINISTRADOR", "MODERADOR", "USUARIO")) {
            Rol rol = new Rol();
            rol.setIdRol(id++);
            rol.setNombre(nombre);
            roles.put(nombre, rol);
        }

        seeder = new DatabaseSeeder(
                rolRepository,
                usuarioRepository,
                publicacionRepository,
                comentarioRepository,
                reaccionRepository,
                conversacionRepository,
                participanteConversacionRepository,
                mensajeRepository,
                eventoRepository,
                participanteEventoRepository,
                seguidorRepository,
                notificacionRepository,
                reporteRepository,
                passwordEncoder,
                new TransactionTemplate(transactionManager));
    }

    private void configurarRepositorios() {

        when(rolRepository.findByNombre(anyString()))
                .thenAnswer(invocacion -> Optional.ofNullable(
                        roles.get(invocacion.getArgument(0))));

        when(usuarioRepository.findByCorreo(anyString()))
                .thenAnswer(invocacion -> Optional.ofNullable(
                        usuariosPorCorreo.get(invocacion.getArgument(0))));

        when(usuarioRepository.save(any(Usuario.class)))
                .thenAnswer(invocacion -> {
                    Usuario usuario = invocacion.getArgument(0);
                    usuario.setIdUsuario(secuencia.incrementAndGet());
                    usuariosPorCorreo.put(usuario.getCorreo(), usuario);
                    return usuario;
                });

        when(publicacionRepository
                .findByContenidoContainingIgnoreCaseAndEstado(
                        anyString(),
                        any(EstadoPublicacion.class),
                        any(Pageable.class)))
                .thenAnswer(invocacion -> {
                    String marca = invocacion.getArgument(0);
                    List<Publicacion> encontradas = publicacionesPorMarca.values()
                            .stream()
                            .filter(publicacion -> publicacion.getContenido()
                                    .startsWith(marca))
                            .toList();
                    return new PageImpl<>(encontradas);
                });

        when(publicacionRepository.save(any(Publicacion.class)))
                .thenAnswer(invocacion -> {
                    Publicacion publicacion = invocacion.getArgument(0);
                    publicacion.setIdPublicacion(secuencia.incrementAndGet());
                    publicacionesPorMarca.put(
                            marcaDe(publicacion.getContenido()), publicacion);
                    return publicacion;
                });

        when(comentarioRepository
                .findByPublicacion_IdPublicacionOrderByFechaComentarioAsc(
                        any(), any(Pageable.class)))
                .thenAnswer(invocacion -> {
                    Long idPublicacion = invocacion.getArgument(0);
                    return new PageImpl<>(comentariosPorPublicacion
                            .getOrDefault(idPublicacion, List.of()));
                });

        when(comentarioRepository.save(any(Comentario.class)))
                .thenAnswer(invocacion -> {
                    Comentario comentario = invocacion.getArgument(0);
                    comentario.setIdComentario(secuencia.incrementAndGet());
                    comentariosPorPublicacion
                            .computeIfAbsent(
                                    comentario.getPublicacion().getIdPublicacion(),
                                    clave -> new ArrayList<>())
                            .add(comentario);
                    return comentario;
                });

        when(reaccionRepository
                .existsByPublicacion_IdPublicacionAndUsuario_IdUsuario(
                        any(), any()))
                .thenAnswer(invocacion -> reaccionesPorClave.containsKey(
                        claveReaccion(
                                invocacion.getArgument(0),
                                invocacion.getArgument(1))));

        when(reaccionRepository.save(any(Reaccion.class)))
                .thenAnswer(invocacion -> {
                    Reaccion reaccion = invocacion.getArgument(0);
                    reaccion.setIdReaccion(secuencia.incrementAndGet());
                    reaccionesPorClave.put(
                            claveReaccion(
                                    reaccion.getPublicacion().getIdPublicacion(),
                                    reaccion.getUsuario().getIdUsuario()),
                            reaccion);
                    return reaccion;
                });

        when(conversacionRepository.findByClaveDirecta(anyString()))
                .thenAnswer(invocacion -> Optional.ofNullable(
                        conversacionesPorClave.get(
                                invocacion.getArgument(0))));

        when(conversacionRepository.save(any(Conversacion.class)))
                .thenAnswer(invocacion -> {
                    Conversacion conversacion = invocacion.getArgument(0);
                    conversacion.setIdConversacion(
                            secuencia.incrementAndGet());
                    conversacionesPorClave.put(
                            conversacion.getClaveDirecta(), conversacion);
                    return conversacion;
                });

        when(participanteConversacionRepository
                .existsByConversacion_IdConversacionAndUsuario_IdUsuario(
                        any(), any()))
                .thenAnswer(invocacion -> participantesPorClave.containsKey(
                        claveParticipante(
                                invocacion.getArgument(0),
                                invocacion.getArgument(1))));

        when(participanteConversacionRepository
                .save(any(ParticipanteConversacion.class)))
                .thenAnswer(invocacion -> {
                    ParticipanteConversacion participante =
                            invocacion.getArgument(0);
                    ParticipanteConversacionId id = participante.getId();
                    participantesPorClave.put(
                            claveParticipante(
                                    id.getIdConversacion(),
                                    id.getIdUsuario()),
                            participante);
                    return participante;
                });

        when(mensajeRepository
                .findByConversacion_IdConversacionOrderByFechaEnvioDesc(
                        any(), any(Pageable.class)))
                .thenAnswer(invocacion -> {
                    Long idConversacion = invocacion.getArgument(0);
                    return new PageImpl<>(mensajesPorConversacion
                            .getOrDefault(idConversacion, List.of()));
                });

        when(mensajeRepository.save(any(Mensaje.class)))
                .thenAnswer(invocacion -> {
                    Mensaje mensaje = invocacion.getArgument(0);
                    mensaje.setIdMensaje(secuencia.incrementAndGet());
                    mensajesPorConversacion
                            .computeIfAbsent(
                                    mensaje.getConversacion().getIdConversacion(),
                                    clave -> new ArrayList<>())
                            .add(mensaje);
                    return mensaje;
                });

        when(eventoRepository.findByTituloContainingIgnoreCase(
                anyString(), any(Pageable.class)))
                .thenAnswer(invocacion -> {
                    String marca = invocacion.getArgument(0);
                    List<Evento> encontrados = eventosPorMarca.values()
                            .stream()
                            .filter(evento -> evento.getTitulo().contains(marca))
                            .toList();
                    return new PageImpl<>(encontrados);
                });

        when(eventoRepository.save(any(Evento.class)))
                .thenAnswer(invocacion -> {
                    Evento evento = invocacion.getArgument(0);
                    evento.setIdEvento(secuencia.incrementAndGet());
                    eventosPorMarca.put(
                            marcaDe(evento.getTitulo()), evento);
                    return evento;
                });

        when(participanteEventoRepository
                .existsByEvento_IdEventoAndUsuario_IdUsuario(any(), any()))
                .thenAnswer(invocacion -> participantesEventoPorClave
                        .containsKey(claveParticipante(
                                invocacion.getArgument(0),
                                invocacion.getArgument(1))));

        when(participanteEventoRepository.save(any(ParticipanteEvento.class)))
                .thenAnswer(invocacion -> {
                    ParticipanteEvento participante = invocacion.getArgument(0);
                    ParticipanteEventoId id = participante.getId();
                    participantesEventoPorClave.put(
                            claveParticipante(
                                    id.getIdEvento(), id.getIdUsuario()),
                            participante);
                    return participante;
                });

        when(participanteEventoRepository
                .findByEvento_IdEvento(any(), any(Pageable.class)))
                .thenAnswer(invocacion -> {
                    Long idEvento = invocacion.getArgument(0);
                    List<ParticipanteEvento> encontrados =
                            participantesEventoPorClave.values().stream()
                                    .filter(participante -> participante
                                            .getEvento() != null)
                                    .filter(participante -> Objects.equals(
                                            participante.getEvento()
                                                    .getIdEvento(),
                                            idEvento))
                                    .toList();
                    return new PageImpl<>(encontrados);
                });

        when(participanteEventoRepository
                .countByEvento_IdEventoAndEstado(any(), any()))
                .thenAnswer(invocacion -> {
                    Long idEvento = invocacion.getArgument(0);
                    EstadoParticipanteEvento estado =
                            invocacion.getArgument(1);
                    return participantesEventoPorClave.values().stream()
                            .filter(participante -> participante
                                    .getEvento() != null)
                            .filter(participante -> Objects.equals(
                                    participante.getEvento().getIdEvento(),
                                    idEvento))
                            .filter(participante ->
                                    participante.getEstado() == estado)
                            .count();
                });

        doAnswer(invocacion -> {
            ParticipanteEvento participante = invocacion.getArgument(0);
            participantesEventoPorClave.remove(claveParticipante(
                    participante.getEvento().getIdEvento(),
                    participante.getUsuario().getIdUsuario()));
            return null;
        }).when(participanteEventoRepository)
                .delete(any(ParticipanteEvento.class));

        when(mensajeRepository.findAll())
                .thenAnswer(invocacion -> mensajesPorConversacion.values()
                        .stream()
                        .flatMap(List::stream)
                        .toList());

        when(seguidorRepository
                .existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(any(), any()))
                .thenAnswer(invocacion -> seguidoresPorClave.containsKey(
                        claveParticipante(
                                invocacion.getArgument(0),
                                invocacion.getArgument(1))));

        when(seguidorRepository.save(any(Seguidor.class)))
                .thenAnswer(invocacion -> {
                    Seguidor seguidor = invocacion.getArgument(0);
                    SeguidorId id = seguidor.getId();
                    seguidoresPorClave.put(
                            claveParticipante(
                                    id.getIdSeguidor(), id.getIdSeguido()),
                            seguidor);
                    return seguidor;
                });

        when(reporteRepository
                .existsByReportante_IdUsuarioAndPublicacion_IdPublicacion(
                        any(), any()))
                .thenAnswer(invocacion -> reportesPorClave.containsKey(
                        claveParticipante(
                                invocacion.getArgument(0),
                                invocacion.getArgument(1))));

        when(reporteRepository.save(any(Reporte.class)))
                .thenAnswer(invocacion -> {
                    Reporte reporte = invocacion.getArgument(0);
                    reporte.setIdReporte(secuencia.incrementAndGet());
                    reportesPorClave.put(
                            claveParticipante(
                                    reporte.getReportante().getIdUsuario(),
                                    reporte.getPublicacion().getIdPublicacion()),
                            reporte);
                    return reporte;
                });

        when(reporteRepository.findAll())
                .thenAnswer(invocacion -> new ArrayList<>(
                        reportesPorClave.values()));

        when(notificacionRepository.findAll())
                .thenAnswer(invocacion -> new ArrayList<>(
                        notificacionesPorMarca.values()));

        when(notificacionRepository.save(any(Notificacion.class)))
                .thenAnswer(invocacion -> {
                    Notificacion notificacion = invocacion.getArgument(0);
                    notificacion.setIdNotificacion(
                            secuencia.incrementAndGet());
                    notificacionesPorMarca.put(
                            marcaDe(notificacion.getContenido()),
                            notificacion);
                    return notificacion;
                });

        when(transactionManager.getTransaction(any()))
                .thenReturn(new SimpleTransactionStatus());
    }

    @Test
    void crearUsuariosDemoConContrasenaCifradaYRoles() {

        configurarRepositorios();
        seeder.run();

        assertEquals(15, usuariosPorCorreo.size());
        verify(usuarioRepository, times(15)).save(any(Usuario.class));

        assertEquals(1, contarPorRol("ADMINISTRADOR"));
        assertEquals(2, contarPorRol("MODERADOR"));
        assertEquals(12, contarPorRol("USUARIO"));

        for (Usuario usuario : usuariosPorCorreo.values()) {
            assertNotNull(usuario.getRol());
            assertNotEquals(CLAVE_DEMO, usuario.getContrasena());
            assertTrue(passwordEncoder.matches(
                    CLAVE_DEMO,
                    usuario.getContrasena()));
            assertTrue(usuario.getCorreo().startsWith("demo."));
            assertTrue(usuario.getCorreo().endsWith("@insectopia.invalid"));
        }
    }

    @Test
    void crearPublicacionesComentariosYReaccionesDemo() {

        configurarRepositorios();
        seeder.run();

        assertEquals(15, publicacionesPorMarca.size());
        assertEquals(30, totalComentarios());
        assertEquals(30, reaccionesPorClave.size());

        verify(publicacionRepository, times(15)).save(any(Publicacion.class));
        verify(comentarioRepository, times(30)).save(any(Comentario.class));
        verify(reaccionRepository, times(30)).save(any(Reaccion.class));

        for (Comentario comentario : comentariosPorPublicacion.values()
                .stream().flatMap(List::stream).toList()) {
            assertTrue(comentario.getContenido()
                    .startsWith("[DEMO-035-COMENTARIO-"));
            assertNotNull(comentario.getPublicacion());
            assertNotNull(comentario.getUsuario());
        }

        assertTrue(reaccionesPorClave.values().stream()
                .allMatch(reaccion -> List.of("ME_GUSTA", "ME_ENCANTA")
                        .contains(reaccion.getTipo())));
    }

    @Test
    void ejecutarVariosVecesNoDuplicaUsuariosNiPublicaciones() {

        configurarRepositorios();
        seeder.run();
        seeder.run();
        seeder.run();

        assertEquals(15, usuariosPorCorreo.size());
        assertEquals(15, publicacionesPorMarca.size());
        assertEquals(30, totalComentarios());
        assertEquals(30, reaccionesPorClave.size());

        verify(usuarioRepository, times(15)).save(any(Usuario.class));
        verify(publicacionRepository, times(15)).save(any(Publicacion.class));
        verify(comentarioRepository, times(30)).save(any(Comentario.class));
        verify(reaccionRepository, times(30)).save(any(Reaccion.class));
    }

    @Test
    void crearConversacionesParticipantesYMensajesDemo() {

        configurarRepositorios();
        seeder.run();

        assertEquals(15, conversacionesPorClave.size());
        assertEquals(30, participantesPorClave.size());
        assertEquals(50, totalMensajes());

        verify(conversacionRepository, times(15))
                .save(any(Conversacion.class));
        verify(participanteConversacionRepository, times(30))
                .save(any(ParticipanteConversacion.class));
        verify(mensajeRepository, times(50)).save(any(Mensaje.class));

        for (List<Mensaje> mensajes : mensajesPorConversacion.values()) {
            for (Mensaje mensaje : mensajes) {
                assertTrue(mensaje.getContenido()
                        .startsWith("[DEMO-036-MENSAJE-"));
                assertTrue(mensaje.getFechaEnvio()
                        .isAfter(mensaje.getConversacion().getFechaCreacion()));
                assertTrue(participantesPorClave.containsKey(
                        claveParticipante(
                                mensaje.getConversacion().getIdConversacion(),
                                mensaje.getRemitente().getIdUsuario())));
            }
        }
    }

    @Test
    void ejecutarVariosVecesNoDuplicaConversacionesNiMensajes() {

        configurarRepositorios();
        seeder.run();
        seeder.run();

        assertEquals(15, conversacionesPorClave.size());
        assertEquals(30, participantesPorClave.size());
        assertEquals(50, totalMensajes());

        verify(conversacionRepository, times(15))
                .save(any(Conversacion.class));
        verify(participanteConversacionRepository, times(30))
                .save(any(ParticipanteConversacion.class));
        verify(mensajeRepository, times(50)).save(any(Mensaje.class));
    }

    @Test
    void crearEventosYParticipantesDemo() {

        configurarRepositorios();
        seeder.run();

        assertEquals(15, eventosPorMarca.size());
        assertEquals(30, participantesEventoPorClave.size());

        verify(eventoRepository, times(15)).save(any(Evento.class));
        verify(participanteEventoRepository, times(30))
                .save(any(ParticipanteEvento.class));
        verify(participanteEventoRepository, never())
                .delete(any(ParticipanteEvento.class));

        assertEquals(5, contarEventosPorEstado(EstadoEvento.APROBADO));
        assertEquals(5, contarEventosPorEstado(EstadoEvento.PENDIENTE));
        assertEquals(5, contarEventosPorEstado(EstadoEvento.RECHAZADO));

        for (Evento evento : eventosPorMarca.values()) {
            assertTrue(evento.getTitulo().startsWith("[DEMO-037-"));
            assertTrue(evento.getCupoMaximo() > 0);
            assertTrue(!evento.getFechaFin().isBefore(evento.getFechaInicio()));
            if (evento.getEstado() == EstadoEvento.PENDIENTE) {
                assertTrue(evento.getModerador() == null);
            } else {
                assertNotNull(evento.getModerador());
                assertNotNull(evento.getFechaResolucion());
            }
        }

        List<Evento> aprobados = eventosAprobados();
        assertEquals(5, aprobados.size());

        for (Evento evento : aprobados) {
            List<ParticipanteEvento> participantes =
                    participacionesDemoDelEvento(evento);

            assertEquals(6, participantes.size());
            assertTrue(participantes.stream().allMatch(participante ->
                    participante.getEvento().getEstado()
                            == EstadoEvento.APROBADO));
            assertTrue(participantes.stream().allMatch(this::esUsuarioDemo));

            Set<Long> usuariosUnicos = participantes.stream()
                    .map(participante -> participante.getUsuario().getIdUsuario())
                    .collect(Collectors.toSet());
            assertEquals(participantes.size(), usuariosUnicos.size());

            long inscritos = participantes.stream()
                    .filter(participante -> participante.getEstado()
                            == EstadoParticipanteEvento.INSCRITO)
                    .count();
            assertTrue(inscritos <= evento.getCupoMaximo());
            assertEquals(1L, participantes.stream()
                    .filter(participante -> participante.getEstado()
                            == EstadoParticipanteEvento.CANCELADO)
                    .count());
        }

        assertEquals(0L, participantesEventoPorClave.values().stream()
                .filter(participante -> participante.getEvento() != null
                        && participante.getEvento().getEstado()
                                != EstadoEvento.APROBADO)
                .count());

        for (ParticipanteEvento participante
                : participantesEventoPorClave.values()) {
            assertNotNull(participante.getId());
            assertNotNull(participante.getEvento());
            assertNotNull(participante.getUsuario());
            assertEquals(
                    participante.getId().getIdEvento(),
                    participante.getEvento().getIdEvento());
            assertEquals(
                    participante.getId().getIdUsuario(),
                    participante.getUsuario().getIdUsuario());
            assertTrue(List.of(
                    EstadoParticipanteEvento.INSCRITO,
                    EstadoParticipanteEvento.CANCELADO)
                    .contains(participante.getEstado()));
            if (participante.getEstado()
                    == EstadoParticipanteEvento.CANCELADO) {
                assertNotNull(participante.getFechaCancelacion());
                assertTrue(!participante.getFechaCancelacion()
                        .isBefore(participante.getFechaInscripcion()));
            } else {
                assertTrue(participante.getFechaCancelacion() == null);
            }
        }
    }

    @Test
    void ejecutarVariosVecesNoDuplicaEventosNiParticipantes() {

        configurarRepositorios();
        seeder.run();
        seeder.run();
        seeder.run();

        assertEquals(15, eventosPorMarca.size());
        assertEquals(30, participantesEventoPorClave.size());

        verify(eventoRepository, times(15)).save(any(Evento.class));
        verify(participanteEventoRepository, times(30))
                .save(any(ParticipanteEvento.class));
        verify(participanteEventoRepository, never())
                .delete(any(ParticipanteEvento.class));
    }

    @Test
    void corrigeParticipacionesDemoAnterioresSinTocarRegistrosAjenos() {

        configurarRepositorios();
        seeder.run();

        cargarEstadoLegacy();

        Evento pendiente = eventosPorMarca.values().stream()
                .filter(evento -> evento.getEstado()
                        == EstadoEvento.PENDIENTE)
                .findFirst()
                .orElseThrow();

        Usuario usuarioReal = new Usuario();
        usuarioReal.setIdUsuario(999L);
        usuarioReal.setCorreo("usuario.real@example.com");
        ParticipanteEvento participacionReal = new ParticipanteEvento();
        participacionReal.setId(new ParticipanteEventoId(
                pendiente.getIdEvento(), usuarioReal.getIdUsuario()));
        participacionReal.setEvento(pendiente);
        participacionReal.setUsuario(usuarioReal);
        participacionReal.setFechaInscripcion(
                pendiente.getFechaCreacion().plusDays(2));
        participacionReal.setEstado(EstadoParticipanteEvento.INSCRITO);
        participantesEventoPorClave.put(
                claveParticipante(
                        pendiente.getIdEvento(), usuarioReal.getIdUsuario()),
                participacionReal);

        clearInvocations(participanteEventoRepository);

        seeder.run();

        verify(participanteEventoRepository, times(20))
                .delete(any(ParticipanteEvento.class));
        verify(participanteEventoRepository, never())
                .delete(argThat(participante -> participante.getUsuario() != null
                        && Long.valueOf(999L).equals(
                                participante.getUsuario().getIdUsuario())));

        assertTrue(participantesEventoPorClave.containsKey(claveParticipante(
                pendiente.getIdEvento(), usuarioReal.getIdUsuario())));

        List<ParticipanteEvento> demo = participantesEventoPorClave.values()
                .stream()
                .filter(this::esUsuarioDemo)
                .toList();
        assertEquals(30, demo.size());
        assertTrue(demo.stream().allMatch(participante ->
                participante.getEvento().getEstado()
                        == EstadoEvento.APROBADO));

        for (Evento evento : eventosAprobados()) {
            assertEquals(6, participacionesDemoDelEvento(evento).size());
        }

        clearInvocations(participanteEventoRepository);

        seeder.run();

        verify(participanteEventoRepository, never())
                .save(any(ParticipanteEvento.class));
        verify(participanteEventoRepository, never())
                .delete(any(ParticipanteEvento.class));
        assertEquals(31, participantesEventoPorClave.size());
    }

    @Test
    void crearSeguidoresNotificacionesYReportesDemo() {

        configurarRepositorios();
        seeder.run();

        assertEquals(20, seguidoresPorClave.size());
        assertEquals(15, reportesPorClave.size());
        assertEquals(20, notificacionesPorMarca.size());

        verify(seguidorRepository, times(20)).save(any(Seguidor.class));
        verify(reporteRepository, times(15)).save(any(Reporte.class));
        verify(notificacionRepository, times(20))
                .save(any(Notificacion.class));

        assertEquals(4, contarReportesPorEstado(EstadoReporte.PENDIENTE));
        assertEquals(4, contarReportesPorEstado(EstadoReporte.EN_REVISION));
        assertEquals(4, contarReportesPorEstado(EstadoReporte.RESUELTO));
        assertEquals(3, contarReportesPorEstado(EstadoReporte.RECHAZADO));

        for (Seguidor seguidor : seguidoresPorClave.values()) {
            assertNotNull(seguidor.getSeguidor());
            assertNotNull(seguidor.getSeguido());
            assertNotEquals(
                    seguidor.getSeguidor().getIdUsuario(),
                    seguidor.getSeguido().getIdUsuario());
        }

        for (Reporte reporte : reportesPorClave.values()) {
            assertTrue(reporte.getDescripcion().startsWith("[DEMO-038-REPORTE-"));
            assertNotNull(reporte.getReportante());
            assertNotNull(reporte.getPublicacion());
            if (reporte.getEstado() == EstadoReporte.PENDIENTE
                    || reporte.getEstado() == EstadoReporte.EN_REVISION) {
                assertTrue(reporte.getModerador() == null);
                assertTrue(reporte.getFechaResolucion() == null);
            } else {
                assertNotNull(reporte.getModerador());
                assertNotNull(reporte.getResolucion());
                assertNotNull(reporte.getFechaResolucion());
            }
        }

        for (Notificacion notificacion : notificacionesPorMarca.values()) {
            assertTrue(notificacion.getContenido()
                    .startsWith("[DEMO-038-NOTIFICACION-"));
            assertNotNull(notificacion.getDestinatario());
            assertNotNull(notificacion.getActor());
            assertNotNull(notificacion.getTipo());
        }

        assertEquals(4, contarNotificacionesPorTipo("NUEVO_REPORTE"));
        for (Notificacion notificacion : notificacionesPorMarca.values()) {
            if ("NUEVO_REPORTE".equals(notificacion.getTipo())) {
                assertNotNull(notificacion.getReporte());
            }
        }
    }

    @Test
    void ejecutarVariosVecesNoDuplicaSeguidoresNotificacionesNiReportes() {

        configurarRepositorios();
        seeder.run();
        seeder.run();
        seeder.run();

        assertEquals(20, seguidoresPorClave.size());
        assertEquals(15, reportesPorClave.size());
        assertEquals(20, notificacionesPorMarca.size());

        verify(seguidorRepository, times(20)).save(any(Seguidor.class));
        verify(reporteRepository, times(15)).save(any(Reporte.class));
        verify(notificacionRepository, times(20))
                .save(any(Notificacion.class));
    }

    @Test
    void seederSoloEstaActivoConPerfilDemo() {

        Profile perfil = DatabaseSeeder.class.getAnnotation(Profile.class);

        assertNotNull(perfil);
        assertArrayEquals(new String[] { "demo" }, perfil.value());
    }

    private List<Evento> eventosAprobados() {
        return eventosPorMarca.values().stream()
                .filter(evento -> evento.getEstado()
                        == EstadoEvento.APROBADO)
                .toList();
    }

    private List<ParticipanteEvento> participacionesDemoDelEvento(
            Evento evento) {
        return participantesEventoPorClave.values().stream()
                .filter(participante -> participante.getEvento() != null)
                .filter(participante -> Objects.equals(
                        participante.getEvento().getIdEvento(),
                        evento.getIdEvento()))
                .filter(this::esUsuarioDemo)
                .toList();
    }

    private boolean esUsuarioDemo(ParticipanteEvento participante) {
        return participante.getUsuario() != null
                && participante.getUsuario().getCorreo() != null
                && participante.getUsuario().getCorreo().startsWith("demo.")
                && participante.getUsuario().getCorreo()
                        .endsWith("@insectopia.invalid");
    }

    /**
     * Recrea el estado de una base poblada por la versión anterior del
     * seeder: dos participaciones por evento, con fecha de inscripción
     * igual a fecha_creacion + 2 días.
     */
    private void cargarEstadoLegacy() {

        participantesEventoPorClave.clear();

        List<Evento> eventos = new ArrayList<>(eventosPorMarca.values());
        List<Usuario> usuarios = new ArrayList<>(usuariosPorCorreo.values());

        for (int i = 0; i < eventos.size(); i++) {

            Evento evento = eventos.get(i);

            for (int j = 0; j < 2; j++) {

                Usuario usuario = usuarios.get((i + 5 + j) % usuarios.size());
                ParticipanteEvento participante = new ParticipanteEvento();
                participante.setId(new ParticipanteEventoId(
                        evento.getIdEvento(), usuario.getIdUsuario()));
                participante.setEvento(evento);
                participante.setUsuario(usuario);
                participante.setFechaInscripcion(
                        evento.getFechaCreacion().plusDays(2));

                if (i % 5 == 0 && j == 1) {
                    participante.setEstado(
                            EstadoParticipanteEvento.CANCELADO);
                    participante.setFechaCancelacion(
                            participante.getFechaInscripcion().plusDays(1));
                } else {
                    participante.setEstado(
                            EstadoParticipanteEvento.INSCRITO);
                }

                participantesEventoPorClave.put(
                        claveParticipante(
                                evento.getIdEvento(), usuario.getIdUsuario()),
                        participante);
            }
        }
    }

    private long contarPorRol(String nombreRol) {
        return usuariosPorCorreo.values().stream()
                .filter(usuario -> nombreRol.equals(usuario.getRol().getNombre()))
                .count();
    }

    private int totalComentarios() {
        return comentariosPorPublicacion.values().stream()
                .mapToInt(List::size)
                .sum();
    }

    private static String marcaDe(String contenido) {
        return contenido.substring(0, contenido.indexOf(']') + 1);
    }

    private static String claveReaccion(Long idPublicacion, Long idUsuario) {
        return idPublicacion + ":" + idUsuario;
    }

    private static String claveParticipante(
            Long idConversacion, Long idUsuario) {
        return idConversacion + ":" + idUsuario;
    }

    private int totalMensajes() {
        return mensajesPorConversacion.values().stream()
                .mapToInt(List::size)
                .sum();
    }

    private long contarEventosPorEstado(EstadoEvento estado) {
        return eventosPorMarca.values().stream()
                .filter(evento -> evento.getEstado() == estado)
                .count();
    }

    private long contarReportesPorEstado(EstadoReporte estado) {
        return reportesPorClave.values().stream()
                .filter(reporte -> reporte.getEstado() == estado)
                .count();
    }

    private long contarNotificacionesPorTipo(String tipo) {
        return notificacionesPorMarca.values().stream()
                .filter(notificacion -> tipo.equals(notificacion.getTipo()))
                .count();
    }
}
