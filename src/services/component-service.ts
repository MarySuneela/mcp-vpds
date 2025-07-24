/**
 * ComponentService class for managing component specifications and data
 */

import type { Component, ComponentProp, ComponentVariant, ComponentExample } from '../types/index.js';
import type { DataManager } from '../utils/data-manager.js';

export interface ComponentSearchOptions {
  category?: string;
  name?: string;
  hasProps?: string[];
  hasVariants?: string[];
}

export interface ComponentServiceError {
  code: string;
  message: string;
  suggestions?: string[];
}

/**
 * Service for accessing and managing component specifications
 */
export class ComponentService {
  private dataManager: DataManager;

  constructor(dataManager: DataManager) {
    this.dataManager = dataManager;
  }

  /**
   * Get all available components
   */
  async getComponents(options?: ComponentSearchOptions): Promise<Component[]> {
    const cachedData = this.dataManager.getCachedData();
    
    if (!cachedData) {
      throw this.createError('NO_DATA', 'No component data available', [
        'Ensure data files are loaded',
        'Check data directory configuration'
      ]);
    }

    let components = cachedData.components;

    // Apply filters if provided
    if (options) {
      components = this.filterComponents(components, options);
    }

    return components;
  }

  /**
   * Get a specific component by name
   */
  async getComponent(name: string): Promise<Component> {
    if (!name || typeof name !== 'string') {
      throw this.createError('INVALID_NAME', 'Component name must be a non-empty string');
    }

    const cachedData = this.dataManager.getCachedData();
    
    if (!cachedData) {
      throw this.createError('NO_DATA', 'No component data available');
    }

    const component = cachedData.components.find(
      comp => comp.name.toLowerCase() === name.toLowerCase()
    );

    if (!component) {
      const availableComponents = cachedData.components.map(comp => comp.name);
      throw this.createError('COMPONENT_NOT_FOUND', `Component "${name}" not found`, [
        `Available components: ${availableComponents.join(', ')}`,
        'Check component name spelling'
      ]);
    }

    return component;
  }

  /**
   * Get component variants for a specific component
   */
  async getComponentVariants(name: string): Promise<ComponentVariant[]> {
    const component = await this.getComponent(name);
    return component.variants;
  }

  /**
   * Get a specific variant of a component
   */
  async getComponentVariant(componentName: string, variantName: string): Promise<ComponentVariant> {
    const variants = await this.getComponentVariants(componentName);
    
    const variant = variants.find(
      v => v.name.toLowerCase() === variantName.toLowerCase()
    );

    if (!variant) {
      const availableVariants = variants.map(v => v.name);
      throw this.createError('VARIANT_NOT_FOUND', 
        `Variant "${variantName}" not found for component "${componentName}"`, [
          `Available variants: ${availableVariants.join(', ')}`
        ]);
    }

    return variant;
  }

  /**
   * Get component examples and code snippets
   */
  async getComponentExamples(name: string): Promise<ComponentExample[]> {
    const component = await this.getComponent(name);
    return component.examples;
  }

  /**
   * Get a specific example for a component
   */
  async getComponentExample(componentName: string, exampleTitle: string): Promise<ComponentExample> {
    const examples = await this.getComponentExamples(componentName);
    
    const example = examples.find(
      ex => ex.title.toLowerCase() === exampleTitle.toLowerCase()
    );

    if (!example) {
      const availableExamples = examples.map(ex => ex.title);
      throw this.createError('EXAMPLE_NOT_FOUND', 
        `Example "${exampleTitle}" not found for component "${componentName}"`, [
          `Available examples: ${availableExamples.join(', ')}`
        ]);
    }

    return example;
  }

  /**
   * Get component props for a specific component
   */
  async getComponentProps(name: string): Promise<ComponentProp[]> {
    const component = await this.getComponent(name);
    return component.props;
  }

  /**
   * Get required props for a component
   */
  async getRequiredProps(name: string): Promise<ComponentProp[]> {
    const props = await this.getComponentProps(name);
    return props.filter(prop => prop.required);
  }

  /**
   * Get optional props for a component
   */
  async getOptionalProps(name: string): Promise<ComponentProp[]> {
    const props = await this.getComponentProps(name);
    return props.filter(prop => !prop.required);
  }

  /**
   * Search components by various criteria
   */
  async searchComponents(query: string): Promise<Component[]> {
    if (!query || typeof query !== 'string') {
      throw this.createError('INVALID_QUERY', 'Search query must be a non-empty string');
    }

    const cachedData = this.dataManager.getCachedData();
    
    if (!cachedData) {
      throw this.createError('NO_DATA', 'No component data available');
    }

    const searchTerm = query.toLowerCase();
    
    return cachedData.components.filter(component => {
      // Search in name
      if (component.name.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search in description
      if (component.description.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search in category
      if (component.category.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search in guidelines
      if (component.guidelines.some(guideline => 
        guideline.toLowerCase().includes(searchTerm)
      )) {
        return true;
      }
      
      // Search in prop names and descriptions
      if (component.props.some(prop => 
        prop.name.toLowerCase().includes(searchTerm) ||
        prop.description.toLowerCase().includes(searchTerm)
      )) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Get components by category
   */
  async getComponentsByCategory(category: string): Promise<Component[]> {
    if (!category || typeof category !== 'string') {
      throw this.createError('INVALID_CATEGORY', 'Category must be a non-empty string');
    }

    return this.getComponents({ category });
  }

  /**
   * Get all available component categories
   */
  async getComponentCategories(): Promise<string[]> {
    const components = await this.getComponents();
    const categories = new Set(components.map(comp => comp.category));
    return Array.from(categories).sort();
  }

  /**
   * Filter components based on search options
   */
  private filterComponents(components: Component[], options: ComponentSearchOptions): Component[] {
    return components.filter(component => {
      // Filter by category
      if (options.category && 
          component.category.toLowerCase() !== options.category.toLowerCase()) {
        return false;
      }

      // Filter by name (partial match)
      if (options.name && 
          !component.name.toLowerCase().includes(options.name.toLowerCase())) {
        return false;
      }

      // Filter by required props
      if (options.hasProps && options.hasProps.length > 0) {
        const componentPropNames = component.props.map(prop => prop.name.toLowerCase());
        const hasAllProps = options.hasProps.every(propName => 
          componentPropNames.includes(propName.toLowerCase())
        );
        if (!hasAllProps) {
          return false;
        }
      }

      // Filter by variants
      if (options.hasVariants && options.hasVariants.length > 0) {
        const componentVariantNames = component.variants.map(variant => variant.name.toLowerCase());
        const hasAllVariants = options.hasVariants.every(variantName => 
          componentVariantNames.includes(variantName.toLowerCase())
        );
        if (!hasAllVariants) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Create a standardized error object
   */
  private createError(code: string, message: string, suggestions?: string[]): ComponentServiceError {
    return {
      code,
      message,
      suggestions
    };
  }
}