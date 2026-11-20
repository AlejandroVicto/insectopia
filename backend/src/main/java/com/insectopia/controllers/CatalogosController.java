package com.insectopia.controllers;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.insectopia.services.CatalogoUbicacionesService;
import com.insectopia.services.CatalogoUbicacionesService.Pais;
import com.insectopia.services.CatalogoUbicacionesService.Region;

@RestController
@RequestMapping("/api/catalogos/paises")
public class CatalogosController {
    private final CatalogoUbicacionesService catalogo;

    public CatalogosController(CatalogoUbicacionesService catalogo) {
        this.catalogo = catalogo;
    }

    @GetMapping
    public List<Pais> paises() {
        return catalogo.paises();
    }

    @GetMapping("/{codigo}/regiones")
    public List<Region> regiones(@PathVariable String codigo) {
        return catalogo.regiones(codigo);
    }
}
