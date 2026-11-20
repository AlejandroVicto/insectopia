package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.sql.SQLException;
import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.insectopia.dtos.RegisterRequestDTO;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;

class AuthServiceTests {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final RolRepository roles = mock(RolRepository.class);
    private final CountriesNowClient provider = mock(CountriesNowClient.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final AuthService service = new AuthService(usuarios, roles, encoder,
            new CatalogoUbicacionesService(provider), mock(org.springframework.security.authentication.AuthenticationManager.class),
            mock(com.insectopia.security.JwtService.class));
    private final Rol usuarioRol = new Rol();

    private RegisterRequestDTO request() {
        return new RegisterRequestDTO(" María González ", "MARIA", " MARIA@EXAMPLE.COM ",
                LocalDate.of(2002, 4, 21), null, "mx", "oaxaca", "", "Ejemplo#2026", null, null);
    }

    @BeforeEach void setup() {
        CountriesNowFixtures.stub(provider);
        usuarioRol.setNombre("USUARIO");
        when(roles.findByNombre("USUARIO")).thenReturn(Optional.of(usuarioRol));
        when(usuarios.saveAndFlush(any())).thenAnswer(invocation -> {
            Usuario value = invocation.getArgument(0);
            value.setIdUsuario(16L);
            return value;
        });
    }

    @Test void persisteCamposNormalizadosConHashRolYDefaultsSinExponerSecretos() {
        var response = service.register(request());
        var captor = org.mockito.ArgumentCaptor.forClass(Usuario.class);
        verify(usuarios).saveAndFlush(captor.capture());
        var saved = captor.getValue();
        verify(usuarios).existsByCorreo("maria@example.com");
        verify(usuarios).existsByNombreUsuario("maria");
        assertSame(usuarioRol, saved.getRol());
        assertEquals("USUARIO", response.rol());
        assertEquals("María González", saved.getNombre());
        assertEquals("maria", saved.getNombreUsuario());
        assertEquals("maria@example.com", saved.getCorreo());
        assertEquals(LocalDate.of(2002, 4, 21), saved.getFechaNacimiento());
        assertEquals("MX", saved.getPaisCodigo());
        assertEquals("Oaxaca", saved.getEstadoRegion());
        assertNull(saved.getTelefono());
        assertNull(saved.getGenero());
        assertNull(saved.getBiografia());
        assertNull(saved.getFotoPerfil());
        assertFalse(saved.getRecibirSms());
        assertFalse(saved.getRecibirWhatsapp());
        assertEquals(EstadoUsuario.ACTIVO, saved.getEstado());
        assertEquals(0, saved.getVersionToken());
        assertNotEquals("Ejemplo#2026", saved.getContrasena());
        assertTrue(encoder.matches("Ejemplo#2026", saved.getContrasena()));
        assertFalse(response.toString().contains("Ejemplo#2026"));
        assertFalse(response.toString().contains(saved.getContrasena()));
    }

    @Test void duplicadosPreviosNoCreanUsuario() {
        when(usuarios.existsByCorreo("maria@example.com")).thenReturn(true);
        assertEquals("correo", assertThrows(DuplicateResourceException.class, () -> service.register(request())).getField());
        verify(usuarios, never()).saveAndFlush(any());
        clearInvocations(usuarios);
        when(usuarios.existsByCorreo("maria@example.com")).thenReturn(false);
        when(usuarios.existsByNombreUsuario("maria")).thenReturn(true);
        assertEquals("nombreUsuario", assertThrows(DuplicateResourceException.class, () -> service.register(request())).getField());
        verify(usuarios, never()).saveAndFlush(any());
    }

    @Test void ubicacionYTelefonoSonObligatoriosEnSusCasos() {
        var wrong = new RegisterRequestDTO("María", "maria", "maria@example.com", LocalDate.now(),
                null, "MX", "Madrid", null, "Ejemplo#2026", null, null);
        assertEquals("estadoRegion", assertThrows(RegistrationValidationException.class,
                () -> service.register(wrong)).getField());
        var sms = new RegisterRequestDTO("María", "maria", "maria@example.com", LocalDate.now(),
                null, "MX", "Oaxaca", null, "Ejemplo#2026", true, null);
        assertEquals("telefono", assertThrows(RegistrationValidationException.class,
                () -> service.register(sms)).getField());
        verify(usuarios, never()).saveAndFlush(any());
    }

    @Test void faltaRolNoPersiste() {
        when(roles.findByNombre("USUARIO")).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, () -> service.register(request()));
        verify(usuarios, never()).saveAndFlush(any());
    }

    @Test void argentinaAceptaSoloSusRegionesYNormalizaNombreCanonico() {
        CountriesNowClient provider = mock(CountriesNowClient.class);
        when(provider.countries()).thenReturn(java.util.List.of(
                new CountriesNowClient.IsoCountry("Mexico", "MX"),
                new CountriesNowClient.IsoCountry("Argentina", "AR")));
        when(provider.states()).thenReturn(java.util.List.of(
                new CountriesNowClient.CountryStates("MX", java.util.List.of("Oaxaca")),
                new CountriesNowClient.CountryStates("AR", java.util.List.of("Córdoba"))));
        AuthService multiCountryService = new AuthService(usuarios, roles, encoder,
                new CatalogoUbicacionesService(provider), mock(org.springframework.security.authentication.AuthenticationManager.class),
                mock(com.insectopia.security.JwtService.class));
        var invalid = new RegisterRequestDTO("María", "maria", "maria@example.com", LocalDate.now(),
                null, "AR", "Oaxaca", null, "Ejemplo#2026", null, null);
        assertEquals("estadoRegion", assertThrows(RegistrationValidationException.class,
                () -> multiCountryService.register(invalid)).getField());
        verify(usuarios, never()).saveAndFlush(any());

        var valid = new RegisterRequestDTO("María", "maria", "maria@example.com", LocalDate.now(),
                null, "AR", "córdoba", null, "Ejemplo#2026", null, null);
        multiCountryService.register(valid);
        var captor = org.mockito.ArgumentCaptor.forClass(Usuario.class);
        verify(usuarios).saveAndFlush(captor.capture());
        assertEquals("AR", captor.getValue().getPaisCodigo());
        assertEquals("Córdoba", captor.getValue().getEstadoRegion());
    }

    @Test void violacionConcurrenteSoloMapeaIndicesUnicosConocidos() {
        for (String index : new String[] {"uk_usuarios_correo", "usuarios.uk_usuarios_nombre_usuario"}) {
            doThrow(new DataIntegrityViolationException("constraint",
                    new SQLException("Duplicate entry 'secreto' for key '" + index + "'", "23000", 1062)))
                    .when(usuarios).saveAndFlush(any());
            assertEquals(index.contains("correo") ? "correo" : "nombreUsuario",
                    assertThrows(DuplicateResourceException.class, () -> service.register(request())).getField());
        }
        doThrow(new DataIntegrityViolationException("foreign key",
                new SQLException("Cannot add or update a child row", "23000", 1452)))
                .when(usuarios).saveAndFlush(any());
        assertThrows(DataIntegrityViolationException.class, () -> service.register(request()));
    }
}
