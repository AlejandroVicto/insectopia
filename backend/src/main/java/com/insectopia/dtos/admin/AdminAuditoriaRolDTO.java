package com.insectopia.dtos.admin;

import java.time.LocalDateTime;

import com.insectopia.models.AuditoriaRol;

public record AdminAuditoriaRolDTO(Long idAuditoria, Long idAdministrador, String nombreAdministrador,
        String rolAnterior, String rolNuevo, LocalDateTime fechaCambio) {
    public static AdminAuditoriaRolDTO from(AuditoriaRol registro) {
        return new AdminAuditoriaRolDTO(registro.getIdAuditoria(),
                registro.getAdministrador() == null ? null : registro.getAdministrador().getIdUsuario(),
                registro.getAdministrador() == null ? "Cuenta eliminada" : registro.getAdministrador().getNombre(),
                registro.getRolAnterior().getNombre(), registro.getRolNuevo().getNombre(), registro.getFechaCambio());
    }
}
