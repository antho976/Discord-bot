import { RECIPES, getMaterial } from './rpg/data/professions.js';

const recipe = RECIPES.bandaged_fist_recipe;
console.log('Recipe:', recipe.name);
console.log('Materials needed:');

for (const [matId, qty] of Object.entries(recipe.materials)) {
  const mat = getMaterial(matId);
  console.log(`  ${mat ? mat.name : 'UNKNOWN'} (${matId}): ${qty}`);
}

console.log('\nMaterial should show when you click the recipe in crafting.');
