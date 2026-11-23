package com.insectopia.dtos.reportes;

import java.time.LocalDateTime;
import com.insectopia.models.Reporte;

public record ReporteResponseDTO(Long id, Long publicacionId, String motivo, String descripcion,
        String estado, LocalDateTime fechaReporte, Long reportanteId, Long moderadorId,
        String resolucion, LocalDateTime fechaResolucion) {
    public static ReporteResponseDTO from(Reporte r, boolean gestion) {
        return new ReporteResponseDTO(r.getIdReporte(), r.getPublicacion() == null ? null : r.getPublicacion().getIdPublicacion(),
                r.getMotivo(), r.getDescripcion(), r.getEstado().name(), r.getFechaReporte(),
                gestion && r.getReportante() != null ? r.getReportante().getIdUsuario() : null,
                gestion && r.getModerador() != null ? r.getModerador().getIdUsuario() : null,
                gestion ? r.getResolucion() : null, gestion ? r.getFechaResolucion() : null);
    }
}
