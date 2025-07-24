# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Visa Design System MCP Server.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Installation Issues](#installation-issues)
- [Server Startup Issues](#server-startup-issues)
- [Data Loading Issues](#data-loading-issues)
- [MCP Client Connection Issues](#mcp-client-connection-issues)
- [Performance Issues](#performance-issues)
- [Development Issues](#development-issues)
- [Advanced Debugging](#advanced-debugging)
- [Getting Help](#getting-help)

## Quick Diagnostics

Run these commands to quickly identify common issues:

```bash
# Check Node.js version (requires 18+)
node --version

# Verify project build
npm run build

# Test basic functionality
npm test

# Check data file integrity
npm run validate-data

# Test server startup
npm start &
sleep 2
kill %1
```

## Installation Issues

### Issue: npm install fails

**Symptoms:**
```
npm ERR! peer dep missing: @types/node@^18.0.0
```

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use specific Node.js version
nvm use 18
npm install
```

### Issue: TypeScript compilation errors

**Symptoms:**
```
error TS2307: Cannot find module '@modelcontextprotocol/sdk'
```

**Solutions:**
```bash
# Install missing dependencies
npm install @modelcontextprotocol/sdk

# Rebuild TypeScript definitions
npm run build

# Check TypeScript configuration
npx tsc --showConfig
```

### Issue: Global installation fails

**Symptoms:**
```
npm ERR! EACCES: permission denied
```

**Solutions:**
```bash
# Use npm prefix for user installation
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# Or use sudo (not recommended)
sudo npm install -g .

# Or use npx instead
npx visa-design-system-mcp start
```

## Server Startup Issues

### Issue: "Cannot find module './dist/index.js'"

**Symptoms:**
```
Error: Cannot find module '/path/to/visa-design-system-mcp/dist/index.js'
```

**Solutions:**
```bash
# Build the project first
npm run build

# Verify dist directory exists
ls -la dist/

# Check build output
npm run build 2>&1 | grep -i error
```

### Issue: "Server not initialized"

**Symptoms:**
```
Error: Server not initialized
```

**Solutions:**
```bash
# Check server startup logs
MCP_LOG_LEVEL=debug npm start

# Verify configuration
cat config.json

# Test with minimal configuration
MCP_DATA_PATH=./data npm start
```

### Issue: Port already in use

**Symptoms:**
```
Error: listen EADDRINUSE :::3000
```

**Solutions:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Use different port
PORT=3001 npm start
```

## Data Loading Issues

### Issue: "Failed to load design system data"

**Symptoms:**
```
Error: Failed to load design system data from ./data
```

**Solutions:**
```bash
# Check data directory exists
ls -la data/

# Verify file permissions
chmod 644 data/*.json

# Check file format
npm run validate-data

# Use absolute path
MCP_DATA_PATH=/absolute/path/to/data npm start
```

### Issue: Invalid JSON format

**Symptoms:**
```
SyntaxError: Unexpected token } in JSON at position 123
```

**Solutions:**
```bash
# Validate JSON files individually
node -e "JSON.parse(require('fs').readFileSync('data/design-tokens.json', 'utf8'))"
node -e "JSON.parse(require('fs').readFileSync('data/components.json', 'utf8'))"
node -e "JSON.parse(require('fs').readFileSync('data/guidelines.json', 'utf8'))"

# Use JSON linter
npx jsonlint data/*.json

# Reset to sample data
cp data/.gitkeep data/backup.gitkeep
git checkout -- data/
```

### Issue: Schema validation errors

**Symptoms:**
```
ValidationError: data.tokens[0] should have required property 'category'
```

**Solutions:**
```bash
# Check schema requirements
cat src/schemas/design-token.schema.json

# Validate against schema
npm run validate-data

# Fix data format
# Edit data files to match schema requirements
```

### Issue: File watching not working

**Symptoms:**
```
Warning: File watching disabled due to error
```

**Solutions:**
```bash
# Check file system permissions
ls -la data/

# Test chokidar directly
node -e "
const chokidar = require('chokidar');
chokidar.watch('./data')
  .on('ready', () => console.log('File watching works'))
  .on('error', err => console.error('File watching error:', err));
"

# Disable file watching if problematic
MCP_ENABLE_FILE_WATCHING=false npm start

# Increase file watcher limits (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## MCP Client Connection Issues

### Issue: Claude Desktop can't connect

**Symptoms:**
```
Failed to connect to MCP server: visa-design-system
```

**Solutions:**

1. **Check configuration path:**
```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Windows
type %APPDATA%\Claude\claude_desktop_config.json
```

2. **Verify absolute paths:**
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

3. **Test server manually:**
```bash
# Test server startup
node dist/index.js &
PID=$!
sleep 2
kill $PID
```

4. **Check Node.js path:**
```bash
# Find Node.js path
which node

# Use full path in config
{
  "command": "/usr/local/bin/node",
  "args": ["/path/to/dist/index.js"]
}
```

### Issue: Tools not appearing in MCP client

**Symptoms:**
- Server connects but no tools are available
- Empty tool list in client

**Solutions:**
```bash
# Test tool listing directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node dist/index.js

# Check server initialization
MCP_LOG_LEVEL=debug node dist/index.js 2>&1 | grep -i "tool\|init"

# Verify data loading
MCP_LOG_LEVEL=debug npm start 2>&1 | grep -i "loaded\|token\|component"
```

### Issue: MCP protocol errors

**Symptoms:**
```
Invalid JSON-RPC request
Method not found: tools/call
```

**Solutions:**
```bash
# Test MCP protocol compliance
npm run test:mcp-compliance

# Check MCP SDK version
npm list @modelcontextprotocol/sdk

# Update MCP SDK
npm update @modelcontextprotocol/sdk
```

## Performance Issues

### Issue: Slow response times

**Symptoms:**
- Tool calls take > 5 seconds
- High CPU usage
- Memory warnings

**Solutions:**
```bash
# Monitor performance
npm run test:performance

# Increase cache TTL
MCP_CACHE_TTL=600 npm start

# Reduce concurrent requests
MCP_MAX_CONCURRENT_REQUESTS=50 npm start

# Profile memory usage
node --inspect dist/index.js
```

### Issue: High memory usage

**Symptoms:**
```
<--- Last few GCs --->
[12345:0x123456789]     1234 ms: Mark-Sweep 512.0 (1024.0) -> 256.0 (512.0) MB
```

**Solutions:**
```bash
# Limit memory usage
node --max-old-space-size=512 dist/index.js

# Disable file watching
MCP_ENABLE_FILE_WATCHING=false npm start

# Monitor memory
node --trace-gc dist/index.js

# Check for memory leaks
npm run test:memory-leaks
```

### Issue: Cache issues

**Symptoms:**
- Stale data returned
- Cache misses
- Inconsistent responses

**Solutions:**
```bash
# Clear cache manually
rm -rf .cache/

# Disable caching temporarily
MCP_CACHE_TTL=0 npm start

# Monitor cache operations
MCP_LOG_LEVEL=debug npm start 2>&1 | grep -i cache

# Restart with fresh cache
pkill -f "visa-design-system-mcp"
npm start
```

## Development Issues

### Issue: Tests failing

**Symptoms:**
```
FAIL tests/integration.test.ts
● Test suite failed to run
```

**Solutions:**
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/integration.test.ts

# Clear Jest cache
npm test -- --clearCache

# Run tests in band (no parallel)
npm test -- --runInBand

# Check test environment
npm run test:unit
npm run test:integration
```

### Issue: TypeScript errors

**Symptoms:**
```
error TS2345: Argument of type 'string' is not assignable to parameter of type 'LogLevel'
```

**Solutions:**
```bash
# Check TypeScript configuration
cat tsconfig.json

# Rebuild type definitions
npm run build

# Check for type conflicts
npx tsc --noEmit

# Update type definitions
npm update @types/node
```

### Issue: Linting errors

**Symptoms:**
```
error: 'variable' is assigned a value but never used
```

**Solutions:**
```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Check ESLint configuration
cat .eslintrc.json

# Ignore specific rules temporarily
// eslint-disable-next-line @typescript-eslint/no-unused-vars
```

## Advanced Debugging

### Enable Debug Mode

```bash
# Maximum verbosity
DEBUG=* MCP_LOG_LEVEL=debug npm start

# MCP-specific debugging
DEBUG=mcp:* npm start

# Custom debug categories
DEBUG=visa-design-system:* npm start
```

### Trace Network Issues

```bash
# Trace system calls
strace -e trace=network node dist/index.js

# Monitor file operations
strace -e trace=file node dist/index.js

# Network debugging
netstat -tulpn | grep node
```

### Memory Profiling

```bash
# Generate heap snapshot
node --inspect dist/index.js
# Open chrome://inspect in Chrome
# Take heap snapshot

# Memory usage over time
node --trace-gc --trace-gc-verbose dist/index.js

# Detect memory leaks
node --inspect --inspect-brk dist/index.js
# Use Chrome DevTools Memory tab
```

### Performance Profiling

```bash
# CPU profiling
node --prof dist/index.js
# Generate profile with --prof-process

# V8 performance tracing
node --trace-opt --trace-deopt dist/index.js

# Benchmark specific operations
npm run test:performance -- --verbose
```

### Log Analysis

```bash
# Filter logs by level
npm start 2>&1 | grep ERROR

# Monitor specific operations
npm start 2>&1 | grep -i "token\|component\|guideline"

# Save logs for analysis
npm start 2>&1 | tee server.log

# Analyze log patterns
grep -E "(ERROR|WARN)" server.log | sort | uniq -c
```

## Getting Help

### Before Reporting Issues

1. **Collect system information:**
```bash
# System info
uname -a
node --version
npm --version

# Project info
npm list --depth=0
git rev-parse HEAD

# Configuration
echo "Data path: $MCP_DATA_PATH"
echo "Log level: $MCP_LOG_LEVEL"
```

2. **Generate debug logs:**
```bash
# Full debug output
MCP_LOG_LEVEL=debug npm start > debug.log 2>&1 &
sleep 10
kill %1

# Test specific functionality
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | MCP_LOG_LEVEL=debug node dist/index.js > tool-test.log 2>&1
```

3. **Validate environment:**
```bash
# Check data integrity
npm run validate-data > validation.log 2>&1

# Test basic functionality
npm test > test-results.log 2>&1
```

### Issue Report Template

When reporting issues, include:

```
## Environment
- OS: [e.g., macOS 14.0, Ubuntu 22.04]
- Node.js version: [e.g., 18.17.0]
- npm version: [e.g., 9.6.7]
- Project version: [git commit hash]

## Configuration
- Data path: [path to data directory]
- Environment variables: [relevant env vars]
- MCP client: [Claude Desktop, custom client, etc.]

## Issue Description
[Clear description of the problem]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

## Expected Behavior
[What you expected to happen]

## Actual Behavior
[What actually happened]

## Logs
[Attach debug logs, error messages, etc.]

## Additional Context
[Any other relevant information]
```

### Community Resources

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check API.md and EXAMPLES.md
- **Tests**: Review test files for usage examples
- **Source Code**: Examine implementation details

### Professional Support

For enterprise support or custom implementations:
1. Review the codebase architecture
2. Consider hiring contributors
3. Engage with the development team
4. Explore commercial support options

Remember to sanitize any sensitive information before sharing logs or configuration files.