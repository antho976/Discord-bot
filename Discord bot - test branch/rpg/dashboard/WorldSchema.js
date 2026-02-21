/**
 * World Schema - Complete world definition
 * All worlds created and edited via this schema
 */

export const WORLD_SCHEMA = {
  // Metadata
  id: 'string', // Unique ID
  name: 'string',
  displayName: 'string',
  tier: 'number', // World progression tier (1-4)
  theme: 'string', // Forest, Desert, Volcanic, etc.

  // Progression
  minLevel: 'number',
  maxLevel: 'number',
  requiredFlags: ['string'], // Flags that must be set to access

  // Difficulty and scaling
  baseDifficulty: 'number', // 0-1
  enemyStatScale: 'number', // Multiplier for enemy stats
  bossHealthMultiplier: 'number',

  // World state rules
  worldStateRules: {
    enableDailyState: 'boolean',
    customStateOptions: ['string'], // IDs of custom world states
  },

  // Modifiers
  baseModifiers: {
    'modifier_id': 'number', // Modifier value pairs
  },
  aiModifiers: {
    aggression: 'number',
    riskTaking: 'number',
    defensivePriority: 'number',
  },

  // Content linking
  linkedQuests: ['string'], // Quest IDs available in this world
  linkedEnemies: ['string'], // Enemy template IDs
  linkedVendors: ['string'], // Vendor IDs
  linkedNPCs: ['string'], // NPC IDs

  // Progression conditions
  nextWorldUnlock: {
    requiredQuestCompletion: ['string'],
    requiredBossDefeat: ['string'],
    minLevel: 'number',
  },

  // Metadata for designers
  designIntent: 'string', // e.g., "Risk escalation", "Stabilizing"
  internalNotes: 'string',
  draftMode: 'boolean',
};

/**
 * Create a new world with defaults
 */
export function createWorld(worldData) {
  const defaults = {
    id: worldData.id,
    name: worldData.name,
    displayName: worldData.displayName || worldData.name,
    tier: worldData.tier || 1,
    theme: worldData.theme || 'Generic',
    minLevel: worldData.minLevel || 1,
    maxLevel: worldData.maxLevel || 50,
    requiredFlags: worldData.requiredFlags || [],
    baseDifficulty: worldData.baseDifficulty || 0.5,
    enemyStatScale: worldData.enemyStatScale || 1.0,
    bossHealthMultiplier: worldData.bossHealthMultiplier || 2.0,
    worldStateRules: worldData.worldStateRules || {
      enableDailyState: true,
      customStateOptions: [],
    },
    baseModifiers: worldData.baseModifiers || {},
    aiModifiers: worldData.aiModifiers || {
      aggression: 0.5,
      riskTaking: 0.5,
      defensivePriority: 0.5,
    },
    linkedQuests: worldData.linkedQuests || [],
    linkedEnemies: worldData.linkedEnemies || [],
    linkedVendors: worldData.linkedVendors || [],
    linkedNPCs: worldData.linkedNPCs || [],
    nextWorldUnlock: worldData.nextWorldUnlock || {
      requiredQuestCompletion: [],
      requiredBossDefeat: [],
      minLevel: 30,
    },
    designIntent: worldData.designIntent || '',
    internalNotes: worldData.internalNotes || '',
    draftMode: worldData.draftMode !== false,
  };

  return defaults;
}

/**
 * Validate world definition
 */
export function validateWorld(world) {
  const errors = [];

  if (!world.id) errors.push('World must have ID');
  if (!world.name) errors.push('World must have name');
  if (world.tier < 1 || world.tier > 4) errors.push('Tier must be 1-4');
  if (world.minLevel > world.maxLevel) errors.push('minLevel cannot exceed maxLevel');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if player can access world
 */
export function canAccessWorld(world, player) {
  // Check level
  if (player.level < world.minLevel) {
    return { allowed: false, reason: 'Level too low' };
  }

  // Check required flags
  for (const flagId of world.requiredFlags) {
    if (!player.hasQuestFlag(flagId)) {
      return { allowed: false, reason: `Missing required flag: ${flagId}` };
    }
  }

  return { allowed: true };
}
