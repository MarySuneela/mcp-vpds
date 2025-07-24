/**
 * Data serialization and type checking utilities
 */

import type { DesignToken, Component, Guideline } from '../types/index.js';

/**
 * Type guard to check if an object is a DesignToken
 */
export function isDesignToken(obj: unknown): obj is DesignToken {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const token = obj as Record<string, unknown>;
  return (
    typeof token.name === 'string' &&
    (typeof token.value === 'string' || typeof token.value === 'number') &&
    typeof token.category === 'string' &&
    ['color', 'typography', 'spacing', 'elevation', 'motion'].includes(token.category as string)
  );
}

/**
 * Type guard to check if an object is a Component
 */
export function isComponent(obj: unknown): obj is Component {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const component = obj as Record<string, unknown>;
  return (
    typeof component.name === 'string' &&
    typeof component.description === 'string' &&
    typeof component.category === 'string' &&
    Array.isArray(component.props) &&
    Array.isArray(component.variants) &&
    Array.isArray(component.examples) &&
    Array.isArray(component.guidelines) &&
    typeof component.accessibility === 'object'
  );
}

/**
 * Type guard to check if an object is a Guideline
 */
export function isGuideline(obj: unknown): obj is Guideline {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const guideline = obj as Record<string, unknown>;
  return (
    typeof guideline.id === 'string' &&
    typeof guideline.title === 'string' &&
    typeof guideline.category === 'string' &&
    typeof guideline.content === 'string' &&
    Array.isArray(guideline.tags) &&
    (guideline.lastUpdated instanceof Date || typeof guideline.lastUpdated === 'string')
  );
}

/**
 * Serialize a DesignToken to JSON-safe format
 */
export function serializeDesignToken(token: DesignToken): Record<string, unknown> {
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
export function serializeComponent(component: Component): Record<string, unknown> {
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
export function serializeGuideline(guideline: Guideline): Record<string, unknown> {
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
export function deserializeDesignToken(data: Record<string, unknown>): DesignToken {
  return {
    name: data.name as string,
    value: data.value as string | number,
    category: data.category as DesignToken['category'],
    description: data.description as string | undefined,
    usage: data.usage as string[] | undefined,
    deprecated: data.deprecated as boolean | undefined,
    aliases: data.aliases as string[] | undefined
  };
}

/**
 * Deserialize JSON data to Component
 */
export function deserializeComponent(data: Record<string, unknown>): Component {
  return {
    name: data.name as string,
    description: data.description as string,
    category: data.category as string,
    props: data.props as Component['props'],
    variants: data.variants as Component['variants'],
    examples: data.examples as Component['examples'],
    guidelines: data.guidelines as string[],
    accessibility: data.accessibility as Component['accessibility']
  };
}

/**
 * Deserialize JSON data to Guideline
 */
export function deserializeGuideline(data: Record<string, unknown>): Guideline {
  const lastUpdated = typeof data.lastUpdated === 'string' 
    ? new Date(data.lastUpdated) 
    : data.lastUpdated as Date;
    
  return {
    id: data.id as string,
    title: data.title as string,
    category: data.category as string,
    content: data.content as string,
    tags: data.tags as string[],
    lastUpdated,
    relatedComponents: data.relatedComponents as string[] | undefined,
    relatedTokens: data.relatedTokens as string[] | undefined
  };
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse<T>(jsonString: string): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown parsing error' 
    };
  }
}

/**
 * Safe JSON stringification with error handling
 */
export function safeJsonStringify(data: unknown, indent?: number): { success: true; json: string } | { success: false; error: string } {
  try {
    const json = JSON.stringify(data, null, indent);
    return { success: true, json };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown stringification error' 
    };
  }
}