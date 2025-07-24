#!/usr/bin/env node
/**
 * Command Line Interface for Visa Design System MCP Server
 */
import { Command } from 'commander';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { main as startServer } from './index.js';
import { loadConfiguration } from './config/index.js';
const program = new Command();
// Read package.json for version
async function getPackageVersion() {
    try {
        const packagePath = join(process.cwd(), 'package.json');
        const packageContent = await readFile(packagePath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        return packageJson.version || '1.0.0';
    }
    catch {
        return '1.0.0';
    }
}
/**
 * Start server command
 */
async function startCommand(options) {
    try {
        // Set environment variables from CLI options
        if (options.config) {
            process.env.MCP_CONFIG_FILE = options.config;
        }
        if (options.dataPath) {
            process.env.MCP_DATA_PATH = options.dataPath;
        }
        if (options.logLevel) {
            process.env.MCP_LOG_LEVEL = options.logLevel;
        }
        if (options.port) {
            process.env.MCP_SERVER_PORT = options.port;
        }
        if (options.enableHttp !== undefined) {
            process.env.MCP_ENABLE_HTTP = options.enableHttp.toString();
        }
        if (options.enableFileWatching !== undefined) {
            process.env.MCP_ENABLE_FILE_WATCHING = options.enableFileWatching.toString();
        }
        if (options.verbose) {
            process.env.MCP_LOG_LEVEL = 'debug';
            process.env.MCP_ENABLE_REQUEST_LOGGING = 'true';
        }
        // Start the server
        await startServer();
    }
    catch (error) {
        console.error('Failed to start server:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}
/**
 * Validate configuration command
 */
async function validateConfigCommand(options) {
    try {
        const configFilePath = options.config || process.env.MCP_CONFIG_FILE;
        const { config, validation } = await loadConfiguration(configFilePath);
        console.log('Configuration Validation Results:');
        console.log('================================');
        if (validation.valid) {
            console.log('✅ Configuration is valid');
        }
        else {
            console.log('❌ Configuration has errors:');
            validation.errors?.forEach(error => console.log(`  - ${error}`));
        }
        if (validation.warnings && validation.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            validation.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        console.log('\nCurrent Configuration:');
        console.log('=====================');
        console.log(JSON.stringify(config, null, 2));
        if (!validation.valid) {
            process.exit(1);
        }
    }
    catch (error) {
        console.error('Failed to validate configuration:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}
/**
 * Show server status/health command
 */
async function statusCommand() {
    console.log('Server Status Check');
    console.log('==================');
    try {
        const { config } = await loadConfiguration();
        console.log(`Server Name: ${config.server.name}`);
        console.log(`Version: ${config.server.version}`);
        console.log(`Data Path: ${config.data.dataPath}`);
        console.log(`Log Level: ${config.server.logLevel}`);
        console.log(`File Watching: ${config.data.enableFileWatching ? 'enabled' : 'disabled'}`);
        console.log(`HTTP Server: ${config.server.enableHttp ? `enabled (port ${config.server.port})` : 'disabled'}`);
        // Check data directory accessibility
        try {
            const { DataManager } = await import('./utils/data-manager.js');
            const dataManager = new DataManager({
                dataPath: config.data.dataPath,
                enableFileWatching: false,
                cacheTimeout: config.data.cacheTimeout
            });
            const result = await dataManager.initialize();
            if (result.success) {
                console.log('✅ Data directory accessible and valid');
            }
            else {
                console.log('❌ Data directory issues:');
                result.errors?.forEach(error => console.log(`  - ${error}`));
            }
        }
        catch (error) {
            console.log('❌ Failed to check data directory:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    catch (error) {
        console.error('Failed to get server status:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}
/**
 * Initialize CLI program
 */
async function initializeCLI() {
    const version = await getPackageVersion();
    program
        .name('visa-design-system-mcp')
        .description('Visa Design System MCP Server - Provides AI tools access to design system resources')
        .version(version);
    // Start server command (default)
    program
        .command('start', { isDefault: true })
        .description('Start the MCP server')
        .option('-c, --config <path>', 'Path to configuration file')
        .option('-d, --data-path <path>', 'Path to design system data directory')
        .option('-l, --log-level <level>', 'Log level (error, warn, info, debug)', 'info')
        .option('-p, --port <port>', 'HTTP server port (if HTTP enabled)')
        .option('--enable-http', 'Enable HTTP server alongside stdio')
        .option('--disable-file-watching', 'Disable file watching for data updates')
        .option('-v, --verbose', 'Enable verbose logging (debug level)')
        .action(async (options) => {
        await startCommand({
            ...options,
            enableFileWatching: !options.disableFileWatching
        });
    });
    // Validate configuration command
    program
        .command('validate')
        .description('Validate server configuration')
        .option('-c, --config <path>', 'Path to configuration file')
        .action(validateConfigCommand);
    // Status/health check command
    program
        .command('status')
        .description('Show server status and health information')
        .action(statusCommand);
    // Version command (already handled by commander)
    // Help command (already handled by commander)
    await program.parseAsync();
}
// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    initializeCLI().catch((error) => {
        console.error('CLI failed:', error);
        process.exit(1);
    });
}
export { initializeCLI };
//# sourceMappingURL=cli.js.map