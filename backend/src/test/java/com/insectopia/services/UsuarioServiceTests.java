package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;

import com.insectopia.dtos.MiPerfilResponseDTO;
import com.insectopia.dtos.publicaciones.AutorResumenDTO;
import com.insectopia.dtos.publicaciones.PublicacionResponseDTO;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.SeguidorRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;

/** Actividad 074: reglas del perfil privado sin depender de MySQL. */
@ExtendWith(MockitoExtension.class)
class UsuarioServiceTests {

    @Mock private UsuarioRepository usuarios;
    @Mock private SeguidorRepository seguidores;
    @Mock private PublicacionesService publicaciones;
    @InjectMocks private UsuarioService service;

    private InsectopiaUserDetails principal;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        LocalDateTime registro = LocalDateTime.of(2024, 3, 5, 10, 30);
        usuario = new Usuario();
        usuario.setIdUsuario(7L);
        Rol rol = new Rol();
        rol.setNombre("USUARIO");
        usuario.setRol(rol);
        usuario.setNombre("María");
        usuario.setNombreUsuario("maria");
        usuario.setCorreo("maria@example.test");
        usuario.setContrasena("hash-de-prueba");
        usuario.setFechaNacimiento(LocalDate.of(1995, 4, 2));
        usuario.setGenero("Femenino");
        usuario.setPaisCodigo("MX");
        usuario.setEstadoRegion("Oaxaca");
        usuario.setTelefono("5550000000");
        usuario.setBiografia(null);
        usuario.setFotoPerfil(null);
        usuario.setEstado(EstadoUsuario.ACTIVO);
        usuario.setRecibirSms(true);
        usuario.setRecibirWhatsapp(true);
        usuario.setVersionToken(3);
        usuario.setFechaRegistro(registro);

        principal = new InsectopiaUserDetails(7L, "maria@example.test", "hash-de-prueba",
                "USUARIO", 3, Permissions.authoritiesFor("USUARIO"));
    }

    @Test
    void perfilLeeElRegistroRealYLosConteosReales() {
        when(usuarios.findById(7L)).thenReturn(Optional.of(usuario));
        when(seguidores.countBySeguido_IdUsuario(7L)).thenReturn(12L);
        when(seguidores.countBySeguidor_IdUsuario(7L)).thenReturn(4L);
        when(publicaciones.contarPropiasVisibles(7L)).thenReturn(9L);

        MiPerfilResponseDTO dto = service.miPerfil(principal);

        assertAll(
                () -> assertEquals(7L, dto.idUsuario()),
                () -> assertEquals("María", dto.nombre()),
                () -> assertEquals("maria", dto.nombreUsuario()),
                () -> assertEquals(null, dto.fotoPerfil()),
                () -> assertEquals(null, dto.biografia()),
                () -> assertEquals("MX", dto.paisCodigo()),
                () -> assertEquals("Oaxaca", dto.estadoRegion()),
                () -> assertEquals(usuario.getFechaRegistro(), dto.fechaRegistro()),
                () -> assertEquals(12L, dto.totalSeguidores()),
                () -> assertEquals(4L, dto.totalSeguidos()),
                () -> assertEquals(9L, dto.totalPublicaciones()));
        verify(usuarios).findById(7L);
        verify(seguidores).countBySeguido_IdUsuario(7L);
        verify(seguidores).countBySeguidor_IdUsuario(7L);
        verify(publicaciones).contarPropiasVisibles(7L);
    }

    @Test
    void perfilNoArrastraDatosPrivadosAlDto() {
        when(usuarios.findById(7L)).thenReturn(Optional.of(usuario));
        String texto = service.miPerfil(principal).toString().toLowerCase();

        assertAll(
                () -> assertFalse(texto.contains("maria@example.test")),
                () -> assertFalse(texto.contains("hash-de-prueba")),
                () -> assertFalse(texto.contains("5550000000")),
                () -> assertFalse(texto.contains("femenino")),
                () -> assertFalse(texto.contains("versiontoken")),
                () -> assertFalse(texto.contains("recibirsms")),
                () -> assertFalse(texto.contains("recibirwhatsapp")));
    }

    @Test
    void perfilDeUsuarioInexistenteEs404Controlado() {
        when(usuarios.findById(7L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.miPerfil(principal));
        verifyNoInteractions(seguidores, publicaciones);
    }

    @Test
    void identidadAusenteNoSeSustituyePorUnIdExterno() {
        InsectopiaUserDetails sinId = new InsectopiaUserDetails(null, "x@example.test", "hash",
                "USUARIO", 0, Permissions.authoritiesFor("USUARIO"));

        assertAll(
                () -> assertThrows(AuthenticationCredentialsNotFoundException.class,
                        () -> service.miPerfil(null)),
                () -> assertThrows(AuthenticationCredentialsNotFoundException.class,
                        () -> service.miPerfil(sinId)),
                () -> assertThrows(AuthenticationCredentialsNotFoundException.class,
                        () -> service.publicacionesPropias(0, 10, sinId)));
        verifyNoInteractions(usuarios, seguidores, publicaciones);
    }

    @Test
    void publicacionesPropiasEnvuelveLaPaginaSinAlterarSusMetadatos() {
        PublicacionResponseDTO publicacion = new PublicacionResponseDTO(
                31L, new AutorResumenDTO(7L, "María", "maria", null), "Avistamiento", null,
                LocalDateTime.of(2026, 11, 20, 8, 0), "VISIBLE", 2, 5, "ME_GUSTA");
        when(usuarios.existsById(7L)).thenReturn(true);
        when(publicaciones.listarPropias(0, 10, principal)).thenReturn(
                new PageImpl<>(List.of(publicacion), PageRequest.of(0, 10), 25));

        var pagina = service.publicacionesPropias(0, 10, principal);

        assertAll(
                () -> assertEquals(31L, pagina.content().getFirst().id()),
                () -> assertEquals(0, pagina.number()),
                () -> assertEquals(10, pagina.size()),
                () -> assertEquals(25L, pagina.totalElements()),
                () -> assertEquals(3, pagina.totalPages()),
                () -> assertEquals(true, pagina.first()),
                () -> assertEquals(false, pagina.last()));
        verify(publicaciones).listarPropias(0, 10, principal);
    }

    @Test
    void totalDelPerfilCoincideConTotalElementsDelListadoPropio() {
        when(usuarios.findById(7L)).thenReturn(Optional.of(usuario));
        when(usuarios.existsById(7L)).thenReturn(true);
        when(publicaciones.contarPropiasVisibles(7L)).thenReturn(9L);
        when(publicaciones.listarPropias(0, 10, principal)).thenReturn(
                new PageImpl<>(List.of(), PageRequest.of(0, 10), 9));

        MiPerfilResponseDTO perfil = service.miPerfil(principal);
        var pagina = service.publicacionesPropias(0, 10, principal);

        assertEquals(perfil.totalPublicaciones(), pagina.totalElements());
        verify(publicaciones).contarPropiasVisibles(7L);
        verify(publicaciones).listarPropias(0, 10, principal);
    }

    @Test
    void publicacionesDeUsuarioInexistenteSon404() {
        when(usuarios.existsById(7L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> service.publicacionesPropias(0, 10, principal));
        verifyNoInteractions(seguidores, publicaciones);
    }
}
