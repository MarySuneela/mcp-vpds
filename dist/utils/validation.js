/**
 * Data validation utilities using AJV
 */
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';
// Initialize AJV with formats support
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
// Load schemas - use relative paths that work in both environments
function loadSchemas() {
    try {
        // Try loading from the expected location
        const designTokenSchema = JSON.parse(readFileSync(join(process.cwd(), 'src/schemas/design-token.schema.json'), 'utf-8'));
        const componentSchema = JSON.parse(readFileSync(join(process.cwd(), 'src/schemas/component.schema.json'), 'utf-8'));
        const guidelineSchema = JSON.parse(readFileSync(join(process.cwd(), 'src/schemas/guideline.schema.json'), 'utf-8'));
        return { designTokenSchema, componentSchema, guidelineSchema };
    }
    catch (error) {
        // Fallback schemas for testing
        return {
            designTokenSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    value: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                    category: { type: 'string', enum: ['color', 'typography', 'spacing', 'elevation', 'motion'] }
                },
                required: ['name', 'value', 'category']
            },
            componentSchema: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    props: { type: 'array' },
                    variants: { type: 'array' },
                    examples: { type: 'array' },
                    guidelines: { type: 'array' },
                    accessibility: { type: 'object' }
                },
                required: ['name', 'description', 'category', 'props', 'variants', 'examples', 'guidelines', 'accessibility']
            },
            guidelineSchema: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    category: { type: 'string' },
                    content: { type: 'string' },
                    tags: { type: 'array' },
                    lastUpdated: { type: 'string' }
                },
                required: ['id', 'title', 'category', 'content', 'tags', 'lastUpdated']
            }
        };
    }
}
const { designTokenSchema, componentSchema, guidelineSchema } = loadSchemas();
// Compile validators
const validateDesignToken = ajv.compile(designTokenSchema);
const validateComponent = ajv.compile(componentSchema);
const validateGuideline = ajv.compile(guidelineSchema);
/**
 * Validate a design token object
 */
export function validateDesignTokenData(data) {
    const valid = validateDesignToken(data);
    return {
        valid,
        errors: valid ? undefined : validateDesignToken.errors?.map(err => `${err.instancePath} ${err.message}`)
    };
}
/**
 * Validate a component object
 */
export function validateComponentData(data) {
    const valid = validateComponent(data);
    return {
        valid,
        errors: valid ? undefined : validateComponent.errors?.map(err => `${err.instancePath} ${err.message}`)
    };
}
/**
 * Validate a guideline object
 */
export function validateGuidelineData(data) {
    const valid = validateGuideline(data);
    return {
        valid,
        errors: valid ? undefined : validateGuideline.errors?.map(err => `${err.instancePath} ${err.message}`)
    };
}
/**
 * Validate an array of design tokens
 */
export function validateDesignTokens(tokens) {
    const errors = [];
    for (let i = 0; i < tokens.length; i++) {
        const result = validateDesignTokenData(tokens[i]);
        if (!result.valid && result.errors) {
            errors.push(...result.errors.map(err => `Token ${i}: ${err}`));
        }
    }
    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}
/**
 * Validate an array of components
 */
export function validateComponents(components) {
    const errors = [];
    for (let i = 0; i < components.length; i++) {
        const result = validateComponentData(components[i]);
        if (!result.valid && result.errors) {
            errors.push(...result.errors.map(err => `Component ${i}: ${err}`));
        }
    }
    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}
/**
 * Validate an array of guidelines
 */
export function validateGuidelines(guidelines) {
    const errors = [];
    for (let i = 0; i < guidelines.length; i++) {
        const result = validateGuidelineData(guidelines[i]);
        if (!result.valid && result.errors) {
            errors.push(...result.errors.map(err => `Guideline ${i}: ${err}`));
        }
    }
    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}
//# sourceMappingURL=validation.js.map