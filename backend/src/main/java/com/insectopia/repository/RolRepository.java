package com.insectopia.repository;

import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.Rol;

public interface RolRepository extends JpaRepository<Rol, Long> {

    // Buscar un rol por su nombre
    Optional<Rol> findByNombre(String nombre);

    // Verificar si existe un rol con ese nombre
    boolean existsByNombre(String nombre);

    // Candado común para serializar cambios que podrían dejar sin administrador activo al sistema.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Rol r where r.nombre = 'ADMINISTRADOR'")
    Optional<Rol> bloquearAdministrador();
}
