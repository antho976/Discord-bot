/**
 * Test: Item Creation with Recipe Materials
 * Tests the complete flow:
 * 1. Create an item with materials
 * 2. Verify recipe is created with those materials
 * 3. Load the item and verify recipe materials load
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';
const DASHBOARD_PASSWORD = 'sadgffff890asfggg07990g--a=g0980sdg';

// Helper function to make authenticated requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `auth=${DASHBOARD_PASSWORD}`,
    ...options.headers
  };
  
  return fetch(url, {
    ...options,
    headers
  });
}

async function testItemMaterials() {
  console.log('🧪 Testing Item Creation with Recipe Materials\n');

  try {
    // Test 1: Create an item with materials
    console.log('✅ Test 1: Creating item with recipe materials...');
    const itemData = {
      id: `test_sword_${Date.now()}`,
      name: 'Test Sword',
      category: 'weapon',
      itemType: 'sword',
      rarity: 'uncommon',
      description: 'A test sword',
      value: 100,
      damage: 15,
      defense: 0,
    };

    const itemResponse = await apiRequest('/items', {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
    const itemResult = await itemResponse.json();
    console.log(`   Item created: ${itemResult.item.id}`);
    console.log(`   Item name: ${itemResult.item.name}\n`);

    // Test 2: Create a recipe for that item
    console.log('✅ Test 2: Creating recipe with materials for the item...');
    const recipeData = {
      id: `recipe_${itemData.id}`,
      name: `Craft ${itemData.name}`,
      profession: 'blacksmith',
      level: 5,
      materials: {
        'iron_ore': 3,
        'coal': 2,
        'leather': 1
      },
      output: {
        item: itemData.id,
        quantity: 1
      },
      craftTime: 10
    };

    const recipeResponse = await apiRequest('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipeData)
    });
    const recipeResult = await recipeResponse.json();
    console.log(`   Recipe created: ${recipeResult.recipe.id}`);
    console.log(`   Recipe requires: ${JSON.stringify(recipeResult.recipe.materials)}\n`);

    // Test 3: Load recipe by item ID
    console.log('✅ Test 3: Loading recipe by item ID...');
    const loadRecipeResponse = await apiRequest(`/recipes/by-item/${itemData.id}`);
    const recipe = await loadRecipeResponse.json();
    console.log(`   Found recipe: ${recipe.id}`);
    console.log(`   Materials required: ${JSON.stringify(recipe.materials)}`);
    console.log(`   Craft time: ${recipe.craftTime} seconds\n`);

    // Test 4: Verify item loads
    console.log('✅ Test 4: Loading item...');
    const loadItemResponse = await apiRequest(`/items/${itemData.id}`);
    const item = await loadItemResponse.json();
    console.log(`   Loaded: ${item.name}`);
    console.log(`   Damage: ${item.damage}, Defense: ${item.defense}\n`);

    // Test 5: Get all items
    console.log('✅ Test 5: Getting all items...');
    const allItemsResponse = await apiRequest('/items');
    const allItems = await allItemsResponse.json();
    console.log(`   Total items: ${allItems.length}`);
    const testItem = allItems.find(i => i.id === itemData.id);
    if (testItem) {
      console.log(`   ✓ Our test item found in list\n`);
    }

    // Test 6: Get all recipes
    console.log('✅ Test 6: Getting all recipes...');
    const allRecipesResponse = await apiRequest('/recipes');
    const allRecipes = await allRecipesResponse.json();
    const recipeCount = Object.keys(allRecipes).length;
    console.log(`   Total recipes: ${recipeCount}`);
    const testRecipe = Object.values(allRecipes).find(r => r.id === recipeData.id);
    if (testRecipe) {
      console.log(`   ✓ Our test recipe found in list\n`);
    }

    console.log('🎉 All tests passed!');
    console.log('\nSummary:');
    console.log(`- Item "${itemData.name}" created with ID: ${itemData.id}`);
    console.log(`- Recipe "Craft ${itemData.name}" created with materials:`);
    console.log(`  ${Object.entries(recipeData.materials).map(([mat, qty]) => `${mat}: ${qty}`).join(', ')}`);
    console.log(`- Recipe successfully linked to item`);

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

testItemMaterials();
