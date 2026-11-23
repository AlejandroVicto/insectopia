package com.insectopia.dtos.eventos;

import java.time.LocalDateTime;

public interface DatosEvento {
    String titulo();
    String descripcion();
    String ubicacion();
    String imagen();
    LocalDateTime fechaInicio();
    LocalDateTime fechaFin();
    Integer cupoMaximo();
}
