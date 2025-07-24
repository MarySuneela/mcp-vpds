/**
 * Unit tests for DesignTokenService class
 */

import type { DesignToken } from '../src/types/index.js';

// Mock DataManager
jest.mock('../src/utils/data-manager.js');

import { DesignTokenService } from '../src/services/design-token-service.js';
import { DataManager } from '../src/utils/data-manager.js';

describe('DesignTokenService', () => {
  let designTokenService: DesignTokenService;
  let mockDataManager: jest.Mocked<DataManager>;
  let mockDesignTokens: DesignToken[];

  beforeEach(() => {
    // Setup mock design tokens
    mockDesignTokens = [
      {
        name: 'primary-blue',
        value: '#0066CC',
        category: 'color',
        description: 'Primary brand blue color',
        usage: ['buttons', 'links'],
        aliases: ['brand-blue', 'main-blue']
      },
      {
        name: 'secondary-gray',
        value: '#666666',
        category: 'color',
        description: 'Secondary gray color',
        usage: ['text', 'borders'],
        deprecated: false
      },
      {
        name: 'old-red',
        value: '#FF0000',
        category: 'color',
        description: 'Deprecated red color',
        deprecated: true,
        aliases: ['danger-red']
      },
      {
        name: 'font-size-large',
        value: '18px',
        category: 'typography',
        description: 'Large font size for headings',
        usage: ['headings', 'titles']
      },
      {
        name: 'spacing-medium',
        value: 16,
        category: 'spacing',
        description: 'Medium spacing value',
        usage: ['margins', 'padding']
      },
      {
        name: 'elevation-high',
        value: '0 8px 16px rgba(0,0,0,0.2)',
        category: 'elevation',
        description: 'High elevation shadow',
        usage: ['modals', 'dropdowns']
      }
    ];

    // Setup mock DataManager
    mockDataManager = {
      getCachedData: jest.fn().mockReturnValue({
        designTokens: mockDesignTokens,
        components: [],
        guidelines: []
      }),
      initialize: jest.fn(),
      loadData: jest.fn(),
      validateData: jest.fn(),
      watchFiles: jest.fn(),
      stopWatching: jest.fn()
    } as any;

    (DataManager as jest.MockedClass<typeof DataManager>).mockImplementation(() => mockDataManager);

    // Create DesignTokenService instance
    designTokenService = new DesignTokenService(mockDataManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTokens', () => {
    it('should return all tokens when no options provided', async () => {
      const tokens = await designTokenService.getTokens();
      
      expect(tokens).toHaveLength(6);
      expect(tokens).toEqual(mockDesignTokens);
      expect(mockDataManager.getCachedData).toHaveBeenCalledTimes(1);
    });

    it('should filter tokens by category', async () => {
      const tokens = await designTokenService.getTokens({ category: 'color' });
      
      expect(tokens).toHaveLength(3);
      expect(tokens.every(token => token.category === 'color')).toBe(true);
      expect(tokens.map(t => t.name)).toEqual(['primary-blue', 'secondary-gray', 'old-red']);
    });

    it('should filter tokens by deprecated status', async () => {
      const deprecatedTokens = await designTokenService.getTokens({ deprecated: true });
      const activeTokens = await designTokenService.getTokens({ deprecated: false });
      
      expect(deprecatedTokens).toHaveLength(1);
      expect(deprecatedTokens[0].name).toBe('old-red');
      
      expect(activeTokens).toHaveLength(5);
      expect(activeTokens.every(token => token.deprecated !== true)).toBe(true);
    });

    it('should filter tokens by usage', async () => {
      const tokens = await designTokenService.getTokens({ hasUsage: ['buttons'] });
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
    });

    it('should combine multiple filters', async () => {
      const tokens = await designTokenService.getTokens({ 
        category: 'color', 
        deprecated: false 
      });
      
      expect(tokens).toHaveLength(2);
      expect(tokens.map(t => t.name)).toEqual(['primary-blue', 'secondary-gray']);
    });

    it('should throw error when no data available', async () => {
      mockDataManager.getCachedData.mockReturnValue(null);
      
      await expect(designTokenService.getTokens()).rejects.toMatchObject({
        code: 'NO_DATA',
        message: 'No design token data available'
      });
    });
  });

  describe('getToken', () => {
    it('should return specific token by name', async () => {
      const token = await designTokenService.getToken('primary-blue');
      
      expect(token).toEqual(mockDesignTokens[0]);
      expect(token.name).toBe('primary-blue');
    });

    it('should be case insensitive', async () => {
      const token = await designTokenService.getToken('PRIMARY-BLUE');
      
      expect(token).toEqual(mockDesignTokens[0]);
      expect(token.name).toBe('primary-blue');
    });

    it('should throw error for non-existent token', async () => {
      await expect(designTokenService.getToken('non-existent')).rejects.toMatchObject({
        code: 'TOKEN_NOT_FOUND',
        message: 'Design token "non-existent" not found'
      });
    });

    it('should throw error for invalid name parameter', async () => {
      await expect(designTokenService.getToken('')).rejects.toMatchObject({
        code: 'INVALID_NAME',
        message: 'Token name must be a non-empty string'
      });
      
      await expect(designTokenService.getToken(null as any)).rejects.toMatchObject({
        code: 'INVALID_NAME'
      });
    });

    it('should throw error when no data available', async () => {
      mockDataManager.getCachedData.mockReturnValue(null);
      
      await expect(designTokenService.getToken('primary-blue')).rejects.toMatchObject({
        code: 'NO_DATA',
        message: 'No design token data available'
      });
    });
  });

  describe('searchTokens', () => {
    it('should search tokens by name', async () => {
      const tokens = await designTokenService.searchTokens('blue');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
    });

    it('should search tokens by value', async () => {
      const tokens = await designTokenService.searchTokens('#0066CC');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
    });

    it('should search tokens by description', async () => {
      const tokens = await designTokenService.searchTokens('brand');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
    });

    it('should search tokens by usage', async () => {
      const tokens = await designTokenService.searchTokens('buttons');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
    });

    it('should search tokens by aliases', async () => {
      const tokens = await designTokenService.searchTokens('brand-blue');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
    });

    it('should be case insensitive', async () => {
      const tokens = await designTokenService.searchTokens('BLUE');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
    });

    it('should return multiple matching tokens', async () => {
      const tokens = await designTokenService.searchTokens('color');
      
      expect(tokens.length).toBeGreaterThan(1);
      expect(tokens.every(token => 
        token.description?.toLowerCase().includes('color') ||
        token.usage?.some(usage => usage.toLowerCase().includes('color'))
      )).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const tokens = await designTokenService.searchTokens('nonexistent');
      
      expect(tokens).toHaveLength(0);
    });

    it('should throw error for invalid query parameter', async () => {
      await expect(designTokenService.searchTokens('')).rejects.toMatchObject({
        code: 'INVALID_QUERY',
        message: 'Search query must be a non-empty string'
      });
      
      await expect(designTokenService.searchTokens(null as any)).rejects.toMatchObject({
        code: 'INVALID_QUERY'
      });
    });

    it('should throw error when no data available', async () => {
      mockDataManager.getCachedData.mockReturnValue(null);
      
      await expect(designTokenService.searchTokens('blue')).rejects.toMatchObject({
        code: 'NO_DATA',
        message: 'No design token data available'
      });
    });
  });

  describe('getTokensByCategory', () => {
    it('should return tokens for valid category', async () => {
      const tokens = await designTokenService.getTokensByCategory('typography');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('font-size-large');
      expect(tokens[0].category).toBe('typography');
    });

    it('should return empty array for category with no tokens', async () => {
      const tokens = await designTokenService.getTokensByCategory('motion');
      
      expect(tokens).toHaveLength(0);
    });

    it('should throw error for invalid category parameter', async () => {
      await expect(designTokenService.getTokensByCategory('')).rejects.toMatchObject({
        code: 'INVALID_CATEGORY',
        message: 'Category must be a valid token category'
      });
    });
  });

  describe('getTokenCategories', () => {
    it('should return all available categories', async () => {
      const categories = await designTokenService.getTokenCategories();
      
      expect(categories).toEqual(['color', 'elevation', 'spacing', 'typography']);
      expect(categories).toHaveLength(4);
    });

    it('should return sorted categories', async () => {
      const categories = await designTokenService.getTokenCategories();
      const sortedCategories = [...categories].sort();
      
      expect(categories).toEqual(sortedCategories);
    });
  });

  describe('getTokenUsage', () => {
    it('should return usage array for token', async () => {
      const usage = await designTokenService.getTokenUsage('primary-blue');
      
      expect(usage).toEqual(['buttons', 'links']);
    });

    it('should return empty array for token without usage', async () => {
      // Add a token without usage for this test
      const tokenWithoutUsage: DesignToken = {
        name: 'test-token',
        value: '#000000',
        category: 'color'
      };
      
      mockDataManager.getCachedData.mockReturnValue({
        designTokens: [tokenWithoutUsage],
        components: [],
        guidelines: []
      });
      
      const usage = await designTokenService.getTokenUsage('test-token');
      
      expect(usage).toEqual([]);
    });
  });

  describe('getTokenAliases', () => {
    it('should return aliases array for token', async () => {
      const aliases = await designTokenService.getTokenAliases('primary-blue');
      
      expect(aliases).toEqual(['brand-blue', 'main-blue']);
    });

    it('should return empty array for token without aliases', async () => {
      const aliases = await designTokenService.getTokenAliases('font-size-large');
      
      expect(aliases).toEqual([]);
    });
  });

  describe('getDeprecatedTokens', () => {
    it('should return only deprecated tokens', async () => {
      const tokens = await designTokenService.getDeprecatedTokens();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('old-red');
      expect(tokens[0].deprecated).toBe(true);
    });
  });

  describe('getActiveTokens', () => {
    it('should return only non-deprecated tokens', async () => {
      const tokens = await designTokenService.getActiveTokens();
      
      expect(tokens).toHaveLength(5);
      expect(tokens.every(token => token.deprecated !== true)).toBe(true);
    });
  });

  describe('findTokensByValue', () => {
    it('should find tokens by string value', async () => {
      const tokens = await designTokenService.findTokensByValue('#0066CC');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
    });

    it('should find tokens by numeric value', async () => {
      const tokens = await designTokenService.findTokensByValue(16);
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('spacing-medium');
    });

    it('should be case insensitive for string values', async () => {
      const tokens = await designTokenService.findTokensByValue('#0066cc');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
    });

    it('should return empty array for no matches', async () => {
      const tokens = await designTokenService.findTokensByValue('#FFFFFF');
      
      expect(tokens).toHaveLength(0);
    });
  });

  describe('getTokensWithUsage', () => {
    it('should return tokens with specific usage', async () => {
      const tokens = await designTokenService.getTokensWithUsage('buttons');
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
    });

    it('should return empty array for usage not found', async () => {
      const tokens = await designTokenService.getTokensWithUsage('nonexistent-usage');
      
      expect(tokens).toHaveLength(0);
    });

    it('should throw error for invalid usage parameter', async () => {
      await expect(designTokenService.getTokensWithUsage('')).rejects.toMatchObject({
        code: 'INVALID_USAGE',
        message: 'Usage must be a non-empty string'
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error messages with suggestions', async () => {
      try {
        await designTokenService.getToken('nonexistent');
      } catch (error: any) {
        expect(error.code).toBe('TOKEN_NOT_FOUND');
        expect(error.message).toContain('Design token "nonexistent" not found');
        expect(error.suggestions).toBeDefined();
        expect(Array.isArray(error.suggestions)).toBe(true);
        expect(error.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should handle data manager returning null', async () => {
      mockDataManager.getCachedData.mockReturnValue(null);
      
      const methods = [
        () => designTokenService.getTokens(),
        () => designTokenService.getToken('test'),
        () => designTokenService.searchTokens('test'),
        () => designTokenService.findTokensByValue('test')
      ];

      for (const method of methods) {
        await expect(method()).rejects.toMatchObject({
          code: 'NO_DATA',
          message: 'No design token data available'
        });
      }
    });

    it('should validate parameter types', async () => {
      const invalidParams = [
        () => designTokenService.getToken(123 as any),
        () => designTokenService.searchTokens(123 as any),
        () => designTokenService.getTokensByCategory(123 as any),
        () => designTokenService.getTokensWithUsage(123 as any)
      ];

      for (const method of invalidParams) {
        await expect(method()).rejects.toHaveProperty('code');
      }
    });
  });

  describe('Filter Logic', () => {
    it('should handle complex filter combinations', async () => {
      const tokens = await designTokenService.getTokens({
        category: 'color',
        deprecated: false,
        hasUsage: ['buttons']
      });
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
      expect(tokens[0].category).toBe('color');
      expect(tokens[0].deprecated).not.toBe(true);
      expect(tokens[0].usage).toContain('buttons');
    });

    it('should return empty array when filters match nothing', async () => {
      const tokens = await designTokenService.getTokens({
        category: 'color',
        hasUsage: ['nonexistent-usage']
      });
      
      expect(tokens).toHaveLength(0);
    });

    it('should handle partial usage matches', async () => {
      const tokens = await designTokenService.getTokens({
        hasUsage: ['button'] // partial match for 'buttons'
      });
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].name).toBe('primary-blue');
    });
  });
});