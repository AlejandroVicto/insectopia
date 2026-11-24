package com.insectopia.models;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "identidades_oauth", uniqueConstraints = {
        @UniqueConstraint(name = "uk_identidades_oauth_proveedor_subject",
                columnNames = {"proveedor", "subject"}),
        @UniqueConstraint(name = "uk_identidades_oauth_proveedor_usuario",
                columnNames = {"proveedor", "id_usuario"})
})
public class IdentidadOAuth {

    public static final String PROVEEDOR_GOOGLE = "GOOGLE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_identidad", nullable = false)
    private Long idIdentidad;

    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    @Column(name = "proveedor", nullable = false, length = 20)
    private String proveedor;

    @Column(name = "subject", nullable = false, length = 255)
    private String subject;

    @Column(name = "fecha_vinculacion", nullable = false)
    private LocalDateTime fechaVinculacion;

    public IdentidadOAuth() {
    }

    public IdentidadOAuth(Long idUsuario, String proveedor, String subject, LocalDateTime fechaVinculacion) {
        this.idUsuario = idUsuario;
        this.proveedor = proveedor;
        this.subject = subject;
        this.fechaVinculacion = fechaVinculacion;
    }

    public Long getIdIdentidad() {
        return idIdentidad;
    }

    public Long getIdUsuario() {
        return idUsuario;
    }

    public String getProveedor() {
        return proveedor;
    }

    public String getSubject() {
        return subject;
    }

    public LocalDateTime getFechaVinculacion() {
        return fechaVinculacion;
    }
}
