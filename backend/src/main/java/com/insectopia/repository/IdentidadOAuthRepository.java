package com.insectopia.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.insectopia.models.IdentidadOAuth;

public interface IdentidadOAuthRepository extends JpaRepository<IdentidadOAuth, Long> {

    Optional<IdentidadOAuth> findByProveedorAndSubject(String proveedor, String subject);

    boolean existsByProveedorAndSubject(String proveedor, String subject);

    boolean existsByProveedorAndIdUsuario(String proveedor, Long idUsuario);

    void deleteByIdUsuarioAndProveedor(Long idUsuario, String proveedor);

    List<IdentidadOAuth> findByIdUsuario(Long idUsuario);

    long countByIdUsuario(Long idUsuario);
}
