/**
 * Tests for error handling and logging system
 */

import { 
  AppError, 
  DataError, 
  NotFoundError, 
  ValidationError, 
  ServiceUnavailableError,
  TimeoutError,
  ConfigurationError,
  ProtocolError,
  ErrorHandler,
  ErrorCode 
} from '../src/utils/errors.js';
import { Logger, LogLevel } from '../src/utils/logger.js';
import { CircuitBreaker, CircuitState, circuitBreakerManager } from '../src/utils/circuit-breaker.js';

describe('Error Handling System', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError({
        code: ErrorCode.INVALID_DATA,
        message: 'Test error message',
        suggestions: ['Suggestion 1', 'Suggestion 2'],
        context: { service: 'TestService', method: 'testMethod' },
        retryable: true,
        statusCode: 400
      });

      expect(error.code).toBe(ErrorCode.INVALID_DATA);
      expect(error.message).toBe('Test error message');
      expect(error.suggestions).toEqual(['Suggestion 1', 'Suggestion 2']);
      expect(error.context).toEqual({ service: 'TestService', method: 'testMethod' });
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(400);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should convert to JSON correctly', () => {
      const error = new AppError({
        code: ErrorCode.INVALID_DATA,
        message: 'Test error message',
        suggestions: ['Suggestion 1'],
        retryable: true
      });

      const json = error.toJSON();
      expect(json).toHaveProperty('error');
      expect(json.error).toHaveProperty('code', ErrorCode.INVALID_DATA);
      expect(json.error).toHaveProperty('message', 'Test error message');
      expect(json.error).toHaveProperty('suggestions', ['Suggestion 1']);
      expect(json.error).toHaveProperty('retryable', true);
      expect(json.error).toHaveProperty('timestamp');
    });

    it('should generate user-friendly message with suggestions', () => {
      const error = new AppError({
        code: ErrorCode.INVALID_DATA,
        message: 'Test error message',
        suggestions: ['Suggestion 1', 'Suggestion 2']
      });

      const userMessage = error.getUserMessage();
      expect(userMessage).toContain('Test error message');
      expect(userMessage).toContain('Suggestions:');
      expect(userMessage).toContain('• Suggestion 1');
      expect(userMessage).toContain('• Suggestion 2');
    });
  });

  describe('Specific Error Types', () => {
    it('should create DataError correctly', () => {
      const error = new DataError('Data not found', ['Check data source'], { service: 'TestService' });
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.INVALID_DATA);
      expect(error.message).toBe('Data not found');
      expect(error.suggestions).toEqual(['Check data source']);
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(400);
    });

    it('should create NotFoundError correctly', () => {
      const error = new NotFoundError('Component', 'Button', ['Check spelling'], { service: 'TestService' });
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(error.message).toBe('Component "Button" not found');
      expect(error.suggestions).toEqual(['Check spelling']);
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(404);
    });

    it('should create ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', ['Provide valid input'], { service: 'TestService' });
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.DATA_VALIDATION_FAILED);
      expect(error.message).toBe('Invalid input');
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(400);
    });

    it('should create ServiceUnavailableError correctly', () => {
      const error = new ServiceUnavailableError('TestService', 'Database connection failed');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
      expect(error.message).toBe('Service TestService is unavailable: Database connection failed');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(503);
    });

    it('should create TimeoutError correctly', () => {
      const error = new TimeoutError('getData', 5000);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.SERVICE_TIMEOUT);
      expect(error.message).toBe('Operation "getData" timed out after 5000ms');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(408);
    });

    it('should create ConfigurationError correctly', () => {
      const error = new ConfigurationError('DATABASE_URL', 'Missing required environment variable');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.CONFIGURATION_ERROR);
      expect(error.message).toBe('Configuration error for "DATABASE_URL": Missing required environment variable');
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(500);
    });

    it('should create ProtocolError correctly', () => {
      const error = new ProtocolError('Invalid MCP request format');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCode.PROTOCOL_ERROR);
      expect(error.message).toBe('MCP Protocol error: Invalid MCP request format');
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(400);
    });
  });

  describe('ErrorHandler', () => {
    it('should handle AppError correctly', () => {
      const originalError = new DataError('Test data error');
      const handledError = ErrorHandler.handle(originalError);
      
      expect(handledError).toBe(originalError);
    });

    it('should handle regular Error correctly', () => {
      const originalError = new Error('Regular error');
      const handledError = ErrorHandler.handle(originalError);
      
      expect(handledError).toBeInstanceOf(AppError);
      expect(handledError.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(handledError.message).toBe('Regular error');
      expect(handledError.cause).toBe(originalError);
    });

    it('should handle string error correctly', () => {
      const handledError = ErrorHandler.handle('String error');
      
      expect(handledError).toBeInstanceOf(AppError);
      expect(handledError.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(handledError.message).toBe('String error');
    });

    it('should handle unknown error correctly', () => {
      const handledError = ErrorHandler.handle({ unknown: 'object' });
      
      expect(handledError).toBeInstanceOf(AppError);
      expect(handledError.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(handledError.message).toBe('Unknown error occurred');
    });

    it('should create error response correctly', () => {
      const error = new DataError('Test error', ['Test suggestion']);
      const response = ErrorHandler.createResponse(error);
      
      expect(response.success).toBe(false);
      expect(response.error.code).toBe(ErrorCode.INVALID_DATA);
      expect(response.error.message).toBe('Test error');
      expect(response.error.suggestions).toEqual(['Test suggestion']);
      expect(response.error.retryable).toBe(false);
      expect(response.error.timestamp).toBeDefined();
    });

    it('should check retryable correctly', () => {
      const retryableError = new ServiceUnavailableError('TestService');
      const nonRetryableError = new ValidationError('Invalid input');
      
      expect(ErrorHandler.isRetryable(retryableError)).toBe(true);
      expect(ErrorHandler.isRetryable(nonRetryableError)).toBe(false);
      expect(ErrorHandler.isRetryable(new Error('Regular error'))).toBe(false);
    });

    it('should get error severity correctly', () => {
      expect(ErrorHandler.getSeverity(new NotFoundError('Resource', 'id'))).toBe('low');
      expect(ErrorHandler.getSeverity(new ValidationError('Invalid'))).toBe('medium');
      expect(ErrorHandler.getSeverity(new ServiceUnavailableError('Service'))).toBe('high');
      expect(ErrorHandler.getSeverity(new ConfigurationError('Setting', 'Reason'))).toBe('critical');
    });
  });
});

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: false,
      enableFile: false
    });
  });

  it('should create logger with correct configuration', () => {
    expect(logger).toBeInstanceOf(Logger);
    expect(logger.getLevel()).toBe(LogLevel.DEBUG);
  });

  it('should log messages at different levels', () => {
    // These tests verify the logger methods exist and can be called
    expect(() => {
      logger.error('Error message', { service: 'TestService' });
      logger.warn('Warning message', { service: 'TestService' });
      logger.info('Info message', { service: 'TestService' });
      logger.debug('Debug message', { service: 'TestService' });
    }).not.toThrow();
  });

  it('should log method entry and exit', () => {
    expect(() => {
      logger.methodEntry('TestService', 'testMethod', { param: 'value' });
      logger.methodExit('TestService', 'testMethod', 100, { result: 'success' });
    }).not.toThrow();
  });

  it('should log method errors', () => {
    const error = new Error('Test error');
    expect(() => {
      logger.methodError('TestService', 'testMethod', error, 100);
    }).not.toThrow();
  });

  it('should create child logger with default context', () => {
    const childLogger = logger.child({ service: 'ChildService' });
    expect(childLogger).toBeInstanceOf(Logger);
  });

  it('should set and get log level', () => {
    logger.setLevel(LogLevel.WARN);
    expect(logger.getLevel()).toBe(LogLevel.WARN);
  });
});

describe('Circuit Breaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      name: 'TestCircuit',
      failureThreshold: 3,
      recoveryTimeout: 1000,
      requestTimeout: 500,
      monitoringPeriod: 5000,
      halfOpenMaxCalls: 2
    });
  });

  afterEach(() => {
    circuitBreaker.reset();
  });

  it('should create circuit breaker with correct configuration', () => {
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    
    const stats = circuitBreaker.getStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
    expect(stats.failureCount).toBe(0);
    expect(stats.successCount).toBe(0);
    expect(stats.totalRequests).toBe(0);
  });

  it('should execute successful operations', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.execute(mockOperation);
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
    
    const stats = circuitBreaker.getStats();
    expect(stats.totalRequests).toBe(1);
    expect(stats.totalSuccesses).toBe(1);
    expect(stats.totalFailures).toBe(0);
  });

  it('should handle operation failures', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
    
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Operation failed');
    
    const stats = circuitBreaker.getStats();
    expect(stats.totalRequests).toBe(1);
    expect(stats.totalSuccesses).toBe(0);
    expect(stats.totalFailures).toBe(1);
  });

  it('should open circuit after failure threshold', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
    
    // Trigger failures to reach threshold
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow();
    }
    
    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    
    // Next call should fail fast without executing operation
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(ServiceUnavailableError);
    expect(mockOperation).toHaveBeenCalledTimes(3); // Should not be called again
  });

  it('should handle timeout operations', async () => {
    const mockOperation = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000)) // Longer than timeout
    );
    
    await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(TimeoutError);
    
    const stats = circuitBreaker.getStats();
    expect(stats.totalFailures).toBe(1);
  });

  it('should reset circuit breaker', () => {
    circuitBreaker.forceState(CircuitState.OPEN);
    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    
    circuitBreaker.reset();
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    
    const stats = circuitBreaker.getStats();
    expect(stats.totalRequests).toBe(0);
    expect(stats.totalFailures).toBe(0);
    expect(stats.totalSuccesses).toBe(0);
  });
});

describe('Circuit Breaker Manager', () => {
  afterEach(() => {
    circuitBreakerManager.resetAll();
  });

  it('should create and manage circuit breakers', () => {
    const config = {
      name: 'TestCircuit',
      failureThreshold: 3,
      recoveryTimeout: 1000,
      requestTimeout: 500,
      monitoringPeriod: 5000,
      halfOpenMaxCalls: 2
    };

    const circuitBreaker1 = circuitBreakerManager.getCircuitBreaker(config);
    const circuitBreaker2 = circuitBreakerManager.getCircuitBreaker(config);
    
    // Should return the same instance for the same name
    expect(circuitBreaker1).toBe(circuitBreaker2);
  });

  it('should get all circuit breaker stats', () => {
    const config1 = {
      name: 'Circuit1',
      failureThreshold: 3,
      recoveryTimeout: 1000,
      requestTimeout: 500,
      monitoringPeriod: 5000,
      halfOpenMaxCalls: 2
    };

    const config2 = {
      name: 'Circuit2',
      failureThreshold: 3,
      recoveryTimeout: 1000,
      requestTimeout: 500,
      monitoringPeriod: 5000,
      halfOpenMaxCalls: 2
    };

    circuitBreakerManager.getCircuitBreaker(config1);
    circuitBreakerManager.getCircuitBreaker(config2);
    
    const allStats = circuitBreakerManager.getAllStats();
    
    expect(allStats).toHaveProperty('Circuit1');
    expect(allStats).toHaveProperty('Circuit2');
    expect(allStats.Circuit1.state).toBe(CircuitState.CLOSED);
    expect(allStats.Circuit2.state).toBe(CircuitState.CLOSED);
  });

  it('should reset all circuit breakers', () => {
    const config = {
      name: 'TestCircuit',
      failureThreshold: 3,
      recoveryTimeout: 1000,
      requestTimeout: 500,
      monitoringPeriod: 5000,
      halfOpenMaxCalls: 2
    };

    const circuitBreaker = circuitBreakerManager.getCircuitBreaker(config);
    circuitBreaker.forceState(CircuitState.OPEN);
    
    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    
    circuitBreakerManager.resetAll();
    
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });
});