/**
 * Data validation utilities using AJV
 */
export interface ValidationResult {
    valid: boolean;
    errors?: string[];
}
/**
 * Validate a design token object
 */
export declare function validateDesignTokenData(data: unknown): ValidationResult;
/**
 * Validate a component object
 */
export declare function validateComponentData(data: unknown): ValidationResult;
/**
 * Validate a guideline object
 */
export declare function validateGuidelineData(data: unknown): ValidationResult;
/**
 * Validate an array of design tokens
 */
export declare function validateDesignTokens(tokens: unknown[]): ValidationResult;
/**
 * Validate an array of components
 */
export declare function validateComponents(components: unknown[]): ValidationResult;
/**
 * Validate an array of guidelines
 */
export declare function validateGuidelines(guidelines: unknown[]): ValidationResult;
//# sourceMappingURL=validation.d.ts.map