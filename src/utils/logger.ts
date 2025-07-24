/**
 * Structured logging utility using Winston
 */

import winston from 'winston';
import { join } from 'path';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
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
export class Logger {
  private winston: winston.Logger;
  private static instance: Logger;

  constructor(options?: {
    level?: LogLevel;
    enableConsole?: boolean;
    enableFile?: boolean;
    logDir?: string;
  }) {
    const {
      level = LogLevel.INFO,
      enableConsole = true,
      enableFile = false,
      logDir = './logs'
    } = options || {};

    const transports: winston.transport[] = [];

    // Console transport with colored output
    if (enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length > 0 ? 
                ` ${JSON.stringify(meta, null, 2)}` : '';
              return `${timestamp} [${level}]: ${message}${metaStr}`;
            })
          )
        })
      );
    }

    // File transport for persistent logging
    if (enableFile) {
      transports.push(
        new winston.transports.File({
          filename: join(logDir, 'error.log'),
          level: LogLevel.ERROR,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        new winston.transports.File({
          filename: join(logDir, 'combined.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    this.winston = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      // Don't exit on handled exceptions
      exitOnError: false
    });

    // Handle uncaught exceptions and unhandled rejections
    this.winston.exceptions.handle(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    );

    this.winston.rejections.handle(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    );
  }

  /**
   * Get singleton logger instance
   */
  static getInstance(options?: {
    level?: LogLevel;
    enableConsole?: boolean;
    enableFile?: boolean;
    logDir?: string;
  }): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log({
      level: LogLevel.ERROR,
      message,
      context,
      error
    });
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log({
      level: LogLevel.WARN,
      message,
      context
    });
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log({
      level: LogLevel.INFO,
      message,
      context
    });
  }

  /**
   * Log an HTTP request/response
   */
  http(message: string, context?: LogContext): void {
    this.log({
      level: LogLevel.HTTP,
      message,
      context
    });
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, context?: LogContext): void {
    this.log({
      level: LogLevel.VERBOSE,
      message,
      context
    });
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log({
      level: LogLevel.DEBUG,
      message,
      context
    });
  }

  /**
   * Log a silly level message
   */
  silly(message: string, context?: LogContext): void {
    this.log({
      level: LogLevel.SILLY,
      message,
      context
    });
  }

  /**
   * Log method entry with parameters
   */
  methodEntry(service: string, method: string, params?: any): void {
    this.debug(`Entering ${service}.${method}`, {
      service,
      method,
      params: params ? JSON.stringify(params) : undefined
    });
  }

  /**
   * Log method exit with result
   */
  methodExit(service: string, method: string, duration?: number, result?: any): void {
    this.debug(`Exiting ${service}.${method}`, {
      service,
      method,
      duration,
      resultType: result ? typeof result : undefined,
      resultLength: Array.isArray(result) ? result.length : undefined
    });
  }

  /**
   * Log method error
   */
  methodError(service: string, method: string, error: Error, duration?: number): void {
    this.error(`Error in ${service}.${method}: ${error.message}`, {
      service,
      method,
      duration,
      errorName: error.name,
      errorStack: error.stack
    }, error);
  }

  /**
   * Core logging method
   */
  private log(entry: LogEntry): void {
    const { level, message, context, error } = entry;
    
    const logData: any = {
      message,
      timestamp: new Date().toISOString(),
      ...context
    };

    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    this.winston.log(level, logData);
  }

  /**
   * Create a child logger with default context
   */
  child(defaultContext: LogContext): Logger {
    const childLogger = new Logger();
    
    // Override the log method to include default context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (entry: LogEntry) => {
      const mergedContext = { ...defaultContext, ...entry.context };
      originalLog({ ...entry, context: mergedContext });
    };

    return childLogger;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.winston.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): string {
    return this.winston.level;
  }
}

// Export singleton instance
export const logger = Logger.getInstance({
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  enableConsole: process.env.NODE_ENV !== 'test',
  enableFile: process.env.ENABLE_FILE_LOGGING === 'true',
  logDir: process.env.LOG_DIR || './logs'
});