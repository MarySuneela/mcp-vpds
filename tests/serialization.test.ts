/**
 * Tests for serialization utilities
 */

import {
  isDesignToken,
  isComponent,
  isGuideline,
  serializeDesignToken,
  serializeComponent,
  serializeGuideline,
  deserializeDesignToken,
  deserializeComponent,
  deserializeGuideline,
  safeJsonParse,
  safeJsonStringify
} from '../src/utils/serialization.js';

describe('Type Guards', () => {
  describe('isDesignToken', () => {
    it('should return true for valid design token', () => {
      const token = {
        name: 'primary-blue',
        value: '#0066CC',
        category: 'color'
      };
      expect(isDesignToken(token)).toBe(true);
    });

    it('should return false for invalid design token', () => {
      expect(isDesignToken(null)).toBe(false);
      expect(isDesignToken({})).toBe(false);
      expect(isDesignToken({ name: 'test' })).toBe(false);
      expect(isDesignToken({ name: 'test', value: '#000', category: 'invalid' })).toBe(false);
    });
  });

  describe('isComponent', () => {
    it('should return true for valid component', () => {
      const component = {
        name: 'Button',
        description: 'A button',
        category: 'form',
        props: [],
        variants: [],
        examples: [],
        guidelines: [],
        accessibility: {}
      };
      expect(isComponent(component)).toBe(true);
    });

    it('should return false for invalid component', () => {
      expect(isComponent(null)).toBe(false);
      expect(isComponent({})).toBe(false);
      expect(isComponent({ name: 'Button' })).toBe(false);
    });
  });

  describe('isGuideline', () => {
    it('should return true for valid guideline', () => {
      const guideline = {
        id: 'test',
        title: 'Test Guideline',
        category: 'test',
        content: 'Content',
        tags: [],
        lastUpdated: new Date()
      };
      expect(isGuideline(guideline)).toBe(true);
    });

    it('should return false for invalid guideline', () => {
      expect(isGuideline(null)).toBe(false);
      expect(isGuideline({})).toBe(false);
      expect(isGuideline({ id: 'test' })).toBe(false);
    });
  });
});

describe('Serialization', () => {
  it('should serialize and deserialize design token correctly', () => {
    const originalToken = {
      name: 'primary-blue',
      value: '#0066CC',
      category: 'color' as const,
      description: 'Primary brand color',
      usage: ['buttons'],
      deprecated: false,
      aliases: ['brand-blue']
    };

    const serialized = serializeDesignToken(originalToken);
    const deserialized = deserializeDesignToken(serialized);

    expect(deserialized).toEqual(originalToken);
  });

  it('should serialize and deserialize component correctly', () => {
    const originalComponent = {
      name: 'Button',
      description: 'A button component',
      category: 'form',
      props: [
        {
          name: 'variant',
          type: 'string',
          required: false,
          default: 'primary',
          description: 'Button variant'
        }
      ],
      variants: [
        {
          name: 'primary',
          props: { variant: 'primary' },
          description: 'Primary variant'
        }
      ],
      examples: [
        {
          title: 'Basic',
          description: 'Basic example',
          code: '<Button />',
          language: 'jsx'
        }
      ],
      guidelines: ['Use for actions'],
      accessibility: {
        ariaLabels: ['button']
      }
    };

    const serialized = serializeComponent(originalComponent);
    const deserialized = deserializeComponent(serialized);

    expect(deserialized).toEqual(originalComponent);
  });

  it('should serialize and deserialize guideline correctly', () => {
    const originalGuideline = {
      id: 'test-guideline',
      title: 'Test Guideline',
      category: 'test',
      content: 'Test content',
      tags: ['test'],
      lastUpdated: new Date('2024-01-01'),
      relatedComponents: ['Button'],
      relatedTokens: ['primary-blue']
    };

    const serialized = serializeGuideline(originalGuideline);
    const deserialized = deserializeGuideline(serialized);

    expect(deserialized).toEqual(originalGuideline);
  });
});

describe('Safe JSON Operations', () => {
  it('should safely parse valid JSON', () => {
    const jsonString = '{"name": "test", "value": 123}';
    const result = safeJsonParse(jsonString);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'test', value: 123 });
    }
  });

  it('should handle invalid JSON gracefully', () => {
    const invalidJson = '{"name": "test", "value":}';
    const result = safeJsonParse(invalidJson);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('should safely stringify valid data', () => {
    const data = { name: 'test', value: 123 };
    const result = safeJsonStringify(data);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.json).toBe('{"name":"test","value":123}');
    }
  });

  it('should handle circular references gracefully', () => {
    const circular: any = { name: 'test' };
    circular.self = circular;
    
    const result = safeJsonStringify(circular);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});