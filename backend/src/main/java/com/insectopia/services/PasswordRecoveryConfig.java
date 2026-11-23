package com.insectopia.services;

import java.time.Clock;

import org.apache.catalina.valves.RemoteIpValve;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Reloj UTC inyectable y configuración explícita de proxy de confianza. */
@Configuration
public class PasswordRecoveryConfig {

    @Bean
    public Clock passwordRecoveryClock() {
        return Clock.systemUTC();
    }

    /**
     * X-Forwarded-For se ignora por defecto. Sólo se activa con TRUST_FORWARDED_HEADERS=true
     * y una lista explícita de IPs de Nginx; así un cliente no puede falsificar su origen.
     */
    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> passwordRecoveryProxyCustomizer(
            @Value("${app.tomcat.trust-forwarded-headers:false}") boolean confiarEnProxy,
            @Value("${app.tomcat.trusted-proxies:127\\.0\\.0\\.1|::1}") String proxiesDeConfianza) {
        return fabrica -> {
            if (!confiarEnProxy) {
                return;
            }
            RemoteIpValve valve = new RemoteIpValve();
            valve.setRemoteIpHeader("X-Forwarded-For");
            valve.setProtocolHeader("X-Forwarded-Proto");
            valve.setTrustedProxies(proxiesDeConfianza);
            fabrica.addEngineValves(valve);
        };
    }
}
