package com.insectopia.services;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;

class CountriesNowClientTests {
    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test void transformaIso2YEstadosDeRespuestasReales() {
        var iso = mapper.readTree("""
                {"error":false,"msg":"ok","data":[{"name":"Mexico","Iso2":"MX","Iso3":"MEX"},
                {"name":"Argentina","Iso2":"AR","Iso3":"ARG"}]}
                """);
        var states = mapper.readTree("""
                {"error":false,"data":[{"name":"Mexico","iso2":"MX","states":
                [{"name":"Oaxaca","state_code":"OAX"},{"name":"Mexico City","state_code":"CMX"}]},
                {"name":"Andorra","iso2":"AD","states":[]}]}
                """);
        assertEquals("MX", CountriesNowClient.parseCountries(iso).getFirst().iso2());
        assertEquals("Oaxaca", CountriesNowClient.parseStates(states).getFirst().states().getFirst());
        assertTrue(CountriesNowClient.parseStates(states).get(1).states().isEmpty());
    }

    @Test void rechazaErrorProveedorYDatosMalformados() {
        for (String json : new String[] {
                "{\"error\":true,\"data\":[]}",
                "{\"error\":false,\"data\":null}",
                "{\"error\":false,\"data\":[{\"name\":\"Mexico\",\"Iso2\":\"MEX\"}]}"}) {
            assertThrows(IllegalStateException.class,
                    () -> CountriesNowClient.parseCountries(mapper.readTree(json)));
        }
        assertThrows(IllegalStateException.class, () -> CountriesNowClient.parseStates(mapper.readTree("""
                {"error":false,"data":[{"iso2":"AR","states":[{"name":""}]}]}
                """)));
    }
}
