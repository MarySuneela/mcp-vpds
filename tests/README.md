# Test Suite Documentation

This document describes the comprehensive test suite for the Visa Design System MCP server.

## Test Structure

### Test Categories

1. **Unit Tests** - Test individual components in isolation
2. **Integration Tests** - Test component interactions and data flow
3. **Performance Tests** - Benchmark common operations and stress testing
4. **Edge Case Tests** - Test boundary conditions and error scenarios
5. **MCP Protocol Compliance Tests** - Ensure adherence to MCP specification

### Test Files

- `component-service.test.ts` - Unit tests for ComponentService
- `design-token-service.test.ts` - Unit tests for DesignTokenService
- `guidelines-service.test.ts` - Unit tests for GuidelinesService
- `data-manager.test.ts` - Unit tests for DataManager
- `mcp-server.test.ts` - Unit tests for MCPServer
- `config.test.ts` - Configuration validation tests
- `error-handling.test.ts` - Error handling and recovery tests
- `validation.test.ts` - Data validation tests
- `serialization.test.ts` - Data serialization tests
- `integration.test.ts` - Integration tests
- `server-lifecycle.test.ts` - Server lifecycle tests
- `performance.test.ts` - Performance benchmarks
- `edge-cases.test.ts` - Edge case and boundary condition tests
- `mcp-protocol-compliance.test.ts` - MCP protocol compliance tests

### Utility Files

- `utils/test-setup.ts` - Common test setup utilities
- `utils/mock-data-generators.ts` - Mock data generation for testing

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:edge-cases
npm run test:mcp-compliance

# Run tests for CI
npm run test:ci
```

### Test Patterns

```bash
# Run specific test file
npm test -- component-service.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should handle"

# Run tests with verbose output
npm test -- --verbose

# Run tests with specific timeout
npm test -- --testTimeout=60000
```

## Test Coverage

### Coverage Thresholds

- **Global**: 80% branches, 85% functions/lines/statements
- **Services**: 90% branches, 95% functions/lines/statements
- **Utils**: 85% branches, 90% functions/lines/statements

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **HTML**: `coverage/index.html` - Interactive web report
- **LCOV**: `coverage/lcov.info` - For CI/CD integration
- **JSON**: `coverage/coverage-final.json` - Machine-readable format

## Mock Data Generation

The test suite includes comprehensive mock data generators:

### Basic Usage

```typescript
import { generateMockTokens, generateMockComponents, generateMockGuidelines } from './utils/mock-data-generators.js';

// Generate basic mock data
const tokens = generateMockTokens({ count: 10 });
const components = generateMockComponents({ count: 5 });
const guidelines = generateMockGuidelines({ count: 8 });

// Generate data with edge cases
const edgeCaseData = generateMockDataset({ 
  count: 20, 
  includeEdgeCases: true 
});

// Generate performance test data
const performanceData = generatePerformanceTestData();
```

### Mock Data Features

- **Configurable count**: Generate any number of mock items
- **Edge cases**: Include boundary conditions and special cases
- **Invalid data**: Generate malformed data for error testing
- **Performance data**: Large datasets for stress testing
- **Realistic relationships**: Mock data includes proper relationships between entities

## Performance Testing

### Benchmarks

Performance tests verify that common operations complete within acceptable timeframes:

- **Token retrieval**: < 100ms for full dataset
- **Search operations**: < 50ms for most queries
- **Component details**: < 25ms for individual lookups
- **Concurrent requests**: < 1000ms for 50 concurrent operations

### Memory Testing

- **Memory leak detection**: Repeated operations should not increase memory by > 50MB
- **Garbage collection**: Tests include explicit GC calls where available
- **Stress testing**: High-volume operations to identify memory issues

## Edge Case Testing

### Boundary Conditions

- Empty and null data handling
- Extreme input values (very long strings, special characters)
- Case sensitivity variations
- Unicode character support
- Whitespace-only inputs

### Error Recovery

- Temporary data unavailability
- Partial data corruption
- Network timeouts and retries
- Circuit breaker functionality

### Validation Edge Cases

- Missing required fields
- Invalid data types
- Circular references
- Malformed JSON structures

## MCP Protocol Compliance

### Protocol Requirements

Tests verify compliance with MCP specification:

- **Server initialization**: Proper handshake and capability declaration
- **Tool listing**: Correct tool definitions and schemas
- **Tool execution**: Valid request/response handling
- **Error handling**: Proper error format and codes
- **Concurrent requests**: Thread-safe operation

### Response Format Validation

- JSON-RPC 2.0 compliance
- Proper error object structure
- Content type validation
- Metadata inclusion

## Test Utilities

### Circuit Breaker Management

```typescript
import { resetCircuitBreakers } from './utils/test-setup.js';

beforeEach(() => {
  resetCircuitBreakers(); // Reset circuit breaker state
});
```

### Console Output Management

```typescript
import { mockConsole, restoreConsole } from './utils/test-setup.js';

beforeAll(() => mockConsole()); // Suppress console output
afterAll(() => restoreConsole()); // Restore console
```

### Timeout Handling

```typescript
import { withTimeout } from './utils/test-setup.js';

const result = await withTimeout(
  someAsyncOperation(),
  5000 // 5 second timeout
);
```

## Continuous Integration

### CI Configuration

The test suite is optimized for CI environments:

- **Parallel execution**: Tests run with limited workers for stability
- **Coverage reporting**: Automatic coverage report generation
- **Timeout handling**: Appropriate timeouts for CI environments
- **Error suppression**: Reduced noise in CI logs

### CI Commands

```bash
# Run full test suite for CI
npm run test:ci

# Generate coverage reports
npm run test:coverage

# Run specific test categories
npm run test:unit
npm run test:integration
```

## Debugging Tests

### Common Issues

1. **Circuit breaker in OPEN state**: Use `resetCircuitBreakers()` in test setup
2. **Memory leaks**: Check for proper cleanup in `afterEach` hooks
3. **Timeout errors**: Increase timeout or optimize test operations
4. **Flaky tests**: Add proper wait conditions and state resets

### Debug Commands

```bash
# Run single test with debugging
npm test -- --testNamePattern="specific test" --verbose

# Run with increased timeout
npm test -- --testTimeout=60000

# Run with coverage to identify untested code
npm run test:coverage
```

## Best Practices

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names that explain the expected behavior
- Keep tests focused on single functionality
- Use proper setup and teardown hooks

### Mock Data

- Use realistic mock data that represents actual use cases
- Include edge cases in mock data generation
- Reset mock state between tests
- Validate mock data structure matches real data

### Assertions

- Use specific matchers for better error messages
- Test both positive and negative cases
- Verify error codes and messages
- Check data structure and types

### Performance

- Keep tests fast by using minimal mock data
- Use performance tests for benchmarking
- Avoid unnecessary async operations
- Clean up resources properly

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Add appropriate mock data generators
3. Include both positive and negative test cases
4. Update coverage thresholds if needed
5. Document any new test utilities
6. Ensure tests are deterministic and not flaky