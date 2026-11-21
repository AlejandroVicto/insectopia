package com.insectopia.controllers;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.dtos.reportes.*;
import com.insectopia.models.enums.EstadoReporte;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.ReportesService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/reportes")
@Validated
public class ReportesController {
    private final ReportesService service;

    public ReportesController(ReportesService service) { this.service = service; }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.PUBLICACION_REPORTAR + "')")
    public ResponseEntity<ReporteResponseDTO> crear(@Valid @RequestBody ReporteCreateRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        var creado = service.crear(datos, principal);
        return ResponseEntity.created(URI.create("/api/reportes/" + creado.id())).body(creado);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('" + Permissions.REPORTE_REVISAR + "')")
    public PaginaDTO<ReporteResponseDTO> listar(@RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @RequestParam(required = false) EstadoReporte estado,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(service.listar(page, size, estado, principal));
    }

    @PatchMapping("/{id}/resolver")
    @PreAuthorize("hasAuthority('" + Permissions.REPORTE_RESOLVER + "')")
    public ReporteResponseDTO resolver(@PathVariable Long id, @Valid @RequestBody ReporteResolverRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.resolver(id, datos, principal);
    }
}
