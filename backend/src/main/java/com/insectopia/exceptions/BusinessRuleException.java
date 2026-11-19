package com.insectopia.exceptions;

/**
 * Excepción para reglas de negocio cuyo mensaje es seguro para mostrar al cliente.
 */
public class BusinessRuleException extends RuntimeException {

	public BusinessRuleException(String message) {
		super(message);
	}
}
