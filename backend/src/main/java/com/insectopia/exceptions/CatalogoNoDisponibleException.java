package com.insectopia.exceptions;

/** No verified snapshot exists yet; never accept unverified locations. */
public class CatalogoNoDisponibleException extends RuntimeException {
    public CatalogoNoDisponibleException() {
        super("El catálogo de ubicaciones no está disponible en este momento.");
    }
}
