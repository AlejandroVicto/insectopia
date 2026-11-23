package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

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
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.insectopia.dtos.RegisterRequestDTO;
import com.insectopia.dtos.RegisterResponseDTO;
import com.insectopia.dtos.admin.AdminEditarUsuarioRequestDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.models.AuditoriaRol;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.AuditoriaRolRepository;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.security.ProtectedAccounts;

@ExtendWith(MockitoExtension.class)
class AdminServiceTests {
    @Mock UsuarioRepository usuarios;
    @Mock RolRepository roles;
    @Mock AuditoriaRolRepository auditoria;
    @Mock AuthService auth;
    @Mock CatalogoUbicacionesService catalogo;
    @Mock PasswordEncoder encoder;
    @InjectMocks AdminService service;

    InsectopiaUserDetails admin;
    Usuario target;
    Rol adminRol;

    @BeforeEach void preparar() {
        admin = new InsectopiaUserDetails(1L, "admin@example.invalid", "hash", "ADMINISTRADOR", 0,
                Permissions.authoritiesFor("ADMINISTRADOR"));
        adminRol = rol(3L, "ADMINISTRADOR");
        target = usuario(2L, rol(1L, "USUARIO"), "persona");
    }

    private static Rol rol(Long id, String nombre) {
        Rol rol = new Rol(); rol.setIdRol(id); rol.setNombre(nombre); return rol;
    }
    private static Usuario usuario(Long id, Rol rol, String nombreUsuario) {
        Usuario user = new Usuario();
        user.setIdUsuario(id); user.setRol(rol); user.setNombre("Nombre Persona");
        user.setNombreUsuario(nombreUsuario); user.setCorreo(nombreUsuario + "@example.invalid");
        user.setFechaNacimiento(LocalDate.of(1990, 1, 1)); user.setPaisCodigo("MX");
        user.setEstadoRegion("Oaxaca"); user.setContrasena("hash"); user.setVersionToken(0);
        user.setFechaRegistro(LocalDateTime.now()); user.setFechaActualizacion(LocalDateTime.now());
        return user;
    }

    private void bloquear() {
        when(roles.bloquearAdministrador()).thenReturn(Optional.of(adminRol));
        when(usuarios.bloquearPorId(2L)).thenReturn(Optional.of(target));
    }

    @Test void rechazaInvocacionInternaSinAutoridad() {
        InsectopiaUserDetails sinPermiso = new InsectopiaUserDetails(2L, "u@example.invalid", "hash", "USUARIO", 0,
                Permissions.authoritiesFor("USUARIO"));
        assertThrows(AccessDeniedException.class, () -> service.resumen(sinPermiso));
        verifyNoInteractions(usuarios);
    }

    @Test void listaPaginadaYResumenUsanRepositoriosRealesSinCalcularSobrePagina() {
        when(usuarios.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(call -> new PageImpl<>(List.of(target), call.getArgument(1), 29));
        var pagina = service.listar(" persona ", "USUARIO", EstadoUsuario.ACTIVO,
                1, 5, "nombre", "asc", admin);
        assertEquals(29, pagina.totalElements());
        assertEquals(1, pagina.number());
        assertEquals("persona@example.invalid", pagina.content().getFirst().correo());
        assertEquals("nombre: ASC,idUsuario: ASC", mockingDetails(usuarios).getInvocations().stream()
                .filter(inv -> inv.getMethod().getName().equals("findAll"))
                .findFirst().orElseThrow().getArgument(1, Pageable.class).getSort().toString());
        when(usuarios.count()).thenReturn(29L);
        when(usuarios.countByRol_Nombre("USUARIO")).thenReturn(22L);
        when(usuarios.countByRol_Nombre("MODERADOR")).thenReturn(5L);
        when(usuarios.countByRol_Nombre("ADMINISTRADOR")).thenReturn(2L);
        when(usuarios.countByEstado(EstadoUsuario.DESACTIVADO)).thenReturn(3L);
        assertEquals(3L, service.resumen(admin).cuentasDesactivadas());
        assertEquals(29L, service.resumen(admin).totalUsuarios());
        assertThrows(RegistrationValidationException.class,
                () -> service.listar("", "OTRO", null, 0, 10, "fechaRegistro", "desc", admin));
        assertThrows(RegistrationValidationException.class,
                () -> service.listar("", null, null, 0, 10, "contrasena", "desc", admin));
    }

    @Test void altaReutilizaRegistroBCryptYUnicidad() {
        RegisterRequestDTO datos = new RegisterRequestDTO("Nombre Persona", "persona", "persona@example.invalid",
                LocalDate.of(1990, 1, 1), null, "MX", "Oaxaca", null, "Segura123!", false, false);
        when(auth.register(datos)).thenReturn(new RegisterResponseDTO(2L, "Nombre Persona", "persona",
                "persona@example.invalid", "USUARIO", "Cuenta creada correctamente"));
        when(usuarios.findById(2L)).thenReturn(Optional.of(target));
        assertEquals("USUARIO", service.alta(datos, admin).rol());
        verify(auth).register(datos);
    }

    private AdminEditarUsuarioRequestDTO editar(String nombreUsuario, String correo, String clave) {
        return new AdminEditarUsuarioRequestDTO("Nombre Nuevo", nombreUsuario, correo, LocalDate.of(1990, 1, 1),
                null, "MX", "Oaxaca", null, clave, false, false);
    }

    @Test void edicionConservaClaveOInvalidaVersionAlCambiarCorreoYClave() {
        when(usuarios.bloquearPorId(2L)).thenReturn(Optional.of(target));
        when(catalogo.validarRegion("MX", "Oaxaca")).thenReturn("Oaxaca");
        when(usuarios.saveAndFlush(target)).thenReturn(target);
        service.editar(2L, editar("persona", "persona@example.invalid", null), admin);
        assertEquals("hash", target.getContrasena());
        assertEquals(0, target.getVersionToken());
        when(encoder.encode("Segura123!")).thenReturn("bcrypt-hash");
        service.editar(2L, editar("persona", "nueva@example.invalid", "Segura123!"), admin);
        assertEquals("bcrypt-hash", target.getContrasena());
        assertEquals(1, target.getVersionToken());
    }

    @Test void duplicadosYDatosDeClienteNoAlteranUsuario() {
        when(usuarios.bloquearPorId(2L)).thenReturn(Optional.of(target));
        when(usuarios.existsByCorreo("existe@example.invalid")).thenReturn(true);
        DuplicateResourceException error = assertThrows(DuplicateResourceException.class,
                () -> service.editar(2L, editar("persona", "existe@example.invalid", null), admin));
        assertEquals("correo", error.getField());
        verify(usuarios, never()).saveAndFlush(any());
        when(usuarios.existsByNombreUsuario("ocupado")).thenReturn(true);
        assertEquals("nombreUsuario", assertThrows(DuplicateResourceException.class,
                () -> service.editar(2L, editar("ocupado", "persona@example.invalid", null), admin)).getField());
        when(catalogo.validarRegion("MX", "Oaxaca"))
                .thenThrow(new RegistrationValidationException("estadoRegion", "Región no válida"));
        assertThrows(RegistrationValidationException.class,
                () -> service.editar(2L, editar("persona", "persona@example.invalid", null), admin));
    }

    @Test void colisionConcurrenteDeMySqlSeDevuelveComoDuplicadoPorCampo() {
        when(usuarios.bloquearPorId(2L)).thenReturn(Optional.of(target));
        when(catalogo.validarRegion("MX", "Oaxaca")).thenReturn("Oaxaca");
        var sql = new java.sql.SQLException("Duplicate entry for key 'uk_usuarios_correo'", "23000", 1062);
        when(usuarios.saveAndFlush(target)).thenThrow(new DataIntegrityViolationException("Duplicado", sql));
        assertEquals("correo", assertThrows(DuplicateResourceException.class,
                () -> service.editar(2L, editar("persona", "nuevo@example.invalid", null), admin)).getField());
    }

    @Test void estadoInvalidaVersionSinDuplicarCambiosYProtegeAdmin() {
        assertThrows(BusinessRuleException.class,
                () -> service.cambiarEstado(2L, EstadoUsuario.BLOQUEADO, admin));
        bloquear();
        when(usuarios.saveAndFlush(target)).thenReturn(target);
        assertEquals(EstadoUsuario.DESACTIVADO, service.cambiarEstado(2L, EstadoUsuario.DESACTIVADO, admin).estado());
        assertEquals(1, target.getVersionToken());
        service.cambiarEstado(2L, EstadoUsuario.DESACTIVADO, admin);
        assertEquals(1, target.getVersionToken());
        target.setRol(adminRol);
        target.setEstado(EstadoUsuario.ACTIVO);
        when(usuarios.countByRol_NombreAndEstado("ADMINISTRADOR", EstadoUsuario.ACTIVO)).thenReturn(1L);
        assertThrows(BusinessRuleException.class,
                () -> service.cambiarEstado(2L, EstadoUsuario.DESACTIVADO, admin));
        assertEquals(EstadoUsuario.ACTIVO, target.getEstado());
    }

    @Test void rolSeAuditaUnaVezPorCambioRealYProtegeUltimoAdmin() {
        bloquear();
        Rol moderador = rol(2L, "MODERADOR");
        when(roles.findByNombre("MODERADOR")).thenReturn(Optional.of(moderador));
        when(usuarios.saveAndFlush(target)).thenReturn(target);
        when(usuarios.getReferenceById(1L)).thenReturn(usuario(1L, adminRol, "admin"));
        service.cambiarRol(2L, "MODERADOR", admin);
        assertEquals(1, target.getVersionToken());
        verify(auditoria).saveAndFlush(argThat(registro -> registro.getRolAnterior().getNombre().equals("USUARIO")
                && registro.getRolNuevo().getNombre().equals("MODERADOR")
                && registro.getAdministrador().getIdUsuario().equals(1L)));
        service.cambiarRol(2L, "MODERADOR", admin);
        verify(auditoria, times(1)).saveAndFlush(any());
        target.setRol(adminRol);
        when(usuarios.countByRol_NombreAndEstado("ADMINISTRADOR", EstadoUsuario.ACTIVO)).thenReturn(1L);
        assertThrows(BusinessRuleException.class, () -> service.cambiarRol(2L, "MODERADOR", admin));
    }

    @Test void cuentaDeEvaluacionYAutogestionEstanProhibidas() {
        bloquear();
        target.setNombreUsuario(ProtectedAccounts.EVALUATION_ADMIN_USERNAME);
        assertThrows(BusinessRuleException.class,
                () -> service.cambiarEstado(2L, EstadoUsuario.DESACTIVADO, admin));
        target.setNombreUsuario("persona");
        target.setIdUsuario(1L);
        assertThrows(BusinessRuleException.class, () -> service.cambiarRol(2L, "ADMINISTRADOR", admin));
        verify(usuarios, never()).saveAndFlush(any());
    }
}
