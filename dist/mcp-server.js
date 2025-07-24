/**
 * MCPServer class implementing MCP specification for Visa Design System
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { ComponentService } from './services/component-service.js';
import { GuidelinesService } from './services/guidelines-service.js';
import { DesignTokenService } from './services/design-token-service.js';
/**
 * MCP Server implementation for Visa Design System
 */
export class MCPServer {
    server;
    dataManager;
    designTokenService;
    componentService;
    guidelinesService;
    configuration;
    isInitialized = false;
    constructor(config) {
        this.dataManager = config.dataManager;
        this.configuration = config.config;
        this.designTokenService = new DesignTokenService(this.dataManager);
        this.componentService = new ComponentService(this.dataManager);
        this.guidelinesService = new GuidelinesService(this.dataManager);
        // Initialize MCP Server
        this.server = new Server({
            name: config.name,
            version: config.version,
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    /**
     * Initialize the MCP server and data manager
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        // Initialize data manager
        const result = await this.dataManager.initialize();
        if (!result.success) {
            throw new Error(`Failed to initialize data manager: ${result.errors?.join(', ')}`);
        }
        this.isInitialized = true;
    }
    /**
     * Get the underlying MCP Server instance
     */
    getServer() {
        return this.server;
    }
    /**
     * Setup MCP protocol handlers
     */
    setupHandlers() {
        // Handle tool listing
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: this.getToolDefinitions()
            };
        });
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            return this.handleToolCall(request.params.name, request.params.arguments || {});
        });
    }
    /**
     * Get all available MCP tool definitions
     */
    getToolDefinitions() {
        return [
            // Design Token Tools
            {
                name: 'get-design-tokens',
                description: 'Get design tokens with optional category filtering',
                inputSchema: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            description: 'Filter tokens by category (color, typography, spacing, elevation, motion)',
                            enum: ['color', 'typography', 'spacing', 'elevation', 'motion']
                        },
                        deprecated: {
                            type: 'boolean',
                            description: 'Filter by deprecated status (true for deprecated, false for active)'
                        }
                    }
                }
            },
            {
                name: 'search-design-tokens',
                description: 'Search design tokens by name or value',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query for token names or values'
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'get-design-token-details',
                description: 'Get detailed information about a specific design token',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Design token name'
                        }
                    },
                    required: ['name']
                }
            },
            {
                name: 'get-design-token-categories',
                description: 'Get all available design token categories',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            },
            // Component Tools
            {
                name: 'get-components',
                description: 'Get all components with optional filtering',
                inputSchema: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            description: 'Filter components by category'
                        },
                        name: {
                            type: 'string',
                            description: 'Filter components by name (partial match)'
                        }
                    }
                }
            },
            {
                name: 'get-component-details',
                description: 'Get detailed information about a specific component',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Component name'
                        }
                    },
                    required: ['name']
                }
            },
            {
                name: 'get-component-examples',
                description: 'Get code examples for a specific component',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Component name'
                        }
                    },
                    required: ['name']
                }
            },
            {
                name: 'search-components',
                description: 'Search components by name, description, or other criteria',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query for components'
                        }
                    },
                    required: ['query']
                }
            },
            // Guidelines Tools
            {
                name: 'get-guidelines',
                description: 'Get design guidelines with optional category filtering',
                inputSchema: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            description: 'Filter guidelines by category'
                        }
                    }
                }
            },
            {
                name: 'get-guideline-details',
                description: 'Get detailed information about a specific guideline',
                inputSchema: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Guideline ID'
                        }
                    },
                    required: ['id']
                }
            },
            {
                name: 'search-guidelines',
                description: 'Search guidelines by content, title, or tags',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query for guidelines'
                        }
                    },
                    required: ['query']
                }
            }
        ];
    }
    /**
     * Handle MCP tool calls and route to appropriate services
     */
    async handleToolCall(toolName, args) {
        if (!this.isInitialized) {
            throw new McpError(ErrorCode.InternalError, 'Server not initialized');
        }
        try {
            switch (toolName) {
                // Design Token Tools
                case 'get-design-tokens':
                    return await this.handleGetDesignTokens(args);
                case 'search-design-tokens':
                    return await this.handleSearchDesignTokens(args);
                case 'get-design-token-details':
                    return await this.handleGetDesignTokenDetails(args);
                case 'get-design-token-categories':
                    return await this.handleGetDesignTokenCategories(args);
                // Component Tools
                case 'get-components':
                    return await this.handleGetComponents(args);
                case 'get-component-details':
                    return await this.handleGetComponentDetails(args);
                case 'get-component-examples':
                    return await this.handleGetComponentExamples(args);
                case 'search-components':
                    return await this.handleSearchComponents(args);
                // Guidelines Tools
                case 'get-guidelines':
                    return await this.handleGetGuidelines(args);
                case 'get-guideline-details':
                    return await this.handleGetGuidelineDetails(args);
                case 'search-guidelines':
                    return await this.handleSearchGuidelines(args);
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
            }
        }
        catch (error) {
            if (error instanceof McpError) {
                throw error;
            }
            // Handle service errors
            if (error && typeof error === 'object' && 'code' in error) {
                const serviceError = error;
                throw new McpError(ErrorCode.InternalError, serviceError.message || 'Service error occurred', error);
            }
            throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : 'Unknown error occurred');
        }
    }
    /**
     * Handle get-design-tokens tool call
     */
    async handleGetDesignTokens(args) {
        const tokens = await this.designTokenService.getTokens(args);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        tokens,
                        count: tokens.length,
                        category: args.category || 'all'
                    }, null, 2)
                }
            ]
        };
    }
    /**
     * Handle search-design-tokens tool call
     */
    async handleSearchDesignTokens(args) {
        const { query } = args;
        if (!query || typeof query !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'Query parameter is required and must be a string');
        }
        const tokens = await this.designTokenService.searchTokens(query);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        tokens,
                        count: tokens.length,
                        query
                    }, null, 2)
                }
            ]
        };
    }
    /**
     * Handle get-design-token-details tool call
     */
    async handleGetDesignTokenDetails(args) {
        const { name } = args;
        if (!name || typeof name !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'Design token name is required and must be a string');
        }
        const token = await this.designTokenService.getToken(name);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(token, null, 2)
                }
            ]
        };
    }
    /**
     * Handle get-design-token-categories tool call
     */
    async handleGetDesignTokenCategories(args) {
        const categories = await this.designTokenService.getTokenCategories();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        categories,
                        count: categories.length
                    }, null, 2)
                }
            ]
        };
    }
    /**
     * Handle get-components tool call
     */
    async handleGetComponents(args) {
        const components = await this.componentService.getComponents(args);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        components,
                        count: components.length,
                        filters: args
                    }, null, 2)
                }
            ]
        };
    }
    /**
     * Handle get-component-details tool call
     */
    async handleGetComponentDetails(args) {
        const { name } = args;
        if (!name || typeof name !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'Component name is required and must be a string');
        }
        const component = await this.componentService.getComponent(name);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(component, null, 2)
                }
            ]
        };
    }
    /**
     * Handle get-component-examples tool call
     */
    async handleGetComponentExamples(args) {
        const { name } = args;
        if (!name || typeof name !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'Component name is required and must be a string');
        }
        const examples = await this.componentService.getComponentExamples(name);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        component: name,
                        examples,
                        count: examples.length
                    }, null, 2)
                }
            ]
        };
    }
    /**
     * Handle search-components tool call
     */
    async handleSearchComponents(args) {
        const { query } = args;
        if (!query || typeof query !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'Query parameter is required and must be a string');
        }
        const components = await this.componentService.searchComponents(query);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        components,
                        count: components.length,
                        query
                    }, null, 2)
                }
            ]
        };
    }
    /**
     * Handle get-guidelines tool call
     */
    async handleGetGuidelines(args) {
        const guidelines = await this.guidelinesService.getGuidelines(args);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        guidelines,
                        count: guidelines.length,
                        filters: args
                    }, null, 2)
                }
            ]
        };
    }
    /**
     * Handle get-guideline-details tool call
     */
    async handleGetGuidelineDetails(args) {
        const { id } = args;
        if (!id || typeof id !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'Guideline ID is required and must be a string');
        }
        const guideline = await this.guidelinesService.getGuideline(id);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(guideline, null, 2)
                }
            ]
        };
    }
    /**
     * Handle search-guidelines tool call
     */
    async handleSearchGuidelines(args) {
        const { query } = args;
        if (!query || typeof query !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'Query parameter is required and must be a string');
        }
        const guidelines = await this.guidelinesService.searchGuidelines(query);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        guidelines,
                        count: guidelines.length,
                        query
                    }, null, 2)
                }
            ]
        };
    }
}
//# sourceMappingURL=mcp-server.js.map