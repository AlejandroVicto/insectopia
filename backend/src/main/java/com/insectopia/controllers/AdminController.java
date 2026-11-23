package com.insectopia.controllers;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.RegisterRequestDTO;
import com.insectopia.dtos.admin.AdminAuditoriaRolDTO;
import com.insectopia.dtos.admin.AdminEditarUsuarioRequestDTO;
import com.insectopia.dtos.admin.AdminEstadoRequestDTO;
import com.insectopia.dtos.admin.AdminResumenDTO;
import com.insectopia.dtos.admin.AdminRolDTO;
import com.insectopia.dtos.admin.AdminRolRequestDTO;
import com.insectopia.dtos.admin.AdminUsuarioResponseDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.AdminService;
import com.insectopia.services.AdminEliminacionService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@Validated
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService service;
    private final AdminEliminacionService eliminacion;

    public AdminController(AdminService service, AdminEliminacionService eliminacion) {
        this.service = service;
        this.eliminacion = eliminacion;
    }

    @DeleteMapping("/usuarios/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.USUARIO_GESTIONAR + "')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @AuthenticationPrincipal InsectopiaUserDetails admin) {
        eliminacion.eliminar(id, admin);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/usuarios")
    @PreAuthorize("hasAuthority('" + Permissions.USUARIO_GESTIONAR + "')")
    public PaginaDTO<AdminUsuarioResponseDTO> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String rol,
            @RequestParam(required = false) EstadoUsuario estado,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @RequestParam(defaultValue = "fechaRegistro") String ordenar,
            @RequestParam(defaultValue = "desc") String direccion,
            @AuthenticationPrincipal InsectopiaUserDetails admin) {
        return service.listar(q, rol, estado, page, size, ordenar, direccion, admin);
    }

    @GetMapping("/usuarios/resumen")
    @PreAuthorize("hasAuthority('" + Permissions.USUARIO_GESTIONAR + "')")
    public AdminResumenDTO resumen(@AuthenticationPrincipal InsectopiaUserDetails admin) {
        return service.resumen(admin);
    }

    @GetMapping("/usuarios/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.USUARIO_GESTIONAR + "')")
    public AdminUsuarioResponseDTO detalle(@PathVariable Long id, @AuthenticationPrincipal InsectopiaUserDetails admin) {
        return service.detalle(id, admin);
    }

    @PostMapping("/usuarios")
    @PreAuthorize("hasAuthority('" + Permissions.USUARIO_GESTIONAR + "')")
    public ResponseEntity<AdminUsuarioResponseDTO> alta(@Valid @RequestBody RegisterRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails admin) {
        AdminUsuarioResponseDTO creado = service.alta(datos, admin);
        return ResponseEntity.created(URI.create("/api/admin/usuarios/" + creado.idUsuario())).body(creado);
    }

    @PutMapping("/usuarios/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.USUARIO_GESTIONAR + "')")
    public AdminUsuarioResponseDTO editar(@PathVariable Long id, @Valid @RequestBody AdminEditarUsuarioRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails admin) {
        return service.editar(id, datos, admin);
    }

    @PatchMapping("/usuarios/{id}/estado")
    @PreAuthorize("hasAuthority('" + Permissions.USUARIO_GESTIONAR + "')")
    public AdminUsuarioResponseDTO cambiarEstado(@PathVariable Long id, @Valid @RequestBody AdminEstadoRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails admin) {
        return service.cambiarEstado(id, datos.estado(), admin);
    }

    @GetMapping("/roles")
    @PreAuthorize("hasAuthority('" + Permissions.ROL_ASIGNAR + "')")
    public List<AdminRolDTO> roles(@AuthenticationPrincipal InsectopiaUserDetails admin) {
        return service.roles(admin);
    }

    @PatchMapping("/usuarios/{id}/rol")
    @PreAuthorize("hasAuthority('" + Permissions.ROL_ASIGNAR + "')")
    public AdminUsuarioResponseDTO cambiarRol(@PathVariable Long id, @Valid @RequestBody AdminRolRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails admin) {
        return service.cambiarRol(id, datos.rol(), admin);
    }

    @GetMapping("/usuarios/{id}/auditoria-roles")
    @PreAuthorize("hasAuthority('" + Permissions.ROL_ASIGNAR + "')")
    public PaginaDTO<AdminAuditoriaRolDTO> historial(@PathVariable Long id,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal InsectopiaUserDetails admin) {
        return service.historial(id, page, size, admin);
    }
}
