package com.insectopia.services;

import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * Punto único de envío de correo del sistema. Usa JavaMailSender: sirve igual con
 * Mailpit en localhost que con Postfix en 127.0.0.1:25 en el VPS.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String ASUNTO = "Insectopia — Recuperación de contraseña";

    private final JavaMailSender mailSender;
    private final PasswordRecoveryProperties properties;

    public EmailService(JavaMailSender mailSender, PasswordRecoveryProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    public void enviarRecuperacion(String correo, String enlace) {
        String cuerpo = """
                Hola:

                Recibimos una solicitud para restablecer la contraseña de tu cuenta de Insectopia.

                Para crear una nueva contraseña, abre el siguiente enlace:

                %s

                Por seguridad, este enlace caducará en %d minutos y solo puede utilizarse una vez.

                Si no solicitaste este cambio, puedes ignorar el mensaje.

                Equipo de Insectopia.
                """.formatted(enlace, properties.expirationMinutes());
        enviar(correo, ASUNTO, cuerpo);
    }

    /** Reutilizable para futuros correos del sistema; nunca acepta contraseñas. */
    public void enviar(String destinatario, String asunto, String cuerpo) {
        try {
            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper ayuda = new MimeMessageHelper(mensaje, false, StandardCharsets.UTF_8.name());
            ayuda.setFrom(properties.mailFrom());
            ayuda.setTo(destinatario);
            ayuda.setSubject(asunto);
            // En Spring 7 setText(String, String) es para alternativas multipart;
            // el charset del cuerpo se fija directamente en el MimeMessage.
            mensaje.setText(cuerpo, StandardCharsets.UTF_8.name());
            mensaje.setHeader("Content-Type", "text/plain; charset=" + StandardCharsets.UTF_8.name());
            mailSender.send(mensaje);
        } catch (MessagingException exception) {
            throw new MailSendException("No se pudo preparar el correo", exception);
        } catch (MailException exception) {
            // Sin token, sin enlace y sin cuerpo: sólo se registra el destinatario enmascarado.
            log.warn("Fallo SMTP al enviar correo de recuperación a {}", enmascarar(destinatario), exception);
            throw exception;
        }
    }

    static String enmascarar(String correo) {
        if (correo == null) return "<desconocido>";
        int arroba = correo.indexOf('@');
        if (arroba <= 1) return "***";
        return correo.substring(0, 1) + "***" + correo.substring(arroba);
    }
}
