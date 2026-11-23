package com.insectopia.controllers;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.moderacion.PropuestaEventoDTO;
import com.insectopia.dtos.moderacion.RechazarPropuestaRequestDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.models.enums.EstadoEvento;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.ModeracionService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** Moderación de eventos. Los reportes conservan sus rutas originales en /api/reportes. */
@RestController
@RequestMapping("/api/moderacion")
@Validated
public class ModeracionController {
    private final ModeracionService service;

    public ModeracionController(ModeracionService service) {
        this.service = service;
    }

    @GetMapping("/eventos/propuestas")
    @PreAuthorize("hasAuthority('" + Permissions.EVENTO_REVISAR + "')")
    public PaginaDTO<PropuestaEventoDTO> listarPropuestas(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) EstadoEvento estado,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(service.listarPropuestas(page, size, q, estado, fechaDesde, fechaHasta, principal));
    }

    @PatchMapping("/eventos/{id}/aprobar")
    @PreAuthorize("hasAuthority('" + Permissions.EVENTO_RESOLVER + "')")
    public PropuestaEventoDTO aprobar(@PathVariable Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.aprobar(id, principal);
    }

    @PatchMapping("/eventos/{id}/rechazar")
    @PreAuthorize("hasAuthority('" + Permissions.EVENTO_RESOLVER + "')")
    public PropuestaEventoDTO rechazar(@PathVariable Long id,
            @Valid @RequestBody RechazarPropuestaRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.rechazar(id, datos, principal);
    }
}
