package com.insectopia.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.AuthResponseDTO;
import com.insectopia.dtos.GoogleCompleteRegistrationRequestDTO;
import com.insectopia.dtos.GoogleConfigResponseDTO;
import com.insectopia.dtos.GoogleExchangeRequestDTO;
import com.insectopia.dtos.GoogleExchangeResponseDTO;
import com.insectopia.dtos.GoogleLinkStartResponseDTO;
import com.insectopia.dtos.GoogleTokenRequestDTO;
import com.insectopia.dtos.GoogleVinculoResponseDTO;
import com.insectopia.dtos.MensajeResponseDTO;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.OAuthResponseHeaders;
import com.insectopia.services.GoogleOAuthService;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/google")
public class GoogleOAuthController {

    private final GoogleOAuthService service;

    public GoogleOAuthController(GoogleOAuthService service) {
        this.service = service;
    }

    @GetMapping("/config")
    public GoogleConfigResponseDTO configuracion(HttpServletResponse response) {
        OAuthResponseHeaders.apply(response);
        return service.configuracion();
    }

    @PostMapping("/exchange")
    public GoogleExchangeResponseDTO intercambiar(@Valid @RequestBody GoogleExchangeRequestDTO request,
            HttpServletResponse response) {
        OAuthResponseHeaders.apply(response);
        return service.intercambiar(request.code());
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDTO> completarRegistro(
            @Valid @RequestBody GoogleCompleteRegistrationRequestDTO request,
            HttpServletResponse response) {
        OAuthResponseHeaders.apply(response);
        return ResponseEntity.ok(service.completarRegistro(request.token(), request.datos()));
    }

    @PostMapping("/register/cancel")
    public MensajeResponseDTO cancelarRegistro(@Valid @RequestBody GoogleTokenRequestDTO request,
            HttpServletResponse response) {
        OAuthResponseHeaders.apply(response);
        service.cancelarRegistro(request);
        return MensajeResponseDTO.of("Registro con Google cancelado.");
    }

    @PostMapping("/link")
    public GoogleLinkStartResponseDTO iniciarVinculacion(
            @AuthenticationPrincipal InsectopiaUserDetails principal, HttpServletResponse response) {
        OAuthResponseHeaders.apply(response);
        return service.iniciarVinculacion(principal);
    }

    @GetMapping("/link")
    public GoogleVinculoResponseDTO consultarVinculo(
            @AuthenticationPrincipal InsectopiaUserDetails principal, HttpServletResponse response) {
        OAuthResponseHeaders.apply(response);
        return service.consultarVinculo(principal);
    }

    @DeleteMapping("/link")
    public MensajeResponseDTO desvincular(@AuthenticationPrincipal InsectopiaUserDetails principal,
            HttpServletResponse response) {
        OAuthResponseHeaders.apply(response);
        service.desvincular(principal);
        return MensajeResponseDTO.of("Identidad de Google desvinculada.");
    }
}
