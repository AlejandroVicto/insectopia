package com.insectopia.seeders;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.insectopia.repository.RolRepository;
import com.insectopia.repository.UsuarioRepository;

@Component
@Profile("demo")
public class DatabaseSeeder implements CommandLineRunner {

    private final RolRepository rolRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate transactionTemplate;

    public DatabaseSeeder(
            RolRepository rolRepository,
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            TransactionTemplate transactionTemplate) {

        this.rolRepository = rolRepository;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    public void run(String... args) {

        System.out.println("[DEMO] Iniciando DatabaseSeeder...");

        transactionTemplate.executeWithoutResult(status -> {

            verificarRoles();

            // Actividad 034:
            // crearUsuariosSiNoExisten();

            // Actividad 035:
            // crearPublicacionesComentariosYReacciones();

            // Actividad 036:
            // crearConversacionesYMensajes();

            // Actividad 037:
            // crearEventosYParticipantes();

            // Actividad 038:
            // crearSeguidoresNotificacionesYReportes();
        });

        System.out.println("[DEMO] DatabaseSeeder finalizado.");
    }

    private void verificarRoles() {

        String[] roles = {
            "ADMINISTRADOR",
            "MODERADOR",
            "USUARIO"
        };

        for (String nombre : roles) {

            if (rolRepository.findByNombre(nombre).isEmpty()) {
                throw new IllegalStateException(
                    "No existe el rol requerido: " + nombre
                );
            }
        }

        System.out.println("[DEMO] Los tres roles están disponibles.");
    }
}
