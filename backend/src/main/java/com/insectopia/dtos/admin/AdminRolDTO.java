package com.insectopia.dtos.admin;

import com.insectopia.models.Rol;

public record AdminRolDTO(String nombre, String descripcion) {
    public static AdminRolDTO from(Rol rol) {
        return new AdminRolDTO(rol.getNombre(), rol.getDescripcion());
    }
}
