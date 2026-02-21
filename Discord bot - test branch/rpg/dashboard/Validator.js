/**
 * Validator - Detect broken dependencies and consistency issues
 * Validates entire content graph
 */

import { FLAG_REGISTRY } from './FlagRegistry.js';
import { MODIFIER_REGISTRY } from './ModifierSystem.js';
import { validateQuest } from './QuestSchema.js';
import { validateWorld } from './WorldSchema.js';
import { DependencyGraph } from './DependencyGraph.js';

export class DashboardValidator {
  constructor(worlds = [], quests = []) {
    this.worlds = worlds;
    this.quests = quests;
    this.warnings = [];
    this.errors = [];
    this.dependencyGraph = new DependencyGraph(worlds, quests);
  }

  /**
   * Validate entire content system
   */
  validateAll() {
    this.warnings = [];
    this.errors = [];
    this.dependencyGraph = new DependencyGraph(this.worlds, this.quests);

    this.validateWorlds();
    this.validateQuests();
    this.validateFlagReferences();
    this.validateModifierReferences();
    this.validateQuestChains();
    this.validateWorldProgression();
    this.validateDependencies();

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Validate all worlds
   */
  validateWorlds() {
    const worldIds = new Set();

    for (const world of this.worlds) {
      const validation = validateWorld(world);
      if (!validation.valid) {
        this.errors.push(...validation.errors.map(e => `World ${world.id}: ${e}`));
      }

      if (worldIds.has(world.id)) {
        this.errors.push(`Duplicate world ID: ${world.id}`);
      }
      worldIds.add(world.id);

      // Check linked content exists
      for (const questId of world.linkedQuests) {
        if (!this.quests.some(q => q.id === questId)) {
          this.warnings.push(`World ${world.id} references non-existent quest: ${questId}`);
        }
      }
    }
  }

  /**
   * Validate all quests
   */
  validateQuests() {
    const questIds = new Set();

    for (const quest of this.quests) {
      const validation = validateQuest(quest);
      if (!validation.valid) {
        this.errors.push(...validation.errors);
      }

      if (questIds.has(quest.id)) {
        this.errors.push(`Duplicate quest ID: ${quest.id}`);
      }
      questIds.add(quest.id);

      // Check world exists
      if (!this.worlds.some(w => w.id === quest.worldId)) {
        this.warnings.push(`Quest ${quest.id} references non-existent world: ${quest.worldId}`);
      }
    }
  }

  /**
   * Check all flag references are registered
   */
  validateFlagReferences() {
    const allFlagReferences = new Set();

    // From quests
    for (const quest of this.quests) {
      for (const outcome of (quest.outcomes || [])) {
        for (const flag of (outcome.flagsSet || [])) {
          allFlagReferences.add(flag);
        }
      }

      if (quest.visibilityConditions?.requiredFlags) {
        for (const flag of quest.visibilityConditions.requiredFlags) {
          allFlagReferences.add(flag);
        }
      }
      if (quest.visibilityConditions?.forbiddenFlags) {
        for (const flag of quest.visibilityConditions.forbiddenFlags) {
          allFlagReferences.add(flag);
        }
      }
    }

    // From worlds
    for (const world of this.worlds) {
      for (const flag of (world.requiredFlags || [])) {
        allFlagReferences.add(flag);
      }
    }

    // Validate all exist in registry
    for (const flagId of allFlagReferences) {
      if (!FLAG_REGISTRY[flagId]) {
        this.warnings.push(`Unregistered flag referenced: ${flagId}`);
      }
    }
  }

  /**
   * Check all modifier references are registered
   */
  validateModifierReferences() {
    const allModifiers = new Set();

    for (const quest of this.quests) {
      for (const outcome of (quest.outcomes || [])) {
        for (const modId of Object.keys(outcome.modifiersApplied || {})) {
          allModifiers.add(modId);
        }
      }
    }

    for (const world of this.worlds) {
      for (const modId of Object.keys(world.baseModifiers || {})) {
        allModifiers.add(modId);
      }
    }

    for (const modId of allModifiers) {
      if (!MODIFIER_REGISTRY[modId]) {
        this.warnings.push(`Unregistered modifier referenced: ${modId}`);
      }
    }
  }

  /**
   * Detect unreachable quests and broken chains
   */
  validateQuestChains() {
    for (const quest of this.quests) {
      // Check if any outcome is reachable
      if (quest.type === 'choice' && (quest.branches || []).length === 0) {
        this.warnings.push(`Choice quest ${quest.id} has no branches`);
      }

      for (const outcome of (quest.outcomes || [])) {
        if ((outcome.affectedSystems || []).length === 0) {
          this.warnings.push(`Outcome ${outcome.id} affects no systems`);
        }
      }
    }

    // Check for unreachable quests
    const unreachable = this.dependencyGraph.findUnreachableQuests();
    for (const unreachableQuest of unreachable) {
      this.warnings.push(`Quest ${unreachableQuest.questId} is unreachable: requires flags ${unreachableQuest.requiredFlags.join(', ')}`);
    }
  }

  /**
   * Check world progression is logical
   */
  validateWorldProgression() {
    const worldsByTier = {};

    for (const world of this.worlds) {
      if (!worldsByTier[world.tier]) {
        worldsByTier[world.tier] = [];
      }
      worldsByTier[world.tier].push(world);
    }

    // Each world should have clear exit conditions
    for (const world of this.worlds) {
      const hasUnlock = (world.nextWorldUnlock?.requiredQuestCompletion || []).length > 0 ||
                       (world.nextWorldUnlock?.requiredBossDefeat || []).length > 0 ||
                       (world.nextWorldUnlock?.minLevel || 0) > 0;

      if (!hasUnlock && world.tier < 4) {
        this.warnings.push(`World ${world.id} (tier ${world.tier}) has no clear exit conditions`);
      }
    }
  }

  /**
   * Validate dependency graph for cycles and breaks
   */
  validateDependencies() {
    // Check for cycles
    const cycles = this.dependencyGraph.findCycles();
    for (const cycle of cycles) {
      this.errors.push(`Circular quest dependency detected: ${cycle.join(' → ')}`);
    }

    // Check for broken world requirements
    for (const world of this.worlds) {
      for (const requiredQuestId of (world.nextWorldUnlock?.requiredQuestCompletion || [])) {
        if (!this.quests.some(q => q.id === requiredQuestId)) {
          this.errors.push(`World ${world.id} requires non-existent quest: ${requiredQuestId}`);
        }
      }
    }
  }

  /**
   * Get dependency graph for a quest
   */
  getQuestDependencies(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return null;

    const deps = {
      requiredFlags: quest.visibilityConditions?.requiredFlags || [],
      requiredQuests: [], // inferred from flags
      affectsFlags: [],
      affectsModifiers: [],
    };

    for (const outcome of (quest.outcomes || [])) {
      deps.affectsFlags.push(...(outcome.flagsSet || []));
      deps.affectsModifiers.push(...Object.keys(outcome.modifiersApplied || {}));
    }

    return deps;
  }

  /**
   * Get systems affected by quest outcome
   */
  getOutcomeImpact(questId, outcomeId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return null;

    const outcome = (quest.outcomes || []).find(o => o.id === outcomeId);
    if (!outcome) return null;

    return {
      flagsSet: outcome.flagsSet,
      modifiersApplied: outcome.modifiersApplied,
      affectedSystems: outcome.affectedSystems,
      rewards: outcome.rewards,
    };
  }

  /**
   * Get the dependency graph
   */
  getDependencyGraph() {
    return this.dependencyGraph;
  }
}
