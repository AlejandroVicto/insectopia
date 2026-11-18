package com.insectopia.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.Rol;

public interface RolRepository extends JpaRepository<Rol, Long> {

    // Buscar un rol por su nombre
    Optional<Rol> findByNombre(String nombre);

    // Verificar si existe un rol con ese nombre
    boolean existsByNombre(String nombre);
}
