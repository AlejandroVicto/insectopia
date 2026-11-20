package com.insectopia.services;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.JsonNode;

/** Fixed, server-side HTTPS integration. Never constructs a provider URL from client input. */
@Component
public class CountriesNowClient {
    public record IsoCountry(String name, String iso2) { }
    public record CountryStates(String iso2, List<String> states) { }

    private final RestClient client;

    public CountriesNowClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(2));
        factory.setReadTimeout(Duration.ofSeconds(3));
        this.client = RestClient.builder()
                .baseUrl("https://countriesnow.space/api/v0.1")
                .requestFactory(factory)
                .build();
    }

    public List<IsoCountry> countries() {
        return parseCountries(client.get().uri("/countries/iso").retrieve().body(JsonNode.class));
    }

    public List<CountryStates> states() {
        return parseStates(client.get().uri("/countries/states").retrieve().body(JsonNode.class));
    }

    static List<IsoCountry> parseCountries(JsonNode response) {
        JsonNode data = data(response);
        List<IsoCountry> countries = new ArrayList<>();
        for (JsonNode item : data) {
            String name = item.path("name").asText("").trim();
            String iso2 = item.path("Iso2").asText("").trim();
            if (name.isEmpty() || !iso2.matches("[A-Z]{2}")) {
                throw new IllegalStateException("Respuesta de países inválida");
            }
            countries.add(new IsoCountry(name, iso2));
        }
        return List.copyOf(countries);
    }

    static List<CountryStates> parseStates(JsonNode response) {
        JsonNode data = data(response);
        List<CountryStates> countries = new ArrayList<>();
        for (JsonNode item : data) {
            String iso2 = item.path("iso2").asText("").trim();
            JsonNode states = item.path("states");
            if (!iso2.matches("[A-Z]{2}") || !states.isArray()) {
                throw new IllegalStateException("Respuesta de regiones inválida");
            }
            List<String> names = new ArrayList<>();
            for (JsonNode state : states) {
                String name = state.path("name").asText("").trim();
                if (name.isEmpty() || name.length() > 100) {
                    throw new IllegalStateException("Respuesta de regiones inválida");
                }
                names.add(name);
            }
            countries.add(new CountryStates(iso2, List.copyOf(names)));
        }
        return List.copyOf(countries);
    }

    private static JsonNode data(JsonNode response) {
        if (response == null || !response.path("error").isBoolean()
                || response.path("error").asBoolean() || !response.path("data").isArray()
                || response.path("data").isEmpty()) {
            throw new IllegalStateException("Respuesta del proveedor inválida");
        }
        return response.path("data");
    }
}
