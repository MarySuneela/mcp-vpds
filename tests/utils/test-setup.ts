/**
 * Test setup utilities for comprehensive testing
 */

import { circuitBreakerManager } from '../../src/utils/circuit-breaker.js';

/**
 * Reset all circuit breakers before each test
 */
export function resetCircuitBreakers(): void {
  // Reset all circuit breakers to CLOSED state
  const breakers = (circuitBreakerManager as any).circuitBreakers;
  if (breakers) {
    Object.values(breakers).forEach((breaker: any) => {
      breaker.state = 'CLOSED';
      breaker.failureCount = 0;
      breaker.nextAttemptTime = null;
      breaker.lastFailureTime = null;
      breaker.halfOpenCallCount = 0;
    });
  }
  
  // Also clear the circuit breaker manager's internal state
  (circuitBreakerManager as any).circuitBreakers = {};
}

/**
 * Mock console methods to reduce test noise
 */
export function mockConsole(): void {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
}

/**
 * Restore console methods
 */
export function restoreConsole(): void {
  jest.restoreAllMocks();
}

/**
 * Create a test timeout wrapper for async operations
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock timer for testing time-dependent functionality
 */
export function createMockTimer() {
  jest.useFakeTimers();
  
  return {
    advance: (ms: number) => jest.advanceTimersByTime(ms),
    runAll: () => jest.runAllTimers(),
    restore: () => jest.useRealTimers()
  };
}

/**
 * Suppress specific error types during testing
 */
export function suppressErrors(errorTypes: string[] = []): void {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    const shouldSuppress = errorTypes.some(type => message.includes(type));
    if (!shouldSuppress) {
      originalError.apply(console, args);
    }
  };
}

/**
 * Create a test data cleanup function
 */
export function createCleanup(cleanupFns: (() => void)[]): () => void {
  return () => {
    cleanupFns.forEach(fn => {
      try {
        fn();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
    });
  };
}