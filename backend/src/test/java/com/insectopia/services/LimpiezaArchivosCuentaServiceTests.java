package com.insectopia.services;

import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.models.Usuario;

class LimpiezaArchivosCuentaServiceTests {
    @Test void falloDeArchivoConservaTareaYReintentaDespues() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        AlmacenamientoImagenesService publicaciones = mock(AlmacenamientoImagenesService.class);
        AlmacenamientoImagenesService eventos = mock(AlmacenamientoImagenesService.class);
        var servicio = new LimpiezaArchivosCuentaService(jdbc, publicaciones, eventos,
                mock(AlmacenamientoImagenesService.class), mock(UsuarioRepository.class), "https://api.test.invalid");
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

    @Test void soloRegistraAvatarDelIdYOrigenPropiosEnOutbox() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        var servicio = new LimpiezaArchivosCuentaService(jdbc, mock(AlmacenamientoImagenesService.class),
                mock(AlmacenamientoImagenesService.class), mock(AlmacenamientoImagenesService.class),
                mock(UsuarioRepository.class), "https://api.test.invalid");
        Usuario u = new Usuario(); u.setIdUsuario(7L);
        String nombre = "11111111-1111-1111-1111-111111111111.png";
        u.setFotoPerfil("https://api.test.invalid/api/usuarios/7/avatar?v=" + nombre);
        servicio.registrarAvatar(u);
        verify(jdbc).update("INSERT IGNORE INTO limpieza_archivos_pendientes (tipo, nombre) VALUES (?, ?)", "avatar", nombre);
        for (String ajena : List.of("https://api.test.invalid/api/usuarios/8/avatar?v=" + nombre,
                "https://externo.test.invalid/api/usuarios/7/avatar?v=" + nombre,
                "https://api.test.invalid/api/usuarios/7/avatar?v=../../publicacion.png")) {
            u.setFotoPerfil(ajena);
            servicio.registrarAvatar(u);
        }
        verifyNoMoreInteractions(jdbc);
    }

    @Test void reintentaSinBorrarAvataresReferenciadosNiArchivosDeOtrasSecciones() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        AlmacenamientoImagenesService avatares = mock(AlmacenamientoImagenesService.class);
        AlmacenamientoImagenesService publicaciones = mock(AlmacenamientoImagenesService.class);
        AlmacenamientoImagenesService eventos = mock(AlmacenamientoImagenesService.class);
        var servicio = new LimpiezaArchivosCuentaService(jdbc, publicaciones, eventos, avatares,
                usuarios, "https://api.test.invalid");
        String usado = "11111111-1111-1111-1111-111111111111.jpg";
        String huerfano = "22222222-2222-2222-2222-222222222222.png";
        when(jdbc.queryForList(anyString())).thenReturn(List.of(Map.of("id", 1L, "tipo", "avatar", "nombre", usado),
                Map.of("id", 2L, "tipo", "avatar", "nombre", huerfano)));
        when(usuarios.existsByFotoPerfilEndingWith("/avatar?v=" + usado)).thenReturn(true);
        when(avatares.eliminarPendiente(huerfano)).thenReturn(false, true);
        when(avatares.avataresPendientes(any())).thenReturn(List.of());
        servicio.procesarPendientes();
        verify(jdbc, never()).update("DELETE FROM limpieza_archivos_pendientes WHERE id = ?", 2L);
        servicio.procesarPendientes();
        verify(jdbc).update("DELETE FROM limpieza_archivos_pendientes WHERE id = ?", 2L);
        verify(avatares, never()).eliminarPendiente(usado);
        verifyNoInteractions(publicaciones, eventos);
    }

    @Test void marcaDeRollbackReintentaYConservaAvatarConfirmado() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        AlmacenamientoImagenesService avatares = mock(AlmacenamientoImagenesService.class);
        var servicio = new LimpiezaArchivosCuentaService(jdbc, mock(AlmacenamientoImagenesService.class),
                mock(AlmacenamientoImagenesService.class), avatares, usuarios, "https://api.test.invalid");
        String fallido = "11111111-1111-1111-1111-111111111111.png";
        String vigente = "22222222-2222-2222-2222-222222222222.jpg";
        when(avatares.avataresPendientes(any())).thenReturn(List.of(fallido, vigente));
        when(usuarios.existsByFotoPerfilEndingWith("/avatar?v=" + vigente)).thenReturn(true);
        when(avatares.eliminarAvatarPendiente(fallido)).thenReturn(false, true);
        servicio.procesarPendientes();
        servicio.procesarPendientes();
        verify(avatares, times(2)).eliminarAvatarPendiente(fallido);
        verify(avatares, times(2)).confirmarAvatar(vigente);
        verify(avatares, never()).eliminarAvatarPendiente(vigente);
    }
}
