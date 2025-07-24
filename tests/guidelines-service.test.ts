/**
 * Unit tests for GuidelinesService
 */

import { GuidelinesService } from '../src/services/guidelines-service.js';
import type { DataManager, CachedData } from '../src/utils/data-manager.js';
import type { Guideline } from '../src/types/index.js';
import { resetCircuitBreakers } from './utils/test-setup.js';

// Mock data for testing
const mockGuidelines: Guideline[] = [
  {
    id: 'color-usage',
    title: 'Color Usage Guidelines',
    category: 'design',
    content: 'Use Visa brand colors consistently across all applications.',
    tags: ['color', 'branding', 'consistency'],
    lastUpdated: new Date('2023-12-01T10:00:00Z'),
    relatedComponents: ['Button', 'Card'],
    relatedTokens: ['visa-blue-primary', 'visa-blue-secondary', 'visa-gold']
  },
  {
    id: 'typography-hierarchy',
    title: 'Typography Hierarchy',
    category: 'design',
    content: 'Establish clear visual hierarchy using consistent typography scales.',
    tags: ['typography', 'hierarchy', 'readability'],
    lastUpdated: new Date('2023-12-01T10:00:00Z'),
    relatedComponents: [],
    relatedTokens: ['font-size-base', 'font-size-heading-1']
  },
  {
    id: 'spacing-consistency',
    title: 'Spacing and Layout',
    category: 'layout',
    content: 'Use the 8px grid system for consistent spacing.',
    tags: ['spacing', 'layout', 'grid', 'consistency'],
    lastUpdated: new Date('2023-12-01T10:00:00Z'),
    relatedComponents: ['Card', 'Button'],
    relatedTokens: ['spacing-xs', 'spacing-sm', 'spacing-md']
  },
  {
    id: 'accessibility-standards',
    title: 'Accessibility Requirements',
    category: 'accessibility',
    content: 'All components must meet WCAG 2.1 AA standards.',
    tags: ['accessibility', 'wcag', 'contrast', 'keyboard', 'screen-reader'],
    lastUpdated: new Date('2023-12-01T10:00:00Z'),
    relatedComponents: ['Button', 'Card'],
    relatedTokens: []
  },
  {
    id: 'button-usage',
    title: 'Button Usage Patterns',
    category: 'components',
    content: 'Use primary buttons for the main action on a page or section.',
    tags: ['buttons', 'interaction', 'hierarchy'],
    lastUpdated: new Date('2023-12-01T10:00:00Z'),
    relatedComponents: ['Button'],
    relatedTokens: ['visa-blue-primary', 'visa-blue-secondary']
  }
];

const mockCachedData: CachedData = {
  designTokens: [],
  components: [],
  guidelines: mockGuidelines,
  lastUpdated: new Date()
};

// Create mock DataManager
const createMockDataManager = (data: CachedData | null = mockCachedData): DataManager => {
  const mockDataManager = {
    getCachedData: jest.fn().mockReturnValue(data)
  } as unknown as DataManager;
  
  return mockDataManager;
};

describe('GuidelinesService', () => {
  let guidelinesService: GuidelinesService;
  let mockDataManager: DataManager;

  beforeEach(() => {
    resetCircuitBreakers();
  });

  afterEach(() => {
    resetCircuitBreakers();
  });

  // Helper function to create a fresh service instance for each test
  const createService = (data: CachedData | null = mockCachedData) => {
    const dataManager = createMockDataManager(data);
    return new GuidelinesService(dataManager);
  };

  describe('getGuidelines', () => {
    it('should return all guidelines when no options provided', async () => {
      const service = createService();
      const result = await service.getGuidelines();
      
      expect(result).toEqual(mockGuidelines);
      expect(result).toHaveLength(5);
    });

    it('should filter guidelines by category', async () => {
      const service = createService();
      const result = await service.getGuidelines({ category: 'design' });
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('color-usage');
      expect(result[1].id).toBe('typography-hierarchy');
    });

    it('should filter guidelines by single tag', async () => {
      const service = createService();
      const result = await service.getGuidelines({ tags: ['accessibility'] });
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('accessibility-standards');
    });

    it('should filter guidelines by multiple tags', async () => {
      const service = createService();
      const result = await service.getGuidelines({ tags: ['consistency', 'layout'] });
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('spacing-consistency');
    });

    it('should filter guidelines by related component', async () => {
      const service = createService();
      const result = await service.getGuidelines({ relatedComponent: 'Button' });
      
      expect(result).toHaveLength(4);
      expect(result.map(g => g.id)).toContain('color-usage');
      expect(result.map(g => g.id)).toContain('spacing-consistency');
      expect(result.map(g => g.id)).toContain('accessibility-standards');
      expect(result.map(g => g.id)).toContain('button-usage');
    });

    it('should filter guidelines by related token', async () => {
      const service = createService();
      const result = await service.getGuidelines({ relatedToken: 'visa-blue-primary' });
      
      expect(result).toHaveLength(2);
      expect(result.map(g => g.id)).toContain('color-usage');
      expect(result.map(g => g.id)).toContain('button-usage');
    });

    it('should throw error when no data available', async () => {
      const emptyDataManager = createMockDataManager(null);
      const service = new GuidelinesService(emptyDataManager);
      
      await expect(service.getGuidelines()).rejects.toMatchObject({
        code: 'INVALID_DATA'
      });
    });
  });

  describe('getGuideline', () => {
    it('should return specific guideline by ID', async () => {
      const service = createService();
      const result = await service.getGuideline('color-usage');
      
      expect(result.id).toBe('color-usage');
      expect(result.title).toBe('Color Usage Guidelines');
      expect(result.category).toBe('design');
    });

    it('should be case insensitive', async () => {
      const service = createService();
      const result = await service.getGuideline('COLOR-USAGE');
      
      expect(result.id).toBe('color-usage');
    });

    it('should throw error for invalid ID', async () => {
      const service = createService();
      await expect(service.getGuideline('')).rejects.toMatchObject({
        code: 'DATA_VALIDATION_FAILED'
      });
    });

    it('should throw error for non-existent guideline', async () => {
      const service = createService();
      await expect(service.getGuideline('non-existent')).rejects.toMatchObject({
        code: 'RESOURCE_NOT_FOUND'
      });
    });

    it('should throw error when no data available', async () => {
      const service = createService(null);
      
      await expect(service.getGuideline('color-usage')).rejects.toMatchObject({
        code: 'INVALID_DATA'
      });
    });
  });

  describe('searchGuidelines', () => {
    it('should search by guideline title', async () => {
      const service = createService();
      const result = await service.searchGuidelines('color');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('color-usage');
    });

    it('should search by content', async () => {
      const service = createService();
      const result = await service.searchGuidelines('WCAG');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('accessibility-standards');
    });

    it('should search by category', async () => {
      const service = createService();
      const result = await service.searchGuidelines('layout');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('spacing-consistency');
    });

    it('should search by tags', async () => {
      const service = createService();
      const result = await service.searchGuidelines('typography');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('typography-hierarchy');
    });

    it('should return multiple results for broad search', async () => {
      const service = createService();
      const result = await service.searchGuidelines('consistency');
      
      expect(result).toHaveLength(2);
      expect(result.map(g => g.id)).toContain('color-usage');
      expect(result.map(g => g.id)).toContain('spacing-consistency');
    });

    it('should return empty array for no matches', async () => {
      const service = createService();
      const result = await service.searchGuidelines('nonexistent');
      
      expect(result).toHaveLength(0);
    });

    it('should throw error for invalid query', async () => {
      const service = createService();
      await expect(service.searchGuidelines('')).rejects.toMatchObject({
        code: 'DATA_VALIDATION_FAILED'
      });
    });

    it('should throw error when no data available', async () => {
      const service = createService(null);
      
      await expect(service.searchGuidelines('test')).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE'
      });
    });
  });

  describe('getGuidelinesByCategory', () => {
    it('should return guidelines by category', async () => {
      const service = createService();
      const result = await service.getGuidelinesByCategory('design');
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('color-usage');
      expect(result[1].id).toBe('typography-hierarchy');
    });

    it('should throw error for invalid category', async () => {
      const service = createService();
      await expect(service.getGuidelinesByCategory('')).rejects.toMatchObject({
        code: 'DATA_VALIDATION_FAILED'
      });
    });
  });

  describe('getGuidelineCategories', () => {
    it('should return all unique categories', async () => {
      const service = createService();
      const result = await service.getGuidelineCategories();
      
      expect(result).toEqual(['accessibility', 'components', 'design', 'layout']);
      expect(result).toHaveLength(4);
    });

    it('should return sorted categories', async () => {
      const service = createService();
      const result = await service.getGuidelineCategories();
      
      expect(result[0]).toBe('accessibility');
      expect(result[1]).toBe('components');
      expect(result[2]).toBe('design');
      expect(result[3]).toBe('layout');
    });
  });

  describe('getGuidelinesByTag', () => {
    it('should return guidelines by tag', async () => {
      const service = createService();
      const result = await service.getGuidelinesByTag('consistency');
      
      expect(result).toHaveLength(2);
      expect(result.map(g => g.id)).toContain('color-usage');
      expect(result.map(g => g.id)).toContain('spacing-consistency');
    });

    it('should throw error for invalid tag', async () => {
      const service = createService();
      await expect(service.getGuidelinesByTag('')).rejects.toMatchObject({
        code: 'DATA_VALIDATION_FAILED'
      });
    });
  });

  describe('getAvailableTags', () => {
    it('should return all unique tags', async () => {
      const service = createService();
      const result = await service.getAvailableTags();
      
      expect(result).toContain('accessibility');
      expect(result).toContain('branding');
      expect(result).toContain('buttons');
      expect(result).toContain('color');
      expect(result).toContain('consistency');
      expect(result).toContain('contrast');
      expect(result).toContain('grid');
      expect(result).toContain('hierarchy');
      expect(result).toContain('interaction');
      expect(result).toContain('keyboard');
      expect(result).toContain('layout');
      expect(result).toContain('readability');
      expect(result).toContain('screen-reader');
      expect(result).toContain('spacing');
      expect(result).toContain('typography');
      expect(result).toContain('wcag');
      expect(result).toHaveLength(16);
    });

    it('should return sorted tags', async () => {
      const service = createService();
      const result = await service.getAvailableTags();
      
      expect(result[0]).toBe('accessibility');
      expect(result[1]).toBe('branding');
    });
  });

  describe('getRelatedToComponent', () => {
    it('should return guidelines related to a component', async () => {
      const service = createService();
      const result = await service.getRelatedToComponent('Button');
      
      expect(result).toHaveLength(4);
      expect(result.map(g => g.id)).toContain('color-usage');
      expect(result.map(g => g.id)).toContain('spacing-consistency');
      expect(result.map(g => g.id)).toContain('accessibility-standards');
      expect(result.map(g => g.id)).toContain('button-usage');
    });

    it('should return empty array for component with no related guidelines', async () => {
      const service = createService();
      const result = await service.getRelatedToComponent('NonExistentComponent');
      
      expect(result).toHaveLength(0);
    });

    it('should throw error for invalid component name', async () => {
      const service = createService();
      await expect(service.getRelatedToComponent('')).rejects.toMatchObject({
        code: 'DATA_VALIDATION_FAILED'
      });
    });
  });

  describe('getRelatedToToken', () => {
    it('should return guidelines related to a token', async () => {
      const service = createService();
      const result = await service.getRelatedToToken('visa-blue-primary');
      
      expect(result).toHaveLength(2);
      expect(result.map(g => g.id)).toContain('color-usage');
      expect(result.map(g => g.id)).toContain('button-usage');
    });

    it('should return empty array for token with no related guidelines', async () => {
      const service = createService();
      const result = await service.getRelatedToToken('nonexistent-token');
      
      expect(result).toHaveLength(0);
    });

    it('should throw error for invalid token name', async () => {
      const service = createService();
      await expect(service.getRelatedToToken('')).rejects.toMatchObject({
        code: 'DATA_VALIDATION_FAILED'
      });
    });
  });

  describe('getRelatedComponents', () => {
    it('should return related components for a guideline', async () => {
      const service = createService();
      const result = await service.getRelatedComponents('color-usage');
      
      expect(result).toEqual(['Button', 'Card']);
    });

    it('should return empty array for guideline with no related components', async () => {
      const service = createService();
      const result = await service.getRelatedComponents('typography-hierarchy');
      
      expect(result).toEqual([]);
    });

    it('should throw error for non-existent guideline', async () => {
      const service = createService();
      await expect(service.getRelatedComponents('non-existent')).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE'
      });
    });
  });

  describe('getRelatedTokens', () => {
    it('should return related tokens for a guideline', async () => {
      const service = createService();
      const result = await service.getRelatedTokens('color-usage');
      
      expect(result).toEqual(['visa-blue-primary', 'visa-blue-secondary', 'visa-gold']);
    });

    it('should return empty array for guideline with no related tokens', async () => {
      const service = createService();
      const result = await service.getRelatedTokens('accessibility-standards');
      
      expect(result).toEqual([]);
    });

    it('should throw error for non-existent guideline', async () => {
      const service = createService();
      await expect(service.getRelatedTokens('non-existent')).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE'
      });
    });
  });
});