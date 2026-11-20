package com.insectopia.controllers;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.insectopia.repository.TokenRevocadoRepository;
import com.insectopia.security.CustomUserDetailsService;
import com.insectopia.security.JwtAuthenticationFilter;
import com.insectopia.security.JwtService;
import com.insectopia.security.SecurityConfig;
import com.insectopia.services.CatalogoUbicacionesService;
import com.insectopia.services.CountriesNowClient;
import com.insectopia.services.CountriesNowClient.CountryStates;
import com.insectopia.services.CountriesNowClient.IsoCountry;

@WebMvcTest(CatalogosController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CatalogoUbicacionesService.class})
class CatalogoUbicacionesMvcTests {
    @Autowired MockMvc mvc;
    @MockitoBean CountriesNowClient provider;
    @MockitoBean JwtService jwt;
    @MockitoBean CustomUserDetailsService users;
    @MockitoBean TokenRevocadoRepository revoked;

    @Test void paisesYRegionesPublicosRespetanFiltradoYSeguridad() throws Exception {
        when(provider.countries()).thenReturn(List.of(new IsoCountry("Mexico", "MX"),
                new IsoCountry("Argentina", "AR"), new IsoCountry("United States", "US"),
                new IsoCountry("Andorra", "AD")));
        when(provider.states()).thenReturn(List.of(new CountryStates("MX", List.of("Oaxaca")),
                new CountryStates("AR", List.of("Córdoba", "Buenos Aires")),
                new CountryStates("US", List.of("Texas")), new CountryStates("AD", List.of())));

        mvc.perform(get("/api/catalogos/paises")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].nombre").value("Argentina"))
                .andExpect(jsonPath("$[1].nombre").value("Estados Unidos"))
                .andExpect(jsonPath("$[2].nombre").value("México"));
        mvc.perform(get("/api/catalogos/paises/AR/regiones")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nombre").value("Córdoba"));
        mvc.perform(get("/api/catalogos/paises/MX/regiones")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/catalogos/paises/AD/regiones")).andExpect(status().isNotFound());
        mvc.perform(post("/api/catalogos/paises")).andExpect(status().isUnauthorized());
    }
}
