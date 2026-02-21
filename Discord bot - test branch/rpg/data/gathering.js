/**
 * Gathering Skills System - Mining, Chopping, Gathering with profession-based progression
 */

import { getGatheringLootPool, rollMaterialsFromPool, getMaterial } from './materials-api.js';
import { getGatheringArea, rollAreaMaterials, calculateGatheringXp } from './gathering-areas.js';

export const GATHERING_SKILLS = {
  mining: {
    id: 'mining',
    name: 'Mining',
    description: 'Mine ores and minerals for crafting materials',
    statBoost: 'strength',
    icon: '⛏️',
    cooldown: 120000, // 2 minutes
    baseXp: 40,
    baseMaterials: [
      { id: 'iron_ore', weight: 0.6 },
      { id: 'copper_ore', weight: 0.4 },
    ],
    rareMaterials: [
      { id: 'granite', weight: 0.25, minLevel: 1 },
      { id: 'coal', weight: 0.20, minLevel: 1 },  // Coal is common, easier to find
      { id: 'copper_ore', weight: 0.15, minLevel: 1 },
      { id: 'iron_ore', weight: 0.12, minLevel: 1 },
      { id: 'mana_crystal', weight: 0.03, minLevel: 1 },
      // High-tier ores (Lvl 8+)
      { id: 'mithril_ore', weight: 0.15, minLevel: 8 },
      { id: 'adamantite', weight: 0.08, minLevel: 12 },
      { id: 'dragonstone', weight: 0.02, minLevel: 15 },
    ],
  },
  chopping: {
    id: 'chopping',
    name: 'Chopping',
    description: 'Chop wood and lumber for crafting materials',
    statBoost: 'agility',
    icon: '🪓',
    cooldown: 120000, // 2 minutes
    baseXp: 40,
    baseMaterials: [
      { id: 'leather', weight: 0.6 },
      { id: 'herb', weight: 0.4 },
    ],
    rareMaterials: [
      { id: 'wood', weight: 0.4, minLevel: 1 },
      { id: 'lumber', weight: 0.25, minLevel: 1 },
      // High-tier materials (Lvl 8+)
      { id: 'hardwood', weight: 0.18, minLevel: 8 },
      { id: 'dragonhide', weight: 0.1, minLevel: 12 },
      { id: 'mystic_bark', weight: 0.05, minLevel: 10 },
      { id: 'phoenix_feather', weight: 0.02, minLevel: 15 },
    ],
  },
  gathering: {
    id: 'gathering',
    name: 'Gathering',
    description: 'Forage herbs and plants for alchemy materials',
    statBoost: 'intelligence',
    icon: '🌿',
    cooldown: 120000, // 2 minutes
    baseXp: 40,
    baseMaterials: [
      { id: 'herb', weight: 0.5 },
      { id: 'water', weight: 0.5 },
    ],
    rareMaterials: [
      { id: 'herb', weight: 0.4, minLevel: 1 },
      { id: 'rare_flower', weight: 0.2, minLevel: 1 },
      // High-tier materials (Lvl 8+)
      { id: 'moonflower', weight: 0.15, minLevel: 8 },
      { id: 'arcane_essence', weight: 0.18, minLevel: 10 },
      { id: 'phoenix_feather', weight: 0.05, minLevel: 14 },
      { id: 'mana_crystal', weight: 0.02, minLevel: 5 },
    ],
  },
};

export const GATHERING_TOOL_TIERS = [
  { level: 1, tier: 'Basic', name: "Hermes' Trail Tools" },
  { level: 6, tier: 'Uncommon', name: "Freyja's Forager Set" },
  { level: 11, tier: 'Rare', name: "Athena's Field Kit" },
  { level: 16, tier: 'Epic', name: "Odin's Seeker Rig" },
  { level: 21, tier: 'Legendary', name: "Hephaestus' Divine Instruments" },
  { level: 26, tier: 'Mythic', name: "Bifrost Harvester's Kit", requiredWorld: 'world_1770519709022' },
  { level: 31, tier: 'Ancient', name: "Yggdrasil's Root Carver", requiredWorld: 'world_1770519709022' },
  { level: 36, tier: 'Primordial', name: "Muspelheim Forge Tools", requiredWorld: 'world_1770519709022' },
  { level: 41, tier: 'Divine', name: "Allfather's Cosmic Implements", requiredWorld: 'world_1770519709022' },
];

/**
 * Gathering profession milestone stat boosts
 */
export const GATHERING_PROFESSION_MILESTONES = {
  5: { bonus: { strength: 1, agility: 1, intelligence: 1, vitality: 1 } },
  10: { bonus: { strength: 2, agility: 2, intelligence: 2, vitality: 2 } },
  15: { bonus: { strength: 3, agility: 3, intelligence: 3, vitality: 3 } },
  20: { bonus: { strength: 4, agility: 4, intelligence: 4, vitality: 4 } },
  25: { bonus: { strength: 5, agility: 5, intelligence: 5, vitality: 5 } },
  30: { bonus: { strength: 6, agility: 6, intelligence: 6, vitality: 6 } },
  35: { bonus: { strength: 7, agility: 7, intelligence: 7, vitality: 7 } },
  40: { bonus: { strength: 8, agility: 8, intelligence: 8, vitality: 8 } },
};

/**
 * Get gathering skill by ID
 */
export function getGatheringSkill(skillId) {
  return GATHERING_SKILLS[skillId];
}

/**
 * Get gathering profession level from player data
 */
export function getGatheringProfessionLevel(player) {
  const directLevel = Number(player?.professionLevels?.gathering);
  if (Number.isFinite(directLevel) && directLevel > 0) return directLevel;

  const legacyLevels = Object.values(player?.gatheringLevels || {}).map((val) => Number(val) || 0);
  if (legacyLevels.length > 0) {
    const avg = Math.round(legacyLevels.reduce((sum, val) => sum + val, 0) / legacyLevels.length);
    return Math.max(1, avg);
  }

  return 1;
}

/**
 * Get gathering profession bonuses for a level
 */
export function getGatheringProfessionBonuses(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  const yieldBonusPct = Math.min(safeLevel * 1, 30);
  const rareBonusPct = Math.min(safeLevel * 0.5, 15);
  const professionXpBonusPct = Math.min(safeLevel * 0.5, 15);

  const statBonuses = {
    strength: 0,
    agility: 0,
    intelligence: 0,
    vitality: 0,
  };

  for (const [milestone, data] of Object.entries(GATHERING_PROFESSION_MILESTONES)) {
    if (safeLevel >= parseInt(milestone)) {
      Object.entries(data.bonus).forEach(([stat, value]) => {
        statBonuses[stat] = (statBonuses[stat] || 0) + (Number(value) || 0);
      });
    }
  }

  return {
    yieldBonusPct,
    rareBonusPct,
    professionXpBonusPct,
    statBonuses,
  };
}

/**
 * Apply gathering yield bonus to material results
 */
export function applyGatheringYieldBonus(materials, bonusPercent) {
  if (!Array.isArray(materials) || materials.length === 0) return materials || [];
  const bonus = Math.max(0, Number(bonusPercent) || 0);
  if (bonus <= 0) return materials;

  return materials.map((mat) => {
    const qty = Number(mat.quantity) || 1;
    const rawBonus = (qty * bonus) / 100;
    const extra = Math.floor(rawBonus) + (Math.random() < (rawBonus % 1) ? 1 : 0);
    return { ...mat, quantity: qty + extra };
  });
}

/**
 * Get tool tier for a gathering profession level
 */
export function getGatheringToolTier(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  let current = GATHERING_TOOL_TIERS[0];
  for (const tier of GATHERING_TOOL_TIERS) {
    if (safeLevel >= tier.level) current = tier;
  }
  return current;
}

/**
 * Add gathering profession XP and handle level ups
 */
export function addGatheringProfessionXp(player, xpGained) {
  const xpAmount = Math.max(0, Number(xpGained) || 0);
  if (!player) return { level: 1, levelsGained: 0, xp: 0 };

  if (!player.professionXp) player.professionXp = {};
  if (!player.professionLevels) player.professionLevels = {};

  const MAX_PROFESSION_LEVEL = 80;
  const currentLevel = getGatheringProfessionLevel(player);
  player.professionLevels.gathering = currentLevel;
  
  let levelsGained = 0;
  
  // Only gain XP if under max level
  if (currentLevel < MAX_PROFESSION_LEVEL) {
    player.professionXp.gathering = (Number(player.professionXp.gathering) || 0) + xpAmount;

    let xpToNext = getGatheringXpToNextLevel(player.professionLevels.gathering);
    while (player.professionXp.gathering >= xpToNext && player.professionLevels.gathering < MAX_PROFESSION_LEVEL) {
      player.professionXp.gathering -= xpToNext;
      player.professionLevels.gathering += 1;
      levelsGained += 1;
      xpToNext = getGatheringXpToNextLevel(player.professionLevels.gathering);
    }
    
    // Cap excess XP at max level
    if (player.professionLevels.gathering >= MAX_PROFESSION_LEVEL) {
      player.professionXp.gathering = 0;
    }
  }

  return {
    level: player.professionLevels.gathering,
    levelsGained,
    xp: player.professionXp.gathering,
  };
}

/**
 * Calculate total stat boosts from gathering profession
 */
export function calculateGatheringBoosts(gatheringLevelsOrLevel) {
  const boosts = {
    strength: 0,
    agility: 0,
    intelligence: 0,
    vitality: 0,
  };

  let level = 1;
  if (typeof gatheringLevelsOrLevel === 'number') {
    level = gatheringLevelsOrLevel;
  } else if (gatheringLevelsOrLevel && typeof gatheringLevelsOrLevel === 'object') {
    const legacyLevels = Object.values(gatheringLevelsOrLevel).map((val) => Number(val) || 0);
    if (legacyLevels.length > 0) {
      level = Math.max(1, Math.round(legacyLevels.reduce((sum, val) => sum + val, 0) / legacyLevels.length));
    }
  }

  const bonuses = getGatheringProfessionBonuses(level);
  Object.entries(bonuses.statBonuses || {}).forEach(([stat, value]) => {
    boosts[stat] = (boosts[stat] || 0) + (Number(value) || 0);
  });

  return boosts;
}

/**
 * Get XP to next level for gathering
 * Gathering is 2x harder than other professions
 */
export function getGatheringXpToNextLevel(level) {
  return 200 + level * 100; // 2x harder - Scales with level
}

/**
 * Generate materials from gathering attempt
 * Uses dashboard materials system with drop chance % and level requirements
 */
export function generateGatheringMaterials(skillId, gatheringLevel, timeWaitedMs = 0) {
  const skill = getGatheringSkill(skillId);
  if (!skill) return [];

  const materials = [];

  // Map skill ID to gathering type name
  const gatheringTypeMap = {
    mining: 'Mining',
    chopping: 'Chopping',
    gathering: 'Herbing', // Note: 'Herbing' in materials, 'gathering' is the skill name
  };

  const gatheringType = gatheringTypeMap[skillId];
  if (!gatheringType) return [];

  // Get loot pool from dashboard materials (filtered by type and level)
  const lootPool = getGatheringLootPool(gatheringType, gatheringLevel);
  if (lootPool.length === 0) return [];

  // Base roll: always get 1-2 materials
  // Iron ore gets bonus quantity (more common)
  const baseCount = skillId === 'mining' ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2);
  const baseMaterials = rollMaterialsFromPool(lootPool, baseCount, 1);
  
  // Boost quantity for iron ore drops
  for (const mat of baseMaterials) {
    if (mat.id === 'iron_ore') {
      mat.quantity = Math.floor(mat.quantity * 1.5); // 50% more iron ore
    }
  }
  materials.push(...baseMaterials);

  // Bonus roll chance increases with wait time
  // Every 60 seconds waited = +10% chance for bonus material (capped at 60 seconds = 100%)
  const minutesWaited = Math.min(timeWaitedMs / 60000, 1); // Cap at 1 minute
  const bonusChance = minutesWaited; // 0 to 1.0 (0% to 100%)

  if (bonusChance > 0 && Math.random() < bonusChance) {
    const bonusMaterials = rollMaterialsFromPool(lootPool, 1, 1);
    // Boost quantity for iron ore
    for (const mat of bonusMaterials) {
      if (mat.id === 'iron_ore') {
        mat.quantity = Math.floor(mat.quantity * 1.5);
      }
    }
    materials.push(...bonusMaterials);
  }

  return materials;
}

/**
 * Generate materials from a gathering area
 * Enhanced system using gathering-areas.js for location-based gathering
 */
export function generateAreaGatheringMaterials(areaId, skillId, gatheringLevel, timeWaitedMs = 0, rarityBonus = 0) {
  const area = getGatheringArea(areaId);
  if (!area) return { materials: [], xp: 0, area: null };

  // Check if skill is valid for this area
  if (!area.skillTypes.includes(skillId)) {
    return { materials: [], xp: 0, area, error: `${skillId} is not available in ${area.name}` };
  }

  // Base material count: 1-2 materials, plus bonus based on time
  const baseCount = 1 + Math.floor(Math.random() * 2);
  
  // Bonus materials for waiting longer (capped at +2 bonus)
  const minutesWaited = Math.min(timeWaitedMs / 60000, 1);
  const bonusChance = minutesWaited;
  const extraMaterials = bonusChance > Math.random() ? 1 : 0;

  const totalCount = baseCount + extraMaterials;

  const rarityBoost = Math.max(0, Number(rarityBonus) || 0);
  const effectiveArea = {
    ...area,
    rarity: Math.min(0.95, (Number(area.rarity) || 0) + rarityBoost),
  };

  // Roll materials from area
  const materials = rollAreaMaterials(effectiveArea, totalCount);
  
  // Boost quantity for iron ore drops
  for (const mat of materials) {
    if (mat.id === 'iron_ore') {
      mat.quantity = Math.floor((mat.quantity || 1) * 1.5); // 50% more iron ore
    }
  }

  // Calculate XP
  const xp = calculateGatheringXp(area, gatheringLevel, timeWaitedMs);

  return { materials, xp, area };
}

export default {
  getGatheringSkill,
  getGatheringProfessionLevel,
  getGatheringProfessionBonuses,
  applyGatheringYieldBonus,
  getGatheringToolTier,
  addGatheringProfessionXp,
  calculateGatheringBoosts,
  getGatheringXpToNextLevel,
  generateGatheringMaterials,
  generateAreaGatheringMaterials,
  GATHERING_SKILLS,
  GATHERING_TOOL_TIERS,
  GATHERING_PROFESSION_MILESTONES,
};
