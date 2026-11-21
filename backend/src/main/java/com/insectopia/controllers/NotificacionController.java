package com.insectopia.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.notificaciones.NoLeidasCountDTO;
import com.insectopia.dtos.notificaciones.NotificacionResponseDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.services.NotificacionService;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api/notificaciones")
@Validated
public class NotificacionController {
    private final NotificacionService service;

    public NotificacionController(NotificacionService service) { this.service = service; }

    @GetMapping
    public PaginaDTO<NotificacionResponseDTO> listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @RequestParam(defaultValue = "todas")
            @Pattern(regexp = "todas|no-leidas|leidas") String filtro,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(service.listar(page, size, filtro, principal));
    }

    @GetMapping("/no-leidas/count")
    public NoLeidasCountDTO contar(@AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.contar(principal);
    }

    @PatchMapping("/{id}/leer")
    public NotificacionResponseDTO leer(@PathVariable Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.leer(id, principal);
    }

    @PatchMapping("/leer-todas")
    public NoLeidasCountDTO leerTodas(@AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.leerTodas(principal);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        service.eliminar(id, principal);
        return ResponseEntity.noContent().build();
    }
}
