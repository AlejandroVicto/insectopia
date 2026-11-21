package com.insectopia.controllers;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.publicaciones.ReaccionEstadoDTO;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.PublicacionesService;

@RestController
@RequestMapping("/api/publicaciones/{id}/reaccion")
@PreAuthorize("hasAuthority('" + Permissions.CONTENIDO_LEER + "')")
public class ReaccionesController {

    private final PublicacionesService service;

    public ReaccionesController(PublicacionesService service) {
        this.service = service;
    }

    @GetMapping
    public ReaccionEstadoDTO estado(
            @PathVariable Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.estadoReaccion(id, principal);
    }

    @PostMapping
    public ReaccionEstadoDTO reaccionar(
            @PathVariable Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.reaccionar(id, principal);
    }

    @DeleteMapping
    public ReaccionEstadoDTO quitar(
            @PathVariable Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.quitarReaccion(id, principal);
    }
}
