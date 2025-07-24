#!/usr/bin/env node
/**
 * Visa Design System MCP Server
 * Entry point for the MCP server with graceful shutdown and health monitoring
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from 'http';
import { MCPServer } from './mcp-server.js';
import { DataManager } from './utils/data-manager.js';
import { loadConfiguration } from './config/index.js';
import { logger } from './utils/logger.js';
let serverInstance = null;
let isShuttingDown = false;
/**
 * Create HTTP health check server
 */
function createHealthCheckServer(port, mcpServer) {
    const server = createServer((req, res) => {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }
        const url = new URL(req.url || '/', `http://localhost:${port}`);
        switch (url.pathname) {
            case '/health':
                handleHealthCheck(res, mcpServer);
                break;
            case '/status':
                handleStatusCheck(res, mcpServer);
                break;
            case '/metrics':
                handleMetrics(res, mcpServer);
                break;
            default:
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
        }
    });
    return server;
}
/**
 * Handle health check endpoint
 */
function handleHealthCheck(res, mcpServer) {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0'
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health, null, 2));
    }
    catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
        }));
    }
}
/**
 * Handle status check endpoint
 */
function handleStatusCheck(res, mcpServer) {
    try {
        const status = {
            server: {
                name: 'visa-design-system-mcp',
                version: process.env.npm_package_version || '1.0.0',
                uptime: process.uptime(),
                pid: process.pid
            },
            system: {
                platform: process.platform,
                nodeVersion: process.version,
                memory: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            },
            timestamp: new Date().toISOString()
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status, null, 2));
    }
    catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error'
        }));
    }
}
/**
 * Handle metrics endpoint
 */
function handleMetrics(res, mcpServer) {
    try {
        const metrics = {
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics, null, 2));
    }
    catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error'
        }));
    }
}
/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown() {
    const shutdown = async (signal) => {
        if (isShuttingDown) {
            logger.warn('Shutdown already in progress, forcing exit');
            process.exit(1);
        }
        isShuttingDown = true;
        logger.info(`Received ${signal}, starting graceful shutdown...`);
        try {
            if (serverInstance) {
                // Close HTTP server if running
                if (serverInstance.httpServer) {
                    logger.info('Closing HTTP server...');
                    await new Promise((resolve, reject) => {
                        serverInstance.httpServer.close((err) => {
                            if (err)
                                reject(err);
                            else
                                resolve();
                        });
                    });
                    logger.info('HTTP server closed');
                }
                // Close MCP transport
                if (serverInstance.transport) {
                    logger.info('Closing MCP transport...');
                    // Note: StdioServerTransport doesn't have a close method in current SDK
                    // This is a placeholder for future SDK versions
                }
                // Cleanup data manager
                logger.info('Cleaning up data manager...');
                // DataManager cleanup would go here if needed
                logger.info('Graceful shutdown completed');
            }
            process.exit(0);
        }
        catch (error) {
            logger.error('Error during shutdown:', undefined, error instanceof Error ? error : new Error(String(error)));
            process.exit(1);
        }
    };
    // Handle various shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception:', undefined, error);
        shutdown('uncaughtException');
    });
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled promise rejection:', { reason: String(reason) });
        shutdown('unhandledRejection');
    });
}
/**
 * Main server startup function
 */
async function main() {
    try {
        // Setup graceful shutdown before starting anything
        setupGracefulShutdown();
        // Load configuration from environment variables and optional config file
        const configFilePath = process.env.MCP_CONFIG_FILE;
        const { config, validation } = await loadConfiguration(configFilePath);
        // Configure logger with loaded configuration
        logger.setLevel(config.server.logLevel);
        // Log configuration validation results
        if (validation.warnings && validation.warnings.length > 0) {
            logger.warn('Configuration warnings:');
            validation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
        }
        if (!validation.valid) {
            logger.error('Configuration validation failed:');
            validation.errors?.forEach(error => logger.error(`  - ${error}`));
            process.exit(1);
        }
        logger.info('Starting Visa Design System MCP Server...');
        // Initialize data manager with configuration
        const dataManager = new DataManager({
            dataPath: config.data.dataPath,
            enableFileWatching: config.data.enableFileWatching,
            cacheTimeout: config.data.cacheTimeout
        });
        // Initialize MCP server with configuration
        const mcpServer = new MCPServer({
            name: config.server.name,
            version: config.server.version,
            dataManager,
            config
        });
        // Initialize the server and data
        logger.info('Initializing MCP server and loading data...');
        await mcpServer.initialize();
        // Store server instance for cleanup
        serverInstance = { mcpServer, dataManager };
        // Start HTTP server if enabled
        if (config.server.enableHttp) {
            logger.info(`Starting HTTP health check server on port ${config.server.port}...`);
            const httpServer = createHealthCheckServer(config.server.port, mcpServer);
            await new Promise((resolve, reject) => {
                httpServer.listen(config.server.port, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            serverInstance.httpServer = httpServer;
            logger.info(`HTTP server listening on port ${config.server.port}`);
            logger.info(`Health check: http://localhost:${config.server.port}/health`);
            logger.info(`Status endpoint: http://localhost:${config.server.port}/status`);
            logger.info(`Metrics endpoint: http://localhost:${config.server.port}/metrics`);
        }
        // Get the underlying MCP Server instance
        const server = mcpServer.getServer();
        // Initialize server transport
        logger.info('Connecting MCP server to stdio transport...');
        const transport = new StdioServerTransport();
        serverInstance.transport = transport;
        await server.connect(transport);
        // Log startup completion
        logger.info(`${config.server.name} v${config.server.version} started successfully`);
        logger.info(`Data path: ${config.data.dataPath}`);
        logger.info(`File watching: ${config.data.enableFileWatching ? 'enabled' : 'disabled'}`);
        logger.info(`Log level: ${config.server.logLevel}`);
        logger.info(`HTTP server: ${config.server.enableHttp ? `enabled (port ${config.server.port})` : 'disabled'}`);
        // Log to stderr for MCP clients (stdout is reserved for MCP protocol)
        console.error(`${config.server.name} v${config.server.version} started`);
        console.error(`Data path: ${config.data.dataPath}`);
        console.error(`File watching: ${config.data.enableFileWatching ? 'enabled' : 'disabled'}`);
        console.error(`Log level: ${config.server.logLevel}`);
    }
    catch (error) {
        logger.error('Failed to start server:', undefined, error instanceof Error ? error : new Error(String(error)));
        console.error('Failed to start server:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        logger.error('Server failed to start:', error);
        console.error('Server failed to start:', error);
        process.exit(1);
    });
}
export { main };
//# sourceMappingURL=index.js.map