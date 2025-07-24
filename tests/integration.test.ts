/**
 * Integration tests for MCP Server - End-to-end testing with service integration
 */

import { join } from 'path';
import { writeFile, mkdir, rm } from 'fs/promises';
import { DataManager } from '../src/utils/data-manager.js';
import { DesignTokenService } from '../src/services/design-token-service.js';
import { ComponentService } from '../src/services/component-service.js';
import { GuidelinesService } from '../src/services/guidelines-service.js';
import type { DesignToken, Component, Guideline } from '../src/types/index.js';

// Test data directory
const TEST_DATA_DIR = join(process.cwd(), 'test-data-integration');

// Service integration interface
interface ServiceIntegration {
  dataManager: DataManager;
  designTokenService: DesignTokenService;
  componentService: ComponentService;
  guidelinesService: GuidelinesService;
}

describe('MCP Server Integration Tests', () => {
  let testDataDir: string;
  let services: ServiceIntegration;

  // Sample test data
  const sampleDesignTokens: DesignToken[] = [
    {
      name: 'primary-blue',
      value: '#0066CC',
      category: 'color',
      description: 'Primary brand blue color',
      usage: ['buttons', 'links'],
      aliases: ['brand-blue']
    },
    {
      name: 'secondary-gray',
      value: '#6B7280',
      category: 'color',
      description: 'Secondary gray color',
      usage: ['text', 'borders']
    },
    {
      name: 'font-size-large',
      value: '18px',
      category: 'typography',
      description: 'Large font size for headings',
      usage: ['h2', 'large-text']
    },
    {
      name: 'spacing-medium',
      value: '16px',
      category: 'spacing',
      description: 'Medium spacing value',
      usage: ['padding', 'margin']
    }
  ];

  const sampleComponents: Component[] = [
    {
      name: 'Button',
      description: 'Primary button component',
      category: 'form',
      props: [
        {
          name: 'variant',
          type: 'string',
          required: false,
          default: 'primary',
          description: 'Button variant style'
        },
        {
          name: 'size',
          type: 'string',
          required: false,
          default: 'medium',
          description: 'Button size'
        }
      ],
      variants: [
        {
          name: 'primary',
          props: { variant: 'primary' },
          description: 'Primary button style'
        },
        {
          name: 'secondary',
          props: { variant: 'secondary' },
          description: 'Secondary button style'
        }
      ],
      examples: [
        {
          title: 'Basic Button',
          description: 'Simple button example',
          code: '<Button>Click me</Button>',
          language: 'jsx'
        },
        {
          title: 'Secondary Button',
          description: 'Secondary button example',
          code: '<Button variant="secondary">Cancel</Button>',
          language: 'jsx'
        }
      ],
      guidelines: ['Use for primary actions', 'Ensure proper contrast'],
      accessibility: {
        ariaLabels: ['button'],
        keyboardNavigation: 'Tab to focus, Enter/Space to activate'
      }
    },
    {
      name: 'Input',
      description: 'Text input component',
      category: 'form',
      props: [
        {
          name: 'placeholder',
          type: 'string',
          required: false,
          description: 'Input placeholder text'
        },
        {
          name: 'disabled',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Whether input is disabled'
        }
      ],
      variants: [
        {
          name: 'default',
          props: {},
          description: 'Default input style'
        }
      ],
      examples: [
        {
          title: 'Basic Input',
          description: 'Simple input example',
          code: '<Input placeholder="Enter text" />',
          language: 'jsx'
        }
      ],
      guidelines: ['Provide clear labels', 'Show validation states'],
      accessibility: {
        ariaLabels: ['textbox'],
        keyboardNavigation: 'Tab to focus, type to input'
      }
    }
  ];

  const sampleGuidelines: Guideline[] = [
    {
      id: 'color-usage',
      title: 'Color Usage Guidelines',
      category: 'design',
      content: 'Guidelines for using brand colors effectively in UI design.',
      tags: ['color', 'branding', 'accessibility'],
      lastUpdated: new Date('2024-01-01'),
      relatedTokens: ['primary-blue', 'secondary-gray'],
      relatedComponents: ['Button']
    },
    {
      id: 'typography-scale',
      title: 'Typography Scale',
      category: 'typography',
      content: 'Consistent typography scale for all text elements.',
      tags: ['typography', 'scale', 'hierarchy'],
      lastUpdated: new Date('2024-01-15'),
      relatedTokens: ['font-size-large']
    }
  ];

  beforeAll(async () => {
    testDataDir = TEST_DATA_DIR;
    
    // Create test data directory
    await mkdir(testDataDir, { recursive: true });
    
    // Write sample data files
    await writeFile(
      join(testDataDir, 'design-tokens.json'),
      JSON.stringify(sampleDesignTokens, null, 2)
    );
    
    await writeFile(
      join(testDataDir, 'components.json'),
      JSON.stringify(sampleComponents, null, 2)
    );
    
    // Convert dates to ISO strings for JSON serialization
    const guidelinesForJson = sampleGuidelines.map(guideline => ({
      ...guideline,
      lastUpdated: guideline.lastUpdated.toISOString()
    }));
    
    await writeFile(
      join(testDataDir, 'guidelines.json'),
      JSON.stringify(guidelinesForJson, null, 2)
    );
  });

  beforeEach(async () => {
    // Restore original data files before each test
    await writeFile(
      join(testDataDir, 'design-tokens.json'),
      JSON.stringify(sampleDesignTokens, null, 2)
    );
    
    await writeFile(
      join(testDataDir, 'components.json'),
      JSON.stringify(sampleComponents, null, 2)
    );
    
    const guidelinesForJson = sampleGuidelines.map(guideline => ({
      ...guideline,
      lastUpdated: guideline.lastUpdated.toISOString()
    }));
    
    await writeFile(
      join(testDataDir, 'guidelines.json'),
      JSON.stringify(guidelinesForJson, null, 2)
    );

    // Create fresh instances for each test
    const dataManager = new DataManager({
      dataPath: testDataDir,
      enableFileWatching: true,
      cacheTimeout: 60000 // 1 minute for tests
    });

    // Initialize data manager
    await dataManager.initialize();

    services = {
      dataManager,
      designTokenService: new DesignTokenService(dataManager),
      componentService: new ComponentService(dataManager),
      guidelinesService: new GuidelinesService(dataManager)
    };
  });

  afterEach(async () => {
    // Cleanup data manager
    if (services?.dataManager) {
      await services.dataManager.destroy();
    }
  });

  afterAll(async () => {
    // Clean up test data directory
    try {
      await rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End Service Integration', () => {
    describe('Complete Tool Call Workflows', () => {
      describe('Design Token Workflows', () => {
        it('should complete full design token discovery workflow', async () => {
          // Step 1: Get all token categories
          const categories = await services.designTokenService.getTokenCategories();
          expect(categories).toContain('color');
          expect(categories).toContain('typography');
          expect(categories).toContain('spacing');
          
          // Step 2: Get tokens by category
          const colorTokens = await services.designTokenService.getTokensByCategory('color');
          expect(colorTokens).toHaveLength(2);
          expect(colorTokens[0].category).toBe('color');
          
          // Step 3: Get specific token details
          const tokenDetails = await services.designTokenService.getToken('primary-blue');
          expect(tokenDetails.name).toBe('primary-blue');
          expect(tokenDetails.value).toBe('#0066CC');
          expect(tokenDetails.usage).toContain('buttons');
        });

        it('should complete token search and discovery workflow', async () => {
          // Step 1: Search for blue tokens
          const blueTokens = await services.designTokenService.searchTokens('blue');
          expect(blueTokens).toHaveLength(1);
          expect(blueTokens[0].name).toBe('primary-blue');
          
          // Step 2: Search by value
          const valueTokens = await services.designTokenService.searchTokens('#0066CC');
          expect(valueTokens).toHaveLength(1);
          expect(valueTokens[0].value).toBe('#0066CC');
          
          // Step 3: Search by usage
          const usageTokens = await services.designTokenService.searchTokens('buttons');
          expect(usageTokens.length).toBeGreaterThan(0);
          expect(usageTokens[0].usage).toContain('buttons');
        });

        it('should handle token filtering and advanced queries', async () => {
          // Test category filtering
          const colorTokens = await services.designTokenService.getTokens({ category: 'color' });
          expect(colorTokens).toHaveLength(2);
          colorTokens.forEach(token => {
            expect(token.category).toBe('color');
          });

          // Test deprecated filtering
          const activeTokens = await services.designTokenService.getTokens({ deprecated: false });
          expect(activeTokens).toHaveLength(4); // All sample tokens are active

          // Test usage filtering
          const buttonTokens = await services.designTokenService.getTokens({ hasUsage: ['buttons'] });
          expect(buttonTokens.length).toBeGreaterThan(0);
          buttonTokens.forEach(token => {
            expect(token.usage).toContain('buttons');
          });
        });
      });

      describe('Component Workflows', () => {
        it('should complete full component discovery workflow', async () => {
          // Step 1: Get all components
          const components = await services.componentService.getComponents({});
          expect(components).toHaveLength(2);
          expect(components.map(c => c.name)).toContain('Button');
          expect(components.map(c => c.name)).toContain('Input');
          
          // Step 2: Get specific component details
          const buttonDetails = await services.componentService.getComponent('Button');
          expect(buttonDetails.name).toBe('Button');
          expect(buttonDetails.props).toHaveLength(2);
          expect(buttonDetails.variants).toHaveLength(2);
          
          // Step 3: Get component examples
          const examples = await services.componentService.getComponentExamples('Button');
          expect(examples).toHaveLength(2);
          expect(examples[0].code).toContain('<Button>');
        });

        it('should complete component search workflow', async () => {
          // Step 1: Search for form components
          const formComponents = await services.componentService.searchComponents('form');
          expect(formComponents).toHaveLength(2); // Both Button and Input are form components
          
          // Step 2: Search by specific component name
          const buttonComponents = await services.componentService.searchComponents('button');
          expect(buttonComponents).toHaveLength(1);
          expect(buttonComponents[0].name).toBe('Button');
        });

        it('should handle component filtering', async () => {
          // Test category filtering
          const formComponents = await services.componentService.getComponents({ category: 'form' });
          expect(formComponents).toHaveLength(2);
          formComponents.forEach(component => {
            expect(component.category).toBe('form');
          });

          // Test name filtering
          const buttonComponents = await services.componentService.getComponents({ name: 'Button' });
          expect(buttonComponents).toHaveLength(1);
          expect(buttonComponents[0].name).toBe('Button');
        });
      });

      describe('Guidelines Workflows', () => {
        it('should complete full guidelines discovery workflow', async () => {
          // Step 1: Get all guidelines
          const guidelines = await services.guidelinesService.getGuidelines({});
          expect(guidelines).toHaveLength(2);
          
          // Step 2: Get specific guideline details
          const guidelineDetails = await services.guidelinesService.getGuideline('color-usage');
          expect(guidelineDetails.id).toBe('color-usage');
          expect(guidelineDetails.relatedTokens).toContain('primary-blue');
          expect(guidelineDetails.relatedComponents).toContain('Button');
          
          // Step 3: Search guidelines
          const colorGuidelines = await services.guidelinesService.searchGuidelines('color');
          expect(colorGuidelines).toHaveLength(1);
          expect(colorGuidelines[0].id).toBe('color-usage');
        });

        it('should handle guideline filtering', async () => {
          // Test category filtering
          const designGuidelines = await services.guidelinesService.getGuidelines({ category: 'design' });
          expect(designGuidelines).toHaveLength(1);
          expect(designGuidelines[0].category).toBe('design');

          // Test typography guidelines
          const typographyGuidelines = await services.guidelinesService.getGuidelines({ category: 'typography' });
          expect(typographyGuidelines).toHaveLength(1);
          expect(typographyGuidelines[0].category).toBe('typography');
        });
      });

      describe('Cross-Resource Workflows', () => {
        it('should complete workflow linking tokens, components, and guidelines', async () => {
          // Step 1: Find color-related guideline
          const colorGuidelines = await services.guidelinesService.searchGuidelines('color');
          const colorGuideline = colorGuidelines[0];
          
          // Step 2: Get related tokens from the guideline
          const relatedTokenPromises = colorGuideline.relatedTokens!.map(tokenName =>
            services.designTokenService.getToken(tokenName)
          );
          
          const relatedTokens = await Promise.all(relatedTokenPromises);
          
          expect(relatedTokens).toHaveLength(2);
          expect(relatedTokens.map(t => t.name)).toContain('primary-blue');
          expect(relatedTokens.map(t => t.name)).toContain('secondary-gray');
          
          // Step 3: Get related components from the guideline
          const relatedComponentPromises = colorGuideline.relatedComponents!.map(componentName =>
            services.componentService.getComponent(componentName)
          );
          
          const relatedComponents = await Promise.all(relatedComponentPromises);
          
          expect(relatedComponents).toHaveLength(1);
          expect(relatedComponents[0].name).toBe('Button');
        });
      });
    });
  });

  describe('Concurrent Request Handling and Performance', () => {
    it('should handle multiple concurrent service calls efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple concurrent requests
      const concurrentRequests = [
        services.designTokenService.getTokens({ category: 'color' }),
        services.componentService.getComponents({}),
        services.guidelinesService.getGuidelines({}),
        services.designTokenService.searchTokens('blue'),
        services.componentService.searchComponents('button')
      ];
      
      // Execute all requests concurrently
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Verify all responses are valid
      expect(responses).toHaveLength(5);
      
      // Performance check - should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds max for 5 concurrent requests
      
      // Verify response content
      const [colorTokens, components, guidelines, blueTokens, buttonComponents] = responses;
      
      expect(colorTokens).toHaveLength(2);
      expect(components).toHaveLength(2);
      expect(guidelines).toHaveLength(2);
      expect(blueTokens).toHaveLength(1);
      expect(buttonComponents).toHaveLength(1);
    });

    it('should handle high-frequency requests without degradation', async () => {
      const requestCount = 20;
      const requests: Promise<any>[] = [];
      
      // Create many rapid requests
      for (let i = 0; i < requestCount; i++) {
        requests.push(services.designTokenService.getTokenCategories());
      }
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All requests should succeed
      expect(responses).toHaveLength(requestCount);
      responses.forEach(response => {
        expect(Array.isArray(response)).toBe(true);
        expect(response.length).toBeGreaterThan(0);
      });
      
      // Performance should remain reasonable
      const averageTime = totalTime / requestCount;
      expect(averageTime).toBeLessThan(100); // Average less than 100ms per request
    });

    it('should handle mixed valid and invalid requests concurrently', async () => {
      const mixedRequests = [
        // Valid requests
        services.designTokenService.getTokens({}),
        services.componentService.getComponents({}),
        // Invalid requests
        services.designTokenService.getToken('non-existent-token').catch(error => ({ error: error.message })),
        services.componentService.getComponent('non-existent-component').catch(error => ({ error: error.message })),
        // More valid requests
        services.guidelinesService.getGuidelines({})
      ];
      
      const responses = await Promise.all(mixedRequests);
      
      // Check that valid requests succeeded
      expect(Array.isArray(responses[0])).toBe(true);
      expect(Array.isArray(responses[1])).toBe(true);
      expect(Array.isArray(responses[4])).toBe(true);
      
      // Check that invalid requests failed appropriately
      expect(responses[2]).toHaveProperty('error');
      expect(responses[3]).toHaveProperty('error');
      
      // Verify valid responses contain expected data
      expect(responses[0]).toHaveLength(4); // All tokens
      expect(responses[1]).toHaveLength(2); // All components
      expect(responses[4]).toHaveLength(2); // All guidelines
    });
  });

  describe('File Watching and Cache Invalidation', () => {
    it('should detect and reload data when design tokens file changes', async () => {
      // Get initial token count
      const initialTokens = await services.designTokenService.getTokens({});
      expect(initialTokens).toHaveLength(4);
      
      // Add a new token to the file
      const updatedTokens = [
        ...sampleDesignTokens,
        {
          name: 'new-token',
          value: '#FF0000',
          category: 'color',
          description: 'New red token'
        }
      ];
      
      await writeFile(
        join(testDataDir, 'design-tokens.json'),
        JSON.stringify(updatedTokens, null, 2)
      );
      
      // Wait for file watcher to detect change and reload data
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 4000); // Longer fallback timeout
        services.dataManager.once('dataUpdated', () => {
          clearTimeout(timeout);
          resolve(undefined);
        });
      });
      
      // Verify the new token is available
      const updatedTokensResult = await services.designTokenService.getTokens({});
      expect(updatedTokensResult).toHaveLength(5);
      
      const newToken = updatedTokensResult.find(t => t.name === 'new-token');
      expect(newToken).toBeDefined();
      expect(newToken!.value).toBe('#FF0000');
    }, 10000);

    it('should detect and reload data when components file changes', async () => {
      // Get initial component count
      const initialComponents = await services.componentService.getComponents({});
      expect(initialComponents).toHaveLength(2);
      
      // Add a new component to the file
      const updatedComponents = [
        ...sampleComponents,
        {
          name: 'Card',
          description: 'Card component for content display',
          category: 'layout',
          props: [
            {
              name: 'title',
              type: 'string',
              required: false,
              description: 'Card title'
            }
          ],
          variants: [
            {
              name: 'default',
              props: {},
              description: 'Default card style'
            }
          ],
          examples: [
            {
              title: 'Basic Card',
              description: 'Simple card example',
              code: '<Card title="Example">Content</Card>',
              language: 'jsx'
            }
          ],
          guidelines: ['Use for grouping related content'],
          accessibility: {
            ariaLabels: ['article'],
            keyboardNavigation: 'Tab to focus'
          }
        }
      ];
      
      await writeFile(
        join(testDataDir, 'components.json'),
        JSON.stringify(updatedComponents, null, 2)
      );
      
      // Wait for file watcher to detect change and reload data
      await new Promise(resolve => {
        services.dataManager.once('dataUpdated', resolve);
        setTimeout(resolve, 2000); // Fallback timeout
      });
      
      // Verify the new component is available
      const updatedComponentsResult = await services.componentService.getComponents({});
      expect(updatedComponentsResult).toHaveLength(3);
      
      const newComponent = updatedComponentsResult.find(c => c.name === 'Card');
      expect(newComponent).toBeDefined();
      expect(newComponent!.category).toBe('layout');
    });

    it('should detect and reload data when guidelines file changes', async () => {
      // Get initial guideline count
      const initialGuidelines = await services.guidelinesService.getGuidelines({});
      expect(initialGuidelines).toHaveLength(2);
      
      // Add a new guideline to the file
      const updatedGuidelines = [
        ...sampleGuidelines.map(g => ({
          ...g,
          lastUpdated: g.lastUpdated.toISOString()
        })),
        {
          id: 'spacing-guidelines',
          title: 'Spacing Guidelines',
          category: 'layout',
          content: 'Guidelines for consistent spacing in layouts.',
          tags: ['spacing', 'layout', 'consistency'],
          lastUpdated: new Date().toISOString(),
          relatedTokens: ['spacing-medium']
        }
      ];
      
      await writeFile(
        join(testDataDir, 'guidelines.json'),
        JSON.stringify(updatedGuidelines, null, 2)
      );
      
      // Wait for file watcher to detect change and reload data
      await new Promise(resolve => {
        services.dataManager.once('dataUpdated', resolve);
        setTimeout(resolve, 2000); // Fallback timeout
      });
      
      // Verify the new guideline is available
      const updatedGuidelinesResult = await services.guidelinesService.getGuidelines({});
      expect(updatedGuidelinesResult).toHaveLength(3);
      
      const newGuideline = updatedGuidelinesResult.find(g => g.id === 'spacing-guidelines');
      expect(newGuideline).toBeDefined();
      expect(newGuideline!.category).toBe('layout');
    });

    it('should handle file deletion gracefully', async () => {
      // Verify initial state
      const initialTokens = await services.designTokenService.getTokens({});
      expect(initialTokens).toHaveLength(4);
      
      // Delete the design tokens file
      await rm(join(testDataDir, 'design-tokens.json'));
      
      // Wait for file watcher to detect change
      await new Promise(resolve => {
        services.dataManager.once('dataError', resolve);
        setTimeout(resolve, 2000); // Fallback timeout
      });
      
      // Requests should still work with cached data or handle gracefully
      try {
        const tokens = await services.designTokenService.getTokens({});
        // Should either return cached data or empty array
        expect(Array.isArray(tokens)).toBe(true);
      } catch (error) {
        // Error should be properly handled
        expect(error).toHaveProperty('message');
      }
    });

    it('should handle invalid JSON in data files gracefully', async () => {
      // Write invalid JSON to design tokens file
      await writeFile(
        join(testDataDir, 'design-tokens.json'),
        '{ invalid json content'
      );
      
      // Wait for file watcher to detect change
      await new Promise(resolve => {
        services.dataManager.once('dataError', resolve);
        setTimeout(resolve, 2000); // Fallback timeout
      });
      
      // Requests should handle the error gracefully
      try {
        const tokens = await services.designTokenService.getTokens({});
        // Should either return cached data or handle gracefully
        expect(Array.isArray(tokens)).toBe(true);
      } catch (error) {
        // Error should be properly formatted
        expect(error).toHaveProperty('message');
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service errors gracefully during concurrent requests', async () => {
      // Create requests that will cause various types of errors
      const errorRequests = [
        services.designTokenService.getToken('non-existent-token').catch(error => ({ error: error.message })),
        services.componentService.getComponent('non-existent-component').catch(error => ({ error: error.message })),
        services.guidelinesService.getGuideline('non-existent-guideline').catch(error => ({ error: error.message })),
        services.designTokenService.searchTokens('').catch(error => ({ error: error.message })),
        services.componentService.searchComponents('').catch(error => ({ error: error.message }))
      ];
      
      const responses = await Promise.all(errorRequests);
      
      // All requests should have handled errors gracefully
      responses.forEach(response => {
        expect(response).toHaveProperty('error');
        expect(typeof response.error).toBe('string');
      });
    });

    it('should maintain service availability during data reload errors', async () => {
      // First, ensure services are working
      const workingTokens = await services.designTokenService.getTokens({});
      expect(workingTokens).toHaveLength(4);
      
      // Corrupt the data file
      await writeFile(
        join(testDataDir, 'design-tokens.json'),
        'invalid json'
      );
      
      // Wait for error to be detected
      await new Promise(resolve => {
        services.dataManager.once('dataError', resolve);
        setTimeout(resolve, 2000);
      });
      
      // Services should still respond (with cached data or graceful error)
      try {
        const postErrorTokens = await services.designTokenService.getTokens({});
        expect(Array.isArray(postErrorTokens)).toBe(true);
      } catch (error) {
        expect(error).toHaveProperty('message');
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for common operations', async () => {
      const benchmarks = [
        {
          name: 'getTokens',
          operation: () => services.designTokenService.getTokens({}),
          maxTime: 100 // 100ms
        },
        {
          name: 'getComponents',
          operation: () => services.componentService.getComponents({}),
          maxTime: 100
        },
        {
          name: 'getGuidelines',
          operation: () => services.guidelinesService.getGuidelines({}),
          maxTime: 100
        },
        {
          name: 'searchTokens',
          operation: () => services.designTokenService.searchTokens('blue'),
          maxTime: 150 // Search operations can be slightly slower
        },
        {
          name: 'searchComponents',
          operation: () => services.componentService.searchComponents('button'),
          maxTime: 150
        }
      ];
      
      for (const benchmark of benchmarks) {
        const startTime = Date.now();
        
        const result = await benchmark.operation();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(Array.isArray(result) || typeof result === 'object').toBe(true);
        expect(duration).toBeLessThan(benchmark.maxTime);
      }
    });

    it('should handle large datasets efficiently', async () => {
      // Create a larger dataset for performance testing
      const largeTokens = [];
      for (let i = 0; i < 100; i++) {
        largeTokens.push({
          name: `token-${i}`,
          value: `#${i.toString(16).padStart(6, '0')}`,
          category: 'color',
          description: `Generated token ${i}`,
          usage: [`usage-${i}`]
        });
      }
      
      await writeFile(
        join(testDataDir, 'design-tokens.json'),
        JSON.stringify(largeTokens, null, 2)
      );
      
      // Manually reload data to ensure it's updated
      const loadResult = await services.dataManager.loadData();
      expect(loadResult.success).toBe(true);
      
      // Test performance with large dataset
      const startTime = Date.now();
      
      const tokens = await services.designTokenService.getTokens({});
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(tokens).toHaveLength(100);
      expect(duration).toBeLessThan(500); // Should handle 100 tokens in under 500ms
    });
  });
});