# Integration Checklist: Dashboard with RPGBot

## Overview
This checklist ensures the RPG Dashboard is properly integrated with the main RPGBot system and works end-to-end.

## Phase 1: Core Integration

### ✅ ContentStore Initialization
- [ ] Initialize `contentStore` in RPGBot startup
- [ ] Load content from files: `contentStore.loadAll()`
- [ ] Add sample content if empty
- [ ] Expose `contentStore` to game systems

**Implementation:**
```javascript
import { contentStore } from './rpg/dashboard/ContentStore.js';

class RPGBot {
  constructor() {
    // ...
    this.contentStore = contentStore;
    this.contentStore.loadAll();
  }
}
```

### ✅ Dashboard Command Registration
- [ ] Register `/dashboard` slash command
- [ ] Add to command loader
- [ ] Ensure admin-only check works
- [ ] Test button interactions

**Implementation:**
```javascript
import DashboardCommand from './rpg/dashboard/DashboardCommand.js';

const dashboardCommand = new DashboardCommand();
client.slashCommands.set('dashboard', dashboardCommand);
```

## Phase 2: Game System Integration

### ✅ World Loading
- [ ] Load worlds from `contentStore` instead of hardcoded
- [ ] Apply world-specific modifiers
- [ ] Check world progression requirements
- [ ] Load world state modifiers

**Integration Point:**
```javascript
const world = this.contentStore.getWorld(worldId);
if (!world) throw new Error('World not found');

// Apply world modifiers to current state
world.baseModifiers.forEach((mod, modId) => {
  applyModifier(modId, mod);
});
```

### ✅ Quest Loading
- [ ] Load quests from `contentStore`
- [ ] Check quest visibility conditions
- [ ] Validate player can start quest
- [ ] Handle branching paths
- [ ] Apply outcome effects

**Integration Point:**
```javascript
const quest = this.contentStore.getQuest(questId);
if (!quest) throw new Error('Quest not found');

// Check if player can see quest
const canStart = checkQuestVisibility(quest, player);
if (!canStart) return null;
```

### ✅ Flag System Integration
- [ ] Use `FlagRegistry` for all flags
- [ ] Set flags from quest outcomes
- [ ] Check flags for visibility conditions
- [ ] Validate flag references

**Integration Point:**
```javascript
import { FLAG_REGISTRY } from './rpg/dashboard/FlagRegistry.js';

// Set flag from outcome
quest.outcome.flagsSet.forEach(flagId => {
  if (!FLAG_REGISTRY[flagId]) throw new Error(`Unknown flag: ${flagId}`);
  player.setQuestFlag(flagId);
});
```

### ✅ Modifier System Integration
- [ ] Use `ModifierRegistry` for all modifiers
- [ ] Apply modifiers in pipeline order
- [ ] Handle modifier duration (temporary vs permanent)
- [ ] Update modifiers when quests complete

**Integration Point:**
```javascript
import { MODIFIER_PIPELINE, applyModifier } from './rpg/dashboard/ModifierSystem.js';

// Apply outcome modifiers in order
for (const pipelineStage of MODIFIER_PIPELINE) {
  outcome.modifiersApplied.forEach((value, modId) => {
    const finalValue = applyModifier(baseValue, modId, value);
    // Apply to player
  });
}
```

### ✅ AI Behavior Integration
- [ ] Load enemy AI profiles from `AIBehaviorSystem`
- [ ] Use profile for behavior decisions
- [ ] Apply per-enemy overrides
- [ ] Update AI based on quest flags

**Integration Point:**
```javascript
import { getEffectiveAIBehavior } from './rpg/dashboard/AIBehaviorSystem.js';

const aiProfile = getEffectiveAIBehavior(enemy.id, enemy.baseProfile);
const decision = evaluateAIDecision(aiProfile, combatState);
```

### ✅ World State Integration
- [ ] Generate daily world states
- [ ] Apply world state modifiers
- [ ] Check for flag-based state changes
- [ ] Update world state each day

**Integration Point:**
```javascript
import { WorldStateSimulator } from './rpg/dashboard/WorldStateSimulator.js';

const worldSim = new WorldStateSimulator(world);
const dailyState = worldSim.generateDailyState();

// Apply modifiers from state
Object.entries(dailyState.modifiers).forEach(([modId, value]) => {
  applyModifier(modId, value);
});
```

## Phase 3: Validation Integration

### ✅ Content Validation on Startup
- [ ] Run `contentStore.validate()` on startup
- [ ] Log any warnings
- [ ] Block on errors
- [ ] Report validation status

**Implementation:**
```javascript
const validation = this.contentStore.validate();
if (!validation.valid) {
  console.error('❌ Content validation failed:', validation.errors);
  process.exit(1);
}
if (validation.warnings.length > 0) {
  console.warn('⚠️ Warnings:', validation.warnings);
}
```

### ✅ Runtime Validation
- [ ] Validate quest before starting
- [ ] Validate world before entering
- [ ] Validate outcome before applying
- [ ] Log validation failures

## Phase 4: Testing & Tools

### ✅ Testing Tools Available
- [ ] `/dashboard` command for manual testing
- [ ] `CombatSimulator` for balance testing
- [ ] `QuestSimulator` for quest testing
- [ ] `FlagTester` for flag scenarios
- [ ] `WorldStateSimulator` for world state testing

### ✅ Developer Tools
- [ ] Validation reports via dashboard
- [ ] Dependency graph visualization
- [ ] Unreachable quest detection
- [ ] Cycle detection

## Phase 5: Data Flow Verification

### Quest Completion Flow
```
1. Player completes quest
2. Load quest from contentStore
3. Select outcome based on player choices
4. Validate outcome exists
5. Apply flags:
   - Check FLAG_REGISTRY
   - Set flags on player
6. Apply modifiers:
   - Check MODIFIER_REGISTRY
   - Apply via pipeline
   - Set duration if temporary
7. Give rewards
8. Trigger event (other systems listening)
```

### World Entry Flow
```
1. Player tries to enter world
2. Load world from contentStore
3. Check world.requiredFlags
4. Check player level vs world.minLevel
5. Check world.requiredFlags against player flags
6. Load world state:
   - Generate daily state
   - Apply state modifiers
7. Load world modifiers
8. Update all systems
```

### Flag Set Flow
```
1. Action sets a flag
2. Check FLAG_REGISTRY for metadata
3. Set flag on player
4. Log which systems are affected
5. Trigger updates:
   - Check for newly available quests
   - Update NPC dialogs
   - Update vendor availability
   - Check progression requirements
```

## Phase 6: Error Handling

### ✅ Content Not Found
- [ ] Handle missing world gracefully
- [ ] Handle missing quest gracefully
- [ ] Handle missing flag gracefully
- [ ] Handle missing modifier gracefully
- [ ] Log and alert user

### ✅ Validation Failures
- [ ] Don't apply invalid outcomes
- [ ] Don't set unregistered flags
- [ ] Don't apply unregistered modifiers
- [ ] Provide clear error messages

## Integration Tests

### World Management
- [ ] Create world
- [ ] Load world
- [ ] Update world
- [ ] Delete world
- [ ] Validate world progression

### Quest Management
- [ ] Create quest
- [ ] Load quest
- [ ] Start quest
- [ ] Complete quest with different outcomes
- [ ] Validate branches

### Flag Management
- [ ] Set flag from outcome
- [ ] Check flag visibility
- [ ] Flag affects quest availability
- [ ] Flag affects NPC behavior
- [ ] Clear flag (if needed)

### Modifier Management
- [ ] Apply temporary modifier
- [ ] Apply permanent modifier
- [ ] Modifier expires
- [ ] Stacking rules work
- [ ] Pipeline order correct

### AI Behavior
- [ ] Load AI profile
- [ ] Apply custom modifiers
- [ ] Profile affects combat decisions
- [ ] Per-enemy overrides work

### World States
- [ ] Generate daily state
- [ ] Apply state modifiers
- [ ] 7-day forecast
- [ ] Deterministic (same day = same state)

### Validation
- [ ] Detect missing world reference
- [ ] Detect missing quest reference
- [ ] Detect unregistered flag
- [ ] Detect unregistered modifier
- [ ] Detect unreachable quest
- [ ] Detect circular dependency

## Documentation

### ✅ Documentation Status
- [ ] `DASHBOARD_README.md` - Complete ✅
- [ ] `IMPLEMENTATION_COMPLETE.md` - Complete ✅
- [ ] `QUICK_START.md` - Complete ✅
- [ ] Integration examples added
- [ ] API documentation complete

## Deployment Checklist

### Before Release
- [ ] All integration tests pass
- [ ] Content validates without errors
- [ ] Dashboard command works
- [ ] File persistence works
- [ ] Versioning tested
- [ ] No console errors on startup
- [ ] Sample content loads

### Post-Release
- [ ] Monitor for runtime errors
- [ ] Check validation logs
- [ ] Validate user-created content
- [ ] Performance acceptable
- [ ] File I/O working properly

## Known Issues & Workarounds

### Issue: File persistence not working
**Cause:** Missing `rpg/dashboard/data/` directory
**Workaround:**
```javascript
const DATA_DIR = './rpg/dashboard/data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
```

### Issue: Old content not loading
**Cause:** Content format changed
**Solution:** Use export/import to migrate old content

### Issue: Circular dependency in quests
**Detection:** Run `graph.findCycles()` in validation
**Fix:** Reorder quest outcomes to break cycle

## Success Criteria

✅ **System is ready when:**
1. All content loads from files without error
2. `/dashboard` command opens and shows content
3. Creating/editing content saves to files
4. Validation runs on startup and after changes
5. Game uses contentStore for all content
6. All modifiers and flags from registry
7. AI uses behavior profiles
8. World states generate correctly
9. Simulators work for testing
10. No hardcoded gameplay values

## Integration Endpoints

### For Game Systems
```javascript
// Load content
const world = contentStore.getWorld(worldId);
const quest = contentStore.getQuest(questId);

// Check validation
const validation = contentStore.validate();

// Get modifiers/flags
const flag = FLAG_REGISTRY[flagId];
const modifier = MODIFIER_REGISTRY[modifierId];

// Get AI profiles
const aiProfile = getAIProfile(profileId);

// Simulate outcomes
const simulator = new QuestSimulator(quest, player);
const paths = simulator.getAvailablePaths();
```

### For Admin Tools
```javascript
// Via Discord command
/dashboard → Opens full admin interface

// Via code
contentStore.createVersion(name, desc);
contentStore.restoreVersion(versionId);
ContentExporter.exportFull(worlds, quests);
```

---

**Integration Status: [    ] Not Started  [ ✓ ] Complete**

When all checkboxes are complete, the dashboard is fully integrated with the RPGBot system.
