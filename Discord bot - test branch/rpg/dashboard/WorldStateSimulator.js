/**
 * World State Simulator - Preview daily world state generation
 * Useful for testing world progression and state rules
 */

/**
 * World state modifiers - daily changes
 */
export const WORLD_STATE_OPTIONS = {
  abundant: {
    id: 'abundant',
    name: 'Abundant Resources',
    description: 'Resources are plentiful, loot and gold rewards increased',
    modifiers: {
      gold_gain_boost: 1.3,
      loot_quality_boost: 1.2,
    },
    enemyModifiers: {
      aggression: -0.1,
    },
  },
  scarce: {
    id: 'scarce',
    name: 'Scarce Resources',
    description: 'Resources are limited, rewards decreased',
    modifiers: {
      gold_gain_boost: 0.7,
      loot_quality_boost: 0.6,
    },
    enemyModifiers: {
      defensivePriority: 0.2,
    },
  },
  aggressive: {
    id: 'aggressive',
    name: 'Aggressive Day',
    description: 'Enemies are more aggressive and dangerous',
    modifiers: {
      enemy_damage_boost: 1.2,
    },
    enemyModifiers: {
      aggression: 0.3,
      riskTolerance: 0.2,
    },
  },
  peaceful: {
    id: 'peaceful',
    name: 'Peaceful Day',
    description: 'Enemies are calm and less threatening',
    modifiers: {
      enemy_damage_boost: 0.7,
    },
    enemyModifiers: {
      aggression: -0.3,
      defensivePriority: 0.3,
    },
  },
  volatile: {
    id: 'volatile',
    name: 'Volatile Conditions',
    description: 'Unpredictable weather and hazards',
    modifiers: {
      environmental_damage: 1.1,
      ai_unpredictability: 0.5,
    },
    enemyModifiers: {
      riskTolerance: 0.3,
      tacticalAwareness: -0.2,
    },
  },
  blessed: {
    id: 'blessed',
    name: 'Blessed Day',
    description: 'Fortune favors the player',
    modifiers: {
      xp_gain_boost: 1.4,
      critical_chance_boost: 1.2,
    },
    enemyModifiers: {
      aggression: -0.2,
    },
  },
  cursed: {
    id: 'cursed',
    name: 'Cursed Day',
    description: 'Misfortune strikes',
    modifiers: {
      xp_gain_boost: 0.6,
      critical_chance_boost: 0.5,
    },
    enemyModifiers: {
      aggression: 0.2,
      tacticalAwareness: 0.2,
    },
  },
};

export class WorldStateSimulator {
  constructor(world) {
    this.world = world;
    this.stateHistory = [];
  }

  /**
   * Generate today's world state
   */
  generateDailyState() {
    const today = new Date();
    const seed = this.hashDate(today);
    
    return this.generateStateWithSeed(seed, today);
  }

  /**
   * Generate state for specific date
   */
  generateStateForDate(date) {
    const seed = this.hashDate(date);
    return this.generateStateWithSeed(seed, date);
  }

  /**
   * Generate state with seed for deterministic results
   */
  generateStateWithSeed(seed, date) {
    // Get available states for this world
    const availableStates = this.world.worldStateRules.customStateOptions || [];
    
    if (availableStates.length === 0) {
      return this.getDefaultState();
    }

    // Use seed to pick a state deterministically
    const selectedStateId = availableStates[seed % availableStates.length];
    const selectedState = WORLD_STATE_OPTIONS[selectedStateId];

    if (!selectedState) {
      return this.getDefaultState();
    }

    return {
      id: selectedStateId,
      name: selectedState.name,
      description: selectedState.description,
      date: date.toISOString().split('T')[0],
      modifiers: selectedState.modifiers,
      enemyModifiers: selectedState.enemyModifiers,
      duration: 24, // hours
    };
  }

  /**
   * Hash date to seed
   */
  hashDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    let hash = 0;
    const str = `${year}-${month}-${day}`;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash);
  }

  /**
   * Get default neutral state
   */
  getDefaultState() {
    return {
      id: 'neutral',
      name: 'Neutral Conditions',
      description: 'Normal day, no special modifiers',
      modifiers: {},
      enemyModifiers: {},
      duration: 24,
    };
  }

  /**
   * Simulate world state for next N days
   */
  simulateWeek() {
    const states = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      states.push(this.generateStateForDate(date));
    }

    return states;
  }

  /**
   * Simulate world state for next 30 days
   */
  simulateMonth() {
    const states = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      states.push(this.generateStateForDate(date));
    }

    return states;
  }

  /**
   * Get statistics about state distribution
   */
  getStateDistribution(days = 30) {
    const states = [];
    const today = new Date();
    const counts = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const state = this.generateStateForDate(date);
      states.push(state);
      
      counts[state.id] = (counts[state.id] || 0) + 1;
    }

    return {
      total: days,
      distribution: counts,
      states,
    };
  }

  /**
   * Check if a flag affects world state
   */
  doesFlagAffectState(flagId) {
    // Future: Allow quests/flags to modify world state generation
    // e.g., "after defeating the shadow dragon, peaceful days are less common"
    return false;
  }

  /**
   * Apply flag-based state modifications
   */
  applyFlagModifications(currentState, playerFlags) {
    // Placeholder for quest flag effects on world state
    // e.g., if player has 'world_corrupted' flag, add cursed modifier
    return currentState;
  }
}

/**
 * Helper to get state details
 */
export function getWorldStateDetails(stateId) {
  return WORLD_STATE_OPTIONS[stateId];
}

/**
 * Get all available world states
 */
export function getAllWorldStates() {
  return Object.values(WORLD_STATE_OPTIONS);
}

/**
 * Create custom world state
 */
export function createCustomWorldState(stateData) {
  return {
    id: stateData.id,
    name: stateData.name,
    description: stateData.description || '',
    modifiers: stateData.modifiers || {},
    enemyModifiers: stateData.enemyModifiers || {},
    weight: stateData.weight || 1.0, // Probability weight
  };
}
