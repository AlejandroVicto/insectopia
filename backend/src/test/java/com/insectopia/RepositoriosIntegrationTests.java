package com.insectopia;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.models.enums.EstadoEvento;
import com.insectopia.models.enums.EstadoReporte;
import com.insectopia.repository.AuditoriaRolRepository;
import com.insectopia.repository.EventoRepository;
import com.insectopia.repository.PublicacionRepository;
import com.insectopia.repository.ReporteRepository;
import com.insectopia.repository.UsuarioRepository;

@SpringBootTest
@Transactional(readOnly = true)
class RepositoriosIntegrationTests {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private EventoRepository eventoRepository;

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private ReporteRepository reporteRepository;

    @Autowired
    private AuditoriaRolRepository auditoriaRolRepository;

    @Test
    void consultarUsuariosPorCorreo() {
        assertNotNull(
            usuarioRepository.findByCorreo(
                "prueba-inexistente@example.invalid"
            )
        );
    }

    @Test
    void consultarEventosPendientes() {
        assertNotNull(
            eventoRepository.findByEstado(
                EstadoEvento.PENDIENTE,
                PageRequest.of(0, 10)
            )
        );
    }

    @Test
    void consultarPublicacionesPaginadas() {
        assertNotNull(
            publicacionRepository.findAll(
                PageRequest.of(0, 10)
            )
        );
    }

    @Test
    void consultarReportesPendientes() {
        assertNotNull(
            reporteRepository.findByEstadoOrderByFechaReporteDesc(
                EstadoReporte.PENDIENTE,
                PageRequest.of(0, 10)
            )
        );
    }

    @Test
    void consultarAuditoriaDeRoles() {
        assertNotNull(
            auditoriaRolRepository
                .findByUsuario_IdUsuarioOrderByFechaCambioDesc(
                    -1L,
                    PageRequest.of(0, 10)
                )
        );
    }
}
