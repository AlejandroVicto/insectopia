package com.insectopia.dtos;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = TelefonoValidator.class)
public @interface TelefonoValido {
    String message() default "El teléfono debe contener entre 7 y 15 dígitos.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
