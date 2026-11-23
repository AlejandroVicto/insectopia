package com.insectopia.controllers;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BindException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.insectopia.dtos.ErrorResponseDTO;
import com.insectopia.dtos.ErrorResponseDTO.FieldErrorDTO;
import com.insectopia.dtos.TokenErrorResponseDTO;
import com.insectopia.exceptions.BusinessRuleException;
import com.insectopia.exceptions.ImagenInvalidaException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import com.insectopia.exceptions.CatalogoNoDisponibleException;
import com.insectopia.exceptions.DuplicateResourceException;
import com.insectopia.exceptions.EventoConflictoException;
import com.insectopia.exceptions.EventoValidacionException;
import com.insectopia.exceptions.ResourceNotFoundException;
import com.insectopia.exceptions.RegistrationValidationException;
import com.insectopia.exceptions.TokenRecuperacionException;

import jakarta.validation.ConstraintViolationException;
import tools.jackson.core.JacksonException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ImagenInvalidaException.class)
    public ResponseEntity<ErrorResponseDTO> handleImagen(ImagenInvalidaException exception, WebRequest request) {
        return build(exception.getStatus(), exception.getMessage(), path(request));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponseDTO> handleMaxUpload(MaxUploadSizeExceededException exception, WebRequest request) {
        return build(HttpStatus.CONTENT_TOO_LARGE, "La imagen supera el límite permitido", path(request));
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ErrorResponseDTO> handleMissingPart(MissingServletRequestPartException exception, WebRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Falta el archivo de imagen", path(request));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponseDTO> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException exception, WebRequest request) {
        return build(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "El archivo debe enviarse como multipart/form-data", path(request));
    }

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
	private static final HttpStatusCode UNPROCESSABLE_ENTITY = HttpStatusCode.valueOf(422);

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponseDTO> handleMethodArgumentNotValid(
			MethodArgumentNotValidException exception,
			WebRequest request) {
		return validationError(exception.getBindingResult(), request);
	}

	@ExceptionHandler(BindException.class)
	public ResponseEntity<ErrorResponseDTO> handleBindException(
			BindException exception,
			WebRequest request) {
		return validationError(exception.getBindingResult(), request);
	}

	@ExceptionHandler(ConstraintViolationException.class)
	public ResponseEntity<ErrorResponseDTO> handleConstraintViolation(
			ConstraintViolationException exception,
			WebRequest request) {
		List<FieldErrorDTO> details = exception.getConstraintViolations().stream()
				.map(violation -> new FieldErrorDTO(
						violation.getPropertyPath().toString(),
						violation.getMessage()))
				.toList();

		return build(
				HttpStatus.BAD_REQUEST,
				"Los datos enviados no son válidos",
				path(request),
				details);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponseDTO> handleHttpMessageNotReadable(
			HttpMessageNotReadableException exception,
			WebRequest request) {
		for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
			if (cause instanceof JacksonException jackson && jackson.getPath().stream()
					.anyMatch(ref -> "fechaNacimiento".equals(ref.getPropertyName()))) {
				return build(HttpStatus.BAD_REQUEST, "Los datos enviados no son válidos", path(request),
						List.of(new FieldErrorDTO("fechaNacimiento", "Ingresa una fecha válida (yyyy-MM-dd).")));
			}
		}
		return build(
				HttpStatus.BAD_REQUEST,
				"El cuerpo de la solicitud es inválido o no se pudo analizar",
				path(request));
	}

	@ExceptionHandler(MissingServletRequestParameterException.class)
	public ResponseEntity<ErrorResponseDTO> handleMissingParameter(
			MissingServletRequestParameterException exception,
			WebRequest request) {
		return build(
				HttpStatus.BAD_REQUEST,
				"Falta un parámetro obligatorio en la solicitud",
				path(request));
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ErrorResponseDTO> handleTypeMismatch(
			MethodArgumentTypeMismatchException exception,
			WebRequest request) {
		return build(
				HttpStatus.BAD_REQUEST,
				"Uno de los parámetros de la solicitud no tiene el formato esperado",
				path(request));
	}

	@ExceptionHandler(ResourceNotFoundException.class)
	public ResponseEntity<ErrorResponseDTO> handleResourceNotFound(
			ResourceNotFoundException exception,
			WebRequest request) {
		return build(
				HttpStatus.NOT_FOUND,
				"Recurso no encontrado",
				path(request));
	}

	@ExceptionHandler(CatalogoNoDisponibleException.class)
	public ResponseEntity<ErrorResponseDTO> handleCatalogoNoDisponible(
			CatalogoNoDisponibleException exception, WebRequest request) {
		return build(HttpStatus.SERVICE_UNAVAILABLE, exception.getMessage(), path(request));
	}

	@ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
	public ResponseEntity<ErrorResponseDTO> handleNoHandler(Exception exception, WebRequest request) {
		return build(
				HttpStatus.NOT_FOUND,
				"Recurso no encontrado",
				path(request));
	}

	@ExceptionHandler(DuplicateResourceException.class)
	public ResponseEntity<ErrorResponseDTO> handleDuplicate(
			DuplicateResourceException exception,
			WebRequest request) {
		if (exception.getField() != null) {
			return build(HttpStatus.CONFLICT, "El recurso ya existe", path(request),
					List.of(new FieldErrorDTO(exception.getField(), exception.getMessage())));
		}
		return build(HttpStatus.CONFLICT, "El recurso ya existe", path(request));
	}

	@ExceptionHandler(EventoConflictoException.class)
	public ResponseEntity<ErrorResponseDTO> handleEventoConflicto(EventoConflictoException exception, WebRequest request) {
		return build(HttpStatus.CONFLICT, exception.getMessage(), path(request));
	}

	@ExceptionHandler(EventoValidacionException.class)
	public ResponseEntity<ErrorResponseDTO> handleInvalidArgument(EventoValidacionException exception, WebRequest request) {
		return build(HttpStatus.BAD_REQUEST, exception.getMessage(), path(request));
	}

	/** Código explícito para el frontend 055; nunca describe la cuenta asociada. */
	@ExceptionHandler(TokenRecuperacionException.class)
	public ResponseEntity<TokenErrorResponseDTO> handleTokenRecuperacion(
			TokenRecuperacionException exception,
			WebRequest request) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(TokenErrorResponseDTO.of(exception.code(), HttpStatus.BAD_REQUEST,
						exception.getMessage(), path(request)));
	}

	@ExceptionHandler(RegistrationValidationException.class)
	public ResponseEntity<ErrorResponseDTO> handleRegistrationValidation(
			RegistrationValidationException exception, WebRequest request) {
		return build(HttpStatus.BAD_REQUEST, "Los datos enviados no son válidos", path(request),
				List.of(new FieldErrorDTO(exception.getField(), exception.getMessage())));
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ErrorResponseDTO> handleDataIntegrityViolation(
			DataIntegrityViolationException exception,
			WebRequest request) {
		return build(
				HttpStatus.CONFLICT,
				"La operación no se pudo completar porque el recurso ya existe o viola una restricción",
				path(request));
	}

	@ExceptionHandler(BusinessRuleException.class)
	public ResponseEntity<ErrorResponseDTO> handleBusinessRule(
			BusinessRuleException exception,
			WebRequest request) {
		return build(
				UNPROCESSABLE_ENTITY,
				exception.getMessage(),
				path(request));
	}

	@ExceptionHandler(AuthenticationException.class)
	public ResponseEntity<ErrorResponseDTO> handleAuthentication(
			AuthenticationException exception,
			WebRequest request) {
		return build(HttpStatus.UNAUTHORIZED,
				"/api/auth/login".equals(path(request)) && exception instanceof BadCredentialsException
						? "Correo o contraseña incorrectos." : "Autenticación requerida",
				path(request));
	}

	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ErrorResponseDTO> handleAccessDenied(
			AccessDeniedException exception,
			WebRequest request) {
		return build(
				HttpStatus.FORBIDDEN,
				"Acceso denegado",
				path(request));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponseDTO> handleUnexpected(
			Exception exception,
			WebRequest request) {
		log.error("Error no controlado al procesar {}", path(request), exception);
		return build(
				HttpStatus.INTERNAL_SERVER_ERROR,
				"Error interno del servidor",
				path(request));
	}

	private ResponseEntity<ErrorResponseDTO> validationError(BindingResult result, WebRequest request) {
		List<FieldErrorDTO> details = result.getAllErrors().stream()
				.map(this::toFieldError)
				.toList();

		return build(
				HttpStatus.BAD_REQUEST,
				"Los datos enviados no son válidos",
				path(request),
				details);
	}

	private FieldErrorDTO toFieldError(ObjectError error) {
		if (error instanceof org.springframework.validation.FieldError fieldError) {
			String field = fieldError.getField() == null ? "general" : fieldError.getField();
			return new FieldErrorDTO(field, messageOrDefault(fieldError.getDefaultMessage()));
		}

		return new FieldErrorDTO("general", messageOrDefault(error.getDefaultMessage()));
	}

	private String messageOrDefault(String message) {
		return message == null || message.isBlank() ? "Valor inválido" : message;
	}

	private ResponseEntity<ErrorResponseDTO> build(
			HttpStatusCode status,
			String message,
			String path) {
		return ResponseEntity.status(status).body(ErrorResponseDTO.of(status, message, path));
	}

	private ResponseEntity<ErrorResponseDTO> build(
			HttpStatusCode status,
			String message,
			String path,
			List<FieldErrorDTO> details) {
		return ResponseEntity.status(status).body(ErrorResponseDTO.of(status, message, path, details));
	}

	private String path(WebRequest request) {
		String description = request.getDescription(false);
		return description.startsWith("uri=") ? description.substring(4) : description;
	}
}
