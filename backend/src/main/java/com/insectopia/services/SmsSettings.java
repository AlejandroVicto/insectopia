package com.insectopia.services;

import java.util.regex.Pattern;
import java.util.Arrays;
import java.util.Set;

/** Solo se envía al teléfono del perfil si pertenece a la lista autorizada. */
public record SmsSettings(boolean enabled, String accountSid, String authToken, String from,
        Set<String> allowedRecipients) {
    private static final Pattern E164 = Pattern.compile("\\+[1-9][0-9]{1,14}");

    public SmsSettings {
        allowedRecipients = allowedRecipients == null ? Set.of() : Set.copyOf(allowedRecipients);
        if (allowedRecipients.stream().anyMatch(number -> !e164(number))) {
            throw new IllegalStateException("Lista de destinatarios SMS inválida");
        }
        if (enabled && (accountSid == null || !accountSid.matches("AC[0-9a-fA-F]{32}")
                || authToken == null || authToken.isBlank()
                || !e164(from) || allowedRecipients.isEmpty())) {
            throw new IllegalStateException("Configuración SMS incompleta o inválida");
        }
    }

    public SmsSettings(boolean enabled, String accountSid, String authToken, String from, String recipientsCsv) {
        this(enabled, accountSid, authToken, from, parseRecipients(recipientsCsv));
    }

    private static Set<String> parseRecipients(String csv) {
        if (csv == null || csv.isBlank()) return Set.of();
        var numbers = Arrays.stream(csv.split(",", -1)).map(String::trim).toList();
        if (numbers.stream().anyMatch(number -> !e164(number))) {
            throw new IllegalStateException("Lista de destinatarios SMS inválida");
        }
        return Set.copyOf(numbers);
    }

    public static boolean e164(String number) {
        return number != null && E164.matcher(number).matches();
    }

    @Override public String toString() { return "SmsSettings[redacted]"; }
}
