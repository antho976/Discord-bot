/**
 * Quest Simulator - Preview quest outcomes and branches
 * Test quest logic without playing through it
 */

import { getAvailableBranches, getBranchOutcomes } from './QuestSchema.js';

export class QuestSimulator {
  constructor(quest, player) {
    this.quest = quest;
    this.player = { ...player };
    this.simulatedFlags = new Map();
    this.simulatedModifiers = new Map();
  }

  /**
   * Get available branches for player
   */
  getAvailablePaths() {
    const available = getAvailableBranches(this.quest, this.player);

    return available.map(branch => ({
      id: branch.id,
      title: branch.title,
      description: branch.description,
      possibleOutcomes: getBranchOutcomes(this.quest, branch.id).map(outcome => ({
        id: outcome.id,
        title: outcome.title,
        rewards: outcome.rewards,
        flagsSet: outcome.flagsSet,
        modifiersApplied: outcome.modifiersApplied,
        affectedSystems: outcome.affectedSystems,
      })),
    }));
  }

  /**
   * Simulate taking a specific path
   */
  simulatePath(branchId, outcomeId) {
    const outcome = this.quest.outcomes.find(o => o.id === outcomeId && o.branchId === branchId);
    if (!outcome) {
      return { error: 'Outcome not found' };
    }

    const simulation = {
      branch: branchId,
      outcome: outcomeId,
      questId: this.quest.id,
      flagsWillBeSet: outcome.flagsSet,
      modifiersWillApply: outcome.modifiersApplied,
      modifierDuration: outcome.modifierDuration,
      rewards: outcome.rewards,
      affectedSystems: outcome.affectedSystems,
      impactAnalysis: this.analyzeImpact(outcome),
    };

    return simulation;
  }

  /**
   * Analyze what systems will be affected
   */
  analyzeImpact(outcome) {
    const impact = {
      systems: outcome.affectedSystems,
      cascadingEffects: [],
      warnings: [],
    };

    // Combat system
    if (outcome.affectedSystems.includes('combat')) {
      const modCount = Object.keys(outcome.modifiersApplied).length;
      impact.cascadingEffects.push(`Combat balance will change via ${modCount} modifiers`);
    }

    // AI behavior
    if (outcome.affectedSystems.includes('ai_behavior')) {
      impact.cascadingEffects.push('Enemy AI will adapt to quest outcome');
    }

    // Progression
    if (outcome.affectedSystems.includes('progression')) {
      impact.cascadingEffects.push('Player progression unlocks may change');
    }

    // Vendor access
    if (outcome.affectedSystems.includes('vendor')) {
      const unlocks = outcome.flagsSet.filter(f => f.includes('vendor'));
      if (unlocks.length > 0) {
        impact.cascadingEffects.push(`${unlocks.length} vendor(s) will unlock`);
      }
    }

    // Check if outcome could make other quests impossible
    for (const flag of outcome.flagsSet) {
      if (flag.includes('enemy_behavior_cautious')) {
        impact.warnings.push('Enemy behavior shift may affect quest difficulty');
      }
    }

    return impact;
  }

  /**
   * Check if quest is completable from current state
   */
  isCompletable() {
    const paths = this.getAvailablePaths();
    if (paths.length === 0) {
      return {
        completable: false,
        reason: 'No available paths with current flags',
      };
    }

    return {
      completable: true,
      availablePaths: paths.length,
    };
  }

  /**
   * Preview all possible outcomes
   */
  previewAllOutcomes() {
    return this.quest.outcomes.map(outcome => ({
      id: outcome.id,
      branchId: outcome.branchId,
      title: outcome.title,
      rewards: outcome.rewards,
      flags: outcome.flagsSet,
      modifiers: outcome.modifiersApplied,
      duration: outcome.modifierDuration,
      impact: this.analyzeImpact(outcome),
    }));
  }

  /**
   * Compare two outcomes
   */
  compareOutcomes(outcomeId1, outcomeId2) {
    const outcome1 = this.quest.outcomes.find(o => o.id === outcomeId1);
    const outcome2 = this.quest.outcomes.find(o => o.id === outcomeId2);

    if (!outcome1 || !outcome2) {
      return { error: 'One or both outcomes not found' };
    }

    const uniqueFlags1 = outcome1.flagsSet.filter(f => !outcome2.flagsSet.includes(f));
    const uniqueFlags2 = outcome2.flagsSet.filter(f => !outcome1.flagsSet.includes(f));

    const uniqueMods1 = Object.keys(outcome1.modifiersApplied).filter(m => !(m in outcome2.modifiersApplied));
    const uniqueMods2 = Object.keys(outcome2.modifiersApplied).filter(m => !(m in outcome1.modifiersApplied));

    return {
      outcome1: {
        title: outcome1.title,
        uniqueFlags: uniqueFlags1,
        uniqueModifiers: uniqueMods1,
        xpDiff: outcome1.rewards.xp - outcome2.rewards.xp,
        goldDiff: outcome1.rewards.gold - outcome2.rewards.gold,
      },
      outcome2: {
        title: outcome2.title,
        uniqueFlags: uniqueFlags2,
        uniqueModifiers: uniqueMods2,
        xpDiff: outcome2.rewards.xp - outcome1.rewards.xp,
        goldDiff: outcome2.rewards.gold - outcome1.rewards.gold,
      },
    };
  }
}
