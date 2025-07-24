/**
 * GuidelinesService class for managing design guidelines and patterns
 */

import type { Guideline } from '../types/index.js';
import type { DataManager } from '../utils/data-manager.js';
import { logger } from '../utils/logger.js';
import { 
  AppError, 
  DataError, 
  NotFoundError, 
  ValidationError,
  handleErrors,
  ErrorHandler 
} from '../utils/errors.js';
import { circuitBreakerManager } from '../utils/circuit-breaker.js';

export interface GuidelineSearchOptions {
  category?: string;
  tags?: string[];
  relatedComponent?: string;
  relatedToken?: string;
}

/**
 * Service for accessing and managing design guidelines and patterns
 */
export class GuidelinesService {
  private dataManager: DataManager;
  private circuitBreaker = circuitBreakerManager.getCircuitBreaker({
    name: 'GuidelinesService',
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    requestTimeout: 5000,   // 5 seconds
    monitoringPeriod: 60000, // 1 minute
    halfOpenMaxCalls: 3
  });

  constructor(dataManager: DataManager) {
    this.dataManager = dataManager;
    logger.info('GuidelinesService initialized', { service: 'GuidelinesService' });
  }

  /**
   * Get all available guidelines
   */
  @handleErrors
  async getGuidelines(options?: GuidelineSearchOptions): Promise<Guideline[]> {
    return this.circuitBreaker.execute(async () => {
      const cachedData = this.dataManager.getCachedData();
      
      if (!cachedData) {
        throw new DataError('No guidelines data available', [
          'Ensure data files are loaded',
          'Check data directory configuration'
        ], { service: 'GuidelinesService', method: 'getGuidelines' });
      }

      let guidelines = cachedData.guidelines;

      // Apply filters if provided
      if (options) {
        guidelines = this.filterGuidelines(guidelines, options);
      }

      return guidelines;
    }, { service: 'GuidelinesService', method: 'getGuidelines', options });
  }

  /**
   * Get a specific guideline by ID
   */
  @handleErrors
  async getGuideline(id: string): Promise<Guideline> {
    return this.circuitBreaker.execute(async () => {
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Guideline ID must be a non-empty string', [], 
          { service: 'GuidelinesService', method: 'getGuideline', id });
      }

      const cachedData = this.dataManager.getCachedData();
      
      if (!cachedData) {
        throw new DataError('No guidelines data available', [
          'Ensure data files are loaded',
          'Check data directory configuration'
        ], { service: 'GuidelinesService', method: 'getGuideline' });
      }

      const guideline = cachedData.guidelines.find(
        guide => guide.id.toLowerCase() === id.toLowerCase()
      );

      if (!guideline) {
        const availableGuidelines = cachedData.guidelines.map(guide => guide.id);
        throw new NotFoundError('Guideline', id, [
          `Available guidelines: ${availableGuidelines.join(', ')}`,
          'Check guideline ID spelling'
        ], { service: 'GuidelinesService', method: 'getGuideline' });
      }

      return guideline;
    }, { service: 'GuidelinesService', method: 'getGuideline', id });
  }

  /**
   * Search guidelines by query string
   */
  @handleErrors
  async searchGuidelines(query: string): Promise<Guideline[]> {
    return this.circuitBreaker.execute(async () => {
      if (!query || typeof query !== 'string') {
        throw new ValidationError('Search query must be a non-empty string', [], 
          { service: 'GuidelinesService', method: 'searchGuidelines', query });
      }

      const cachedData = this.dataManager.getCachedData();
      
      if (!cachedData) {
        throw new DataError('No guidelines data available', [
          'Ensure data files are loaded',
          'Check data directory configuration'
        ], { service: 'GuidelinesService', method: 'searchGuidelines' });
      }

      const searchTerm = query.toLowerCase();
      
      return cachedData.guidelines.filter(guideline => {
        // Search in title
        if (guideline.title.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        // Search in content
        if (guideline.content.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        // Search in category
        if (guideline.category.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        // Search in tags
        if (guideline.tags.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        )) {
          return true;
        }
        
        return false;
      });
    }, { service: 'GuidelinesService', method: 'searchGuidelines', query });
  }

  /**
   * Get guidelines by category
   */
  @handleErrors
  async getGuidelinesByCategory(category: string): Promise<Guideline[]> {
    if (!category || typeof category !== 'string') {
      throw new ValidationError('Category must be a non-empty string', [], 
        { service: 'GuidelinesService', method: 'getGuidelinesByCategory', category });
    }

    return this.getGuidelines({ category });
  }

  /**
   * Get all available guideline categories
   */
  @handleErrors
  async getGuidelineCategories(): Promise<string[]> {
    const guidelines = await this.getGuidelines();
    const categories = new Set(guidelines.map(guide => guide.category));
    return Array.from(categories).sort();
  }

  /**
   * Get guidelines by tag
   */
  @handleErrors
  async getGuidelinesByTag(tag: string): Promise<Guideline[]> {
    if (!tag || typeof tag !== 'string') {
      throw new ValidationError('Tag must be a non-empty string', [], 
        { service: 'GuidelinesService', method: 'getGuidelinesByTag', tag });
    }

    return this.getGuidelines({ tags: [tag] });
  }

  /**
   * Get all available tags
   */
  @handleErrors
  async getAvailableTags(): Promise<string[]> {
    const guidelines = await this.getGuidelines();
    const allTags = guidelines.flatMap(guide => guide.tags);
    const uniqueTags = new Set(allTags);
    return Array.from(uniqueTags).sort();
  }

  /**
   * Get guidelines related to a specific component
   */
  @handleErrors
  async getRelatedToComponent(componentName: string): Promise<Guideline[]> {
    if (!componentName || typeof componentName !== 'string') {
      throw new ValidationError('Component name must be a non-empty string', [], 
        { service: 'GuidelinesService', method: 'getRelatedToComponent', componentName });
    }

    return this.getGuidelines({ relatedComponent: componentName });
  }

  /**
   * Get guidelines related to a specific design token
   */
  @handleErrors
  async getRelatedToToken(tokenName: string): Promise<Guideline[]> {
    if (!tokenName || typeof tokenName !== 'string') {
      throw new ValidationError('Token name must be a non-empty string', [], 
        { service: 'GuidelinesService', method: 'getRelatedToToken', tokenName });
    }

    return this.getGuidelines({ relatedToken: tokenName });
  }

  /**
   * Get related components for a guideline
   */
  @handleErrors
  async getRelatedComponents(guidelineId: string): Promise<string[]> {
    const guideline = await this.getGuideline(guidelineId);
    return guideline.relatedComponents || [];
  }

  /**
   * Get related tokens for a guideline
   */
  @handleErrors
  async getRelatedTokens(guidelineId: string): Promise<string[]> {
    const guideline = await this.getGuideline(guidelineId);
    return guideline.relatedTokens || [];
  }

  /**
   * Filter guidelines based on search options
   */
  private filterGuidelines(guidelines: Guideline[], options: GuidelineSearchOptions): Guideline[] {
    return guidelines.filter(guideline => {
      // Filter by category
      if (options.category && 
          guideline.category.toLowerCase() !== options.category.toLowerCase()) {
        return false;
      }

      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        const guidelineTags = guideline.tags.map(tag => tag.toLowerCase());
        const hasAllTags = options.tags.every(tag => 
          guidelineTags.includes(tag.toLowerCase())
        );
        if (!hasAllTags) {
          return false;
        }
      }

      // Filter by related component
      if (options.relatedComponent) {
        const relatedComponents = guideline.relatedComponents || [];
        const hasRelatedComponent = relatedComponents.some(comp => 
          comp.toLowerCase() === options.relatedComponent!.toLowerCase()
        );
        if (!hasRelatedComponent) {
          return false;
        }
      }

      // Filter by related token
      if (options.relatedToken) {
        const relatedTokens = guideline.relatedTokens || [];
        const hasRelatedToken = relatedTokens.some(token => 
          token.toLowerCase() === options.relatedToken!.toLowerCase()
        );
        if (!hasRelatedToken) {
          return false;
        }
      }

      return true;
    });
  }

}