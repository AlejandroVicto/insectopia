package com.insectopia.controllers;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.publicaciones.ComentarioCreateRequestDTO;
import com.insectopia.dtos.publicaciones.ComentarioResponseDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.PublicacionesService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/publicaciones/{id}/comentarios")
@Validated
@PreAuthorize("hasAuthority('" + Permissions.CONTENIDO_LEER + "')")
public class ComentariosController {

    private final PublicacionesService service;

    public ComentariosController(PublicacionesService service) {
        this.service = service;
    }

    @GetMapping
    public PaginaDTO<ComentarioResponseDTO> listar(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(service.listarComentarios(id, page, size, principal));
    }

    @PostMapping
    public ResponseEntity<ComentarioResponseDTO> crear(
            @PathVariable Long id,
            @Valid @RequestBody ComentarioCreateRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        ComentarioResponseDTO creado = service.crearComentario(id, datos, principal);
        return ResponseEntity.created(URI.create("/api/publicaciones/" + id + "/comentarios/" + creado.id()))
                .body(creado);
    }
}
