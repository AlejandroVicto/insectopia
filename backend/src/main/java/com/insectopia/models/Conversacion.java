package com.insectopia.models;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "conversaciones")
public class Conversacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_conversacion", nullable = false)
    private Long idConversacion;

    @Column(name = "clave_directa", nullable = false, length = 45, unique = true)
    private String claveDirecta;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    @OneToMany(mappedBy = "conversacion", fetch = FetchType.LAZY)
    private List<ParticipanteConversacion> participantes = new ArrayList<>();

    @OneToMany(mappedBy = "conversacion", fetch = FetchType.LAZY)
    private List<Mensaje> mensajes = new ArrayList<>();

    public Conversacion() {
    }

    @PrePersist
    private void prepararInsercion() {
        if (fechaCreacion == null) {
            fechaCreacion = LocalDateTime.now();
        }
    }

    public Long getIdConversacion() {
        return idConversacion;
    }

    public void setIdConversacion(Long idConversacion) {
        this.idConversacion = idConversacion;
    }

    public String getClaveDirecta() {
        return claveDirecta;
    }

    public void setClaveDirecta(String claveDirecta) {
        this.claveDirecta = claveDirecta;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }

    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }

    public List<ParticipanteConversacion> getParticipantes() {
        return participantes;
    }

    public void setParticipantes(List<ParticipanteConversacion> participantes) {
        this.participantes = participantes;
    }

    public List<Mensaje> getMensajes() {
        return mensajes;
    }

    public void setMensajes(List<Mensaje> mensajes) {
        this.mensajes = mensajes;
    }
}
