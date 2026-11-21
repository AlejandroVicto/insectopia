package com.insectopia.services;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.dtos.mensajes.ConversacionResponseDTO;
import com.insectopia.dtos.mensajes.InterlocutorDTO;
import com.insectopia.dtos.mensajes.MensajeCreateRequestDTO;
import com.insectopia.dtos.mensajes.MensajeResponseDTO;
import com.insectopia.dtos.mensajes.UltimoMensajeDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Conversacion;
import com.insectopia.models.Mensaje;
import com.insectopia.models.ParticipanteConversacion;
import com.insectopia.models.Usuario;
import com.insectopia.repository.ConteoNoLeidosProjection;
import com.insectopia.repository.ConversacionRepository;
import com.insectopia.repository.MensajeRepository;
import com.insectopia.repository.ParticipanteConversacionRepository;
import com.insectopia.repository.SeguidorRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;

/**
 * Reglas de negocio de mensajes (actividad 064): bandeja, historial y envío.
 * Toda identidad se toma del principal de Spring Security; nunca del cuerpo.
 */
@Service
public class MensajesService {

    private static final int CONTENIDO_MAX = 5000;
    private static final int BUSQUEDA_MAX = 100;

    private final ConversacionRepository conversaciones;
    private final ParticipanteConversacionRepository participantes;
    private final MensajeRepository mensajes;
    private final UsuarioRepository usuarios;
    private final SeguidorRepository seguidores;

    public MensajesService(
            ConversacionRepository conversaciones,
            ParticipanteConversacionRepository participantes,
            MensajeRepository mensajes,
            UsuarioRepository usuarios,
            SeguidorRepository seguidores) {
        this.conversaciones = conversaciones;
        this.participantes = participantes;
        this.mensajes = mensajes;
        this.usuarios = usuarios;
        this.seguidores = seguidores;
    }

    /** Bandeja: filtro, orden y paginación resueltos en MySQL; datos complementarios en 5 consultas. */
    @Transactional(readOnly = true)
    public Page<ConversacionResponseDTO> listar(
            int page, int size, String q, boolean noLeidos, InsectopiaUserDetails principal) {
        PageRequest pagina = PageRequest.of(page, size);
        Page<ParticipanteConversacion> filas = participantes.buscarBandeja(
                principal.idUsuario(), patronBusqueda(q), noLeidos, pagina);

        // La consulta ya excluye las ocultas; filtrar aquí también evita consultar detalles de éstas.
        List<ParticipanteConversacion> propias = filas.getContent().stream()
                .filter(fila -> !Boolean.TRUE.equals(fila.getOculta()))
                .toList();
        if (propias.isEmpty()) {
            return new PageImpl<>(List.of(), pagina, filas.getTotalElements());
        }

        List<Long> idsConversacion = propias.stream()
                .map(fila -> fila.getConversacion().getIdConversacion())
                .distinct()
                .toList();

        Map<Long, Usuario> interlocutores = new HashMap<>();
        for (ParticipanteConversacion participante
                : participantes.findConUsuariosPorConversaciones(idsConversacion)) {
            Usuario usuario = participante.getUsuario();
            if (usuario == null || usuario.getIdUsuario() == null
                    || usuario.getIdUsuario().equals(principal.idUsuario())) {
                continue;
            }
            interlocutores.putIfAbsent(
                    participante.getConversacion().getIdConversacion(), usuario);
        }

        Map<Long, Mensaje> ultimos = mensajes.findUltimosPorConversacion(idsConversacion).stream()
                .collect(Collectors.toMap(
                        mensaje -> mensaje.getConversacion().getIdConversacion(),
                        Function.identity(),
                        (primero, segundo) -> primero));

        Map<Long, Long> noLeidosPorConversacion = mensajes
                .contarNoLeidos(principal.idUsuario(), idsConversacion).stream()
                .collect(Collectors.toMap(
                        ConteoNoLeidosProjection::getConversacionId,
                        ConteoNoLeidosProjection::getTotal,
                        (primero, segundo) -> primero));

        List<Long> idsInterlocutores = interlocutores.values().stream()
                .map(Usuario::getIdUsuario)
                .distinct()
                .toList();
        Set<Long> seguidos = idsInterlocutores.isEmpty()
                ? Set.of()
                : new HashSet<>(seguidores.findIdsSeguidos(principal.idUsuario(), idsInterlocutores));

        List<ConversacionResponseDTO> contenido = new ArrayList<>();
        for (ParticipanteConversacion propia : propias) {
            Conversacion conversacion = propia.getConversacion();
            Long id = conversacion.getIdConversacion();
            Usuario interlocutor = interlocutores.get(id);
            if (interlocutor == null) {
                // Nunca devolver una conversación cuyo interlocutor no se pudo resolver.
                continue;
            }
            contenido.add(new ConversacionResponseDTO(
                    id,
                    InterlocutorDTO.from(interlocutor, seguidos.contains(interlocutor.getIdUsuario())),
                    UltimoMensajeDTO.from(ultimos.get(id)),
                    noLeidosPorConversacion.getOrDefault(id, 0L),
                    Boolean.TRUE.equals(propia.getOculta())));
        }
        return new PageImpl<>(contenido, pagina, filas.getTotalElements());
    }

    /** Página 0 = mensajes más recientes; orden estable por fecha y id. */
    @Transactional(readOnly = true)
    public Page<MensajeResponseDTO> listarMensajes(
            Long idConversacion, int page, int size, InsectopiaUserDetails principal) {
        conversacionAccesible(idConversacion, principal);
        PageRequest pagina = PageRequest.of(page, size,
                Sort.by(Sort.Order.desc("fechaEnvio"), Sort.Order.desc("idMensaje")));
        return mensajes
                .findByConversacion_IdConversacionOrderByFechaEnvioDescIdMensajeDesc(
                        idConversacion, pagina)
                .map(MensajeResponseDTO::from);
    }

    /** Guarda y confirma el mensaje; remitente únicamente desde el JWT. */
    @Transactional
    public MensajeResponseDTO enviar(
            Long idConversacion, MensajeCreateRequestDTO datos, InsectopiaUserDetails principal) {
        Conversacion conversacion = conversacionAccesible(idConversacion, principal);
        String contenido = datos == null ? null : datos.contenidoNormalizado();
        if (contenido == null || contenido.isBlank()) {
            throw new BusinessRuleException("El contenido del mensaje es obligatorio");
        }
        if (contenido.length() > CONTENIDO_MAX) {
            throw new BusinessRuleException("El contenido no puede superar los 5000 caracteres");
        }
        Usuario remitente = usuarios.findById(principal.idUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("usuario", principal.idUsuario()));

        Mensaje mensaje = new Mensaje();
        mensaje.setConversacion(conversacion);
        mensaje.setRemitente(remitente);
        mensaje.setContenido(contenido);
        mensaje.setFechaEnvio(LocalDateTime.now());
        return MensajeResponseDTO.from(mensajes.saveAndFlush(mensaje));
    }

    private Conversacion conversacionAccesible(
            Long idConversacion, InsectopiaUserDetails principal) {
        if (idConversacion == null) {
            throw new ResourceNotFoundException("conversación", idConversacion);
        }
        Conversacion conversacion = conversaciones.findById(idConversacion)
                .orElseThrow(() -> new ResourceNotFoundException("conversación", idConversacion));
        if (!participantes.existsByConversacion_IdConversacionAndUsuario_IdUsuario(
                idConversacion, principal.idUsuario())) {
            throw new AccessDeniedException("No tienes acceso a esta conversación");
        }
        return conversacion;
    }

    private String patronBusqueda(String q) {
        if (q == null || q.isBlank()) {
            return null;
        }
        String texto = q.trim();
        if (texto.length() > BUSQUEDA_MAX) {
            texto = texto.substring(0, BUSQUEDA_MAX);
        }
        return "%" + texto.toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_") + "%";
    }
}
