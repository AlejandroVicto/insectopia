package com.insectopia.exceptions;

public class ResourceNotFoundException extends RuntimeException {

	public ResourceNotFoundException(String message) {
		super(message);
	}

	public ResourceNotFoundException(String resource, Object identifier) {
		super("No se encontró " + resource + " con identificador " + identifier);
	}
}
