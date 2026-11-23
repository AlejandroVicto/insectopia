package com.insectopia.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AlmacenamientoAvataresConfig {
    @Bean("imagenesAvatares")
    AlmacenamientoImagenesService imagenesAvatares(
            @Value("${app.storage.avatares.path:./uploads/avatares}") String ruta) {
        return new AlmacenamientoImagenesService(ruta);
    }
}
