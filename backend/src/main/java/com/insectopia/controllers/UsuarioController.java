package com.insectopia.controllers;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.MiPerfilResponseDTO;
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

    public UsuarioController(UsuarioService usuarios) {
        this.usuarios = usuarios;
    }

    @GetMapping
    public MiPerfilResponseDTO miPerfil(
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return usuarios.miPerfil(principal);
    }

    @GetMapping("/publicaciones")
    public PaginaDTO<PublicacionResponseDTO> publicaciones(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return usuarios.publicacionesPropias(page, size, principal);
    }
}
