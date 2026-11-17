package com.insectopia.models;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "reacciones",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_reacciones_publicacion_usuario",
                columnNames = { "id_publicacion", "id_usuario" }
        )
)
public class Reaccion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reaccion", nullable = false)
    private Long idReaccion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_publicacion", nullable = false)
    private Publicacion publicacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "tipo", nullable = false, length = 30)
    private String tipo = "ME_GUSTA";

    @Column(name = "fecha_reaccion", nullable = false)
    private LocalDateTime fechaReaccion;

    public Reaccion() {
    }

    @PrePersist
    private void prepararInsercion() {
        if (fechaReaccion == null) {
            fechaReaccion = LocalDateTime.now();
        }
        if (tipo == null) {
            tipo = "ME_GUSTA";
        }
    }

    public Long getIdReaccion() {
        return idReaccion;
    }

    public void setIdReaccion(Long idReaccion) {
        this.idReaccion = idReaccion;
    }

    public Publicacion getPublicacion() {
        return publicacion;
    }

    public void setPublicacion(Publicacion publicacion) {
        this.publicacion = publicacion;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public LocalDateTime getFechaReaccion() {
        return fechaReaccion;
    }

    public void setFechaReaccion(LocalDateTime fechaReaccion) {
        this.fechaReaccion = fechaReaccion;
    }
}
