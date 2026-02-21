# RPG Dashboard System - Complete Implementation

## Overview

This is a **fully functional, data-driven admin dashboard** that allows complete customization of RPG content without touching code. All gameplay content is editable, validated, and versioned through this system.

## Architecture

### Core Systems

1. **ContentStore** (`ContentStore.js`)
   - Central storage for all worlds, quests, flags, and modifiers
   - File persistence (JSON-based)
   - Versioning and backup management
   - `loadAll()` / `saveAll()` for persistence
   - Automatic validation after changes

2. **DashboardValidator** (`Validator.js`)
   - Comprehensive validation of entire content system
   - Checks for:
     - Broken references (missing worlds, quests, flags, modifiers)
     - Unreachable quests
     - Circular dependencies
     - Missing progression conditions
     - Unregistered flags/modifiers
   - Integrated with DependencyGraph for advanced analysis

3. **DependencyGraph** (`DependencyGraph.js`)
   - Maps all relationships between quests, flags, modifiers, and worlds
   - Detects circular dependencies
   - Traces cascade effects of changes
   - Identifies unreachable content
   - Generates impact analysis

## Dashboard Components

### Navigation System

**MAIN SIDEBAR** → **SUB-SIDEBAR** Architecture

```
🌍 Worlds
├── World Overview
├── World Settings
├── World State Rules
├── Linked Quests
├── Linked Vendors
├── Linked Enemies
└── Progression & Unlocks

📜 Quests
├── Quest List
├── Quest Logic Graph
├── Outcomes & Consequences
├── Flags & Modifiers Used
└── Story Layer (Optional)

👥 Entities
├── Players
├── NPCs
├── Enemies
└── Vendors

⚙️ Systems
├── Stats & Formulas
├── XP & Progression
├── Classes & Backgrounds
├── Skills & Effects
└── Professions & Crafting

🤖 AI & Combat
├── AI Behavior Profiles
├── Skill Priorities
├── Enemy Overrides
└── Combat Balance

🚩 Flags & Modifiers
├── Flag Registry
├── Modifier Registry
├── Flag Groups
└── Modifier Pipeline

🧪 Simulation
├── Combat Simulator
├── Quest Preview
├── World State Preview
└── Flag Tester

🔑 Admin
├── Validation Report
├── Dependency Graph
├── Export / Import
└── Content Versioning
```

### Content Systems

#### Worlds (`WorldSchema.js`)
Fully editable world definitions:
- ID, name, display name, tier, theme
- Difficulty and scaling
- World state generation rules
- Base modifiers and AI modifiers
- Linked content (quests, enemies, vendors, NPCs)
- Progression requirements
- Design intent and internal notes

#### Quests (`QuestSchema.js`)
Complete quest system with branching:
- ID, title, type (combat, choice, gathering, boss)
- Visibility conditions (required/forbidden flags, level)
- Start and completion conditions
- Failure conditions and pressure states
- **Branching paths** (graph-capable)
- **Outcomes** (mandatory flags + modifiers):
  - Rewards (XP, gold, items)
  - Flags set
  - Modifiers applied with duration
  - Affected systems list
- Optional story layer

#### Flags (`FlagRegistry.js`)
Global flag registry:
- All flags defined in one place
- Metadata: scope, description, affected systems
- Flag groups for bulk operations
- Validation of flag references

#### Modifiers (`ModifierSystem.js`)
Centralized modifier system:
- Types: additive, multiplicative, conditional, override
- Scopes: local, world, global
- Priority order and stack rules
- Modifier pipeline: base → world → quest → equipment → temporary
- Registry of all modifiers

### Simulation & Testing Tools

#### Combat Simulator (`CombatSimulator.js`)
- Simulate turn-by-turn combat
- AI decision making
- Skill usage evaluation
- Combat outcome prediction

#### Quest Simulator (`QuestSimulator.js`)
- Preview available quest paths/branches
- Simulate quest outcomes
- Analyze mechanical impacts
- Predict flag and modifier changes

#### World State Simulator (`WorldStateSimulator.js`)
- Generate daily world states deterministically
- Preview 7-day and 30-day forecasts
- State distribution analysis
- Flag-based state modifications

#### Flag Tester (`FlagTester.js`)
- Toggle flags on/off
- Set modifiers for testing
- Simulate player state
- Test quest qualification
- Preset test scenarios

### AI Behavior System (`AIBehaviorSystem.js`)

**Pre-built AI profiles:**
- Aggressive: High offense, ignores defense
- Defensive: Prioritizes survival
- Opportunistic: Exploits weaknesses
- Healer/Support: Healing and buffing
- Evasive: Avoids damage through movement

**Customizable parameters:**
- Aggression (0-1)
- Defensive priority (0-1)
- Risk tolerance (0-1)
- Skill priority type
- Reactions to threats and low HP
- Cooldown and tactical awareness

**Per-enemy overrides** without changing base profile.

### Content Tools (`ContentTools.js`)

#### ContentExporter
- Export full content or specific worlds
- Sanitized output (no draft flags)
- Statistics collection
- Save to file with metadata

#### ContentImporter
- Validate import data
- Merge strategies: addNew, overwrite, rename
- Import from files
- Detect duplicate IDs

#### Backup & Versioning
- Create version checkpoints
- Compare versions
- Restore from versions
- Automatic backups

### Dashboard Command (`DashboardCommand.js`)

Discord slash command `/dashboard` that opens the admin interface:
- Admin-only access
- Button-based navigation
- Real-time validation status
- Direct integration with all systems
- Session data management

## File Structure

```
rpg/dashboard/
├── AIBehaviorSystem.js          # AI profiles and behavior
├── CombatSimulator.js           # Combat preview tool
├── ContentStore.js              # Persistence layer
├── ContentTools.js              # Export/import/versioning
├── DashboardCommand.js          # Discord command
├── DashboardNavigator.js        # Navigation structure
├── DependencyGraph.js           # Relationship mapping
├── FlagRegistry.js              # Global flags
├── FlagTester.js                # Flag testing tool
├── ModifierSystem.js            # Modifier definitions
├── QuestSchema.js               # Quest definitions
├── QuestSimulator.js            # Quest preview tool
├── SampleContent.js             # Sample worlds/quests
├── Validator.js                 # Content validation
├── WorldSchema.js               # World definitions
├── WorldStateSimulator.js        # Daily state generation
└── data/
    ├── worlds.json              # Saved worlds
    ├── quests.json              # Saved quests
    ├── versions/                # Version history
    │   ├── v_*.json
    │   └── ...
    └── exports/                 # Exported content
        └── ...
```

## Usage Examples

### Adding a World
```javascript
import { contentStore } from './ContentStore.js';

const newWorld = contentStore.addWorld({
  id: 'forest_realm',
  name: 'Forest Realm',
  displayName: 'The Enchanted Forest',
  tier: 2,
  theme: 'Forest',
  minLevel: 10,
  maxLevel: 25,
  baseDifficulty: 0.6,
  linkedQuests: ['quest_forest_guardian'],
  // ...
});
```

### Creating a Quest with Branching
```javascript
const branching quest = {
  id: 'quest_forest_choice',
  title: 'Path of the Forest',
  worldId: 'forest_realm',
  type: 'choice',
  branches: [
    { id: 'aggressive', title: 'Attack the guardian', description: '...' },
    { id: 'peaceful', title: 'Make peace', description: '...' },
  ],
  outcomes: [
    {
      id: 'outcome_aggressive',
      branchId: 'aggressive',
      title: 'Victory',
      flagsSet: ['quest_guardian_defeated', 'world_forest_chaotic'],
      modifiersApplied: { ai_aggression_boost: 0.3 },
      affectedSystems: ['combat', 'ai_behavior', 'world_state'],
      rewards: { xp: 500, gold: 200 },
    },
    // ... more outcomes
  ],
};

contentStore.addQuest(branching quest);
```

### Testing a Quest
```javascript
import { QuestSimulator } from './QuestSimulator.js';

const simulator = new QuestSimulator(quest, player);
const paths = simulator.getAvailablePaths();
const outcome = simulator.simulatePath('aggressive', 'outcome_aggressive');
```

### Validating Content
```javascript
const validation = contentStore.validate();
if (!validation.valid) {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

### Getting Impact Analysis
```javascript
import { DependencyGraph } from './DependencyGraph.js';

const graph = new DependencyGraph(worlds, quests);
const cascade = graph.traceFlagCascade('quest_guardian_defeated');
// See all quests unlocked by this flag and their effects
```

## Key Design Principles

### 1. **Data-Driven**
- All content is JSON data, not code
- Systems interpret data
- No gameplay values hardcoded

### 2. **No Flat Menus**
- Hierarchical navigation
- Contextual subsections
- Grouped by system purpose

### 3. **Mandatory Consequences**
- Every quest outcome must set flags OR apply modifiers
- Outcomes must affect at least 2 systems
- Story is optional, mechanics are not

### 4. **Editable Without Code**
- No recompilation needed
- Changes save to files immediately
- Validation prevents broken states

### 5. **Validation First**
- All content validated on every change
- Warnings guide designers
- Errors prevent inconsistent states

### 6. **Designer-Friendly**
- Intent tags explain purpose
- System tracking shows impact
- Simulation tools test changes safely

## File Persistence

Content is automatically persisted to JSON files:
- `rpg/dashboard/data/worlds.json` - All worlds
- `rpg/dashboard/data/quests.json` - All quests
- `rpg/dashboard/data/versions/v_*.json` - Version history

Versions are created with:
```javascript
const versionId = contentStore.createVersion('Checkpoint name', 'Description');
contentStore.restoreVersion(versionId); // Restore later
```

## Validation & Safety

### Automatic Checks
- Duplicate IDs
- Broken references
- Unreachable content
- Circular dependencies
- Missing prerequisites
- Unregistered flags/modifiers

### Warning Levels
- **Errors**: Content won't work correctly
- **Warnings**: Content works but may be unintended

### Dependency Analysis
```javascript
const graph = contentStore.validators.getDependencyGraph();
const unreachable = graph.findUnreachableQuests();
const cycles = graph.findCycles();
```

## Future Extensibility

The system is designed for growth:
- Add new modifier types
- Extend quest branch logic
- Add custom world states
- Implement raid/world bosses
- Add narrative/story mechanics
- Integrate content tiers and seasons

All without changing core architecture.

## Summary

This dashboard provides:
✅ Complete world editor
✅ Branching quest system
✅ Flag and modifier management
✅ AI behavior customization
✅ Simulation and testing tools
✅ Content validation
✅ Version control
✅ Export/import
✅ Designer-friendly navigation
✅ Mechanical consequence tracking

**Everything is editable, validated, and versioned through the dashboard.**
