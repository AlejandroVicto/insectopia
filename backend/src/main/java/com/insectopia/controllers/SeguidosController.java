package com.insectopia.controllers;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.mensajes.SeguidoResponseDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.GestionConversacionesService;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** Actividad 066: selector de personas seguidas para el modal «Nuevo mensaje». */
@RestController
@RequestMapping("/api/usuarios")
@Validated
@PreAuthorize("hasAuthority('" + Permissions.CONTENIDO_LEER + "')")
public class SeguidosController {

    private final GestionConversacionesService gestion;

    public SeguidosController(GestionConversacionesService gestion) {
        this.gestion = gestion;
    }

    @GetMapping("/seguidos")
    public PaginaDTO<SeguidoResponseDTO> listarSeguidos(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @RequestParam(required = false) @Size(max = 100) String q,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(gestion.listarSeguidos(page, size, q, principal));
    }
}
