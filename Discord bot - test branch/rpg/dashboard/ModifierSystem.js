/**
 * Modifier System - Centralized modifier definitions and pipeline
 * Defines how modifiers stack and apply
 */

export const MODIFIER_TYPES = {
  additive: 'additive',       // +10
  multiplicative: 'multiplicative', // *1.2
  conditional: 'conditional', // if X then Y
  override: 'override',       // Replace with value
};

export const MODIFIER_SCOPE = {
  local: 'local',         // Single combat/session
  world: 'world',         // Entire world duration
  global: 'global',       // Player-wide permanent
};

/**
 * Modifier registry - all modifiers defined here
 */
export const MODIFIER_REGISTRY = {
  // Combat modifiers
  enemy_damage_boost: {
    id: 'enemy_damage_boost',
    type: MODIFIER_TYPES.multiplicative,
    scope: MODIFIER_SCOPE.world,
    baseSystems: ['combat'],
    affectsStats: ['strength'],
    description: 'Enemies deal more damage',
    priority: 10,
  },
  player_defense_boost: {
    id: 'player_defense_boost',
    type: MODIFIER_TYPES.multiplicative,
    scope: MODIFIER_SCOPE.global,
    baseSystems: ['combat'],
    affectsStats: ['defense'],
    description: 'Player defense increased',
    priority: 10,
  },

  // Loot modifiers
  gold_gain_boost: {
    id: 'gold_gain_boost',
    type: MODIFIER_TYPES.multiplicative,
    scope: MODIFIER_SCOPE.world,
    baseSystems: ['loot'],
    affectsStats: ['gold_reward'],
    description: 'Gold rewards increased',
    priority: 5,
  },
  xp_gain_boost: {
    id: 'xp_gain_boost',
    type: MODIFIER_TYPES.multiplicative,
    scope: MODIFIER_SCOPE.world,
    baseSystems: ['loot'],
    affectsStats: ['xp_reward'],
    description: 'XP rewards increased',
    priority: 5,
  },

  // AI modifiers
  ai_aggression_boost: {
    id: 'ai_aggression_boost',
    type: MODIFIER_TYPES.additive,
    scope: MODIFIER_SCOPE.world,
    baseSystems: ['ai_behavior'],
    affectsStats: ['aggression'],
    description: 'AI more aggressive',
    priority: 15,
  },
  ai_defense_priority_boost: {
    id: 'ai_defense_priority_boost',
    type: MODIFIER_TYPES.additive,
    scope: MODIFIER_SCOPE.world,
    baseSystems: ['ai_behavior'],
    affectsStats: ['defensive_priority'],
    description: 'AI prioritizes defense',
    priority: 15,
  },

  // Progression modifiers
  vendor_access_unlock: {
    id: 'vendor_access_unlock',
    type: MODIFIER_TYPES.conditional,
    scope: MODIFIER_SCOPE.global,
    baseSystems: ['progression'],
    condition: 'flagSet',
    description: 'Vendor becomes available',
    priority: 20,
  },
};

/**
 * Modifier pipeline - order of application
 */
export const MODIFIER_PIPELINE = [
  'base_values',
  'world_modifiers',
  'quest_modifiers',
  'equipment_modifiers',
  'temporary_effects',
  'ai_tendencies',
];

/**
 * Stack rules - how modifiers combine
 */
export const STACK_RULES = {
  additive: {
    combine: (values) => values.reduce((a, b) => a + b, 0),
    max: null,
    min: null,
  },
  multiplicative: {
    combine: (values) => values.reduce((a, b) => a * b, 1),
    max: null,
    min: 0,
  },
  override: {
    combine: (values) => values[values.length - 1],
    max: null,
    min: null,
  },
};

/**
 * Apply a single modifier value
 */
export function applyModifier(baseValue, modifier, modifierValue) {
  const modDef = MODIFIER_REGISTRY[modifier];
  if (!modDef) return baseValue;

  switch (modDef.type) {
    case MODIFIER_TYPES.additive:
      return baseValue + modifierValue;
    case MODIFIER_TYPES.multiplicative:
      return baseValue * modifierValue;
    case MODIFIER_TYPES.override:
      return modifierValue;
    case MODIFIER_TYPES.conditional:
      return baseValue; // Conditional applied separately
    default:
      return baseValue;
  }
}

/**
 * Calculate final value with all modifiers
 */
export function calculateModifiedValue(baseValue, modifiers = {}, stat = null) {
  let value = baseValue;

  for (const [modifier, modValue] of Object.entries(modifiers)) {
    value = applyModifier(value, modifier, modValue);
  }

  return value;
}

export function getModifier(modifierId) {
  return MODIFIER_REGISTRY[modifierId];
}

export function validateModifier(modifierId) {
  if (!MODIFIER_REGISTRY[modifierId]) {
    throw new Error(`Modifier not registered: ${modifierId}`);
  }
  return true;
}
