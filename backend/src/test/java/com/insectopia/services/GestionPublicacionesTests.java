package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.insectopia.dtos.publicaciones.PublicacionUpdateRequestDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Publicacion;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoPublicacion;
import com.insectopia.repository.*;
import com.insectopia.security.*;

@ExtendWith(MockitoExtension.class)
class GestionPublicacionesTests {
    @Mock PublicacionRepository publicaciones;
    @Mock ComentarioRepository comentarios;
    @Mock ReaccionRepository reacciones;
    @Mock UsuarioRepository usuarios;
    @Mock AlmacenamientoImagenesService imagenes;
    PublicacionesService service;
    Publicacion publicacion;

    InsectopiaUserDetails usuario(long id, String rol) {
        return new InsectopiaUserDetails(id, "user@test.local", "hash", rol, 0, Permissions.authoritiesFor(rol));
    }

    @BeforeEach void setup() {
        service = new PublicacionesService(publicaciones, comentarios, reacciones, usuarios, imagenes);
        Usuario autor = new Usuario(); autor.setIdUsuario(1L); autor.setNombre("Autor"); autor.setNombreUsuario("autor");
        publicacion = new Publicacion(); publicacion.setIdPublicacion(24L); publicacion.setUsuario(autor);
        publicacion.setEstado(EstadoPublicacion.VISIBLE); publicacion.setContenido("Anterior");
        publicacion.setImagen("a0000000-0000-0000-0000-000000000000.jpg");
        publicacion.setFechaPublicacion(LocalDateTime.now().minusDays(2));
        lenient().when(publicaciones.findById(24L)).thenReturn(Optional.of(publicacion));
        lenient().when(publicaciones.bloquearParaEscritura(24L)).thenReturn(Optional.of(publicacion));
    }

    @Test void autorYAdminEditanSinModificarImagenNiAutor() {
        var fecha = publicacion.getFechaPublicacion(); var imagen = publicacion.getImagen();
        assertEquals("Nuevo", service.editar(24L, new PublicacionUpdateRequestDTO(" Nuevo ", null), usuario(1, "USUARIO")).contenido());
        assertEquals(imagen, publicacion.getImagen()); assertEquals(fecha, publicacion.getFechaPublicacion());
        assertEquals(1L, publicacion.getUsuario().getIdUsuario());
        service.editar(24L, new PublicacionUpdateRequestDTO("Admin", null), usuario(2, "ADMINISTRADOR"));
        verify(publicaciones, times(2)).saveAndFlush(publicacion);
    }

    @Test void ajenoYModeradorAjenoNoEditanNiEliminan() {
        for (String rol : new String[]{"USUARIO", "MODERADOR"}) {
            assertThrows(AccessDeniedException.class, () -> service.editar(24L, new PublicacionUpdateRequestDTO("X", null), usuario(2, rol)));
            assertThrows(AccessDeniedException.class, () -> service.eliminar(24L, usuario(2, rol)));
        }
        assertThrows(BusinessRuleException.class, () -> service.editar(24L, new PublicacionUpdateRequestDTO(" ", null), usuario(1, "MODERADOR")));
        verify(publicaciones, never()).saveAndFlush(any());
    }

    @Test void eliminaLogicamenteIdempotenteYBloqueaInteracciones() {
        service.eliminar(24L, usuario(1, "USUARIO"));
        service.eliminar(24L, usuario(2, "ADMINISTRADOR"));
        assertEquals(EstadoPublicacion.ELIMINADA, publicacion.getEstado());
        verify(publicaciones, times(1)).saveAndFlush(publicacion);
        verify(publicaciones, never()).delete(any(Publicacion.class));
        assertThrows(ResourceNotFoundException.class, () -> service.crearComentario(24L, null, usuario(1, "USUARIO")));
        assertThrows(ResourceNotFoundException.class, () -> service.leerImagen(24L));
    }

    @Test void inexistenteDa404() {
        assertThrows(ResourceNotFoundException.class, () -> service.editar(99L, new PublicacionUpdateRequestDTO("texto", null), usuario(1,"USUARIO")));
    }

    @Test void imagenReemplazadaCompensaRollbackYQuitarEsPostCommit() {
        var archivo = new MockMultipartFile("imagen", "foto.png", "image/png", new byte[]{1});
        when(imagenes.guardar(archivo)).thenReturn("b0000000-0000-0000-0000-000000000000.png");
        TransactionSynchronizationManager.initSynchronization();
        try {
            assertEquals("/api/publicaciones/24/imagen", service.subirImagen(24L, archivo, usuario(1,"USUARIO")).imagenUrl());
            var sync = TransactionSynchronizationManager.getSynchronizations().getFirst();
            sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
            verify(imagenes).eliminar("b0000000-0000-0000-0000-000000000000.png");
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
        publicacion.setImagen("a0000000-0000-0000-0000-000000000000.jpg");
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.quitarImagen(24L, usuario(1,"USUARIO"));
            assertNull(publicacion.getImagen());
            verify(imagenes, never()).eliminar("a0000000-0000-0000-0000-000000000000.jpg");
            TransactionSynchronizationManager.getSynchronizations().getFirst().afterCompletion(TransactionSynchronization.STATUS_COMMITTED);
            verify(imagenes).eliminar("a0000000-0000-0000-0000-000000000000.jpg");
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }

    @Test void falloEnPersistenciaBorraNuevoYConservaAnterior() {
        var archivo = new MockMultipartFile("imagen", "foto.png", "image/png", new byte[]{1});
        when(imagenes.guardar(archivo)).thenReturn("b0000000-0000-0000-0000-000000000000.png");
        doThrow(new IllegalStateException("db")).when(publicaciones).saveAndFlush(publicacion);
        assertThrows(IllegalStateException.class, () -> service.subirImagen(24L, archivo, usuario(1,"USUARIO")));
        verify(imagenes).eliminar("b0000000-0000-0000-0000-000000000000.png");
        verify(imagenes, never()).eliminar("a0000000-0000-0000-0000-000000000000.jpg");
    }

    @Test void ajenoNoPuedeSubirNiQuitarYSinFotoNoAccedeAlDisco() {
        var archivo = new MockMultipartFile("imagen", "foto.png", "image/png", new byte[]{1});
        assertThrows(AccessDeniedException.class, () -> service.subirImagen(24L, archivo, usuario(3,"USUARIO")));
        assertThrows(AccessDeniedException.class, () -> service.quitarImagen(24L, usuario(3,"MODERADOR")));
        verifyNoInteractions(imagenes);
        publicacion.setImagen(null);
        assertThrows(ResourceNotFoundException.class, () -> service.leerImagen(24L));
    }

    @Test void siFallaAlmacenamientoNoSeEscribeBaseDeDatos() {
        var archivo = new MockMultipartFile("imagen", "foto.png", "image/png", new byte[]{1});
        when(imagenes.guardar(archivo)).thenThrow(new IllegalStateException("disco"));
        assertThrows(IllegalStateException.class, () -> service.subirImagen(24L, archivo, usuario(1,"USUARIO")));
        assertEquals("a0000000-0000-0000-0000-000000000000.jpg", publicacion.getImagen());
        verify(publicaciones, never()).saveAndFlush(any());
    }
}
