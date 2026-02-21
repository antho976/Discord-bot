# Dashboard Quick Start Guide

## 30-Second Overview

The RPG Dashboard is a **fully editable admin interface** where you can:
- Create and edit worlds without code
- Design branching quests with multiple outcomes
- Manage flags and modifiers globally
- Test AI behavior and combat
- Validate content for errors
- Version and rollback changes

## Getting Started

### 1. Initialize the Dashboard
```javascript
import { contentStore } from './rpg/dashboard/ContentStore.js';

// Load existing content from files
contentStore.loadAll();

// Content is now ready to use
const worlds = contentStore.getAllWorlds();
const quests = contentStore.getAllQuests();
```

### 2. Create a World
```javascript
const world = contentStore.addWorld({
  id: 'forest_lands',
  name: 'Forest Lands',
  displayName: 'The Enchanted Forest',
  tier: 1,
  theme: 'Nature',
  minLevel: 1,
  maxLevel: 20,
  baseDifficulty: 0.4,
  linkedQuests: [], // Quest IDs
  designIntent: 'Introduction to exploration',
  internalNotes: 'Safe zone for new players',
});
```

### 3. Create a Quest
```javascript
const quest = contentStore.addQuest({
  id: 'quest_explore_forest',
  title: 'Explore the Forest',
  worldId: 'forest_lands',
  type: 'gathering',
  visibilityConditions: {
    requiredFlags: [],
    forbiddenFlags: [],
    minLevel: 1,
  },
  completionConditions: {
    itemsCollected: 5,
  },
  outcomes: [
    {
      id: 'outcome_exploration_complete',
      title: 'Exploration Complete',
      flagsSet: ['world_1_unlocked'],
      modifiersApplied: { xp_gain_boost: 1.2 },
      affectedSystems: ['progression', 'rewards'],
      rewards: { xp: 100, gold: 50 },
    },
  ],
  designIntent: 'Teaching exploration',
  internalNotes: 'Should reward curiosity',
});
```

### 4. Test the Quest
```javascript
import { QuestSimulator } from './rpg/dashboard/QuestSimulator.js';

const simulator = new QuestSimulator(quest, player);
const paths = simulator.getAvailablePaths();

// Simulate outcome
const result = simulator.simulatePath('outcome_exploration_complete');
console.log('Flags will set:', result.flagsWillBeSet);
console.log('Systems affected:', result.affectedSystems);
```

### 5. Validate Everything
```javascript
const validation = contentStore.validate();

if (validation.valid) {
  console.log('✅ All content is valid!');
} else {
  console.log('❌ Errors:', validation.errors);
  console.log('⚠️ Warnings:', validation.warnings);
}
```

## Common Tasks

### Create a Branching Quest
```javascript
const branchingQuest = {
  id: 'quest_moral_choice',
  title: 'A Moral Choice',
  type: 'choice',
  branches: [
    { id: 'save_villagers', title: 'Save the Villagers', description: 'Risk yourself' },
    { id: 'save_treasure', title: 'Take the Treasure', description: 'Abandon them' },
  ],
  outcomes: [
    {
      id: 'outcome_heroic',
      branchId: 'save_villagers',
      title: 'Heroic Victory',
      flagsSet: ['reputation_hero'],
      modifiersApplied: { npc_goodwill: 1.5 },
      affectedSystems: ['reputation', 'npc_behavior'],
      rewards: { xp: 500 },
    },
    {
      id: 'outcome_wealthy',
      branchId: 'save_treasure',
      title: 'Rich but Hated',
      flagsSet: ['reputation_greedy'],
      modifiersApplied: { merchant_prices: 0.8 },
      affectedSystems: ['reputation', 'economy'],
      rewards: { gold: 1000 },
    },
  ],
};

contentStore.addQuest(branchingQuest);
```

### Toggle Flags for Testing
```javascript
import { FlagTester } from './rpg/dashboard/FlagTester.js';

const tester = new FlagTester();

// Set some flags
tester.setFlag('quest_forest_complete', true);
tester.setFlag('vendor_unlocked_blacksmith', true);

// Check what quest qualification looks like
const qualify = tester.checkQuestQualification(someQuest);
console.log('Can start quest?', qualify.canStart);
console.log('Issues:', qualify.issues);

// See the test state
const state = tester.getTestState();
console.log('Active flags:', state.flags);
```

### Simulate Combat
```javascript
import { CombatSimulator } from './rpg/dashboard/CombatSimulator.js';

const simulator = new CombatSimulator(player, enemy);
const result = simulator.simulate(20); // Max 20 rounds

console.log('Player won?', result.won);
console.log('Rounds lasted:', result.rounds);
console.log('Turn log:', result.log);
```

### Preview World States
```javascript
import { WorldStateSimulator } from './rpg/dashboard/WorldStateSimulator.js';

const worldSim = new WorldStateSimulator(world);

// Today's state
const today = worldSim.generateDailyState();
console.log('Today:', today.name, today.description);

// Next week
const week = worldSim.simulateWeek();
week.forEach(state => {
  console.log(`${state.date}: ${state.name}`);
});
```

### Create a Version Checkpoint
```javascript
// Save the current state
const versionId = contentStore.createVersion(
  'Pre-Tier2 Balance',
  'Snapshot before tier 2 difficulty increase'
);

// ... make changes ...

// Oops! Revert
contentStore.restoreVersion(versionId);
```

### Export Content
```javascript
import { ContentExporter } from './rpg/dashboard/ContentTools.js';

// Export everything
const fullExport = ContentExporter.exportFull(
  contentStore.getAllWorlds(),
  contentStore.getAllQuests(),
  {
    author: 'Design Team',
    description: 'Version 1.0 balanced',
    tags: ['release', 'balanced'],
  }
);

// Save to file
ContentExporter.saveToFile(fullExport, 'game_v1.0.json');
```

### Check Dependencies
```javascript
import { DependencyGraph } from './rpg/dashboard/DependencyGraph.js';

const graph = new DependencyGraph(worlds, quests);

// What quests become available when this flag is set?
const cascade = graph.traceFlagCascade('vendor_unlocked_blacksmith');
console.log('Unlocks quests:', cascade.directlyUnlocksQuests);

// Are any quests unreachable?
const unreachable = graph.findUnreachableQuests();
if (unreachable.length > 0) {
  console.log('⚠️ Unreachable quests:', unreachable);
}

// Detect circular dependencies
const cycles = graph.findCycles();
if (cycles.length > 0) {
  console.log('🔴 Circular dependencies found:', cycles);
}
```

## Key Concepts

### Flags
- Global boolean states
- Set by quest outcomes
- Check quest visibility
- Affect systems

```javascript
// In FlagRegistry
'quest_forest_complete': {
  scope: 'quest',
  description: 'Forest quest finished',
  affects: ['progression', 'vendor_unlock'],
},
```

### Modifiers
- Change stat values
- Types: additive, multiplicative, conditional, override
- Scoped: local, world, global
- Have priorities

```javascript
// In ModifierSystem
'xp_gain_boost': {
  type: 'multiplicative',
  scope: 'world',
  baseSystems: ['loot'],
  description: 'XP rewards increased',
  priority: 5,
},
```

### Quest Outcomes
- **Must** set flags OR apply modifiers
- **Must** affect 2+ systems
- Include rewards
- Can have duration

```javascript
{
  id: 'outcome_victory',
  flagsSet: ['boss_defeated'],
  modifiersApplied: { xp_gain_boost: 1.5 },
  modifierDuration: 7, // days (null = permanent)
  affectedSystems: ['combat', 'progression'],
  rewards: { xp: 1000, gold: 500 },
}
```

### AI Profiles
- Pre-built: aggressive, defensive, opportunistic, healer, evasive
- Customizable parameters
- Per-enemy overrides

```javascript
import { getAIProfile } from './rpg/dashboard/AIBehaviorSystem.js';

const aggressive = getAIProfile('aggressive');
console.log('Aggression:', aggressive.aggression); // 0.9
console.log('Defensive:', aggressive.defensivePriority); // 0.1
```

## File Locations

```
rpg/dashboard/
├── ContentStore.js              # Load/save all content
├── WorldSchema.js               # World definitions
├── QuestSchema.js               # Quest definitions
├── FlagRegistry.js              # All flags
├── ModifierSystem.js            # All modifiers
├── AIBehaviorSystem.js          # AI profiles
├── DependencyGraph.js           # Relationship analysis
├── Validator.js                 # Content validation
├── FlagTester.js                # Flag testing
├── QuestSimulator.js            # Quest preview
├── CombatSimulator.js           # Combat preview
├── WorldStateSimulator.js        # Daily states
├── ContentTools.js              # Export/import
├── DashboardCommand.js          # Discord /dashboard
└── data/
    ├── worlds.json
    ├── quests.json
    ├── versions/
    └── exports/
```

## Troubleshooting

### Content won't save
- Check `rpg/dashboard/data/` exists
- Check file permissions
- Look at console errors

### Validation errors
- Check `contentStore.validate()` output
- Use `DependencyGraph` to trace issues
- Look for unregistered flags/modifiers

### Quest unreachable
- Check required flags in `visibilityConditions`
- Trace with `graph.traceFlagCascade()`
- Ensure prerequisite quests exist

## Next Steps

1. **Read** `DASHBOARD_README.md` for full architecture
2. **Explore** `IMPLEMENTATION_COMPLETE.md` for feature checklist
3. **Test** with sample quests in `SampleContent.js`
4. **Validate** your content regularly
5. **Version** before major changes

---

**Remember:** All content is data. The dashboard is the source of truth.
