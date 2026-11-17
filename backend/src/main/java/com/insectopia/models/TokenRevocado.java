package com.insectopia.models;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "tokens_revocados")
public class TokenRevocado {

    @Id
    @Column(name = "jti", nullable = false, length = 36, columnDefinition = "CHAR(36)")
    private String jti;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha_revocacion", nullable = false)
    private LocalDateTime fechaRevocacion;

    @Column(name = "fecha_expiracion", nullable = false)
    private LocalDateTime fechaExpiracion;

    public TokenRevocado() {
    }

    @PrePersist
    private void prepararInsercion() {
        if (fechaRevocacion == null) {
            fechaRevocacion = LocalDateTime.now();
        }
    }

    public String getJti() {
        return jti;
    }

    public void setJti(String jti) {
        this.jti = jti;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public LocalDateTime getFechaRevocacion() {
        return fechaRevocacion;
    }

    public void setFechaRevocacion(LocalDateTime fechaRevocacion) {
        this.fechaRevocacion = fechaRevocacion;
    }

    public LocalDateTime getFechaExpiracion() {
        return fechaExpiracion;
    }

    public void setFechaExpiracion(LocalDateTime fechaExpiracion) {
        this.fechaExpiracion = fechaExpiracion;
    }
}
