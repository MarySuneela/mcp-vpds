#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Initialize AJV with formats
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Load schemas
const designTokenSchema = JSON.parse(fs.readFileSync('src/schemas/design-token.schema.json', 'utf8'));
const componentSchema = JSON.parse(fs.readFileSync('src/schemas/component.schema.json', 'utf8'));
const guidelineSchema = JSON.parse(fs.readFileSync('src/schemas/guideline.schema.json', 'utf8'));

// Compile validators
const validateDesignToken = ajv.compile(designTokenSchema);
const validateComponent = ajv.compile(componentSchema);
const validateGuideline = ajv.compile(guidelineSchema);

// Load data files
const designTokens = JSON.parse(fs.readFileSync('data/design-tokens.json', 'utf8'));
const components = JSON.parse(fs.readFileSync('data/components.json', 'utf8'));
const guidelines = JSON.parse(fs.readFileSync('data/guidelines.json', 'utf8'));

let hasErrors = false;

// Validate design tokens
console.log('🔍 Validating Design Tokens...');
designTokens.forEach((token, index) => {
  if (!validateDesignToken(token)) {
    console.error(`❌ Design Token ${index} (${token.name || 'unnamed'}) validation failed:`);
    console.error(validateDesignToken.errors);
    hasErrors = true;
  }
});
console.log(`✅ ${designTokens.length} design tokens validated`);

// Validate components
console.log('\n🔍 Validating Components...');
components.forEach((component, index) => {
  if (!validateComponent(component)) {
    console.error(`❌ Component ${index} (${component.name || 'unnamed'}) validation failed:`);
    console.error(validateComponent.errors);
    hasErrors = true;
  }
});
console.log(`✅ ${components.length} components validated`);

// Validate guidelines
console.log('\n🔍 Validating Guidelines...');
guidelines.forEach((guideline, index) => {
  if (!validateGuideline(guideline)) {
    console.error(`❌ Guideline ${index} (${guideline.id || 'unnamed'}) validation failed:`);
    console.error(validateGuideline.errors);
    hasErrors = true;
  }
});
console.log(`✅ ${guidelines.length} guidelines validated`);

if (hasErrors) {
  console.error('\n❌ Validation failed with errors');
  process.exit(1);
} else {
  console.log('\n🎉 All sample data validated successfully!');
  console.log('\n📊 Summary:');
  console.log(`   • ${designTokens.length} design tokens`);
  console.log(`   • ${components.length} components`);
  console.log(`   • ${guidelines.length} guidelines`);
  
  // Show some statistics
  const tokenCategories = [...new Set(designTokens.map(t => t.category))];
  const componentCategories = [...new Set(components.map(c => c.category))];
  const guidelineCategories = [...new Set(guidelines.map(g => g.category))];
  
  console.log('\n🏷️  Categories:');
  console.log(`   • Token categories: ${tokenCategories.join(', ')}`);
  console.log(`   • Component categories: ${componentCategories.join(', ')}`);
  console.log(`   • Guideline categories: ${guidelineCategories.join(', ')}`);
}