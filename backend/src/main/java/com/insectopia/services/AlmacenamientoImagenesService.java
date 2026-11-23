package com.insectopia.services;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Iterator;
import java.util.UUID;
import java.util.regex.Pattern;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.context.annotation.Primary;
import org.springframework.web.multipart.MultipartFile;

import com.insectopia.exceptions.ImagenInvalidaException;
import com.insectopia.exceptions.ResourceNotFoundException;

@Service
@Primary
public class AlmacenamientoImagenesService {
    private static final Logger log = LoggerFactory.getLogger(AlmacenamientoImagenesService.class);
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Pattern NOMBRE = Pattern.compile("[0-9a-fA-F-]{36}\\.(jpg|png)");
    private final Path directorio;

    public AlmacenamientoImagenesService(@Value("${app.storage.publicaciones.path:./uploads/publicaciones}") String ruta) {
        directorio = Path.of(ruta).toAbsolutePath().normalize();
    }

    public String guardar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) throw new ImagenInvalidaException(HttpStatus.BAD_REQUEST, "La imagen es obligatoria");
        if (archivo.getSize() > MAX_BYTES) throw new ImagenInvalidaException(HttpStatus.CONTENT_TOO_LARGE, "La imagen supera 5 MB");
        String original = archivo.getOriginalFilename();
        if (original == null || original.contains("/") || original.contains("\\") || original.contains("..")) {
            throw new ImagenInvalidaException(HttpStatus.BAD_REQUEST, "Nombre de archivo inválido");
        }
        String mime = archivo.getContentType();
        String formato;
        if ("image/jpeg".equals(mime) && original.toLowerCase(java.util.Locale.ROOT).matches(".+\\.jpe?g")) {
            formato = "JPEG";
        } else if ("image/png".equals(mime) && original.toLowerCase(java.util.Locale.ROOT).endsWith(".png")) {
            formato = "PNG";
        } else {
            throw new ImagenInvalidaException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Solo se admiten JPEG y PNG");
        }
        try {
            byte[] bytes = archivo.getBytes();
            if (bytes.length > MAX_BYTES) throw new ImagenInvalidaException(HttpStatus.CONTENT_TOO_LARGE, "La imagen supera 5 MB");
            if (!firmaValida(bytes, formato)) throw new ImagenInvalidaException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Firma de imagen inválida");
            byte[] limpio = decodificarYReescribir(bytes, formato);
            if (limpio.length > MAX_BYTES) throw new ImagenInvalidaException(HttpStatus.CONTENT_TOO_LARGE, "La imagen procesada supera 5 MB");
            Files.createDirectories(directorio);
            String nombre = UUID.randomUUID() + ("PNG".equals(formato) ? ".png" : ".jpg");
            Path destino = rutaSegura(nombre);
            try {
                Files.write(destino, limpio, StandardOpenOption.CREATE_NEW);
            } catch (IOException exception) {
                Files.deleteIfExists(destino);
                throw exception;
            }
            return nombre;
        } catch (IOException exception) {
            throw new IllegalStateException("No se pudo almacenar la fotografía", exception);
        }
    }

    private boolean firmaValida(byte[] b, String formato) {
        if ("PNG".equals(formato)) {
            byte[] firma = {(byte) 137, 80, 78, 71, 13, 10, 26, 10};
            if (b.length < firma.length) return false;
            for (int i = 0; i < firma.length; i++) if (b[i] != firma[i]) return false;
            return true;
        }
        return b.length >= 3 && (b[0] & 255) == 255 && (b[1] & 255) == 216 && (b[2] & 255) == 255;
    }

    private byte[] decodificarYReescribir(byte[] bytes, String formato) throws IOException {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (input == null) throw new ImagenInvalidaException(HttpStatus.BAD_REQUEST, "Imagen corrupta");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new ImagenInvalidaException(HttpStatus.BAD_REQUEST, "Imagen corrupta");
            ImageReader reader = readers.next();
            try {
                if (!formato.equalsIgnoreCase(reader.getFormatName())) {
                    throw new ImagenInvalidaException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Formato de imagen incorrecto");
                }
                reader.setInput(input, true, true);
                int ancho = reader.getWidth(0), alto = reader.getHeight(0);
                if (ancho < 1 || alto < 1 || ancho > 8000 || alto > 8000 || (long) ancho * alto > 20_000_000L) {
                    throw new ImagenInvalidaException(HttpStatus.BAD_REQUEST, "Dimensiones de imagen no admitidas");
                }
                BufferedImage imagen = reader.read(0);
                ByteArrayOutputStream salida = new ByteArrayOutputStream();
                // Re-encode removes client metadata and trailing embedded content.
                if ("JPEG".equals(formato) && imagen.getColorModel().hasAlpha()) {
                    BufferedImage rgb = new BufferedImage(ancho, alto, BufferedImage.TYPE_INT_RGB);
                    java.awt.Graphics2D graphics = rgb.createGraphics();
                    try { graphics.drawImage(imagen, 0, 0, null); } finally { graphics.dispose(); }
                    imagen = rgb;
                }
                if (!ImageIO.write(imagen, formato, salida)) throw new IOException("Encoder no disponible");
                return salida.toByteArray();
            } finally {
                reader.dispose();
            }
        } catch (javax.imageio.IIOException exception) {
            throw new ImagenInvalidaException(HttpStatus.BAD_REQUEST, "Imagen corrupta");
        }
    }

    public Resource leer(String nombre) {
        Path ruta = rutaSegura(nombre);
        try {
            Resource recurso = new UrlResource(ruta.toUri());
            if (!recurso.isReadable()) throw new ResourceNotFoundException("imagen", nombre);
            return recurso;
        } catch (java.net.MalformedURLException exception) {
            throw new IllegalStateException("No se pudo leer la fotografía", exception);
        }
    }

    public void eliminar(String nombre) {
        try {
            Files.deleteIfExists(rutaSegura(nombre));
        } catch (IOException | ResourceNotFoundException exception) {
            // Best effort after commit; never roll back a committed DB reference to a missing file.
            log.warn("No se pudo limpiar una fotografía anterior", exception);
        }
    }

    /** Usado por la cola durable: el fallo debe conservar la tarea para reintentar. */
    public boolean eliminarPendiente(String nombre) {
        try {
            Files.deleteIfExists(rutaSegura(nombre));
            return true;
        } catch (IOException | ResourceNotFoundException exception) {
            log.warn("Limpieza de imagen pendiente; se reintentará", exception);
            return false;
        }
    }

    private Path rutaSegura(String nombre) {
        if (nombre == null || !NOMBRE.matcher(nombre).matches()) {
            throw new ResourceNotFoundException("imagen", nombre);
        }
        Path destino = directorio.resolve(nombre).normalize();
        if (!destino.getParent().equals(directorio)) throw new ResourceNotFoundException("imagen", nombre);
        return destino;
    }
}
