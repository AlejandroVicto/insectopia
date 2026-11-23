package com.insectopia.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.dtos.RegisterRequestDTO;
import com.insectopia.dtos.RegisterResponseDTO;
import com.insectopia.dtos.LoginRequestDTO;
import com.insectopia.dtos.AuthResponseDTO;
import com.insectopia.dtos.ForgotPasswordRequestDTO;
import com.insectopia.dtos.MensajeResponseDTO;
import com.insectopia.dtos.ResetPasswordRequestDTO;
import com.insectopia.services.AuthService;
import com.insectopia.services.PasswordRecoveryService;
import com.insectopia.security.InsectopiaUserDetails;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final PasswordRecoveryService passwordRecoveryService;

    public AuthController(AuthService authService, PasswordRecoveryService passwordRecoveryService) {
        this.authService = authService;
        this.passwordRecoveryService = passwordRecoveryService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponseDTO> register(@Valid @RequestBody RegisterRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public AuthResponseDTO login(@Valid @RequestBody LoginRequestDTO request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public AuthResponseDTO.UserDTO me(@AuthenticationPrincipal InsectopiaUserDetails principal) {
        return authService.me(principal);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @AuthenticationPrincipal InsectopiaUserDetails principal) {
        authService.logout(authorization, principal);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MensajeResponseDTO> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDTO request,
            HttpServletRequest servletRequest) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(passwordRecoveryService.solicitar(request, servletRequest.getRemoteAddr()));
    }

    @PostMapping("/reset-password")
    public MensajeResponseDTO resetPassword(@Valid @RequestBody ResetPasswordRequestDTO request) {
        return passwordRecoveryService.restablecer(request);
    }
}
