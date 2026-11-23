package com.insectopia.services;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.dtos.UsuarioPublicoDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Seguidor;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.models.ids.SeguidorId;
import com.insectopia.repository.SeguidorRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;

/** Actividad 076: seguidores, perfil público, seguir y dejar de seguir. */
@Service
public class SeguidorService {

    private static final int BUSQUEDA_MAX = 100;

    private final TransactionTemplate transacciones;
    private final UsuarioRepository usuarios;
    private final SeguidorRepository seguidores;
    private final NotificacionService notificaciones;

    public SeguidorService(
            TransactionTemplate transacciones,
            UsuarioRepository usuarios,
            SeguidorRepository seguidores,
            NotificacionService notificaciones) {
        this.transacciones = transacciones;
        this.usuarios = usuarios;
        this.seguidores = seguidores;
        this.notificaciones = notificaciones;
    }

    /** {@code creada} decide entre HTTP 201 y HTTP 200 (idempotente). */
    public record ResultadoSeguir(boolean creada) {
    }

    @Transactional(readOnly = true)
    public PaginaDTO<UsuarioPublicoDTO> listarSeguidores(
            int page, int size, String q, InsectopiaUserDetails principal) {
        Long idAutenticado = idAutenticado(principal);
        Page<Seguidor> pagina = seguidores.buscarSeguidores(
                idAutenticado, patronBusqueda(q), EstadoUsuario.ACTIVO,
                PageRequest.of(page, size));

        List<Long> ids = pagina.getContent().stream()
                .map(Seguidor::getSeguidor)
                .filter(Objects::nonNull)
                .map(Usuario::getIdUsuario)
                .filter(Objects::nonNull)
                .toList();
        Set<Long> siguiendo = ids.isEmpty()
                ? Set.of()
                : new HashSet<>(seguidores.findIdsSeguidos(idAutenticado, ids));
        Map<Long, Long> totalesSeguidores = ids.isEmpty()
                ? Map.of() : indice(seguidores.countSeguidoresPorUsuarios(ids));
        Map<Long, Long> totalesSeguidos = ids.isEmpty()
                ? Map.of() : indice(seguidores.countSeguidosPorUsuarios(ids));

        return PaginaDTO.from(pagina.map(relacion -> {
            Usuario seguidor = relacion.getSeguidor();
            Long idSeguidor = seguidor.getIdUsuario();
            return UsuarioPublicoDTO.from(
                    seguidor,
                    siguiendo.contains(idSeguidor),
                    totalesSeguidores.getOrDefault(idSeguidor, 0L),
                    totalesSeguidos.getOrDefault(idSeguidor, 0L));
        }));
    }

    @Transactional(readOnly = true)
    public UsuarioPublicoDTO perfilPublico(Long idObjetivo, InsectopiaUserDetails principal) {
        Long idAutenticado = idAutenticado(principal);
        validarId(idObjetivo);
        Usuario objetivo = usuarioActivo(idObjetivo);
        boolean loSigo = !idAutenticado.equals(idObjetivo)
                && seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(idAutenticado, idObjetivo);
        return UsuarioPublicoDTO.from(
                objetivo,
                loSigo,
                seguidores.countBySeguido_IdUsuario(idObjetivo),
                seguidores.countBySeguidor_IdUsuario(idObjetivo));
    }

    /**
     * Crea la relación sólo si no existe. El aviso NUEVO_SEGUIDOR se persiste en
     * la misma transacción; una colisión por clave compuesta se trata como
     * petición idempotente y nunca genera un segundo aviso.
     */
    public ResultadoSeguir seguir(Long idObjetivo, InsectopiaUserDetails principal) {
        Long idSeguidor = idAutenticado(principal);
        validarId(idObjetivo);
        if (idSeguidor.equals(idObjetivo)) {
            throw new RegistrationValidationException("id", "No puedes seguirte a ti mismo");
        }
        usuarioActivo(idObjetivo);

        if (seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(idSeguidor, idObjetivo)) {
            return new ResultadoSeguir(false);
        }

        try {
            return transacciones.execute(estado -> {
                if (seguidores.existsBySeguidor_IdUsuarioAndSeguido_IdUsuario(idSeguidor, idObjetivo)) {
                    return new ResultadoSeguir(false);
                }
                Usuario seguidor = usuarios.getReferenceById(idSeguidor);
                Usuario seguido = usuarios.getReferenceById(idObjetivo);

                Seguidor relacion = new Seguidor();
                relacion.setId(new SeguidorId(idSeguidor, idObjetivo));
                relacion.setSeguidor(seguidor);
                relacion.setSeguido(seguido);
                seguidores.saveAndFlush(relacion);
                notificaciones.porNuevoSeguidor(seguido, seguidor);
                return new ResultadoSeguir(true);
            });
        } catch (DataIntegrityViolationException conflicto) {
            // Otra petición insertó la misma clave compuesta; su transacción es la ganadora.
            return new ResultadoSeguir(false);
        }
    }

    /** Borra únicamente la relación del principal; repetirlo es inofensivo. */
    public void dejarSeguir(Long idObjetivo, InsectopiaUserDetails principal) {
        Long idSeguidor = idAutenticado(principal);
        validarId(idObjetivo);
        SeguidorId clave = new SeguidorId(idSeguidor, idObjetivo);
        transacciones.executeWithoutResult(estado -> seguidores.deleteById(clave));
    }

    private Long idAutenticado(InsectopiaUserDetails principal) {
        if (principal == null || principal.idUsuario() == null) {
            throw new AuthenticationCredentialsNotFoundException("Autenticación requerida");
        }
        return principal.idUsuario();
    }

    private static void validarId(Long id) {
        if (id == null || id <= 0) {
            throw new RegistrationValidationException("id", "El usuario debe ser válido");
        }
    }

    private Usuario usuarioActivo(Long id) {
        Usuario usuario = usuarios.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("usuario", id));
        if (usuario.getEstado() != EstadoUsuario.ACTIVO) {
            throw new ResourceNotFoundException("usuario", id);
        }
        return usuario;
    }

    private static String patronBusqueda(String q) {
        if (q == null || q.isBlank()) {
            return null;
        }
        String texto = q.trim();
        if (texto.length() > BUSQUEDA_MAX) {
            texto = texto.substring(0, BUSQUEDA_MAX);
        }
        return "%" + texto.toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_") + "%";
    }

    private static Map<Long, Long> indice(List<Object[]> filas) {
        Map<Long, Long> resultado = new HashMap<>();
        for (Object[] fila : filas) {
            if (fila.length == 2 && fila[0] instanceof Number id && fila[1] instanceof Number total) {
                resultado.put(id.longValue(), total.longValue());
            }
        }
        return resultado;
    }
}
