package com.insectopia.services;

/** Borde de red; sustituible por un mock sin abrir conexiones en las pruebas. */
public interface SmsGateway {
    String enviar(String to, String from, String body);
}
