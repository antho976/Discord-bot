/**
 * Flag Tester - Toggle and test flags without playing through game
 * Useful for testing quest branches and world state changes
 */

import { FLAG_REGISTRY, FLAG_GROUPS } from './FlagRegistry.js';
import { MODIFIER_REGISTRY } from './ModifierSystem.js';

export class FlagTester {
  constructor() {
    this.testFlags = new Map(); // flag -> active
    this.testModifiers = new Map(); // modifier -> value
    this.simulatedPlayer = this.createSimulatedPlayer();
  }

  /**
   * Create a test player with configurable flags/modifiers
   */
  createSimulatedPlayer() {
    return {
      id: 'test_player',
      level: 5,
      health: 100,
      mana: 50,
      questFlags: new Set(),
      modifiers: new Map(),
      worldState: null,
    };
  }

  /**
   * Set a flag as active
   */
  setFlag(flagId, active = true) {
    const flagDef = FLAG_REGISTRY[flagId];
    if (!flagDef) {
      return { error: `Flag not registered: ${flagId}` };
    }

    this.testFlags.set(flagId, active);
    if (active) {
      this.simulatedPlayer.questFlags.add(flagId);
    } else {
      this.simulatedPlayer.questFlags.delete(flagId);
    }

    return {
      success: true,
      flag: flagId,
      active,
      affectedSystems: flagDef.affects,
    };
  }

  /**
   * Toggle a flag
   */
  toggleFlag(flagId) {
    const current = this.testFlags.get(flagId) || false;
    return this.setFlag(flagId, !current);
  }

  /**
   * Set a modifier value
   */
  setModifier(modifierId, value) {
    const modDef = MODIFIER_REGISTRY[modifierId];
    if (!modDef) {
      return { error: `Modifier not registered: ${modifierId}` };
    }

    this.testModifiers.set(modifierId, value);
    this.simulatedPlayer.modifiers.set(modifierId, value);

    return {
      success: true,
      modifier: modifierId,
      value,
      type: modDef.type,
      affectedSystems: modDef.baseSystems,
    };
  }

  /**
   * Get current test state
   */
  getTestState() {
    const flags = Array.from(this.testFlags.entries())
      .filter(([_, active]) => active)
      .map(([flagId]) => flagId);

    const modifiers = Object.fromEntries(this.testModifiers);

    return {
      flags,
      modifiers,
      player: this.simulatedPlayer,
    };
  }

  /**
   * Reset all flags and modifiers
   */
  reset() {
    this.testFlags.clear();
    this.testModifiers.clear();
    this.simulatedPlayer = this.createSimulatedPlayer();
    return { success: true };
  }

  /**
   * Set player level for testing
   */
  setPlayerLevel(level) {
    this.simulatedPlayer.level = level;
    return { success: true, level };
  }

  /**
   * Set player health for testing
   */
  setPlayerHealth(health) {
    this.simulatedPlayer.health = health;
    return { success: true, health };
  }

  /**
   * Get all registered flags
   */
  getAllFlags() {
    return Object.entries(FLAG_REGISTRY).map(([id, def]) => ({
      id,
      ...def,
      currentlyActive: this.testFlags.get(id) || false,
    }));
  }

  /**
   * Get flags by group
   */
  getFlagsByGroup(groupName) {
    const flagIds = FLAG_GROUPS[groupName] || [];
    return flagIds.map(id => ({
      id,
      ...FLAG_REGISTRY[id],
      currentlyActive: this.testFlags.get(id) || false,
    }));
  }

  /**
   * Get all registered modifiers
   */
  getAllModifiers() {
    return Object.entries(MODIFIER_REGISTRY).map(([id, def]) => ({
      id,
      ...def,
      currentValue: this.testModifiers.get(id) || 0,
    }));
  }

  /**
   * Simulate a quest outcome
   */
  simulateQuestOutcome(outcome) {
    const before = this.getTestState();
    const impact = {
      flagsSet: [],
      modifiersApplied: [],
      affectedSystems: new Set(),
    };

    // Apply flags
    for (const flagId of (outcome.flagsSet || [])) {
      const result = this.setFlag(flagId, true);
      if (!result.error) {
        impact.flagsSet.push(result);
        result.affectedSystems?.forEach(sys => impact.affectedSystems.add(sys));
      }
    }

    // Apply modifiers
    for (const [modId, value] of Object.entries(outcome.modifiersApplied || {})) {
      const result = this.setModifier(modId, value);
      if (!result.error) {
        impact.modifiersApplied.push(result);
        result.affectedSystems?.forEach(sys => impact.affectedSystems.add(sys));
      }
    }

    const after = this.getTestState();

    return {
      before,
      after,
      impact: {
        ...impact,
        affectedSystems: Array.from(impact.affectedSystems),
      },
    };
  }

  /**
   * Check if player qualifies for a quest
   */
  checkQuestQualification(quest) {
    const issues = [];
    const warnings = [];

    // Check level requirements
    if (this.simulatedPlayer.level < quest.visibilityConditions.minLevel) {
      issues.push(`Player level (${this.simulatedPlayer.level}) too low, requires ${quest.visibilityConditions.minLevel}`);
    }

    // Check required flags
    for (const flagId of (quest.visibilityConditions.requiredFlags || [])) {
      if (!this.simulatedPlayer.questFlags.has(flagId)) {
        issues.push(`Missing required flag: ${flagId}`);
      }
    }

    // Check forbidden flags
    for (const flagId of (quest.visibilityConditions.forbiddenFlags || [])) {
      if (this.simulatedPlayer.questFlags.has(flagId)) {
        issues.push(`Has forbidden flag: ${flagId}`);
      }
    }

    return {
      canStart: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Get summary of which flags affect which systems
   */
  getAffectedSystemsSummary() {
    const systemsMap = {};

    for (const [flagId, active] of this.testFlags.entries()) {
      if (!active) continue;

      const flagDef = FLAG_REGISTRY[flagId];
      if (!flagDef) continue;

      for (const system of (flagDef.affects || [])) {
        if (!systemsMap[system]) {
          systemsMap[system] = [];
        }
        systemsMap[system].push(flagId);
      }
    }

    return systemsMap;
  }

  /**
   * Export test state to JSON
   */
  exportState() {
    return {
      timestamp: new Date().toISOString(),
      flags: Array.from(this.testFlags.entries()),
      modifiers: Object.fromEntries(this.testModifiers),
      player: this.simulatedPlayer,
    };
  }

  /**
   * Import test state from JSON
   */
  importState(data) {
    this.reset();

    if (data.flags) {
      for (const [flagId, active] of data.flags) {
        if (active) this.setFlag(flagId, true);
      }
    }

    if (data.modifiers) {
      for (const [modId, value] of Object.entries(data.modifiers)) {
        this.setModifier(modId, value);
      }
    }

    if (data.player) {
      this.simulatedPlayer.level = data.player.level || 5;
      this.simulatedPlayer.health = data.player.health || 100;
    }

    return { success: true };
  }
}

/**
 * Create a preset test scenario
 */
export function createTestScenario(name, description) {
  return {
    name,
    description,
    flags: [],
    modifiers: {},
    player: {
      level: 1,
      health: 100,
    },
  };
}

/**
 * Common test scenarios
 */
export const PRESET_SCENARIOS = {
  newPlayer: {
    name: 'New Player',
    description: 'Fresh start with no flags',
    flags: [],
    modifiers: {},
    player: { level: 1, health: 100 },
  },
  lateGame: {
    name: 'Late Game',
    description: 'High level with multiple progression flags',
    flags: ['world_1_unlocked', 'vendor_blacksmith_unlocked', 'vendor_spirit_merchant_unlocked'],
    modifiers: { player_defense_boost: 1.5 },
    player: { level: 30, health: 200 },
  },
  questTesting: {
    name: 'Quest Test',
    description: 'Configured for testing quest branches',
    flags: [],
    modifiers: {},
    player: { level: 5, health: 100 },
  },
  combatTesting: {
    name: 'Combat Test',
    description: 'With various combat modifiers',
    flags: ['world_aggressive_day'],
    modifiers: { 
      enemy_damage_boost: 1.2,
      player_defense_boost: 1.1,
    },
    player: { level: 10, health: 150 },
  },
};
