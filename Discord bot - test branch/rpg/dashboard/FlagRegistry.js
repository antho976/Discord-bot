/**
 * Flag Registry - Centralized flag definitions
 * All game flags defined here with metadata
 */

export const FLAG_REGISTRY = {
  // Quest flags
  'quest_first_steps_complete': {
    scope: 'quest',
    description: 'Player has completed first quest',
    affects: ['progression', 'vendor_unlock'],
  },
  'quest_dark_forest_complete': {
    scope: 'quest',
    description: 'Dark Forest quest completed',
    affects: ['world_state', 'enemy_behavior'],
  },
  'quest_choice_aggressive': {
    scope: 'quest',
    description: 'Player chose aggressive path in Dark Forest',
    affects: ['ai_behavior', 'world_state'],
  },
  'quest_choice_defensive': {
    scope: 'quest',
    description: 'Player chose defensive path in Dark Forest',
    affects: ['vendor_unlock', 'progression'],
  },

  // World flags
  'world_aggressive_day': {
    scope: 'world',
    description: 'World state: aggressive day modifier active',
    affects: ['combat', 'ai_behavior'],
  },
  'world_abundant_day': {
    scope: 'world',
    description: 'World state: abundant resources modifier active',
    affects: ['loot', 'gold_gain'],
  },

  // Vendor flags
  'vendor_blacksmith_unlocked': {
    scope: 'global',
    description: 'Blacksmith shop is available',
    affects: ['progression', 'equipment'],
  },
  'vendor_spirit_merchant_unlocked': {
    scope: 'global',
    description: 'Spirit merchant is available',
    affects: ['progression', 'equipment'],
  },

  // Skill flags
  'skill_ambush_unlocked': {
    scope: 'global',
    description: 'Ambush skill is available to learn',
    affects: ['skills', 'progression'],
  },

  // Progression flags
  'world_1_unlocked': {
    scope: 'global',
    description: 'World 1 accessible',
    affects: ['progression', 'world_access'],
  },
  'world_2_unlocked': {
    scope: 'global',
    description: 'World 2 accessible',
    affects: ['progression', 'world_access'],
  },
};

/**
 * Flag group for bulk operations
 */
export const FLAG_GROUPS = {
  quests: Object.entries(FLAG_REGISTRY)
    .filter(([key]) => key.startsWith('quest_'))
    .map(([key]) => key),
  vendors: Object.entries(FLAG_REGISTRY)
    .filter(([key]) => key.startsWith('vendor_'))
    .map(([key]) => key),
  skills: Object.entries(FLAG_REGISTRY)
    .filter(([key]) => key.startsWith('skill_'))
    .map(([key]) => key),
  progression: Object.entries(FLAG_REGISTRY)
    .filter(([key]) => key.startsWith('world_'))
    .map(([key]) => key),
};

export function getFlag(flagId) {
  return FLAG_REGISTRY[flagId];
}

export function validateFlag(flagId) {
  if (!FLAG_REGISTRY[flagId]) {
    throw new Error(`Flag not registered: ${flagId}`);
  }
  return true;
}

export function getFlagsAffectingSystem(systemName) {
  return Object.entries(FLAG_REGISTRY)
    .filter(([, meta]) => meta.affects?.includes(systemName))
    .map(([flagId]) => flagId);
}
