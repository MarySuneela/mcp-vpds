/**
 * Edge case and boundary condition tests
 */

import { DesignTokenService } from '../src/services/design-token-service.js';
import { ComponentService } from '../src/services/component-service.js';
import { GuidelinesService } from '../src/services/guidelines-service.js';
import { DataManager } from '../src/utils/data-manager.js';
import { generateMockDataset, generateInvalidData } from './utils/mock-data-generators.js';
import { resetCircuitBreakers } from './utils/test-setup.js';

describe('Edge Cases and Boundary Conditions', () => {
  let mockDataManager: DataManager;
  let tokenService: DesignTokenService;
  let componentService: ComponentService;
  let guidelinesService: GuidelinesService;

  beforeEach(() => {
    resetCircuitBreakers();
    const mockData = generateMockDataset({ count: 10, includeEdgeCases: true });
    
    mockDataManager = {
      getCachedData: jest.fn().mockReturnValue(mockData),
      loadData: jest.fn().mockResolvedValue(mockData),
      watchFiles: jest.fn(),
      validateData: jest.fn().mockReturnValue(true),
      isDataLoaded: jest.fn().mockReturnValue(true)
    } as any;

    tokenService = new DesignTokenService(mockDataManager);
    componentService = new ComponentService(mockDataManager);
    guidelinesService = new GuidelinesService(mockDataManager);
  });

  describe('Empty and Null Data Handling', () => {
    it('should handle empty token arrays', async () => {
      const emptyDataManager = {
        getCachedData: jest.fn().mockReturnValue({
          designTokens: [],
          components: [],
          guidelines: []
        })
      } as any;

      const service = new DesignTokenService(emptyDataManager);
      const result = await service.getTokens();
      
      expect(result).toEqual([]);
    });

    it('should handle null data gracefully', async () => {
      const nullDataManager = {
        getCachedData: jest.fn().mockReturnValue(null)
      } as any;

      const service = new DesignTokenService(nullDataManager);
      
      await expect(service.getTokens()).rejects.toMatchObject({
        code: 'INVALID_DATA'
      });
    });

    it('should handle undefined cached data', async () => {
      const undefinedDataManager = {
        getCachedData: jest.fn().mockReturnValue(undefined)
      } as any;

      const service = new ComponentService(undefinedDataManager);
      
      await expect(service.getComponents()).rejects.toMatchObject({
        code: 'INVALID_DATA'
      });
    });
  });

  describe('Extreme Input Values', () => {
    it('should handle very long search queries', async () => {
      const longQuery = 'a'.repeat(10000);
      
      const result = await tokenService.searchTokens(longQuery);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle search queries with special characters', async () => {
      const specialQuery = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      const result = await componentService.searchComponents(specialQuery);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle unicode characters in search', async () => {
      const unicodeQuery = '🎨🔧⚡️🌟💡';
      
      const result = await guidelinesService.searchGuidelines(unicodeQuery);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle whitespace-only queries', async () => {
      const whitespaceQuery = '   \t\n\r   ';
      
      await expect(tokenService.searchTokens(whitespaceQuery)).rejects.toMatchObject({
        code: 'DATA_VALIDATION_FAILED'
      });
    });
  });

  describe('Case Sensitivity Edge Cases', () => {
    it('should handle mixed case token names', async () => {
      const result = await tokenService.getToken('TEST-TOKEN-0');
      expect(result).toBeDefined();
      expect(result.name).toBe('test-token-0');
    });

    it('should handle case variations in component names', async () => {
      const result = await componentService.getComponent('testcomponent0');
      expect(result).toBeDefined();
      expect(result.name).toBe('TestComponent0');
    });

    it('should handle case variations in guideline IDs', async () => {
      const result = await guidelinesService.getGuideline('TEST-GUIDELINE-0');
      expect(result).toBeDefined();
      expect(result.id).toBe('test-guideline-0');
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle single character searches', async () => {
      const result = await tokenService.searchTokens('a');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle maximum length identifiers', async () => {
      const maxLengthId = 'a'.repeat(255);
      
      await expect(componentService.getComponent(maxLengthId)).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND'
      });
    });

    it('should handle empty string parameters', async () => {
      await expect(tokenService.getToken('')).rejects.toMatchObject({
        code: 'DATA_VALIDATION_FAILED'
      });
    });
  });

  describe('Data Type Edge Cases', () => {
    it('should handle numeric strings as identifiers', async () => {
      await expect(componentService.getComponent('12345')).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND'
      });
    });

    it('should handle boolean-like strings', async () => {
      const result = await tokenService.searchTokens('true');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle null-like strings', async () => {
      const result = await guidelinesService.searchGuidelines('null');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Concurrent Access Edge Cases', () => {
    it('should handle rapid successive calls', async () => {
      const promises = Array.from({ length: 100 }, () => tokenService.getTokens());
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should handle interleaved read operations', async () => {
      const operations = [
        () => tokenService.getTokens(),
        () => componentService.getComponents(),
        () => guidelinesService.getGuidelines(),
        () => tokenService.searchTokens('test'),
        () => componentService.searchComponents('test'),
        () => guidelinesService.searchGuidelines('test')
      ];

      const promises = Array.from({ length: 50 }, (_, i) => operations[i % operations.length]());
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle repeated operations without memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 1000; i++) {
        await tokenService.getTokens();
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should not increase memory by more than 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle large result sets efficiently', async () => {
      const startTime = performance.now();
      
      const result = await tokenService.getTokens();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be fast even with large datasets
    });
  });

  describe('Error Recovery Edge Cases', () => {
    it('should recover from temporary data unavailability', async () => {
      let callCount = 0;
      const flakyDataManager = {
        getCachedData: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount <= 2) {
            return null; // Fail first two calls
          }
          return generateMockDataset({ count: 5 });
        })
      } as any;

      const service = new DesignTokenService(flakyDataManager);
      
      // First call should fail
      await expect(service.getTokens()).rejects.toMatchObject({
        code: 'INVALID_DATA'
      });
      
      // Second call should also fail
      await expect(service.getTokens()).rejects.toMatchObject({
        code: 'INVALID_DATA'
      });
      
      // Third call should succeed
      const result = await service.getTokens();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle partial data corruption gracefully', async () => {
      const corruptedData = {
        designTokens: [
          { name: 'valid-token', value: '#000000', category: 'color' },
          null, // Corrupted entry
          { name: 'another-valid-token', value: '#ffffff', category: 'color' }
        ],
        components: [],
        guidelines: []
      };

      const corruptedDataManager = {
        getCachedData: jest.fn().mockReturnValue(corruptedData)
      } as any;

      const service = new DesignTokenService(corruptedDataManager);
      const result = await service.getTokens();
      
      // Should filter out corrupted entries
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result.every(token => token && token.name)).toBe(true);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle tokens with missing required fields', async () => {
      const invalidData = {
        designTokens: [
          { name: 'incomplete-token' }, // Missing value and category
          { value: '#000000', category: 'color' }, // Missing name
          { name: 'valid-token', value: '#ffffff', category: 'color' }
        ],
        components: [],
        guidelines: []
      };

      const invalidDataManager = {
        getCachedData: jest.fn().mockReturnValue(invalidData)
      } as any;

      const service = new DesignTokenService(invalidDataManager);
      const result = await service.getTokens();
      
      // Should only return valid tokens
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('valid-token');
    });

    it('should handle components with circular references', async () => {
      const circularData = {
        designTokens: [],
        components: [
          {
            name: 'ComponentA',
            description: 'Component A',
            category: 'test',
            props: [],
            variants: [],
            examples: [],
            guidelines: ['ComponentB'], // References ComponentB
            accessibility: {
              ariaLabel: 'Component A',
              keyboardNavigation: false,
              screenReaderSupport: false,
              colorContrast: 'AA',
              focusManagement: false
            }
          },
          {
            name: 'ComponentB',
            description: 'Component B',
            category: 'test',
            props: [],
            variants: [],
            examples: [],
            guidelines: ['ComponentA'], // References ComponentA (circular)
            accessibility: {
              ariaLabel: 'Component B',
              keyboardNavigation: false,
              screenReaderSupport: false,
              colorContrast: 'AA',
              focusManagement: false
            }
          }
        ],
        guidelines: []
      };

      const circularDataManager = {
        getCachedData: jest.fn().mockReturnValue(circularData)
      } as any;

      const service = new ComponentService(circularDataManager);
      const result = await service.getComponents();
      
      // Should handle circular references without infinite loops
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
    });
  });
});