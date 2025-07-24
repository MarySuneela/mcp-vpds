/**
 * Unit tests for MCPServer class - MCP protocol compliance
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

describe('MCPServer', () => {
  let mcpServer: MCPServer;
  let mockDataManager: jest.Mocked<DataManager>;
  let mockDesignTokens: DesignToken[];
  let mockComponents: Component[];
  let mockGuidelines: Guideline[];

  beforeEach(() => {
    // Setup mock data
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
        name: 'font-size-large',
        value: '18px',
        category: 'typography',
        description: 'Large font size for headings'
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
          }
        ],
        variants: [
          {
            name: 'primary',
            props: { variant: 'primary' },
            description: 'Primary button style'
          }
        ],
        examples: [
          {
            title: 'Basic Button',
            description: 'Simple button example',
            code: '<Button>Click me</Button>',
            language: 'jsx'
          }
        ],
        guidelines: ['Use for primary actions'],
        accessibility: {
          ariaLabels: ['button'],
          keyboardNavigation: 'Tab to focus, Enter/Space to activate'
        }
      }
    ];

    mockGuidelines = [
      {
        id: 'color-usage',
        title: 'Color Usage Guidelines',
        category: 'design',
        content: 'Guidelines for using brand colors',
        tags: ['color', 'branding'],
        lastUpdated: new Date('2024-01-01'),
        relatedTokens: ['primary-blue']
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

    // Create MCPServer instance
    mcpServer = new MCPServer({
      name: 'test-server',
      version: '1.0.0',
      dataManager: mockDataManager
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Server Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(mcpServer.initialize()).resolves.not.toThrow();
      expect(mockDataManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('should throw error if data manager initialization fails', async () => {
      mockDataManager.initialize.mockResolvedValue({ 
        success: false, 
        errors: ['Failed to load data'] 
      });

      await expect(mcpServer.initialize()).rejects.toThrow('Failed to initialize data manager: Failed to load data');
    });

    it('should not reinitialize if already initialized', async () => {
      await mcpServer.initialize();
      await mcpServer.initialize();
      
      expect(mockDataManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('should return MCP Server instance', () => {
      const server = mcpServer.getServer();
      expect(server).toBeDefined();
      expect(typeof server.connect).toBe('function');
    });
  });

  describe('MCP Protocol Compliance', () => {
    beforeEach(async () => {
      await mcpServer.initialize();
    });

    describe('Tool Listing', () => {
      it('should handle ListToolsRequest and return all available tools', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(ListToolsRequestSchema.method);
        
        expect(handler).toBeDefined();
        
        const response = await handler!({
          method: 'tools/list',
          params: {}
        });

        expect(response).toHaveProperty('tools');
        expect(Array.isArray(response.tools)).toBe(true);
        expect(response.tools.length).toBeGreaterThan(0);

        // Verify tool structure
        const tool = response.tools[0];
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });

      it('should include all expected design system tools', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(ListToolsRequestSchema.method);
        const response = await handler!({
          method: 'tools/list',
          params: {}
        });

        const toolNames = response.tools.map((tool: any) => tool.name);
        
        // Design Token Tools
        expect(toolNames).toContain('get-design-tokens');
        expect(toolNames).toContain('search-design-tokens');
        expect(toolNames).toContain('get-design-token-details');
        expect(toolNames).toContain('get-design-token-categories');
        
        // Component Tools
        expect(toolNames).toContain('get-components');
        expect(toolNames).toContain('get-component-details');
        expect(toolNames).toContain('get-component-examples');
        expect(toolNames).toContain('search-components');
        
        // Guidelines Tools
        expect(toolNames).toContain('get-guidelines');
        expect(toolNames).toContain('get-guideline-details');
        expect(toolNames).toContain('search-guidelines');
      });
    });

    describe('Tool Call Handling', () => {
      let toolCallHandler: any;

      beforeEach(() => {
        const server = mcpServer.getServer();
        toolCallHandler = server['requestHandlers'].get(CallToolRequestSchema.method);
        expect(toolCallHandler).toBeDefined();
      });

      it('should handle valid tool calls', async () => {
        const response = await toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'get-design-tokens',
            arguments: {}
          }
        });

        expect(response).toHaveProperty('content');
        expect(Array.isArray(response.content)).toBe(true);
        expect(response.content[0]).toHaveProperty('type', 'text');
        expect(response.content[0]).toHaveProperty('text');
      });

      it('should throw McpError for unknown tools', async () => {
        await expect(toolCallHandler({
          method: 'tools/call',
          params: {
            name: 'unknown-tool',
            arguments: {}
          }
        })).rejects.toThrow(McpError);

        try {
          await toolCallHandler({
            method: 'tools/call',
            params: {
              name: 'unknown-tool',
              arguments: {}
            }
          });
        } catch (error) {
          expect(error).toBeInstanceOf(McpError);
          expect((error as McpError).code).toBe(ErrorCode.MethodNotFound);
          expect((error as McpError).message).toContain('Unknown tool: unknown-tool');
        }
      });

      it('should throw McpError when server not initialized', async () => {
        const uninitializedServer = new MCPServer({
          name: 'test-server',
          version: '1.0.0',
          dataManager: mockDataManager
        });

        const server = uninitializedServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);

        await expect(handler!({
          method: 'tools/call',
          params: {
            name: 'get-design-tokens',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });
    });
  });

  describe('Design Token Tools', () => {
    beforeEach(async () => {
      await mcpServer.initialize();
    });

    describe('get-design-tokens', () => {
      it('should return all tokens when no category specified', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
          method: 'tools/call',
          params: {
            name: 'get-design-tokens',
            arguments: {}
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.tokens).toHaveLength(2);
        expect(result.count).toBe(2);
        expect(result.category).toBe('all');
      });

      it('should filter tokens by category', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
          method: 'tools/call',
          params: {
            name: 'get-design-tokens',
            arguments: { category: 'color' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0].name).toBe('primary-blue');
        expect(result.category).toBe('color');
      });

      it('should handle missing data gracefully', async () => {
        mockDataManager.getCachedData.mockReturnValue(null);
        
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);

        await expect(handler!({
          method: 'tools/call',
          params: {
            name: 'get-design-tokens',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });
    });

    describe('search-design-tokens', () => {
      it('should search tokens by name', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
          method: 'tools/call',
          params: {
            name: 'search-design-tokens',
            arguments: { query: 'blue' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0].name).toBe('primary-blue');
        expect(result.query).toBe('blue');
      });

      it('should search tokens by value', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
          method: 'tools/call',
          params: {
            name: 'search-design-tokens',
            arguments: { query: '18px' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.tokens).toHaveLength(1);
        expect(result.tokens[0].name).toBe('font-size-large');
      });

      it('should require query parameter', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);

        await expect(handler!({
          method: 'tools/call',
          params: {
            name: 'search-design-tokens',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });

      it('should validate query parameter type', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);

        await expect(handler!({
          method: 'tools/call',
          params: {
            name: 'search-design-tokens',
            arguments: { query: 123 }
          }
        })).rejects.toThrow(McpError);
      });
    });

    describe('get-design-token-details', () => {
      it('should return token details', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
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

      it('should require name parameter', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);

        await expect(handler!({
          method: 'tools/call',
          params: {
            name: 'get-design-token-details',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });

      it('should validate name parameter type', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);

        await expect(handler!({
          method: 'tools/call',
          params: {
            name: 'get-design-token-details',
            arguments: { name: 123 }
          }
        })).rejects.toThrow(McpError);
      });
    });

    describe('get-design-token-categories', () => {
      it('should return all token categories', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
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
        expect(result.categories).toContain('color');
        expect(result.categories).toContain('typography');
        expect(result.count).toBe(result.categories.length);
      });
    });
  });

  describe('Component Tools', () => {
    beforeEach(async () => {
      await mcpServer.initialize();
    });

    describe('get-components', () => {
      it('should return all components', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
          method: 'tools/call',
          params: {
            name: 'get-components',
            arguments: {}
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.components).toHaveLength(1);
        expect(result.components[0].name).toBe('Button');
        expect(result.count).toBe(1);
      });
    });

    describe('get-component-details', () => {
      it('should return component details', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
          method: 'tools/call',
          params: {
            name: 'get-component-details',
            arguments: { name: 'Button' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.name).toBe('Button');
        expect(result.description).toBe('Primary button component');
        expect(result.props).toHaveLength(1);
      });

      it('should require name parameter', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);

        await expect(handler!({
          method: 'tools/call',
          params: {
            name: 'get-component-details',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });
    });

    describe('get-component-examples', () => {
      it('should return component examples', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
          method: 'tools/call',
          params: {
            name: 'get-component-examples',
            arguments: { name: 'Button' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.component).toBe('Button');
        expect(result.examples).toHaveLength(1);
        expect(result.examples[0].title).toBe('Basic Button');
      });
    });

    describe('search-components', () => {
      it('should search components by query', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
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

  describe('Guidelines Tools', () => {
    beforeEach(async () => {
      await mcpServer.initialize();
    });

    describe('get-guidelines', () => {
      it('should return all guidelines', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
          method: 'tools/call',
          params: {
            name: 'get-guidelines',
            arguments: {}
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.guidelines).toHaveLength(1);
        expect(result.guidelines[0].id).toBe('color-usage');
        expect(result.count).toBe(1);
      });
    });

    describe('get-guideline-details', () => {
      it('should return guideline details', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
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

      it('should require id parameter', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);

        await expect(handler!({
          method: 'tools/call',
          params: {
            name: 'get-guideline-details',
            arguments: {}
          }
        })).rejects.toThrow(McpError);
      });
    });

    describe('search-guidelines', () => {
      it('should search guidelines by query', async () => {
        const server = mcpServer.getServer();
        const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
        
        const response = await handler!({
          method: 'tools/call',
          params: {
            name: 'search-guidelines',
            arguments: { query: 'color' }
          }
        });

        const result = JSON.parse(response.content[0].text);
        expect(result.guidelines).toHaveLength(1);
        expect(result.guidelines[0].id).toBe('color-usage');
        expect(result.query).toBe('color');
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await mcpServer.initialize();
    });

    it('should handle service errors and convert to McpError', async () => {
      // Mock component service to throw an error
      const mockError = { code: 'COMPONENT_NOT_FOUND', message: 'Component not found' };
      jest.spyOn(mcpServer['componentService'], 'getComponent').mockRejectedValue(mockError);

      const server = mcpServer.getServer();
      const handler = server['requestHandlers'].get(CallToolRequestSchema.method);

      await expect(handler!({
        method: 'tools/call',
        params: {
          name: 'get-component-details',
          arguments: { name: 'NonExistent' }
        }
      })).rejects.toThrow(McpError);
    });

    it('should handle generic errors and convert to McpError', async () => {
      // Mock component service to throw a generic error
      jest.spyOn(mcpServer['componentService'], 'getComponent').mockRejectedValue(new Error('Generic error'));

      const server = mcpServer.getServer();
      const handler = server['requestHandlers'].get(CallToolRequestSchema.method);

      await expect(handler!({
        method: 'tools/call',
        params: {
          name: 'get-component-details',
          arguments: { name: 'Button' }
        }
      })).rejects.toThrow(McpError);
    });

    it('should handle unknown errors and convert to McpError', async () => {
      // Mock component service to throw a non-Error object
      jest.spyOn(mcpServer['componentService'], 'getComponent').mockRejectedValue('String error');

      const server = mcpServer.getServer();
      const handler = server['requestHandlers'].get(CallToolRequestSchema.method);

      await expect(handler!({
        method: 'tools/call',
        params: {
          name: 'get-component-details',
          arguments: { name: 'Button' }
        }
      })).rejects.toThrow(McpError);
    });
  });

  describe('Message Formatting', () => {
    beforeEach(async () => {
      await mcpServer.initialize();
    });

    it('should format responses according to MCP specification', async () => {
      const server = mcpServer.getServer();
      const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
      
      const response = await handler!({
        method: 'tools/call',
        params: {
          name: 'get-design-tokens',
          arguments: {}
        }
      });

      // Verify response structure matches MCP CallToolResult
      expect(response).toHaveProperty('content');
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content[0]).toHaveProperty('type');
      expect(response.content[0]).toHaveProperty('text');
      expect(response.content[0].type).toBe('text');
      expect(typeof response.content[0].text).toBe('string');

      // Verify content is valid JSON
      expect(() => JSON.parse(response.content[0].text)).not.toThrow();
    });

    it('should include proper metadata in responses', async () => {
      const server = mcpServer.getServer();
      const handler = server['requestHandlers'].get(CallToolRequestSchema.method);
      
      const response = await handler!({
        method: 'tools/call',
        params: {
          name: 'get-design-tokens',
          arguments: { category: 'color' }
        }
      });

      const result = JSON.parse(response.content[0].text);
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('category');
      expect(result.count).toBe(result.tokens.length);
    });
  });
});