package com.insectopia.services;

import java.util.regex.Pattern;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import com.insectopia.models.Usuario;
import com.insectopia.repository.UsuarioRepository;

/** Outbox transaccional para archivos propios, seguro frente a rollback y reinicios. */
@Service
public class LimpiezaArchivosCuentaService {
    private static final Pattern NOMBRE = Pattern.compile("[0-9a-fA-F-]{36}\\.(jpg|png)");
    private final JdbcTemplate jdbc;
    private final AlmacenamientoImagenesService publicaciones;
    private final AlmacenamientoImagenesService eventos;
    private final AlmacenamientoImagenesService avatares;
    private final UsuarioRepository usuarios;
    private final String baseUrl;

    public LimpiezaArchivosCuentaService(JdbcTemplate jdbc, AlmacenamientoImagenesService publicaciones,
            @Qualifier("imagenesEventos") AlmacenamientoImagenesService eventos,
            @Qualifier("imagenesAvatares") AlmacenamientoImagenesService avatares,
            UsuarioRepository usuarios,
            @Value("${app.api.public-url:http://localhost:8080}") String baseUrl) {
        this.jdbc = jdbc;
        this.publicaciones = publicaciones;
        this.eventos = eventos;
        this.avatares = avatares;
        this.usuarios = usuarios;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    public void registrar(String tipo, String ruta) {
        String nombre = "evento".equals(tipo) && ruta != null && ruta.startsWith("eventos/")
                ? ruta.substring(8) : ruta;
        if (!NOMBRE.matcher(nombre == null ? "" : nombre).matches()) return; // Nunca borrar rutas externas o arbitrarias.
        jdbc.update("INSERT IGNORE INTO limpieza_archivos_pendientes (tipo, nombre) VALUES (?, ?)", tipo, nombre);
    }

    /** No sigue URLs legacy o ajenas: únicamente el avatar local de ESTA cuenta. */
    public void registrarAvatar(Usuario usuario) {
        String ruta = usuario.getFotoPerfil();
        String prefijo = baseUrl + "/api/usuarios/" + usuario.getIdUsuario() + "/avatar?v=";
        if (ruta == null || !ruta.startsWith(prefijo)) return;
        String nombre = ruta.substring(prefijo.length());
        if (NOMBRE.matcher(nombre).matches()) registrar("avatar", nombre);
    }

    // Se procesa periódicamente (y tras reinicios), nunca en el hilo de la transacción del borrado.
    @Scheduled(initialDelayString = "${app.admin.file-cleanup-delay-ms:60000}",
            fixedDelayString = "${app.admin.file-cleanup-delay-ms:60000}")
    public void procesarPendientes() {
        var filas = jdbc.queryForList("SELECT id, tipo, nombre FROM limpieza_archivos_pendientes ORDER BY id LIMIT 100");
        for (var fila : filas) {
            String tipo = (String) fila.get("tipo");
            String nombre = (String) fila.get("nombre");
            if ("avatar".equals(tipo) && referenciado(nombre)) continue;
            AlmacenamientoImagenesService almacen = switch (tipo) {
                case "evento" -> eventos;
                case "avatar" -> avatares;
                case "publicacion" -> publicaciones;
                default -> null;
            };
            boolean eliminado = almacen != null && almacen.eliminarPendiente(nombre);
            if (eliminado) jdbc.update("DELETE FROM limpieza_archivos_pendientes WHERE id = ?", fila.get("id"));
        }
        // La marca persiste aunque la BD falle durante rollback o el proceso se reinicie.
        // 24 h evita borrar un archivo de una transacción todavía en curso.
        for (String nombre : avatares.avataresPendientes(Duration.ofHours(24))) {
            if (referenciado(nombre)) avatares.confirmarAvatar(nombre);
            else avatares.eliminarAvatarPendiente(nombre);
        }
    }

    private boolean referenciado(String nombre) {
        return usuarios.existsByFotoPerfilEndingWith("/avatar?v=" + nombre);
    }
}
