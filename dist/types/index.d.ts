/**
 * Core type definitions for the Visa Design System MCP Server
 */
export interface DesignToken {
    name: string;
    value: string | number;
    category: 'color' | 'typography' | 'spacing' | 'elevation' | 'motion';
    description?: string;
    usage?: string[];
    deprecated?: boolean;
    aliases?: string[];
}
export interface ComponentProp {
    name: string;
    type: string;
    required: boolean;
    default?: any;
    description: string;
}
export interface ComponentVariant {
    name: string;
    props: Record<string, any>;
    description: string;
}
export interface ComponentExample {
    title: string;
    description: string;
    code: string;
    language: string;
}
export interface AccessibilityInfo {
    ariaLabels?: string[];
    keyboardNavigation?: string;
    screenReaderSupport?: string;
    colorContrast?: string;
}
export interface Component {
    name: string;
    description: string;
    category: string;
    props: ComponentProp[];
    variants: ComponentVariant[];
    examples: ComponentExample[];
    guidelines: string[];
    accessibility: AccessibilityInfo;
}
export interface Guideline {
    id: string;
    title: string;
    category: string;
    content: string;
    tags: string[];
    lastUpdated: Date;
    relatedComponents?: string[];
    relatedTokens?: string[];
}
export interface ServerConfig {
    dataPath: string;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    enableFileWatching: boolean;
    cacheTimeout: number;
}
//# sourceMappingURL=index.d.ts.map