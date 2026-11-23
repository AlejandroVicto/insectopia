package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

import com.insectopia.exceptions.ImagenInvalidaException;
import com.insectopia.exceptions.ResourceNotFoundException;

class AlmacenamientoImagenesServiceTests {
    @TempDir Path temp;

    private byte[] imagen(String formato) throws Exception {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), formato, buffer);
        return buffer.toByteArray();
    }

    @Test void guardaSirveYEliminaJpegYPngSinUsarNombreDelCliente() throws Exception {
        var storage = new AlmacenamientoImagenesService(temp.toString());
        for (String formato : new String[]{"jpeg", "png"}) {
            String extension = formato.equals("jpeg") ? "jpg" : "png";
            String nombre = storage.guardar(new MockMultipartFile("imagen", "mi_foto." + extension,
                    "image/" + formato, imagen(formato)));
            assertTrue(nombre.matches("[0-9a-f-]{36}\\." + extension));
            assertTrue(Files.exists(temp.resolve(nombre)));
            assertTrue(storage.leer(nombre).contentLength() > 0);
            storage.eliminar(nombre);
            assertThrows(ResourceNotFoundException.class, () -> storage.leer(nombre));
        }
    }

    @Test void rechazaArchivosVaciosGrandesCorruptosYSuplantaciones() throws Exception {
        var storage = new AlmacenamientoImagenesService(temp.toString());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ImagenInvalidaException.class,
                () -> storage.guardar(new MockMultipartFile("imagen", "vacia.png", "image/png", new byte[0]))).getStatus());
        assertEquals(HttpStatus.CONTENT_TOO_LARGE, assertThrows(ImagenInvalidaException.class,
                () -> storage.guardar(new MockMultipartFile("imagen", "grande.png", "image/png", new byte[5 * 1024 * 1024 + 1]))).getStatus());
        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, assertThrows(ImagenInvalidaException.class,
                () -> storage.guardar(new MockMultipartFile("imagen", "falsa.png", "image/png", "<svg/>".getBytes()))).getStatus());
        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, assertThrows(ImagenInvalidaException.class,
                () -> storage.guardar(new MockMultipartFile("imagen", "falsa.jpg", "image/png", imagen("png")))).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ImagenInvalidaException.class,
                () -> storage.guardar(new MockMultipartFile("imagen", "../escape.png", "image/png", imagen("png")))).getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ImagenInvalidaException.class,
                () -> storage.guardar(new MockMultipartFile("imagen", "truncada.png", "image/png",
                        new byte[]{(byte)137, 80, 78, 71, 13, 10, 26, 10}))).getStatus());
        assertThrows(ResourceNotFoundException.class, () -> storage.leer("../secret.jpg"));
        assertEquals(0, Files.list(temp).count());
    }

    @Test void marcaAntesDePersistirYReintentaSoloArchivosPropiosSinSeguirRutas() throws Exception {
        var storage = new AlmacenamientoImagenesService(temp.toString());
        String nombre = storage.guardarAvatar(new MockMultipartFile("imagen", "foto.png", "image/png", imagen("png")));
        Path marca = temp.resolve(nombre + ".pendiente");
        assertTrue(Files.exists(marca));
        assertTrue(storage.avataresPendientes(Duration.ofHours(24)).isEmpty());
        Files.setLastModifiedTime(marca, FileTime.from(Instant.now().minus(Duration.ofDays(2))));
        assertEquals(java.util.List.of(nombre), storage.avataresPendientes(Duration.ofHours(24)));
        assertTrue(storage.eliminarAvatarPendiente(nombre));
        assertFalse(Files.exists(marca));
        assertFalse(Files.exists(temp.resolve(nombre)));
        String confirmado = storage.guardarAvatar(new MockMultipartFile("imagen", "foto.jpg", "image/jpeg", imagen("jpeg")));
        assertTrue(storage.confirmarAvatar(confirmado));
        assertTrue(Files.exists(temp.resolve(confirmado)));
        assertFalse(Files.exists(temp.resolve(confirmado + ".pendiente")));
    }

    @Test void archivoCorruptoNoCreaMarcaNiImagen() throws Exception {
        var storage = new AlmacenamientoImagenesService(temp.toString());
        assertThrows(ImagenInvalidaException.class, () -> storage.guardarAvatar(
                new MockMultipartFile("imagen", "corrupta.png", "image/png", new byte[]{1, 2, 3})));
        assertEquals(0, Files.list(temp).count());
    }

    @Test void falloDeBorradoDejaMarcaDurableYElReintentoLaRetira() throws Exception {
        var storage = new AlmacenamientoImagenesService(temp.toString());
        String nombre = storage.guardarAvatar(new MockMultipartFile("imagen", "avatar.png", "image/png", imagen("png")));
        Path destino = temp.resolve(nombre);
        Path marca = temp.resolve(nombre + ".pendiente");
        // Simula un error de almacenamiento determinista en cualquier SO: directorio no vacío.
        Files.delete(destino);
        Files.createDirectory(destino);
        Path bloqueo = Files.write(destino.resolve("bloqueo"), new byte[]{1});
        assertFalse(storage.eliminarAvatarPendiente(nombre));
        assertTrue(Files.exists(marca));
        Files.setLastModifiedTime(marca, FileTime.from(Instant.now().minus(Duration.ofDays(2))));
        assertEquals(java.util.List.of(nombre), storage.avataresPendientes(Duration.ofHours(24)));
        Files.delete(bloqueo);
        assertTrue(storage.eliminarAvatarPendiente(nombre));
        assertFalse(Files.exists(destino));
        assertFalse(Files.exists(marca));
    }

    @Test void errorDeAlmacenamientoNoDejaAvatarNiMarca() throws Exception {
        Path rutaInvalida = Files.write(temp.resolve("no-es-directorio"), new byte[]{1});
        var storage = new AlmacenamientoImagenesService(rutaInvalida.toString());
        assertThrows(IllegalStateException.class, () -> storage.guardarAvatar(
                new MockMultipartFile("imagen", "avatar.png", "image/png", imagen("png"))));
        assertEquals(1, Files.list(temp).count());
    }
}
