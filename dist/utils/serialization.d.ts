/**
 * Data serialization and type checking utilities
 */
import type { DesignToken, Component, Guideline } from '../types/index.js';
/**
 * Type guard to check if an object is a DesignToken
 */
export declare function isDesignToken(obj: unknown): obj is DesignToken;
/**
 * Type guard to check if an object is a Component
 */
export declare function isComponent(obj: unknown): obj is Component;
/**
 * Type guard to check if an object is a Guideline
 */
export declare function isGuideline(obj: unknown): obj is Guideline;
/**
 * Serialize a DesignToken to JSON-safe format
 */
export declare function serializeDesignToken(token: DesignToken): Record<string, unknown>;
/**
 * Serialize a Component to JSON-safe format
 */
export declare function serializeComponent(component: Component): Record<string, unknown>;
/**
 * Serialize a Guideline to JSON-safe format
 */
export declare function serializeGuideline(guideline: Guideline): Record<string, unknown>;
/**
 * Deserialize JSON data to DesignToken
 */
export declare function deserializeDesignToken(data: Record<string, unknown>): DesignToken;
/**
 * Deserialize JSON data to Component
 */
export declare function deserializeComponent(data: Record<string, unknown>): Component;
/**
 * Deserialize JSON data to Guideline
 */
export declare function deserializeGuideline(data: Record<string, unknown>): Guideline;
/**
 * Safe JSON parsing with error handling
 */
export declare function safeJsonParse<T>(jsonString: string): {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};
/**
 * Safe JSON stringification with error handling
 */
export declare function safeJsonStringify(data: unknown, indent?: number): {
    success: true;
    json: string;
} | {
    success: false;
    error: string;
};
//# sourceMappingURL=serialization.d.ts.map