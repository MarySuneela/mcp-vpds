/**
 * Unit tests for ComponentService
 */

import { ComponentService } from '../src/services/component-service.js';
import type { DataManager, CachedData } from '../src/utils/data-manager.js';
import type { Component } from '../src/types/index.js';

// Mock data for testing
const mockComponents: Component[] = [
  {
    name: 'Button',
    description: 'Primary button component for user interactions',
    category: 'form',
    props: [
      {
        name: 'variant',
        type: 'string',
        required: false,
        default: 'primary',
        description: 'Button style variant'
      },
      {
        name: 'onClick',
        type: 'function',
        required: true,
        description: 'Click event handler'
      }
    ],
    variants: [
      {
        name: 'primary',
        props: { variant: 'primary' },
        description: 'Primary action button'
      },
      {
        name: 'secondary',
        props: { variant: 'secondary' },
        description: 'Secondary action button'
      }
    ],
    examples: [
      {
        title: 'Primary Button',
        description: 'Standard primary button',
        code: '<Button variant="primary">Submit</Button>',
        language: 'jsx'
      },
      {
        title: 'Secondary Button',
        description: 'Secondary button example',
        code: '<Button variant="secondary">Cancel</Button>',
        language: 'jsx'
      }
    ],
    guidelines: [
      'Use primary buttons for main actions',
      'Limit to one primary button per section'
    ],
    accessibility: {
      ariaLabels: ['button'],
      keyboardNavigation: 'Tab to focus, Enter to activate',
      screenReaderSupport: 'Announces button text and state'
    }
  },
  {
    name: 'Card',
    description: 'Container component for grouping content',
    category: 'layout',
    props: [
      {
        name: 'elevation',
        type: 'string',
        required: false,
        default: 'low',
        description: 'Card elevation level'
      },
      {
        name: 'padding',
        type: 'string',
        required: false,
        default: 'medium',
        description: 'Internal padding'
      }
    ],
    variants: [
      {
        name: 'default',
        props: { elevation: 'low' },
        description: 'Standard card'
      }
    ],
    examples: [
      {
        title: 'Basic Card',
        description: 'Simple card container',
        code: '<Card>Content</Card>',
        language: 'jsx'
      }
    ],
    guidelines: [
      'Use cards to group related information'
    ],
    accessibility: {
      screenReaderSupport: 'Proper heading structure within cards'
    }
  }
];

const mockCachedData: CachedData = {
  designTokens: [],
  components: mockComponents,
  guidelines: [],
  lastUpdated: new Date()
};

// Create mock DataManager
const createMockDataManager = (data: CachedData | null = mockCachedData): DataManager => {
  const mockDataManager = {
    getCachedData: jest.fn().mockReturnValue(data)
  } as unknown as DataManager;
  
  return mockDataManager;
};

describe('ComponentService', () => {
  let componentService: ComponentService;
  let mockDataManager: DataManager;

  beforeEach(() => {
    mockDataManager = createMockDataManager();
    componentService = new ComponentService(mockDataManager);
  });

  describe('getComponents', () => {
    it('should return all components when no options provided', async () => {
      const result = await componentService.getComponents();
      
      expect(result).toEqual(mockComponents);
      expect(result).toHaveLength(2);
    });

    it('should filter components by category', async () => {
      const result = await componentService.getComponents({ category: 'form' });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Button');
    });

    it('should filter components by name', async () => {
      const result = await componentService.getComponents({ name: 'card' });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Card');
    });

    it('should filter components by required props', async () => {
      const result = await componentService.getComponents({ hasProps: ['onClick'] });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Button');
    });

    it('should filter components by variants', async () => {
      const result = await componentService.getComponents({ hasVariants: ['primary'] });
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Button');
    });

    it('should throw error when no data available', async () => {
      const emptyDataManager = createMockDataManager(null);
      const service = new ComponentService(emptyDataManager);
      
      await expect(service.getComponents()).rejects.toMatchObject({
        code: 'NO_DATA',
        message: 'No component data available'
      });
    });
  });

  describe('getComponent', () => {
    it('should return specific component by name', async () => {
      const result = await componentService.getComponent('Button');
      
      expect(result.name).toBe('Button');
      expect(result.category).toBe('form');
    });

    it('should be case insensitive', async () => {
      const result = await componentService.getComponent('button');
      
      expect(result.name).toBe('Button');
    });

    it('should throw error for invalid name', async () => {
      await expect(componentService.getComponent('')).rejects.toMatchObject({
        code: 'INVALID_NAME',
        message: 'Component name must be a non-empty string'
      });
    });

    it('should throw error for non-existent component', async () => {
      await expect(componentService.getComponent('NonExistent')).rejects.toMatchObject({
        code: 'COMPONENT_NOT_FOUND',
        message: 'Component "NonExistent" not found'
      });
    });

    it('should throw error when no data available', async () => {
      const emptyDataManager = createMockDataManager(null);
      const service = new ComponentService(emptyDataManager);
      
      await expect(service.getComponent('Button')).rejects.toMatchObject({
        code: 'NO_DATA',
        message: 'No component data available'
      });
    });
  });

  describe('getComponentVariants', () => {
    it('should return variants for a component', async () => {
      const result = await componentService.getComponentVariants('Button');
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('primary');
      expect(result[1].name).toBe('secondary');
    });

    it('should throw error for non-existent component', async () => {
      await expect(componentService.getComponentVariants('NonExistent')).rejects.toMatchObject({
        code: 'COMPONENT_NOT_FOUND'
      });
    });
  });

  describe('getComponentVariant', () => {
    it('should return specific variant', async () => {
      const result = await componentService.getComponentVariant('Button', 'primary');
      
      expect(result.name).toBe('primary');
      expect(result.description).toBe('Primary action button');
    });

    it('should be case insensitive', async () => {
      const result = await componentService.getComponentVariant('Button', 'PRIMARY');
      
      expect(result.name).toBe('primary');
    });

    it('should throw error for non-existent variant', async () => {
      await expect(componentService.getComponentVariant('Button', 'nonexistent')).rejects.toMatchObject({
        code: 'VARIANT_NOT_FOUND',
        message: 'Variant "nonexistent" not found for component "Button"'
      });
    });
  });

  describe('getComponentExamples', () => {
    it('should return examples for a component', async () => {
      const result = await componentService.getComponentExamples('Button');
      
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Primary Button');
      expect(result[1].title).toBe('Secondary Button');
    });

    it('should throw error for non-existent component', async () => {
      await expect(componentService.getComponentExamples('NonExistent')).rejects.toMatchObject({
        code: 'COMPONENT_NOT_FOUND'
      });
    });
  });

  describe('getComponentExample', () => {
    it('should return specific example', async () => {
      const result = await componentService.getComponentExample('Button', 'Primary Button');
      
      expect(result.title).toBe('Primary Button');
      expect(result.code).toBe('<Button variant="primary">Submit</Button>');
    });

    it('should be case insensitive', async () => {
      const result = await componentService.getComponentExample('Button', 'primary button');
      
      expect(result.title).toBe('Primary Button');
    });

    it('should throw error for non-existent example', async () => {
      await expect(componentService.getComponentExample('Button', 'nonexistent')).rejects.toMatchObject({
        code: 'EXAMPLE_NOT_FOUND',
        message: 'Example "nonexistent" not found for component "Button"'
      });
    });
  });

  describe('getComponentProps', () => {
    it('should return props for a component', async () => {
      const result = await componentService.getComponentProps('Button');
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('variant');
      expect(result[1].name).toBe('onClick');
    });
  });

  describe('getRequiredProps', () => {
    it('should return only required props', async () => {
      const result = await componentService.getRequiredProps('Button');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('onClick');
      expect(result[0].required).toBe(true);
    });
  });

  describe('getOptionalProps', () => {
    it('should return only optional props', async () => {
      const result = await componentService.getOptionalProps('Button');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('variant');
      expect(result[0].required).toBe(false);
    });
  });

  describe('searchComponents', () => {
    it('should search by component name', async () => {
      const result = await componentService.searchComponents('button');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Button');
    });

    it('should search by description', async () => {
      const result = await componentService.searchComponents('container');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Card');
    });

    it('should search by category', async () => {
      const result = await componentService.searchComponents('layout');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Card');
    });

    it('should search by guidelines', async () => {
      const result = await componentService.searchComponents('primary');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Button');
    });

    it('should search by prop names', async () => {
      const result = await componentService.searchComponents('elevation');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Card');
    });

    it('should return empty array for no matches', async () => {
      const result = await componentService.searchComponents('nonexistent');
      
      expect(result).toHaveLength(0);
    });

    it('should throw error for invalid query', async () => {
      await expect(componentService.searchComponents('')).rejects.toMatchObject({
        code: 'INVALID_QUERY',
        message: 'Search query must be a non-empty string'
      });
    });

    it('should throw error when no data available', async () => {
      const emptyDataManager = createMockDataManager(null);
      const service = new ComponentService(emptyDataManager);
      
      await expect(service.searchComponents('test')).rejects.toMatchObject({
        code: 'NO_DATA',
        message: 'No component data available'
      });
    });
  });

  describe('getComponentsByCategory', () => {
    it('should return components by category', async () => {
      const result = await componentService.getComponentsByCategory('form');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Button');
    });

    it('should throw error for invalid category', async () => {
      await expect(componentService.getComponentsByCategory('')).rejects.toMatchObject({
        code: 'INVALID_CATEGORY',
        message: 'Category must be a non-empty string'
      });
    });
  });

  describe('getComponentCategories', () => {
    it('should return all unique categories', async () => {
      const result = await componentService.getComponentCategories();
      
      expect(result).toEqual(['form', 'layout']);
      expect(result).toHaveLength(2);
    });

    it('should return sorted categories', async () => {
      const result = await componentService.getComponentCategories();
      
      expect(result[0]).toBe('form');
      expect(result[1]).toBe('layout');
    });
  });
});