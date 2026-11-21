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

import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.dtos.publicaciones.PublicacionCreateRequestDTO;
import com.insectopia.dtos.publicaciones.PublicacionResponseDTO;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.PublicacionesService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/publicaciones")
@Validated
@PreAuthorize("hasAuthority('" + Permissions.CONTENIDO_LEER + "')")
public class PublicacionesController {

    private final PublicacionesService service;

    public PublicacionesController(PublicacionesService service) {
        this.service = service;
    }

    @GetMapping
    public PaginaDTO<PublicacionResponseDTO> listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @RequestParam(defaultValue = "para-ti")
            @Pattern(regexp = "para-ti|global", message = "El feed debe ser 'para-ti' o 'global'") String feed,
            @RequestParam(required = false) @Size(max = 100) String q,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(service.listar(page, size, feed, q, principal));
    }

    @GetMapping("/{id}")
    public PublicacionResponseDTO obtener(
            @PathVariable Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.obtener(id, principal);
    }

    @PostMapping
    public ResponseEntity<PublicacionResponseDTO> crear(
            @Valid @RequestBody PublicacionCreateRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        PublicacionResponseDTO creada = service.crear(datos, principal);
        return ResponseEntity.created(URI.create("/api/publicaciones/" + creada.id())).body(creada);
    }
}
