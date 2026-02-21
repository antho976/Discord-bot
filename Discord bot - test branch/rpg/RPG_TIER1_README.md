# RPG Bot - Tier 1 Implementation

## Overview

This is the **Tier 1 implementation** of a turn-based Discord RPG bot system. It includes core player progression, combat mechanics, and a main RPG hub command.

## Project Structure

```
rpg/
├── commands/
│   └── RPGCommand.js           # Main /rpg command and interaction handler
├── models/
│   ├── Player.js               # Player data model with stats and progression
│   └── Enemy.js                # Enemy model for combat encounters
├── systems/
│   ├── CombatSystem.js         # Turn-based combat logic
│   └── PlayerManager.js        # Player persistence and retrieval
├── ui/
│   └── UIBuilder.js            # Discord embed generators
└── RPGBot.js                   # Main RPG bot class
```

## Tier 1 Features

### 1. Player Model (`models/Player.js`)
- **Stats**: Strength, Defense, Agility, Intelligence, Vitality, Wisdom
- **Health & Mana**: HP and Mana pools with regeneration
- **Progression**: XP system with scaling level requirements
- **Stat Growth**: Automatic stat increases on level up
- **World Progression**: Track current world and unlocked worlds

### 2. Combat System (`systems/CombatSystem.js`)
- **Turn-Based Combat**: Player and enemy take turns attacking
- **Damage Calculation**: Damage is based on stats with ±15% variance
- **Defense Mitigation**: Defense stat reduces incoming damage
- **Combat State**: Tracks active combats with detailed logging
- **Victory/Defeat**: XP rewards for wins, HP reset for losses

### 3. Player Manager (`systems/PlayerManager.js`)
- **Player Storage**: In-memory player persistence (ready for database upgrade)
- **Get/Create Players**: Auto-create new players on first interaction
- **Leaderboard**: Top 10 players ranked by level and XP

### 4. UI System (`ui/UIBuilder.js`)
- **Main Menu Embed**: Shows player stats, level, and XP progress
- **Combat Embeds**: Displays combat state with health bars and battle log
- **Stats Embed**: Detailed player stats overview
- **Leaderboard Embed**: Rankings of top players

### 5. RPG Hub Command (`commands/RPGCommand.js`)
- **Main Command**: `/rpg` opens the main menu
- **Button Navigation**: Four main actions:
  - 🗺️ **Adventure**: Placeholder for future dungeons/quests
  - 📊 **Stats**: View detailed player statistics
  - ⚔️ **Training Combat**: Fight a training dummy
  - 🏆 **Leaderboard**: View top players

## How to Use

### Integration

Add this to your main bot file:

```javascript
const { rpgBot, registerRPGCommand, handleRPGInteraction } = require('./rpg-integration-example');

client.on('ready', () => {
  registerRPGCommand(client); // Register the /rpg slash command
});

client.on('interactionCreate', (interaction) => {
  handleRPGInteraction(interaction); // Handle all RPG interactions
});
```

### Player Commands

1. **Start the RPG**: `/rpg`
   - Opens main menu with player stats
   - Shows available actions

2. **View Stats**: Click "📊 Stats" button
   - See detailed progression and stat breakdown

3. **Start Combat**: Click "⚔️ Training Combat" button
   - Fight a training dummy
   - Click "⚔️ Attack" to deal damage
   - Click "Next Turn" to let enemy attack
   - Combat ends when either side reaches 0 HP

4. **Check Leaderboard**: Click "🏆 Leaderboard" button
   - See top 10 players ranked by level/XP

## Combat Mechanics

### Damage Calculation
```
Player Damage = (Strength * 1.5 + Agility * 0.1) * (1 ± 15% variance) - Enemy Defense * 0.3
Enemy Damage = (Strength * 1.5) * (1 ± 15% variance) - Player Defense * 0.3
```

### XP & Leveling
- Defeating enemies grants XP
- XP requirement scales: `100 * 1.1^level`
- Automatic stat growth on level up:
  - Strength/Defense/Intelligence: +2 per level
  - Agility/Wisdom: +1 per level
  - Vitality: +2 per level
  - Max HP: +20 per level
  - Max Mana: +10 per level

## Data Flow

```
Player clicks /rpg
    ↓
PlayerManager creates/retrieves Player object
    ↓
UIBuilder generates main menu embed
    ↓
Player clicks button (e.g., "Training Combat")
    ↓
CombatSystem starts combat with Enemy
    ↓
Combat loop: Player attacks → Enemy attacks → Repeat
    ↓
Combat ends → XP awarded → Player leveled up?
    ↓
Back to main menu
```

## Future Tiers (Not Yet Implemented)

### Tier 2: Progression
- Multiple worlds with level requirements
- Quests and dungeons
- Loot and items
- Item rarity tiers

### Tier 3: Depth
- Classes and subclasses with unique skills
- Skill effects (stun, heal, buffs, debuffs)
- Skill cooldowns and synergies
- Armor sets with set bonuses
- Crafting and professions

### Tier 4: Endgame
- Raids with multiple enemies
- World Bosses (1 per world)
- Admin dashboard for configuration
- Balance hooks and scaling systems

## Notes

- **In-Memory Storage**: Currently uses Map-based storage. Upgrade to database when ready.
- **No Database Required**: Works with discord.js only, perfect for testing.
- **Extensible Design**: Easy to add new skills, enemies, and mechanics.
- **Combat Logging**: Full battle log for each combat for transparency.

## Example: Starting the RPG

```
User: /rpg
Bot displays main menu with player stats
User clicks "⚔️ Training Combat"
Bot creates combat encounter
User clicks "⚔️ Attack"
Bot calculates damage and shows combat state
User clicks "Next Turn"
Bot executes enemy turn
Combat continues until one side wins/loses
User clicks "← Back"
Returns to main menu
```

---

**Status**: Tier 1 complete. Ready for Tier 2 implementation when needed.
