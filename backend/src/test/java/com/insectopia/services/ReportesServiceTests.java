package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.access.AccessDeniedException;

import com.insectopia.dtos.reportes.*;
import com.insectopia.exceptions.*;
import com.insectopia.models.*;
import com.insectopia.models.enums.*;
import com.insectopia.repository.*;
import com.insectopia.security.*;

@ExtendWith(MockitoExtension.class)
class ReportesServiceTests {
    @Mock ReporteRepository reportes;
    @Mock PublicacionRepository publicaciones;
    @Mock UsuarioRepository usuarios;
    @Mock NotificacionService notificaciones;
    ReportesService service;
    Publicacion publicacion;
    Usuario autor, reportante;

    InsectopiaUserDetails principal(long id, String rol) {
        return new InsectopiaUserDetails(id, "user@test.local", "hash", rol, 0, Permissions.authoritiesFor(rol));
    }

    @BeforeEach void setup() {
        service = new ReportesService(reportes, publicaciones, usuarios, notificaciones);
        autor = new Usuario(); autor.setIdUsuario(1L);
        reportante = new Usuario(); reportante.setIdUsuario(2L);
        publicacion = new Publicacion(); publicacion.setIdPublicacion(24L); publicacion.setUsuario(autor);
        publicacion.setEstado(EstadoPublicacion.VISIBLE);
        lenient().when(publicaciones.bloquearParaEscritura(24L)).thenReturn(Optional.of(publicacion));
    }

    @Test void creaReporteConPrincipalYEstadoPendiente() {
        when(usuarios.findById(2L)).thenReturn(Optional.of(reportante));
        when(reportes.saveAndFlush(any())).thenAnswer(i -> {
            Reporte r = i.getArgument(0); r.setIdReporte(5L); r.setFechaReporte(java.time.LocalDateTime.now()); return r;
        });
        var dto = service.crear(new ReporteCreateRequestDTO(24L, "SPAM", "Publicidad"), principal(2,"USUARIO"));
        assertEquals(EstadoReporte.PENDIENTE.name(), dto.estado());
        assertNull(dto.reportanteId()); assertNull(dto.moderadorId()); assertNull(dto.resolucion());
        var captor = org.mockito.ArgumentCaptor.forClass(Reporte.class);
        verify(reportes).saveAndFlush(captor.capture());
        assertSame(reportante, captor.getValue().getReportante());
        assertNull(captor.getValue().getModerador());
    }

    @Test void rechazaPropioDuplicadoMotivoInvalidoYOculto() {
        var datos = new ReporteCreateRequestDTO(24L,"SPAM",null);
        assertThrows(BusinessRuleException.class, () -> service.crear(datos, principal(1,"USUARIO")));
        assertThrows(BusinessRuleException.class, () -> service.crear(new ReporteCreateRequestDTO(24L,"FAKE",null), principal(2,"USUARIO")));
        when(reportes.existsByReportante_IdUsuarioAndPublicacion_IdPublicacion(2L,24L)).thenReturn(true);
        assertThrows(DuplicateResourceException.class, () -> service.crear(datos, principal(2,"USUARIO")));
        publicacion.setEstado(EstadoPublicacion.ELIMINADA);
        assertThrows(BusinessRuleException.class, () -> service.crear(datos, principal(2,"USUARIO")));
    }

    @Test void moderadorConsultaYResuelveSinCambiarPublicacion() {
        Reporte r = new Reporte(); r.setIdReporte(5L); r.setPublicacion(publicacion);
        r.setReportante(reportante); r.setMotivo("SPAM"); r.setEstado(EstadoReporte.PENDIENTE);
        when(reportes.findByEstadoOrderByFechaReporteDesc(eq(EstadoReporte.PENDIENTE), any()))
                .thenReturn(new PageImpl<>(List.of(r)));
        assertEquals(2L, service.listar(0,20,EstadoReporte.PENDIENTE,principal(3,"MODERADOR"))
                .getContent().getFirst().reportanteId());
        when(reportes.bloquearParaResolucion(5L)).thenReturn(Optional.of(r));
        Usuario mod = new Usuario(); mod.setIdUsuario(3L);
        when(usuarios.findById(3L)).thenReturn(Optional.of(mod));
        when(reportes.saveAndFlush(r)).thenReturn(r);
        var dto = service.resolver(5L, new ReporteResolverRequestDTO(EstadoReporte.RESUELTO,"Revisado"), principal(3,"MODERADOR"));
        assertEquals(3L, dto.moderadorId()); assertNotNull(dto.fechaResolucion());
        assertEquals(EstadoPublicacion.VISIBLE, publicacion.getEstado());
        verify(notificaciones).porResolucion(r, mod);
        assertThrows(BusinessRuleException.class, () -> service.resolver(5L,
                new ReporteResolverRequestDTO(EstadoReporte.RECHAZADO,"Otra vez"), principal(3,"MODERADOR")));
        verifyNoMoreInteractions(notificaciones);
    }

    @Test void usuarioNormalNoConsultaNiResuelveY404Especifico() {
        assertThrows(AccessDeniedException.class, () -> service.listar(0,20,null,principal(2,"USUARIO")));
        assertThrows(AccessDeniedException.class, () -> service.resolver(5L,
                new ReporteResolverRequestDTO(EstadoReporte.RESUELTO,"x"), principal(2,"USUARIO")));
        assertThrows(ResourceNotFoundException.class, () -> service.resolver(5L,
                new ReporteResolverRequestDTO(EstadoReporte.RESUELTO,"x"), principal(3,"MODERADOR")));
        verifyNoInteractions(notificaciones);
    }
}
