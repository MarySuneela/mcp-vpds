/**
 * Comprehensive tests for MCP tool definitions and parameter validation
 */

import type { DesignToken, Component, Guideline } from '../src/types/index.js';

// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => {
    const requestHandlers = new Map();
    return {
      setRequestHandler: jest.fn((schema, handler) => {
        requestHandlers.set(schema.method, handler);
      }),
      connect: jest.fn(),
      requestHandlers
    };
  })
}));

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: { method: 'tools/call' },
  ListToolsRequestSchema: { method: 'tools/list' },
  ErrorCode: {
    InternalError: -32603,
    InvalidParams: -32602,
    MethodNotFound: -32601
  },
  McpError: class McpError extends Error {
    constructor(public code: number, message: string, public data?: any) {
      super(message);
      this.name = 'McpError';
    }
  }
}));

// Mock DataManager
jest.mock('../src/utils/data-manager.js');

import { MCPServer } from '../src/mcp-server.js';
import { DataManager } from '../src/utils/data-manager.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

describe('MCP Tool Definitions', () => {
  let mcpServer: MCPServer;
  let mockDataManager: jest.Mocked<DataManager>;
  let mockDesignTokens: DesignToken[];
  let mockComponents: Component[];
  let mockGuidelines: Guideline[];

  beforeEach(async () => {
    // Setup comprehensive mock data
    mockDesignTokens = [
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
        value: '#666666',
        category: 'color',
        description: 'Secondary gray color',
        usage: ['text', 'borders']
      },
      {
        name: 'font-size-large',
        value: '18px',
        category: 'typography',
        description: 'Large font size for headings'
      },
      {
        name: 'spacing-medium',
        value: 16,
        category: 'spacing',
        description: 'Medium spacing value'
      },
      {
        name: 'deprecated-token',
        value: '#FF0000',
        category: 'color',
        description: 'Deprecated color token',
        deprecated: true
      }
    ];

    mockComponents = [
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
            title: 'Primary Button',
            description: 'Primary variant button',
            code: '<Button variant="primary">Primary</Button>',
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
          }
        ],
        variants: [],
        examples: [
          {
            title: 'Basic Input',
            description: 'Simple input example',
            code: '<Input placeholder="Enter text" />',
            language: 'jsx'
          }
        ],
        guidelines: ['Provide clear labels'],
        accessibility: {
          ariaLabels: ['textbox']
        }
      }
    ];

    mockGuidelines = [
      {
        id: 'color-usage',
        title: 'Color Usage Guidelines',
        category: 'design',
        content: 'Guidelines for using brand colors effectively',
        tags: ['color', 'branding', 'accessibility'],
        lastUpdated: new Date('2024-01-01'),
        relatedTokens: ['primary-blue', 'secondary-gray'],
        relatedComponents: ['Button']
      },
      {
        id: 'typography-scale',
        title: 'Typography Scale',
        category: 'typography',
        content: 'Guidelines for typography hierarchy and scale',
        tags: ['typography', 'hierarchy'],
        lastUpdated: new Date('2024-01-15'),
        relatedTokens: ['font-size-large']
      },
      {
        id: 'spacing-system',
        title: 'Spacing System',
        category: 'layout',
        content: 'Guidelines for consistent spacing',
        tags: ['spacing', 'layout'],
        lastUpdated: new Date('2024-02-01'),
        relatedTokens: ['spacing-medium']
      }
    ];

    // Setup mock DataManager
    mockDataManager = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      getCachedData: jest.fn().mockReturnValue({
        designTokens: mockDesignTokens,
        components: mockComponents,
        guidelines: mockGuidelines
      }),
      loadData: jest.fn(),
      validateData: jest.fn(),
      watchFiles: jest.fn(),
      stopWatching: jest.fn()
    } as any;

    (DataManager as jest.MockedClass<typeof DataManager>).mockImplementation(() => mockDataManager);

    // Create and initialize MCPServer
    mcpServer = new MCPServer({
      name: 'test-server',
      version: '1.0.0',
      dataManager: mockDataManager
    });

    await mcpServer.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Definition Structure', () => {
    it('should define all required design token tools', async () => {
      const server = mcpServer.getServer();
      const handler = server['requestHandlers'].get(ListToolsRequestSchema.method);
      const response = await handler!({ method: 'tools/list', params: {} });

      const toolNames = response.tools.map((tool: any) => tool.name);
      
      // Design Token Tools
      expect(toolNames).toContain('get-design-tokens');
      expect(toolNames).toContain('search-design-tokens');
      expect(toolNames).toContain('get-design-token-details');
      expect(toolNames).toContain('get-design-token-categories');
    });

    it('should define all required component tools', async () => {
      const server = mcpServer.getServer();
      const handler = server['requestHandlers'].get(ListToolsRequestSchema.method);
      const response = await handler!({ method: 'tools/list', params: {} });

      const toolNames = response.tools.map((tool: any) => tool.name);
      
      // Component Tools
      expect(toolNames).toContain('get-components');
      expect(toolNames).toContain('get-component-details');
      expect(toolNames).toContain('get-component-examples');
      expect(toolNames).toContain('search-components');
    });

    it('should define all required guideline tools', async () => {
      const server = mcpServer.getServer();
      const handler = server['requestHandlers'].get(ListToolsRequestSchema.method);
      const response = await handler!({ method: 'tools/list', params: {} });

      const toolNames = response.tools.map((tool: any) => tool.name);
      
      // Guidelines Tools
      expect(toolNames).toContain('get-guidelines');
      expect(toolNames).toContain('get-guideline-details');
      expect(toolNames).toContain('search-guidelines');
    });

    it('should have proper tool schema structure', async () => {
      const server = mcpServer.getServer();
      const handler = server['requestHandlers'].get(ListToolsRequestSchema.method);
      const response = await handler!({ method: 'tools/list', params: {} });

      response.tools.forEach((tool: any) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
      });
    });
  });

  describe('Design Token Tool Parameter Validation', () => {
    let toolCallHandler: any;

    beforeEach(() => {
      const server = mcpServer.getServer();
      toolCallHandler = server['requestHandlers'].get(CallToolRequestSchema.method);
    });

    describe('get-design-tokens', () => {
      it('should accept valid category parameter', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-design-tokens',
            arguments: { category: 'color' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.tokens.every((token: any) => token.category === 'color')).toBe(true);
      });

      it('should accept deprecated parameter', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-design-tokens',
            arguments: { deprecated: true }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.tokens.every((token: any) => token.deprecated === true)).toBe(true);
      });

      it('should work without parameters', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-design-tokens',
            arguments: {}
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.tokens).toHaveLength(mockDesignTokens.length);
      });
    });

    describe('search-design-tokens', () => {
      it('should require query parameter', async () => {
        await expect(toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'search-design-tokens',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });

      it('should validate query parameter type', async () => {
        await expect(toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'search-design-tokens',
            arguments: { query: 123 }
          }
        })).rejects.toThrow(McpError);
      });

      it('should accept valid query parameter', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'search-design-tokens',
            arguments: { query: 'blue' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result).toHaveProperty('tokens');
        expect(result).toHaveProperty('query', 'blue');
      });
    });

    describe('get-design-token-details', () => {
      it('should require name parameter', async () => {
        await expect(toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-design-token-details',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });

      it('should validate name parameter type', async () => {
        await expect(toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-design-token-details',
            arguments: { name: 123 }
          }
        })).rejects.toThrow(McpError);
      });

      it('should return token details for valid name', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-design-token-details',
            arguments: { name: 'primary-blue' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.name).toBe('primary-blue');
        expect(result.value).toBe('#0066CC');
        expect(result.category).toBe('color');
      });
    });

    describe('get-design-token-categories', () => {
      it('should work without parameters', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-design-token-categories',
            arguments: {}
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result).toHaveProperty('categories');
        expect(result).toHaveProperty('count');
        expect(Array.isArray(result.categories)).toBe(true);
      });
    });
  });

  describe('Component Tool Parameter Validation', () => {
    let toolCallHandler: any;

    beforeEach(() => {
      const server = mcpServer.getServer();
      toolCallHandler = server['requestHandlers'].get(CallToolRequestSchema.method);
    });

    describe('get-components', () => {
      it('should work without parameters', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-components',
            arguments: {}
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.components).toHaveLength(mockComponents.length);
      });

      it('should accept optional filtering parameters', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-components',
            arguments: { category: 'form' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.components.every((comp: any) => comp.category === 'form')).toBe(true);
      });
    });

    describe('get-component-details', () => {
      it('should require name parameter', async () => {
        await expect(toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-component-details',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });

      it('should return component details for valid name', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-component-details',
            arguments: { name: 'Button' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.name).toBe('Button');
        expect(result.description).toBe('Primary button component');
        expect(result.props).toHaveLength(2);
      });
    });

    describe('get-component-examples', () => {
      it('should require name parameter', async () => {
        await expect(toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-component-examples',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });

      it('should return component examples for valid name', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-component-examples',
            arguments: { name: 'Button' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.component).toBe('Button');
        expect(result.examples).toHaveLength(2);
        expect(result.examples[0].title).toBe('Basic Button');
      });
    });

    describe('search-components', () => {
      it('should require query parameter', async () => {
        await expect(toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'search-components',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });

      it('should return search results for valid query', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'search-components',
            arguments: { query: 'button' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.components).toHaveLength(1);
        expect(result.components[0].name).toBe('Button');
        expect(result.query).toBe('button');
      });
    });
  });

  describe('Guidelines Tool Parameter Validation', () => {
    let toolCallHandler: any;

    beforeEach(() => {
      const server = mcpServer.getServer();
      toolCallHandler = server['requestHandlers'].get(CallToolRequestSchema.method);
    });

    describe('get-guidelines', () => {
      it('should work without parameters', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-guidelines',
            arguments: {}
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.guidelines).toHaveLength(mockGuidelines.length);
      });

      it('should accept optional filtering parameters', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-guidelines',
            arguments: { category: 'design' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.guidelines.every((guide: any) => guide.category === 'design')).toBe(true);
      });
    });

    describe('get-guideline-details', () => {
      it('should require id parameter', async () => {
        await expect(toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-guideline-details',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });

      it('should return guideline details for valid id', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-guideline-details',
            arguments: { id: 'color-usage' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.id).toBe('color-usage');
        expect(result.title).toBe('Color Usage Guidelines');
        expect(result.category).toBe('design');
      });
    });

    describe('search-guidelines', () => {
      it('should require query parameter', async () => {
        await expect(toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'search-guidelines',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });

      it('should return search results for valid query', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'search-guidelines',
            arguments: { query: 'color' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.guidelines.length).toBeGreaterThan(0);
        expect(result.query).toBe('color');
      });
    });
  });

  describe('Error Handling in Tool Calls', () => {
    let toolCallHandler: any;

    beforeEach(() => {
      const server = mcpServer.getServer();
      toolCallHandler = server['requestHandlers'].get(CallToolRequestSchema.method);
    });

    it('should handle service errors gracefully', async () => {
      // Mock service to throw error
      mockDataManager.getCachedData.mockReturnValue(null);

      await expect(toolCallHandler({
        method: 'tools/call',
        params: {
          name: 'get-design-tokens',
          arguments: {}
        }
      })).rejects.toThrow(McpError);
    });

    it('should provide helpful error messages for invalid parameters', async () => {
      try {
        await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'search-design-tokens',
            arguments: { query: '' }
          }
        });
      } catch (error: any) {
        expect(error).toBeInstanceOf(McpError);
        expect(error.code).toBe(ErrorCode.InvalidParams);
        expect(error.message).toContain('Query parameter is required');
      }
    });

    it('should handle unknown tool names', async () => {
      await expect(toolCallHandler({
        method: 'tools/call',
        params: {
          name: 'unknown-tool',
          arguments: {}
        }
      })).rejects.toThrow(McpError);
    });
  });

  describe('Response Format Compliance', () => {
    let toolCallHandler: any;

    beforeEach(() => {
      const server = mcpServer.getServer();
      toolCallHandler = server['requestHandlers'].get(CallToolRequestSchema.method);
    });

    it('should return properly formatted MCP responses', async () => {
      const response = await toolCallHandler({
        method: 'tools/call',
        params: {
          name: 'get-design-tokens',
          arguments: {}
        }
      });

      // Verify MCP CallToolResult structure
      expect(response).toHaveProperty('content');
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content).toHaveLength(1);
      expect(response.content[0]).toHaveProperty('type', 'text');
      expect(response.content[0]).toHaveProperty('text');
      expect(typeof response.content[0].text).toBe('string');

      // Verify content is valid JSON
      expect(() => JSON.parse(response.content[0].text)).not.toThrow();
    });

    it('should include consistent metadata in responses', async () => {
      const tools = [
        { name: 'get-design-tokens', args: {} },
        { name: 'get-components', args: {} },
        { name: 'get-guidelines', args: {} }
      ];

      for (const tool of tools) {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: tool.args
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result).toHaveProperty('count');
        expect(typeof result.count).toBe('number');
      }
    });

    it('should handle search queries with consistent format', async () => {
      const searchTools = [
        { name: 'search-design-tokens', query: 'blue' },
        { name: 'search-components', query: 'button' },
        { name: 'search-guidelines', query: 'color' }
      ];

      for (const tool of searchTools) {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: tool.name,
            arguments: { query: tool.query }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result).toHaveProperty('query', tool.query);
        expect(result).toHaveProperty('count');
        expect(typeof result.count).toBe('number');
      }
    });
  });
});