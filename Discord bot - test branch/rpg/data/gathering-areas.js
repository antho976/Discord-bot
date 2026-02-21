/**
 * Gathering Areas System
 * Different areas with varying difficulty, XP rewards, and material rarity
 */

export const GATHERING_AREAS = {
  // Beginner areas - Low XP, common materials
  forest: {
    id: 'forest',
    name: '🌲 Peaceful Forest',
    description: 'A calm, easy-to-navigate forest perfect for beginners',
    difficulty: 1,
    icon: '🌲',
    skillTypes: ['chopping', 'gathering'],
    baseXp: 40,
    rarity: 0.1, // 10% rare drop chance
    minLevel: 0,
    materials: {
      common: ['herb', 'pure_water', 'wood', 'leather', 'ash_wood'],
      rare: ['rare_flower', 'lumber', 'wild_herbs', 'beast_hide'],
    },
  },
  
  mine: {
    id: 'mine',
    name: '⛏️ Stone Quarry',
    description: 'A safe mining location with abundant stone and ore',
    difficulty: 1,
    icon: '⛏️',
    skillTypes: ['mining'],
    baseXp: 40,
    rarity: 0.1,
    minLevel: 0,
    materials: {
      common: ['iron_ore', 'copper_ore', 'coal'],
      rare: ['granite'],
    },
  },

  // Intermediate areas - Medium XP, better materials
  shadow_forest: {
    id: 'shadow_forest',
    name: '🌑 Shadow Grove',
    description: 'A darker forest with mysterious flora and better resources',
    difficulty: 3,
    icon: '🌑',
    skillTypes: ['chopping', 'gathering'],
    baseXp: 75,
    rarity: 0.25, // 25% rare drop chance
    minLevel: 5,
    materials: {
      common: ['herb', 'pure_water', 'wood', 'leather', 'lumber', 'pine_wood', 'medicinal_herbs'],
      rare: ['rare_flower', 'mystic_bark', 'hardwood', 'tough_hide', 'beast_bone'],
    },
  },

  deep_mine: {
    id: 'deep_mine',
    name: '⛏️ Deep Cavern',
    description: 'A dangerous mining site with precious ores and gems',
    difficulty: 3,
    icon: '⛏️',
    skillTypes: ['mining'],
    baseXp: 75,
    rarity: 0.25,
    minLevel: 5,
    materials: {
      common: ['iron_ore', 'copper_ore', 'granite', 'coal', 'mythril_ore'],
      rare: ['mithril_ore', 'mana_crystal'],
    },
  },

  // Advanced areas - High XP, rare materials
  enchanted_garden: {
    id: 'enchanted_garden',
    name: '✨ Enchanted Garden',
    description: 'A magical garden filled with rare magical herbs and flowers',
    difficulty: 7,
    icon: '✨',
    skillTypes: ['gathering'],
    baseXp: 120,
    rarity: 0.45, // 45% rare drop chance
    minLevel: 10,
    materials: {
      common: ['rare_flower', 'herb', 'pure_water', 'moonflower', 'arcane_essence', 'medicinal_herbs'],
      rare: ['phoenix_feather', 'mana_crystal', 'moonflower', 'golden_lotus'],
    },
  },

  mithril_mine: {
    id: 'mithril_mine',
    name: '⛏️ Mithril Depths',
    description: 'The legendary Mithril mine with some of the rarest ores in the realm',
    difficulty: 7,
    icon: '⛏️',
    skillTypes: ['mining'],
    baseXp: 120,
    rarity: 0.45,
    minLevel: 10,
    materials: {
      common: ['mithril_ore', 'granite', 'coal', 'mana_crystal', 'mythril_ore'],
      rare: ['adamantite', 'mithril_ore'],
    },
  },

  // Expert areas - Very high XP, legendary materials
  ancient_forest: {
    id: 'ancient_forest',
    name: '🏛️ Ancient Sanctuary',
    description: 'An ancient forest where mythical creatures roam, guarding precious materials',
    difficulty: 12,
    icon: '🏛️',
    skillTypes: ['chopping', 'gathering'],
    baseXp: 180,
    rarity: 0.60, // 60% rare drop chance
    minLevel: 15,
    materials: {
      common: ['hardwood', 'dragonhide', 'mystic_bark', 'phoenix_feather', 'ancient_wood', 'yew_wood', 'herb', 'pure_water'],
      rare: ['phoenix_feather', 'dragonhide', 'sacred_herbs', 'blessed_hide', 'ancient_fang'],
    },
  },

  dragon_peak: {
    id: 'dragon_peak',
    name: '⛏️ Dragon Peak',
    description: 'The highest mountain peak where dragons nest, holding the rarest ore',
    difficulty: 12,
    icon: '⛏️',
    skillTypes: ['mining'],
    baseXp: 180,
    rarity: 0.60,
    minLevel: 15,
    materials: {
      common: ['adamantite', 'mithril_ore', 'dragonstone', 'mana_crystal', 'mythril_ore'],
      rare: ['dragonstone', 'adamantite', 'world_essence_ore'],
    },
  },

  // Legendary area - Maximum rewards
  elders_grotto: {
    id: 'elders_grotto',
    name: '👑 Elders Grotto',
    description: 'The most dangerous gathering location, home to all legendary materials',
    difficulty: 18,
    icon: '👑',
    skillTypes: ['chopping', 'gathering', 'mining'],
    baseXp: 250,
    rarity: 0.85, // 85% rare drop chance
    minLevel: 20,
    materials: {
      common: ['phoenix_feather', 'dragonstone', 'dragonhide', 'mana_crystal', 'adamantite', 'divine_wood', 'storm_touched_wood', 'herb', 'pure_water'],
      rare: ['phoenix_feather', 'dragonstone', 'adamantite', 'mithril_ore', 'fatebound_fang', 'stormhide', 'godbeast-hide', 'ambrosia_bloom', 'world_essence_ore'],
    },
  },

  // === ASGARD TIER 2 GATHERING AREAS ===
  // Requires access to Asgard (minLevel 51+)

  yggdrasil_roots: {
    id: 'yggdrasil_roots',
    name: '🌳 Yggdrasil\'s Roots',
    description: 'Gather mystical wood and herbs from the sacred World Tree\'s roots. Requires Asgard access.',
    difficulty: 20,
    icon: '🌳',
    skillTypes: ['chopping', 'gathering'],
    baseXp: 350,
    rarity: 0.87, // 87% rare drop chance - easier to get rare drops
    minLevel: 25,
    requiredWorld: 'world_1770519709022', // Asgard world ID
    materials: {
      common: ['yggdrasil_bark', 'divine_wood', 'storm_touched_wood', 'hardwood', 'yew_wood', 'ancient_wood', 'rare_flower', 'moonflower', 'sacred_herbs'],
      rare: ['yggdrasil_bark', 'phoenix_feather', 'dragonhide', 'divine_wood', 'storm_touched_wood', 'ambrosia_bloom', 'blessed_hide', 'godbeast-hide', 'world_essence_ore'],
    },
  },

  muspelheim_forge: {
    id: 'muspelheim_forge',
    name: '🔥 Muspelheim Forge Wastes',
    description: 'Mine volcanic ores from the fire realm\'s burning mountains. Requires Asgard access.',
    difficulty: 22,
    icon: '🔥',
    skillTypes: ['mining'],
    baseXp: 420,
    rarity: 0.89, // 89% rare drop chance
    minLevel: 30,
    requiredWorld: 'world_1770519709022',
    materials: {
      common: ['bifrost_metal', 'asgardian_steel', 'adamantite', 'mithril_ore', 'dragonstone', 'mana_crystal', 'mythril_ore', 'world_essence_ore'],
      rare: ['bifrost_metal', 'asgardian_steel', 'dragonstone', 'adamantite', 'phoenix_feather', 'world_essence_ore', 'mithril_ore', 'fatebound_fang'],
    },
  },

  valhalla_fields: {
    id: 'valhalla_fields',
    name: '⚔️ Valhalla\'s Eternal Fields',
    description: 'Harvest legendary materials from the realm of honored warriors. Requires Asgard access.',
    difficulty: 25,
    icon: '⚔️',
    skillTypes: ['chopping', 'gathering', 'mining'],
    baseXp: 650, // Boosted XP
    rarity: 0.91, // 91% rare drop chance
    minLevel: 35,
    requiredWorld: 'world_1770519709022',
    materials: {
      common: ['bifrost_metal', 'asgardian_steel', 'yggdrasil_bark', 'phoenix_feather', 'dragonstone', 'dragonhide', 'adamantite', 'divine_wood', 'storm_touched_wood', 'mana_crystal', 'world_essence_ore', 'ambrosia_bloom'],
      rare: ['bifrost_metal', 'asgardian_steel', 'yggdrasil_bark', 'phoenix_feather', 'dragonstone', 'adamantite', 'dragonhide', 'fatebound_fang', 'stormhide', 'godbeast-hide', 'ambrosia_bloom', 'world_essence_ore', 'mithril_ore'],
    },
  },

  bifrost_realm: {
    id: 'bifrost_realm',
    name: '🌈 Bifrost Cosmic Expanse',
    description: 'The ultimate gathering zone at the Rainbow Bridge\'s apex. Maximum yields and legendary materials. Requires Asgard access.',
    difficulty: 30,
    icon: '🌈',
    skillTypes: ['chopping', 'gathering', 'mining'],
    baseXp: 850, // Maximum boosted XP
    rarity: 0.93, // 93% rare drop chance - easiest rare drops
    minLevel: 40,
    requiredWorld: 'world_1770519709022',
    materials: {
      common: ['bifrost_metal', 'asgardian_steel', 'yggdrasil_bark', 'arcane_essence', 'phoenix_feather', 'dragonstone', 'dragonhide', 'adamantite', 'divine_wood', 'storm_touched_wood', 'mana_crystal', 'world_essence_ore', 'ambrosia_bloom', 'fatebound_fang'],
      rare: ['bifrost_metal', 'asgardian_steel', 'yggdrasil_bark', 'arcane_essence', 'phoenix_feather', 'dragonstone', 'adamantite', 'dragonhide', 'fatebound_fang', 'stormhide', 'godbeast-hide', 'ambrosia_bloom', 'world_essence_ore', 'mithril_ore', 'divine_wood'],
    },
  },
};

/**
 * Get gathering area by ID
 */
export function getGatheringArea(areaId) {
  return GATHERING_AREAS[areaId];
}

/**
 * Get all gathering areas
 */
export function getAllGatheringAreas() {
  return Object.values(GATHERING_AREAS);
}

/**
 * Get all gathering areas (including locked ones)
 */
export function getAvailableAreas(playerLevel) {
  return Object.values(GATHERING_AREAS);
}

/**
 * Get unlocked gathering areas for a player level
 * Also checks for required world access if specified
 */
export function getUnlockedAreas(playerLevel, worldsUnlocked = []) {
  return Object.values(GATHERING_AREAS).filter(area => {
    // Check level requirement
    if (playerLevel < area.minLevel) return false;
    
    // Check world requirement if specified
    if (area.requiredWorld && !worldsUnlocked.includes(area.requiredWorld)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Get areas for a specific skill
 */
export function getAreasForSkill(skillId) {
  return Object.values(GATHERING_AREAS).filter(area => area.skillTypes.includes(skillId));
}

/**
 * Get random area from available areas
 */
export function getRandomArea(playerLevel, skillId = null) {
  let areas = getAvailableAreas(playerLevel);
  
  if (skillId) {
    areas = areas.filter(area => area.skillTypes.includes(skillId));
  }

  if (areas.length === 0) return null;

  return areas[Math.floor(Math.random() * areas.length)];
}

/**
 * Calculate XP for gathering in an area
 * Takes into account area difficulty and time spent
 */
export function calculateGatheringXp(area, gatheringLevel, timeWaitedMs = 0) {
  if (!area) return 0;

  let xp = area.baseXp;

  // Level scaling: higher levels in an area give more XP
  const difficultyDifference = area.difficulty - gatheringLevel;
  if (difficultyDifference > 0) {
    // Bonus XP for higher difficulty areas
    xp += difficultyDifference * 5;
  }

  // Time bonus: +1 XP per 10 seconds waited (rewards longer gathering)
  const secondsWaited = Math.floor(timeWaitedMs / 1000);
  xp += Math.floor(secondsWaited / 10);

  return Math.floor(xp);
}

/**
 * Roll materials from an area based on rarity
 */
export function rollAreaMaterials(area, count = 1) {
  if (!area || !area.materials) return [];

  const materials = [];
  
  for (let i = 0; i < count; i++) {
    // Determine if roll is rare or common
    const isRare = Math.random() < area.rarity;
    const pool = isRare ? area.materials.rare : area.materials.common;

    if (pool && pool.length > 0) {
      const material = pool[Math.floor(Math.random() * pool.length)];
      materials.push(material);
    }
  }

  return materials;
}

export default {
  GATHERING_AREAS,
  getGatheringArea,
  getAllGatheringAreas,
  getAvailableAreas,
  getAreasForSkill,
  getRandomArea,
  calculateGatheringXp,
  rollAreaMaterials,
};
