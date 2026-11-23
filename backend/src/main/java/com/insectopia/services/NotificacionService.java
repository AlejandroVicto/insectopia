package com.insectopia.services;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.dtos.notificaciones.NoLeidasCountDTO;
import com.insectopia.dtos.notificaciones.NotificacionResponseDTO;
import com.insectopia.dtos.notificaciones.RecursoNotificacionDTO;
import com.insectopia.dtos.publicaciones.AutorResumenDTO;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Notificacion;
import com.insectopia.models.Evento;
import com.insectopia.models.Mensaje;
import com.insectopia.models.Publicacion;
import com.insectopia.models.Reporte;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoPublicacion;
import com.insectopia.models.enums.EstadoReporte;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.NotificacionRepository;
import com.insectopia.security.InsectopiaUserDetails;

@Service
public class NotificacionService {
    public static final String COMENTARIO = "COMENTARIO";
    public static final String REACCION = "REACCION";
    public static final String MENSAJE = "MENSAJE";
    public static final String REPORTE_RESUELTO = "REPORTE_RESUELTO";
    public static final String REPORTE_RECHAZADO = "REPORTE_RECHAZADO";
    public static final String EVENTO_INSCRIPCION = "EVENTO_INSCRIPCION";
    public static final String EVENTO_CANCELACION = "EVENTO_CANCELACION";

    private final NotificacionRepository notificaciones;

    public NotificacionService(NotificacionRepository notificaciones) {
        this.notificaciones = notificaciones;
    }

    @Transactional(readOnly = true)
    public Page<NotificacionResponseDTO> listar(int page, int size, String filtro, InsectopiaUserDetails principal) {
        var orden = PageRequest.of(page, size,
                Sort.by(Sort.Order.desc("fechaCreacion"), Sort.Order.desc("idNotificacion")));
        Page<Notificacion> resultado = switch (filtro) {
            case "no-leidas" -> notificaciones.findByDestinatario_IdUsuarioAndLeida(principal.idUsuario(), false, orden);
            case "leidas" -> notificaciones.findByDestinatario_IdUsuarioAndLeida(principal.idUsuario(), true, orden);
            default -> notificaciones.findByDestinatario_IdUsuario(principal.idUsuario(), orden);
        };
        return resultado.map(n -> mapear(n, principal));
    }

    @Transactional(readOnly = true)
    public NoLeidasCountDTO contar(InsectopiaUserDetails principal) {
        return new NoLeidasCountDTO(notificaciones.countByDestinatario_IdUsuarioAndLeidaFalse(principal.idUsuario()));
    }

    @Transactional
    public NotificacionResponseDTO leer(Long id, InsectopiaUserDetails principal) {
        Notificacion n = propia(id, principal);
        if (!Boolean.TRUE.equals(n.getLeida())) n.setLeida(true);
        return mapear(n, principal);
    }

    @Transactional
    public NoLeidasCountDTO leerTodas(InsectopiaUserDetails principal) {
        notificaciones.marcarTodasLeidas(principal.idUsuario());
        return contar(principal);
    }

    @Transactional
    public void eliminar(Long id, InsectopiaUserDetails principal) {
        notificaciones.delete(propia(id, principal));
    }

    private Notificacion propia(Long id, InsectopiaUserDetails principal) {
        return notificaciones.findByIdNotificacionAndDestinatario_IdUsuario(id, principal.idUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("notificación", id));
    }

    private NotificacionResponseDTO mapear(Notificacion n, InsectopiaUserDetails principal) {
        RecursoNotificacionDTO recurso = null;
        Publicacion p = n.getPublicacion();
        if (p != null) {
            boolean accesible = p.getEstado() == EstadoPublicacion.VISIBLE
                    || (p.getEstado() == EstadoPublicacion.OCULTA
                            && (p.getUsuario().getIdUsuario().equals(principal.idUsuario())
                                    || "MODERADOR".equals(principal.role())
                                    || "ADMINISTRADOR".equals(principal.role())));
            // Una publicación ELIMINADA nunca tiene enlace, ni siquiera para el autor.
            recurso = new RecursoNotificacionDTO("PUBLICACION", accesible ? p.getIdPublicacion() : null,
                    accesible, accesible ? "/api/publicaciones/" + p.getIdPublicacion() : null);
        } else if (COMENTARIO.equals(n.getTipo()) || REACCION.equals(n.getTipo())
                || "NUEVA_PUBLICACION".equals(n.getTipo())) {
            // La FK ON DELETE SET NULL mantiene el aviso tras la eliminación física.
            recurso = new RecursoNotificacionDTO("PUBLICACION", null, false, null);
        } else if (n.getReporte() != null || REPORTE_RESUELTO.equals(n.getTipo())
                || REPORTE_RECHAZADO.equals(n.getTipo()) || "NUEVO_REPORTE".equals(n.getTipo())) {
            // No existe GET /api/reportes/{id} accesible al reportante.
            Reporte reporte = n.getReporte();
            recurso = new RecursoNotificacionDTO("REPORTE", reporte != null
                    && reporte.getReportante().getIdUsuario().equals(principal.idUsuario())
                            ? reporte.getIdReporte() : null, false, null);
        } else if (n.getEvento() != null || n.getTipo().startsWith("EVENTO_")) {
            recurso = new RecursoNotificacionDTO("EVENTO", null, false, null);
        } else if (n.getMensaje() != null && (MENSAJE.equals(n.getTipo()) || "NUEVO_MENSAJE".equals(n.getTipo()))) {
            Mensaje mensaje = n.getMensaje();
            // Solo un aviso dirigido al interlocutor del mensaje permite navegar al chat.
            boolean propio = !mensaje.getRemitente().getIdUsuario().equals(principal.idUsuario());
            recurso = new RecursoNotificacionDTO("MENSAJE", propio ? mensaje.getIdMensaje() : null,
                    propio, propio ? "/api/conversaciones/" + mensaje.getConversacion().getIdConversacion() : null,
                    propio ? mensaje.getConversacion().getIdConversacion() : null);
        } else if (MENSAJE.equals(n.getTipo()) || "NUEVO_MENSAJE".equals(n.getTipo())) {
            recurso = new RecursoNotificacionDTO("MENSAJE", null, false, null);
        }
        Usuario actor = n.getActor();
        AutorResumenDTO actorPublico = actor != null && ((recurso != null && recurso.disponible())
                    || "NUEVO_SEGUIDOR".equals(n.getTipo()))
                && actor.getEstado() == EstadoUsuario.ACTIVO
                && !n.getTipo().startsWith("REPORTE_") ? AutorResumenDTO.from(actor) : null;
        return new NotificacionResponseDTO(n.getIdNotificacion(), n.getTipo(), n.getContenido(), actorPublico,
                n.getFechaCreacion(), Boolean.TRUE.equals(n.getLeida()), recurso);
    }

    // Estos métodos se invocan dentro de la misma transacción que la acción; nunca en REQUIRES_NEW.
    @Transactional(propagation = Propagation.MANDATORY)
    public void porComentario(Publicacion publicacion, Usuario actor) {
        if (!publicacion.getUsuario().getIdUsuario().equals(actor.getIdUsuario())) {
            guardar(publicacion.getUsuario(), actor, publicacion, null, COMENTARIO,
                    "Alguien comentó tu publicación");
        }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void porMensaje(Mensaje mensaje, Usuario destinatario, Usuario remitente) {
        if (destinatario.getIdUsuario().equals(remitente.getIdUsuario())) return;
        Notificacion n = new Notificacion();
        n.setDestinatario(destinatario);
        n.setActor(remitente);
        n.setMensaje(mensaje);
        n.setTipo(MENSAJE);
        n.setContenido("Te envió un mensaje privado");
        notificaciones.save(n);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void porReaccion(Publicacion publicacion, Usuario actor) {
        Long destinatario = publicacion.getUsuario().getIdUsuario();
        if (!destinatario.equals(actor.getIdUsuario())
                && !notificaciones.existsByDestinatario_IdUsuarioAndActor_IdUsuarioAndPublicacion_IdPublicacionAndTipo(
                        destinatario, actor.getIdUsuario(), publicacion.getIdPublicacion(), REACCION)) {
            guardar(publicacion.getUsuario(), actor, publicacion, null, REACCION,
                    "Alguien reaccionó a tu publicación");
        }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void porResolucion(Reporte reporte, Usuario moderador) {
        String tipo = reporte.getEstado() == EstadoReporte.RESUELTO ? REPORTE_RESUELTO : REPORTE_RECHAZADO;
        if (!reporte.getReportante().getIdUsuario().equals(moderador.getIdUsuario())) {
            guardar(reporte.getReportante(), null, null, reporte, tipo,
                    reporte.getEstado() == EstadoReporte.RESUELTO
                            ? "Tu reporte fue resuelto" : "Tu reporte fue rechazado");
        }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void porParticipacion(Evento evento, Usuario usuario, boolean inscripcion) {
        Notificacion aviso = new Notificacion();
        aviso.setDestinatario(usuario);
        aviso.setEvento(evento);
        aviso.setTipo(inscripcion ? EVENTO_INSCRIPCION : EVENTO_CANCELACION);
        aviso.setContenido(inscripcion ? "Tu inscripción al evento fue confirmada"
                : "Tu inscripción al evento fue cancelada");
        notificaciones.save(aviso);
    }

    private void guardar(Usuario destinatario, Usuario actor, Publicacion publicacion, Reporte reporte,
            String tipo, String contenido) {
        Notificacion n = new Notificacion();
        n.setDestinatario(destinatario);
        n.setActor(actor);
        n.setPublicacion(publicacion);
        n.setReporte(reporte);
        n.setTipo(tipo);
        n.setContenido(contenido);
        notificaciones.save(n);
    }
}
