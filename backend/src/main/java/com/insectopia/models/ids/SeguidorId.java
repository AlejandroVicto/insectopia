package com.insectopia.models.ids;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class SeguidorId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "id_seguidor", nullable = false)
    private Long idSeguidor;

    @Column(name = "id_seguido", nullable = false)
    private Long idSeguido;

    public SeguidorId() {
    }

    public SeguidorId(Long idSeguidor, Long idSeguido) {
        this.idSeguidor = idSeguidor;
        this.idSeguido = idSeguido;
    }

    public Long getIdSeguidor() {
        return idSeguidor;
    }

    public void setIdSeguidor(Long idSeguidor) {
        this.idSeguidor = idSeguidor;
    }

    public Long getIdSeguido() {
        return idSeguido;
    }

    public void setIdSeguido(Long idSeguido) {
        this.idSeguido = idSeguido;
    }

    @Override
    public boolean equals(Object objeto) {
        if (this == objeto) {
            return true;
        }
        if (!(objeto instanceof SeguidorId otro)) {
            return false;
        }
        return Objects.equals(idSeguidor, otro.idSeguidor)
                && Objects.equals(idSeguido, otro.idSeguido);
    }

    @Override
    public int hashCode() {
        return Objects.hash(idSeguidor, idSeguido);
    }
}
