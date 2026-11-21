package com.insectopia;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.dtos.mensajes.LecturaConversacionRequestDTO;
import com.insectopia.dtos.mensajes.MensajeCreateRequestDTO;
import com.insectopia.models.*;
import com.insectopia.models.ids.ParticipanteConversacionId;
import com.insectopia.repository.*;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.MensajesService;

import jakarta.persistence.EntityManager;

/** Nunca arranca Flyway en una base distinta a insectopia_test. Datos revertidos por transacción. */
@SpringBootTest
class MensajesNotificacionesMySqlIntegrationTests {
    @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
        if (!"insectopia_test".equals(System.getenv("DB_NAME"))) {
            throw new IllegalStateException("DB_NAME debe ser insectopia_test antes de iniciar Flyway");
        }
        registry.add("spring.datasource.url", () -> "jdbc:mysql://" + System.getenv().getOrDefault("DB_HOST", "localhost")
                + ":" + System.getenv().getOrDefault("DB_PORT", "3306") + "/insectopia_test");
        registry.add("spring.datasource.username", () -> required("DB_USER"));
        registry.add("spring.datasource.password", () -> required("DB_PASSWORD"));
    }

    private static String required(String key) {
        String value = System.getenv(key);
        if (value == null || value.isBlank()) throw new IllegalStateException("Falta " + key + " de pruebas");
        return value;
    }

    @Autowired TransactionTemplate transactions;
    @Autowired EntityManager entityManager;
    @Autowired RolRepository roles;
    @Autowired UsuarioRepository users;
    @Autowired ConversacionRepository conversations;
    @Autowired ParticipanteConversacionRepository participants;
    @Autowired MensajeRepository messages;
    @Autowired NotificacionRepository notifications;
    @Autowired MensajesService service;

    private Usuario user(String name, Rol role) {
        Usuario u = new Usuario(); u.setRol(role); u.setNombre(name); u.setNombreUsuario(name);
        u.setCorreo(name + "@example.invalid"); u.setContrasena("hash");
        u.setFechaNacimiento(LocalDate.of(1990, 1, 1)); u.setPaisCodigo("ES"); u.setEstadoRegion("Madrid");
        return users.saveAndFlush(u);
    }

    private static InsectopiaUserDetails principal(Usuario user) {
        return new InsectopiaUserDetails(user.getIdUsuario(), user.getCorreo(), "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
    }

    private void add(Conversacion chat, Usuario user) {
        ParticipanteConversacion p = new ParticipanteConversacion();
        p.setId(new ParticipanteConversacionId(chat.getIdConversacion(), user.getIdUsuario()));
        p.setConversacion(chat); p.setUsuario(user); participants.saveAndFlush(p);
    }

    @Test void envioAvisoYLecturaPersistenYRespetanDesempate() {
        transactions.executeWithoutResult(status -> {
            Rol role = roles.findByNombre("USUARIO").orElseThrow();
            String suffix = UUID.randomUUID().toString().substring(0, 8);
            Usuario a = user("lector" + suffix, role), b = user("emisor" + suffix, role);
            Conversacion chat = new Conversacion(); chat.setClaveDirecta("test:" + suffix);
            chat = conversations.saveAndFlush(chat);
            add(chat, a); add(chat, b);
            Long id = chat.getIdConversacion();
            var first = service.enviar(id, new MensajeCreateRequestDTO("privado 1"), principal(b));
            var second = service.enviar(id, new MensajeCreateRequestDTO("privado 2"), principal(b));
            // Fuerza un empate exacto para probar la precisión DATETIME(0).
            Mensaje sameSecond = messages.findById(second.id()).orElseThrow();
            sameSecond.setFechaEnvio(messages.findById(first.id()).orElseThrow().getFechaEnvio());
            messages.saveAndFlush(sameSecond);
            entityManager.clear();
            assertEquals(2, service.conversacionPorId(id, principal(a)).noLeidos());
            assertEquals(2, notifications.countByDestinatario_IdUsuarioAndLeidaFalse(a.getIdUsuario()));
            assertEquals(0, notifications.countByDestinatario_IdUsuarioAndLeidaFalse(b.getIdUsuario()));
            var aviso = notifications.findByDestinatario_IdUsuario(a.getIdUsuario(),
                    org.springframework.data.domain.PageRequest.of(0, 10)).getContent().getFirst();
            assertEquals(id, aviso.getMensaje().getConversacion().getIdConversacion());
            assertFalse(aviso.getContenido().contains("privado 2"));
            assertEquals(1, service.registrarLectura(id, new LecturaConversacionRequestDTO(first.id()), principal(a)).noLeidos());
            entityManager.clear();
            assertEquals(1, service.conversacionPorId(id, principal(a)).noLeidos());
            assertEquals(0, service.registrarLectura(id, new LecturaConversacionRequestDTO(second.id()), principal(a)).noLeidos());
            entityManager.clear();
            assertEquals(0, service.conversacionPorId(id, principal(a)).noLeidos());
            assertEquals(0, service.listar(0, 20, null, true, principal(a)).getTotalElements());
            assertEquals(2, notifications.countByDestinatario_IdUsuarioAndLeidaFalse(a.getIdUsuario()),
                    "la lectura del chat no marca avisos");
            status.setRollbackOnly();
        });
    }

    @Test void excepcionDespuesDeEnviarRevierteMensajeYNotificacion() {
        // La transacción externa también debe revertir la notificación creada en enviar().
        final long[] recipient = new long[1];
        assertThrows(IllegalStateException.class, () -> transactions.executeWithoutResult(status -> {
            Rol role = roles.findByNombre("USUARIO").orElseThrow();
            String suffix = UUID.randomUUID().toString().substring(0, 8);
            Usuario a = user("dest" + suffix, role), b = user("sender" + suffix, role);
            recipient[0] = a.getIdUsuario();
            Conversacion chat = new Conversacion(); chat.setClaveDirecta("test:" + suffix);
            chat = conversations.saveAndFlush(chat);
            add(chat, a); add(chat, b);
            service.enviar(chat.getIdConversacion(), new MensajeCreateRequestDTO("contenido"), principal(b));
            throw new IllegalStateException("rollback de prueba");
        }));
        assertEquals(0, notifications.countByDestinatario_IdUsuarioAndLeidaFalse(recipient[0]));
    }
}
