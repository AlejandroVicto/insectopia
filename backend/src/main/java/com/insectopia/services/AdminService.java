package com.insectopia.services;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.insectopia.dtos.RegisterRequestDTO;
import com.insectopia.dtos.admin.AdminAuditoriaRolDTO;
import com.insectopia.dtos.admin.AdminEditarUsuarioRequestDTO;
import com.insectopia.dtos.admin.AdminResumenDTO;
import com.insectopia.dtos.admin.AdminRolDTO;
import com.insectopia.dtos.admin.AdminUsuarioResponseDTO;
import com.insectopia.dtos.publicaciones.PaginaDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.models.AuditoriaRol;
import com.insectopia.models.Rol;
import com.insectopia.models.Usuario;
import com.insectopia.models.enums.EstadoUsuario;
import com.insectopia.repository.AuditoriaRolRepository;
import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;
import com.insectopia.security.InsectopiaUserDetails;
import com.insectopia.security.Permissions;
import com.insectopia.security.ProtectedAccounts;

@Service
public class AdminService {
    private static final Logger log = LoggerFactory.getLogger(AdminService.class);
    private static final Set<String> ROLES = Set.of("USUARIO", "MODERADOR", "ADMINISTRADOR");
    private static final Set<String> ORDENES = Set.of("fechaRegistro", "nombre", "idUsuario");

    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final AuditoriaRolRepository auditoria;
    private final AuthService auth;
    private final CatalogoUbicacionesService catalogo;
    private final PasswordEncoder encoder;

    public AdminService(UsuarioRepository usuarios, RolRepository roles, AuditoriaRolRepository auditoria,
            AuthService auth, CatalogoUbicacionesService catalogo,
            PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.auditoria = auditoria;
        this.auth = auth;
        this.catalogo = catalogo;
        this.encoder = encoder;
    }

    @Transactional(readOnly = true)
    public PaginaDTO<AdminUsuarioResponseDTO> listar(String q, String rol, EstadoUsuario estado,
            int page, int size, String ordenar, String direccion, InsectopiaUserDetails admin) {
        exigir(admin, Permissions.USUARIO_GESTIONAR);
        if (rol != null && !ROLES.contains(rol)) throw new RegistrationValidationException("rol", "Rol no admitido.");
        if (!ORDENES.contains(ordenar) || !Set.of("asc", "desc").contains(direccion)) {
            throw new RegistrationValidationException("ordenar", "Orden o dirección no admitidos.");
        }
        String buscar = q == null ? "" : q.strip().toLowerCase(Locale.ROOT);
        if (buscar.length() > 100) throw new RegistrationValidationException("q", "La búsqueda es demasiado larga.");
        Specification<Usuario> filtros = (root, query, cb) -> {
            var condiciones = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (!buscar.isEmpty()) {
                String patron = "%" + buscar.replace("\\", "\\\\").replace("%", "\\%")
                        .replace("_", "\\_") + "%";
                condiciones.add(cb.or(cb.like(cb.lower(root.get("nombre")), patron, '\\'),
                        cb.like(cb.lower(root.get("nombreUsuario")), patron, '\\'),
                        cb.like(cb.lower(root.get("correo")), patron, '\\')));
            }
            if (rol != null) condiciones.add(cb.equal(root.join("rol").get("nombre"), rol));
            if (estado != null) condiciones.add(cb.equal(root.get("estado"), estado));
            return cb.and(condiciones.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        Sort.Direction dir = "asc".equals(direccion) ? Sort.Direction.ASC : Sort.Direction.DESC;
        // Id desempata las fechas/nombres iguales, evitando duplicados entre páginas.
        Sort sort = Sort.by(dir, ordenar).and(Sort.by(Sort.Direction.ASC, "idUsuario"));
        return PaginaDTO.from(usuarios.findAll(filtros, PageRequest.of(page, size, sort))
                .map(usuario -> AdminUsuarioResponseDTO.from(usuario, admin.idUsuario())));
    }

    @Transactional(readOnly = true)
    public AdminResumenDTO resumen(InsectopiaUserDetails admin) {
        exigir(admin, Permissions.USUARIO_GESTIONAR);
        return new AdminResumenDTO(usuarios.count(), usuarios.countByRol_Nombre("USUARIO"),
                usuarios.countByRol_Nombre("MODERADOR"), usuarios.countByRol_Nombre("ADMINISTRADOR"),
                usuarios.countByEstado(EstadoUsuario.DESACTIVADO));
    }

    @Transactional(readOnly = true)
    public AdminUsuarioResponseDTO detalle(Long id, InsectopiaUserDetails admin) {
        exigir(admin, Permissions.USUARIO_GESTIONAR);
        return AdminUsuarioResponseDTO.from(usuarios.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("usuario", id)), admin.idUsuario());
    }

    @Transactional
    public AdminUsuarioResponseDTO alta(RegisterRequestDTO datos, InsectopiaUserDetails admin) {
        exigir(admin, Permissions.USUARIO_GESTIONAR);
        Long id = auth.register(datos).idUsuario(); // Validaciones, catálogo, unicidad y BCrypt originales.
        auditarLog(admin.idUsuario(), id, "alta");
        return detalle(id, admin);
    }

    @Transactional
    public AdminUsuarioResponseDTO editar(Long id, AdminEditarUsuarioRequestDTO datos, InsectopiaUserDetails admin) {
        exigir(admin, Permissions.USUARIO_GESTIONAR);
        Usuario usuario = bloquear(id);
        proteger(usuario, admin);
        if (!usuario.getCorreo().equals(datos.correo()) && usuarios.existsByCorreo(datos.correo())) {
            throw AuthService.duplicate("correo");
        }
        if (!usuario.getNombreUsuario().equals(datos.nombreUsuario())
                && usuarios.existsByNombreUsuario(datos.nombreUsuario())) {
            throw AuthService.duplicate("nombreUsuario");
        }
        String region = catalogo.validarRegion(datos.paisCodigo(), datos.estadoRegion());
        if ((datos.recibirSms() || datos.recibirWhatsapp()) && datos.telefono() == null) {
            throw new RegistrationValidationException("telefono", "Se requiere un teléfono para recibir comunicaciones.");
        }
        boolean invalidar = !usuario.getCorreo().equals(datos.correo()) || datos.contrasena() != null;
        usuario.setNombre(datos.nombre());
        usuario.setNombreUsuario(datos.nombreUsuario());
        usuario.setCorreo(datos.correo());
        usuario.setFechaNacimiento(datos.fechaNacimiento());
        usuario.setGenero(datos.genero());
        usuario.setPaisCodigo(datos.paisCodigo());
        usuario.setEstadoRegion(region);
        usuario.setTelefono(datos.telefono());
        usuario.setRecibirSms(datos.recibirSms());
        usuario.setRecibirWhatsapp(datos.recibirWhatsapp());
        if (datos.contrasena() != null) usuario.setContrasena(encoder.encode(datos.contrasena()));
        if (invalidar) usuario.setVersionToken(usuario.getVersionToken() + 1);
        usuario = guardar(usuario);
        auditarLog(admin.idUsuario(), id, "edición");
        return AdminUsuarioResponseDTO.from(usuario, admin.idUsuario());
    }

    @Transactional
    public AdminUsuarioResponseDTO cambiarEstado(Long id, EstadoUsuario estado, InsectopiaUserDetails admin) {
        exigir(admin, Permissions.USUARIO_GESTIONAR);
        if (estado == EstadoUsuario.BLOQUEADO) {
            throw new BusinessRuleException("El bloqueo ya no está disponible; usa Eliminar cuenta con confirmación irreversible.");
        }
        // Siempre se bloquea primero el rol, luego el usuario: orden estable y sin carrera del último admin.
        bloquearRolAdmin();
        Usuario usuario = bloquear(id);
        proteger(usuario, admin);
        if (usuario.getEstado() == estado) return AdminUsuarioResponseDTO.from(usuario, admin.idUsuario());
        if ("ADMINISTRADOR".equals(usuario.getRol().getNombre()) && usuario.getEstado() == EstadoUsuario.ACTIVO
                && estado != EstadoUsuario.ACTIVO) verificarOtroAdministrador();
        usuario.setEstado(estado);
        usuario.setVersionToken(usuario.getVersionToken() + 1);
        usuario = guardar(usuario);
        auditarLog(admin.idUsuario(), id, "estado " + estado);
        return AdminUsuarioResponseDTO.from(usuario, admin.idUsuario());
    }

    @Transactional(readOnly = true)
    public List<AdminRolDTO> roles(InsectopiaUserDetails admin) {
        exigir(admin, Permissions.ROL_ASIGNAR);
        return roles.findAll().stream().filter(rol -> ROLES.contains(rol.getNombre()))
                .sorted(Comparator.comparing(Rol::getNombre)).map(AdminRolDTO::from).toList();
    }

    @Transactional
    public AdminUsuarioResponseDTO cambiarRol(Long id, String nombreRol, InsectopiaUserDetails admin) {
        exigir(admin, Permissions.ROL_ASIGNAR);
        Rol candado = bloquearRolAdmin();
        Usuario usuario = bloquear(id);
        proteger(usuario, admin);
        if (usuario.getEstado() != EstadoUsuario.ACTIVO) {
            throw new BusinessRuleException("Sólo se puede cambiar el rol de una cuenta activa.");
        }
        if (!ROLES.contains(nombreRol)) throw new ResourceNotFoundException("rol", nombreRol);
        Rol nuevo = "ADMINISTRADOR".equals(nombreRol) ? candado : roles.findByNombre(nombreRol)
                .orElseThrow(() -> new ResourceNotFoundException("rol", nombreRol));
        Rol anterior = usuario.getRol();
        if (anterior.getIdRol().equals(nuevo.getIdRol())) {
            return AdminUsuarioResponseDTO.from(usuario, admin.idUsuario());
        }
        if ("ADMINISTRADOR".equals(anterior.getNombre())) verificarOtroAdministrador();
        usuario.setRol(nuevo);
        usuario.setVersionToken(usuario.getVersionToken() + 1);
        usuario = guardar(usuario);
        AuditoriaRol registro = new AuditoriaRol();
        registro.setAdministrador(usuarios.getReferenceById(admin.idUsuario()));
        registro.setUsuario(usuario);
        registro.setRolAnterior(anterior);
        registro.setRolNuevo(nuevo);
        auditoria.saveAndFlush(registro); // En la misma transacción que usuario y versión.
        auditarLog(admin.idUsuario(), id, "rol " + anterior.getNombre() + " -> " + nombreRol);
        return AdminUsuarioResponseDTO.from(usuario, admin.idUsuario());
    }

    @Transactional(readOnly = true)
    public PaginaDTO<AdminAuditoriaRolDTO> historial(Long id, int page, int size, InsectopiaUserDetails admin) {
        exigir(admin, Permissions.ROL_ASIGNAR);
        if (!usuarios.existsById(id)) throw new ResourceNotFoundException("usuario", id);
        return PaginaDTO.from(auditoria.findByUsuario_IdUsuarioOrderByFechaCambioDesc(id,
                PageRequest.of(page, size)).map(AdminAuditoriaRolDTO::from));
    }

    private void exigir(InsectopiaUserDetails admin, String autoridad) {
        if (admin == null || !"ADMINISTRADOR".equals(admin.role()) || admin.getAuthorities().stream()
                .noneMatch(a -> Permissions.MODULO_ADMINISTRAR.equals(a.getAuthority()))
                || admin.getAuthorities().stream().noneMatch(a -> autoridad.equals(a.getAuthority()))) {
            throw new AccessDeniedException("Acceso denegado");
        }
    }

    private Usuario bloquear(Long id) {
        return usuarios.bloquearPorId(id).orElseThrow(() -> new ResourceNotFoundException("usuario", id));
    }

    private Rol bloquearRolAdmin() {
        return roles.bloquearAdministrador().orElseThrow(() -> new IllegalStateException("Falta el rol ADMINISTRADOR"));
    }

    private void proteger(Usuario usuario, InsectopiaUserDetails admin) {
        if (usuario.getIdUsuario().equals(admin.idUsuario())) {
            throw new BusinessRuleException("No se puede gestionar la propia cuenta desde administración.");
        }
        if (ProtectedAccounts.EVALUATION_ADMIN_USERNAME.equals(usuario.getNombreUsuario())) {
            throw new BusinessRuleException("La cuenta de evaluación está protegida.");
        }
    }

    private void verificarOtroAdministrador() {
        if (usuarios.countByRol_NombreAndEstado("ADMINISTRADOR", EstadoUsuario.ACTIVO) <= 1) {
            throw new BusinessRuleException("No se puede retirar al último administrador activo.");
        }
    }

    private Usuario guardar(Usuario usuario) {
        try {
            return usuarios.saveAndFlush(usuario);
        } catch (DataIntegrityViolationException exception) {
            DuplicateResourceException duplicate = AuthService.uniqueConflict(exception);
            if (duplicate != null) throw duplicate;
            throw exception;
        }
    }

    private void auditarLog(Long administrador, Long usuario, String accion) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                log.info("Acción administrativa {} sobre usuario {} por administrador {}", accion, usuario, administrador);
            }
        });
    }
}
