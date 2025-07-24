/**
 * Structured logging utility using Winston
 */
export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    HTTP = "http",
    VERBOSE = "verbose",
    DEBUG = "debug",
    SILLY = "silly"
}
export interface LogContext {
    service?: string;
    method?: string;
    userId?: string;
    requestId?: string;
    duration?: number;
    [key: string]: any;
}
export interface LogEntry {
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: Error;
    timestamp?: Date;
}
/**
 * Logger class providing structured logging with different levels
 */
export declare class Logger {
    private winston;
    private static instance;
    constructor(options?: {
        level?: LogLevel;
        enableConsole?: boolean;
        enableFile?: boolean;
        logDir?: string;
    });
    /**
     * Get singleton logger instance
     */
    static getInstance(options?: {
        level?: LogLevel;
        enableConsole?: boolean;
        enableFile?: boolean;
        logDir?: string;
    }): Logger;
    /**
     * Log an error message
     */
    error(message: string, context?: LogContext, error?: Error): void;
    /**
     * Log a warning message
     */
    warn(message: string, context?: LogContext): void;
    /**
     * Log an info message
     */
    info(message: string, context?: LogContext): void;
    /**
     * Log an HTTP request/response
     */
    http(message: string, context?: LogContext): void;
    /**
     * Log a verbose message
     */
    verbose(message: string, context?: LogContext): void;
    /**
     * Log a debug message
     */
    debug(message: string, context?: LogContext): void;
    /**
     * Log a silly level message
     */
    silly(message: string, context?: LogContext): void;
    /**
     * Log method entry with parameters
     */
    methodEntry(service: string, method: string, params?: any): void;
    /**
     * Log method exit with result
     */
    methodExit(service: string, method: string, duration?: number, result?: any): void;
    /**
     * Log method error
     */
    methodError(service: string, method: string, error: Error, duration?: number): void;
    /**
     * Core logging method
     */
    private log;
    /**
     * Create a child logger with default context
     */
    child(defaultContext: LogContext): Logger;
    /**
     * Set log level
     */
    setLevel(level: LogLevel): void;
    /**
     * Get current log level
     */
    getLevel(): string;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map