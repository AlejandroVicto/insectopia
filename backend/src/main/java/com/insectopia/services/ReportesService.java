package com.insectopia.services;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.dtos.reportes.ReporteCreateRequestDTO;
import com.insectopia.dtos.reportes.ReporteResolverRequestDTO;
import com.insectopia.dtos.reportes.ReporteResponseDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Reporte;
import com.insectopia.models.enums.EstadoPublicacion;
import com.insectopia.models.enums.EstadoReporte;
import com.insectopia.repository.PublicacionRepository;
import com.insectopia.repository.ReporteRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;

@Service
public class ReportesService {
    private final ReporteRepository reportes;
    private final PublicacionRepository publicaciones;
    private final UsuarioRepository usuarios;
    private final NotificacionService notificaciones;

    public ReportesService(ReporteRepository reportes, PublicacionRepository publicaciones,
            UsuarioRepository usuarios, NotificacionService notificaciones) {
        this.reportes = reportes;
        this.publicaciones = publicaciones;
        this.usuarios = usuarios;
        this.notificaciones = notificaciones;
    }

    @Transactional
    public ReporteResponseDTO crear(ReporteCreateRequestDTO datos, InsectopiaUserDetails principal) {
        permiso(principal, Permissions.PUBLICACION_REPORTAR);
        if (datos.publicacionId() == null || datos.publicacionId() < 1) throw new BusinessRuleException("Identificador inválido");
        // Serializa la comprobación de duplicados por publicación, incluso entre instancias del backend.
        var publicacion = publicaciones.bloquearParaEscritura(datos.publicacionId())
                .orElseThrow(() -> new ResourceNotFoundException("publicación", datos.publicacionId()));
        if (publicacion.getEstado() != EstadoPublicacion.VISIBLE) throw new BusinessRuleException("Publicación no reportable");
        if (publicacion.getUsuario().getIdUsuario().equals(principal.idUsuario())) {
            throw new BusinessRuleException("No puedes reportar tu propia publicación");
        }
        if (datos.motivo() == null || !datos.motivo().matches("CONTENIDO_INAPROPIADO|DATOS_FICTICIOS|SPAM|IMAGEN_NO_RELACIONADA|LENGUAJE_OFENSIVO|OTRO")) {
            throw new BusinessRuleException("Motivo de reporte inválido");
        }
        if (datos.descripcion() != null && datos.descripcion().length() > 500) throw new BusinessRuleException("Descripción demasiado larga");
        if (reportes.existsByReportante_IdUsuarioAndPublicacion_IdPublicacion(principal.idUsuario(), datos.publicacionId())) {
            throw new DuplicateResourceException("publicacionId", "Ya reportaste esta publicación");
        }
        Reporte reporte = new Reporte();
        reporte.setPublicacion(publicacion);
        reporte.setReportante(usuarios.findById(principal.idUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("usuario", principal.idUsuario())));
        reporte.setMotivo(datos.motivo());
        reporte.setDescripcion(datos.descripcion() == null || datos.descripcion().isBlank() ? null : datos.descripcion().trim());
        reporte.setEstado(EstadoReporte.PENDIENTE);
        return ReporteResponseDTO.from(reportes.saveAndFlush(reporte), false);
    }

    @Transactional(readOnly = true)
    public Page<ReporteResponseDTO> listar(int page, int size, EstadoReporte estado, InsectopiaUserDetails principal) {
        permiso(principal, Permissions.REPORTE_REVISAR);
        var paginacion = PageRequest.of(page, size, Sort.by(Sort.Order.desc("fechaReporte"), Sort.Order.desc("idReporte")));
        return (estado == null ? reportes.findAllByOrderByFechaReporteDesc(paginacion)
                : reportes.findByEstadoOrderByFechaReporteDesc(estado, paginacion)).map(r -> ReporteResponseDTO.from(r, true));
    }

    @Transactional
    public ReporteResponseDTO resolver(Long id, ReporteResolverRequestDTO datos, InsectopiaUserDetails principal) {
        permiso(principal, Permissions.REPORTE_RESOLVER);
        Reporte reporte = reportes.bloquearParaResolucion(id)
                .orElseThrow(() -> new ResourceNotFoundException("reporte", id));
        if (reporte.getEstado() != EstadoReporte.PENDIENTE && reporte.getEstado() != EstadoReporte.EN_REVISION) {
            throw new BusinessRuleException("El reporte ya tiene una resolución final");
        }
        if (datos.estado() != EstadoReporte.RESUELTO && datos.estado() != EstadoReporte.RECHAZADO) {
            throw new BusinessRuleException("La resolución debe ser RESUELTO o RECHAZADO");
        }
        if (datos.resolucion() == null || datos.resolucion().isBlank() || datos.resolucion().length() > 500) {
            throw new BusinessRuleException("La resolución debe tener entre 1 y 500 caracteres");
        }
        reporte.setModerador(usuarios.findById(principal.idUsuario())
                .orElseThrow(() -> new ResourceNotFoundException("usuario", principal.idUsuario())));
        reporte.setEstado(datos.estado());
        reporte.setResolucion(datos.resolucion().trim());
        reporte.setFechaResolucion(LocalDateTime.now());
        ReporteResponseDTO respuesta = ReporteResponseDTO.from(reportes.saveAndFlush(reporte), true);
        notificaciones.porResolucion(reporte, reporte.getModerador());
        return respuesta;
    }

    private void permiso(InsectopiaUserDetails principal, String authority) {
        if (principal == null || principal.getAuthorities().stream().noneMatch(a -> authority.equals(a.getAuthority()))) {
            throw new AccessDeniedException("Permiso de reportes requerido");
        }
    }
}
