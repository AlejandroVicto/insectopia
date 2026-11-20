package com.insectopia.dtos;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class TelefonoValidator implements ConstraintValidator<TelefonoValido, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return true;
        long digits = value.chars().filter(Character::isDigit).count();
        return digits >= 7 && digits <= 15;
    }
}
