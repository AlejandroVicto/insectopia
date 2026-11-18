package com.insectopia.seeders;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
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
import com.insectopia.models.enums.EstadoUsuario;
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

@Component
@Profile("demo")
public class DatabaseSeeder implements CommandLineRunner {

    private static final String CLAVE_DEMO = "Demo1234!";

    private static final String MARCA_PUBLICACION =
            "[DEMO-035-PUBLICACION-";
    private static final String MARCA_COMENTARIO =
            "[DEMO-035-COMENTARIO-";
    private static final String PREFIJO_CLAVE_CONVERSACION =
            "DEMO-036-CONV-";
    private static final String MARCA_MENSAJE =
            "[DEMO-036-MENSAJE-";
    private static final String MARCA_EVENTO =
            "[DEMO-037-";
    private static final String MARCA_REPORTE =
            "[DEMO-038-REPORTE-";
    private static final String MARCA_NOTIFICACION =
            "[DEMO-038-NOTIFICACION-";

    private static final List<String> MOTIVOS_REPORTE = List.of(
            "Contenido inapropiado de demostración",
            "Datos ficticios confusos",
            "Spam de demostración",
            "Imagen no relacionada con insectos",
            "Lenguaje ofensivo de demostración");

    private static final List<String> TIPOS_NOTIFICACION = List.of(
            "NUEVO_SEGUIDOR",
            "NUEVA_PUBLICACION",
            "NUEVO_MENSAJE",
            "EVENTO_APROBADO",
            "NUEVO_REPORTE");

    private static final List<String> TITULOS_EVENTO = List.of(
            "Jornada ficticia de mariposas azules",
            "Taller ficticio de escarabajos de colores",
            "Caminata ficticia para observar libélulas",
            "Encuentro ficticio sobre abejas solitarias",
            "Ruta ficticia de hormigas y hojas",
            "Noche ficticia de saltamontes",
            "Fotografía ficticia de chinches",
            "Observación ficticia de mariposas nocturnas",
            "Visita ficticia a una mantis",
            "Jornada ficticia de polinización",
            "Concierto ficticio de grillos",
            "Expedición ficticia al escarabajo rinoceronte",
            "Taller ficticio de avispas constructoras",
            "Paseo ficticio entre toxorquas",
            "Seguimiento ficticio de mariposas migratorias");

    private static final List<String> UBICACIONES_EVENTO = List.of(
            "Jardín ficticio de las Mariposas",
            "Bosque ficticio de los Coleópteros",
            "Laguna ficticia de las Libélulas",
            "Huerto ficticio de las Abejas",
            "Sendero ficticio de las Hormigas",
            "Pradera ficticia de los Grillos",
            "Muro ficticio de las Chinches",
            "Linterna ficticia del Valle",
            "Invernadero ficticio de las Mantis",
            "Huerto ficticio de la Polinización",
            "Campo ficticio de los Grillos Cantores",
            "Tronco ficticio del Rinoceronte",
            "Nido ficticio de las Avispas",
            "Camino ficticio de las Toxorquas",
            "Valle ficticio de la Migración");

    private static final List<String> TEMAS = List.of(
            "una mariposa azul en el jardín ficticio",
            "escarabajos de colores en el bosque ficticio",
            "libélulas sobre la laguna ficticia",
            "abejas solitarias entre flores ficticias",
            "hormigas transportando hojas ficticias",
            "un saltamontes en la pradera ficticia",
            "chinches de colores en el muro ficticio",
            "mariposas nocturnas junto a la linterna ficticia",
            "una mantis en el invernadero ficticio",
            "polinizadores en el huerto ficticio",
            "grillos en la noche ficticia",
            "un escarabajo rinoceronte en el tronco ficticio",
            "avispas constructoras de nidos ficticios",
            "toxorquas en el sendero ficticio",
            "mariposas migrando sobre el valle ficticio");

    private static final List<UsuarioDemo> USUARIOS_DEMO = List.of(
            new UsuarioDemo(
                    "Demo Marina Vega",
                    "demo.marina.vega@insectopia.invalid",
                    "ADMINISTRADOR",
                    "+34600000001",
                    "Administradora ficticia del ecosistema de demostración."),
            new UsuarioDemo(
                    "Demo Iker Salas",
                    "demo.iker.salas@insectopia.invalid",
                    "MODERADOR",
                    "+34600000002",
                    "Moderador ficticio de eventos y reportes de insectos."),
            new UsuarioDemo(
                    "Demo Lucia Ferrer",
                    "demo.lucia.ferrer@insectopia.invalid",
                    "MODERADOR",
                    "+34600000003",
                    "Moderadora ficticia dedicada a la observación de mariposas."),
            new UsuarioDemo(
                    "Demo Andres Mora",
                    "demo.andres.mora@insectopia.invalid",
                    "USUARIO",
                    "+34600000004",
                    "Aficionado ficticio a los escarabajos del bosque."),
            new UsuarioDemo(
                    "Demo Clara Rios",
                    "demo.clara.rios@insectopia.invalid",
                    "USUARIO",
                    "+34600000005",
                    "Observadora ficticia de libélulas en humedales."),
            new UsuarioDemo(
                    "Demo Bruno Gil",
                    "demo.bruno.gil@insectopia.invalid",
                    "USUARIO",
                    "+34600000006",
                    "Explorador ficticio de hormigas y sus caminos."),
            new UsuarioDemo(
                    "Demo Elena Pardo",
                    "demo.elena.pardo@insectopia.invalid",
                    "USUARIO",
                    "+34600000007",
                    "Naturalista ficticia interesada en las abejas solitarias."),
            new UsuarioDemo(
                    "Demo Hector Ruiz",
                    "demo.hector.ruiz@insectopia.invalid",
                    "USUARIO",
                    "+34600000008",
                    "Fotógrafo ficticio de chinches y coloridos coleópteros."),
            new UsuarioDemo(
                    "Demo Nora Vidal",
                    "demo.nora.vidal@insectopia.invalid",
                    "USUARIO",
                    "+34600000009",
                    "Estudiante ficticia de metamorfosis de insectos."),
            new UsuarioDemo(
                    "Demo Oscar Lemos",
                    "demo.oscar.lemos@insectopia.invalid",
                    "USUARIO",
                    "+34600000010",
                    "Cuidador ficticio de un jardín de mariposas."),
            new UsuarioDemo(
                    "Demo Sara Quintero",
                    "demo.sara.quintero@insectopia.invalid",
                    "USUARIO",
                    "+34600000011",
                    "Investigadora ficticia de grasas y flores silvestres."),
            new UsuarioDemo(
                    "Demo Mateo Cano",
                    "demo.mateo.cano@insectopia.invalid",
                    "USUARIO",
                    "+34600000012",
                    "Excursionista ficticio que cataloga saltamontes."),
            new UsuarioDemo(
                    "Demo Iris Beltran",
                    "demo.iris.beltran@insectopia.invalid",
                    "USUARIO",
                    "+34600000013",
                    "Ilustradora ficticia de insectos de la Luna de Miel."),
            new UsuarioDemo(
                    "Demo Pablo Cedeno",
                    "demo.pablo.cedeno@insectopia.invalid",
                    "USUARIO",
                    "+34600000014",
                    "Guía ficticio de rutas de observación nocturna."),
            new UsuarioDemo(
                    "Demo Alma Trujillo",
                    "demo.alma.trujillo@insectopia.invalid",
                    "USUARIO",
                    "+34600000015",
                    "Divulgadora ficticia sobre polinización y biodiversidad."));

    private record UsuarioDemo(
            String nombre,
            String correo,
            String rol,
            String telefono,
            String biografia) {
    }

    private final RolRepository rolRepository;
    private final UsuarioRepository usuarioRepository;
    private final PublicacionRepository publicacionRepository;
    private final ComentarioRepository comentarioRepository;
    private final ReaccionRepository reaccionRepository;
    private final ConversacionRepository conversacionRepository;
    private final ParticipanteConversacionRepository participanteConversacionRepository;
    private final MensajeRepository mensajeRepository;
    private final EventoRepository eventoRepository;
    private final ParticipanteEventoRepository participanteEventoRepository;
    private final SeguidorRepository seguidorRepository;
    private final NotificacionRepository notificacionRepository;
    private final ReporteRepository reporteRepository;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate transactionTemplate;

    public DatabaseSeeder(
            RolRepository rolRepository,
            UsuarioRepository usuarioRepository,
            PublicacionRepository publicacionRepository,
            ComentarioRepository comentarioRepository,
            ReaccionRepository reaccionRepository,
            ConversacionRepository conversacionRepository,
            ParticipanteConversacionRepository participanteConversacionRepository,
            MensajeRepository mensajeRepository,
            EventoRepository eventoRepository,
            ParticipanteEventoRepository participanteEventoRepository,
            SeguidorRepository seguidorRepository,
            NotificacionRepository notificacionRepository,
            ReporteRepository reporteRepository,
            PasswordEncoder passwordEncoder,
            TransactionTemplate transactionTemplate) {

        this.rolRepository = rolRepository;
        this.usuarioRepository = usuarioRepository;
        this.publicacionRepository = publicacionRepository;
        this.comentarioRepository = comentarioRepository;
        this.reaccionRepository = reaccionRepository;
        this.conversacionRepository = conversacionRepository;
        this.participanteConversacionRepository = participanteConversacionRepository;
        this.mensajeRepository = mensajeRepository;
        this.eventoRepository = eventoRepository;
        this.participanteEventoRepository = participanteEventoRepository;
        this.seguidorRepository = seguidorRepository;
        this.notificacionRepository = notificacionRepository;
        this.reporteRepository = reporteRepository;
        this.passwordEncoder = passwordEncoder;
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    public void run(String... args) {

        System.out.println("[DEMO] Iniciando DatabaseSeeder...");

        transactionTemplate.executeWithoutResult(status -> {

            Map<String, Rol> roles = verificarRoles();
            List<Usuario> usuarios = new ArrayList<>(
                    crearUsuariosSiNoExisten(roles).values());

            System.out.println(
                    "[DEMO] Usuarios de demostración disponibles: " + usuarios.size());

            crearPublicacionesComentariosYReacciones(usuarios);
            crearConversacionesYMensajes(usuarios);
            crearEventosYParticipantes(usuarios);
            crearSeguidoresNotificacionesYReportes(usuarios);
        });

        System.out.println("[DEMO] DatabaseSeeder finalizado.");
    }

    private Map<String, Rol> verificarRoles() {

        String[] nombres = {
            "ADMINISTRADOR",
            "MODERADOR",
            "USUARIO"
        };

        Map<String, Rol> roles = new LinkedHashMap<>();

        for (String nombre : nombres) {

            Rol rol = rolRepository.findByNombre(nombre)
                    .orElseThrow(() -> new IllegalStateException(
                            "No existe el rol requerido: " + nombre));

            roles.put(nombre, rol);
        }

        System.out.println("[DEMO] Los tres roles están disponibles.");

        return roles;
    }

    private Map<String, Usuario> crearUsuariosSiNoExisten(
            Map<String, Rol> roles) {

        Map<String, Usuario> usuarios = new LinkedHashMap<>();

        for (UsuarioDemo datos : USUARIOS_DEMO) {

            Usuario usuario = usuarioRepository.findByCorreo(datos.correo())
                    .orElseGet(() -> crearUsuario(datos, roles.get(datos.rol())));

            usuarios.put(datos.correo(), usuario);
        }

        return usuarios;
    }

    private Usuario crearUsuario(UsuarioDemo datos, Rol rol) {

        Usuario usuario = new Usuario();

        usuario.setRol(rol);
        usuario.setNombre(datos.nombre());
        usuario.setCorreo(datos.correo());
        usuario.setContrasena(passwordEncoder.encode(CLAVE_DEMO));
        usuario.setTelefono(datos.telefono());
        usuario.setBiografia(datos.biografia());
        usuario.setEstado(EstadoUsuario.ACTIVO);
        usuario.setRecibirSms(Boolean.FALSE);
        usuario.setRecibirWhatsapp(Boolean.FALSE);
        usuario.setVersionToken(0);

        return usuarioRepository.save(usuario);
    }

    private void crearPublicacionesComentariosYReacciones(
            List<Usuario> usuarios) {

        List<Publicacion> publicaciones = new ArrayList<>();

        for (int i = 0; i < 15; i++) {
            publicaciones.add(obtenerOCrearPublicacion(i, usuarios.get(i)));
        }

        for (int i = 0; i < 15; i++) {
            Publicacion publicacion = publicaciones.get(i);
            crearComentarios(publicacion, i, usuarios);
            crearReacciones(publicacion, i, usuarios);
        }
    }

    private Publicacion obtenerOCrearPublicacion(
            int indice, Usuario usuario) {

        String marca = MARCA_PUBLICACION + numero(indice + 1) + "]";

        return publicacionRepository
                .findByContenidoContainingIgnoreCaseAndEstado(
                        marca,
                        EstadoPublicacion.VISIBLE,
                        PageRequest.of(0, 100))
                .getContent()
                .stream()
                .filter(publicacion -> publicacion.getContenido() != null
                        && publicacion.getContenido().startsWith(marca))
                .findFirst()
                .orElseGet(() -> {
                    Publicacion publicacion = new Publicacion();
                    publicacion.setUsuario(usuario);
                    publicacion.setContenido(
                            marca + " " + TEMAS.get(indice)
                                    + ". Publicación ficticia de Insectopia.");
                    publicacion.setEstado(EstadoPublicacion.VISIBLE);
                    return publicacionRepository.save(publicacion);
                });
    }

    private void crearComentarios(
            Publicacion publicacion, int indice, List<Usuario> usuarios) {

        List<Comentario> existentes = comentarioRepository
                .findByPublicacion_IdPublicacionOrderByFechaComentarioAsc(
                        publicacion.getIdPublicacion(),
                        PageRequest.of(0, 100))
                .getContent();

        for (int j = 0; j < 2; j++) {

            String marca = MARCA_COMENTARIO
                    + numero(indice + 1) + "-" + (j + 1) + "]";

            boolean yaExiste = existentes.stream()
                    .anyMatch(comentario -> comentario.getContenido() != null
                            && comentario.getContenido().startsWith(marca));

            if (yaExiste) {
                continue;
            }

            Comentario comentario = new Comentario();
            comentario.setPublicacion(publicacion);
            comentario.setUsuario(usuarios.get((indice + j) % 15));
            comentario.setContenido(
                    marca + " Comentario ficticio sobre "
                            + TEMAS.get(indice) + ".");

            comentarioRepository.save(comentario);
        }
    }

    private void crearReacciones(
            Publicacion publicacion, int indice, List<Usuario> usuarios) {

        for (int j = 0; j < 2; j++) {

            Usuario usuario = usuarios.get((indice * 2 + j) % 15);

            if (reaccionRepository
                    .existsByPublicacion_IdPublicacionAndUsuario_IdUsuario(
                            publicacion.getIdPublicacion(),
                            usuario.getIdUsuario())) {
                continue;
            }

            Reaccion reaccion = new Reaccion();
            reaccion.setPublicacion(publicacion);
            reaccion.setUsuario(usuario);
            reaccion.setTipo(j == 0 ? "ME_GUSTA" : "ME_ENCANTA");

            reaccionRepository.save(reaccion);
        }
    }

    private void crearConversacionesYMensajes(List<Usuario> usuarios) {

        List<Conversacion> conversaciones = new ArrayList<>();

        for (int i = 0; i < 15; i++) {

            int indice = i;
            String clave = PREFIJO_CLAVE_CONVERSACION + numero(i + 1);

            Conversacion conversacion = conversacionRepository
                    .findByClaveDirecta(clave)
                    .orElseGet(() -> crearConversacion(clave, indice));

            conversaciones.add(conversacion);
            crearParticipantesConversacion(conversacion, i, usuarios);
        }

        int[] contadorMensajes = new int[15];

        for (int i = 0; i < 50; i++) {

            int indiceConversacion = i % 15;
            int numeroMensaje = ++contadorMensajes[indiceConversacion];

            crearMensajeSiNoExiste(
                    conversaciones.get(indiceConversacion),
                    usuarios.get(
                            (indiceConversacion + (numeroMensaje - 1) % 2) % 15),
                    indiceConversacion,
                    numeroMensaje);
        }
    }

    private Conversacion crearConversacion(String clave, int indice) {

        Conversacion conversacion = new Conversacion();
        conversacion.setClaveDirecta(clave);
        conversacion.setFechaCreacion(
                LocalDateTime.now().minusDays(30).plusDays(indice));

        return conversacionRepository.save(conversacion);
    }

    private void crearParticipantesConversacion(
            Conversacion conversacion, int indice, List<Usuario> usuarios) {

        for (int j = 0; j < 2; j++) {

            Usuario usuario = usuarios.get((indice + j) % 15);

            if (participanteConversacionRepository
                    .existsByConversacion_IdConversacionAndUsuario_IdUsuario(
                            conversacion.getIdConversacion(),
                            usuario.getIdUsuario())) {
                continue;
            }

            ParticipanteConversacion participante =
                    new ParticipanteConversacion();

            participante.setId(new ParticipanteConversacionId(
                    conversacion.getIdConversacion(),
                    usuario.getIdUsuario()));
            participante.setConversacion(conversacion);
            participante.setUsuario(usuario);
            participante.setFechaIngreso(
                    conversacion.getFechaCreacion().plusMinutes(1L + j));
            participante.setOculta(Boolean.FALSE);

            participanteConversacionRepository.save(participante);
        }
    }

    private void crearMensajeSiNoExiste(
            Conversacion conversacion,
            Usuario remitente,
            int indiceConversacion,
            int numeroMensaje) {

        String marca = MARCA_MENSAJE
                + numero(indiceConversacion + 1)
                + "-" + numero(numeroMensaje) + "]";

        boolean yaExiste = mensajeRepository
                .findByConversacion_IdConversacionOrderByFechaEnvioDesc(
                        conversacion.getIdConversacion(),
                        PageRequest.of(0, 100))
                .getContent()
                .stream()
                .anyMatch(mensaje -> mensaje.getContenido() != null
                        && mensaje.getContenido().startsWith(marca));

        if (yaExiste) {
            return;
        }

        Mensaje mensaje = new Mensaje();
        mensaje.setConversacion(conversacion);
        mensaje.setRemitente(remitente);
        mensaje.setContenido(
                marca + " Mensaje ficticio sobre "
                        + TEMAS.get(indiceConversacion) + ".");
        mensaje.setFechaEnvio(
                conversacion.getFechaCreacion()
                        .plusMinutes(10L * numeroMensaje));

        mensajeRepository.save(mensaje);
    }

    private void crearEventosYParticipantes(List<Usuario> usuarios) {

        for (int i = 0; i < 15; i++) {

            int indice = i;
            String marca = MARCA_EVENTO + numero(i + 1) + "]";
            String titulo = marca + " " + TITULOS_EVENTO.get(i);

            Evento evento = eventoRepository
                    .findByTituloContainingIgnoreCase(
                            marca, PageRequest.of(0, 10))
                    .getContent()
                    .stream()
                    .filter(candidato -> titulo.equals(candidato.getTitulo()))
                    .findFirst()
                    .orElseGet(() -> crearEvento(indice, titulo, usuarios));

            crearParticipantesEvento(evento, i, usuarios);
        }
    }

    private Evento crearEvento(
            int indice, String titulo, List<Usuario> usuarios) {

        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime fechaCreacion =
                ahora.minusDays(30).plusDays(indice);
        LocalDateTime fechaInicio = ahora.plusDays(10L + indice)
                .withHour(10).withMinute(0).withSecond(0).withNano(0);

        EstadoEvento estado = switch (indice % 3) {
            case 0 -> EstadoEvento.APROBADO;
            case 1 -> EstadoEvento.PENDIENTE;
            default -> EstadoEvento.RECHAZADO;
        };

        Evento evento = new Evento();
        evento.setProponente(usuarios.get((indice + 3) % 15));
        evento.setModerador(
                estado == EstadoEvento.PENDIENTE ? null : usuarios.get(1));
        evento.setTitulo(titulo);
        evento.setDescripcion(
                "Descripción ficticia de demostración: "
                        + TITULOS_EVENTO.get(indice) + ".");
        evento.setUbicacion(UBICACIONES_EVENTO.get(indice));
        evento.setFechaInicio(fechaInicio);
        evento.setFechaFin(fechaInicio.plusHours(2));
        evento.setCupoMaximo(10 + indice);
        evento.setEstado(estado);
        evento.setFechaCreacion(fechaCreacion);
        evento.setFechaActualizacion(fechaCreacion);

        if (estado != EstadoEvento.PENDIENTE) {
            evento.setMotivoResolucion(
                    "Resolución ficticia de demostración.");
            evento.setFechaResolucion(fechaCreacion.plusDays(1));
        }

        return eventoRepository.save(evento);
    }

    private void crearParticipantesEvento(
            Evento evento, int indice, List<Usuario> usuarios) {

        for (int j = 0; j < 2; j++) {

            Usuario usuario = usuarios.get((indice + 5 + j) % 15);

            if (participanteEventoRepository
                    .existsByEvento_IdEventoAndUsuario_IdUsuario(
                            evento.getIdEvento(),
                            usuario.getIdUsuario())) {
                continue;
            }

            ParticipanteEvento participante = new ParticipanteEvento();
            participante.setId(new ParticipanteEventoId(
                    evento.getIdEvento(), usuario.getIdUsuario()));
            participante.setEvento(evento);
            participante.setUsuario(usuario);
            participante.setFechaInscripcion(
                    evento.getFechaCreacion().plusDays(2));

            if (indice % 5 == 0 && j == 1) {
                participante.setEstado(EstadoParticipanteEvento.CANCELADO);
                participante.setFechaCancelacion(
                        participante.getFechaInscripcion().plusDays(1));
            } else {
                participante.setEstado(EstadoParticipanteEvento.INSCRITO);
            }

            participanteEventoRepository.save(participante);
        }
    }

    private void crearSeguidoresNotificacionesYReportes(
            List<Usuario> usuarios) {

        crearSeguidores(usuarios);

        List<Publicacion> publicaciones =
                publicacionRepository
                        .findByContenidoContainingIgnoreCaseAndEstado(
                                MARCA_PUBLICACION,
                                EstadoPublicacion.VISIBLE,
                                PageRequest.of(0, 100))
                        .getContent();

        List<Evento> eventos = eventoRepository
                .findByTituloContainingIgnoreCase(
                        MARCA_EVENTO, PageRequest.of(0, 100))
                .getContent();

        List<Mensaje> mensajes = mensajeRepository.findAll().stream()
                .filter(mensaje -> mensaje.getContenido() != null
                        && mensaje.getContenido().startsWith(MARCA_MENSAJE))
                .toList();

        if (publicaciones.size() < 15 || eventos.size() < 15
                || mensajes.size() < 50) {
            throw new IllegalStateException(
                    "Faltan datos de demostración de las actividades 035 a 037");
        }

        crearReportes(usuarios, publicaciones);

        List<Reporte> reportes = reporteRepository.findAll().stream()
                .filter(reporte -> reporte.getDescripcion() != null
                        && reporte.getDescripcion().startsWith(MARCA_REPORTE))
                .toList();

        crearNotificaciones(
                usuarios, publicaciones, eventos, mensajes, reportes);
    }

    private void crearSeguidores(List<Usuario> usuarios) {

        LocalDateTime ahora = LocalDateTime.now();

        for (int i = 0; i < 20; i++) {

            int indiceSeguidor = i < 15 ? i : i - 15;
            int indiceSeguido = i < 15
                    ? (i + 5) % 15
                    : (i - 15 + 8) % 15;

            Usuario seguidor = usuarios.get(indiceSeguidor);
            Usuario seguido = usuarios.get(indiceSeguido);

            if (seguidorRepository
                    .existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(
                            seguidor.getIdUsuario(),
                            seguido.getIdUsuario())) {
                continue;
            }

            Seguidor relacion = new Seguidor();
            relacion.setId(new SeguidorId(
                    seguidor.getIdUsuario(), seguido.getIdUsuario()));
            relacion.setSeguidor(seguidor);
            relacion.setSeguido(seguido);
            relacion.setFechaSeguimiento(ahora.minusDays(20).plusDays(i));

            seguidorRepository.save(relacion);
        }
    }

    private void crearReportes(
            List<Usuario> usuarios, List<Publicacion> publicaciones) {

        for (int i = 0; i < 15; i++) {

            Usuario reportante = usuarios.get(i);
            Publicacion publicacion = publicaciones.get(i);

            if (reporteRepository
                    .existsByReportante_IdUsuarioAndPublicacion_IdPublicacion(
                            reportante.getIdUsuario(),
                            publicacion.getIdPublicacion())) {
                continue;
            }

            EstadoReporte estado = switch (i % 4) {
                case 0 -> EstadoReporte.PENDIENTE;
                case 1 -> EstadoReporte.EN_REVISION;
                case 2 -> EstadoReporte.RESUELTO;
                default -> EstadoReporte.RECHAZADO;
            };

            Reporte reporte = new Reporte();
            reporte.setReportante(reportante);
            reporte.setPublicacion(publicacion);
            reporte.setMotivo(MOTIVOS_REPORTE.get(i % 5));
            reporte.setDescripcion(
                    MARCA_REPORTE + numero(i + 1)
                            + "] Reporte ficticio de demostración.");
            reporte.setEstado(estado);
            reporte.setFechaReporte(
                    LocalDateTime.now().minusDays(10).plusDays(i));

            if (estado == EstadoReporte.RESUELTO
                    || estado == EstadoReporte.RECHAZADO) {
                reporte.setModerador(usuarios.get(1));
                reporte.setResolucion(
                        "Resolución ficticia de demostración.");
                reporte.setFechaResolucion(
                        reporte.getFechaReporte().plusDays(1));
            }

            reporteRepository.save(reporte);
        }
    }

    private void crearNotificaciones(
            List<Usuario> usuarios,
            List<Publicacion> publicaciones,
            List<Evento> eventos,
            List<Mensaje> mensajes,
            List<Reporte> reportes) {

        Set<String> existentes = notificacionRepository.findAll().stream()
                .map(Notificacion::getContenido)
                .filter(Objects::nonNull)
                .filter(contenido -> contenido.startsWith(MARCA_NOTIFICACION))
                .map(contenido -> contenido.substring(
                        0, contenido.indexOf(']') + 1))
                .collect(Collectors.toSet());

        LocalDateTime ahora = LocalDateTime.now();

        for (int i = 0; i < 20; i++) {

            String marca = MARCA_NOTIFICACION + numero(i + 1) + "]";

            if (existentes.contains(marca)) {
                continue;
            }

            Notificacion notificacion = new Notificacion();
            notificacion.setDestinatario(usuarios.get(i % 15));
            notificacion.setActor(usuarios.get((i + 1) % 15));
            notificacion.setTipo(TIPOS_NOTIFICACION.get(i % 5));
            notificacion.setContenido(
                    marca + " Notificación ficticia de demostración.");
            notificacion.setLeida(i % 2 == 0);
            notificacion.setFechaCreacion(ahora.minusDays(5).plusHours(i));

            switch (i % 5) {
                case 0 -> {
                    // NUEVO_SEGUIDOR: solo usuarios, sin recurso adicional.
                }
                case 1 -> notificacion.setPublicacion(
                        publicaciones.get(i % publicaciones.size()));
                case 2 -> notificacion.setMensaje(
                        mensajes.get(i % mensajes.size()));
                case 3 -> notificacion.setEvento(
                        eventos.get(i % eventos.size()));
                default -> {
                    if (!reportes.isEmpty()) {
                        notificacion.setReporte(
                                reportes.get(i % reportes.size()));
                    }
                }
            }

            notificacionRepository.save(notificacion);
        }
    }

    private static String numero(int valor) {
        return String.format("%02d", valor);
    }
}
