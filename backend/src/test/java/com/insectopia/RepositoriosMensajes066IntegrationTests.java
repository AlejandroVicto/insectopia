package com.insectopia;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import com.insectopia.models.Conversacion;
import com.insectopia.models.Mensaje;
import com.insectopia.models.ParticipanteConversacion;
import com.insectopia.models.Rol;
import com.insectopia.models.Seguidor;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.models.ids.ParticipanteConversacionId;
import com.insectopia.models.ids.SeguidorId;
import com.insectopia.repository.ConversacionRepository;
import com.insectopia.repository.MensajeRepository;
import com.insectopia.repository.ParticipanteConversacionRepository;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.SeguidorRepository;
import com.insectopia.repository.UsuarioRepository;

/** Consultas reales de 066 sobre MySQL; cada prueba se revierte al terminar. */
@SpringBootTest
@Transactional
class RepositoriosMensajes066IntegrationTests {

    @Autowired private UsuarioRepository usuarios;
    @Autowired private RolRepository roles;
    @Autowired private SeguidorRepository seguidores;
    @Autowired private ConversacionRepository conversaciones;
    @Autowired private ParticipanteConversacionRepository participantes;
    @Autowired private MensajeRepository mensajes;

    @Test
    void seguirNoEsLoMismoQueSerSeguidoYFiltroSeAplicaAntesDePaginar() {
        String sufijo = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        Usuario yo = guardarUsuario("yo", sufijo);
        Usuario seguido = guardarUsuario("ana", sufijo);
        Usuario tercero = guardarUsuario("bruno", sufijo);
        guardarRelacion(seguido, yo); // «seguido» me sigue a mí: no debe aparecer.
        guardarRelacion(yo, seguido);
        guardarRelacion(yo, tercero);

        Page<Seguidor> primera = seguidores.buscarSeguidos(
                yo.getIdUsuario(), null, EstadoUsuario.ACTIVO, PageRequest.of(0, 1));

        assertEquals(2, primera.getTotalElements());
        assertEquals(2, primera.getTotalPages());
        assertEquals(1, primera.getContent().size());
        assertFalse(primera.getContent().stream()
                .anyMatch(relacion -> yo.getIdUsuario().equals(relacion.getSeguido().getIdUsuario())));

        String busqueda = "%" + ("ana" + sufijo).toLowerCase(Locale.ROOT) + "%";
        Page<Seguidor> filtrada = seguidores.buscarSeguidos(
                yo.getIdUsuario(), busqueda, EstadoUsuario.ACTIVO, PageRequest.of(0, 20));

        assertEquals(1, filtrada.getTotalElements());
        assertEquals(seguido.getIdUsuario(),
                filtrada.getContent().getFirst().getSeguido().getIdUsuario());
    }

    @Test
    void ocultarNoBorraMensajesNiAfectaAlOtroParticipante() {
        String sufijo = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        Usuario yo = guardarUsuario("yo", sufijo);
        Usuario otro = guardarUsuario("otro", sufijo);
        Conversacion conversacion = new Conversacion();
        conversacion.setClaveDirecta("066-TEST-" + sufijo);
        conversacion.setFechaCreacion(LocalDateTime.now());
        conversaciones.saveAndFlush(conversacion);
        guardarParticipante(conversacion, yo, false);
        guardarParticipante(conversacion, otro, false);
        Mensaje mensaje = new Mensaje();
        mensaje.setConversacion(conversacion);
        mensaje.setRemitente(otro);
        mensaje.setContenido("[066-PRUEBA] historial preservado");
        mensaje.setFechaEnvio(LocalDateTime.now());
        mensajes.saveAndFlush(mensaje);

        List<Conversacion> directas = participantes.findDirectasPorParticipantes(
                yo.getIdUsuario(), otro.getIdUsuario(),
                List.of(yo.getIdUsuario(), otro.getIdUsuario()));
        assertEquals(1, directas.size());
        assertEquals(conversacion.getIdConversacion(), directas.getFirst().getIdConversacion());
        assertEquals(2, participantes.countByConversacion_IdConversacion(
                conversacion.getIdConversacion()));

        ParticipanteConversacion mia = participantes
                .findByConversacion_IdConversacionAndUsuario_IdUsuario(
                        conversacion.getIdConversacion(), yo.getIdUsuario())
                .orElseThrow();
        mia.setOculta(Boolean.TRUE);
        participantes.saveAndFlush(mia);

        ParticipanteConversacion ajena = participantes
                .findByConversacion_IdConversacionAndUsuario_IdUsuario(
                        conversacion.getIdConversacion(), otro.getIdUsuario())
                .orElseThrow();
        assertTrue(mia.getOculta());
        assertFalse(ajena.getOculta());
        assertEquals(1, mensajes.countByConversacion_IdConversacion(
                conversacion.getIdConversacion()));
        Page<ParticipanteConversacion> visibles = participantes
                .findByUsuario_IdUsuarioAndOcultaFalse(
                        yo.getIdUsuario(), PageRequest.of(0, 20));
        assertTrue(visibles.getContent().stream().noneMatch(fila -> conversacion.getIdConversacion()
                .equals(fila.getConversacion().getIdConversacion())));
    }

    private Usuario guardarUsuario(String prefijo, String sufijo) {
        Rol rol = roles.findByNombre("USUARIO").orElseThrow();
        Usuario usuario = new Usuario();
        usuario.setRol(rol);
        usuario.setNombre(prefijo.substring(0, 1).toUpperCase(Locale.ROOT)
                + prefijo.substring(1) + " " + sufijo);
        usuario.setNombreUsuario(prefijo + sufijo);
        usuario.setCorreo("066." + prefijo + "." + sufijo + "@example.invalid");
        usuario.setContrasena("hash");
        usuario.setFechaNacimiento(LocalDate.of(1990, 1, 1));
        usuario.setPaisCodigo("ES");
        usuario.setEstadoRegion("Madrid");
        usuario.setBiografia("Biografía pública " + prefijo);
        usuario.setEstado(EstadoUsuario.ACTIVO);
        Usuario guardado = usuarios.saveAndFlush(usuario);
        assertNotNull(guardado.getIdUsuario());
        return guardado;
    }

    private void guardarRelacion(Usuario seguidor, Usuario seguido) {
        Seguidor relacion = new Seguidor();
        relacion.setId(new SeguidorId(seguidor.getIdUsuario(), seguido.getIdUsuario()));
        relacion.setSeguidor(seguidor);
        relacion.setSeguido(seguido);
        seguidores.saveAndFlush(relacion);
    }

    private void guardarParticipante(Conversacion conversacion, Usuario usuario, boolean oculta) {
        ParticipanteConversacion participante = new ParticipanteConversacion();
        participante.setId(new ParticipanteConversacionId(
                conversacion.getIdConversacion(), usuario.getIdUsuario()));
        participante.setConversacion(conversacion);
        participante.setUsuario(usuario);
        participante.setFechaIngreso(LocalDateTime.now());
        participante.setOculta(oculta);
        participantes.saveAndFlush(participante);
    }
}
