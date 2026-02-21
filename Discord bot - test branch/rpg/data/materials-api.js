/**
 * Materials API Integration
 * Loads materials from dashboard crafting system instead of hardcoded data
 * Integrates drop chance %, adventure level, and gathering types
 */

import fs from 'fs';
import path from 'path';

let materialsCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 60000; // Cache for 1 minute

/**
 * Load materials from crafting.json (dashboard)
 */
export function loadMaterialsFromFile() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'crafting.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      materialsCache = data.materials || {};
      lastCacheTime = Date.now();
      return materialsCache;
    }
  } catch (err) {
    console.error('[Materials API] Error loading from file:', err.message);
  }
  return materialsCache || {};
}

/**
 * Get cached materials, reload if cache expired
 */
export function getMaterials() {
  if (!materialsCache || Date.now() - lastCacheTime > CACHE_DURATION) {
    return loadMaterialsFromFile();
  }
  return materialsCache;
}

/**
 * Get a specific material by ID
 */
export function getMaterial(materialId) {
  const materials = getMaterials();
  return materials[materialId] || null;
}

/**
 * Get all materials with a specific gathering type
 */
export function getMaterialsByGatheringType(gatheringType) {
  const materials = getMaterials();
  return Object.entries(materials)
    .filter(([id, mat]) => {
      if (!mat.source) return false;
      const sources = Array.isArray(mat.source) ? mat.source : [mat.source];
      return sources.includes('gathering') && mat.gatheringType === gatheringType;
    })
    .map(([id, mat]) => ({ id, ...mat }));
}

/**
 * Get materials filtered by adventure level
 */
export function getMaterialsByAdventureLevel(minLevel, maxLevel = 999) {
  const materials = getMaterials();
  return Object.entries(materials)
    .filter(([id, mat]) => {
      const level = mat.adventureLevel || 1;
      return level >= minLevel && level <= maxLevel;
    })
    .map(([id, mat]) => ({ id, ...mat }));
}

/**
 * Check if material should drop based on drop chance
 */
export function shouldMaterialDrop(material) {
  if (!material) return false;
  const dropChance = material.dropChance || 100;
  return Math.random() * 100 < dropChance;
}

/**
 * Check if player can gather material based on adventure level
 */
export function canPlayerGatherMaterial(playerAdventureLevel, material) {
  if (!material) return false;
  const requiredLevel = material.adventureLevel || 1;
  return playerAdventureLevel >= requiredLevel;
}

/**
 * Get materials by source type
 */
export function getMaterialsBySource(source) {
  const materials = getMaterials();
  return Object.entries(materials)
    .filter(([id, mat]) => {
      if (!mat.source) return false;
      const sources = Array.isArray(mat.source) ? mat.source : [mat.source];
      return sources.includes(source);
    })
    .map(([id, mat]) => ({ id, ...mat }));
}

/**
 * Get material loot pool for adventuring
 * Returns materials available at given adventure level with drop chances applied
 */
export function getAdventureLootPool(adventureLevel) {
  const materials = getMaterials();
  const pool = [];

  Object.entries(materials).forEach(([id, mat]) => {
    if (!mat.source) return;
    
    const sources = Array.isArray(mat.source) ? mat.source : [mat.source];
    // Only include materials available from adventure
    if (!sources.includes('adventure')) return;
    
    // Check level requirement
    const requiredLevel = mat.adventureLevel || 1;
    if (adventureLevel < requiredLevel) return;
    
    // Apply drop chance as weight
    const dropChance = (mat.dropChance || 100) / 100;
    const weight = dropChance;
    
    pool.push({
      id,
      name: mat.name,
      weight,
      dropChance: mat.dropChance || 100,
      adventureLevel: requiredLevel,
      rarity: mat.rarity || 'common',
      value: mat.value || 1,
    });
  });

  return pool;
}

/**
 * Get material gathering pool for a specific gathering type
 * Returns materials weighted by drop chance
 */
export function getGatheringLootPool(gatheringType, playerGatheringLevel) {
  const materials = getMaterials();
  const pool = [];

  Object.entries(materials).forEach(([id, mat]) => {
    if (!mat.source) return;
    
    const sources = Array.isArray(mat.source) ? mat.source : [mat.source];
    // Only include materials from gathering
    if (!sources.includes('gathering')) return;
    
    // Check gathering type match
    if (mat.gatheringType !== gatheringType) return;
    
    // Check player gathering level
    const requiredLevel = mat.adventureLevel || 1;
    if (playerGatheringLevel < requiredLevel) return;
    
    // Apply drop chance as weight
    const dropChance = (mat.dropChance || 100) / 100;
    const weight = dropChance;
    
    pool.push({
      id,
      name: mat.name,
      weight,
      dropChance: mat.dropChance || 100,
      requiredLevel,
      rarity: mat.rarity || 'common',
      value: mat.value || 1,
    });
  });

  return pool;
}

/**
 * Roll for materials from a weighted pool
 */
export function rollMaterialsFromPool(pool, count = 1, quantity = 1) {
  if (!pool || pool.length === 0) return [];
  
  const results = [];
  const totalWeight = pool.reduce((sum, mat) => sum + mat.weight, 0);
  
  if (totalWeight === 0) return [];

  for (let i = 0; i < count; i++) {
    let rand = Math.random() * totalWeight;
    for (const mat of pool) {
      rand -= mat.weight;
      if (rand <= 0) {
        // Check if this material should actually drop
        if (Math.random() * 100 < mat.dropChance) {
          results.push({
            id: mat.id,
            name: mat.name,
            quantity: quantity + Math.floor(Math.random() * 2),
            rarity: mat.rarity,
            value: mat.value,
          });
        }
        break;
      }
    }
  }

  return results;
}

export default {
  loadMaterialsFromFile,
  getMaterials,
  getMaterial,
  getMaterialsByGatheringType,
  getMaterialsByAdventureLevel,
  getMaterialsBySource,
  shouldMaterialDrop,
  canPlayerGatherMaterial,
  getAdventureLootPool,
  getGatheringLootPool,
  rollMaterialsFromPool,
};
