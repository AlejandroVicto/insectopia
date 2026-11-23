package com.insectopia.controllers;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.MiPerfilResponseDTO;
import com.insectopia.dtos.ActualizarPerfilRequestDTO;
import com.insectopia.dtos.CambiarContrasenaRequest;
import com.insectopia.dtos.CambiarContrasenaResponseDTO;
import com.insectopia.dtos.ConfiguracionPerfilResponseDTO;
import com.insectopia.services.ConfiguracionCuentaService;
import jakarta.validation.Valid;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.dtos.publicaciones.PublicacionResponseDTO;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.UsuarioService;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Actividad 074. La identidad sólo se toma del principal autenticado: no se
 * acepta {@code idUsuario} por query, cabecera ni cuerpo.
 */
@RestController
@RequestMapping("/api/usuarios/me")
@Validated
@PreAuthorize("hasAuthority('" + Permissions.CONTENIDO_LEER + "')")
public class UsuarioController {

    private final UsuarioService usuarios;
    private final ConfiguracionCuentaService configuracion;

    public UsuarioController(UsuarioService usuarios, ConfiguracionCuentaService configuracion) {
        this.usuarios = usuarios;
        this.configuracion = configuracion;
    }

    @GetMapping
    public MiPerfilResponseDTO miPerfil(
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return usuarios.miPerfil(principal);
    }

    @GetMapping("/configuracion")
    public ConfiguracionPerfilResponseDTO configuracion(@AuthenticationPrincipal InsectopiaUserDetails principal) {
        return configuracion.consultar(principal);
    }

    @PutMapping
    public ConfiguracionPerfilResponseDTO actualizar(@Valid @RequestBody ActualizarPerfilRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return configuracion.actualizar(datos, principal);
    }

    @PutMapping("/contrasena")
    public CambiarContrasenaResponseDTO cambiarContrasena(@Valid @RequestBody CambiarContrasenaRequest datos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return configuracion.cambiarContrasena(datos, principal);
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ConfiguracionPerfilResponseDTO subirAvatar(@RequestPart("imagen") MultipartFile imagen,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return configuracion.subirAvatar(imagen, principal);
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<Void> quitarAvatar(@AuthenticationPrincipal InsectopiaUserDetails principal) {
        configuracion.quitarAvatar(principal);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/publicaciones")
    public PaginaDTO<PublicacionResponseDTO> publicaciones(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return usuarios.publicacionesPropias(page, size, principal);
    }
}
