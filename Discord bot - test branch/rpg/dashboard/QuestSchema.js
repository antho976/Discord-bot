/**
 * Quest Schema - Complete quest system with branching logic
 * Quests are systemic levers, not just content
 */

export const QUEST_SCHEMA = {
  // Identity
  id: 'string',
  title: 'string',
  worldId: 'string', // Which world this quest belongs to
  description: 'string',

  // Visibility and access
  visibilityConditions: {
    requiredFlags: ['string'],
    forbiddenFlags: ['string'],
    minLevel: 'number',
  },
  startConditions: {
    automaticStart: 'boolean',
    requiredNPC: 'string',
    requiredItem: 'string',
  },

  // Quest type and mechanics
  type: 'string', // 'combat', 'choice', 'gathering', 'boss'
  mechanics: {
    // Combat: defeat X enemies
    // Choice: select from options
    // Gathering: collect X items
    // Boss: defeat specific boss
  },

  // Completion logic
  completionConditions: {
    enemyDefeats: 'number',
    itemsCollected: 'number',
    choiceMade: 'boolean',
    bossDefeated: 'string',
  },
  failureConditions: {
    timeLimit: 'number',
    flagSet: ['string'], // If any flag set, quest fails
  },

  // Pressure states (escalation)
  pressureStates: {
    enabled: 'boolean',
    escalationStages: [
      {
        threshold: 'number', // Time or progress threshold
        consequence: 'string', // What happens
        modifierApplied: 'string', // Modifier ID
      },
    ],
  },

  // Branching paths (graph nodes)
  branches: [
    {
      id: 'string', // Branch ID
      title: 'string',
      description: 'string',
      conditions: ['string'], // When this branch is available
      mechanical_impact: 'string', // What systems does this affect
    },
  ],

  // Outcomes (REQUIRED - every outcome must have flags + modifiers)
  outcomes: [
    {
      id: 'string',
      branchId: 'string', // Which branch leads here
      title: 'string',
      description: 'string',

      // Rewards
      rewards: {
        xp: 'number',
        gold: 'number',
        items: ['string'],
      },

      // MANDATORY: Flags set by this outcome
      flagsSet: ['string'], // Quest flags to set

      // MANDATORY: Modifiers applied by this outcome
      modifiersApplied: {
        'modifier_id': 'number', // value
      },

      // Duration of modifiers (null = permanent)
      modifierDuration: 'number', // in days, null = permanent

      // Which systems this outcome affects
      affectedSystems: ['string'], // combat, ai_behavior, vendor, progression, etc.
    },
  ],

  // Optional story layer
  story: {
    enabled: 'boolean',
    narrativeText: 'string',
    npcDialogues: {
      'npc_id': 'string', // NPC dialogue text
    },
    storyHooks: ['string'], // Related narrative events
  },

  // Metadata for designers
  designIntent: 'string', // e.g., "Introduce mechanic", "Risk choice"
  internalNotes: 'string', // What choice does this create?
  draftMode: 'boolean',
};

/**
 * Create a new quest with defaults
 */
export function createQuest(questData) {
  const defaults = {
    id: questData.id,
    title: questData.title,
    worldId: questData.worldId || 'world_1',
    description: questData.description || '',

    visibilityConditions: questData.visibilityConditions || {
      requiredFlags: [],
      forbiddenFlags: [],
      minLevel: 1,
    },
    startConditions: questData.startConditions || {
      automaticStart: true,
      requiredNPC: null,
      requiredItem: null,
    },

    type: questData.type || 'combat',
    mechanics: questData.mechanics || {},

    completionConditions: questData.completionConditions || {
      enemyDefeats: 0,
      itemsCollected: 0,
      choiceMade: false,
      bossDefeated: null,
    },
    failureConditions: questData.failureConditions || {
      timeLimit: null,
      flagSet: [],
    },

    pressureStates: questData.pressureStates || {
      enabled: false,
      escalationStages: [],
    },

    branches: questData.branches || [],
    outcomes: questData.outcomes || [],

    story: questData.story || {
      enabled: false,
      narrativeText: '',
      npcDialogues: {},
      storyHooks: [],
    },

    designIntent: questData.designIntent || '',
    internalNotes: questData.internalNotes || '',
    draftMode: questData.draftMode !== false,
  };

  return defaults;
}

/**
 * Validate quest definition
 */
export function validateQuest(quest) {
  const errors = [];

  if (!quest.id) errors.push('Quest must have ID');
  if (!quest.title) errors.push('Quest must have title');
  if (quest.outcomes.length === 0) errors.push('Quest must have at least one outcome');

  for (const outcome of quest.outcomes) {
    if (!outcome.flagsSet || outcome.flagsSet.length === 0) {
      errors.push(`Outcome "${outcome.id}" must set at least one flag`);
    }
    if (!outcome.modifiersApplied || Object.keys(outcome.modifiersApplied).length === 0) {
      errors.push(`Outcome "${outcome.id}" must apply at least one modifier`);
    }
    if (!outcome.affectedSystems || outcome.affectedSystems.length === 0) {
      errors.push(`Outcome "${outcome.id}" must affect at least one system`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get available branches for player
 */
export function getAvailableBranches(quest, player) {
  return quest.branches.filter(branch => {
    return branch.conditions.every(condition => {
      return player.hasQuestFlag(condition);
    });
  });
}

/**
 * Get possible outcomes for a branch
 */
export function getBranchOutcomes(quest, branchId) {
  return quest.outcomes.filter(o => o.branchId === branchId);
}
