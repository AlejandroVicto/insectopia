package com.insectopia.models;

import java.time.LocalDateTime;

import com.insectopia.models.enums.EstadoUsuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario", nullable = false)
    private Long idUsuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_rol", nullable = false)
    private Rol rol;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "correo", nullable = false, length = 150, unique = true)
    private String correo;

    @Column(name = "contrasena", nullable = false, length = 255)
    private String contrasena;

    @Column(name = "telefono", length = 20)
    private String telefono;

    @Column(name = "biografia", length = 500)
    private String biografia;

    @Column(name = "foto_perfil", length = 500)
    private String fotoPerfil;

    @Column(name = "foto_portada", length = 500)
    private String fotoPortada;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    private EstadoUsuario estado = EstadoUsuario.ACTIVO;

    @Column(name = "recibir_sms", nullable = false)
    private Boolean recibirSms = Boolean.FALSE;

    @Column(name = "recibir_whatsapp", nullable = false)
    private Boolean recibirWhatsapp = Boolean.FALSE;

    @Column(name = "version_token", nullable = false)
    private Integer versionToken = 0;

    @Column(name = "fecha_registro", nullable = false)
    private LocalDateTime fechaRegistro;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    public Usuario() {
    }

    @PrePersist
    private void prepararInsercion() {
        LocalDateTime ahora = LocalDateTime.now();
        if (fechaRegistro == null) {
            fechaRegistro = ahora;
        }
        if (fechaActualizacion == null) {
            fechaActualizacion = ahora;
        }
        if (estado == null) {
            estado = EstadoUsuario.ACTIVO;
        }
        if (recibirSms == null) {
            recibirSms = Boolean.FALSE;
        }
        if (recibirWhatsapp == null) {
            recibirWhatsapp = Boolean.FALSE;
        }
        if (versionToken == null) {
            versionToken = 0;
        }
    }

    @PreUpdate
    private void prepararActualizacion() {
        fechaActualizacion = LocalDateTime.now();
    }

    public Long getIdUsuario() {
        return idUsuario;
    }

    public void setIdUsuario(Long idUsuario) {
        this.idUsuario = idUsuario;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getBiografia() {
        return biografia;
    }

    public void setBiografia(String biografia) {
        this.biografia = biografia;
    }

    public String getFotoPerfil() {
        return fotoPerfil;
    }

    public void setFotoPerfil(String fotoPerfil) {
        this.fotoPerfil = fotoPerfil;
    }

    public String getFotoPortada() {
        return fotoPortada;
    }

    public void setFotoPortada(String fotoPortada) {
        this.fotoPortada = fotoPortada;
    }

    public EstadoUsuario getEstado() {
        return estado;
    }

    public void setEstado(EstadoUsuario estado) {
        this.estado = estado;
    }

    public Boolean getRecibirSms() {
        return recibirSms;
    }

    public void setRecibirSms(Boolean recibirSms) {
        this.recibirSms = recibirSms;
    }

    public Boolean getRecibirWhatsapp() {
        return recibirWhatsapp;
    }

    public void setRecibirWhatsapp(Boolean recibirWhatsapp) {
        this.recibirWhatsapp = recibirWhatsapp;
    }

    public Integer getVersionToken() {
        return versionToken;
    }

    public void setVersionToken(Integer versionToken) {
        this.versionToken = versionToken;
    }

    public LocalDateTime getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDateTime fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }

    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }

    public void setFechaActualizacion(LocalDateTime fechaActualizacion) {
        this.fechaActualizacion = fechaActualizacion;
    }
}
