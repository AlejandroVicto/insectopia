package com.insectopia.services;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.core5.util.Timeout;

import com.twilio.http.NetworkHttpClient;
import com.twilio.http.TwilioRestClient;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;

@Configuration
public class SmsConfig {
    @Bean
    ThreadPoolTaskScheduler smsTaskScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("sms-demo-");
        return scheduler;
    }

    @Bean
    SmsSettings smsSettings(@Value("${app.sms.enabled:false}") boolean enabled,
            @Value("${app.sms.account-sid:}") String sid,
            @Value("${app.sms.auth-token:}") String token,
            @Value("${app.sms.from:}") String from,
            @Value("${app.sms.allowed-recipients:}") String allowedRecipients) {
        return new SmsSettings(enabled, sid, token, from, allowedRecipients);
    }

    @Bean
    SmsGateway smsGateway(SmsSettings settings, @Value("${TWILIO_SMS_TRIAL_MODE:false}") boolean trialMode,
            @Value("${TWILIO_TRIAL_FROM_BY_RECIPIENT:}") String trialFromByRecipient) {
        if (!settings.enabled()) return (to, from, body) -> { throw new IllegalStateException("SMS deshabilitado"); };
        Map<String, String> trialSenders = trialMode ? trialSenders(trialFromByRecipient, settings) : Map.of();
        var timeout = RequestConfig.custom().setConnectTimeout(Timeout.ofSeconds(5))
                .setConnectionRequestTimeout(Timeout.ofSeconds(5))
                .setResponseTimeout(Timeout.ofSeconds(10)).build();
        TwilioRestClient client = new TwilioRestClient.Builder(settings.accountSid(), settings.authToken())
                .httpClient(new NetworkHttpClient(timeout)).build();
        return (to, from, body) -> {
            String sender = trialMode ? trialSenders.getOrDefault(to, from) : from;
            return Message.creator(new PhoneNumber(to), new PhoneNumber(sender),
                    trialMode ? "sms_event_notifications" : body).create(client).getSid();
        };
    }

    private static Map<String, String> trialSenders(String csv, SmsSettings settings) {
        if (csv == null || csv.isBlank()) return Map.of();
        Map<String, String> senders = new HashMap<>();
        for (String entry : csv.split(",", -1)) {
            String[] pair = entry.split("=", -1);
            if (pair.length != 2) throw new IllegalStateException("Remitentes Trial SMS inválidos");
            String to = pair[0].trim();
            String from = pair[1].trim();
            if (!SmsSettings.e164(to) || !SmsSettings.e164(from)
                    || !settings.allowedRecipients().contains(to) || senders.putIfAbsent(to, from) != null) {
                throw new IllegalStateException("Remitentes Trial SMS inválidos");
            }
        }
        return Map.copyOf(senders);
    }
}
