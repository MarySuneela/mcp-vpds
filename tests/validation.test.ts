/**
 * Tests for data validation utilities
 */

import {
  validateDesignTokenData,
  validateComponentData,
  validateGuidelineData,
  validateDesignTokens,
  validateComponents,
  validateGuidelines
} from '../src/utils/validation.js';

describe('Design Token Validation', () => {
  it('should validate a correct design token', () => {
    const validToken = {
      name: 'primary-blue',
      value: '#0066CC',
      category: 'color',
      description: 'Primary brand color',
      usage: ['buttons', 'links'],
      deprecated: false,
      aliases: ['brand-blue']
    };

    const result = validateDesignTokenData(validToken);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject a design token with missing required fields', () => {
    const invalidToken = {
      name: 'primary-blue',
      // missing value and category
      description: 'Primary brand color'
    };

    const result = validateDesignTokenData(invalidToken);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('should reject a design token with invalid category', () => {
    const invalidToken = {
      name: 'primary-blue',
      value: '#0066CC',
      category: 'invalid-category'
    };

    const result = validateDesignTokenData(invalidToken);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should validate an array of design tokens', () => {
    const tokens = [
      {
        name: 'primary-blue',
        value: '#0066CC',
        category: 'color'
      },
      {
        name: 'font-size-large',
        value: 18,
        category: 'typography'
      }
    ];

    const result = validateDesignTokens(tokens);
    expect(result.valid).toBe(true);
  });
});

describe('Component Validation', () => {
  it('should validate a correct component', () => {
    const validComponent = {
      name: 'Button',
      description: 'A clickable button component',
      category: 'form',
      props: [
        {
          name: 'variant',
          type: 'string',
          required: false,
          default: 'primary',
          description: 'Button style variant'
        }
      ],
      variants: [
        {
          name: 'primary',
          props: { variant: 'primary' },
          description: 'Primary button style'
        }
      ],
      examples: [
        {
          title: 'Basic Button',
          description: 'A simple button example',
          code: '<Button>Click me</Button>',
          language: 'jsx'
        }
      ],
      guidelines: ['Use for primary actions'],
      accessibility: {
        ariaLabels: ['button'],
        keyboardNavigation: 'Tab to focus, Enter/Space to activate'
      }
    };

    const result = validateComponentData(validComponent);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject a component with missing required fields', () => {
    const invalidComponent = {
      name: 'Button',
      // missing other required fields
    };

    const result = validateComponentData(invalidComponent);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

describe('Guideline Validation', () => {
  it('should validate a correct guideline', () => {
    const validGuideline = {
      id: 'button-usage',
      title: 'Button Usage Guidelines',
      category: 'components',
      content: 'Use buttons for primary actions...',
      tags: ['buttons', 'interaction'],
      lastUpdated: '2024-01-01T00:00:00.000Z',
      relatedComponents: ['Button'],
      relatedTokens: ['primary-blue']
    };

    const result = validateGuidelineData(validGuideline);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject a guideline with missing required fields', () => {
    const invalidGuideline = {
      id: 'button-usage',
      // missing other required fields
    };

    const result = validateGuidelineData(invalidGuideline);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should reject a guideline with invalid date format', () => {
    const invalidGuideline = {
      id: 'button-usage',
      title: 'Button Usage Guidelines',
      category: 'components',
      content: 'Use buttons for primary actions...',
      tags: ['buttons'],
      lastUpdated: 'invalid-date'
    };

    const result = validateGuidelineData(invalidGuideline);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});