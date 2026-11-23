package com.insectopia.dtos;

/** Solo identidad visible: nunca datos de contacto o configuración de la cuenta. */
public record UsuarioSugeridoDTO(Long id, String nombre, String nombreUsuario, String avatarUrl) { }
