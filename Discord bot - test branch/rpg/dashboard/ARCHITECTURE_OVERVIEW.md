# RPG Dashboard System - Visual Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RPG DASHBOARD & WORLD EDITOR                         │
│                     (Complete Data-Driven Admin)                         │
└─────────────────────────────────────────────────────────────────────────┘

                            Discord Bot
                                 ↓
                    /dashboard slash command
                                 ↓
                         DashboardCommand.js
                                 ↓
        ┌───────────────────────────────────────────────────────┐
        │              Navigation Structure                      │
        │     (MAIN SIDEBAR → SUB-SIDEBAR HIERARCHY)           │
        └───────────────────────────────────────────────────────┘
                                 ↓
         ┌──────────────┬──────────────┬──────────────┬──────────────┐
         ↓              ↓              ↓              ↓              ↓
    Worlds          Quests        Entities       Systems         AI/Combat
    ├─Overview     ├─List         ├─Players     ├─Stats         ├─Profiles
    ├─Settings     ├─Logic        ├─NPCs        ├─Classes       ├─Skills
    ├─States       ├─Outcomes     ├─Enemies     ├─Formulas      ├─Overrides
    ├─Quests       ├─Branches     └─Vendors     └─Progression   └─Balance
    ├─Enemies      └─Story
    ├─Vendors
    └─Progress           ↓              ↓              ↓              ↓
                    Flags/Mods      Simulation        Admin          ...
                    ├─Registry      ├─Combat          ├─Validate
                    ├─Groups        ├─Quests          ├─Dependency
                    └─Pipeline      ├─Worlds          ├─Export
                                    └─Flags           └─Version
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GAME RUNTIME                               │
└─────────────────────────────────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────────────┐
        │           ContentStore                     │
        │      (Central Content Hub)                │
        ├────────────────────────────────────────────┤
        │  • Load/Save all content                  │
        │  • Version management                     │
        │  • Automatic validation                   │
        │  • File persistence                       │
        └────────────────────────────────────────────┘
        ↗          ↑          ↑          ↓          ↖
       /           │          │          │           \
      /            │          │          │            \
┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────┐ ┌────────────┐
│  Worlds  │ │ Quests  │ │  Flags   │ │Mods  │ │   AI       │
│          │ │         │ │          │ │      │ │  Profiles  │
│ Schema ──┼─┤ Schema ─┼─│ Registry │ │Sys   │ │            │
│ Loader ──┼─┤ Loader ─┼─│          │ │tem   │ │ Behaviors  │
│ Validate ┼─┤ Validate│ │ Validate │ │Val   │ │ Editor     │
└──────────┘ └─────────┘ └──────────┘ │idate │ └────────────┘
      ↓           ↓           ↓        │      │        ↓
      └───────────┴───────────┴────────┴──────┴────────┘
                             ↓
              ┌──────────────────────────────┐
              │      Validator               │
              │  DependencyGraph             │
              │  • Check references          │
              │  • Detect cycles             │
              │  • Find unreachable          │
              │  • Trace cascades            │
              └──────────────────────────────┘
                             ↓
              ┌──────────────────────────────┐
              │   Game Systems               │
              │  (Consume validated data)    │
              │  • Combat                    │
              │  • Progression               │
              │  • Quests                    │
              │  • NPC Behavior              │
              │  • Economies                 │
              └──────────────────────────────┘
```

## Content Schema Hierarchy

```
WORLD
  ├── ID, Name, Tier, Theme
  ├── Difficulty & Scaling
  ├── World State Rules
  │   ├── Daily state generation
  │   └── Custom state options
  ├── Base Modifiers
  │   ├── AI modifiers
  │   └── Environmental modifiers
  ├── Linked Content
  │   ├── Quests
  │   ├── Enemies
  │   ├── Vendors
  │   └── NPCs
  ├── Progression
  │   ├── Required flags
  │   ├── Level requirements
  │   └── Next world unlock
  └── Design Metadata
      ├── Intent tags
      └── Internal notes

QUEST
  ├── ID, Title, Type (combat/choice/gathering/boss)
  ├── World Association
  ├── Visibility Conditions
  │   ├── Required flags
  │   ├── Forbidden flags
  │   └── Level requirements
  ├── Start Conditions
  ├── Completion Conditions
  ├── Failure Conditions
  ├── Pressure States (escalation)
  ├── Branches (for choices)
  │   ├── Branch ID & Title
  │   ├── Conditions
  │   └── Mechanical impact
  └── Outcomes (MANDATORY)
      ├── ID & Title
      ├── Branch Association
      ├── Rewards (XP, Gold, Items)
      ├── Flags Set (required)
      ├── Modifiers Applied (required)
      │   └── With duration
      ├── Affected Systems (required, 2+)
      └── Story (optional)
```

## System Dependencies

```
QUEST COMPLETION
    ↓ Sets Flag
FLAGS (Centralized)
    ├─ Visibility condition for other quests
    ├─ Triggers NPC behavior
    ├─ Unlocks vendors
    └─ Progression requirement
    
QUEST COMPLETION
    ↓ Applies Modifier
MODIFIERS (Centralized)
    ├─ Combat system
    ├─ Loot system
    ├─ AI behavior
    ├─ Progression
    └─ Player stats
    
WORLD STATE
    ↓ Applies daily modifiers
MODIFIERS
    ├─ Enemy difficulty
    ├─ Loot quality
    ├─ AI aggression
    └─ Special mechanics
    
AI PROFILE
    ├─ Skill priorities
    ├─ Risk tolerance
    ├─ Threat reactions
    └─ Combat decisions
```

## Simulation & Testing Pipeline

```
TEST SCENARIO
     ↓
  ┌──────────────────┐
  │  FLAG TESTER     │ → Test flag combinations
  │                  │   Check quest access
  └──────────────────┘
     ↓
  ┌──────────────────┐
  │ QUEST SIMULATOR  │ → Preview quest paths
  │                  │   Analyze outcomes
  │                  │   Check consequences
  └──────────────────┘
     ↓
  ┌──────────────────┐
  │ COMBAT SIMULATOR │ → Test combat balance
  │                  │   Evaluate AI decisions
  │                  │   Predict outcomes
  └──────────────────┘
     ↓
  ┌──────────────────┐
  │WORLD SIMULATOR   │ → Preview daily states
  │                  │   Check distribution
  │                  │   Analyze modifiers
  └──────────────────┘
     ↓
  ┌──────────────────┐
  │   VALIDATOR      │ → Check dependencies
  │   DEPENDENCY     │   Detect issues
  │   GRAPH          │   Find cascades
  └──────────────────┘
     ↓
  REPORT & ADJUSTMENTS
```

## File Organization

```
rpg/dashboard/
│
├── Core Schema Files
│   ├── WorldSchema.js          (World definitions)
│   ├── QuestSchema.js          (Quest definitions)
│   ├── FlagRegistry.js         (Global flags)
│   └── ModifierSystem.js       (Global modifiers)
│
├── Behavior & AI
│   └── AIBehaviorSystem.js     (AI profiles)
│
├── Persistence & Storage
│   ├── ContentStore.js         (Load/Save/Manage)
│   └── ContentTools.js         (Export/Import/Version)
│
├── Simulation & Testing
│   ├── CombatSimulator.js      (Combat testing)
│   ├── QuestSimulator.js       (Quest testing)
│   ├── WorldStateSimulator.js  (State preview)
│   └── FlagTester.js           (Flag testing)
│
├── Validation & Analysis
│   ├── Validator.js            (Content validation)
│   └── DependencyGraph.js      (Relationship mapping)
│
├── Interface & Integration
│   ├── DashboardCommand.js     (Discord command)
│   └── DashboardNavigator.js   (Navigation structure)
│
├── Data Storage
│   └── data/
│       ├── worlds.json         (Auto-created)
│       ├── quests.json         (Auto-created)
│       ├── versions/           (Version snapshots)
│       └── exports/            (Exported files)
│
└── Documentation
    ├── DASHBOARD_README.md           (Full guide)
    ├── IMPLEMENTATION_COMPLETE.md    (Status)
    ├── QUICK_START.md                (Developer guide)
    ├── INTEGRATION_CHECKLIST.md      (Integration steps)
    └── COMPLETION_SUMMARY.md         (Summary)
```

## Integration Points

```
DISCORD BOT (index.js)
    ├─ Load ContentStore
    ├─ Register /dashboard command
    └─ Pass to event handlers
         ↓
    GAME SYSTEMS
    ├─ Load worlds from contentStore
    ├─ Load quests from contentStore
    ├─ Apply flags/modifiers from registry
    ├─ Use AI profiles for behavior
    └─ Generate world states daily
         ↓
    RUNTIME
    ├─ Quest triggers set flags
    ├─ Flag visibility checks
    ├─ Modifier application
    ├─ AI decision making
    └─ World state effects
```

## Validation & Safety

```
EDIT CONTENT
     ↓
  ContentStore
     ├─ Save to file
     └─ Mark for validation
     ↓
  VALIDATOR
     ├─ Check IDs (duplicates)
     ├─ Check references
     ├─ Check registrations
     ├─ Check progression
     └─ Check consequences
     ↓
  DEPENDENCY GRAPH
     ├─ Detect cycles
     ├─ Find unreachable
     ├─ Trace cascades
     └─ Analyze impacts
     ↓
  RESULT
     ├─ Valid: Changes applied ✅
     └─ Invalid: Errors prevent save ❌
```

## Quest Outcome Mandate

```
QUEST OUTCOME MUST HAVE:

     ┌─────────────────────┐
     │   Outcome Effect    │
     └─────────────────────┘
              ↓
     ┌─────────────────────┐
     │  FLAGS SET (1+)     │ OR  │  MODIFIERS APPLIED (1+)  │
     └─────────────────────┘     └──────────────────────────┘
              ↓
     ┌─────────────────────────────────────────────────────┐
     │   AFFECTS 2+ SYSTEMS (Mandatory)                    │
     │   • Combat, Progression, Vendor, NPC, Economy, etc. │
     └─────────────────────────────────────────────────────┘
```

## Information Flow Example

```
SCENARIO: Player completes "Defeat the Dragon" quest

    ↓

ContentStore.getQuest('quest_dragon')
    ├─ Get quest definition
    └─ Get outcome

    ↓

APPLY OUTCOME:
    │
    ├─ Set Flags
    │   ├─ 'boss_dragon_defeated'
    │   ├─ 'world_2_unlocked'
    │   └─ 'vendor_dragon_smith_available'
    │
    ├─ Apply Modifiers
    │   ├─ 'xp_gain_boost': 1.5 (7 days)
    │   └─ 'enemy_damage_reduction': 0.9
    │
    └─ Notify Systems
        ├─ Combat system (modifiers)
        ├─ Progression system (new world)
        ├─ Vendor system (unlock smith)
        ├─ NPC system (dialogue changes)
        └─ World state (modify daily generation)

    ↓

VALIDATION CHECK
    ├─ Flags exist in registry ✅
    ├─ Modifiers exist in registry ✅
    ├─ Outcome affects 2+ systems ✅
    └─ No broken references ✅

    ↓

PERSISTENCE
    ├─ Save to worlds.json
    ├─ Save to quests.json
    └─ Version snapshot available

    ↓

GAME IMPACT (Immediate)
    ├─ Player unlocks world 2
    ├─ XP gains boosted for 7 days
    ├─ Vendors available
    └─ NPC behavior changes
```

## Benefits Summary

```
FOR DESIGNERS:
  ✅ No code changes needed
  ✅ Test before deployment
  ✅ Safe rollback available
  ✅ Intent tracking
  ✅ Dependency analysis
  ✅ Impact prediction

FOR DEVELOPERS:
  ✅ Clean architecture
  ✅ Centralized validation
  ✅ Easy integration
  ✅ Comprehensive tooling
  ✅ Well documented
  ✅ Extensible design

FOR PLAYERS:
  ✅ Rich world interaction
  ✅ Meaningful choices
  ✅ Complex quest chains
  ✅ Dynamic world states
  ✅ Emergent consequences
```

---

**This architecture ensures the dashboard is truly the source of truth for all RPG content.**
