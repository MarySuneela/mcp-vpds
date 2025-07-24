/**
 * Circuit breaker pattern implementation for handling data source failures
 */

import { EventEmitter } from 'events';
import { logger, LogContext } from './logger.js';
import { AppError, ErrorCode, ServiceUnavailableError, TimeoutError } from './errors.js';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;    // Number of failures before opening
  recoveryTimeout: number;     // Time to wait before trying again (ms)
  requestTimeout: number;      // Individual request timeout (ms)
  monitoringPeriod: number;    // Time window for failure counting (ms)
  halfOpenMaxCalls: number;    // Max calls allowed in half-open state
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Circuit breaker implementation for protecting against cascading failures
 */
export class CircuitBreaker extends EventEmitter {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private halfOpenCalls = 0;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private monitoringWindow: Array<{ timestamp: Date; success: boolean }> = [];

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = config;
    
    logger.info(`Circuit breaker "${config.name}" initialized`, {
      service: 'CircuitBreaker',
      circuitName: config.name,
      config
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, context?: LogContext): Promise<T> {
    this.totalRequests++;
    
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.moveToHalfOpen();
      } else {
        const error = new ServiceUnavailableError(
          this.config.name,
          `Circuit breaker is OPEN. Next attempt at ${this.nextAttemptTime?.toISOString()}`,
          { ...context, circuitName: this.config.name, circuitState: this.state }
        );
        this.emit('callRejected', { error, stats: this.getStats() });
        throw error;
      }
    }

    // Check half-open state limits
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        const error = new ServiceUnavailableError(
          this.config.name,
          'Circuit breaker is HALF_OPEN and at call limit',
          { ...context, circuitName: this.config.name, circuitState: this.state }
        );
        this.emit('callRejected', { error, stats: this.getStats() });
        throw error;
      }
      this.halfOpenCalls++;
    }

    const startTime = Date.now();
    
    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      const duration = Date.now() - startTime;
      
      this.onSuccess(duration, context);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.onFailure(error, duration, context);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(
          this.config.name,
          this.config.requestTimeout,
          { circuitName: this.config.name }
        ));
      }, this.config.requestTimeout);

      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful execution
   */
  private onSuccess(duration: number, context?: LogContext): void {
    this.successCount++;
    this.totalSuccesses++;
    this.lastSuccessTime = new Date();
    
    this.addToMonitoringWindow(true);
    
    logger.debug(`Circuit breaker "${this.config.name}" - Success`, {
      service: 'CircuitBreaker',
      circuitName: this.config.name,
      duration,
      state: this.state,
      ...context
    });

    if (this.state === CircuitState.HALF_OPEN) {
      // If we've had enough successful calls, close the circuit
      if (this.successCount >= this.config.halfOpenMaxCalls) {
        this.moveToClosed();
      }
    }

    this.emit('callSuccess', { duration, stats: this.getStats() });
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: unknown, duration: number, context?: LogContext): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = new Date();
    
    this.addToMonitoringWindow(false);
    
    const appError = error instanceof AppError ? error : new AppError({
      code: ErrorCode.SERVICE_ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
      cause: error instanceof Error ? error : undefined,
      context: { ...context, circuitName: this.config.name }
    });

    logger.warn(`Circuit breaker "${this.config.name}" - Failure`, {
      service: 'CircuitBreaker',
      circuitName: this.config.name,
      duration,
      state: this.state,
      failureCount: this.failureCount,
      error: appError.message,
      ...context
    });

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.moveToOpen();
    }

    this.emit('callFailure', { error: appError, duration, stats: this.getStats() });
  }

  /**
   * Add result to monitoring window
   */
  private addToMonitoringWindow(success: boolean): void {
    const now = new Date();
    this.monitoringWindow.push({ timestamp: now, success });
    
    // Remove old entries outside monitoring period
    const cutoff = new Date(now.getTime() - this.config.monitoringPeriod);
    this.monitoringWindow = this.monitoringWindow.filter(
      entry => entry.timestamp > cutoff
    );
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    if (this.state === CircuitState.OPEN) {
      return false;
    }

    // Check failure threshold within monitoring period
    const recentFailures = this.monitoringWindow.filter(entry => !entry.success).length;
    return recentFailures >= this.config.failureThreshold;
  }

  /**
   * Check if we should attempt to reset from open state
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return true;
    }
    return new Date() >= this.nextAttemptTime;
  }

  /**
   * Move circuit to CLOSED state
   */
  private moveToClosed(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    this.nextAttemptTime = undefined;
    
    logger.info(`Circuit breaker "${this.config.name}" moved to CLOSED`, {
      service: 'CircuitBreaker',
      circuitName: this.config.name,
      previousState,
      newState: this.state
    });
    
    this.emit('stateChange', { 
      from: previousState, 
      to: this.state, 
      stats: this.getStats() 
    });
  }

  /**
   * Move circuit to OPEN state
   */
  private moveToOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    this.halfOpenCalls = 0;
    
    logger.warn(`Circuit breaker "${this.config.name}" moved to OPEN`, {
      service: 'CircuitBreaker',
      circuitName: this.config.name,
      previousState,
      newState: this.state,
      nextAttemptTime: this.nextAttemptTime.toISOString(),
      failureCount: this.failureCount
    });
    
    this.emit('stateChange', { 
      from: previousState, 
      to: this.state, 
      stats: this.getStats() 
    });
  }

  /**
   * Move circuit to HALF_OPEN state
   */
  private moveToHalfOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenCalls = 0;
    this.successCount = 0;
    this.failureCount = 0;
    
    logger.info(`Circuit breaker "${this.config.name}" moved to HALF_OPEN`, {
      service: 'CircuitBreaker',
      circuitName: this.config.name,
      previousState,
      newState: this.state
    });
    
    this.emit('stateChange', { 
      from: previousState, 
      to: this.state, 
      stats: this.getStats() 
    });
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Force circuit to specific state (for testing)
   */
  forceState(state: CircuitState): void {
    const previousState = this.state;
    this.state = state;
    
    if (state === CircuitState.CLOSED) {
      this.moveToClosed();
    } else if (state === CircuitState.OPEN) {
      this.moveToOpen();
    } else if (state === CircuitState.HALF_OPEN) {
      this.moveToHalfOpen();
    }
  }

  /**
   * Reset circuit breaker statistics
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttemptTime = undefined;
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.monitoringWindow = [];
    
    logger.info(`Circuit breaker "${this.config.name}" reset`, {
      service: 'CircuitBreaker',
      circuitName: this.config.name
    });
    
    this.emit('reset', { stats: this.getStats() });
  }
}

/**
 * Circuit breaker manager for handling multiple circuit breakers
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();
  private static instance: CircuitBreakerManager;

  /**
   * Get singleton instance
   */
  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Create or get circuit breaker
   */
  getCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(config.name)) {
      const breaker = new CircuitBreaker(config);
      this.breakers.set(config.name, breaker);
      
      // Log state changes
      breaker.on('stateChange', ({ from, to, stats }) => {
        logger.info(`Circuit breaker state change: ${config.name}`, {
          service: 'CircuitBreakerManager',
          circuitName: config.name,
          from,
          to,
          stats
        });
      });
    }
    
    return this.breakers.get(config.name)!;
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    
    logger.info('All circuit breakers reset', {
      service: 'CircuitBreakerManager',
      breakerCount: this.breakers.size
    });
  }
}

// Export singleton instance
export const circuitBreakerManager = CircuitBreakerManager.getInstance();