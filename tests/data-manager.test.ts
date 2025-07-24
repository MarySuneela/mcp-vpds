/**
 * Unit tests for DataManager class
 */

import { jest } from '@jest/globals';
import { readFile, access, mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { DataManager } from '../src/utils/data-manager.js';
import type { DesignToken, Component, Guideline } from '../src/types/index.js';

// Mock fs/promises
jest.mock('fs/promises');
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockAccess = access as jest.MockedFunction<typeof access>;

// Mock chokidar
jest.mock('chokidar');

import { watch } from 'chokidar';
const mockWatch = watch as jest.MockedFunction<typeof watch>;

const mockWatcher = {
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined)
};

mockWatch.mockReturnValue(mockWatcher as any);

describe('DataManager', () => {
  let dataManager: DataManager;
  const testDataPath = '/test/data';

  // Sample test data
  const sampleDesignTokens: DesignToken[] = [
    {
      name: 'primary-blue',
      value: '#0066CC',
      category: 'color',
      description: 'Primary brand blue color'
    }
  ];

  const sampleComponents: Component[] = [
    {
      name: 'Button',
      description: 'Primary button component',
      category: 'form',
      props: [
        {
          name: 'variant',
          type: 'string',
          required: false,
          description: 'Button variant'
        }
      ],
      variants: [
        {
          name: 'primary',
          props: { variant: 'primary' },
          description: 'Primary button variant'
        }
      ],
      examples: [
        {
          title: 'Basic Button',
          description: 'A basic button example',
          code: '<Button>Click me</Button>',
          language: 'jsx'
        }
      ],
      guidelines: ['Use for primary actions'],
      accessibility: {
        ariaLabels: ['button'],
        keyboardNavigation: 'Tab to focus, Enter/Space to activate'
      }
    }
  ];

  const sampleGuidelines: Guideline[] = [
    {
      id: 'color-usage',
      title: 'Color Usage Guidelines',
      category: 'design',
      content: 'Use colors consistently across the application',
      tags: ['color', 'design'],
      lastUpdated: new Date('2023-01-01T00:00:00Z')
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    dataManager = new DataManager({
      dataPath: testDataPath,
      enableFileWatching: false // Disable for most tests
    });
  });

  afterEach(async () => {
    await dataManager.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default config values', () => {
      const dm = new DataManager({ dataPath: '/test' });
      expect(dm).toBeInstanceOf(DataManager);
    });

    it('should accept custom config values', () => {
      const dm = new DataManager({
        dataPath: '/custom',
        enableFileWatching: false,
        cacheTimeout: 60000
      });
      expect(dm).toBeInstanceOf(DataManager);
    });
  });

  describe('loadData', () => {
    it('should successfully load all data types', async () => {
      // Mock file access and content
      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(sampleDesignTokens))
        .mockResolvedValueOnce(JSON.stringify(sampleComponents))
        .mockResolvedValueOnce(JSON.stringify(sampleGuidelines));

      const result = await dataManager.loadData();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.designTokens).toEqual(sampleDesignTokens);
      expect(result.data?.components).toEqual(sampleComponents);
      expect(result.data?.guidelines).toEqual(sampleGuidelines);
    });

    it('should handle missing files gracefully', async () => {
      // Mock file access to throw (file not found)
      mockAccess.mockRejectedValue(new Error('File not found'));

      const result = await dataManager.loadData();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(err => err.includes('not found'))).toBe(true);
    });

    it('should handle invalid JSON gracefully', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue('invalid json');

      const result = await dataManager.loadData();

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate data and report validation errors', async () => {
      // Create invalid data that will definitely fail validation
      const invalidTokens = [{ 
        // Missing required fields
        description: 'Invalid token'
      }];
      
      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(invalidTokens))
        .mockResolvedValueOnce(JSON.stringify(sampleComponents))
        .mockResolvedValueOnce(JSON.stringify(sampleGuidelines));

      const result = await dataManager.loadData();

      // Should succeed overall because components and guidelines are valid
      expect(result.success).toBe(true);
      // But should have validation errors for the invalid tokens
      expect(result.errors?.some(err => err.includes('validation'))).toBe(true);
      // And the invalid tokens should not be in the cache
      expect(result.data?.designTokens).toEqual([]);
    });

    it('should prevent concurrent loading', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('{}'), 100)));

      const promise1 = dataManager.loadData();
      const promise2 = dataManager.loadData();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result2.success).toBe(false);
      expect(result2.errors?.[0]).toContain('already in progress');
    });
  });

  describe('getCachedData', () => {
    it('should return null when no data is cached', () => {
      const cachedData = dataManager.getCachedData();
      expect(cachedData).toBeNull();
    });

    it('should return cached data after successful load', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(sampleDesignTokens))
        .mockResolvedValueOnce(JSON.stringify(sampleComponents))
        .mockResolvedValueOnce(JSON.stringify(sampleGuidelines));

      await dataManager.loadData();
      const cachedData = dataManager.getCachedData();

      expect(cachedData).toBeDefined();
      expect(cachedData?.designTokens).toEqual(sampleDesignTokens);
    });
  });

  describe('isCacheValid', () => {
    it('should return false when no cache exists', () => {
      expect(dataManager.isCacheValid()).toBe(false);
    });

    it('should return true for fresh cache', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(sampleDesignTokens))
        .mockResolvedValueOnce(JSON.stringify(sampleComponents))
        .mockResolvedValueOnce(JSON.stringify(sampleGuidelines));

      await dataManager.loadData();
      expect(dataManager.isCacheValid()).toBe(true);
    });

    it('should return false for expired cache', async () => {
      const shortTimeoutManager = new DataManager({
        dataPath: testDataPath,
        cacheTimeout: 1 // 1ms timeout
      });

      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(sampleDesignTokens))
        .mockResolvedValueOnce(JSON.stringify(sampleComponents))
        .mockResolvedValueOnce(JSON.stringify(sampleGuidelines));

      await shortTimeoutManager.loadData();
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(shortTimeoutManager.isCacheValid()).toBe(false);
      
      await shortTimeoutManager.destroy();
    });
  });

  describe('validateCachedData', () => {
    it('should return invalid when no cache exists', () => {
      const result = dataManager.validateCachedData();
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('No cached data');
    });

    it('should return valid for good cached data', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(sampleDesignTokens))
        .mockResolvedValueOnce(JSON.stringify(sampleComponents))
        .mockResolvedValueOnce(JSON.stringify(sampleGuidelines));

      await dataManager.loadData();
      const result = dataManager.validateCachedData();

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('file watching', () => {
    it('should start file watching when enabled', async () => {
      const watchingManager = new DataManager({
        dataPath: testDataPath,
        enableFileWatching: true
      });

      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(sampleDesignTokens))
        .mockResolvedValueOnce(JSON.stringify(sampleComponents))
        .mockResolvedValueOnce(JSON.stringify(sampleGuidelines));

      await watchingManager.initialize();

      expect(mockWatch).toHaveBeenCalled();
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function));

      await watchingManager.destroy();
    });

    it('should emit events when files change', async () => {
      const watchingManager = new DataManager({
        dataPath: testDataPath,
        enableFileWatching: true
      });

      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(sampleDesignTokens))
        .mockResolvedValueOnce(JSON.stringify(sampleComponents))
        .mockResolvedValueOnce(JSON.stringify(sampleGuidelines));

      await watchingManager.initialize();

      const fileChangedSpy = jest.fn();
      watchingManager.on('fileChanged', fileChangedSpy);

      // Simulate file change
      const changeHandler = mockWatcher.on.mock.calls.find(call => call[0] === 'change')?.[1];
      if (changeHandler) {
        changeHandler('/test/file.json');
      }

      expect(fileChangedSpy).toHaveBeenCalledWith('/test/file.json');

      await watchingManager.destroy();
    });
  });

  describe('initialize', () => {
    it('should load data and start watching', async () => {
      const watchingManager = new DataManager({
        dataPath: testDataPath,
        enableFileWatching: true
      });

      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(sampleDesignTokens))
        .mockResolvedValueOnce(JSON.stringify(sampleComponents))
        .mockResolvedValueOnce(JSON.stringify(sampleGuidelines));

      const result = await watchingManager.initialize();

      expect(result.success).toBe(true);
      expect(mockWatch).toHaveBeenCalled();

      await watchingManager.destroy();
    });

    it('should not start watching if data loading fails', async () => {
      const watchingManager = new DataManager({
        dataPath: testDataPath,
        enableFileWatching: true
      });

      mockAccess.mockRejectedValue(new Error('File not found'));

      const result = await watchingManager.initialize();

      expect(result.success).toBe(false);
      expect(mockWatch).not.toHaveBeenCalled();

      await watchingManager.destroy();
    });
  });

  describe('destroy', () => {
    it('should cleanup watcher and cache', async () => {
      const watchingManager = new DataManager({
        dataPath: testDataPath,
        enableFileWatching: true
      });

      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(sampleDesignTokens))
        .mockResolvedValueOnce(JSON.stringify(sampleComponents))
        .mockResolvedValueOnce(JSON.stringify(sampleGuidelines));

      await watchingManager.initialize();
      
      expect(watchingManager.getCachedData()).toBeDefined();

      await watchingManager.destroy();

      expect(mockWatcher.close).toHaveBeenCalled();
      expect(watchingManager.getCachedData()).toBeNull();
    });
  });

  describe('event emission', () => {
    it('should emit dataLoaded event after successful load', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(sampleDesignTokens))
        .mockResolvedValueOnce(JSON.stringify(sampleComponents))
        .mockResolvedValueOnce(JSON.stringify(sampleGuidelines));

      const dataLoadedSpy = jest.fn();
      dataManager.on('dataLoaded', dataLoadedSpy);

      await dataManager.loadData();

      expect(dataLoadedSpy).toHaveBeenCalledWith(expect.objectContaining({
        designTokens: sampleDesignTokens,
        components: sampleComponents,
        guidelines: sampleGuidelines
      }));
    });
  });
});