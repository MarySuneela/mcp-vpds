/**
 * Configuration system for Visa Design System MCP Server
 * Supports environment variables, default values, and validation
 */
export interface ServerConfig {
    /** Server name for MCP identification */
    name: string;
    /** Server version */
    version: string;
    /** Port for HTTP server (if enabled) */
    port: number;
    /** Enable HTTP server alongside stdio */
    enableHttp: boolean;
    /** Log level for server operations */
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    /** Enable detailed request/response logging */
    enableRequestLogging: boolean;
}
export interface DataConfig {
    /** Path to design system data files */
    dataPath: string;
    /** Enable file watching for automatic updates */
    enableFileWatching: boolean;
    /** Cache timeout in milliseconds */
    cacheTimeout: number;
    /** Maximum cache size in MB */
    maxCacheSize: number;
    /** Enable data validation on load */
    enableValidation: boolean;
}
export interface SecurityConfig {
    /** Enable authentication (future feature) */
    enableAuth: boolean;
    /** API key for authentication (if enabled) */
    apiKey?: string;
    /** Allowed origins for CORS (if HTTP enabled) */
    allowedOrigins: string[];
    /** Rate limiting - requests per minute */
    rateLimitRpm: number;
}
export interface PerformanceConfig {
    /** Maximum concurrent requests */
    maxConcurrentRequests: number;
    /** Request timeout in milliseconds */
    requestTimeout: number;
    /** Enable response compression */
    enableCompression: boolean;
    /** Memory usage warning threshold in MB */
    memoryWarningThreshold: number;
}
export interface MCPServerConfiguration {
    server: ServerConfig;
    data: DataConfig;
    security: SecurityConfig;
    performance: PerformanceConfig;
}
/**
 * Default configuration values
 */
declare const DEFAULT_CONFIG: MCPServerConfiguration;
export interface ConfigValidationResult {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
}
/**
 * Configuration loader and validator
 */
export declare class ConfigurationManager {
    private config;
    private configFilePath?;
    constructor(configFilePath?: string);
    /**
     * Load configuration from environment variables and optional config file
     */
    loadConfiguration(): Promise<ConfigValidationResult>;
    /**
     * Get the current configuration
     */
    getConfiguration(): MCPServerConfiguration;
    /**
     * Get a specific configuration section
     */
    getServerConfig(): ServerConfig;
    getDataConfig(): DataConfig;
    getSecurityConfig(): SecurityConfig;
    getPerformanceConfig(): PerformanceConfig;
    /**
     * Load configuration from a JSON file
     */
    private loadFromFile;
    /**
     * Load configuration from environment variables
     */
    private loadFromEnvironment;
    /**
     * Parse environment variable value to appropriate type
     */
    private parseEnvValue;
    /**
     * Set nested object value using dot notation
     */
    private setNestedValue;
    /**
     * Validate the configuration
     */
    private validateConfiguration;
    /**
     * Deep clone an object
     */
    private deepClone;
    /**
     * Deep merge two objects
     */
    private deepMerge;
}
/**
 * Create and load configuration
 */
export declare function loadConfiguration(configFilePath?: string): Promise<{
    config: MCPServerConfiguration;
    validation: ConfigValidationResult;
}>;
/**
 * Export default configuration for testing
 */
export { DEFAULT_CONFIG };
//# sourceMappingURL=index.d.ts.map