package com.insectopia.controllers;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.insectopia.services.ConfiguracionCuentaService;

@RestController
@RequestMapping("/api/usuarios")
public class AvatarUsuarioController {
    private final ConfiguracionCuentaService configuracion;
    public AvatarUsuarioController(ConfiguracionCuentaService configuracion) { this.configuracion = configuracion; }

    @GetMapping("/{id}/avatar")
    public ResponseEntity<Resource> leer(@PathVariable Long id) {
        var avatar = configuracion.leerAvatar(id);
        return ResponseEntity.ok().contentType(avatar.tipo()).cacheControl(CacheControl.noStore()).body(avatar.resource());
    }
}
