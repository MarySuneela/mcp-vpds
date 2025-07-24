/**
 * Configuration system for Visa Design System MCP Server
 * Supports environment variables, default values, and validation
 */
import { join } from 'path';
import { readFile, access } from 'fs/promises';
/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
    server: {
        name: 'visa-design-system-mcp',
        version: '1.0.0',
        port: 3000,
        enableHttp: false,
        logLevel: 'info',
        enableRequestLogging: false
    },
    data: {
        dataPath: join(process.cwd(), 'data'),
        enableFileWatching: true,
        cacheTimeout: 300000, // 5 minutes
        maxCacheSize: 100, // 100 MB
        enableValidation: true
    },
    security: {
        enableAuth: false,
        allowedOrigins: ['*'],
        rateLimitRpm: 1000
    },
    performance: {
        maxConcurrentRequests: 100,
        requestTimeout: 30000, // 30 seconds
        enableCompression: true,
        memoryWarningThreshold: 512 // 512 MB
    }
};
/**
 * Environment variable mappings
 */
const ENV_MAPPINGS = {
    // Server configuration
    'MCP_SERVER_NAME': 'server.name',
    'MCP_SERVER_VERSION': 'server.version',
    'MCP_SERVER_PORT': 'server.port',
    'MCP_ENABLE_HTTP': 'server.enableHttp',
    'MCP_LOG_LEVEL': 'server.logLevel',
    'MCP_ENABLE_REQUEST_LOGGING': 'server.enableRequestLogging',
    // Data configuration
    'MCP_DATA_PATH': 'data.dataPath',
    'MCP_ENABLE_FILE_WATCHING': 'data.enableFileWatching',
    'MCP_CACHE_TIMEOUT': 'data.cacheTimeout',
    'MCP_MAX_CACHE_SIZE': 'data.maxCacheSize',
    'MCP_ENABLE_VALIDATION': 'data.enableValidation',
    // Security configuration
    'MCP_ENABLE_AUTH': 'security.enableAuth',
    'MCP_API_KEY': 'security.apiKey',
    'MCP_ALLOWED_ORIGINS': 'security.allowedOrigins',
    'MCP_RATE_LIMIT_RPM': 'security.rateLimitRpm',
    // Performance configuration
    'MCP_MAX_CONCURRENT_REQUESTS': 'performance.maxConcurrentRequests',
    'MCP_REQUEST_TIMEOUT': 'performance.requestTimeout',
    'MCP_ENABLE_COMPRESSION': 'performance.enableCompression',
    'MCP_MEMORY_WARNING_THRESHOLD': 'performance.memoryWarningThreshold'
};
/**
 * Configuration loader and validator
 */
export class ConfigurationManager {
    config;
    configFilePath;
    constructor(configFilePath) {
        this.config = this.deepClone(DEFAULT_CONFIG);
        this.configFilePath = configFilePath;
    }
    /**
     * Load configuration from environment variables and optional config file
     */
    async loadConfiguration() {
        const errors = [];
        const warnings = [];
        try {
            // Load from config file if specified
            if (this.configFilePath) {
                const fileResult = await this.loadFromFile(this.configFilePath);
                if (!fileResult.success && fileResult.errors) {
                    errors.push(...fileResult.errors);
                }
                else if (fileResult.warnings) {
                    warnings.push(...fileResult.warnings);
                }
            }
            // Load from environment variables (overrides file config)
            this.loadFromEnvironment();
            // Validate the final configuration
            const validation = this.validateConfiguration();
            if (!validation.valid && validation.errors) {
                errors.push(...validation.errors);
            }
            if (validation.warnings) {
                warnings.push(...validation.warnings);
            }
            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        }
        catch (error) {
            return {
                valid: false,
                errors: [`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`]
            };
        }
    }
    /**
     * Get the current configuration
     */
    getConfiguration() {
        return this.deepClone(this.config);
    }
    /**
     * Get a specific configuration section
     */
    getServerConfig() {
        return { ...this.config.server };
    }
    getDataConfig() {
        return { ...this.config.data };
    }
    getSecurityConfig() {
        return { ...this.config.security };
    }
    getPerformanceConfig() {
        return { ...this.config.performance };
    }
    /**
     * Load configuration from a JSON file
     */
    async loadFromFile(filePath) {
        try {
            // Check if file exists
            try {
                await access(filePath);
            }
            catch {
                return {
                    success: false,
                    warnings: [`Configuration file not found: ${filePath}, using defaults`]
                };
            }
            const content = await readFile(filePath, 'utf-8');
            const fileConfig = JSON.parse(content);
            // Merge with current config
            this.config = this.deepMerge(this.config, fileConfig);
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                errors: [`Failed to load config file: ${error instanceof Error ? error.message : 'Unknown error'}`]
            };
        }
    }
    /**
     * Load configuration from environment variables
     */
    loadFromEnvironment() {
        for (const [envVar, configPath] of Object.entries(ENV_MAPPINGS)) {
            const value = process.env[envVar];
            if (value !== undefined) {
                this.setNestedValue(this.config, configPath, this.parseEnvValue(value));
            }
        }
    }
    /**
     * Parse environment variable value to appropriate type
     */
    parseEnvValue(value) {
        // Boolean values
        if (value.toLowerCase() === 'true')
            return true;
        if (value.toLowerCase() === 'false')
            return false;
        // Number values
        if (/^\d+$/.test(value))
            return parseInt(value, 10);
        if (/^\d+\.\d+$/.test(value))
            return parseFloat(value);
        // Array values (comma-separated)
        if (value.includes(',')) {
            return value.split(',').map(item => item.trim());
        }
        // String values
        return value;
    }
    /**
     * Set nested object value using dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
    }
    /**
     * Validate the configuration
     */
    validateConfiguration() {
        const errors = [];
        const warnings = [];
        // Validate server configuration
        if (!this.config.server.name || this.config.server.name.trim() === '') {
            errors.push('Server name cannot be empty');
        }
        if (!this.config.server.version || this.config.server.version.trim() === '') {
            errors.push('Server version cannot be empty');
        }
        if (this.config.server.port < 1 || this.config.server.port > 65535) {
            errors.push('Server port must be between 1 and 65535');
        }
        if (!['error', 'warn', 'info', 'debug'].includes(this.config.server.logLevel)) {
            errors.push('Log level must be one of: error, warn, info, debug');
        }
        // Validate data configuration
        if (!this.config.data.dataPath || this.config.data.dataPath.trim() === '') {
            errors.push('Data path cannot be empty');
        }
        if (this.config.data.cacheTimeout < 0) {
            errors.push('Cache timeout cannot be negative');
        }
        if (this.config.data.maxCacheSize < 1) {
            errors.push('Max cache size must be at least 1 MB');
        }
        // Validate security configuration
        if (this.config.security.rateLimitRpm < 1) {
            errors.push('Rate limit must be at least 1 request per minute');
        }
        if (this.config.security.enableAuth && !this.config.security.apiKey) {
            warnings.push('Authentication is enabled but no API key is configured');
        }
        // Validate performance configuration
        if (this.config.performance.maxConcurrentRequests < 1) {
            errors.push('Max concurrent requests must be at least 1');
        }
        if (this.config.performance.requestTimeout < 1000) {
            warnings.push('Request timeout is very low (< 1 second), this may cause issues');
        }
        if (this.config.performance.memoryWarningThreshold < 64) {
            warnings.push('Memory warning threshold is very low (< 64 MB)');
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }
    /**
     * Deep clone an object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object')
            return obj;
        if (obj instanceof Date)
            return new Date(obj.getTime());
        if (Array.isArray(obj))
            return obj.map(item => this.deepClone(item));
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }
    /**
     * Deep merge two objects
     */
    deepMerge(target, source) {
        const result = this.deepClone(target);
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                }
                else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }
}
/**
 * Create and load configuration
 */
export async function loadConfiguration(configFilePath) {
    const manager = new ConfigurationManager(configFilePath);
    const validation = await manager.loadConfiguration();
    const config = manager.getConfiguration();
    return { config, validation };
}
/**
 * Export default configuration for testing
 */
export { DEFAULT_CONFIG };
//# sourceMappingURL=index.js.map