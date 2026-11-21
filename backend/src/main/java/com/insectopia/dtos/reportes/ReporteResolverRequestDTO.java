package com.insectopia.dtos.reportes;

import com.insectopia.models.enums.EstadoReporte;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReporteResolverRequestDTO(
        @NotNull EstadoReporte estado,
        @NotBlank @Size(max = 500) String resolucion) { }
