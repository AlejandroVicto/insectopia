package com.insectopia.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.dtos.moderacion.PropuestaEventoDTO;
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

/** Moderación de propuestas de eventos. Los reportes siguen en ReportesController/ReportesService. */
@Service
public class ModeracionService {
    private static final Sort ORDEN = Sort.by(Sort.Order.desc("fechaCreacion"), Sort.Order.desc("idEvento"));

    private final EventoRepository eventos;
    private final UsuarioRepository usuarios;
    private final NotificacionService notificaciones;

    public ModeracionService(EventoRepository eventos, UsuarioRepository usuarios,
            NotificacionService notificaciones) {
        this.eventos = eventos;
        this.usuarios = usuarios;
        this.notificaciones = notificaciones;
    }

    @Transactional(readOnly = true)
    public Page<PropuestaEventoDTO> listarPropuestas(int page, int size, String q, EstadoEvento estado,
            LocalDate fechaDesde, LocalDate fechaHasta, InsectopiaUserDetails principal) {
        permiso(principal, Permissions.EVENTO_REVISAR);
        if (estado != null && estado != EstadoEvento.PENDIENTE && estado != EstadoEvento.APROBADO
                && estado != EstadoEvento.RECHAZADO) {
            throw new EventoValidacionException("El listado de moderación sólo admite PENDIENTE, APROBADO o RECHAZADO");
        }
        if (fechaDesde != null && fechaHasta != null && fechaDesde.isAfter(fechaHasta)) {
            throw new EventoValidacionException("La fecha inicial no puede superar la fecha final");
        }
        LocalDateTime desde = fechaDesde == null ? null : fechaDesde.atStartOfDay();
        LocalDateTime hasta = fechaHasta == null ? null : fechaHasta.plusDays(1).atStartOfDay();
        return eventos.listarParaModeracion(
                estado == null ? EstadoEvento.PENDIENTE : estado,
                normalizar(q), desde, hasta,
                PageRequest.of(page, size, ORDEN)).map(PropuestaEventoDTO::from);
    }

    @Transactional
    public PropuestaEventoDTO aprobar(Long id, InsectopiaUserDetails principal) {
        permiso(principal, Permissions.EVENTO_RESOLVER);
        Resolucion resuelta = resolver(id, EstadoEvento.APROBADO, null, principal);
        notificaciones.porResolucionEvento(resuelta.evento(), resuelta.moderador(), true);
        return PropuestaEventoDTO.from(resuelta.evento());
    }

    @Transactional
    public PropuestaEventoDTO rechazar(Long id, RechazarPropuestaRequestDTO datos,
            InsectopiaUserDetails principal) {
        permiso(principal, Permissions.EVENTO_RESOLVER);
        if (datos == null || datos.motivo() == null || datos.motivo().isBlank()
                || datos.motivo().length() > 500) {
            throw new EventoValidacionException("El motivo de rechazo debe tener entre 1 y 500 caracteres");
        }
        Resolucion resuelta = resolver(id, EstadoEvento.RECHAZADO, datos.motivo().trim(), principal);
        notificaciones.porResolucionEvento(resuelta.evento(), resuelta.moderador(), false);
        return PropuestaEventoDTO.from(resuelta.evento());
    }

    private record Resolucion(Evento evento, Usuario moderador) { }

    private Resolucion resolver(Long id, EstadoEvento estado, String motivo, InsectopiaUserDetails principal) {
        // PESSIMISTIC_WRITE serializa decisiones concurrentes sobre la misma propuesta.
        Evento evento = eventos.bloquear(id)
                .orElseThrow(() -> new ResourceNotFoundException("evento", id));
        if (evento.getEstado() != EstadoEvento.PENDIENTE) {
            throw new EventoConflictoException("La propuesta ya tiene una resolución definitiva");
        }
        Usuario moderador = usuarios.findById(principal.idUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("usuario", principal.idUsuario()));
        String rolReal = moderador.getRol() == null ? null : moderador.getRol().getNombre();
        if (!"MODERADOR".equals(rolReal) && !"ADMINISTRADOR".equals(rolReal)) {
            throw new AccessDeniedException("Permiso de moderación requerido");
        }
        evento.setEstado(estado);
        evento.setModerador(moderador);
        evento.setMotivoResolucion(motivo);
        evento.setFechaResolucion(LocalDateTime.now());
        eventos.saveAndFlush(evento);
        return new Resolucion(evento, moderador);
    }

    private String normalizar(String q) {
        if (q == null || q.isBlank()) return null;
        return "%" + q.trim().toLowerCase(Locale.ROOT)
                .replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    }

    private void permiso(InsectopiaUserDetails principal, String authority) {
        boolean rolValido = principal != null
                && ("MODERADOR".equals(principal.role()) || "ADMINISTRADOR".equals(principal.role()));
        if (!rolValido || principal.getAuthorities().stream()
                .noneMatch(autoridad -> authority.equals(autoridad.getAuthority()))) {
            throw new AccessDeniedException("Permiso de moderación requerido");
        }
    }
}
