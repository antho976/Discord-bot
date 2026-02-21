/**
 * Dependency Graph - Visualize relationships between content
 * Shows how quests, flags, modifiers, and worlds depend on each other
 */

export class DependencyGraph {
  constructor(worlds = [], quests = []) {
    this.worlds = worlds;
    this.quests = quests;
    this.graph = {};
    this.buildGraph();
  }

  /**
   * Build complete dependency graph
   */
  buildGraph() {
    this.graph = {
      questToFlags: {},
      questToModifiers: {},
      questToWorlds: {},
      worldToQuests: {},
      flagToQuests: {},
      flagToSystems: {},
      modifierToQuests: {},
      modifierToWorlds: {},
    };

    // Build quest-to-flags mapping
    for (const quest of this.quests) {
      this.graph.questToFlags[quest.id] = {
        required: quest.visibilityConditions?.requiredFlags || [],
        forbidden: quest.visibilityConditions?.forbiddenFlags || [],
        sets: [],
      };

      this.graph.questToModifiers[quest.id] = [];
      this.graph.questToWorlds[quest.id] = quest.worldId;

      for (const outcome of (quest.outcomes || [])) {
        this.graph.questToFlags[quest.id].sets.push(...(outcome.flagsSet || []));
        this.graph.questToModifiers[quest.id].push(...Object.keys(outcome.modifiersApplied || {}));
      }
    }

    // Build world-to-quests mapping
    for (const world of this.worlds) {
      this.graph.worldToQuests[world.id] = world.linkedQuests || [];
    }

    // Build flag-to-quests mapping (reverse lookup)
    for (const quest of this.quests) {
      for (const flagId of this.graph.questToFlags[quest.id].sets) {
        if (!this.graph.flagToQuests[flagId]) {
          this.graph.flagToQuests[flagId] = [];
        }
        this.graph.flagToQuests[flagId].push(quest.id);
      }

      for (const flagId of this.graph.questToFlags[quest.id].required) {
        if (!this.graph.flagToQuests[flagId]) {
          this.graph.flagToQuests[flagId] = [];
        }
        if (!this.graph.flagToQuests[flagId].includes(quest.id)) {
          this.graph.flagToQuests[flagId].push(quest.id);
        }
      }
    }

    // Build modifier-to-quests mapping (reverse lookup)
    for (const quest of this.quests) {
      for (const modId of this.graph.questToModifiers[quest.id]) {
        if (!this.graph.modifierToQuests[modId]) {
          this.graph.modifierToQuests[modId] = [];
        }
        if (!this.graph.modifierToQuests[modId].includes(quest.id)) {
          this.graph.modifierToQuests[modId].push(quest.id);
        }
      }
    }
  }

  /**
   * Get all quests that depend on a flag
   */
  getQuestsDependingOnFlag(flagId) {
    return this.graph.flagToQuests[flagId] || [];
  }

  /**
   * Get all flags a quest sets
   */
  getFlagsSetByQuest(questId) {
    return this.graph.questToFlags[questId]?.sets || [];
  }

  /**
   * Get all modifiers applied by a quest
   */
  getModifiersAppliedByQuest(questId) {
    return this.graph.questToModifiers[questId] || [];
  }

  /**
   * Trace cascade: what happens when flag is set
   */
  traceFlagCascade(flagId, visited = new Set()) {
    if (visited.has(flagId)) {
      return { cycle: true };
    }

    visited.add(flagId);

    const dependentQuests = this.getQuestsDependingOnFlag(flagId);
    const cascade = {
      flag: flagId,
      directlyUnlocksQuests: dependentQuests,
      cascadingEffects: [],
    };

    // For each quest that now becomes available, what modifiers does it apply?
    for (const questId of dependentQuests) {
      const modifiers = this.getModifiersAppliedByQuest(questId);
      const flags = this.getFlagsSetByQuest(questId);

      cascade.cascadingEffects.push({
        quest: questId,
        modifiersWillApply: modifiers,
        flagsWillSet: flags,
      });
    }

    return cascade;
  }

  /**
   * Check if quest chain is broken (unreachable quest)
   */
  isQuestReachable(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return false;

    const requiredFlags = quest.visibilityConditions?.requiredFlags || [];
    
    if (requiredFlags.length === 0) {
      return true; // Quest has no requirements, always reachable
    }

    // Check if any required flag can be obtained
    for (const flagId of requiredFlags) {
      const questsSettingFlag = this.graph.flagToQuests[flagId] || [];
      
      // If at least one quest that sets this flag is reachable, this quest might be reachable
      if (questsSettingFlag.length > 0) {
        for (const settingQuestId of questsSettingFlag) {
          if (this.isQuestReachable(settingQuestId)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Find all unreachable quests
   */
  findUnreachableQuests() {
    const unreachable = [];

    for (const quest of this.quests) {
      if (!this.isQuestReachable(quest.id)) {
        unreachable.push({
          questId: quest.id,
          questTitle: quest.title,
          requiredFlags: quest.visibilityConditions?.requiredFlags || [],
        });
      }
    }

    return unreachable;
  }

  /**
   * Get quest chain (prerequisites -> this quest -> consequences)
   */
  getQuestChain(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest) return null;

    const chain = {
      prerequisites: [],
      quest: {
        id: quest.id,
        title: quest.title,
        type: quest.type,
      },
      consequences: [],
    };

    // Prerequisites: quests that set required flags
    for (const flagId of (quest.visibilityConditions?.requiredFlags || [])) {
      const settingQuests = this.graph.flagToQuests[flagId] || [];
      chain.prerequisites.push({
        flag: flagId,
        questsSettingIt: settingQuests,
      });
    }

    // Consequences: modifiers and flags applied
    for (const outcome of (quest.outcomes || [])) {
      chain.consequences.push({
        type: 'flags',
        items: outcome.flagsSet || [],
      });

      chain.consequences.push({
        type: 'modifiers',
        items: Object.keys(outcome.modifiersApplied || {}),
      });
    }

    return chain;
  }

  /**
   * Find circular dependencies (quest chains that reference each other)
   */
  findCycles() {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (questId, path = []) => {
      if (recursionStack.has(questId)) {
        // Found a cycle
        const cycleStart = path.indexOf(questId);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart).concat(questId));
        }
        return;
      }

      if (visited.has(questId)) {
        return;
      }

      visited.add(questId);
      recursionStack.add(questId);

      const quest = this.quests.find(q => q.id === questId);
      if (!quest) return;

      // Find quests that depend on flags set by this quest
      for (const outcome of (quest.outcomes || [])) {
        for (const flagId of (outcome.flagsSet || [])) {
          const dependents = this.graph.flagToQuests[flagId] || [];
          for (const dependentId of dependents) {
            dfs(dependentId, [...path, questId]);
          }
        }
      }

      recursionStack.delete(questId);
    };

    for (const quest of this.quests) {
      if (!visited.has(quest.id)) {
        dfs(quest.id);
      }
    }

    return cycles;
  }

  /**
   * Get world progression map
   */
  getWorldProgressionMap() {
    const progression = {};

    for (const world of this.worlds) {
      progression[world.id] = {
        name: world.name,
        tier: world.tier,
        requiredFlags: world.requiredFlags || [],
        linkedQuests: world.linkedQuests || [],
        nextWorldRequirements: world.nextWorldUnlock || {},
      };
    }

    return progression;
  }

  /**
   * Generate ASCII visualization of quest dependencies (simplified)
   */
  visualizeDependencies() {
    let output = 'QUEST DEPENDENCY GRAPH\n';
    output += '='.repeat(50) + '\n\n';

    for (const quest of this.quests) {
      output += `📜 ${quest.id}: ${quest.title}\n`;

      const requiredFlags = quest.visibilityConditions?.requiredFlags || [];
      if (requiredFlags.length > 0) {
        output += `   Requires: ${requiredFlags.join(', ')}\n`;
      }

      const outcomes = quest.outcomes || [];
      if (outcomes.length > 0) {
        output += '   Sets flags:\n';
        for (const outcome of outcomes) {
          for (const flag of (outcome.flagsSet || [])) {
            output += `      → ${flag}\n`;
          }
        }
      }

      output += '\n';
    }

    return output;
  }

  /**
   * Get impact summary for a change
   */
  getImpactSummary(changeType, changeId) {
    const impact = {
      changeType,
      changeId,
      affectedQuests: [],
      affectedWorlds: [],
      affectedSystems: new Set(),
    };

    if (changeType === 'flag') {
      impact.affectedQuests = this.getQuestsDependingOnFlag(changeId);
      
      for (const questId of impact.affectedQuests) {
        const quest = this.quests.find(q => q.id === questId);
        if (quest) {
          for (const outcome of (quest.outcomes || [])) {
            outcome.affectedSystems?.forEach(sys => impact.affectedSystems.add(sys));
          }
        }
      }
    }

    if (changeType === 'modifier') {
      impact.affectedQuests = this.graph.modifierToQuests[changeId] || [];
    }

    if (changeType === 'world') {
      impact.affectedQuests = this.graph.worldToQuests[changeId] || [];
    }

    impact.affectedSystems = Array.from(impact.affectedSystems);
    return impact;
  }
}

/**
 * Helper to create a simple text report
 */
export function generateDependencyReport(dependencyGraph) {
  const unreachable = dependencyGraph.findUnreachableQuests();
  const cycles = dependencyGraph.findCycles();
  const progression = dependencyGraph.getWorldProgressionMap();

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalQuests: dependencyGraph.quests.length,
      unreachableQuests: unreachable.length,
      cyclesDetected: cycles.length,
      totalWorlds: dependencyGraph.worlds.length,
    },
    details: {
      unreachable,
      cycles: cycles.map(cycle => ({
        quests: cycle,
        description: `Circular dependency: ${cycle.join(' → ')}`,
      })),
      worldProgression: progression,
    },
  };

  return report;
}
