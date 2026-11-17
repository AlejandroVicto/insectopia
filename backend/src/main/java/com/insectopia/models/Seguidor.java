package com.insectopia.models;

import java.time.LocalDateTime;

import com.insectopia.models.ids.SeguidorId;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "seguidores")
public class Seguidor {

    @EmbeddedId
    private SeguidorId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("idSeguidor")
    @JoinColumn(name = "id_seguidor", nullable = false)
    private Usuario seguidor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("idSeguido")
    @JoinColumn(name = "id_seguido", nullable = false)
    private Usuario seguido;

    @Column(name = "fecha_seguimiento", nullable = false)
    private LocalDateTime fechaSeguimiento;

    public Seguidor() {
    }

    @PrePersist
    private void prepararInsercion() {
        if (fechaSeguimiento == null) {
            fechaSeguimiento = LocalDateTime.now();
        }
    }

    public SeguidorId getId() {
        return id;
    }

    public void setId(SeguidorId id) {
        this.id = id;
    }

    public Usuario getSeguidor() {
        return seguidor;
    }

    public void setSeguidor(Usuario seguidor) {
        this.seguidor = seguidor;
    }

    public Usuario getSeguido() {
        return seguido;
    }

    public void setSeguido(Usuario seguido) {
        this.seguido = seguido;
    }

    public LocalDateTime getFechaSeguimiento() {
        return fechaSeguimiento;
    }

    public void setFechaSeguimiento(LocalDateTime fechaSeguimiento) {
        this.fechaSeguimiento = fechaSeguimiento;
    }
}
