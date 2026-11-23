package com.insectopia.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AlmacenamientoEventosConfig {
    @Bean("imagenesEventos")
    AlmacenamientoImagenesService imagenesEventos(
            @Value("${app.storage.eventos.path:./uploads/eventos}") String ruta) {
        return new AlmacenamientoImagenesService(ruta);
    }
}
