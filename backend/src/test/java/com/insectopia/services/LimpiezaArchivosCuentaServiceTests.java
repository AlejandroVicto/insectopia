package com.insectopia.services;

import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class LimpiezaArchivosCuentaServiceTests {
    @Test void falloDeArchivoConservaTareaYReintentaDespues() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        AlmacenamientoImagenesService publicaciones = mock(AlmacenamientoImagenesService.class);
        AlmacenamientoImagenesService eventos = mock(AlmacenamientoImagenesService.class);
        var servicio = new LimpiezaArchivosCuentaService(jdbc, publicaciones, eventos);
        String nombre = "123e4567-e89b-12d3-a456-426614174000.png";
        when(jdbc.queryForList("SELECT id, tipo, nombre FROM limpieza_archivos_pendientes ORDER BY id LIMIT 100"))
                .thenReturn(List.of(Map.of("id", 7L, "tipo", "publicacion", "nombre", nombre)));
        when(publicaciones.eliminarPendiente(nombre)).thenReturn(false, true);
        servicio.registrar("publicacion", "../archivo-externo.png");
        verifyNoInteractions(jdbc);
        servicio.procesarPendientes();
        verify(jdbc).queryForList("SELECT id, tipo, nombre FROM limpieza_archivos_pendientes ORDER BY id LIMIT 100");
        verifyNoMoreInteractions(jdbc);
        servicio.procesarPendientes();
        verify(jdbc).update("DELETE FROM limpieza_archivos_pendientes WHERE id = ?", 7L);
    }
}
