/**
 * Simple test script to verify DataManager works with real data
 */

import { DataManager } from './dist/utils/data-manager.js';

async function testDataManager() {
  console.log('Testing DataManager with real data...\n');

  const dataManager = new DataManager({
    dataPath: './data',
    enableFileWatching: false
  });

  try {
    // Initialize and load data
    const result = await dataManager.initialize();
    
    if (result.success) {
      console.log('✅ Data loaded successfully!');
      
      const cachedData = dataManager.getCachedData();
      if (cachedData) {
        console.log(`📊 Loaded ${cachedData.designTokens.length} design tokens`);
        console.log(`🧩 Loaded ${cachedData.components.length} components`);
        console.log(`📋 Loaded ${cachedData.guidelines.length} guidelines`);
        
        // Test cache validation
        const validation = dataManager.validateCachedData();
        if (validation.valid) {
          console.log('✅ All data validates successfully!');
        } else {
          console.log('❌ Validation errors:', validation.errors);
        }
        
        // Show some sample data
        console.log('\n📝 Sample Design Token:');
        console.log(JSON.stringify(cachedData.designTokens[0], null, 2));
        
        console.log('\n🧩 Sample Component:');
        console.log(`Name: ${cachedData.components[0].name}`);
        console.log(`Description: ${cachedData.components[0].description}`);
        console.log(`Props: ${cachedData.components[0].props.length}`);
        
        console.log('\n📋 Sample Guideline:');
        console.log(`Title: ${cachedData.guidelines[0].title}`);
        console.log(`Category: ${cachedData.guidelines[0].category}`);
      }
    } else {
      console.log('❌ Failed to load data:', result.errors);
    }
  } catch (error) {
    console.error('❌ Error testing DataManager:', error);
  } finally {
    await dataManager.destroy();
  }
}

testDataManager();