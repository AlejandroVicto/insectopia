package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.dtos.UsuarioPublicoDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Seguidor;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.models.ids.SeguidorId;
import com.insectopia.repository.SeguidorRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;

/** Actividad 076: reglas de negocio, idempotencia, privacidad y ausencia de N+1. */
@ExtendWith(MockitoExtension.class)
class SeguidorServiceTests {

    /** Gestor mínimo para ejecutar los callbacks del servicio sin base de datos. */
    private static final class PruebaTransacciones extends AbstractPlatformTransactionManager {
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object transaction, TransactionDefinition definition) { }
        @Override protected void doCommit(DefaultTransactionStatus status) { }
        @Override protected void doRollback(DefaultTransactionStatus status) { }
    }

    @Mock private SeguidorRepository seguidores;
    @Mock private UsuarioRepository usuarios;
    @Mock private NotificacionService notificaciones;

    private SeguidorService service;
    private InsectopiaUserDetails principal;

    @BeforeEach
    void setUp() {
        TransactionTemplate transacciones =
                new TransactionTemplate(new PruebaTransacciones());
        service = new SeguidorService(transacciones, usuarios, seguidores, notificaciones);
        principal = new InsectopiaUserDetails(7L, "yo@example.test", "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
    }

    private static Usuario usuario(Long id, String nombre, String alias, EstadoUsuario estado) {
        Usuario usuario = new Usuario();
        usuario.setIdUsuario(id);
        usuario.setNombre(nombre);
        usuario.setNombreUsuario(alias);
        usuario.setEstado(estado);
        usuario.setCorreo(id + "@example.test");
        usuario.setContrasena("hash");
        usuario.setTelefono("600000000");
        usuario.setPaisCodigo("MX");
        usuario.setEstadoRegion("Oaxaca");
        return usuario;
    }

    private static Seguidor relacion(Long idSeguidor, Long idSeguido) {
        Seguidor relacion = new Seguidor();
        relacion.setId(new SeguidorId(idSeguidor, idSeguido));
        relacion.setSeguidor(usuario(idSeguidor, "Seguidor " + idSeguidor,
                "seguidor" + idSeguidor, EstadoUsuario.ACTIVO));
        relacion.setSeguido(usuario(idSeguido, "Seguido", "seguido", EstadoUsuario.ACTIVO));
        return relacion;
    }

    @Test
    void listarSeguidoresBuscaEnBdYCalculaLoSigoYConteosPorLote() {
        when(seguidores.buscarSeguidores(eq(7L), eq("%ana%"), eq(EstadoUsuario.ACTIVO), any()))
                .thenReturn(new PageImpl<>(List.of(relacion(11L, 7L), relacion(12L, 7L)),
                        PageRequest.of(0, 20), 2));
        when(seguidores.findIdsSeguidos(7L, List.of(11L, 12L))).thenReturn(List.of(11L));
        when(seguidores.countSeguidoresPorUsuarios(List.of(11L, 12L)))
                .thenReturn(List.<Object[]>of(new Object[] {11L, 3L}, new Object[] {12L, 5L}));
        when(seguidores.countSeguidosPorUsuarios(List.of(11L, 12L)))
                .thenReturn(List.<Object[]>of(new Object[] {11L, 2L}));

        PaginaDTO<UsuarioPublicoDTO> pagina =
                service.listarSeguidores(0, 20, "  Ana  ", principal);

        assertAll(
                () -> assertEquals(2, pagina.content().size()),
                () -> assertEquals(0, pagina.number()),
                () -> assertEquals(20, pagina.size()),
                () -> assertEquals(2, pagina.totalElements()),
                () -> assertTrue(pagina.first()),
                () -> assertTrue(pagina.last()),
                () -> assertEquals(11L, pagina.content().get(0).id()),
                () -> assertTrue(pagina.content().get(0).loSigo()),
                () -> assertEquals(3L, pagina.content().get(0).totalSeguidores()),
                () -> assertEquals(2L, pagina.content().get(0).totalSeguidos()),
                () -> assertFalse(pagina.content().get(1).loSigo()),
                () -> assertEquals(5L, pagina.content().get(1).totalSeguidores()),
                () -> assertEquals(0L, pagina.content().get(1).totalSeguidos()));
        verify(seguidores, never())
                .existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(any(), any());
    }

    @Test
    void listarSeguidoresVacioNoDisparaConsultasAgrupadas() {
        when(seguidores.buscarSeguidores(eq(7L), eq(null), eq(EstadoUsuario.ACTIVO), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        PaginaDTO<UsuarioPublicoDTO> pagina = service.listarSeguidores(0, 20, null, principal);

        assertAll(
                () -> assertTrue(pagina.content().isEmpty()),
                () -> assertEquals(0, pagina.totalElements()),
                () -> assertEquals(0, pagina.totalPages()));
        verify(seguidores, never()).findIdsSeguidos(any(), any());
        verify(seguidores, never()).countSeguidoresPorUsuarios(any());
        verify(seguidores, never()).countSeguidosPorUsuarios(any());
    }

    @Test
    void perfilPublicoExponeSoloElContratoSeguroYConteosReales() {
        Usuario objetivo = usuario(11L, "Clara", "clara", EstadoUsuario.ACTIVO);
        objetivo.setFotoPerfil("   ");
        objetivo.setBiografia(null);
        when(usuarios.findById(11L)).thenReturn(Optional.of(objetivo));
        when(seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(7L, 11L)).thenReturn(true);
        when(seguidores.countBySeguido_IdUsuario(11L)).thenReturn(4L);
        when(seguidores.countBySeguidor_IdUsuario(11L)).thenReturn(9L);

        UsuarioPublicoDTO dto = service.perfilPublico(11L, principal);

        assertAll(
                () -> assertEquals(11L, dto.id()),
                () -> assertEquals("Clara", dto.nombre()),
                () -> assertEquals("clara", dto.nombreUsuario()),
                () -> assertNull(dto.avatarUrl()),
                () -> assertNull(dto.descripcion()),
                () -> assertTrue(dto.loSigo()),
                () -> assertEquals(4L, dto.totalSeguidores()),
                () -> assertEquals(9L, dto.totalSeguidos()),
                () -> assertEquals(8, UsuarioPublicoDTO.class.getRecordComponents().length));
    }

    @Test
    void perfilPublicoDelPropioUsuarioNoSeMarcaComoSeguido() {
        when(usuarios.findById(7L)).thenReturn(Optional.of(
                usuario(7L, "Yo", "yo", EstadoUsuario.ACTIVO)));
        when(seguidores.countBySeguido_IdUsuario(7L)).thenReturn(2L);
        when(seguidores.countBySeguidor_IdUsuario(7L)).thenReturn(1L);

        UsuarioPublicoDTO dto = service.perfilPublico(7L, principal);

        assertAll(
                () -> assertFalse(dto.loSigo()),
                () -> assertEquals(2L, dto.totalSeguidores()),
                () -> assertEquals(1L, dto.totalSeguidos()));
        verify(seguidores, never())
                .existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(any(), any());
    }

    @Test
    void perfilPublicoInexistenteOInactivoEs404() {
        when(usuarios.findById(11L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.perfilPublico(11L, principal));

        when(usuarios.findById(12L)).thenReturn(Optional.of(
                usuario(12L, "Bloqueado", "bloqueado", EstadoUsuario.BLOQUEADO)));
        assertThrows(ResourceNotFoundException.class, () -> service.perfilPublico(12L, principal));
    }

    @Test
    void seguirCreaRelacionYNotificacionEnUnaSolaTransaccion() {
        when(usuarios.findById(11L)).thenReturn(Optional.of(
                usuario(11L, "Clara", "clara", EstadoUsuario.ACTIVO)));
        when(seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(7L, 11L))
                .thenReturn(false);
        Usuario seguidorRef = mock(Usuario.class);
        Usuario seguidoRef = mock(Usuario.class);
        when(usuarios.getReferenceById(7L)).thenReturn(seguidorRef);
        when(usuarios.getReferenceById(11L)).thenReturn(seguidoRef);

        SeguidorService.ResultadoSeguir resultado = service.seguir(11L, principal);

        assertTrue(resultado.creada());
        ArgumentCaptor<Seguidor> captor = ArgumentCaptor.forClass(Seguidor.class);
        verify(seguidores).saveAndFlush(captor.capture());
        assertAll(
                () -> assertEquals(new SeguidorId(7L, 11L), captor.getValue().getId()),
                () -> assertEquals(seguidorRef, captor.getValue().getSeguidor()),
                () -> assertEquals(seguidoRef, captor.getValue().getSeguido()));
        verify(notificaciones).porNuevoSeguidor(seguidoRef, seguidorRef);
    }

    @Test
    void seguirYaExistenteEsIdempotenteYNoAvisa() {
        when(usuarios.findById(11L)).thenReturn(Optional.of(
                usuario(11L, "Clara", "clara", EstadoUsuario.ACTIVO)));
        when(seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(7L, 11L))
                .thenReturn(true);

        assertFalse(service.seguir(11L, principal).creada());

        verify(seguidores, never()).saveAndFlush(any());
        verifyNoInteractions(notificaciones);
    }

    @Test
    void seguirConColisionConcurrenteEsIdempotenteYNoAvisa() {
        when(usuarios.findById(11L)).thenReturn(Optional.of(
                usuario(11L, "Clara", "clara", EstadoUsuario.ACTIVO)));
        when(seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(7L, 11L))
                .thenReturn(false);
        when(seguidores.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("clave duplicada"));

        assertFalse(service.seguir(11L, principal).creada());

        verifyNoInteractions(notificaciones);
    }

    @Test
    void seguirRechazaAutoSeguimientoYUsuarioInactivo() {
        assertThrows(RegistrationValidationException.class,
                () -> service.seguir(7L, principal));

        when(usuarios.findById(12L)).thenReturn(Optional.of(
                usuario(12L, "Bloqueado", "bloqueado", EstadoUsuario.BLOQUEADO)));
        assertThrows(ResourceNotFoundException.class, () -> service.seguir(12L, principal));
        verifyNoInteractions(notificaciones);
    }

    @Test
    void dejarSeguirBorraSoloLaRelacionPropiaYEsIdempotente() {
        service.dejarSeguir(11L, principal);
        service.dejarSeguir(11L, principal);

        verify(seguidores, times(2)).deleteById(new SeguidorId(7L, 11L));
        verifyNoInteractions(notificaciones);
    }

    @Test
    void sinPrincipalNoSePuedeSuplantarIdentidad() {
        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> service.listarSeguidores(0, 20, null, null));
        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> service.perfilPublico(11L, null));
        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> service.seguir(11L, null));
        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> service.dejarSeguir(11L, null));
        verifyNoInteractions(notificaciones);
    }
}
