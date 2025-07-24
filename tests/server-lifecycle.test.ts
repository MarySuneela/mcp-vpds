/**
 * Integration tests for server lifecycle management
 * Tests startup, shutdown, health checks, and CLI interface
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { writeFile, unlink, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';

describe('Server Lifecycle Integration Tests', () => {
  const testDataDir = join(process.cwd(), 'test-data-lifecycle');
  const testConfigPath = join(process.cwd(), 'test-config-lifecycle.json');
  let serverProcess: ChildProcess | null = null;

  beforeAll(async () => {
    // Create test data directory and files
    if (!existsSync(testDataDir)) {
      await mkdir(testDataDir, { recursive: true });
    }

    // Create minimal test data files
    await writeFile(join(testDataDir, 'design-tokens.json'), JSON.stringify([
      {
        name: 'color-primary',
        value: '#1a1a1a',
        category: 'color',
        description: 'Primary brand color'
      }
    ]));

    await writeFile(join(testDataDir, 'components.json'), JSON.stringify([
      {
        name: 'Button',
        category: 'form',
        description: 'Primary button component',
        props: [],
        variants: [],
        examples: [],
        guidelines: [],
        accessibility: {
          ariaLabel: 'Button',
          keyboardSupport: true,
          screenReaderSupport: true
        }
      }
    ]));

    await writeFile(join(testDataDir, 'guidelines.json'), JSON.stringify([
      {
        id: 'spacing-1',
        title: 'Spacing Guidelines',
        category: 'layout',
        content: 'Use consistent spacing',
        tags: ['spacing', 'layout'],
        lastUpdated: new Date().toISOString()
      }
    ]));

    // Create test configuration
    const testConfig = {
      server: {
        name: 'test-visa-design-system-mcp',
        version: '1.0.0-test',
        port: 3001,
        enableHttp: true,
        logLevel: 'error',
        enableRequestLogging: false
      },
      data: {
        dataPath: testDataDir,
        enableFileWatching: false,
        cacheTimeout: 60000,
        maxCacheSize: 10,
        enableValidation: true
      },
      security: {
        enableAuth: false,
        allowedOrigins: ['*'],
        rateLimitRpm: 1000
      },
      performance: {
        maxConcurrentRequests: 10,
        requestTimeout: 5000,
        enableCompression: false,
        memoryWarningThreshold: 100
      }
    };

    await writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      await unlink(testConfigPath);
      await unlink(join(testDataDir, 'design-tokens.json'));
      await unlink(join(testDataDir, 'components.json'));
      await unlink(join(testDataDir, 'guidelines.json'));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    // Kill server process if still running
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        serverProcess!.on('exit', resolve);
        setTimeout(() => {
          if (serverProcess && !serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
          resolve(undefined);
        }, 5000);
      });
      serverProcess = null;
    }
  });

  describe('Server Startup', () => {
    test('should start server with valid configuration', async () => {
      const startupPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, 10000);

        serverProcess = spawn('tsx', ['src/index.ts'], {
          env: {
            ...process.env,
            MCP_CONFIG_FILE: testConfigPath,
            NODE_ENV: 'test'
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stderrOutput = '';
        serverProcess.stderr?.on('data', (data) => {
          stderrOutput += data.toString();
          if (stderrOutput.includes('started successfully')) {
            clearTimeout(timeout);
            resolve();
          }
        });

        serverProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        serverProcess.on('exit', (code) => {
          if (code !== 0) {
            clearTimeout(timeout);
            reject(new Error(`Server exited with code ${code}. Output: ${stderrOutput}`));
          }
        });
      });

      await startupPromise;
      expect(serverProcess).toBeTruthy();
      expect(serverProcess!.pid).toBeDefined();
    }, 15000);

    test('should fail to start with invalid configuration', async () => {
      const invalidConfigPath = join(process.cwd(), 'invalid-config.json');
      await writeFile(invalidConfigPath, JSON.stringify({
        server: {
          name: '',  // Invalid: empty name
          version: '1.0.0',
          port: -1,  // Invalid: negative port
          logLevel: 'invalid'  // Invalid: bad log level
        }
      }));

      const failurePromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Expected server to fail startup'));
        }, 10000);

        const childProcess = spawn('tsx', ['src/index.ts'], {
          env: {
            ...process.env,
            MCP_CONFIG_FILE: invalidConfigPath,
            NODE_ENV: 'test'
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });

        childProcess.on('exit', (code) => {
          clearTimeout(timeout);
          if (code !== 0) {
            resolve(); // Expected failure
          } else {
            reject(new Error('Server should have failed to start'));
          }
        });
      });

      await failurePromise;
      await unlink(invalidConfigPath);
    }, 15000);
  });

  describe('Health Check Endpoints', () => {
    beforeEach(async () => {
      // Start server for health check tests
      const startupPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, 10000);

        serverProcess = spawn('tsx', ['src/index.ts'], {
          env: {
            ...process.env,
            MCP_CONFIG_FILE: testConfigPath,
            NODE_ENV: 'test'
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stderrOutput = '';
        serverProcess.stderr?.on('data', (data) => {
          stderrOutput += data.toString();
          if (stderrOutput.includes('started successfully')) {
            clearTimeout(timeout);
            resolve();
          }
        });

        serverProcess.on('error', reject);
      });

      await startupPromise;
      // Wait a bit more for HTTP server to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    test('should respond to health check endpoint', async () => {
      const response = await fetch('http://localhost:3001/health');
      expect(response.status).toBe(200);
      
      const health = await response.json();
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.memory).toBeDefined();
      expect(health.version).toBeDefined();
    });

    test('should respond to status endpoint', async () => {
      const response = await fetch('http://localhost:3001/status');
      expect(response.status).toBe(200);
      
      const status = await response.json();
      expect(status.server).toBeDefined();
      expect(status.server.name).toBe('test-visa-design-system-mcp');
      expect(status.system).toBeDefined();
      expect(status.timestamp).toBeDefined();
    });

    test('should respond to metrics endpoint', async () => {
      const response = await fetch('http://localhost:3001/metrics');
      expect(response.status).toBe(200);
      
      const metrics = await response.json();
      expect(metrics.memory).toBeDefined();
      expect(metrics.cpu).toBeDefined();
      expect(metrics.uptime).toBeGreaterThan(0);
      expect(metrics.timestamp).toBeDefined();
    });

    test('should return 404 for unknown endpoints', async () => {
      const response = await fetch('http://localhost:3001/unknown');
      expect(response.status).toBe(404);
      
      const error = await response.json();
      expect(error.error).toBe('Not found');
    });
  });

  describe('Graceful Shutdown', () => {
    test('should shutdown gracefully on SIGTERM', async () => {
      // Start server
      const startupPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, 10000);

        serverProcess = spawn('tsx', ['src/index.ts'], {
          env: {
            ...process.env,
            MCP_CONFIG_FILE: testConfigPath,
            NODE_ENV: 'test'
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stderrOutput = '';
        serverProcess.stderr?.on('data', (data) => {
          stderrOutput += data.toString();
          if (stderrOutput.includes('started successfully')) {
            clearTimeout(timeout);
            resolve();
          }
        });

        serverProcess.on('error', reject);
      });

      await startupPromise;

      // Send SIGTERM and wait for graceful shutdown
      const shutdownPromise = new Promise<number>((resolve) => {
        serverProcess!.on('exit', (code) => {
          resolve(code || 0);
        });
      });

      serverProcess!.kill('SIGTERM');
      const exitCode = await shutdownPromise;
      
      expect(exitCode).toBe(0);
      serverProcess = null; // Prevent cleanup in afterEach
    }, 15000);

    test('should shutdown gracefully on SIGINT', async () => {
      // Start server
      const startupPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, 10000);

        serverProcess = spawn('tsx', ['src/index.ts'], {
          env: {
            ...process.env,
            MCP_CONFIG_FILE: testConfigPath,
            NODE_ENV: 'test'
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stderrOutput = '';
        serverProcess.stderr?.on('data', (data) => {
          stderrOutput += data.toString();
          if (stderrOutput.includes('started successfully')) {
            clearTimeout(timeout);
            resolve();
          }
        });

        serverProcess.on('error', reject);
      });

      await startupPromise;

      // Send SIGINT and wait for graceful shutdown
      const shutdownPromise = new Promise<number>((resolve) => {
        serverProcess!.on('exit', (code) => {
          resolve(code || 0);
        });
      });

      serverProcess!.kill('SIGINT');
      const exitCode = await shutdownPromise;
      
      expect(exitCode).toBe(0);
      serverProcess = null; // Prevent cleanup in afterEach
    }, 15000);
  });

  describe('CLI Interface', () => {
    test('should show help information', async () => {
      const helpPromise = new Promise<string>((resolve, reject) => {
        const childProcess = spawn('tsx', ['src/cli.ts', '--help'], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        childProcess.stdout?.on('data', (data) => {
          output += data.toString();
        });

        childProcess.on('exit', (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`CLI help failed with code ${code}`));
          }
        });
      });

      const helpOutput = await helpPromise;
      expect(helpOutput).toContain('Visa Design System MCP Server');
      expect(helpOutput).toContain('start');
      expect(helpOutput).toContain('validate');
      expect(helpOutput).toContain('status');
    });

    test('should validate configuration', async () => {
      const validatePromise = new Promise<string>((resolve, reject) => {
        const childProcess = spawn('tsx', ['src/cli.ts', 'validate', '--config', testConfigPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        childProcess.stdout?.on('data', (data) => {
          output += data.toString();
        });

        childProcess.on('exit', (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`CLI validate failed with code ${code}. Output: ${output}`));
          }
        });
      });

      const validateOutput = await validatePromise;
      expect(validateOutput).toContain('Configuration is valid');
      expect(validateOutput).toContain('Current Configuration');
    });

    test('should show status information', async () => {
      const statusPromise = new Promise<string>((resolve, reject) => {
        const childProcess = spawn('tsx', ['src/cli.ts', 'status'], {
          env: {
            ...process.env,
            MCP_CONFIG_FILE: testConfigPath
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        childProcess.stdout?.on('data', (data) => {
          output += data.toString();
        });

        childProcess.on('exit', (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`CLI status failed with code ${code}. Output: ${output}`));
          }
        });
      });

      const statusOutput = await statusPromise;
      expect(statusOutput).toContain('Server Status Check');
      expect(statusOutput).toContain('visa-design-system-mcp');
      expect(statusOutput).toContain('Data directory accessible');
    });

    test('should start server with CLI options', async () => {
      const startPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('CLI server startup timeout'));
        }, 10000);

        serverProcess = spawn('tsx', ['src/cli.ts', 'start', '--config', testConfigPath, '--verbose'], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stderrOutput = '';
        serverProcess.stderr?.on('data', (data) => {
          stderrOutput += data.toString();
          if (stderrOutput.includes('started successfully')) {
            clearTimeout(timeout);
            resolve();
          }
        });

        serverProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        serverProcess.on('exit', (code) => {
          if (code !== 0) {
            clearTimeout(timeout);
            reject(new Error(`CLI server exited with code ${code}. Output: ${stderrOutput}`));
          }
        });
      });

      await startPromise;
      expect(serverProcess).toBeTruthy();
      expect(serverProcess!.pid).toBeDefined();
    }, 15000);
  });

  describe('Error Handling', () => {
    test('should handle missing data directory gracefully', async () => {
      const invalidConfig = {
        ...JSON.parse(await readFile(testConfigPath, 'utf-8')),
        data: {
          ...JSON.parse(await readFile(testConfigPath, 'utf-8')).data,
          dataPath: '/nonexistent/path'
        }
      };

      const invalidConfigPath = join(process.cwd(), 'invalid-data-config.json');
      await writeFile(invalidConfigPath, JSON.stringify(invalidConfig, null, 2));

      const failurePromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Expected server to fail startup'));
        }, 10000);

        const childProcess = spawn('tsx', ['src/index.ts'], {
          env: {
            ...process.env,
            MCP_CONFIG_FILE: invalidConfigPath,
            NODE_ENV: 'test'
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });

        childProcess.on('exit', (code) => {
          clearTimeout(timeout);
          if (code !== 0) {
            resolve(); // Expected failure
          } else {
            reject(new Error('Server should have failed to start'));
          }
        });
      });

      await failurePromise;
      await unlink(invalidConfigPath);
    }, 15000);
  });
});