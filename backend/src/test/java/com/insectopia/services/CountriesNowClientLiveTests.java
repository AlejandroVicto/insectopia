package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

/** Opt-in smoke test; never makes a network call during the regular test suite. */
@EnabledIfSystemProperty(named = "countriesnow.live", matches = "true")
class CountriesNowClientLiveTests {
    @Test void proveedorRespondeConCodigosYSubdivisionesReales() {
        var catalogo = new CatalogoUbicacionesService(new CountriesNowClient());
        assertTrue(catalogo.paises().stream().anyMatch(p -> p.codigo().equals("AR")));
        assertTrue(catalogo.paises().stream().anyMatch(p -> p.codigo().equals("US")));
        assertEquals("Estados Unidos", catalogo.paises().stream()
                .filter(p -> p.codigo().equals("US")).findFirst().orElseThrow().nombre());
        assertEquals(32, catalogo.regiones("MX").size());
        assertTrue(catalogo.regiones("AR").size() >= 24);
        assertTrue(catalogo.regiones("US").size() >= 50);
        assertEquals("Oaxaca", catalogo.validarRegion("MX", "oaxaca"));
    }
}
