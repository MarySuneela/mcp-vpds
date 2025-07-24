/**
 * MCPServer class implementing MCP specification for Visa Design System
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { DataManager } from './utils/data-manager.js';
import type { MCPServerConfiguration } from './config/index.js';
export interface MCPServerConfig {
    name: string;
    version: string;
    dataManager: DataManager;
    config?: MCPServerConfiguration;
}
export interface MCPServerError {
    code: ErrorCode;
    message: string;
    data?: any;
}
/**
 * MCP Server implementation for Visa Design System
 */
export declare class MCPServer {
    private server;
    private dataManager;
    private designTokenService;
    private componentService;
    private guidelinesService;
    private configuration?;
    private isInitialized;
    constructor(config: MCPServerConfig);
    /**
     * Initialize the MCP server and data manager
     */
    initialize(): Promise<void>;
    /**
     * Get the underlying MCP Server instance
     */
    getServer(): Server;
    /**
     * Setup MCP protocol handlers
     */
    private setupHandlers;
    /**
     * Get all available MCP tool definitions
     */
    private getToolDefinitions;
    /**
     * Handle MCP tool calls and route to appropriate services
     */
    private handleToolCall;
    /**
     * Handle get-design-tokens tool call
     */
    private handleGetDesignTokens;
    /**
     * Handle search-design-tokens tool call
     */
    private handleSearchDesignTokens;
    /**
     * Handle get-design-token-details tool call
     */
    private handleGetDesignTokenDetails;
    /**
     * Handle get-design-token-categories tool call
     */
    private handleGetDesignTokenCategories;
    /**
     * Handle get-components tool call
     */
    private handleGetComponents;
    /**
     * Handle get-component-details tool call
     */
    private handleGetComponentDetails;
    /**
     * Handle get-component-examples tool call
     */
    private handleGetComponentExamples;
    /**
     * Handle search-components tool call
     */
    private handleSearchComponents;
    /**
     * Handle get-guidelines tool call
     */
    private handleGetGuidelines;
    /**
     * Handle get-guideline-details tool call
     */
    private handleGetGuidelineDetails;
    /**
     * Handle search-guidelines tool call
     */
    private handleSearchGuidelines;
}
//# sourceMappingURL=mcp-server.d.ts.map