package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;

import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.exceptions.CatalogoNoDisponibleException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.services.CountriesNowClient.CountryStates;
import com.insectopia.services.CountriesNowClient.IsoCountry;

class CatalogoUbicacionesServiceTests {
    private final CountriesNowClient provider = mock(CountriesNowClient.class);
    private final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-11-19T00:00:00Z"));
    private final Clock clock = mock(Clock.class);
    private final CatalogoUbicacionesService catalogo;

    CatalogoUbicacionesServiceTests() {
        when(clock.instant()).thenAnswer(invocation -> now.get());
        catalogo = new CatalogoUbicacionesService(provider, clock);
    }

    private void providerValido() {
        doReturn(List.of(
                new IsoCountry("Mexico", "MX"), new IsoCountry("Argentina", "AR"),
                new IsoCountry("United States", "US"), new IsoCountry("Andorra", "AD")))
                .when(provider).countries();
        doReturn(List.of(
                new CountryStates("MX", List.of("Oaxaca", "Mexico City")),
                new CountryStates("AR", List.of("Buenos Aires", "Córdoba")),
                new CountryStates("US", List.of("California", "Texas")),
                new CountryStates("AD", List.of())))
                .when(provider).states();
    }

    @Test void sinInstantaneaNoAceptaUbicacionesNiConsultaMasDeUnaVezPorMinuto() {
        assertThrows(CatalogoNoDisponibleException.class, catalogo::paises);
        assertThrows(CatalogoNoDisponibleException.class, () -> catalogo.validarRegion("MX", "Oaxaca"));
        assertThrows(CatalogoNoDisponibleException.class, () -> catalogo.regiones("MX"));
        verify(provider, times(1)).countries();
    }

    @Test void mexicoUsaNombresDelProveedorYNormaliza() {
        providerValido();
        assertEquals(2, catalogo.regiones("MX").size());
        assertEquals(2, catalogo.regiones("mx").stream().distinct().count());
        assertEquals("Oaxaca", catalogo.validarRegion("MX", "oaxaca"));
        assertEquals("Mexico City", catalogo.validarRegion("MX", "mexico city"));
    }

    @Test void estadosPorPaisYLocalizacionSoloCuandoHaySubdivisiones() {
        providerValido();
        assertEquals(3, catalogo.paises().size());
        assertEquals("México", catalogo.paises().stream().filter(p -> p.codigo().equals("MX")).findFirst().orElseThrow().nombre());
        assertEquals("Estados Unidos", catalogo.paises().stream().filter(p -> p.codigo().equals("US")).findFirst().orElseThrow().nombre());
        assertEquals("Argentina", catalogo.paises().stream().filter(p -> p.codigo().equals("AR")).findFirst().orElseThrow().nombre());
        assertEquals("Córdoba", catalogo.validarRegion("AR", "córdoba"));
        assertEquals("Texas", catalogo.validarRegion("US", "texas"));
        assertEquals(2, catalogo.regiones("MX").size());
        assertThrows(ResourceNotFoundException.class, () -> catalogo.regiones("AD"));
        assertEquals("paisCodigo", assertThrows(RegistrationValidationException.class,
                () -> catalogo.validarRegion("AD", "Cualquiera")).getField());
        verify(provider, times(1)).countries();
        verify(provider, times(1)).states();
    }

    @Test void paisInexistenteYRegionIncompatibleNoSeAceptan() {
        providerValido();
        assertThrows(ResourceNotFoundException.class, () -> catalogo.regiones("ZZ"));
        assertThrows(ResourceNotFoundException.class, () -> catalogo.regiones("../../../foo"));
        assertEquals("paisCodigo", assertThrows(RegistrationValidationException.class,
                () -> catalogo.validarRegion("ES", "Oaxaca")).getField());
        assertEquals("estadoRegion", assertThrows(RegistrationValidationException.class,
                () -> catalogo.validarRegion("MX", "Madrid")).getField());
        assertEquals("estadoRegion", assertThrows(RegistrationValidationException.class,
                () -> catalogo.validarRegion("AR", "Oaxaca")).getField());
    }

    @Test void conservaUltimaInstantaneaSiFallaProveedorYReintentaLuego() {
        providerValido();
        assertEquals(3, catalogo.paises().size());
        now.set(now.get().plus(Duration.ofHours(25)));
        when(provider.countries()).thenThrow(new IllegalStateException("sin servicio"));
        assertEquals("Córdoba", catalogo.validarRegion("AR", "Córdoba"));
        assertEquals(3, catalogo.paises().size());
        verify(provider, times(2)).countries();
        now.set(now.get().plus(Duration.ofMinutes(2)));
        providerValido();
        assertEquals(3, catalogo.paises().size());
        verify(provider, times(3)).countries();
    }

    @Test void respuestaInvalidaNoReemplazaInstantaneaValida() {
        providerValido();
        assertEquals(3, catalogo.paises().size());
        now.set(now.get().plus(Duration.ofHours(25)));
        when(provider.states()).thenReturn(List.of(new CountryStates("AR", List.of("Pueblo", "pueblo"))));
        assertEquals("Buenos Aires", catalogo.validarRegion("AR", "Buenos Aires"));
    }
}
