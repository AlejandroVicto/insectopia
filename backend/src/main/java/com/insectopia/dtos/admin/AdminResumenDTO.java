package com.insectopia.dtos.admin;

public record AdminResumenDTO(long totalUsuarios, long usuarios, long moderadores,
        long administradores, long cuentasDesactivadas) { }
