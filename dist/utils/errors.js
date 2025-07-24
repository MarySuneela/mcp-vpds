/**
 * Custom error classes and error handling utilities
 */
import { logger } from './logger.js';
export var ErrorCode;
(function (ErrorCode) {
    // Data errors
    ErrorCode["NO_DATA"] = "NO_DATA";
    ErrorCode["INVALID_DATA"] = "INVALID_DATA";
    ErrorCode["DATA_VALIDATION_FAILED"] = "DATA_VALIDATION_FAILED";
    ErrorCode["DATA_LOAD_FAILED"] = "DATA_LOAD_FAILED";
    // Query errors
    ErrorCode["INVALID_QUERY"] = "INVALID_QUERY";
    ErrorCode["INVALID_PARAMETER"] = "INVALID_PARAMETER";
    ErrorCode["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    // Service errors
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCode["SERVICE_TIMEOUT"] = "SERVICE_TIMEOUT";
    ErrorCode["SERVICE_ERROR"] = "SERVICE_ERROR";
    // MCP Protocol errors
    ErrorCode["PROTOCOL_ERROR"] = "PROTOCOL_ERROR";
    ErrorCode["TOOL_NOT_FOUND"] = "TOOL_NOT_FOUND";
    ErrorCode["INVALID_TOOL_CALL"] = "INVALID_TOOL_CALL";
    // System errors
    ErrorCode["FILE_SYSTEM_ERROR"] = "FILE_SYSTEM_ERROR";
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCode["CONFIGURATION_ERROR"] = "CONFIGURATION_ERROR";
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(ErrorCode || (ErrorCode = {}));
/**
 * Base error class for all application errors
 */
export class AppError extends Error {
    code;
    suggestions;
    context;
    cause;
    retryable;
    statusCode;
    timestamp;
    constructor(details) {
        super(details.message);
        this.name = this.constructor.name;
        this.code = details.code;
        this.suggestions = details.suggestions;
        this.context = details.context;
        this.cause = details.cause;
        this.retryable = details.retryable ?? false;
        this.statusCode = details.statusCode ?? 500;
        this.timestamp = new Date();
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        // Log the error
        logger.error(this.message, {
            errorCode: this.code,
            retryable: this.retryable,
            statusCode: this.statusCode,
            suggestions: this.suggestions,
            ...this.context
        }, this.cause || this);
    }
    /**
     * Convert error to JSON for API responses
     */
    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message,
                suggestions: this.suggestions,
                retryable: this.retryable,
                timestamp: this.timestamp.toISOString()
            }
        };
    }
    /**
     * Get user-friendly error message
     */
    getUserMessage() {
        const baseMessage = this.message;
        if (this.suggestions && this.suggestions.length > 0) {
            return `${baseMessage}\n\nSuggestions:\n${this.suggestions.map(s => `• ${s}`).join('\n')}`;
        }
        return baseMessage;
    }
}
/**
 * Data-related errors
 */
export class DataError extends AppError {
    constructor(message, suggestions, context, cause) {
        super({
            code: ErrorCode.INVALID_DATA,
            message,
            suggestions,
            context,
            cause,
            retryable: false,
            statusCode: 400
        });
    }
}
/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
    constructor(resource, identifier, suggestions, context) {
        super({
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: `${resource} "${identifier}" not found`,
            suggestions,
            context: { ...context, resource, identifier },
            retryable: false,
            statusCode: 404
        });
    }
}
/**
 * Validation errors
 */
export class ValidationError extends AppError {
    constructor(message, suggestions, context, cause) {
        super({
            code: ErrorCode.DATA_VALIDATION_FAILED,
            message,
            suggestions,
            context,
            cause,
            retryable: false,
            statusCode: 400
        });
    }
}
/**
 * Service unavailable errors
 */
export class ServiceUnavailableError extends AppError {
    constructor(service, reason, context, cause) {
        const message = reason ?
            `Service ${service} is unavailable: ${reason}` :
            `Service ${service} is unavailable`;
        super({
            code: ErrorCode.SERVICE_UNAVAILABLE,
            message,
            suggestions: [
                'Try again in a few moments',
                'Check service configuration',
                'Verify data sources are accessible'
            ],
            context: { ...context, service },
            cause,
            retryable: true,
            statusCode: 503
        });
    }
}
/**
 * Timeout errors
 */
export class TimeoutError extends AppError {
    constructor(operation, timeout, context, cause) {
        super({
            code: ErrorCode.SERVICE_TIMEOUT,
            message: `Operation "${operation}" timed out after ${timeout}ms`,
            suggestions: [
                'Try again with a simpler query',
                'Check network connectivity',
                'Contact support if the issue persists'
            ],
            context: { ...context, operation, timeout },
            cause,
            retryable: true,
            statusCode: 408
        });
    }
}
/**
 * Configuration errors
 */
export class ConfigurationError extends AppError {
    constructor(setting, reason, context, cause) {
        super({
            code: ErrorCode.CONFIGURATION_ERROR,
            message: `Configuration error for "${setting}": ${reason}`,
            suggestions: [
                'Check environment variables',
                'Verify configuration file syntax',
                'Ensure all required settings are provided'
            ],
            context: { ...context, setting },
            cause,
            retryable: false,
            statusCode: 500
        });
    }
}
/**
 * MCP Protocol errors
 */
export class ProtocolError extends AppError {
    constructor(message, context, cause) {
        super({
            code: ErrorCode.PROTOCOL_ERROR,
            message: `MCP Protocol error: ${message}`,
            suggestions: [
                'Check MCP client compatibility',
                'Verify request format',
                'Update MCP SDK if needed'
            ],
            context,
            cause,
            retryable: false,
            statusCode: 400
        });
    }
}
/**
 * Error handler utility functions
 */
export class ErrorHandler {
    /**
     * Handle and normalize any error to AppError
     */
    static handle(error, context) {
        if (error instanceof AppError) {
            return error;
        }
        if (error instanceof Error) {
            return new AppError({
                code: ErrorCode.INTERNAL_ERROR,
                message: error.message,
                context,
                cause: error,
                retryable: false,
                statusCode: 500
            });
        }
        // Handle non-Error objects
        const message = typeof error === 'string' ? error : 'Unknown error occurred';
        return new AppError({
            code: ErrorCode.INTERNAL_ERROR,
            message,
            context,
            retryable: false,
            statusCode: 500
        });
    }
    /**
     * Create a graceful error response for API
     */
    static createResponse(error) {
        return {
            success: false,
            error: {
                code: error.code,
                message: error.message,
                suggestions: error.suggestions,
                retryable: error.retryable,
                timestamp: error.timestamp.toISOString()
            }
        };
    }
    /**
     * Check if error is retryable
     */
    static isRetryable(error) {
        if (error instanceof AppError) {
            return error.retryable;
        }
        return false;
    }
    /**
     * Get error severity level
     */
    static getSeverity(error) {
        switch (error.code) {
            case ErrorCode.RESOURCE_NOT_FOUND:
            case ErrorCode.INVALID_QUERY:
            case ErrorCode.INVALID_PARAMETER:
                return 'low';
            case ErrorCode.DATA_VALIDATION_FAILED:
            case ErrorCode.PROTOCOL_ERROR:
                return 'medium';
            case ErrorCode.SERVICE_UNAVAILABLE:
            case ErrorCode.SERVICE_TIMEOUT:
            case ErrorCode.DATA_LOAD_FAILED:
                return 'high';
            case ErrorCode.CONFIGURATION_ERROR:
            case ErrorCode.INTERNAL_ERROR:
                return 'critical';
            default:
                return 'medium';
        }
    }
    /**
     * Log error with appropriate level based on severity
     */
    static logError(error, context) {
        const severity = this.getSeverity(error);
        const logContext = { ...error.context, ...context };
        switch (severity) {
            case 'low':
                logger.info(`Low severity error: ${error.message}`, logContext);
                break;
            case 'medium':
                logger.warn(`Medium severity error: ${error.message}`, logContext);
                break;
            case 'high':
            case 'critical':
                logger.error(`${severity} severity error: ${error.message}`, logContext, error);
                break;
        }
    }
}
/**
 * Decorator for automatic error handling in service methods
 */
export function handleErrors(target, propertyName, descriptor) {
    if (!descriptor || typeof descriptor.value !== 'function') {
        return descriptor;
    }
    const method = descriptor.value;
    descriptor.value = async function (...args) {
        const startTime = Date.now();
        const serviceName = target.constructor.name;
        try {
            logger.methodEntry(serviceName, propertyName, args);
            const result = await method.apply(this, args);
            const duration = Date.now() - startTime;
            logger.methodExit(serviceName, propertyName, duration, result);
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const appError = ErrorHandler.handle(error, {
                service: serviceName,
                method: propertyName,
                duration
            });
            logger.methodError(serviceName, propertyName, appError, duration);
            throw appError;
        }
    };
    return descriptor;
}
//# sourceMappingURL=errors.js.map