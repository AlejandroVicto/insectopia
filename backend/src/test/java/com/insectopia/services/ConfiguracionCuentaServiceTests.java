package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.sql.SQLException;
import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.insectopia.dtos.ActualizarPerfilRequestDTO;
import com.insectopia.dtos.CambiarContrasenaRequest;
import com.insectopia.exceptions.CatalogoNoDisponibleException;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.TokenRecuperacionRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;

@ExtendWith(MockitoExtension.class)
class ConfiguracionCuentaServiceTests {
    @Mock UsuarioRepository usuarios;
    @Mock TokenRecuperacionRepository tokens;
    @Mock CatalogoUbicacionesService catalogo;
    @Mock AlmacenamientoImagenesService imagenes;
    @Mock LimpiezaArchivosCuentaService limpieza;
    ConfiguracionCuentaService service;
    Usuario usuario;
    InsectopiaUserDetails principal;
    final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);

    @BeforeEach void preparar() {
        service = new ConfiguracionCuentaService(usuarios, tokens, encoder, catalogo, imagenes, limpieza,
                "https://api.test.invalid");
        usuario = new Usuario(); usuario.setIdUsuario(7L); usuario.setNombre("María");
        usuario.setNombreUsuario("maria"); usuario.setCorreo("maria@test.invalid");
        usuario.setFechaNacimiento(LocalDate.of(2000, 1, 1)); usuario.setPaisCodigo("MX");
        usuario.setEstadoRegion("Jalisco"); usuario.setContrasena(encoder.encode("Actual123!"));
        usuario.setVersionToken(3); usuario.setEstado(EstadoUsuario.ACTIVO);
        Rol rol = new Rol(); rol.setNombre("USUARIO"); usuario.setRol(rol);
        principal = new InsectopiaUserDetails(7L, usuario.getCorreo(), "hash", "USUARIO", 3,
                Permissions.authoritiesFor("USUARIO"));
    }

    private ActualizarPerfilRequestDTO datos() {
        return new ActualizarPerfilRequestDTO(" Ana ", " ANA_2 ", "bio", "Otro", "mx",
                " Jalisco ", LocalDate.of(1999, 1, 1), null);
    }

    @Test void actualizaSoloCamposPermitidosYIdentidadDelPrincipal() {
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario));
        when(catalogo.validarRegion("MX", "Jalisco")).thenReturn("Jalisco");
        var dto = service.actualizar(datos(), principal);
        assertEquals("ana_2", dto.nombreUsuario());
        assertEquals("maria@test.invalid", usuario.getCorreo());
        assertEquals("USUARIO", usuario.getRol().getNombre());
        assertEquals(3, usuario.getVersionToken());
        assertEquals("hash", principal.passwordHash());
        assertEquals(LocalDate.of(1999, 1, 1), usuario.getFechaNacimiento());
        verify(usuarios).saveAndFlush(usuario);
        verify(usuarios).bloquearPorId(7L);
    }

    @Test void duplicadoYCarreraDeClaveUnicaSon409PorNombreUsuario() {
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario));
        when(usuarios.existsByNombreUsuarioAndIdUsuarioNot("ana_2", 7L)).thenReturn(true);
        DuplicateResourceException duplicado = assertThrows(DuplicateResourceException.class,
                () -> service.actualizar(datos(), principal));
        assertEquals("nombreUsuario", duplicado.getField());
        when(usuarios.existsByNombreUsuarioAndIdUsuarioNot("ana_2", 7L)).thenReturn(false);
        when(catalogo.validarRegion("MX", "Jalisco")).thenReturn("Jalisco");
        when(usuarios.saveAndFlush(usuario)).thenThrow(new DataIntegrityViolationException("duplicado",
                new SQLException("Duplicate entry for key 'uk_usuarios_nombre_usuario'", "23000", 1062)));
        assertEquals("nombreUsuario", assertThrows(DuplicateResourceException.class,
                () -> service.actualizar(datos(), principal)).getField());
    }

    @Test void catalogoIndisponibleNoGuarda() {
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario));
        when(catalogo.validarRegion("MX", "Jalisco")).thenThrow(new CatalogoNoDisponibleException());
        assertThrows(CatalogoNoDisponibleException.class, () -> service.actualizar(datos(), principal));
        verify(usuarios, never()).saveAndFlush(any());
    }

    @Test void cambiarContrasenaCodificaIncrementaUnaVezEInvalidaEnlaces() {
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario));
        var resultado = service.cambiarContrasena(new CambiarContrasenaRequest("Actual123!", "Nueva456!"), principal);
        assertTrue(resultado.requiereReautenticacion());
        assertEquals(4, usuario.getVersionToken());
        assertTrue(encoder.matches("Nueva456!", usuario.getContrasena()));
        assertFalse(encoder.matches("Actual123!", usuario.getContrasena()));
        verify(usuarios).saveAndFlush(usuario);
        verify(tokens).invalidarPendientes(eq(7L), any(), eq(-1L));
        assertFalse(resultado.toString().contains("Nueva456!"));
    }

    @Test void errorActualIgualYFalloDbNoInvalidanEnlaces() {
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario));
        assertEquals("contrasenaActual", assertThrows(RegistrationValidationException.class,
                () -> service.cambiarContrasena(new CambiarContrasenaRequest("Incorrecta1!", "Nueva456!"), principal)).getField());
        assertEquals("contrasenaNueva", assertThrows(RegistrationValidationException.class,
                () -> service.cambiarContrasena(new CambiarContrasenaRequest("Actual123!", "Actual123!"), principal)).getField());
        when(usuarios.saveAndFlush(usuario)).thenThrow(new IllegalStateException("persistencia fallida"));
        assertThrows(IllegalStateException.class,
                () -> service.cambiarContrasena(new CambiarContrasenaRequest("Actual123!", "Nueva456!"), principal));
        verifyNoInteractions(tokens);
    }

    @Test void imagenSiempreUsaCuentaAutenticadaYLimpiaEnRollback() {
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario));
        when(imagenes.guardarAvatar(any())).thenReturn("11111111-1111-1111-1111-111111111111.png");
        TransactionSynchronizationManager.initSynchronization();
        try {
            var dto = service.subirAvatar(mock(MultipartFile.class), principal);
            assertEquals("https://api.test.invalid/api/usuarios/7/avatar?v=11111111-1111-1111-1111-111111111111.png", dto.fotoPerfil());
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(1));
            verify(imagenes).eliminarAvatarPendiente("11111111-1111-1111-1111-111111111111.png");
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test void avatarEliminadoSeEncolaYUsuarioInactivoNoSePublica() {
        usuario.setFotoPerfil("https://api.test.invalid/api/usuarios/7/avatar?v=11111111-1111-1111-1111-111111111111.png");
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario));
        service.quitarAvatar(principal);
        assertNull(usuario.getFotoPerfil());
        verify(limpieza).registrar("avatar", "11111111-1111-1111-1111-111111111111.png");
        when(usuarios.findById(7L)).thenReturn(Optional.of(usuario));
        usuario.setEstado(EstadoUsuario.DESACTIVADO);
        assertThrows(com.insectopia.exceptions.ResourceNotFoundException.class, () -> service.leerAvatar(7L));
        verifyNoInteractions(imagenes);
    }

    @Test void reemplazoSoloEncolaAvatarAnteriorDelPropietarioYConfirmaNuevoTrasCommit() {
        String anterior = "11111111-1111-1111-1111-111111111111.jpg";
        String nuevo = "22222222-2222-2222-2222-222222222222.png";
        usuario.setFotoPerfil("https://api.test.invalid/api/usuarios/7/avatar?v=" + anterior);
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario));
        when(imagenes.guardarAvatar(any())).thenReturn(nuevo);
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.subirAvatar(mock(MultipartFile.class), principal);
            verify(limpieza).registrar("avatar", anterior);
            verify(limpieza, never()).registrar("avatar", nuevo);
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(0));
            verify(imagenes).confirmarAvatar(nuevo);
            verify(imagenes, never()).eliminarPendiente(anterior);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test void referenciaDeOtroIdNoSeEncolaNiSeElimina() {
        usuario.setFotoPerfil("https://api.test.invalid/api/usuarios/8/avatar?v=11111111-1111-1111-1111-111111111111.png");
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario));
        service.quitarAvatar(principal);
        verifyNoInteractions(limpieza, imagenes);
    }

    @Test void tokenYaRevocadoMientrasEsperabaBloqueoNoActualizaCuenta() {
        usuario.setVersionToken(4);
        when(usuarios.bloquearPorId(7L)).thenReturn(Optional.of(usuario));
        assertThrows(BadCredentialsException.class,
                () -> service.cambiarContrasena(new CambiarContrasenaRequest("Actual123!", "Nueva456!"), principal));
        verify(usuarios, never()).saveAndFlush(any());
        verifyNoInteractions(tokens);
    }
}
