package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Properties;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

class EmailServiceTests {

    private JavaMailSender sender;
    private EmailService service;

    @BeforeEach
    void setUp() {
        sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        PasswordRecoveryProperties properties = new PasswordRecoveryProperties("local", "",
                "http://localhost:5173", "no-reply@insectopia.invalid", 15,
                60, 3, 15, 30, 15, 10_000);
        service = new EmailService(sender, properties);
    }

    @Test
    void preparaMensajeUtf8ConRemitenteAsuntoEnlaceYCaducidad() throws Exception {
        String enlace = "http://localhost:5173/restablecer-contrasena?token=abcDEF123_-";

        service.enviarRecuperacion("persona@ejemplo.com", enlace);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(captor.capture());
        MimeMessage mensaje = captor.getValue();
        assertEquals("Insectopia — Recuperación de contraseña", mensaje.getSubject());
        assertEquals("no-reply@insectopia.invalid", ((InternetAddress) mensaje.getFrom()[0]).getAddress());
        assertEquals("persona@ejemplo.com", ((InternetAddress) mensaje.getAllRecipients()[0]).getAddress());
        assertTrue(mensaje.getContentType().toLowerCase().contains("utf-8"), mensaje.getContentType());
        String cuerpo = mensaje.getContent().toString();
        assertTrue(cuerpo.contains(enlace));
        assertTrue(cuerpo.contains("15 minutos"));
        assertTrue(cuerpo.contains("Equipo de Insectopia."));
        assertFalse(cuerpo.contains("contrasena="));
        assertEquals("p***@ejemplo.com", EmailService.enmascarar("persona@ejemplo.com"));
    }

    @Test
    void propagaFalloSMTPSinDevolverExito() {
        doThrow(new MailSendException("SMTP no disponible")).when(sender).send(any(MimeMessage.class));

        assertThrows(MailSendException.class,
                () -> service.enviarRecuperacion("persona@ejemplo.com", "http://localhost:5173/x?token=abc"));
    }
}
