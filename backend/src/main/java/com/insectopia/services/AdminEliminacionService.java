package com.insectopia.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.security.ProtectedAccounts;

@Service
public class AdminEliminacionService {
    private static final Logger log = LoggerFactory.getLogger(AdminEliminacionService.class);
    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final JdbcTemplate jdbc;
    private final LimpiezaArchivosCuentaService archivos;

    public AdminEliminacionService(UsuarioRepository usuarios, RolRepository roles, JdbcTemplate jdbc,
            LimpiezaArchivosCuentaService archivos) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.jdbc = jdbc;
        this.archivos = archivos;
    }

    @Transactional
    public void eliminar(Long id, InsectopiaUserDetails admin) {
        if (admin == null || !"ADMINISTRADOR".equals(admin.role()) || admin.getAuthorities().stream()
                .noneMatch(a -> Permissions.MODULO_ADMINISTRAR.equals(a.getAuthority()))
                || admin.getAuthorities().stream().noneMatch(a -> Permissions.USUARIO_GESTIONAR.equals(a.getAuthority()))) {
            throw new AccessDeniedException("Acceso denegado");
        }
        // Misma disciplina de bloqueo que cambio de rol y desactivación.
        roles.bloquearAdministrador().orElseThrow(() -> new IllegalStateException("Falta el rol ADMINISTRADOR"));
        Usuario objetivo = usuarios.bloquearPorId(id).orElseThrow(() -> new ResourceNotFoundException("usuario", id));
        if (id.equals(admin.idUsuario())) throw new BusinessRuleException("No se puede eliminar la propia cuenta.");
        if (ProtectedAccounts.EVALUATION_ADMIN_USERNAME.equals(objetivo.getNombreUsuario())) {
            throw new BusinessRuleException("La cuenta de evaluación está protegida.");
        }
        if ("ADMINISTRADOR".equals(objetivo.getRol().getNombre()) && objetivo.getEstado() == EstadoUsuario.ACTIVO
                && usuarios.countByRol_NombreAndEstado("ADMINISTRADOR", EstadoUsuario.ACTIVO) <= 1) {
            throw new BusinessRuleException("No se puede eliminar al último administrador activo.");
        }

        // Archivos sólo después del commit: las rutas quedan en la cola durable si el borrado falla.
        jdbc.queryForList("SELECT imagen FROM publicaciones WHERE id_usuario = ? AND imagen IS NOT NULL", String.class, id)
                .forEach(nombre -> archivos.registrar("publicacion", nombre));
        jdbc.queryForList("SELECT imagen FROM eventos WHERE id_proponente = ? AND imagen IS NOT NULL", String.class, id)
                .forEach(nombre -> archivos.registrar("evento", nombre));
        archivos.registrarAvatar(objetivo);

        // Redactar contenido personal histórico, manteniendo reportes y eventos de terceros.
        jdbc.update("UPDATE reportes SET descripcion = NULL, resolucion = NULL WHERE id_reportante = ? OR id_publicacion IN (SELECT id_publicacion FROM publicaciones WHERE id_usuario = ?)", id, id);
        jdbc.update("UPDATE reportes SET resolucion = NULL WHERE id_moderador = ?", id);
        jdbc.update("UPDATE eventos SET titulo = 'Evento de cuenta eliminada', descripcion = 'Contenido retirado', ubicacion = 'No disponible', imagen = NULL, motivo_resolucion = NULL WHERE id_proponente = ?", id);
        jdbc.update("UPDATE eventos SET motivo_resolucion = NULL WHERE id_moderador = ?", id);
        jdbc.update("UPDATE notificaciones SET contenido = 'Cuenta eliminada' WHERE id_actor = ? OR id_publicacion IN (SELECT id_publicacion FROM publicaciones WHERE id_usuario = ?) OR id_mensaje IN (SELECT id_mensaje FROM mensajes WHERE id_remitente = ?)", id, id, id);

        jdbc.update("DELETE FROM comentarios WHERE id_usuario = ?", id);
        jdbc.update("DELETE FROM reacciones WHERE id_usuario = ?", id);
        // Comentarios/reacciones ajenos y reportes permanecen con publicación NULL (V12).
        jdbc.update("DELETE FROM publicaciones WHERE id_usuario = ?", id);
        jdbc.update("DELETE FROM seguidores WHERE id_seguidor = ? OR id_seguido = ?", id, id);
        jdbc.update("DELETE FROM participantes_evento WHERE id_usuario = ?", id);
        jdbc.update("DELETE FROM notificaciones WHERE id_destinatario = ?", id);

        // Los mensajes escritos por terceros se preservan. Se borra el ID del usuario de la clave directa.
        jdbc.update("UPDATE conversaciones SET clave_directa = CONCAT('archivada:', id_conversacion) WHERE id_conversacion IN (SELECT id_conversacion FROM participantes_conversacion WHERE id_usuario = ?)", id);
        jdbc.update("DELETE FROM mensajes WHERE id_remitente = ?", id);
        jdbc.update("DELETE FROM participantes_conversacion WHERE id_usuario = ?", id);
        jdbc.update("DELETE FROM usuarios WHERE id_usuario = ?", id);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                log.info("Eliminación administrativa irreversible confirmada por administrador {}", admin.idUsuario());
            }
        });
    }
}
