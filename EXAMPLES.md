# Usage Examples

This document provides practical examples of how to use the Visa Design System MCP Server in various scenarios.

## Table of Contents

- [Getting Started](#getting-started)
- [Design Token Examples](#design-token-examples)
- [Component Examples](#component-examples)
- [Guidelines Examples](#guidelines-examples)
- [Integration Examples](#integration-examples)
- [Advanced Use Cases](#advanced-use-cases)

## Getting Started

### Basic Server Setup

```bash
# Install and build
npm install
npm run build

# Start with default configuration
npm start

# Start with custom configuration
npx visa-design-system-mcp start \
  --data-path ./custom-data \
  --log-level debug \
  --verbose
```

### MCP Client Configuration

#### Claude Desktop Configuration

Add to your Claude Desktop `config.json`:

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

#### Custom MCP Client

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

## Design Token Examples

### Example 1: Building a Color Palette

```javascript
// Get all color tokens
const colorTokens = await client.request({
  method: "tools/call",
  params: {
    name: "get-design-tokens",
    arguments: { category: "color" }
  }
});

// Generate CSS custom properties
function generateCSSVariables(tokens) {
  const css = tokens.tokens.map(token => 
    `  --${token.name}: ${token.value};`
  ).join('\n');
  
  return `:root {\n${css}\n}`;
}

console.log(generateCSSVariables(colorTokens));
```

Output:
```css
:root {
  --visa-blue-primary: #1A1F71;
  --visa-blue-secondary: #3B82F6;
  --visa-blue-light: #E6F2FF;
  --visa-gold: #F7B801;
  --neutral-white: #FFFFFF;
  --semantic-success: #10B981;
  --semantic-warning: #F59E0B;
  --semantic-error: #EF4444;
}
```

### Example 2: Typography Scale Generator

```javascript
// Get typography tokens
const typographyTokens = await client.request({
  method: "tools/call",
  params: {
    name: "get-design-tokens",
    arguments: { category: "typography" }
  }
});

// Generate Tailwind CSS configuration
function generateTailwindConfig(tokens) {
  const fontSizes = {};
  const fontWeights = {};
  const lineHeights = {};
  
  tokens.tokens.forEach(token => {
    if (token.name.startsWith('font-size-')) {
      const key = token.name.replace('font-size-', '');
      fontSizes[key] = token.value;
    } else if (token.name.startsWith('font-weight-')) {
      const key = token.name.replace('font-weight-', '');
      fontWeights[key] = token.value;
    } else if (token.name.startsWith('line-height-')) {
      const key = token.name.replace('line-height-', '');
      lineHeights[key] = token.value;
    }
  });
  
  return {
    theme: {
      extend: {
        fontSize: fontSizes,
        fontWeight: fontWeights,
        lineHeight: lineHeights
      }
    }
  };
}

console.log(JSON.stringify(generateTailwindConfig(typographyTokens), null, 2));
```

### Example 3: Token Usage Validation

```javascript
// Find deprecated tokens
const allTokens = await client.request({
  method: "tools/call",
  params: {
    name: "get-design-tokens",
    arguments: { deprecated: true }
  }
});

// Check if code uses deprecated tokens
function validateTokenUsage(codeString, deprecatedTokens) {
  const issues = [];
  
  deprecatedTokens.tokens.forEach(token => {
    const regex = new RegExp(`\\b${token.name}\\b`, 'g');
    if (regex.test(codeString)) {
      issues.push({
        token: token.name,
        message: `Deprecated token "${token.name}" found. ${token.description}`,
        alternatives: token.aliases || []
      });
    }
  });
  
  return issues;
}

const codeToCheck = `
  .button {
    background-color: var(--old-primary-color);
    color: var(--visa-blue-primary);
  }
`;

const issues = validateTokenUsage(codeToCheck, allTokens);
console.log('Token validation issues:', issues);
```

## Component Examples

### Example 4: Component Documentation Generator

```javascript
// Get all components
const components = await client.request({
  method: "tools/call",
  params: {
    name: "get-components",
    arguments: {}
  }
});

// Generate markdown documentation
async function generateComponentDocs(componentName) {
  const details = await client.request({
    method: "tools/call",
    params: {
      name: "get-component-details",
      arguments: { name: componentName }
    }
  });
  
  const component = details;
  let markdown = `# ${component.name}\n\n`;
  markdown += `${component.description}\n\n`;
  
  // Props table
  markdown += `## Props\n\n`;
  markdown += `| Name | Type | Required | Default | Description |\n`;
  markdown += `|------|------|----------|---------|-------------|\n`;
  
  component.props.forEach(prop => {
    markdown += `| ${prop.name} | ${prop.type} | ${prop.required ? 'Yes' : 'No'} | ${prop.default || '-'} | ${prop.description} |\n`;
  });
  
  // Examples
  if (component.examples && component.examples.length > 0) {
    markdown += `\n## Examples\n\n`;
    component.examples.forEach(example => {
      markdown += `### ${example.title}\n\n`;
      markdown += `${example.description}\n\n`;
      markdown += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
    });
  }
  
  // Guidelines
  if (component.guidelines && component.guidelines.length > 0) {
    markdown += `## Guidelines\n\n`;
    component.guidelines.forEach(guideline => {
      markdown += `- ${guideline}\n`;
    });
  }
  
  return markdown;
}

// Generate docs for Button component
const buttonDocs = await generateComponentDocs('Button');
console.log(buttonDocs);
```

### Example 5: Component Prop Validation

```javascript
// Validate component usage in JSX
async function validateComponentUsage(jsxCode, componentName) {
  const details = await client.request({
    method: "tools/call",
    params: {
      name: "get-component-details",
      arguments: { name: componentName }
    }
  });
  
  const component = details;
  const issues = [];
  
  // Simple JSX parsing (in real app, use proper parser)
  const componentRegex = new RegExp(`<${componentName}([^>]*)>`, 'g');
  const matches = [...jsxCode.matchAll(componentRegex)];
  
  matches.forEach((match, index) => {
    const propsString = match[1];
    const usedProps = [];
    
    // Extract props (simplified)
    const propRegex = /(\w+)=(?:{[^}]*}|"[^"]*")/g;
    let propMatch;
    while ((propMatch = propRegex.exec(propsString)) !== null) {
      usedProps.push(propMatch[1]);
    }
    
    // Check for unknown props
    const validProps = component.props.map(p => p.name);
    usedProps.forEach(usedProp => {
      if (!validProps.includes(usedProp)) {
        issues.push({
          line: index + 1,
          type: 'unknown-prop',
          message: `Unknown prop "${usedProp}" on ${componentName}`,
          validProps
        });
      }
    });
    
    // Check for missing required props
    const requiredProps = component.props.filter(p => p.required).map(p => p.name);
    requiredProps.forEach(requiredProp => {
      if (!usedProps.includes(requiredProp)) {
        issues.push({
          line: index + 1,
          type: 'missing-required-prop',
          message: `Missing required prop "${requiredProp}" on ${componentName}`
        });
      }
    });
  });
  
  return issues;
}

const jsxCode = `
  <Button variant="primary" size="large">Submit</Button>
  <Button invalidProp="test">Cancel</Button>
  <Button>No Props</Button>
`;

const validationIssues = await validateComponentUsage(jsxCode, 'Button');
console.log('Validation issues:', validationIssues);
```

### Example 6: Storybook Stories Generator

```javascript
// Generate Storybook stories from component data
async function generateStorybookStories(componentName) {
  const details = await client.request({
    method: "tools/call",
    params: {
      name: "get-component-details",
      arguments: { name: componentName }
    }
  });
  
  const component = details;
  
  let story = `import type { Meta, StoryObj } from '@storybook/react';\n`;
  story += `import { ${component.name} } from './${component.name}';\n\n`;
  
  story += `const meta: Meta<typeof ${component.name}> = {\n`;
  story += `  title: 'Components/${component.name}',\n`;
  story += `  component: ${component.name},\n`;
  story += `  parameters: {\n`;
  story += `    docs: {\n`;
  story += `      description: {\n`;
  story += `        component: '${component.description}'\n`;
  story += `      }\n`;
  story += `    }\n`;
  story += `  },\n`;
  story += `  argTypes: {\n`;
  
  component.props.forEach(prop => {
    story += `    ${prop.name}: {\n`;
    story += `      description: '${prop.description}',\n`;
    if (prop.default) {
      story += `      defaultValue: '${prop.default}',\n`;
    }
    story += `    },\n`;
  });
  
  story += `  }\n`;
  story += `};\n\n`;
  story += `export default meta;\n`;
  story += `type Story = StoryObj<typeof meta>;\n\n`;
  
  // Generate stories from variants
  if (component.variants) {
    component.variants.forEach(variant => {
      const storyName = variant.name.charAt(0).toUpperCase() + variant.name.slice(1);
      story += `export const ${storyName}: Story = {\n`;
      story += `  args: ${JSON.stringify(variant.props, null, 4)}\n`;
      story += `};\n\n`;
    });
  }
  
  return story;
}

const buttonStories = await generateStorybookStories('Button');
console.log(buttonStories);
```

## Guidelines Examples

### Example 7: Design System Audit

```javascript
// Audit design system usage against guidelines
async function auditDesignSystem(codebase) {
  const guidelines = await client.request({
    method: "tools/call",
    params: {
      name: "get-guidelines",
      arguments: {}
    }
  });
  
  const auditResults = [];
  
  for (const guideline of guidelines.guidelines) {
    const details = await client.request({
      method: "tools/call",
      params: {
        name: "get-guideline-details",
        arguments: { id: guideline.id }
      }
    });
    
    // Check for related tokens usage
    if (details.relatedTokens) {
      details.relatedTokens.forEach(tokenName => {
        const tokenUsage = findTokenUsageInCodebase(codebase, tokenName);
        if (tokenUsage.length > 0) {
          auditResults.push({
            guideline: details.title,
            type: 'token-usage',
            findings: tokenUsage,
            recommendation: details.content
          });
        }
      });
    }
    
    // Check for related components usage
    if (details.relatedComponents) {
      details.relatedComponents.forEach(componentName => {
        const componentUsage = findComponentUsageInCodebase(codebase, componentName);
        if (componentUsage.length > 0) {
          auditResults.push({
            guideline: details.title,
            type: 'component-usage',
            findings: componentUsage,
            recommendation: details.content
          });
        }
      });
    }
  }
  
  return auditResults;
}

function findTokenUsageInCodebase(codebase, tokenName) {
  // Simplified implementation
  const regex = new RegExp(`var\\(--${tokenName}\\)|\\$${tokenName}`, 'g');
  const matches = [];
  
  codebase.files.forEach(file => {
    const fileMatches = [...file.content.matchAll(regex)];
    fileMatches.forEach(match => {
      matches.push({
        file: file.path,
        line: file.content.substring(0, match.index).split('\n').length,
        usage: match[0]
      });
    });
  });
  
  return matches;
}

function findComponentUsageInCodebase(codebase, componentName) {
  // Simplified implementation
  const regex = new RegExp(`<${componentName}[^>]*>`, 'g');
  const matches = [];
  
  codebase.files.forEach(file => {
    if (file.path.endsWith('.jsx') || file.path.endsWith('.tsx')) {
      const fileMatches = [...file.content.matchAll(regex)];
      fileMatches.forEach(match => {
        matches.push({
          file: file.path,
          line: file.content.substring(0, match.index).split('\n').length,
          usage: match[0]
        });
      });
    }
  });
  
  return matches;
}
```

### Example 8: Accessibility Checker

```javascript
// Check components for accessibility compliance
async function checkAccessibility(componentName) {
  const details = await client.request({
    method: "tools/call",
    params: {
      name: "get-component-details",
      arguments: { name: componentName }
    }
  });
  
  const accessibilityGuidelines = await client.request({
    method: "tools/call",
    params: {
      name: "search-guidelines",
      arguments: { query: "accessibility" }
    }
  });
  
  const report = {
    component: componentName,
    accessibility: details.accessibility,
    guidelines: accessibilityGuidelines.guidelines,
    recommendations: []
  };
  
  // Check for ARIA labels
  if (!details.accessibility?.ariaLabels || details.accessibility.ariaLabels.length === 0) {
    report.recommendations.push({
      type: 'missing-aria-labels',
      message: 'Component should define appropriate ARIA labels',
      severity: 'high'
    });
  }
  
  // Check for keyboard navigation
  if (!details.accessibility?.keyboardNavigation) {
    report.recommendations.push({
      type: 'missing-keyboard-nav',
      message: 'Component should define keyboard navigation behavior',
      severity: 'high'
    });
  }
  
  // Check for color contrast information
  if (!details.accessibility?.colorContrast) {
    report.recommendations.push({
      type: 'missing-contrast-info',
      message: 'Component should specify color contrast compliance',
      severity: 'medium'
    });
  }
  
  return report;
}

const accessibilityReport = await checkAccessibility('Button');
console.log('Accessibility Report:', JSON.stringify(accessibilityReport, null, 2));
```

## Integration Examples

### Example 9: VS Code Extension

```javascript
// VS Code extension that provides design system autocomplete
const vscode = require('vscode');

class DesignSystemProvider {
  constructor() {
    this.client = null; // Initialize MCP client
  }
  
  async provideCompletionItems(document, position) {
    const line = document.lineAt(position);
    const text = line.text.substring(0, position.character);
    
    // Detect CSS custom property usage
    if (text.includes('var(--')) {
      return this.provideTokenCompletions();
    }
    
    // Detect component usage
    if (text.includes('<')) {
      return this.provideComponentCompletions();
    }
    
    return [];
  }
  
  async provideTokenCompletions() {
    const tokens = await this.client.request({
      method: "tools/call",
      params: {
        name: "get-design-tokens",
        arguments: {}
      }
    });
    
    return tokens.tokens.map(token => {
      const item = new vscode.CompletionItem(
        token.name,
        vscode.CompletionItemKind.Variable
      );
      item.detail = token.value;
      item.documentation = token.description;
      item.insertText = token.name;
      return item;
    });
  }
  
  async provideComponentCompletions() {
    const components = await this.client.request({
      method: "tools/call",
      params: {
        name: "get-components",
        arguments: {}
      }
    });
    
    return components.components.map(component => {
      const item = new vscode.CompletionItem(
        component.name,
        vscode.CompletionItemKind.Class
      );
      item.detail = component.category;
      item.documentation = component.description;
      return item;
    });
  }
}
```

### Example 10: Figma Plugin

```javascript
// Figma plugin that syncs design tokens
class FigmaDesignSystemSync {
  async syncTokensToFigma() {
    const colorTokens = await this.mcpClient.request({
      method: "tools/call",
      params: {
        name: "get-design-tokens",
        arguments: { category: "color" }
      }
    });
    
    // Create color styles in Figma
    colorTokens.tokens.forEach(token => {
      const style = figma.createPaintStyle();
      style.name = token.name;
      style.description = token.description;
      
      const paint = {
        type: 'SOLID',
        color: this.hexToRgb(token.value)
      };
      style.paints = [paint];
    });
    
    // Sync typography tokens
    const typographyTokens = await this.mcpClient.request({
      method: "tools/call",
      params: {
        name: "get-design-tokens",
        arguments: { category: "typography" }
      }
    });
    
    // Create text styles in Figma
    const fontSizes = typographyTokens.tokens.filter(t => t.name.includes('font-size'));
    const fontWeights = typographyTokens.tokens.filter(t => t.name.includes('font-weight'));
    
    fontSizes.forEach(sizeToken => {
      const style = figma.createTextStyle();
      style.name = sizeToken.name;
      style.fontSize = parseInt(sizeToken.value);
      
      // Find matching weight
      const weightToken = fontWeights.find(w => 
        w.name.includes(sizeToken.name.split('-').pop())
      );
      if (weightToken) {
        style.fontWeight = weightToken.value;
      }
    });
  }
  
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : null;
  }
}
```

## Advanced Use Cases

### Example 11: Design System Migration Tool

```javascript
// Tool to migrate from old design system to new one
class DesignSystemMigrator {
  constructor(mcpClient) {
    this.client = mcpClient;
    this.migrationMap = new Map();
  }
  
  async buildMigrationMap() {
    const allTokens = await this.client.request({
      method: "tools/call",
      params: {
        name: "get-design-tokens",
        arguments: {}
      }
    });
    
    // Build mapping from aliases to current names
    allTokens.tokens.forEach(token => {
      if (token.aliases) {
        token.aliases.forEach(alias => {
          this.migrationMap.set(alias, token.name);
        });
      }
    });
  }
  
  async migrateFile(filePath, fileContent) {
    await this.buildMigrationMap();
    
    let migratedContent = fileContent;
    const changes = [];
    
    // Migrate CSS custom properties
    this.migrationMap.forEach((newName, oldName) => {
      const oldPattern = new RegExp(`var\\(--${oldName}\\)`, 'g');
      const newPattern = `var(--${newName})`;
      
      if (oldPattern.test(migratedContent)) {
        migratedContent = migratedContent.replace(oldPattern, newPattern);
        changes.push({
          type: 'token-migration',
          from: oldName,
          to: newName,
          pattern: 'css-custom-property'
        });
      }
    });
    
    // Migrate Sass variables
    this.migrationMap.forEach((newName, oldName) => {
      const oldPattern = new RegExp(`\\$${oldName}`, 'g');
      const newPattern = `$${newName}`;
      
      if (oldPattern.test(migratedContent)) {
        migratedContent = migratedContent.replace(oldPattern, newPattern);
        changes.push({
          type: 'token-migration',
          from: oldName,
          to: newName,
          pattern: 'sass-variable'
        });
      }
    });
    
    return {
      originalContent: fileContent,
      migratedContent,
      changes,
      filePath
    };
  }
  
  async generateMigrationReport(codebase) {
    const report = {
      totalFiles: 0,
      migratedFiles: 0,
      totalChanges: 0,
      changesByType: {},
      files: []
    };
    
    for (const file of codebase.files) {
      report.totalFiles++;
      
      const migration = await this.migrateFile(file.path, file.content);
      
      if (migration.changes.length > 0) {
        report.migratedFiles++;
        report.totalChanges += migration.changes.length;
        
        migration.changes.forEach(change => {
          report.changesByType[change.type] = (report.changesByType[change.type] || 0) + 1;
        });
        
        report.files.push(migration);
      }
    }
    
    return report;
  }
}
```

### Example 12: Design System Analytics

```javascript
// Analytics tool to track design system usage
class DesignSystemAnalytics {
  constructor(mcpClient) {
    this.client = mcpClient;
  }
  
  async analyzeUsage(codebase) {
    const analytics = {
      tokens: await this.analyzeTokenUsage(codebase),
      components: await this.analyzeComponentUsage(codebase),
      guidelines: await this.analyzeGuidelineCompliance(codebase)
    };
    
    return analytics;
  }
  
  async analyzeTokenUsage(codebase) {
    const allTokens = await this.client.request({
      method: "tools/call",
      params: {
        name: "get-design-tokens",
        arguments: {}
      }
    });
    
    const usage = {
      totalTokens: allTokens.tokens.length,
      usedTokens: 0,
      unusedTokens: [],
      mostUsedTokens: [],
      categoryUsage: {}
    };
    
    const tokenUsageCount = new Map();
    
    allTokens.tokens.forEach(token => {
      let count = 0;
      
      codebase.files.forEach(file => {
        const cssPattern = new RegExp(`var\\(--${token.name}\\)`, 'g');
        const sassPattern = new RegExp(`\\$${token.name}`, 'g');
        
        count += (file.content.match(cssPattern) || []).length;
        count += (file.content.match(sassPattern) || []).length;
      });
      
      tokenUsageCount.set(token.name, count);
      
      if (count > 0) {
        usage.usedTokens++;
        
        // Track category usage
        usage.categoryUsage[token.category] = (usage.categoryUsage[token.category] || 0) + count;
      } else {
        usage.unusedTokens.push(token.name);
      }
    });
    
    // Find most used tokens
    usage.mostUsedTokens = Array.from(tokenUsageCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    
    return usage;
  }
  
  async analyzeComponentUsage(codebase) {
    const allComponents = await this.client.request({
      method: "tools/call",
      params: {
        name: "get-components",
        arguments: {}
      }
    });
    
    const usage = {
      totalComponents: allComponents.components.length,
      usedComponents: 0,
      unusedComponents: [],
      mostUsedComponents: [],
      categoryUsage: {}
    };
    
    const componentUsageCount = new Map();
    
    for (const component of allComponents.components) {
      let count = 0;
      
      codebase.files.forEach(file => {
        if (file.path.endsWith('.jsx') || file.path.endsWith('.tsx')) {
          const pattern = new RegExp(`<${component.name}[^>]*>`, 'g');
          count += (file.content.match(pattern) || []).length;
        }
      });
      
      componentUsageCount.set(component.name, count);
      
      if (count > 0) {
        usage.usedComponents++;
        usage.categoryUsage[component.category] = (usage.categoryUsage[component.category] || 0) + count;
      } else {
        usage.unusedComponents.push(component.name);
      }
    }
    
    usage.mostUsedComponents = Array.from(componentUsageCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
    
    return usage;
  }
  
  async analyzeGuidelineCompliance(codebase) {
    const guidelines = await this.client.request({
      method: "tools/call",
      params: {
        name: "get-guidelines",
        arguments: {}
      }
    });
    
    const compliance = {
      totalGuidelines: guidelines.guidelines.length,
      violations: [],
      complianceScore: 0
    };
    
    // This would need more sophisticated analysis
    // For now, just check for basic patterns
    
    return compliance;
  }
  
  generateReport(analytics) {
    let report = "# Design System Usage Analytics\n\n";
    
    // Token usage
    report += "## Token Usage\n\n";
    report += `- Total tokens: ${analytics.tokens.totalTokens}\n`;
    report += `- Used tokens: ${analytics.tokens.usedTokens}\n`;
    report += `- Usage rate: ${((analytics.tokens.usedTokens / analytics.tokens.totalTokens) * 100).toFixed(1)}%\n\n`;
    
    if (analytics.tokens.unusedTokens.length > 0) {
      report += "### Unused Tokens\n\n";
      analytics.tokens.unusedTokens.forEach(token => {
        report += `- ${token}\n`;
      });
      report += "\n";
    }
    
    report += "### Most Used Tokens\n\n";
    analytics.tokens.mostUsedTokens.forEach(({ name, count }) => {
      report += `- ${name}: ${count} uses\n`;
    });
    
    // Component usage
    report += "\n## Component Usage\n\n";
    report += `- Total components: ${analytics.components.totalComponents}\n`;
    report += `- Used components: ${analytics.components.usedComponents}\n`;
    report += `- Usage rate: ${((analytics.components.usedComponents / analytics.components.totalComponents) * 100).toFixed(1)}%\n\n`;
    
    return report;
  }
}
```

These examples demonstrate the versatility and power of the Visa Design System MCP Server. You can adapt these patterns to build your own tools and integrations that leverage the design system data for various use cases like documentation generation, code validation, migration tools, and analytics dashboards.