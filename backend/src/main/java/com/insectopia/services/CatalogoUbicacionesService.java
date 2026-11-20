package com.insectopia.services;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.text.Collator;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.insectopia.exceptions.CatalogoNoDisponibleException;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.exceptions.ResourceNotFoundException;

@Service
public class CatalogoUbicacionesService {
    public record Pais(String codigo, String nombre) { }
    public record Region(String nombre) { }
    private record Catalogo(List<Pais> paises, Map<String, List<Region>> regiones) { }

    private static final Logger log = LoggerFactory.getLogger(CatalogoUbicacionesService.class);
    private static final Duration FRESH_FOR = Duration.ofHours(24);
    private static final Duration RETRY_AFTER_FAILURE = Duration.ofMinutes(1);
    private static final Locale SPANISH = Locale.forLanguageTag("es");
    private static final Set<String> ISO_CODES = Set.copyOf(Arrays.asList(Locale.getISOCountries()));

    private final CountriesNowClient provider;
    private final Clock clock;
    private volatile Catalogo catalogo;
    private volatile Instant nextRefresh = Instant.EPOCH;

    @Autowired
    public CatalogoUbicacionesService(CountriesNowClient provider) {
        this(provider, Clock.systemUTC());
    }

    CatalogoUbicacionesService(CountriesNowClient provider, Clock clock) {
        this.provider = provider;
        this.clock = clock;
    }

    public List<Pais> paises() {
        return snapshot().paises();
    }

    public List<Region> regiones(String codigo) {
        // Validate before looking up the external catalogue: no arbitrary country codes or URL input.
        if (codigo == null || !codigo.toUpperCase(Locale.ROOT).matches("[A-Z]{2}")) {
            throw new ResourceNotFoundException("País", codigo);
        }
        List<Region> resultado = snapshot().regiones().get(codigo.toUpperCase(Locale.ROOT));
        if (resultado == null) {
            throw new ResourceNotFoundException("País", codigo);
        }
        return resultado;
    }

    public String validarRegion(String codigo, String nombre) {
        List<Region> disponibles = snapshot().regiones().get(codigo);
        if (disponibles == null) {
            throw new RegistrationValidationException("paisCodigo", "El país no está soportado o no tiene regiones verificadas.");
        }
        return disponibles.stream().map(Region::nombre)
                .filter(region -> region.equalsIgnoreCase(nombre))
                .findFirst().orElseThrow(() -> new RegistrationValidationException(
                        "estadoRegion", "La región no corresponde al país seleccionado."));
    }

    private Catalogo snapshot() {
        if (clock.instant().isBefore(nextRefresh)) return availableCatalogo();
        synchronized (this) {
            if (clock.instant().isBefore(nextRefresh)) return availableCatalogo();
            try {
                Catalogo fetched = loadProvider();
                catalogo = fetched; // Only publish complete, verified snapshots.
                nextRefresh = clock.instant().plus(FRESH_FOR);
            } catch (RuntimeException exception) {
                log.warn("CountriesNow no disponible; solo se usará un catálogo previamente verificado ({})",
                        exception.getClass().getSimpleName());
                nextRefresh = clock.instant().plus(RETRY_AFTER_FAILURE);
            }
            return availableCatalogo();
        }
    }

    private Catalogo availableCatalogo() {
        if (catalogo == null) throw new CatalogoNoDisponibleException();
        return catalogo;
    }

    private Catalogo loadProvider() {
        var countries = provider.countries();
        var subdivisions = provider.states();
        if (countries == null || subdivisions == null || countries.isEmpty() || subdivisions.isEmpty()) {
            throw new IllegalStateException("Catálogo del proveedor vacío");
        }

        Map<String, String> names = new HashMap<>();
        for (var country : countries) {
            if (!ISO_CODES.contains(country.iso2()) || names.putIfAbsent(country.iso2(), country.name()) != null) {
                throw new IllegalStateException("Códigos de país inválidos o duplicados");
            }
        }
        Map<String, List<Region>> locations = new HashMap<>();
        for (var country : subdivisions) {
            String code = country.iso2();
            if (code == null || country.states() == null || locations.containsKey(code)) {
                throw new IllegalStateException("Subdivisiones duplicadas o inválidas");
            }
            if (!names.containsKey(code) || country.states().isEmpty()) continue;
            Set<String> unique = new HashSet<>();
            List<Region> regions = new ArrayList<>();
            for (String name : country.states()) {
                if (name == null || name.isBlank() || name.length() > 100
                        || !unique.add(name.toLowerCase(Locale.ROOT))) {
                    throw new IllegalStateException("Región inválida o duplicada");
                }
                regions.add(new Region(name));
            }
            locations.put(code, List.copyOf(regions));
        }
        if (locations.size() < 2) {
            throw new IllegalStateException("Catálogo del proveedor incompleto");
        }
        Collator collator = Collator.getInstance(SPANISH);
        List<Pais> supported = locations.keySet().stream()
                .map(code -> new Pais(code, Locale.of("", code).getDisplayCountry(SPANISH)))
                .sorted(Comparator.comparing(Pais::nombre, collator))
                .toList();
        return new Catalogo(supported, Map.copyOf(locations));
    }
}
