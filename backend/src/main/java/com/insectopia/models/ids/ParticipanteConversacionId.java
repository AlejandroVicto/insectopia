package com.insectopia.models.ids;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class ParticipanteConversacionId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "id_conversacion", nullable = false)
    private Long idConversacion;

    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    public ParticipanteConversacionId() {
    }

    public ParticipanteConversacionId(Long idConversacion, Long idUsuario) {
        this.idConversacion = idConversacion;
        this.idUsuario = idUsuario;
    }

    public Long getIdConversacion() {
        return idConversacion;
    }

    public void setIdConversacion(Long idConversacion) {
        this.idConversacion = idConversacion;
    }

    public Long getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Long idUsuario) {
        this.idUsuario = idUsuario;
    }

    @Override
    public boolean equals(Object objeto) {
        if (this == objeto) {
            return true;
        }
        if (!(objeto instanceof ParticipanteConversacionId otro)) {
            return false;
        }
        return Objects.equals(idConversacion, otro.idConversacion)
                && Objects.equals(idUsuario, otro.idUsuario);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idConversacion, idUsuario);
    }
}
