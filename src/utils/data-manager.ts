/**
 * DataManager class for loading, caching, and watching design system data files
 */

import { readFile, access } from 'fs/promises';
import { watch, FSWatcher } from 'chokidar';
import { join, extname } from 'path';
import { EventEmitter } from 'events';
import type { DesignToken, Component, Guideline } from '../types/index.js';
import { 
  validateDesignTokens, 
  validateComponents, 
  validateGuidelines,
  ValidationResult 
} from './validation.js';

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
export class DataManager extends EventEmitter {
  private config: Required<DataManagerConfig>;
  private cache: CachedData | null = null;
  private watcher: FSWatcher | null = null;
  private isLoading = false;

  constructor(config: DataManagerConfig) {
    super();
    this.config = {
      dataPath: config.dataPath,
      enableFileWatching: config.enableFileWatching ?? true,
      cacheTimeout: config.cacheTimeout ?? 300000 // 5 minutes default
    };
  }

  /**
   * Initialize the data manager and load initial data
   */
  async initialize(): Promise<DataLoadResult> {
    const result = await this.loadData();
    
    if (result.success && this.config.enableFileWatching) {
      this.startFileWatching();
    }
    
    return result;
  }

  /**
   * Load design system data from files
   */
  async loadData(): Promise<DataLoadResult> {
    if (this.isLoading) {
      return { success: false, errors: ['Data loading already in progress'] };
    }

    this.isLoading = true;
    const errors: string[] = [];

    try {
      // Load design tokens
      const designTokens = await this.loadDesignTokens();
      if (!designTokens.success) {
        errors.push(...(designTokens.errors || []));
      }

      // Load components
      const components = await this.loadComponents();
      if (!components.success) {
        errors.push(...(components.errors || []));
      }

      // Load guidelines
      const guidelines = await this.loadGuidelines();
      if (!guidelines.success) {
        errors.push(...(guidelines.errors || []));
      }

      // If we have any data, cache it
      if (designTokens.data || components.data || guidelines.data) {
        this.cache = {
          designTokens: designTokens.data || [],
          components: components.data || [],
          guidelines: guidelines.data || [],
          lastUpdated: new Date()
        };

        this.emit('dataLoaded', this.cache);
        
        return {
          success: true,
          data: this.cache,
          errors: errors.length > 0 ? errors : undefined
        };
      }

      return {
        success: false,
        errors: errors.length > 0 ? errors : ['No data could be loaded']
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        errors: [...errors, `Failed to load data: ${errorMessage}`]
      };
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Get cached data
   */
  getCachedData(): CachedData | null {
    return this.cache;
  }

  /**
   * Check if cache is valid based on timeout
   */
  isCacheValid(): boolean {
    if (!this.cache) return false;
    
    const now = new Date();
    const cacheAge = now.getTime() - this.cache.lastUpdated.getTime();
    return cacheAge < this.config.cacheTimeout;
  }

  /**
   * Validate all cached data
   */
  validateCachedData(): ValidationResult {
    if (!this.cache) {
      return { valid: false, errors: ['No cached data available'] };
    }

    const errors: string[] = [];

    // Validate design tokens
    const tokenValidation = validateDesignTokens(this.cache.designTokens);
    if (!tokenValidation.valid && tokenValidation.errors) {
      errors.push(...tokenValidation.errors.map(err => `Design Tokens: ${err}`));
    }

    // Validate components
    const componentValidation = validateComponents(this.cache.components);
    if (!componentValidation.valid && componentValidation.errors) {
      errors.push(...componentValidation.errors.map(err => `Components: ${err}`));
    }

    // Validate guidelines - convert dates to ISO strings for validation
    const guidelinesForValidation = this.cache.guidelines.map(guideline => ({
      ...guideline,
      lastUpdated: guideline.lastUpdated.toISOString()
    }));
    
    const guidelineValidation = validateGuidelines(guidelinesForValidation);
    if (!guidelineValidation.valid && guidelineValidation.errors) {
      errors.push(...guidelineValidation.errors.map(err => `Guidelines: ${err}`));
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Start file watching for automatic cache updates
   */
  private startFileWatching(): void {
    if (this.watcher) {
      this.watcher.close();
    }

    const watchPaths = [
      join(this.config.dataPath, '**/*.json'),
      join(this.config.dataPath, '**/*.yaml'),
      join(this.config.dataPath, '**/*.yml')
    ];

    this.watcher = watch(watchPaths, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    this.watcher.on('change', (path) => {
      this.emit('fileChanged', path);
      this.handleFileChange(path);
    });

    this.watcher.on('add', (path) => {
      this.emit('fileAdded', path);
      this.handleFileChange(path);
    });

    this.watcher.on('unlink', (path) => {
      this.emit('fileRemoved', path);
      this.handleFileChange(path);
    });

    this.watcher.on('error', (error) => {
      this.emit('watchError', error);
    });
  }

  /**
   * Handle file system changes
   */
  private async handleFileChange(filePath: string): Promise<void> {
    // Debounce rapid file changes
    setTimeout(async () => {
      try {
        const result = await this.loadData();
        if (result.success) {
          this.emit('dataUpdated', result.data);
        } else {
          this.emit('dataError', result.errors);
        }
      } catch (error) {
        this.emit('dataError', [error instanceof Error ? error.message : 'Unknown error']);
      }
    }, 100);
  }

  /**
   * Load design tokens from files
   */
  private async loadDesignTokens(): Promise<{ success: boolean; data?: DesignToken[]; errors?: string[] }> {
    try {
      const tokensPath = join(this.config.dataPath, 'design-tokens.json');
      
      // Check if file exists
      try {
        await access(tokensPath);
      } catch {
        return { success: false, errors: [`Design tokens file not found: ${tokensPath}`] };
      }

      const content = await readFile(tokensPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Validate the data
      const validation = validateDesignTokens(Array.isArray(data) ? data : [data]);
      
      if (!validation.valid) {
        return { 
          success: false, 
          errors: validation.errors?.map(err => `Design tokens validation: ${err}`) 
        };
      }

      return { 
        success: true, 
        data: Array.isArray(data) ? data : [data] 
      };

    } catch (error) {
      return { 
        success: false, 
        errors: [`Failed to load design tokens: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  /**
   * Load components from files
   */
  private async loadComponents(): Promise<{ success: boolean; data?: Component[]; errors?: string[] }> {
    try {
      const componentsPath = join(this.config.dataPath, 'components.json');
      
      // Check if file exists
      try {
        await access(componentsPath);
      } catch {
        return { success: false, errors: [`Components file not found: ${componentsPath}`] };
      }

      const content = await readFile(componentsPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Validate the data
      const validation = validateComponents(Array.isArray(data) ? data : [data]);
      
      if (!validation.valid) {
        return { 
          success: false, 
          errors: validation.errors?.map(err => `Components validation: ${err}`) 
        };
      }

      return { 
        success: true, 
        data: Array.isArray(data) ? data : [data] 
      };

    } catch (error) {
      return { 
        success: false, 
        errors: [`Failed to load components: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  /**
   * Load guidelines from files
   */
  private async loadGuidelines(): Promise<{ success: boolean; data?: Guideline[]; errors?: string[] }> {
    try {
      const guidelinesPath = join(this.config.dataPath, 'guidelines.json');
      
      // Check if file exists
      try {
        await access(guidelinesPath);
      } catch {
        return { success: false, errors: [`Guidelines file not found: ${guidelinesPath}`] };
      }

      const content = await readFile(guidelinesPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Parse lastUpdated dates and prepare for validation
      const processedData = (Array.isArray(data) ? data : [data]).map(guideline => ({
        ...guideline,
        lastUpdated: new Date(guideline.lastUpdated)
      }));
      
      // For validation, we need to convert dates back to ISO strings
      const validationData = processedData.map(guideline => ({
        ...guideline,
        lastUpdated: guideline.lastUpdated.toISOString()
      }));
      
      // Validate the data
      const validation = validateGuidelines(validationData);
      
      if (!validation.valid) {
        return { 
          success: false, 
          errors: validation.errors?.map(err => `Guidelines validation: ${err}`) 
        };
      }

      return { 
        success: true, 
        data: processedData 
      };

    } catch (error) {
      return { 
        success: false, 
        errors: [`Failed to load guidelines: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  /**
   * Stop file watching and cleanup
   */
  async destroy(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    this.cache = null;
    this.removeAllListeners();
  }
}