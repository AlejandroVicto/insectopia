package com.insectopia.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.Conversacion;

public interface ConversacionRepository
        extends JpaRepository<Conversacion, Long> {

    // Buscar una conversación directa por su clave única
    Optional<Conversacion> findByClaveDirecta(String claveDirecta);

    // Comprobar si ya existe una conversación con esa clave
    boolean existsByClaveDirecta(String claveDirecta);
}
