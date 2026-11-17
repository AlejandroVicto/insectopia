package com.insectopia.models;

import java.time.LocalDateTime;

import com.insectopia.models.enums.EstadoParticipanteEvento;
import com.insectopia.models.ids.ParticipanteEventoId;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "participantes_evento")
public class ParticipanteEvento {

    @EmbeddedId
    private ParticipanteEventoId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("idEvento")
    @JoinColumn(name = "id_evento", nullable = false)
    private Evento evento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("idUsuario")
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha_inscripcion", nullable = false)
    private LocalDateTime fechaInscripcion;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    private EstadoParticipanteEvento estado = EstadoParticipanteEvento.INSCRITO;

    @Column(name = "fecha_cancelacion")
    private LocalDateTime fechaCancelacion;

    public ParticipanteEvento() {
    }

    @PrePersist
    private void prepararInsercion() {
        if (fechaInscripcion == null) {
            fechaInscripcion = LocalDateTime.now();
        }
        if (estado == null) {
            estado = EstadoParticipanteEvento.INSCRITO;
        }
    }

    public ParticipanteEventoId getId() {
        return id;
    }

    public void setId(ParticipanteEventoId id) {
        this.id = id;
    }

    public Evento getEvento() {
        return evento;
    }

    public void setEvento(Evento evento) {
        this.evento = evento;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public LocalDateTime getFechaInscripcion() {
        return fechaInscripcion;
    }

    public void setFechaInscripcion(LocalDateTime fechaInscripcion) {
        this.fechaInscripcion = fechaInscripcion;
    }

    public EstadoParticipanteEvento getEstado() {
        return estado;
    }

    public void setEstado(EstadoParticipanteEvento estado) {
        this.estado = estado;
    }

    public LocalDateTime getFechaCancelacion() {
        return fechaCancelacion;
    }

    public void setFechaCancelacion(LocalDateTime fechaCancelacion) {
        this.fechaCancelacion = fechaCancelacion;
    }
}
