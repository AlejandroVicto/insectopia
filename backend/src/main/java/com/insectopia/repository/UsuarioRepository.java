package com.insectopia.repository;

import java.util.Optional;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.insectopia.dtos.UsuarioSugeridoDTO;

import jakarta.persistence.LockModeType;

import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long>, JpaSpecificationExecutor<Usuario> {

    // Buscar usuario por correo electrónico
    Optional<Usuario> findByCorreo(String correo);

    // Verificar si el correo ya está registrado
    boolean existsByCorreo(String correo);

    boolean existsByNombreUsuario(String nombreUsuario);

    boolean existsByNombreUsuarioAndIdUsuarioNot(String nombreUsuario, Long idUsuario);

    /** Protección conservadora para la limpieza: no borrar avatares aún referenciados. */
    boolean existsByFotoPerfilEndingWith(String sufijo);

    // Consultar usuarios por estado con paginación
    Page<Usuario> findByEstado(EstadoUsuario estado, Pageable pageable);

    // Buscar usuarios por nombre sin distinguir mayúsculas
    Page<Usuario> findByNombreContainingIgnoreCase(
            String nombre,
            Pageable pageable
    );

    long countByRol_Nombre(String nombre);
    long countByEstado(EstadoUsuario estado);
    long countByRol_NombreAndEstado(String nombre, EstadoUsuario estado);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Usuario u join fetch u.rol where u.idUsuario = :id")
    Optional<Usuario> bloquearPorId(Long id);

    @Query("select coalesce(max(u.idUsuario), 0) from Usuario u")
    long mayorId();

    // Dos tramos alrededor de un pivote aleatorio; evita ORDER BY RAND() sobre toda la tabla.
    // NOT EXISTS usa la clave compuesta del seguimiento y el límite se aplica en SQL.
    @Query("""
            select new com.insectopia.dtos.UsuarioSugeridoDTO(u.idUsuario, u.nombre, u.nombreUsuario, u.fotoPerfil)
            from Usuario u
            where u.estado = :estado and u.idUsuario <> :propio
              and u.idUsuario not in :excluir
              and u.idUsuario >= :desde
              and not exists (select s from Seguidor s
                              where s.seguidor.idUsuario = :propio and s.seguido.idUsuario = u.idUsuario)
            order by u.idUsuario asc
            """)
    List<UsuarioSugeridoDTO> sugerirDesde(@Param("propio") Long propio,
            @Param("estado") EstadoUsuario estado, @Param("excluir") List<Long> excluir,
            @Param("desde") Long desde, Pageable limite);

    // Búsqueda pública para la navbar: sólo identidad visible, sin correos ni preferencias.
    @Query("""
            select new com.insectopia.dtos.UsuarioSugeridoDTO(u.idUsuario, u.nombre, u.nombreUsuario, u.fotoPerfil)
            from Usuario u
            where u.estado = :estado and u.idUsuario <> :propio
              and (lower(u.nombre) like :busqueda escape '\\'
                   or lower(u.nombreUsuario) like :busqueda escape '\\')
            order by lower(u.nombreUsuario) asc, u.idUsuario asc
            """)
    List<UsuarioSugeridoDTO> buscarUsuarios(@Param("propio") Long propio,
            @Param("estado") EstadoUsuario estado, @Param("busqueda") String busqueda, Pageable limite);
}
