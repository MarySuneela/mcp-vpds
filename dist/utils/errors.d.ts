/**
 * Custom error classes and error handling utilities
 */
import { LogContext } from './logger.js';
export declare enum ErrorCode {
    NO_DATA = "NO_DATA",
    INVALID_DATA = "INVALID_DATA",
    DATA_VALIDATION_FAILED = "DATA_VALIDATION_FAILED",
    DATA_LOAD_FAILED = "DATA_LOAD_FAILED",
    INVALID_QUERY = "INVALID_QUERY",
    INVALID_PARAMETER = "INVALID_PARAMETER",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    SERVICE_TIMEOUT = "SERVICE_TIMEOUT",
    SERVICE_ERROR = "SERVICE_ERROR",
    PROTOCOL_ERROR = "PROTOCOL_ERROR",
    TOOL_NOT_FOUND = "TOOL_NOT_FOUND",
    INVALID_TOOL_CALL = "INVALID_TOOL_CALL",
    FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
    NETWORK_ERROR = "NETWORK_ERROR",
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
export interface ErrorDetails {
    code: ErrorCode;
    message: string;
    suggestions?: string[];
    context?: LogContext;
    cause?: Error;
    retryable?: boolean;
    statusCode?: number;
}
/**
 * Base error class for all application errors
 */
export declare class AppError extends Error {
    readonly code: ErrorCode;
    readonly suggestions?: string[];
    readonly context?: LogContext;
    readonly cause?: Error;
    readonly retryable: boolean;
    readonly statusCode: number;
    readonly timestamp: Date;
    constructor(details: ErrorDetails);
    /**
     * Convert error to JSON for API responses
     */
    toJSON(): object;
    /**
     * Get user-friendly error message
     */
    getUserMessage(): string;
}
/**
 * Data-related errors
 */
export declare class DataError extends AppError {
    constructor(message: string, suggestions?: string[], context?: LogContext, cause?: Error);
}
/**
 * Resource not found errors
 */
export declare class NotFoundError extends AppError {
    constructor(resource: string, identifier: string, suggestions?: string[], context?: LogContext);
}
/**
 * Validation errors
 */
export declare class ValidationError extends AppError {
    constructor(message: string, suggestions?: string[], context?: LogContext, cause?: Error);
}
/**
 * Service unavailable errors
 */
export declare class ServiceUnavailableError extends AppError {
    constructor(service: string, reason?: string, context?: LogContext, cause?: Error);
}
/**
 * Timeout errors
 */
export declare class TimeoutError extends AppError {
    constructor(operation: string, timeout: number, context?: LogContext, cause?: Error);
}
/**
 * Configuration errors
 */
export declare class ConfigurationError extends AppError {
    constructor(setting: string, reason: string, context?: LogContext, cause?: Error);
}
/**
 * MCP Protocol errors
 */
export declare class ProtocolError extends AppError {
    constructor(message: string, context?: LogContext, cause?: Error);
}
/**
 * Error handler utility functions
 */
export declare class ErrorHandler {
    /**
     * Handle and normalize any error to AppError
     */
    static handle(error: unknown, context?: LogContext): AppError;
    /**
     * Create a graceful error response for API
     */
    static createResponse(error: AppError): {
        success: false;
        error: {
            code: string;
            message: string;
            suggestions?: string[];
            retryable: boolean;
            timestamp: string;
        };
    };
    /**
     * Check if error is retryable
     */
    static isRetryable(error: unknown): boolean;
    /**
     * Get error severity level
     */
    static getSeverity(error: AppError): 'low' | 'medium' | 'high' | 'critical';
    /**
     * Log error with appropriate level based on severity
     */
    static logError(error: AppError, context?: LogContext): void;
}
/**
 * Decorator for automatic error handling in service methods
 */
export declare function handleErrors(target: any, propertyName: string, descriptor: PropertyDescriptor): PropertyDescriptor;
//# sourceMappingURL=errors.d.ts.map