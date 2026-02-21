/**
 * Configuration System - Tier 4
 * Admin dashboard configuration layer
 * All major systems are editable here
 */

export const CONFIG = {
  // XP and Leveling
  xp: {
    baseXpPerLevel: 100,
    scaleFactor: 1.1,
    maxLevel: 50,
  },

  // Combat Balance
  combat: {
    damageVariance: 0.15, // ±15%
    defenseMultiplier: 0.3, // Defense reduces damage by this %
    criticalDamageMultiplier: 1.5,
  },

  // Difficulty Scaling
  difficulty: {
    enemyLevelScaling: 1.15, // Enemy stats scale by 15% per level
    bossMultiplier: 2.0, // Bosses have 2x stats of normal enemies
    raidMultiplier: 2.5, // Raid bosses have 2.5x stats
  },

  // Progression
  progression: {
    minLevelPerWorld: [1, 8, 18, 28],
    worldBossLevelRequirement: [8, 18, 28, 40],
  },

  // Loot
  loot: {
    rarityWeights: {
      common: 0.5,
      uncommon: 0.3,
      rare: 0.15,
      epic: 0.04,
      legendary: 0.01,
    },
    baseGoldReward: 25,
    goldMultiplierPerLevel: 1.1,
  },

  // Skills
  skills: {
    maxSkillsPerClass: 6,
    manaCostMultiplier: 1.0,
    cooldownMultiplier: 1.0,
  },

  // Professions
  professions: {
    maxProfessions: 2,
    craftingTimeMultiplier: 1.0,
  },
};

/**
 * Get configuration value with dot notation
 * Example: getConfig('combat.damageVariance')
 */
export function getConfig(path) {
  const keys = path.split('.');
  let value = CONFIG;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return null;
    }
  }

  return value;
}

/**
 * Update configuration (for admin panel)
 */
export function setConfig(path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let obj = CONFIG;

  for (const key of keys) {
    if (!(key in obj)) obj[key] = {};
    obj = obj[key];
  }

  obj[lastKey] = value;
  return true;
}

/**
 * Calculate enemy scaling based on level
 */
export function getEnemyStats(baseStats, level) {
  const scaling = Math.pow(CONFIG.difficulty.enemyLevelScaling, level - 1);
  return {
    ...baseStats,
    strength: Math.floor(baseStats.strength * scaling),
    defense: Math.floor(baseStats.defense * scaling),
    intelligence: Math.floor(baseStats.intelligence * scaling),
    agility: Math.floor(baseStats.agility * scaling),
    hp: Math.floor(baseStats.hp * scaling),
  };
}

/**
 * Calculate XP requirement for level
 */
export function getXpForLevel(level) {
  const base = CONFIG.xp.baseXpPerLevel;
  const scale = CONFIG.xp.scaleFactor;
  return Math.floor(base * Math.pow(scale, level - 1));
}

/**
 * Calculate gold reward based on level
 */
export function getGoldReward(enemyLevel) {
  const base = CONFIG.loot.baseGoldReward;
  const multiplier = Math.pow(CONFIG.loot.goldMultiplierPerLevel, enemyLevel - 1);
  return Math.floor(base * multiplier);
}
