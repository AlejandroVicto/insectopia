package com.insectopia.services;

import static org.mockito.Mockito.when;

import java.util.List;

/** Responses from the provider's documented shape, used only by isolated tests. */
public final class CountriesNowFixtures {
    private CountriesNowFixtures() { }

    public static void stub(CountriesNowClient provider) {
        when(provider.countries()).thenReturn(List.of(
                new CountriesNowClient.IsoCountry("Mexico", "MX"),
                new CountriesNowClient.IsoCountry("Argentina", "AR")));
        when(provider.states()).thenReturn(List.of(
                new CountriesNowClient.CountryStates("MX", List.of("Oaxaca", "Mexico City")),
                new CountriesNowClient.CountryStates("AR", List.of("Córdoba"))));
    }
}
