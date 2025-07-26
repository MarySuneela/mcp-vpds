# Visa Design System MCP Server

A Model Context Protocol (MCP) server that provides AI tools with access to Visa's Product Design System resources, including design tokens, component specifications, and usage guidelines.

<a href="https://glama.ai/mcp/servers/@MarySuneela/mcp-vpds">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@MarySuneela/mcp-vpds/badge" alt="Visa Design System Server MCP server" />
</a>

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [MCP Client Setup](#mcp-client-setup)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Install from Source

```bash
# Clone the repository
git clone <repository-url>
cd visa-design-system-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Install as Global Package

```bash
# Install globally (after building)
npm install -g .

# Or link for development
npm link
```

## Quick Start

### 1. Start the Server

```bash
# Start with default configuration
npm start

# Or use the CLI with custom options
npx visa-design-system-mcp start --data-path ./custom-data --log-level debug
```

### 2. Test the Server

```bash
# Test server functionality
npm test

# Run integration tests
npm run test:integration
```

### 3. Connect an MCP Client

See [MCP Client Setup](#mcp-client-setup) for detailed configuration instructions.

## Configuration

### Environment Variables

The server can be configured using environment variables:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `MCP_DATA_PATH` | Path to design system data files | `./data` | `/path/to/design-data` |
| `MCP_LOG_LEVEL` | Logging level | `info` | `debug`, `warn`, `error` |
| `MCP_ENABLE_FILE_WATCHING` | Enable automatic data reloading | `true` | `false` |
| `MCP_CACHE_TTL` | Cache time-to-live in seconds | `300` | `600` |
| `MCP_MAX_CONCURRENT_REQUESTS` | Maximum concurrent requests | `100` | `50` |

### Configuration File

Create a `config.json` file in the project root:

```json
{
  "dataPath": "./data",
  "logLevel": "info",
  "enableFileWatching": true,
  "cacheTTL": 300,
  "maxConcurrentRequests": 100,
  "server": {
    "name": "visa-design-system-mcp",
    "version": "1.0.0"
  }
}
```

### CLI Options

```bash
npx visa-design-system-mcp start [options]

Options:
  --data-path <path>     Path to design system data files (default: "./data")
  --log-level <level>    Logging level: debug, info, warn, error (default: "info")
  --config <file>        Path to configuration file
  --no-file-watching     Disable automatic file watching
  --verbose              Enable verbose logging
  --help                 Display help information
```

## Usage

### Basic Server Operations

```bash
# Start the server
npm start

# Start with custom data path
MCP_DATA_PATH=/custom/path npm start

# Start with debug logging
MCP_LOG_LEVEL=debug npm start

# Start without file watching (for production)
MCP_ENABLE_FILE_WATCHING=false npm start
```

### Available MCP Tools

The server exposes the following MCP tools:

#### Design Token Tools
- `get-design-tokens` - Retrieve design tokens with optional filtering
- `search-design-tokens` - Search tokens by name or value
- `get-design-token-details` - Get detailed token information
- `get-design-token-categories` - List all token categories

#### Component Tools
- `get-components` - List all components with optional filtering
- `get-component-details` - Get detailed component specifications
- `get-component-examples` - Retrieve component code examples
- `search-components` - Search components by name or description

#### Guidelines Tools
- `get-guidelines` - Retrieve design guidelines with optional filtering
- `get-guideline-details` - Get detailed guideline information
- `search-guidelines` - Search guidelines by content or tags

For detailed API documentation, see [API.md](./API.md).

## MCP Client Setup

### Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "visa-design-system": {
      "command": "node",
      "args": ["/path/to/visa-design-system-mcp/dist/index.js"],
      "env": {
        "MCP_DATA_PATH": "/path/to/data",
        "MCP_LOG_LEVEL": "info"
      }
    }
  }
}
```

### Custom MCP Client

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['/path/to/visa-design-system-mcp/dist/index.js']
});

const client = new Client({
  name: "my-app",
  version: "1.0.0"
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const tools = await client.request({
  method: "tools/list"
}, {});

console.log('Available tools:', tools.tools.map(t => t.name));
```

### Kiro IDE

Add to your `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "visa-design-system": {
      "command": "node",
      "args": ["/path/to/visa-design-system-mcp/dist/index.js"],
      "env": {
        "MCP_DATA_PATH": "/path/to/data"
      },
      "disabled": false,
      "autoApprove": ["get-design-tokens", "get-components", "get-guidelines"]
    }
  }
}
```

## Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

### Project Structure

```
├── src/
│   ├── index.ts              # Main server entry point
│   ├── cli.ts                # Command-line interface
│   ├── mcp-server.ts         # MCP protocol implementation
│   ├── config/               # Configuration management
│   ├── services/             # Business logic services
│   │   ├── design-token-service.ts
│   │   ├── component-service.ts
│   │   └── guidelines-service.ts
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   │   ├── data-manager.ts   # Data loading and caching
│   │   ├── logger.ts         # Logging utilities
│   │   ├── errors.ts         # Error handling
│   │   └── validation.ts     # Data validation
│   └── schemas/              # JSON schemas for validation
├── data/                     # Design system data files
│   ├── design-tokens.json    # Design token definitions
│   ├── components.json       # Component specifications
│   └── guidelines.json       # Design guidelines
├── tests/                    # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── utils/                # Test utilities
├── dist/                     # Compiled JavaScript output
└── docs/                     # Additional documentation
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:performance    # Performance tests
npm run test:edge-cases     # Edge case tests
npm run test:mcp-compliance # MCP protocol compliance tests

# Run tests with coverage
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Adding New Features

1. **Add new MCP tools**: Implement in respective service files
2. **Update data schemas**: Modify JSON schemas in `src/schemas/`
3. **Add tests**: Create corresponding test files
4. **Update documentation**: Update API.md and examples

## API Documentation

For comprehensive API documentation including all available tools, parameters, and response formats, see [API.md](./API.md).

For usage examples and integration patterns, see [EXAMPLES.md](./EXAMPLES.md).

## Troubleshooting

### Common Issues

#### Server Won't Start

**Problem**: Server fails to start with "Cannot find module" error
```
Error: Cannot find module './dist/index.js'
```

**Solution**: Build the project first
```bash
npm run build
npm start
```

**Problem**: Server starts but no tools are available
```
Error: No tools found
```

**Solution**: Check data path and file permissions
```bash
# Verify data files exist
ls -la data/

# Check file permissions
chmod 644 data/*.json

# Start with debug logging
MCP_LOG_LEVEL=debug npm start
```

#### Data Loading Issues

**Problem**: Design system data not loading
```
Error: Failed to load design system data
```

**Solution**: Verify data file format and location
```bash
# Validate JSON files
npm run validate-data

# Check data path configuration
echo $MCP_DATA_PATH

# Use absolute path
MCP_DATA_PATH=/absolute/path/to/data npm start
```

**Problem**: File watching not working
```
Warning: File watching disabled
```

**Solution**: Check file system permissions and enable file watching
```bash
# Enable file watching explicitly
MCP_ENABLE_FILE_WATCHING=true npm start

# Check if chokidar can access files
node -e "const chokidar = require('chokidar'); chokidar.watch('./data').on('ready', () => console.log('File watching works'));"
```

#### MCP Client Connection Issues

**Problem**: Claude Desktop can't connect to server
```
Error: Failed to connect to MCP server
```

**Solution**: Check configuration and paths
```json
{
  "mcpServers": {
    "visa-design-system": {
      "command": "node",
      "args": ["/absolute/path/to/visa-design-system-mcp/dist/index.js"]
    }
  }
}
```

**Problem**: Tools not appearing in MCP client
```
Error: No tools available
```

**Solution**: Verify server initialization and tool registration
```bash
# Test server directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node dist/index.js

# Check server logs
MCP_LOG_LEVEL=debug node dist/index.js
```

#### Performance Issues

**Problem**: Slow response times
```
Warning: Tool call took longer than expected
```

**Solution**: Optimize caching and data loading
```bash
# Increase cache TTL
MCP_CACHE_TTL=600 npm start

# Reduce concurrent requests
MCP_MAX_CONCURRENT_REQUESTS=50 npm start

# Monitor performance
npm run test:performance
```

**Problem**: High memory usage
```
Warning: High memory usage detected
```

**Solution**: Optimize data structures and caching
```bash
# Monitor memory usage
node --max-old-space-size=512 dist/index.js

# Disable file watching in production
MCP_ENABLE_FILE_WATCHING=false npm start
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Environment variable
MCP_LOG_LEVEL=debug npm start

# CLI flag
npx visa-design-system-mcp start --log-level debug --verbose
```

Debug output includes:
- Server initialization steps
- Data loading progress
- Tool call details
- Cache operations
- File watching events
- Error stack traces

### Log Files

Logs are written to:
- Console (stdout/stderr)
- Optional log file (configure via `LOG_FILE` environment variable)

```bash
# Write logs to file
LOG_FILE=./logs/mcp-server.log npm start

# Tail logs in real-time
tail -f ./logs/mcp-server.log
```

### Health Checks

Test server health:

```bash
# Basic connectivity test
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | node dist/index.js

# Tool availability test
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node dist/index.js

# Data integrity test
npm run validate-data
```

### Getting Help

1. **Check the logs**: Enable debug logging to see detailed error information
2. **Validate data**: Run `npm run validate-data` to check data file integrity
3. **Test connectivity**: Use the health check commands above
4. **Review configuration**: Verify all paths and environment variables
5. **Check permissions**: Ensure the server has read access to data files
6. **Update dependencies**: Run `npm update` to get the latest versions

If you're still experiencing issues, please:
1. Include debug logs in your issue report
2. Specify your Node.js version (`node --version`)
3. Describe your MCP client setup
4. Provide your configuration files (with sensitive data removed)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run the test suite (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage above 90%
- Update documentation for new features
- Follow conventional commit messages
- Ensure MCP protocol compliance

## License

MIT License - see [LICENSE](LICENSE) file for details.