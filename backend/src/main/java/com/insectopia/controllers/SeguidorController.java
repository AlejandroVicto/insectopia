package com.insectopia.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.UsuarioPublicoDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.SeguidorService;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Actividad 076. La identidad del seguidor se toma siempre del principal
 * autenticado; el {@code {id}} de la ruta es únicamente el otro usuario.
 */
@RestController
@RequestMapping("/api/usuarios")
@Validated
@PreAuthorize("hasAuthority('" + Permissions.CONTENIDO_LEER + "')")
public class SeguidorController {

    private final SeguidorService seguidores;

    public SeguidorController(SeguidorService seguidores) {
        this.seguidores = seguidores;
    }

    @GetMapping("/me/seguidores")
    public PaginaDTO<UsuarioPublicoDTO> listarSeguidores(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @RequestParam(required = false, defaultValue = "") @Size(max = 100) String q,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return seguidores.listarSeguidores(page, size, q, principal);
    }

    @GetMapping("/{id}")
    public UsuarioPublicoDTO perfilPublico(
            @PathVariable @Positive Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return seguidores.perfilPublico(id, principal);
    }

    @PostMapping("/{id}/seguir")
    public ResponseEntity<Void> seguir(
            @PathVariable @Positive Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return seguidores.seguir(id, principal).creada()
                ? ResponseEntity.status(HttpStatus.CREATED).build()
                : ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/seguir")
    public ResponseEntity<Void> dejarSeguir(
            @PathVariable @Positive Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        seguidores.dejarSeguir(id, principal);
        return ResponseEntity.noContent().build();
    }
}
