package com.insectopia.controllers;

import java.util.List;

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
import com.insectopia.dtos.UsuarioSugeridoDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.dtos.publicaciones.PublicacionResponseDTO;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.SeguidorService;
import com.insectopia.services.UsuarioService;

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
    private final UsuarioService usuarios;

    public SeguidorController(SeguidorService seguidores, UsuarioService usuarios) {
        this.seguidores = seguidores;
        this.usuarios = usuarios;
    }

    @GetMapping("/me/seguidores")
    public PaginaDTO<UsuarioPublicoDTO> listarSeguidores(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @RequestParam(required = false, defaultValue = "") @Size(max = 100) String q,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return seguidores.listarSeguidores(page, size, q, principal);
    }

    @GetMapping("/buscar")
    public List<UsuarioSugeridoDTO> buscarUsuarios(
            @RequestParam @Size(min = 1, max = 100) String q,
            @RequestParam(defaultValue = "5") @Min(1) @Max(10) int limite,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return seguidores.buscarUsuarios(q, limite, principal);
    }

    @GetMapping("/sugeridos")
    public List<UsuarioSugeridoDTO> sugeridos(
            @RequestParam(defaultValue = "5") @Min(1) @Max(5) int limite,
            @RequestParam(required = false) @Size(max = 20) List<Long> excluir,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return seguidores.sugeridos(limite, excluir, principal);
    }

    @GetMapping("/{id}")
    public UsuarioPublicoDTO perfilPublico(
            @PathVariable @Positive Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return seguidores.perfilPublico(id, principal);
    }

    @GetMapping("/{id}/publicaciones")
    public PaginaDTO<PublicacionResponseDTO> publicacionesPublicas(
            @PathVariable @Positive Long id,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return usuarios.publicacionesPublicas(id, page, size, principal);
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
