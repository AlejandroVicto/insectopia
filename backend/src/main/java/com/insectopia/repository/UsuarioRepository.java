package com.insectopia.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // Buscar usuario por correo electrónico
    Optional<Usuario> findByCorreo(String correo);

    // Verificar si el correo ya está registrado
    boolean existsByCorreo(String correo);

    // Consultar usuarios por estado con paginación
    Page<Usuario> findByEstado(EstadoUsuario estado, Pageable pageable);

    // Buscar usuarios por nombre sin distinguir mayúsculas
    Page<Usuario> findByNombreContainingIgnoreCase(
            String nombre,
            Pageable pageable
    );
}
