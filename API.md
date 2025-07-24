# API Reference

This document provides detailed information about all available MCP tools in the Visa Design System MCP Server.

## Table of Contents

- [Design Token Tools](#design-token-tools)
- [Component Tools](#component-tools)
- [Guidelines Tools](#guidelines-tools)
- [Error Handling](#error-handling)
- [Data Schemas](#data-schemas)

## Design Token Tools

### get-design-tokens

Get design tokens with optional category filtering.

**Parameters:**
- `category` (optional): Filter tokens by category
  - Type: `string`
  - Enum: `color`, `typography`, `spacing`, `elevation`, `motion`
- `deprecated` (optional): Filter by deprecated status
  - Type: `boolean`
  - `true` for deprecated tokens, `false` for active tokens

**Example Request:**
```json
{
  "tool": "get-design-tokens",
  "arguments": {
    "category": "color",
    "deprecated": false
  }
}
```

**Example Response:**
```json
{
  "tokens": [
    {
      "name": "visa-blue-primary",
      "value": "#1A1F71",
      "category": "color",
      "description": "Primary Visa brand blue color - the core brand color",
      "usage": ["primary buttons", "brand elements", "headers", "navigation"],
      "deprecated": false,
      "aliases": ["primary-blue", "brand-blue", "visa-primary"]
    }
  ],
  "count": 1,
  "category": "color"
}
```

### search-design-tokens

Search design tokens by name or value.

**Parameters:**
- `query` (required): Search query for token names or values
  - Type: `string`

**Example Request:**
```json
{
  "tool": "search-design-tokens",
  "arguments": {
    "query": "blue"
  }
}
```

**Example Response:**
```json
{
  "tokens": [
    {
      "name": "visa-blue-primary",
      "value": "#1A1F71",
      "category": "color",
      "description": "Primary Visa brand blue color",
      "usage": ["primary buttons", "brand elements"],
      "deprecated": false,
      "aliases": ["primary-blue", "brand-blue"]
    },
    {
      "name": "visa-blue-secondary",
      "value": "#3B82F6",
      "category": "color",
      "description": "Secondary blue for supporting elements",
      "usage": ["secondary buttons", "links", "accents"],
      "deprecated": false,
      "aliases": ["secondary-blue", "interactive-blue"]
    }
  ],
  "count": 2,
  "query": "blue"
}
```

### get-design-token-details

Get detailed information about a specific design token.

**Parameters:**
- `name` (required): Design token name
  - Type: `string`

**Example Request:**
```json
{
  "tool": "get-design-token-details",
  "arguments": {
    "name": "visa-blue-primary"
  }
}
```

**Example Response:**
```json
{
  "name": "visa-blue-primary",
  "value": "#1A1F71",
  "category": "color",
  "description": "Primary Visa brand blue color - the core brand color",
  "usage": ["primary buttons", "brand elements", "headers", "navigation", "call-to-action"],
  "deprecated": false,
  "aliases": ["primary-blue", "brand-blue", "visa-primary"]
}
```

### get-design-token-categories

Get all available design token categories.

**Parameters:** None

**Example Request:**
```json
{
  "tool": "get-design-token-categories",
  "arguments": {}
}
```

**Example Response:**
```json
{
  "categories": ["color", "typography", "spacing", "elevation", "motion"],
  "count": 5
}
```

## Component Tools

### get-components

Get all components with optional filtering.

**Parameters:**
- `category` (optional): Filter components by category
  - Type: `string`
- `name` (optional): Filter components by name (partial match)
  - Type: `string`

**Example Request:**
```json
{
  "tool": "get-components",
  "arguments": {
    "category": "form"
  }
}
```

**Example Response:**
```json
{
  "components": [
    {
      "name": "Button",
      "description": "Primary button component for user interactions",
      "category": "form"
    },
    {
      "name": "Input",
      "description": "Form input component with validation",
      "category": "form"
    }
  ],
  "count": 2,
  "filters": {
    "category": "form"
  }
}
```

### get-component-details

Get detailed information about a specific component.

**Parameters:**
- `name` (required): Component name
  - Type: `string`

**Example Request:**
```json
{
  "tool": "get-component-details",
  "arguments": {
    "name": "Button"
  }
}
```

**Example Response:**
```json
{
  "name": "Button",
  "description": "Primary button component for user interactions with Visa brand styling",
  "category": "form",
  "props": [
    {
      "name": "variant",
      "type": "string",
      "required": false,
      "default": "primary",
      "description": "Button style variant (primary, secondary, outline, ghost, destructive)"
    },
    {
      "name": "size",
      "type": "string",
      "required": false,
      "default": "medium",
      "description": "Button size (small, medium, large, xl)"
    }
  ],
  "variants": [
    {
      "name": "primary",
      "props": { "variant": "primary" },
      "description": "Primary action button with Visa blue background"
    }
  ],
  "examples": [
    {
      "title": "Primary Button",
      "description": "Standard primary button for main actions",
      "code": "<Button variant=\"primary\" onClick={handleSubmit}>Submit Payment</Button>",
      "language": "jsx"
    }
  ],
  "guidelines": [
    "Use primary buttons for the main action on a page or section",
    "Limit to one primary button per view to maintain clear hierarchy"
  ],
  "accessibility": {
    "ariaLabels": ["button", "submit", "cancel"],
    "keyboardNavigation": "Tab to focus, Enter or Space to activate",
    "screenReaderSupport": "Announces button text, state, and role",
    "colorContrast": "Meets WCAG AA standards (4.5:1 minimum)"
  }
}
```

### get-component-examples

Get code examples for a specific component.

**Parameters:**
- `name` (required): Component name
  - Type: `string`

**Example Request:**
```json
{
  "tool": "get-component-examples",
  "arguments": {
    "name": "Button"
  }
}
```

**Example Response:**
```json
{
  "component": "Button",
  "examples": [
    {
      "title": "Primary Button",
      "description": "Standard primary button for main actions",
      "code": "<Button variant=\"primary\" onClick={handleSubmit}>Submit Payment</Button>",
      "language": "jsx"
    },
    {
      "title": "Button with Icon",
      "description": "Button with an icon for enhanced visual communication",
      "code": "<Button variant=\"primary\" icon={<CreditCardIcon />} onClick={handlePayment}>Pay Now</Button>",
      "language": "jsx"
    }
  ],
  "count": 2
}
```

### search-components

Search components by name, description, or other criteria.

**Parameters:**
- `query` (required): Search query for components
  - Type: `string`

**Example Request:**
```json
{
  "tool": "search-components",
  "arguments": {
    "query": "button"
  }
}
```

**Example Response:**
```json
{
  "components": [
    {
      "name": "Button",
      "description": "Primary button component for user interactions",
      "category": "form"
    }
  ],
  "count": 1,
  "query": "button"
}
```

## Guidelines Tools

### get-guidelines

Get design guidelines with optional category filtering.

**Parameters:**
- `category` (optional): Filter guidelines by category
  - Type: `string`

**Example Request:**
```json
{
  "tool": "get-guidelines",
  "arguments": {
    "category": "design"
  }
}
```

**Example Response:**
```json
{
  "guidelines": [
    {
      "id": "visa-brand-colors",
      "title": "Visa Brand Color System",
      "category": "design",
      "content": "The Visa color palette is built around our iconic brand blue...",
      "tags": ["color", "branding", "consistency"],
      "lastUpdated": "2024-01-15T10:00:00Z"
    }
  ],
  "count": 1,
  "filters": {
    "category": "design"
  }
}
```

### get-guideline-details

Get detailed information about a specific guideline.

**Parameters:**
- `id` (required): Guideline ID
  - Type: `string`

**Example Request:**
```json
{
  "tool": "get-guideline-details",
  "arguments": {
    "id": "visa-brand-colors"
  }
}
```

**Example Response:**
```json
{
  "id": "visa-brand-colors",
  "title": "Visa Brand Color System",
  "category": "design",
  "content": "The Visa color palette is built around our iconic brand blue (#1A1F71) and complementary gold (#F7B801). Primary blue should be used for main actions, navigation, and brand elements...",
  "tags": ["color", "branding", "consistency", "palette"],
  "lastUpdated": "2024-01-15T10:00:00Z",
  "relatedComponents": ["Button", "Card", "Badge", "Alert"],
  "relatedTokens": ["visa-blue-primary", "visa-blue-secondary", "visa-gold"]
}
```

### search-guidelines

Search guidelines by content, title, or tags.

**Parameters:**
- `query` (required): Search query for guidelines
  - Type: `string`

**Example Request:**
```json
{
  "tool": "search-guidelines",
  "arguments": {
    "query": "color"
  }
}
```

**Example Response:**
```json
{
  "guidelines": [
    {
      "id": "visa-brand-colors",
      "title": "Visa Brand Color System",
      "category": "design",
      "content": "The Visa color palette is built around...",
      "tags": ["color", "branding", "consistency"]
    },
    {
      "id": "semantic-color-usage",
      "title": "Semantic Color Guidelines",
      "category": "design",
      "content": "Use semantic colors consistently...",
      "tags": ["color", "semantic", "feedback"]
    }
  ],
  "count": 2,
  "query": "color"
}
```

## Error Handling

All tools follow consistent error handling patterns using MCP error codes:

### Common Error Responses

#### Invalid Parameters
```json
{
  "error": {
    "code": -32602,
    "message": "Query parameter is required and must be a string"
  }
}
```

#### Resource Not Found
```json
{
  "error": {
    "code": -32000,
    "message": "Design token 'invalid-token' not found"
  }
}
```

#### Server Not Initialized
```json
{
  "error": {
    "code": -32603,
    "message": "Server not initialized"
  }
}
```

#### Method Not Found
```json
{
  "error": {
    "code": -32601,
    "message": "Unknown tool: invalid-tool-name"
  }
}
```

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse Error | Invalid JSON was received |
| -32600 | Invalid Request | The JSON sent is not a valid Request object |
| -32601 | Method Not Found | The method does not exist / is not available |
| -32602 | Invalid Params | Invalid method parameter(s) |
| -32603 | Internal Error | Internal JSON-RPC error |
| -32000 | Server Error | Implementation-defined server-errors |

## Data Schemas

### Design Token Schema

```json
{
  "type": "object",
  "required": ["name", "value", "category", "description", "usage", "deprecated"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Unique token name"
    },
    "value": {
      "type": "string",
      "description": "Token value (color, size, etc.)"
    },
    "category": {
      "type": "string",
      "enum": ["color", "typography", "spacing", "elevation", "motion"]
    },
    "description": {
      "type": "string",
      "description": "Human-readable description"
    },
    "usage": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Usage contexts"
    },
    "deprecated": {
      "type": "boolean",
      "description": "Whether token is deprecated"
    },
    "aliases": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Alternative names"
    }
  }
}
```

### Component Schema

```json
{
  "type": "object",
  "required": ["name", "description", "category", "props"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Component name"
    },
    "description": {
      "type": "string",
      "description": "Component description"
    },
    "category": {
      "type": "string",
      "description": "Component category"
    },
    "props": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "type", "required", "description"],
        "properties": {
          "name": { "type": "string" },
          "type": { "type": "string" },
          "required": { "type": "boolean" },
          "default": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "variants": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "props": { "type": "object" },
          "description": { "type": "string" }
        }
      }
    },
    "examples": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "code": { "type": "string" },
          "language": { "type": "string" }
        }
      }
    },
    "guidelines": {
      "type": "array",
      "items": { "type": "string" }
    },
    "accessibility": {
      "type": "object",
      "properties": {
        "ariaLabels": {
          "type": "array",
          "items": { "type": "string" }
        },
        "keyboardNavigation": { "type": "string" },
        "screenReaderSupport": { "type": "string" },
        "colorContrast": { "type": "string" }
      }
    }
  }
}
```

### Guideline Schema

```json
{
  "type": "object",
  "required": ["id", "title", "category", "content", "tags", "lastUpdated"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique guideline identifier"
    },
    "title": {
      "type": "string",
      "description": "Guideline title"
    },
    "category": {
      "type": "string",
      "description": "Guideline category"
    },
    "content": {
      "type": "string",
      "description": "Guideline content"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Searchable tags"
    },
    "lastUpdated": {
      "type": "string",
      "format": "date-time",
      "description": "Last update timestamp"
    },
    "relatedComponents": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Related component names"
    },
    "relatedTokens": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Related token names"
    }
  }
}
```

## Rate Limiting

The server implements basic rate limiting to prevent abuse:

- **Default**: 100 requests per minute per client
- **Burst**: Up to 10 requests in a 1-second window
- **Headers**: Rate limit information is included in HTTP responses (if HTTP mode is enabled)

## Caching

The server implements intelligent caching to improve performance:

- **Data Cache**: Design system data is cached in memory
- **Cache Timeout**: Default 5 minutes (configurable)
- **File Watching**: Automatic cache invalidation on file changes
- **Manual Refresh**: Cache can be manually cleared via configuration reload

## Performance Considerations

- **Memory Usage**: Approximately 10-50MB depending on data size
- **Response Time**: < 100ms for cached responses, < 500ms for uncached
- **Concurrent Requests**: Supports up to 100 concurrent connections
- **Data Size Limits**: Individual responses limited to 10MB

## Security

- **Input Validation**: All inputs are validated against schemas
- **Path Traversal Protection**: File paths are sanitized
- **Error Information**: Sensitive information is not exposed in errors
- **Access Control**: No authentication required (design system data is public)