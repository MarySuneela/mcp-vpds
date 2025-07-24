/**
 * Circuit breaker pattern implementation for handling data source failures
 */
import { EventEmitter } from 'events';
import { LogContext } from './logger.js';
export declare enum CircuitState {
    CLOSED = "CLOSED",// Normal operation
    OPEN = "OPEN",// Circuit is open, requests fail fast
    HALF_OPEN = "HALF_OPEN"
}
export interface CircuitBreakerConfig {
    name: string;
    failureThreshold: number;
    recoveryTimeout: number;
    requestTimeout: number;
    monitoringPeriod: number;
    halfOpenMaxCalls: number;
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
export declare class CircuitBreaker extends EventEmitter {
    private config;
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime?;
    private lastSuccessTime?;
    private nextAttemptTime?;
    private halfOpenCalls;
    private totalRequests;
    private totalFailures;
    private totalSuccesses;
    private monitoringWindow;
    constructor(config: CircuitBreakerConfig);
    /**
     * Execute a function with circuit breaker protection
     */
    execute<T>(fn: () => Promise<T>, context?: LogContext): Promise<T>;
    /**
     * Execute function with timeout
     */
    private executeWithTimeout;
    /**
     * Handle successful execution
     */
    private onSuccess;
    /**
     * Handle failed execution
     */
    private onFailure;
    /**
     * Add result to monitoring window
     */
    private addToMonitoringWindow;
    /**
     * Check if circuit should be opened
     */
    private shouldOpenCircuit;
    /**
     * Check if we should attempt to reset from open state
     */
    private shouldAttemptReset;
    /**
     * Move circuit to CLOSED state
     */
    private moveToClosed;
    /**
     * Move circuit to OPEN state
     */
    private moveToOpen;
    /**
     * Move circuit to HALF_OPEN state
     */
    private moveToHalfOpen;
    /**
     * Get current circuit breaker statistics
     */
    getStats(): CircuitBreakerStats;
    /**
     * Get current state
     */
    getState(): CircuitState;
    /**
     * Force circuit to specific state (for testing)
     */
    forceState(state: CircuitState): void;
    /**
     * Reset circuit breaker statistics
     */
    reset(): void;
}
/**
 * Circuit breaker manager for handling multiple circuit breakers
 */
export declare class CircuitBreakerManager {
    private breakers;
    private static instance;
    /**
     * Get singleton instance
     */
    static getInstance(): CircuitBreakerManager;
    /**
     * Create or get circuit breaker
     */
    getCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker;
    /**
     * Get all circuit breaker stats
     */
    getAllStats(): Record<string, CircuitBreakerStats>;
    /**
     * Reset all circuit breakers
     */
    resetAll(): void;
}
export declare const circuitBreakerManager: CircuitBreakerManager;
//# sourceMappingURL=circuit-breaker.d.ts.map