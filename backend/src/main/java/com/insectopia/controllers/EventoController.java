package com.insectopia.controllers;

import java.net.URI;
import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.eventos.EventoRequestDTO;
import com.insectopia.dtos.eventos.EventoResponseDTO;
import com.insectopia.dtos.eventos.EventoUpdateRequestDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.models.enums.EstadoEvento;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.services.EventoService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/eventos")
@Validated
@PreAuthorize("hasAuthority('" + Permissions.CONTENIDO_LEER + "')")
public class EventoController {
    private final EventoService service;

    public EventoController(EventoService service) {
        this.service = service;
    }

    @GetMapping
    public PaginaDTO<EventoResponseDTO> listar(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) EstadoEvento estado,
            @RequestParam(defaultValue = "") @Pattern(regexp = "|futuros|pasados") String periodo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @RequestParam(defaultValue = "false") boolean proximos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(service.listar(page, size, q, estado, periodo, fechaDesde, fechaHasta, proximos, principal));
    }

    @GetMapping("/buscar")
    public PaginaDTO<EventoResponseDTO> buscarTitulos(
            @RequestParam @Size(min = 1, max = 100) String q,
            @RequestParam(defaultValue = "5") @Min(1) @Max(10) int limite,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(service.buscarTitulos(q, limite, principal));
    }

    @GetMapping("/mis-propuestas")
    public PaginaDTO<EventoResponseDTO> propias(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) EstadoEvento estado,
            @RequestParam(defaultValue = "") @Pattern(regexp = "|futuros|pasados") String periodo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(service.propias(page, size, q, estado, periodo, fechaDesde, fechaHasta, principal));
    }

    @GetMapping("/mis-participaciones")
    public PaginaDTO<EventoResponseDTO> participaciones(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) EstadoEvento estado,
            @RequestParam(defaultValue = "") @Pattern(regexp = "|futuros|pasados") String periodo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return PaginaDTO.from(service.misParticipaciones(page, size, q, estado, periodo, fechaDesde, fechaHasta, principal));
    }

    @GetMapping("/{id}")
    public EventoResponseDTO obtener(@PathVariable Long id, @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.obtener(id, principal);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + Permissions.EVENTO_PROPONER + "')")
    public ResponseEntity<EventoResponseDTO> crear(@Valid @RequestBody EventoRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        EventoResponseDTO creado = service.crear(datos, principal);
        return ResponseEntity.created(URI.create("/api/eventos/" + creado.idEvento())).body(creado);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.EVENTO_PROPONER + "')")
    public EventoResponseDTO editar(@PathVariable Long id, @Valid @RequestBody EventoUpdateRequestDTO datos,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.editar(id, datos, principal);
    }

    @PostMapping(value = "/{id}/imagen", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('" + Permissions.EVENTO_PROPONER + "')")
    public EventoResponseDTO subirImagen(@PathVariable Long id, @RequestPart("imagen") MultipartFile imagen,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return service.subirImagen(id, imagen, principal);
    }

    @DeleteMapping("/{id}/imagen")
    @PreAuthorize("hasAuthority('" + Permissions.EVENTO_PROPONER + "')")
    public ResponseEntity<Void> quitarImagen(@PathVariable Long id, @AuthenticationPrincipal InsectopiaUserDetails principal) {
        service.quitarImagen(id, principal);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/imagen")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Resource> leerImagen(@PathVariable Long id, @AuthenticationPrincipal InsectopiaUserDetails principal) {
        var imagen = service.leerImagen(id, principal);
        return ResponseEntity.ok().contentType(imagen.tipo())
                .cacheControl(org.springframework.http.CacheControl.noStore()).body(imagen.resource());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('" + Permissions.EVENTO_PROPONER + "')")
    public ResponseEntity<Void> cancelar(@PathVariable Long id, @AuthenticationPrincipal InsectopiaUserDetails principal) {
        service.cancelarEvento(id, principal);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/participantes/me")
    public ResponseEntity<EventoResponseDTO> inscribir(@PathVariable Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        return ResponseEntity.status(201).body(service.inscribir(id, principal));
    }

    @DeleteMapping("/{id}/participantes/me")
    public ResponseEntity<Void> cancelarInscripcion(@PathVariable Long id,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        service.cancelarInscripcion(id, principal);
        return ResponseEntity.noContent().build();
    }
}
