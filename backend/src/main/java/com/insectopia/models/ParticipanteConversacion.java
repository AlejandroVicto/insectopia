package com.insectopia.models;

import java.time.LocalDateTime;

import com.insectopia.models.ids.ParticipanteConversacionId;

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
@Table(name = "participantes_conversacion")
public class ParticipanteConversacion {

    @EmbeddedId
    private ParticipanteConversacionId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("idConversacion")
    @JoinColumn(name = "id_conversacion", nullable = false)
    private Conversacion conversacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("idUsuario")
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha_ingreso", nullable = false)
    private LocalDateTime fechaIngreso;

    @Column(name = "fecha_ultima_lectura")
    private LocalDateTime fechaUltimaLectura;

    @Column(name = "oculta", nullable = false)
    private Boolean oculta = Boolean.FALSE;

    public ParticipanteConversacion() {
    }

    @PrePersist
    private void prepararInsercion() {
        if (fechaIngreso == null) {
            fechaIngreso = LocalDateTime.now();
        }
        if (oculta == null) {
            oculta = Boolean.FALSE;
        }
    }

    public ParticipanteConversacionId getId() {
        return id;
    }

    public void setId(ParticipanteConversacionId id) {
        this.id = id;
    }

    public Conversacion getConversacion() {
        return conversacion;
    }

    public void setConversacion(Conversacion conversacion) {
        this.conversacion = conversacion;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public LocalDateTime getFechaIngreso() {
        return fechaIngreso;
    }

    public void setFechaIngreso(LocalDateTime fechaIngreso) {
        this.fechaIngreso = fechaIngreso;
    }

    public LocalDateTime getFechaUltimaLectura() {
        return fechaUltimaLectura;
    }

    public void setFechaUltimaLectura(LocalDateTime fechaUltimaLectura) {
        this.fechaUltimaLectura = fechaUltimaLectura;
    }

    public Boolean getOculta() {
        return oculta;
    }

    public void setOculta(Boolean oculta) {
        this.oculta = oculta;
    }
}
