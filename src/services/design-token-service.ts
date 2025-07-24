/**
 * DesignTokenService class for managing design tokens and data
 */

import type { DesignToken } from '../types/index.js';
import type { DataManager } from '../utils/data-manager.js';

export interface DesignTokenSearchOptions {
  category?: 'color' | 'typography' | 'spacing' | 'elevation' | 'motion';
  deprecated?: boolean;
  hasUsage?: string[];
}

export interface DesignTokenServiceError {
  code: string;
  message: string;
  suggestions?: string[];
}

/**
 * Service for accessing and managing design tokens
 */
export class DesignTokenService {
  private dataManager: DataManager;

  constructor(dataManager: DataManager) {
    this.dataManager = dataManager;
  }

  /**
   * Get all available design tokens
   */
  async getTokens(options?: DesignTokenSearchOptions): Promise<DesignToken[]> {
    const cachedData = this.dataManager.getCachedData();
    
    if (!cachedData) {
      throw this.createError('NO_DATA', 'No design token data available', [
        'Ensure data files are loaded',
        'Check data directory configuration'
      ]);
    }

    let tokens = cachedData.designTokens;

    // Apply filters if provided
    if (options) {
      tokens = this.filterTokens(tokens, options);
    }

    return tokens;
  }

  /**
   * Get a specific design token by name
   */
  async getToken(name: string): Promise<DesignToken> {
    if (!name || typeof name !== 'string') {
      throw this.createError('INVALID_NAME', 'Token name must be a non-empty string');
    }

    const cachedData = this.dataManager.getCachedData();
    
    if (!cachedData) {
      throw this.createError('NO_DATA', 'No design token data available');
    }

    const token = cachedData.designTokens.find(
      token => token.name.toLowerCase() === name.toLowerCase()
    );

    if (!token) {
      const availableTokens = cachedData.designTokens.map(token => token.name);
      throw this.createError('TOKEN_NOT_FOUND', `Design token "${name}" not found`, [
        `Available tokens: ${availableTokens.slice(0, 10).join(', ')}${availableTokens.length > 10 ? '...' : ''}`,
        'Check token name spelling',
        'Use search-tokens to find similar tokens'
      ]);
    }

    return token;
  }

  /**
   * Search design tokens by various criteria
   */
  async searchTokens(query: string): Promise<DesignToken[]> {
    if (!query || typeof query !== 'string') {
      throw this.createError('INVALID_QUERY', 'Search query must be a non-empty string');
    }

    const cachedData = this.dataManager.getCachedData();
    
    if (!cachedData) {
      throw this.createError('NO_DATA', 'No design token data available');
    }

    const searchTerm = query.toLowerCase();
    
    return cachedData.designTokens.filter(token => {
      // Search in name
      if (token.name.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search in value (convert to string for search)
      if (String(token.value).toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search in description
      if (token.description?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search in usage array
      if (token.usage?.some(usage => 
        usage.toLowerCase().includes(searchTerm)
      )) {
        return true;
      }
      
      // Search in aliases
      if (token.aliases?.some(alias => 
        alias.toLowerCase().includes(searchTerm)
      )) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Get tokens by category
   */
  async getTokensByCategory(category: DesignToken['category']): Promise<DesignToken[]> {
    if (!category || typeof category !== 'string') {
      throw this.createError('INVALID_CATEGORY', 'Category must be a valid token category');
    }

    return this.getTokens({ category });
  }

  /**
   * Get all available token categories
   */
  async getTokenCategories(): Promise<string[]> {
    const tokens = await this.getTokens();
    const categories = new Set(tokens.map(token => token.category));
    return Array.from(categories).sort();
  }

  /**
   * Get token usage examples
   */
  async getTokenUsage(name: string): Promise<string[]> {
    const token = await this.getToken(name);
    return token.usage || [];
  }

  /**
   * Get token aliases
   */
  async getTokenAliases(name: string): Promise<string[]> {
    const token = await this.getToken(name);
    return token.aliases || [];
  }

  /**
   * Get deprecated tokens
   */
  async getDeprecatedTokens(): Promise<DesignToken[]> {
    return this.getTokens({ deprecated: true });
  }

  /**
   * Get active (non-deprecated) tokens
   */
  async getActiveTokens(): Promise<DesignToken[]> {
    return this.getTokens({ deprecated: false });
  }

  /**
   * Find tokens by value
   */
  async findTokensByValue(value: string | number): Promise<DesignToken[]> {
    const cachedData = this.dataManager.getCachedData();
    
    if (!cachedData) {
      throw this.createError('NO_DATA', 'No design token data available');
    }

    return cachedData.designTokens.filter(token => {
      if (typeof value === 'string') {
        return String(token.value).toLowerCase() === value.toLowerCase();
      }
      return token.value === value;
    });
  }

  /**
   * Get tokens that have specific usage
   */
  async getTokensWithUsage(usage: string): Promise<DesignToken[]> {
    if (!usage || typeof usage !== 'string') {
      throw this.createError('INVALID_USAGE', 'Usage must be a non-empty string');
    }

    return this.getTokens({ hasUsage: [usage] });
  }

  /**
   * Filter tokens based on search options
   */
  private filterTokens(tokens: DesignToken[], options: DesignTokenSearchOptions): DesignToken[] {
    return tokens.filter(token => {
      // Filter by category
      if (options.category && token.category !== options.category) {
        return false;
      }

      // Filter by deprecated status
      if (options.deprecated !== undefined) {
        const isDeprecated = token.deprecated === true;
        if (options.deprecated !== isDeprecated) {
          return false;
        }
      }

      // Filter by usage
      if (options.hasUsage && options.hasUsage.length > 0) {
        const tokenUsage = token.usage || [];
        const hasAllUsage = options.hasUsage.every(usage => 
          tokenUsage.some(tokenUsageItem => 
            tokenUsageItem.toLowerCase().includes(usage.toLowerCase())
          )
        );
        if (!hasAllUsage) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Create a standardized error object
   */
  private createError(code: string, message: string, suggestions?: string[]): DesignTokenServiceError {
    return {
      code,
      message,
      suggestions
    };
  }
}