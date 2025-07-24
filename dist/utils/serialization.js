/**
 * Data serialization and type checking utilities
 */
/**
 * Type guard to check if an object is a DesignToken
 */
export function isDesignToken(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const token = obj;
    return (typeof token.name === 'string' &&
        (typeof token.value === 'string' || typeof token.value === 'number') &&
        typeof token.category === 'string' &&
        ['color', 'typography', 'spacing', 'elevation', 'motion'].includes(token.category));
}
/**
 * Type guard to check if an object is a Component
 */
export function isComponent(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const component = obj;
    return (typeof component.name === 'string' &&
        typeof component.description === 'string' &&
        typeof component.category === 'string' &&
        Array.isArray(component.props) &&
        Array.isArray(component.variants) &&
        Array.isArray(component.examples) &&
        Array.isArray(component.guidelines) &&
        typeof component.accessibility === 'object');
}
/**
 * Type guard to check if an object is a Guideline
 */
export function isGuideline(obj) {
    if (typeof obj !== 'object' || obj === null)
        return false;
    const guideline = obj;
    return (typeof guideline.id === 'string' &&
        typeof guideline.title === 'string' &&
        typeof guideline.category === 'string' &&
        typeof guideline.content === 'string' &&
        Array.isArray(guideline.tags) &&
        (guideline.lastUpdated instanceof Date || typeof guideline.lastUpdated === 'string'));
}
/**
 * Serialize a DesignToken to JSON-safe format
 */
export function serializeDesignToken(token) {
    return {
        name: token.name,
        value: token.value,
        category: token.category,
        description: token.description,
        usage: token.usage,
        deprecated: token.deprecated,
        aliases: token.aliases
    };
}
/**
 * Serialize a Component to JSON-safe format
 */
export function serializeComponent(component) {
    return {
        name: component.name,
        description: component.description,
        category: component.category,
        props: component.props,
        variants: component.variants,
        examples: component.examples,
        guidelines: component.guidelines,
        accessibility: component.accessibility
    };
}
/**
 * Serialize a Guideline to JSON-safe format
 */
export function serializeGuideline(guideline) {
    return {
        id: guideline.id,
        title: guideline.title,
        category: guideline.category,
        content: guideline.content,
        tags: guideline.tags,
        lastUpdated: guideline.lastUpdated instanceof Date
            ? guideline.lastUpdated.toISOString()
            : guideline.lastUpdated,
        relatedComponents: guideline.relatedComponents,
        relatedTokens: guideline.relatedTokens
    };
}
/**
 * Deserialize JSON data to DesignToken
 */
export function deserializeDesignToken(data) {
    return {
        name: data.name,
        value: data.value,
        category: data.category,
        description: data.description,
        usage: data.usage,
        deprecated: data.deprecated,
        aliases: data.aliases
    };
}
/**
 * Deserialize JSON data to Component
 */
export function deserializeComponent(data) {
    return {
        name: data.name,
        description: data.description,
        category: data.category,
        props: data.props,
        variants: data.variants,
        examples: data.examples,
        guidelines: data.guidelines,
        accessibility: data.accessibility
    };
}
/**
 * Deserialize JSON data to Guideline
 */
export function deserializeGuideline(data) {
    const lastUpdated = typeof data.lastUpdated === 'string'
        ? new Date(data.lastUpdated)
        : data.lastUpdated;
    return {
        id: data.id,
        title: data.title,
        category: data.category,
        content: data.content,
        tags: data.tags,
        lastUpdated,
        relatedComponents: data.relatedComponents,
        relatedTokens: data.relatedTokens
    };
}
/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        return { success: true, data };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown parsing error'
        };
    }
}
/**
 * Safe JSON stringification with error handling
 */
export function safeJsonStringify(data, indent) {
    try {
        const json = JSON.stringify(data, null, indent);
        return { success: true, json };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown stringification error'
        };
    }
}
//# sourceMappingURL=serialization.js.map