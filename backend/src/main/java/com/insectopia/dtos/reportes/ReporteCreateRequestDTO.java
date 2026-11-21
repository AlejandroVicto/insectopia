package com.insectopia.dtos.reportes;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ReporteCreateRequestDTO(
        @NotNull Long publicacionId,
        @NotBlank @Pattern(regexp = "CONTENIDO_INAPROPIADO|DATOS_FICTICIOS|SPAM|IMAGEN_NO_RELACIONADA|LENGUAJE_OFENSIVO|OTRO") String motivo,
        @Size(max = 500) String descripcion) { }
