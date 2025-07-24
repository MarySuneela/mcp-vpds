/**
 * Unit tests for configuration system
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  ConfigurationManager,
  loadConfiguration,
  DEFAULT_CONFIG,
  type MCPServerConfiguration,
  type ConfigValidationResult
} from '../src/config/index.js';

describe('ConfigurationManager', () => {
  let tempDir: string;
  let tempConfigFile: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = join(tmpdir(), `mcp-config-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    tempConfigFile = join(tempDir, 'test-config.json');

    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;

    // Clean up temporary files
    try {
      await unlink(tempConfigFile);
    } catch {
      // File might not exist, ignore error
    }
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const manager = new ConfigurationManager();
      const config = manager.getConfiguration();

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should accept optional config file path', () => {
      const manager = new ConfigurationManager('/path/to/config.json');
      expect(manager).toBeDefined();
    });
  });

  describe('loadConfiguration', () => {
    it('should load default configuration when no file or env vars', async () => {
      const manager = new ConfigurationManager();
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(manager.getConfiguration()).toEqual(DEFAULT_CONFIG);
    });

    it('should load configuration from file', async () => {
      const testConfig = {
        server: {
          name: 'test-server',
          port: 4000
        },
        data: {
          dataPath: '/custom/data/path'
        }
      };

      await writeFile(tempConfigFile, JSON.stringify(testConfig, null, 2));

      const manager = new ConfigurationManager(tempConfigFile);
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(true);
      const config = manager.getConfiguration();
      expect(config.server.name).toBe('test-server');
      expect(config.server.port).toBe(4000);
      expect(config.data.dataPath).toBe('/custom/data/path');
    });

    it('should handle missing config file gracefully', async () => {
      const manager = new ConfigurationManager('/nonexistent/config.json');
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Configuration file not found: /nonexistent/config.json, using defaults');
    });

    it('should handle invalid JSON in config file', async () => {
      await writeFile(tempConfigFile, 'invalid json content');

      const manager = new ConfigurationManager(tempConfigFile);
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('Failed to load config file');
    });

    it('should load configuration from environment variables', async () => {
      process.env.MCP_SERVER_NAME = 'env-server';
      process.env.MCP_SERVER_PORT = '5000';
      process.env.MCP_LOG_LEVEL = 'debug';
      process.env.MCP_ENABLE_FILE_WATCHING = 'false';
      process.env.MCP_CACHE_TIMEOUT = '600000';

      const manager = new ConfigurationManager();
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(true);
      const config = manager.getConfiguration();
      expect(config.server.name).toBe('env-server');
      expect(config.server.port).toBe(5000);
      expect(config.server.logLevel).toBe('debug');
      expect(config.data.enableFileWatching).toBe(false);
      expect(config.data.cacheTimeout).toBe(600000);
    });

    it('should prioritize environment variables over file config', async () => {
      const fileConfig = {
        server: {
          name: 'file-server',
          port: 4000
        }
      };

      await writeFile(tempConfigFile, JSON.stringify(fileConfig, null, 2));

      process.env.MCP_SERVER_NAME = 'env-server';
      process.env.MCP_SERVER_PORT = '5000';

      const manager = new ConfigurationManager(tempConfigFile);
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(true);
      const config = manager.getConfiguration();
      expect(config.server.name).toBe('env-server');
      expect(config.server.port).toBe(5000);
    });

    it('should parse array environment variables', async () => {
      process.env.MCP_ALLOWED_ORIGINS = 'http://localhost:3000,https://example.com,https://test.com';

      const manager = new ConfigurationManager();
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(true);
      const config = manager.getConfiguration();
      expect(config.security.allowedOrigins).toEqual([
        'http://localhost:3000',
        'https://example.com',
        'https://test.com'
      ]);
    });

    it('should parse boolean environment variables', async () => {
      process.env.MCP_ENABLE_HTTP = 'true';
      process.env.MCP_ENABLE_FILE_WATCHING = 'false';
      process.env.MCP_ENABLE_AUTH = 'TRUE';
      process.env.MCP_ENABLE_COMPRESSION = 'FALSE';

      const manager = new ConfigurationManager();
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(true);
      const config = manager.getConfiguration();
      expect(config.server.enableHttp).toBe(true);
      expect(config.data.enableFileWatching).toBe(false);
      expect(config.security.enableAuth).toBe(true);
      expect(config.performance.enableCompression).toBe(false);
    });

    it('should parse numeric environment variables', async () => {
      process.env.MCP_SERVER_PORT = '8080';
      process.env.MCP_CACHE_TIMEOUT = '900000';
      process.env.MCP_MAX_CACHE_SIZE = '200';

      const manager = new ConfigurationManager();
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(true);
      const config = manager.getConfiguration();
      expect(config.server.port).toBe(8080);
      expect(config.data.cacheTimeout).toBe(900000);
      expect(config.data.maxCacheSize).toBe(200);
    });
  });

  describe('configuration validation', () => {
    it('should validate server configuration', async () => {
      process.env.MCP_SERVER_NAME = '';
      process.env.MCP_SERVER_VERSION = '';
      process.env.MCP_SERVER_PORT = '70000';
      process.env.MCP_LOG_LEVEL = 'invalid';

      const manager = new ConfigurationManager();
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Server name cannot be empty');
      expect(result.errors).toContain('Server version cannot be empty');
      expect(result.errors).toContain('Server port must be between 1 and 65535');
      expect(result.errors).toContain('Log level must be one of: error, warn, info, debug');
    });

    it('should validate data configuration', async () => {
      process.env.MCP_DATA_PATH = '';
      process.env.MCP_CACHE_TIMEOUT = '-1000';
      process.env.MCP_MAX_CACHE_SIZE = '0';

      const manager = new ConfigurationManager();
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data path cannot be empty');
      expect(result.errors).toContain('Cache timeout cannot be negative');
      expect(result.errors).toContain('Max cache size must be at least 1 MB');
    });

    it('should validate security configuration', async () => {
      process.env.MCP_RATE_LIMIT_RPM = '0';
      process.env.MCP_ENABLE_AUTH = 'true';
      // Don't set API key to test warning

      const manager = new ConfigurationManager();
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rate limit must be at least 1 request per minute');
      expect(result.warnings).toContain('Authentication is enabled but no API key is configured');
    });

    it('should validate performance configuration', async () => {
      process.env.MCP_MAX_CONCURRENT_REQUESTS = '0';
      process.env.MCP_REQUEST_TIMEOUT = '500';
      process.env.MCP_MEMORY_WARNING_THRESHOLD = '32';

      const manager = new ConfigurationManager();
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Max concurrent requests must be at least 1');
      expect(result.warnings).toContain('Request timeout is very low (< 1 second), this may cause issues');
      expect(result.warnings).toContain('Memory warning threshold is very low (< 64 MB)');
    });

    it('should pass validation with valid configuration', async () => {
      process.env.MCP_SERVER_NAME = 'valid-server';
      process.env.MCP_SERVER_VERSION = '1.0.0';
      process.env.MCP_SERVER_PORT = '3000';
      process.env.MCP_LOG_LEVEL = 'info';
      process.env.MCP_DATA_PATH = '/valid/path';
      process.env.MCP_CACHE_TIMEOUT = '300000';
      process.env.MCP_MAX_CACHE_SIZE = '100';
      process.env.MCP_RATE_LIMIT_RPM = '1000';
      process.env.MCP_MAX_CONCURRENT_REQUESTS = '50';
      process.env.MCP_REQUEST_TIMEOUT = '30000';
      process.env.MCP_MEMORY_WARNING_THRESHOLD = '512';

      const manager = new ConfigurationManager();
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('configuration getters', () => {
    it('should return server configuration', async () => {
      const manager = new ConfigurationManager();
      await manager.loadConfiguration();

      const serverConfig = manager.getServerConfig();
      expect(serverConfig).toEqual(DEFAULT_CONFIG.server);
    });

    it('should return data configuration', async () => {
      const manager = new ConfigurationManager();
      await manager.loadConfiguration();

      const dataConfig = manager.getDataConfig();
      expect(dataConfig).toEqual(DEFAULT_CONFIG.data);
    });

    it('should return security configuration', async () => {
      const manager = new ConfigurationManager();
      await manager.loadConfiguration();

      const securityConfig = manager.getSecurityConfig();
      expect(securityConfig).toEqual(DEFAULT_CONFIG.security);
    });

    it('should return performance configuration', async () => {
      const manager = new ConfigurationManager();
      await manager.loadConfiguration();

      const performanceConfig = manager.getPerformanceConfig();
      expect(performanceConfig).toEqual(DEFAULT_CONFIG.performance);
    });

    it('should return cloned configurations to prevent mutation', async () => {
      const manager = new ConfigurationManager();
      await manager.loadConfiguration();

      const config1 = manager.getConfiguration();
      const config2 = manager.getConfiguration();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different object references

      // Mutate one config
      config1.server.name = 'modified';
      expect(config2.server.name).toBe(DEFAULT_CONFIG.server.name);
    });
  });

  describe('deep merge functionality', () => {
    it('should deep merge nested configuration objects', async () => {
      const partialConfig = {
        server: {
          name: 'partial-server'
          // port is missing, should use default
        },
        data: {
          dataPath: '/custom/path',
          enableFileWatching: false
          // other data config should use defaults
        }
        // security and performance sections missing, should use defaults
      };

      await writeFile(tempConfigFile, JSON.stringify(partialConfig, null, 2));

      const manager = new ConfigurationManager(tempConfigFile);
      const result = await manager.loadConfiguration();

      expect(result.valid).toBe(true);
      const config = manager.getConfiguration();

      // Should have merged values
      expect(config.server.name).toBe('partial-server');
      expect(config.data.dataPath).toBe('/custom/path');
      expect(config.data.enableFileWatching).toBe(false);

      // Should have default values for missing properties
      expect(config.server.port).toBe(DEFAULT_CONFIG.server.port);
      expect(config.data.cacheTimeout).toBe(DEFAULT_CONFIG.data.cacheTimeout);
      expect(config.security).toEqual(DEFAULT_CONFIG.security);
      expect(config.performance).toEqual(DEFAULT_CONFIG.performance);
    });
  });
});

describe('loadConfiguration helper function', () => {
  let tempDir: string;
  let tempConfigFile: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `mcp-config-helper-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    tempConfigFile = join(tempDir, 'helper-test-config.json');
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    process.env = originalEnv;
    try {
      await unlink(tempConfigFile);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should load configuration without config file', async () => {
    const result = await loadConfiguration();

    expect(result.config).toEqual(DEFAULT_CONFIG);
    expect(result.validation.valid).toBe(true);
  });

  it('should load configuration with config file', async () => {
    const testConfig = {
      server: {
        name: 'helper-test-server'
      }
    };

    await writeFile(tempConfigFile, JSON.stringify(testConfig, null, 2));

    const result = await loadConfiguration(tempConfigFile);

    expect(result.config.server.name).toBe('helper-test-server');
    expect(result.validation.valid).toBe(true);
  });

  it('should return validation errors', async () => {
    process.env.MCP_SERVER_NAME = '';

    const result = await loadConfiguration();

    expect(result.validation.valid).toBe(false);
    expect(result.validation.errors).toContain('Server name cannot be empty');
  });
});

describe('DEFAULT_CONFIG', () => {
  it('should have valid default configuration', () => {
    expect(DEFAULT_CONFIG.server.name).toBe('visa-design-system-mcp');
    expect(DEFAULT_CONFIG.server.version).toBe('1.0.0');
    expect(DEFAULT_CONFIG.server.port).toBe(3000);
    expect(DEFAULT_CONFIG.server.enableHttp).toBe(false);
    expect(DEFAULT_CONFIG.server.logLevel).toBe('info');
    expect(DEFAULT_CONFIG.server.enableRequestLogging).toBe(false);

    expect(DEFAULT_CONFIG.data.dataPath).toBe(join(process.cwd(), 'data'));
    expect(DEFAULT_CONFIG.data.enableFileWatching).toBe(true);
    expect(DEFAULT_CONFIG.data.cacheTimeout).toBe(300000);
    expect(DEFAULT_CONFIG.data.maxCacheSize).toBe(100);
    expect(DEFAULT_CONFIG.data.enableValidation).toBe(true);

    expect(DEFAULT_CONFIG.security.enableAuth).toBe(false);
    expect(DEFAULT_CONFIG.security.allowedOrigins).toEqual(['*']);
    expect(DEFAULT_CONFIG.security.rateLimitRpm).toBe(1000);

    expect(DEFAULT_CONFIG.performance.maxConcurrentRequests).toBe(100);
    expect(DEFAULT_CONFIG.performance.requestTimeout).toBe(30000);
    expect(DEFAULT_CONFIG.performance.enableCompression).toBe(true);
    expect(DEFAULT_CONFIG.performance.memoryWarningThreshold).toBe(512);
  });
});