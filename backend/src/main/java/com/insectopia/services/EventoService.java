package com.insectopia.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.dtos.eventos.EventoRequestDTO;
import com.insectopia.dtos.eventos.EventoUpdateRequestDTO;
import com.insectopia.dtos.eventos.DatosEvento;
import com.insectopia.dtos.eventos.EventoResponseDTO;
import com.insectopia.dtos.eventos.EventoResponseDTO.ProponentePublico;
import com.insectopia.exceptions.EventoConflictoException;
import com.insectopia.exceptions.EventoValidacionException;
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

@Service
public class EventoService {
    private static final Sort ORDEN = Sort.by(Sort.Order.asc("fechaInicio"), Sort.Order.asc("idEvento"));
    private final EventoRepository eventos;
    private final ParticipanteEventoRepository participantes;
    private final UsuarioRepository usuarios;
    private final NotificacionService notificaciones;
    private final AlmacenamientoImagenesService imagenes;
    private final ZoneId zona;

    public EventoService(EventoRepository eventos, ParticipanteEventoRepository participantes,
            UsuarioRepository usuarios, NotificacionService notificaciones,
            @Qualifier("imagenesEventos") AlmacenamientoImagenesService imagenes,
            @Value("${insectopia.eventos.zone:America/Mexico_City}") String zona) {
        this.eventos = eventos;
        this.participantes = participantes;
        this.usuarios = usuarios;
        this.notificaciones = notificaciones;
        this.imagenes = imagenes;
        this.zona = ZoneId.of(zona);
    }

    private LocalDateTime ahora() {
        return LocalDateTime.now(zona);
    }

    private record Filtro(String q, LocalDateTime desde, LocalDateTime hasta) { }

    private Filtro filtro(String q, LocalDate desde, LocalDate hasta, String periodo, boolean proximos) {
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new EventoValidacionException("La fecha inicial no puede superar la fecha final");
        }
        LocalDateTime inicio = desde == null ? null : desde.atStartOfDay();
        LocalDateTime fin = hasta == null ? null : hasta.plusDays(1).atStartOfDay();
        LocalDateTime actual = ahora();
        if (proximos) {
            if ("pasados".equals(periodo)) throw new EventoValidacionException("Fecha: Pasados no aplica a próximos 30 días");
            inicio = inicio == null || inicio.isBefore(actual) ? actual : inicio;
            LocalDateTime limite = actual.plusDays(30);
            fin = fin == null || fin.isAfter(limite) ? limite : fin;
        } else if ("futuros".equals(periodo)) {
            inicio = inicio == null || inicio.isBefore(actual) ? actual : inicio;
        } else if ("pasados".equals(periodo)) {
            fin = fin == null || fin.isAfter(actual) ? actual : fin;
        }
        if (inicio != null && fin != null && !inicio.isBefore(fin)) {
            // Rango válido, sin intersección: consulta vacía sin invertir los límites.
            fin = inicio;
        }
        return new Filtro(q == null || q.isBlank() ? null : "%" + q.trim().toLowerCase(Locale.ROOT)
                .replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%", inicio, fin);
    }

    @Transactional(readOnly = true)
    public Page<EventoResponseDTO> listar(int page, int size, String q, EstadoEvento estado,
            String periodo, LocalDate desde, LocalDate hasta, boolean proximos, InsectopiaUserDetails user) {
        if (estado != null && estado != EstadoEvento.APROBADO) {
            throw new EventoValidacionException("El listado público sólo admite el estado APROBADO");
        }
        Filtro f = filtro(q, desde, hasta, periodo, proximos);
        return mapearPagina(eventos.listarPublicos(EstadoEvento.APROBADO, f.q(), f.desde(), f.hasta(),
                PageRequest.of(page, size, ORDEN)), user.idUsuario());
    }

    @Transactional(readOnly = true)
    public Page<EventoResponseDTO> propias(int page, int size, String q, EstadoEvento estado,
            String periodo, LocalDate desde, LocalDate hasta, InsectopiaUserDetails user) {
        Filtro f = filtro(q, desde, hasta, periodo, false);
        return mapearPagina(eventos.listarPropios(user.idUsuario(), estado, f.q(), f.desde(), f.hasta(),
                PageRequest.of(page, size, ORDEN)), user.idUsuario());
    }

    @Transactional(readOnly = true)
    public Page<EventoResponseDTO> misParticipaciones(int page, int size, String q, EstadoEvento estado,
            String periodo, LocalDate desde, LocalDate hasta, InsectopiaUserDetails user) {
        Filtro f = filtro(q, desde, hasta, periodo, false);
        return mapearPagina(eventos.listarParticipaciones(user.idUsuario(), estado, f.q(), f.desde(), f.hasta(),
                PageRequest.of(page, size, ORDEN)), user.idUsuario());
    }

    @Transactional(readOnly = true)
    public EventoResponseDTO obtener(Long id, InsectopiaUserDetails user) {
        Evento evento = eventos.obtenerConProponente(id).orElseThrow(() -> new ResourceNotFoundException("evento", id));
        if (evento.getEstado() != EstadoEvento.APROBADO
                && !evento.getProponente().getIdUsuario().equals(user.idUsuario())) {
            throw new ResourceNotFoundException("evento", id);
        }
        return mapearPagina(new PageImpl<>(List.of(evento), PageRequest.of(0, 1), 1), user.idUsuario())
                .getContent().getFirst();
    }

    @Transactional
    public EventoResponseDTO crear(EventoRequestDTO datos, InsectopiaUserDetails user) {
        validar(datos, true);
        Evento evento = new Evento();
        evento.setProponente(usuarios.getReferenceById(user.idUsuario()));
        aplicar(evento, datos);
        evento.setEstado(EstadoEvento.PENDIENTE);
        eventos.save(evento);
        return respuesta(evento, 0, null, user.idUsuario());
    }

    @Transactional
    public EventoResponseDTO editar(Long id, EventoUpdateRequestDTO datos, InsectopiaUserDetails user) {
        Evento evento = eventos.bloquear(id).orElseThrow(() -> new ResourceNotFoundException("evento", id));
        verificarPropietario(evento, user);
        if (evento.getEstado() != EstadoEvento.PENDIENTE) throw new EventoConflictoException("Sólo se editan propuestas pendientes");
        validar(datos, true);
        aplicar(evento, datos);
        return respuesta(evento, 0, null, user.idUsuario());
    }

    @Transactional
    public EventoResponseDTO subirImagen(Long id, MultipartFile archivo, InsectopiaUserDetails user) {
        Evento evento = eventoEditable(id, user);
        String anterior = evento.getImagen();
        String nuevo = imagenes.guardar(archivo);
        try {
            evento.setImagen("eventos/" + nuevo);
            eventos.saveAndFlush(evento);
            sincronizarImagenes(nuevo, nombreLocal(anterior));
            return respuesta(evento, participantes.countByEvento_IdEventoAndEstado(id, EstadoParticipanteEvento.INSCRITO),
                    null, user.idUsuario());
        } catch (RuntimeException exception) {
            imagenes.eliminar(nuevo);
            throw exception;
        }
    }

    @Transactional
    public void quitarImagen(Long id, InsectopiaUserDetails user) {
        Evento evento = eventoEditable(id, user);
        String anterior = evento.getImagen();
        if (anterior == null) return;
        evento.setImagen(null);
        eventos.saveAndFlush(evento);
        sincronizarImagenes(null, nombreLocal(anterior));
    }

    @Transactional(readOnly = true)
    public ImagenEvento leerImagen(Long id, InsectopiaUserDetails user) {
        Evento evento = eventos.findById(id).orElseThrow(() -> new ResourceNotFoundException("evento", id));
        if (evento.getEstado() != EstadoEvento.APROBADO
                && (user == null || !evento.getProponente().getIdUsuario().equals(user.idUsuario()))) {
            throw new ResourceNotFoundException("imagen del evento", id);
        }
        String nombre = nombreLocal(evento.getImagen());
        if (nombre == null) throw new ResourceNotFoundException("imagen del evento", id);
        return new ImagenEvento(imagenes.leer(nombre), nombre.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG);
    }

    public record ImagenEvento(Resource resource, MediaType tipo) { }

    private Evento eventoEditable(Long id, InsectopiaUserDetails user) {
        Evento evento = eventos.bloquear(id).orElseThrow(() -> new ResourceNotFoundException("evento", id));
        verificarPropietario(evento, user);
        if (evento.getEstado() != EstadoEvento.PENDIENTE) {
            throw new EventoConflictoException("Sólo se modifican imágenes de propuestas pendientes");
        }
        return evento;
    }

    private String nombreLocal(String ruta) {
        return ruta != null && ruta.matches("eventos/[0-9a-fA-F-]{36}\\.(jpg|png)")
                ? ruta.substring("eventos/".length()) : null;
    }

    private void sincronizarImagenes(String nueva, String anterior) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Se requiere una transacción para gestionar fotografías");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED) {
                    if (anterior != null) imagenes.eliminar(anterior);
                } else if (nueva != null) {
                    imagenes.eliminar(nueva);
                }
            }
        });
    }

    @Transactional
    public void cancelarEvento(Long id, InsectopiaUserDetails user) {
        Evento evento = eventos.bloquear(id).orElseThrow(() -> new ResourceNotFoundException("evento", id));
        verificarPropietario(evento, user);
        if (evento.getEstado() != EstadoEvento.PENDIENTE && evento.getEstado() != EstadoEvento.APROBADO) {
            throw new EventoConflictoException("El evento no puede cancelarse en su estado actual");
        }
        if (participantes.countByEvento_IdEventoAndEstado(id, EstadoParticipanteEvento.INSCRITO) > 0) {
            throw new EventoConflictoException("No se puede cancelar un evento con participantes activos");
        }
        evento.setEstado(EstadoEvento.CANCELADO);
    }

    @Transactional
    public EventoResponseDTO inscribir(Long id, InsectopiaUserDetails user) {
        Evento evento = eventos.bloquear(id).orElseThrow(() -> new ResourceNotFoundException("evento", id));
        LocalDateTime actual = ahora();
        if (evento.getEstado() != EstadoEvento.APROBADO || !evento.getFechaInicio().isAfter(actual)) {
            throw new EventoConflictoException("El evento no está disponible para inscripciones");
        }
        ParticipanteEventoId clave = new ParticipanteEventoId(id, user.idUsuario());
        ParticipanteEvento participacion = participantes.findById(clave).orElse(null);
        if (participacion != null && participacion.getEstado() == EstadoParticipanteEvento.INSCRITO) {
            throw new EventoConflictoException("Ya estás inscrito en el evento");
        }
        long ocupados = participantes.countByEvento_IdEventoAndEstado(id, EstadoParticipanteEvento.INSCRITO);
        if (ocupados >= evento.getCupoMaximo()) throw new EventoConflictoException("El cupo está completo");
        Usuario usuario = usuarios.getReferenceById(user.idUsuario());
        if (participacion == null) {
            participacion = new ParticipanteEvento();
            participacion.setId(clave);
            participacion.setEvento(evento);
            participacion.setUsuario(usuario);
        }
        participacion.setFechaInscripcion(actual);
        participacion.setFechaCancelacion(null);
        participacion.setEstado(EstadoParticipanteEvento.INSCRITO);
        participantes.save(participacion);
        notificaciones.porParticipacion(evento, usuario, true);
        return respuesta(evento, ocupados + 1, EstadoParticipanteEvento.INSCRITO, user.idUsuario());
    }

    @Transactional
    public void cancelarInscripcion(Long id, InsectopiaUserDetails user) {
        Evento evento = eventos.bloquear(id).orElseThrow(() -> new ResourceNotFoundException("evento", id));
        ParticipanteEvento participacion = participantes.findById(new ParticipanteEventoId(id, user.idUsuario()))
                .orElseThrow(() -> new ResourceNotFoundException("inscripción", id));
        if (participacion.getEstado() != EstadoParticipanteEvento.INSCRITO) {
            throw new EventoConflictoException("La inscripción ya estaba cancelada");
        }
        LocalDateTime actual = ahora();
        if (!evento.getFechaInicio().isAfter(actual)) throw new EventoConflictoException("El evento ya comenzó");
        participacion.setEstado(EstadoParticipanteEvento.CANCELADO);
        participacion.setFechaCancelacion(actual);
        notificaciones.porParticipacion(evento, participacion.getUsuario(), false);
    }

    private void verificarPropietario(Evento evento, InsectopiaUserDetails user) {
        if (!evento.getProponente().getIdUsuario().equals(user.idUsuario())) {
            throw new ResourceNotFoundException("evento", evento.getIdEvento());
        }
    }

    private void validar(DatosEvento datos, boolean futuro) {
        if (datos.imagen() != null && !datos.imagen().isBlank()) {
            throw new EventoValidacionException("La fotografía debe subirse como archivo en /api/eventos/{id}/imagen");
        }
        if (datos.fechaInicio() == null || datos.fechaFin() == null || datos.cupoMaximo() == null) return;
        if (futuro && !datos.fechaInicio().isAfter(ahora())) throw new EventoValidacionException("La fecha inicial debe ser futura");
        if (!datos.fechaFin().isAfter(datos.fechaInicio())) throw new EventoValidacionException("La fecha final debe ser posterior al inicio");
    }

    private void aplicar(Evento evento, DatosEvento datos) {
        evento.setTitulo(datos.titulo().trim());
        evento.setDescripcion(datos.descripcion().trim());
        evento.setUbicacion(datos.ubicacion().trim());
        // La imagen se administra exclusivamente mediante /{id}/imagen.
        evento.setFechaInicio(datos.fechaInicio());
        evento.setFechaFin(datos.fechaFin());
        evento.setCupoMaximo(datos.cupoMaximo());
    }

    private Page<EventoResponseDTO> mapearPagina(Page<Evento> pagina, Long usuario) {
        List<Evento> lista = pagina.getContent();
        if (lista.isEmpty()) return pagina.map(e -> respuesta(e, 0, null, usuario));
        List<Long> ids = lista.stream().map(Evento::getIdEvento).toList();
        Map<Long, Long> conteos = participantes.contarActivos(ids, EstadoParticipanteEvento.INSCRITO).stream()
                .collect(Collectors.toMap(ParticipanteEventoRepository.ConteoEvento::getIdEvento,
                        ParticipanteEventoRepository.ConteoEvento::getTotal));
        Map<Long, EstadoParticipanteEvento> estados = participantes.estadosDelUsuario(ids, usuario).stream()
                .collect(Collectors.toMap(ParticipanteEventoRepository.EstadoUsuarioEvento::getIdEvento,
                        ParticipanteEventoRepository.EstadoUsuarioEvento::getEstado));
        return pagina.map(e -> respuesta(e, conteos.getOrDefault(e.getIdEvento(), 0L),
                estados.get(e.getIdEvento()), usuario));
    }

    private EventoResponseDTO respuesta(Evento e, long conteo, EstadoParticipanteEvento estado, Long usuario) {
        Usuario proponente = e.getProponente();
        boolean propio = proponente.getIdUsuario().equals(usuario);
        return new EventoResponseDTO(e.getIdEvento(), e.getTitulo(), e.getDescripcion(), e.getUbicacion(),
                e.getImagen(), e.getFechaInicio(), e.getFechaFin(), e.getCupoMaximo(), conteo,
                e.getEstado(), new ProponentePublico(proponente.getNombre(), proponente.getNombreUsuario()),
                estado, propio, propio && e.getEstado() == EstadoEvento.RECHAZADO ? e.getMotivoResolucion() : null);
    }
}
