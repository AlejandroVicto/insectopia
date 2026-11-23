package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;

class AdminEliminacionAvatarTests {
    @Test void eliminacionEncolaAvatarSinEliminarArchivosAntesDeCommit() {
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        RolRepository roles = mock(RolRepository.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        LimpiezaArchivosCuentaService archivos = mock(LimpiezaArchivosCuentaService.class);
        Rol rol = new Rol(); rol.setNombre("USUARIO");
        Usuario objetivo = new Usuario(); objetivo.setIdUsuario(7L); objetivo.setRol(rol);
        objetivo.setNombreUsuario("objetivo");
        objetivo.setFotoPerfil("https://api.test.invalid/api/usuarios/7/avatar?v=11111111-1111-1111-1111-111111111111.png");
        when(roles.bloquearAdministrador()).thenReturn(Optional.of(new Rol()));
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(objetivo));
        when(jdbc.queryForList(anyString(), eq(String.class), eq(7L))).thenReturn(List.of());
        InsectopiaUserDetails admin = new InsectopiaUserDetails(1L, "admin@test.invalid", "hash",
                "ADMINISTRADOR", 0, Permissions.authoritiesFor("ADMINISTRADOR"));
        var servicio = new AdminEliminacionService(usuarios, roles, jdbc, archivos);
        TransactionSynchronizationManager.initSynchronization();
        try {
            servicio.eliminar(7L, admin);
            verify(archivos).registrarAvatar(objetivo);
            verify(archivos, never()).procesarPendientes();
            assertEquals(1, TransactionSynchronizationManager.getSynchronizations().size());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
