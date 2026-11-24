package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.sql.ResultSet;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ScheduledFuture;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.twilio.exception.ApiException;

@ExtendWith(MockitoExtension.class)
class SmsServiceTests {
    @Mock JdbcTemplate jdbc;
    @Mock SmsGateway gateway;
    @Mock TaskScheduler scheduler;
    SmsService service;
    List<Runnable> tareas;
    List<Instant> plazos;
    static final String SID = "SM" + "a".repeat(32);
    static final SmsSettings SETTINGS = new SmsSettings(true, "AC" + "a".repeat(32), "solo-test",
            "+15550000001", "+521234567890,+521234567891");

    @BeforeEach void preparar() {
        service = new SmsService(jdbc, SETTINGS, gateway, scheduler);
        tareas = new ArrayList<>();
        plazos = new ArrayList<>();
        lenient().when(scheduler.schedule(any(Runnable.class), any(Instant.class))).thenAnswer(inv -> {
            tareas.add(inv.getArgument(0));
            plazos.add(inv.getArgument(1));
            return mock(ScheduledFuture.class);
        });
    }

    @Test void deshabilitadoNoNecesitaSecretosNiCreaTareas() {
        var disabled = new SmsService(jdbc, new SmsSettings(false, "", "", "", ""), gateway, scheduler);
        disabled.registrar(1L, 2L, true);
        assertTrue(tareas.isEmpty());
        verifyNoInteractions(jdbc, gateway, scheduler);
    }

    @Test void validaConfiguracionE164YTexto() {
        assertThrows(IllegalStateException.class, () -> new SmsSettings(true, "", "", "", ""));
        assertThrows(IllegalStateException.class,
                () -> new SmsSettings(true, SETTINGS.accountSid(), "x", "123", "+521234567890"));
        assertThrows(IllegalStateException.class,
                () -> new SmsSettings(true, SETTINGS.accountSid(), "x", SETTINGS.from(), ""));
        assertThrows(IllegalStateException.class,
                () -> new SmsSettings(true, SETTINGS.accountSid(), "x", SETTINGS.from(), "+521234567890,mal"));
        assertThrows(IllegalStateException.class,
                () -> new SmsSettings(true, SETTINGS.accountSid(), "x", SETTINGS.from(), "+521234567890,"));
        assertFalse(SmsSettings.e164("55 1234 5678"));
        assertFalse(SmsSettings.e164("+01234"));
        assertTrue(SmsSettings.e164("+521234567890"));
        String mensaje = SmsService.mensaje(" Feria\r\n" + "x".repeat(180));
        assertFalse(mensaje.contains("\n"));
        assertTrue(mensaje.length() <= 160);
        assertFalse(SETTINGS.toString().contains("solo-test"));
    }

    @Test void sinConsentimientoORollbackNuncaEnvia() {
        commit(() -> service.registrar(1L, 2L, false), true);
        commit(() -> service.registrar(1L, 2L, true), false);
        assertTrue(tareas.isEmpty());
        verifyNoInteractions(gateway, jdbc, scheduler);
    }

    @Test void programaSoloTrasCommitYEnviaSoloAlTelefonoAutorizadoDelUsuario() throws Exception {
        candidato("+521234567890", true, "INSCRITO");
        commit(() -> {
            service.registrar(1L, 2L, true);
            assertTrue(tareas.isEmpty());
            verifyNoInteractions(gateway, jdbc, scheduler);
        }, true);
        assertEquals(1, tareas.size());
        when(gateway.enviar(eq("+521234567890"), eq(SETTINGS.from()), anyString())).thenReturn(SID);
        tareas.getFirst().run();
        verify(gateway).enviar(eq("+521234567890"), eq(SETTINGS.from()),
                eq("Insectopia: Tu inscripcion al evento [Feria] fue confirmada."));
        assertEquals(1, tareas.size());
    }

    @Test void permiteSegundoTelefonoPeroNoUnoFueraDeLaLista() throws Exception {
        candidato("+521234567891", true, "INSCRITO");
        commit(() -> service.registrar(1L, 2L, true), true);
        when(gateway.enviar(eq("+521234567891"), eq(SETTINGS.from()), anyString())).thenReturn(SID);
        tareas.getFirst().run();
        verify(gateway).enviar(eq("+521234567891"), eq(SETTINGS.from()), anyString());

        reset(jdbc);
        candidato("+521234567892", true, "INSCRITO");
        commit(() -> service.registrar(1L, 2L, true), true);
        tareas.get(1).run();
        verifyNoMoreInteractions(gateway);
    }

    @Test void numeroInvalidoOConsentimientoRevocadoNoEnvia() throws Exception {
        candidato("55 1234 5678", true, "INSCRITO");
        commit(() -> service.registrar(1L, 2L, true), true);
        tareas.getFirst().run();
        verifyNoInteractions(gateway);
        reset(jdbc);
        candidato("+521234567890", false, "INSCRITO");
        commit(() -> service.registrar(1L, 2L, true), true);
        tareas.get(1).run();
        verifyNoInteractions(gateway);
    }

    @Test void cancelarTrasCommitInvalidaPendienteYReinscribirPermiteNuevoIntento() throws Exception {
        candidato("+521234567890", true, "INSCRITO");
        commit(() -> service.registrar(1L, 2L, true), true);
        commit(() -> service.cancelar(1L, 2L), true);
        tareas.getFirst().run();
        verifyNoInteractions(gateway, jdbc);
        commit(() -> service.registrar(1L, 2L, true), true);
        when(gateway.enviar(anyString(), anyString(), anyString())).thenReturn(SID);
        tareas.get(1).run();
        verify(gateway, times(1)).enviar(anyString(), anyString(), anyString());
    }

    @Test void rechazoPermanenteYRespuestaAmbiguaNuncaReintentan() throws Exception {
        candidato("+521234567890", true, "INSCRITO");
        commit(() -> service.registrar(1L, 2L, true), true);
        when(gateway.enviar(anyString(), anyString(), anyString()))
                .thenThrow(new ApiException("privado +521234567890", 400));
        tareas.getFirst().run();
        assertEquals(1, tareas.size());

        commit(() -> service.registrar(1L, 2L, true), true);
        doThrow(new IllegalStateException("timeout con datos privados"))
                .when(gateway).enviar(anyString(), anyString(), anyString());
        tareas.get(1).run();
        assertEquals(2, tareas.size());
    }

    @Test void solo429ReintentaConBackoffHastaTresIntentos() throws Exception {
        candidato("+521234567890", true, "INSCRITO");
        commit(() -> service.registrar(1L, 2L, true), true);
        when(gateway.enviar(anyString(), anyString(), anyString())).thenThrow(new ApiException("limit", 429));
        tareas.get(0).run();
        assertEquals(2, tareas.size());
        assertTrue(Duration.between(Instant.now(), plazos.get(1)).toSeconds() >= 28);
        tareas.get(1).run();
        assertEquals(3, tareas.size());
        assertTrue(Duration.between(Instant.now(), plazos.get(2)).toSeconds() >= 58);
        tareas.get(2).run();
        assertEquals(3, tareas.size());
        verify(gateway, times(3)).enviar(anyString(), anyString(), anyString());
    }

    @Test void sinTransaccionActivaNoPuedeProgramar() {
        assertThrows(IllegalStateException.class, () -> service.registrar(1L, 2L, true));
    }

    private void commit(Runnable accion, boolean confirmado) {
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            accion.run();
            for (var sync : TransactionSynchronizationManager.getSynchronizations()) {
                if (confirmado) sync.afterCommit();
                sync.afterCompletion(confirmado ? TransactionSynchronization.STATUS_COMMITTED
                        : TransactionSynchronization.STATUS_ROLLED_BACK);
            }
        } finally {
            TransactionSynchronizationManager.setActualTransactionActive(false);
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void candidato(String telefono, boolean consentimiento, String estado) throws Exception {
        when(jdbc.query(startsWith("SELECT u.telefono"), any(RowMapper.class), eq(1L), eq(2L)))
                .thenAnswer(inv -> {
                    ResultSet rs = mock(ResultSet.class);
                    when(rs.getString("telefono")).thenReturn(telefono);
                    when(rs.getBoolean("recibir_sms")).thenReturn(consentimiento);
                    when(rs.getString("usuario_estado")).thenReturn("ACTIVO");
                    when(rs.getString("evento_estado")).thenReturn("APROBADO");
                    when(rs.getString("participacion_estado")).thenReturn(estado);
                    when(rs.getString("titulo")).thenReturn("Feria");
                    return List.of(((RowMapper) inv.getArgument(1)).mapRow(rs, 0));
                });
    }
}
