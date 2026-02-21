/**
 * Daily World State - V2 upgrade for V1
 */

export const WORLD_STATE_TYPES = {
  aggressive_day: {
    id: 'aggressive_day',
    name: 'Aggressive Day',
    description: 'The world feels hostile. Enemies strike harder and AI behaves more aggressively.',
    modifiers: {
      enemyDamage: 1.15,
      playerDamage: 1.05,
      goldGain: 1.0,
      xpGain: 1.0,
    },
    aiImpact: {
      aggressionBonus: 0.1,
      riskTakingBonus: 0.05,
    },
  },
  defensive_day: {
    id: 'defensive_day',
    name: 'Defensive Day',
    description: 'Enemies are cautious and resilient. Battles last longer.',
    modifiers: {
      enemyDamage: 0.95,
      playerDamage: 0.95,
      goldGain: 1.0,
      xpGain: 1.0,
    },
    aiImpact: {
      defensivePriorityBonus: 0.1,
    },
  },
  abundant_day: {
    id: 'abundant_day',
    name: 'Abundant Day',
    description: 'Resources are plentiful. Rewards are improved.',
    modifiers: {
      enemyDamage: 1.0,
      playerDamage: 1.0,
      goldGain: 1.25,
      xpGain: 1.1,
    },
    aiImpact: {},
  },
  scarce_day: {
    id: 'scarce_day',
    name: 'Scarce Day',
    description: 'Supplies are thin. Rewards are reduced.',
    modifiers: {
      enemyDamage: 1.0,
      playerDamage: 1.0,
      goldGain: 0.85,
      xpGain: 0.9,
    },
    aiImpact: {},
  },
  poison_day: {
    id: 'poison_day',
    name: 'Poison Day',
    description: 'Toxins linger in the air. Damage-over-time effects are stronger.',
    modifiers: {
      enemyDamage: 1.0,
      playerDamage: 1.0,
      dotMultiplier: 1.25,
    },
    aiImpact: {
      defensivePriorityBonus: 0.05,
    },
  },
  healing_day: {
    id: 'healing_day',
    name: 'Healing Day',
    description: 'Restorative energy flows freely. Healing effects are stronger.',
    modifiers: {
      enemyDamage: 1.0,
      playerDamage: 1.0,
      healingMultiplier: 1.25,
    },
    aiImpact: {
      defensivePriorityBonus: 0.05,
    },
  },
  chaotic_day: {
    id: 'chaotic_day',
    name: 'Chaotic Day',
    description: 'Unpredictable forces swirl. Damage variance is higher.',
    modifiers: {
      enemyDamage: 1.05,
      playerDamage: 1.05,
      varianceBonus: 0.2,
    },
    aiImpact: {
      riskTakingBonus: 0.1,
    },
  },
  normal_day: {
    id: 'normal_day',
    name: 'Normal Day',
    description: 'A calm day with no special effects.',
    modifiers: {
      enemyDamage: 1.0,
      playerDamage: 1.0,
      goldGain: 1.0,
      xpGain: 1.0,
    },
    aiImpact: {},
  },
};

export function generateDailyWorldState(date = new Date()) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const keys = Object.keys(WORLD_STATE_TYPES);
  const index = seed % keys.length;
  return WORLD_STATE_TYPES[keys[index]];
}
