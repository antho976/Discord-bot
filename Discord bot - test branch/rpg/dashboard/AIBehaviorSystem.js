/**
 * AI Behavior System - Data-driven AI profiles for enemies
 * Allows complete customization of AI behavior without code changes
 */

/**
 * AI Behavior Profile Templates
 */
export const AI_BEHAVIOR_PROFILES = {
  aggressive: {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'Prioritizes offense, ignores self-preservation',
    aggression: 0.9,
    defensivePriority: 0.1,
    riskTolerance: 0.9,
    skillPriority: 'damage',
    reactionToPlayerThreats: 'ignore', // attack, defend, flee
    reactionToLowHp: 'continue_attack', // continue_attack, defend, flee
    cooldownAwareness: 0.3, // How much to care about skill cooldowns
    tacticalAwareness: 0.2, // How much to consider positioning
  },
  defensive: {
    id: 'defensive',
    name: 'Defensive',
    description: 'Prioritizes survival, uses defensive skills',
    aggression: 0.3,
    defensivePriority: 0.9,
    riskTolerance: 0.2,
    skillPriority: 'defense',
    reactionToPlayerThreats: 'defend',
    reactionToLowHp: 'defend',
    cooldownAwareness: 0.8,
    tacticalAwareness: 0.7,
  },
  opportunistic: {
    id: 'opportunistic',
    name: 'Opportunistic',
    description: 'Exploits player weaknesses, switches tactics',
    aggression: 0.6,
    defensivePriority: 0.4,
    riskTolerance: 0.5,
    skillPriority: 'situational',
    reactionToPlayerThreats: 'exploit',
    reactionToLowHp: 'tactical_retreat',
    cooldownAwareness: 0.7,
    tacticalAwareness: 0.9,
  },
  healer: {
    id: 'healer',
    name: 'Healer/Support',
    description: 'Prioritizes healing and buffing allies',
    aggression: 0.2,
    defensivePriority: 0.8,
    riskTolerance: 0.1,
    skillPriority: 'healing',
    reactionToPlayerThreats: 'heal_allies',
    reactionToLowHp: 'heal_self',
    cooldownAwareness: 0.9,
    tacticalAwareness: 0.6,
  },
  evasive: {
    id: 'evasive',
    name: 'Evasive',
    description: 'Avoids damage through movement and evasion',
    aggression: 0.4,
    defensivePriority: 0.7,
    riskTolerance: 0.3,
    skillPriority: 'evasion',
    reactionToPlayerThreats: 'evade',
    reactionToLowHp: 'flee',
    cooldownAwareness: 0.8,
    tacticalAwareness: 0.8,
  },
};

/**
 * Skill usage priority mapping
 */
export const SKILL_PRIORITY_MAPPINGS = {
  damage: [
    { skillType: 'ultimate', weight: 0.9 },
    { skillType: 'damage_burst', weight: 0.8 },
    { skillType: 'damage_sustained', weight: 0.6 },
    { skillType: 'defense', weight: 0.1 },
    { skillType: 'healing', weight: 0.05 },
  ],
  defense: [
    { skillType: 'shield', weight: 0.9 },
    { skillType: 'defense', weight: 0.8 },
    { skillType: 'healing', weight: 0.7 },
    { skillType: 'evasion', weight: 0.6 },
    { skillType: 'damage', weight: 0.2 },
  ],
  healing: [
    { skillType: 'healing', weight: 0.95 },
    { skillType: 'shield', weight: 0.8 },
    { skillType: 'buff', weight: 0.6 },
    { skillType: 'damage_sustained', weight: 0.3 },
    { skillType: 'damage_burst', weight: 0.1 },
  ],
  evasion: [
    { skillType: 'evasion', weight: 0.9 },
    { skillType: 'movement', weight: 0.85 },
    { skillType: 'defense', weight: 0.5 },
    { skillType: 'damage_sustained', weight: 0.4 },
    { skillType: 'healing', weight: 0.3 },
  ],
  situational: [
    { skillType: 'ultimate', weight: 0.9 },
    { skillType: 'damage_burst', weight: 0.75 },
    { skillType: 'defense', weight: 0.6 },
    { skillType: 'evasion', weight: 0.6 },
    { skillType: 'healing', weight: 0.4 },
  ],
};

/**
 * Per-enemy AI overrides
 */
export const ENEMY_AI_OVERRIDES = {
  // Example: 'boss_dark_lord': { profileId: 'opportunistic', customMods: { aggression: 0.95 } }
};

/**
 * Get base profile
 */
export function getAIProfile(profileId) {
  return AI_BEHAVIOR_PROFILES[profileId];
}

/**
 * Get skill priorities for a profile
 */
export function getSkillPriorities(profileId) {
  const profile = AI_BEHAVIOR_PROFILES[profileId];
  if (!profile) return null;

  return SKILL_PRIORITY_MAPPINGS[profile.skillPriority] || [];
}

/**
 * Get effective AI behavior for an enemy
 */
export function getEffectiveAIBehavior(enemyId, baseProfileId) {
  let behavior = { ...AI_BEHAVIOR_PROFILES[baseProfileId] };

  // Apply per-enemy overrides
  const override = ENEMY_AI_OVERRIDES[enemyId];
  if (override) {
    if (override.profileId) {
      behavior = { ...AI_BEHAVIOR_PROFILES[override.profileId] };
    }
    if (override.customMods) {
      Object.assign(behavior, override.customMods);
    }
  }

  return behavior;
}

/**
 * Create new AI profile
 */
export function createAIProfile(profileData) {
  const profile = {
    id: profileData.id,
    name: profileData.name,
    description: profileData.description || '',
    aggression: profileData.aggression || 0.5,
    defensivePriority: profileData.defensivePriority || 0.5,
    riskTolerance: profileData.riskTolerance || 0.5,
    skillPriority: profileData.skillPriority || 'situational',
    reactionToPlayerThreats: profileData.reactionToPlayerThreats || 'attack',
    reactionToLowHp: profileData.reactionToLowHp || 'defend',
    cooldownAwareness: profileData.cooldownAwareness || 0.5,
    tacticalAwareness: profileData.tacticalAwareness || 0.5,
    questFlags: profileData.questFlags || [], // Flags that trigger this profile
    worldStates: profileData.worldStates || [], // World states that trigger this
    customConditions: profileData.customConditions || [],
  };

  return profile;
}

/**
 * Validate AI profile
 */
export function validateAIProfile(profile) {
  const errors = [];

  if (!profile.id) errors.push('Profile must have an ID');
  if (!profile.name) errors.push('Profile must have a name');
  if (profile.aggression < 0 || profile.aggression > 1) errors.push('Aggression must be 0-1');
  if (profile.defensivePriority < 0 || profile.defensivePriority > 1) errors.push('Defensive priority must be 0-1');
  if (profile.riskTolerance < 0 || profile.riskTolerance > 1) errors.push('Risk tolerance must be 0-1');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate skill usage score based on profile
 */
export function evaluateSkillForProfile(skill, profile, combatState) {
  const priorities = SKILL_PRIORITY_MAPPINGS[profile.skillPriority] || [];
  const skillPriority = priorities.find(p => p.skillType === skill.type);
  const baseWeight = skillPriority ? skillPriority.weight : 0.3;

  // Apply combat modifiers
  let score = baseWeight;

  // Boost healing skills if HP low
  if (skill.type === 'healing' && combatState.enemyHpPercent < 0.3) {
    score *= (1 + profile.defensivePriority);
  }

  // Boost defensive skills if under threat
  if (skill.type === 'defense' && combatState.playerDamagePerTurn > combatState.enemyDamagePerTurn * 1.5) {
    score *= (1 + profile.defensivePriority);
  }

  // Boost damage if player at low HP
  if (skill.type === 'damage_burst' && combatState.playerHpPercent < 0.3) {
    score *= (1 + profile.aggression);
  }

  // Consider cooldown awareness
  if (skill.cooldown > 0 && profile.cooldownAwareness > 0.5) {
    score *= (1 - skill.cooldown / 100);
  }

  return score;
}
