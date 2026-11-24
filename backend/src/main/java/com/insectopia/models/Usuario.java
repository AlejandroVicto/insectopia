package com.insectopia.models;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;

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
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "usuarios", uniqueConstraints = {
        @UniqueConstraint(name = "uk_usuarios_nombre_usuario", columnNames = "nombre_usuario"),
        @UniqueConstraint(name = "uk_usuarios_correo", columnNames = "correo")
})
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

    @Column(name = "nombre_usuario", nullable = false, length = 30)
    private String nombreUsuario;

    @Column(name = "correo", nullable = false, length = 150)
    private String correo;

    @Column(name = "contrasena", nullable = false, length = 255)
    private String contrasena;

    /** False for Google-only accounts whose BCrypt value is an unknown random secret. */
    @Column(name = "acceso_local_valido", nullable = false)
    private Boolean accesoLocalValido = Boolean.TRUE;

    @Column(name = "fecha_nacimiento", nullable = false)
    private LocalDate fechaNacimiento;

    @Column(name = "genero", length = 30)
    private String genero;

    @Column(name = "pais_codigo", nullable = false, length = 2, columnDefinition = "CHAR(2)")
    private String paisCodigo;

    @Column(name = "estado_region", nullable = false, length = 100)
    private String estadoRegion;

    @Column(name = "telefono", length = 20)
    private String telefono;

    @Column(name = "biografia", length = 500)
    private String biografia;

    @Column(name = "foto_perfil", length = 500)
    private String fotoPerfil;

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
        normalizarNombreUsuario();
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
        if (accesoLocalValido == null) {
            accesoLocalValido = Boolean.TRUE;
        }
        if (versionToken == null) {
            versionToken = 0;
        }
    }

    @PreUpdate
    private void prepararActualizacion() {
        normalizarNombreUsuario();
        fechaActualizacion = LocalDateTime.now();
    }

    private void normalizarNombreUsuario() {
        if (nombreUsuario != null) {
            nombreUsuario = nombreUsuario.toLowerCase(Locale.ROOT);
        }
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

    public String getNombreUsuario() {
        return nombreUsuario;
    }

    public void setNombreUsuario(String nombreUsuario) {
        this.nombreUsuario = nombreUsuario == null
                ? null : nombreUsuario.toLowerCase(Locale.ROOT);
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

    public Boolean getAccesoLocalValido() {
        return accesoLocalValido;
    }

    public void setAccesoLocalValido(Boolean accesoLocalValido) {
        this.accesoLocalValido = accesoLocalValido;
    }

    public LocalDate getFechaNacimiento() {
        return fechaNacimiento;
    }

    public void setFechaNacimiento(LocalDate fechaNacimiento) {
        this.fechaNacimiento = fechaNacimiento;
    }

    public String getGenero() {
        return genero;
    }

    public void setGenero(String genero) {
        this.genero = genero;
    }

    public String getPaisCodigo() {
        return paisCodigo;
    }

    public void setPaisCodigo(String paisCodigo) {
        this.paisCodigo = paisCodigo;
    }

    public String getEstadoRegion() {
        return estadoRegion;
    }

    public void setEstadoRegion(String estadoRegion) {
        this.estadoRegion = estadoRegion;
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
