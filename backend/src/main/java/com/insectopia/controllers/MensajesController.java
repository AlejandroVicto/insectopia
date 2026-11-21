package com.insectopia.controllers;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.mensajes.AbrirConversacionRequestDTO;
import com.insectopia.dtos.mensajes.ConversacionResponseDTO;
import com.insectopia.dtos.mensajes.MensajeCreateRequestDTO;
import com.insectopia.dtos.mensajes.MensajeResponseDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.GestionConversacionesService;
import com.insectopia.services.GestionConversacionesService.ResultadoAbrir;
import com.insectopia.services.MensajesService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** Endpoints JWT de las actividades 064 y 066 (bandeja, historial, envío y gestión). */
@RestController
@RequestMapping("/api/conversaciones")
@Validated
@PreAuthorize("hasAuthority('" + Permissions.CONTENIDO_LEER + "')")
public class MensajesController {

    private final MensajesService service;
    private final GestionConversacionesService gestion;

    public MensajesController(MensajesService service, GestionConversacionesService gestion) {
        this.service = service;
        this.gestion = gestion;
    }

    @GetMapping
    public PaginaDTO<ConversacionResponseDTO> listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(defaultValue = "false") boolean noLeidos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(service.listar(page, size, q, noLeidos, principal));
    }

    @GetMapping("/{id}/mensajes")
    public PaginaDTO<MensajeResponseDTO> historial(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "30") @Min(1) @Max(100) int size,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(service.listarMensajes(id, page, size, principal));
    }

    @PostMapping("/{id}/mensajes")
    public ResponseEntity<MensajeResponseDTO> enviar(
            @PathVariable Long id,
            @Valid @RequestBody MensajeCreateRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.enviar(id, datos, principal));
    }

    /** 066: crear (201) o recuperar (200) una conversación directa. */
    @PostMapping
    public ResponseEntity<ConversacionResponseDTO> abrir(
            @Valid @RequestBody AbrirConversacionRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        ResultadoAbrir resultado = gestion.abrir(datos.getDestinatarioId(), principal);
        return ResponseEntity.status(resultado.creada() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(resultado.conversacion());
    }

    /** 066: ocultar únicamente para el participante autenticado. */
    @PatchMapping("/{id}/ocultar")
    public ResponseEntity<Map<String, Boolean>> ocultar(
            @PathVariable Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        gestion.ocultar(id, principal);
        return ResponseEntity.ok(Map.of("oculta", Boolean.TRUE));
    }
}
