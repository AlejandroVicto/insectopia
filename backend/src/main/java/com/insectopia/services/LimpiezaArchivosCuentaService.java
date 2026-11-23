package com.insectopia.services;

import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Outbox transaccional para archivos propios, seguro frente a rollback y reinicios. */
@Service
public class LimpiezaArchivosCuentaService {
    private static final Pattern NOMBRE = Pattern.compile("[0-9a-fA-F-]{36}\\.(jpg|png)");
    private final JdbcTemplate jdbc;
    private final AlmacenamientoImagenesService publicaciones;
    private final AlmacenamientoImagenesService eventos;

    public LimpiezaArchivosCuentaService(JdbcTemplate jdbc, AlmacenamientoImagenesService publicaciones,
            @Qualifier("imagenesEventos") AlmacenamientoImagenesService eventos) {
        this.jdbc = jdbc;
        this.publicaciones = publicaciones;
        this.eventos = eventos;
    }

    public void registrar(String tipo, String ruta) {
        String nombre = "evento".equals(tipo) && ruta != null && ruta.startsWith("eventos/")
                ? ruta.substring(8) : ruta;
        if (!NOMBRE.matcher(nombre == null ? "" : nombre).matches()) return; // Nunca borrar rutas externas o arbitrarias.
        jdbc.update("INSERT IGNORE INTO limpieza_archivos_pendientes (tipo, nombre) VALUES (?, ?)", tipo, nombre);
    }

    // Se procesa periódicamente (y tras reinicios), nunca en el hilo de la transacción del borrado.
    @Scheduled(initialDelayString = "${app.admin.file-cleanup-delay-ms:60000}",
            fixedDelayString = "${app.admin.file-cleanup-delay-ms:60000}")
    public void procesarPendientes() {
        var filas = jdbc.queryForList("SELECT id, tipo, nombre FROM limpieza_archivos_pendientes ORDER BY id LIMIT 100");
        for (var fila : filas) {
            String tipo = (String) fila.get("tipo");
            boolean eliminado = ("evento".equals(tipo) ? eventos : publicaciones)
                    .eliminarPendiente((String) fila.get("nombre"));
            if (eliminado) jdbc.update("DELETE FROM limpieza_archivos_pendientes WHERE id = ?", fila.get("id"));
        }
    }
}
