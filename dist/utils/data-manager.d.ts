/**
 * DataManager class for loading, caching, and watching design system data files
 */
import { EventEmitter } from 'events';
import type { DesignToken, Component, Guideline } from '../types/index.js';
import { ValidationResult } from './validation.js';
export interface DataManagerConfig {
    dataPath: string;
    enableFileWatching?: boolean;
    cacheTimeout?: number;
}
export interface CachedData {
    designTokens: DesignToken[];
    components: Component[];
    guidelines: Guideline[];
    lastUpdated: Date;
}
export interface DataLoadResult {
    success: boolean;
    data?: CachedData;
    errors?: string[];
}
/**
 * DataManager handles loading, caching, and watching design system data files
 */
export declare class DataManager extends EventEmitter {
    private config;
    private cache;
    private watcher;
    private isLoading;
    constructor(config: DataManagerConfig);
    /**
     * Initialize the data manager and load initial data
     */
    initialize(): Promise<DataLoadResult>;
    /**
     * Load design system data from files
     */
    loadData(): Promise<DataLoadResult>;
    /**
     * Get cached data
     */
    getCachedData(): CachedData | null;
    /**
     * Check if cache is valid based on timeout
     */
    isCacheValid(): boolean;
    /**
     * Validate all cached data
     */
    validateCachedData(): ValidationResult;
    /**
     * Start file watching for automatic cache updates
     */
    private startFileWatching;
    /**
     * Handle file system changes
     */
    private handleFileChange;
    /**
     * Load design tokens from files
     */
    private loadDesignTokens;
    /**
     * Load components from files
     */
    private loadComponents;
    /**
     * Load guidelines from files
     */
    private loadGuidelines;
    /**
     * Stop file watching and cleanup
     */
    destroy(): Promise<void>;
}
//# sourceMappingURL=data-manager.d.ts.map