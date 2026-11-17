package com.insectopia.models.ids;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class ParticipanteEventoId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "id_evento", nullable = false)
    private Long idEvento;

    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    public ParticipanteEventoId() {
    }

    public ParticipanteEventoId(Long idEvento, Long idUsuario) {
        this.idEvento = idEvento;
        this.idUsuario = idUsuario;
    }

    public Long getIdEvento() {
        return idEvento;
    }

    public void setIdEvento(Long idEvento) {
        this.idEvento = idEvento;
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
        if (!(objeto instanceof ParticipanteEventoId otro)) {
            return false;
        }
        return Objects.equals(idEvento, otro.idEvento)
                && Objects.equals(idUsuario, otro.idUsuario);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idEvento, idUsuario);
    }
}
