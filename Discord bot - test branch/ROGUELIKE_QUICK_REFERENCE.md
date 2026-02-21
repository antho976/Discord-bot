# Roguelike Expansion - Quick Reference Card

## 🚀 Quick Start Integration

### Import in RPGCommand.js
```javascript
const RoguelikeManager = require('./rpg/systems/RoguelikeManager.js');
const roguelike = new RoguelikeManager();
```

### Start New Run
```javascript
const roguelikeState = roguelike.initializeRun(player);
roguelikeState.startedAt = Date.now();
player.roguelikeState = roguelikeState;
```

### Generate Floor
```javascript
const rooms = roguelike.generateFloorRooms(roguelikeState, currentFloor);
// rooms[0-3] contain: type, description, modifier, event, miniBoss, skill, reward, etc.
```

### Complete Room
```javascript
roguelike.completeRoom(roguelikeState, selectedRoom, {
  bossDefeated: true/false,
  eventSuccess: true/false,
  // ... other action results
});
```

### Get Run Summary
```javascript
const summary = roguelike.getRunSummary(roguelikeState, 'death');
// summary.achievements, summary.rewards, summary.floor, summary.duration, etc.
```

---

## 📊 Feature Matrix

| Feature | Chance | Duration | Method |
|---------|--------|----------|--------|
| **Room Modifier** | 40% | Floor | `generateRoomModifier()` |
| **Room Event** | 30% | Single Room | `generateRoomEvent()` |
| **Mini-Boss** | 100% (boss rooms) | 1 Battle | `generateMiniBoss()` |
| **Buff** | Manual | 3-4 rooms | `applyBuff()` |
| **Debuff** | Manual | 3-4 rooms | `applyDebuff()` |
| **Floor Challenge** | 25% | Entire Floor | `generateFloorChallenge()` |
| **Consumable** | 1-per-use | Single Use | `useConsumable()` |
| **Achievement** | Variable | Run End | `validateAchievements()` |

---

## 🎯 Boss Room Types

```javascript
// These rooms HAVE mini-bosses:
✓ skill      // 50% of first slot
✓ treasure   // 30% chance
✓ trap       // 40% chance
✓ armory     // 35% chance

// These rooms DO NOT have bosses:
✗ healing
✗ rest
✗ shop
✗ libraryRoom (unlockable)
✗ alchemyRoom (unlockable)
```

---

## 💾 Room Object Structure

```javascript
{
  id: "abc123def456",              // Unique room ID
  type: "skill",                    // Room type string
  description: "Learn a skill",     // Display text
  modifier: {
    type: "blessed",                // OR null
    name: "Blessed Room",
    multiplier: 1.5                 // Reward multiplier
  },
  event: {
    type: "riddle",                 // OR null
    difficulty: 12,
    checkType: "intelligence"
  },
  miniBoss: {
    name: "Void Watcher",            // OR null
    health: 125,
    damage: 18,
    ability: {...}
  },
  // Type-specific properties:
  skill: {...},                     // For 'skill' rooms
  reward: {...},                    // For 'treasure', 'library', 'armory' rooms
  items: [...],                     // For 'shop' rooms
  healAmount: 45,                   // For 'healing' rooms
  // ... etc for other types
}
```

---

## 🛡️ Buff/Debuff Quick Ref

| Buff | Effect | Duration |
|------|--------|----------|
| `strengthBoost` | +10% STR | 3 rooms |
| `defenseBoost` | +15% DEF | 3 rooms |
| `speedBoost` | +20% SPD | 3 rooms |
| `damageBoost` | +25% DMG | 3 rooms |
| `regeneration` | +10 HP/room | 3 rooms |
| `fortunate` | +20% rewards | 3 rooms |
| `cursed` | -15% rewards | 4 rooms |
| `weakened` | -25% damage | 4 rooms |
| `poisoned` | -5 HP/room | 3 rooms |

---

## 🧪 Consumable Effects

| Item | Effect | Cost | Limit |
|------|--------|------|-------|
| `healthPotion` | +50 HP | Free | 1-per-run |
| `manaPotion` | +30 Mana | Free | 1-per-run |
| `antidote` | Remove poison | Free | 1-per-use |
| `cleanse` | Remove all debuffs | Free | 1-per-use |
| `revive` | Prevent death once | Free | 1-per-run |

---

## 🏆 Achievement Requirements

```javascript
'tenBosses'         → miniBossesDefeated >= 10
'noDamage'          → damageTokenTaken === 0
'speedrun'          → (now - startedAt) < 600000ms
'allRoomTypes'      → visitedRoomTypes.size >= 8
'noConsumables'     → consumablesUsed === 0
'maxFloor'          → currentFloor >= 26
'collectThemAll'    → 5 different consumable types collected
'masterUpgrades'    → shopUpgradesPurchased >= 5
```

---

## 🎲 Room Modifiers

| Modifier | Effect | Chance |
|----------|--------|--------|
| `blessed` | +50% rewards | 40% total chance across all modifiers |
| `cursed` | -50% rewards | (6.67% each modifier) |
| `flooded` | +25% enemy DMG | |
| `frozen` | -30% enemy SPD | |
| `inferno` | +25% fire dmg | |
| `thunderstorm` | +25% lightning dmg | |

---

## 🎪 Floor Challenges

| Challenge | Effect | Duration |
|-----------|--------|----------|
| `noHealing` | Disable health restore | Entire floor |
| `doubleEnemies` | 2x enemy count | Entire floor |
| `damageReduction` | -50% damage dealt | Entire floor |
| `timeLimit` | 10 min timer | Entire floor |
| `weakWeapons` | -25% equipment power | Entire floor |

---

## 📈 State Properties Reference

### Tracking Counters
```javascript
miniBossesDefeated: 0              // Increment when boss defeated
damageTokenTaken: 0                // Add damage amount when HP loss occurs
consumablesUsed: 0                 // Increment on useConsumable()
shopUpgradesPurchased: 0           // Increment on shop purchase
```

### Active Effects
```javascript
activeBuffs: [{                    // Add via applyBuff()
  type: 'strengthBoost',
  name: '+10% Strength',
  durationLeft: 2                 // Decrements each room
}],
activeDebuffs: [{                 // Add via applyDebuff()
  type: 'poisoned',
  name: 'Poisoned',
  durationLeft: 3
}],
```

### Achievement & Challenge Tracking
```javascript
visitedRoomTypes: new Set(),       // Add room.type after completion
floorChallenge: null,              // Set to object from generateFloorChallenge()
achievementsEarned: []             // Populated by validateAchievements()
```

---

## ⚡ Essential Method Calls Order

```javascript
// 1. Initialize run
const state = roguelike.initializeRun(player);
state.startedAt = Date.now();

// 2. Generate floor
const rooms = roguelike.generateFloorRooms(state, floor);

// 3. Player selects room
// (UI/command handler evaluates room and player action)

// 4. Complete room with results
roguelike.completeRoom(state, selectedRoom, actionResults);

// 5. Buff durations tick (ALREADY in completeRoom)
// roguelike.advanceBuffDurations(state); // Called automatically

// 6. Advance to next floor
roguelike.advanceFloor(state);

// 7. At run end, get summary
const summary = roguelike.getRunSummary(state, 'death');

// 8. Validate achievements
const earned = roguelike.validateAchievements(state);

// 9. Generate leaderboard entry (if saving)
const entry = roguelike.generateLeaderboardEntry(state, userId, userName);

// 10. Clear run
player.roguelikeState = null;
```

---

## 🔧 Utility Methods

```javascript
// Get all active effect multipliers
const effects = roguelike.getActiveEffects(roguelikeState);
// → { damageMultiplier, rewardMultiplier, healingMultiplier, ... }

// Check single achievement
const earned = roguelike.checkAchievement(state, 'tenBosses');
// → true/false

// Format for display
const line = roguelike.formatLeaderboardEntry(entry, 1);
// → "🥇 **PlayerName** - Floor 25 (8 bosses, 15m)"

// Duration calculation
const seconds = roguelike.calculateRunDuration(state);
// → 1234 (seconds)

// Get leaderboard sorted
const top10 = roguelike.getLeaderboard(allEntries, 'floor', 10);
// → array of entries sorted by highest floor
```

---

## 🐛 Debug Commands

```javascript
// Verify systems loaded
Object.keys(roguelike).forEach(key => {
  if (key.startsWith('ROOM_') || key === 'BUFFS' || key === 'ACHIEVEMENTS') {
    console.log(`✓ ${key}: ${Object.keys(roguelike[key]).length} items`);
  }
});

// Check state integrity
const state = roguelike.initializeRun({});
console.log('Properties:', Object.keys(state).length);
console.log('New properties:', [
  'miniBossesDefeated', 'damageTokenTaken', 'consumablesUsed',
  'shopUpgradesPurchased', 'visitedRoomTypes', 'activeBuffs',
  'activeDebuffs', 'floorChallenge', 'achievementsEarned'
].filter(p => p in state));

// Simulate full run
const room = roguelike.generateRoom('skill', 5, state);
console.log('Room has:', {
  boss: !!room.miniBoss,
  event: !!room.event,
  modifier: !!room.modifier,
  newProps: ['modifier', 'event', 'miniBoss'].every(p => p in room)
});
```

---

## 📋 Common Integration Patterns

### Pattern 1: Display Room with All Features
```javascript
const roomEmbed = new EmbedBuilder()
  .setTitle(`Room: ${room.type.toUpperCase()}`)
  .setDescription(room.description);

if (room.miniBoss) {
  roomEmbed.addField('⚔️ Boss', `${room.miniBoss.name} (${room.miniBoss.health}HP)`);
}
if (room.modifier) {
  roomEmbed.addField('🔮 Modifier', `${room.modifier.name}`);
}
if (room.event) {
  roomEmbed.addField('📜 Event', `${room.event.type} (DC ${room.event.difficulty})`);
}

return roomEmbed;
```

### Pattern 2: Apply Room Rewards with Modifiers
```javascript
let rewards = room.reward.currencyA || 0;
if (room.modifier && room.modifier.multiplier) {
  rewards *= room.modifier.multiplier;
}
const effects = roguelike.getActiveEffects(roguelikeState);
rewards *= effects.rewardMultiplier;
roguelikeState.currencyAEarned += rewards;
```

### Pattern 3: Show Active Effects
```javascript
const effects = roguelike.getActiveEffects(roguelikeState);
const buffText = roguelikeState.activeBuffs
  .map(b => `${b.name} (${b.durationLeft} rooms)`)
  .join('\n');
const debuffText = roguelikeState.activeDebuffs
  .map(d => `${d.name} (${d.durationLeft} rooms)`)
  .join('\n');

embed.addField('💚 Active Buffs', buffText || 'None');
embed.addField('💔 Active Debuffs', debuffText || 'None');
```

---

## 🚨 Common Mistakes to Avoid

❌ **Wrong**: Forgetting to call `advanceBuffDurations()` each room
✅ **Right**: It's already called in `completeRoom()` - verify it's called

❌ **Wrong**: Creating room modifiers inside a loop (performance)
✅ **Right**: Generate once per room, reuse in completions

❌ **Wrong**: Forgetting `startedAt = Date.now()` initialization
✅ **Right**: Set this immediately after `initializeRun()`

❌ **Wrong**: Not tracking room type in `visitedRoomTypes`
✅ **Right**: Done automatically in `completeRoom()` - already implemented

❌ **Wrong**: Calling `validateAchievements()` multiple times per run
✅ **Right**: Call once at run end in `getRunSummary()`

---

## 📞 API Summary Table

| Method | When to Call | Returns | Mutates State |
|--------|--------------|---------|---------------|
| `initializeRun()` | Start of run | New state object | No |
| `generateFloorRooms()` | Floor generation | Array of rooms | No |
| `generateRoom()` | (Internal) | Room object | No |
| `generateMiniBoss()` | (Internal) | Boss or null | No |
| `generateRoomModifier()` | (Internal) | Modifier or null | No |
| `generateRoomEvent()` | (Internal) | Event or null | No |
| `completeRoom()` | After room action | Updated state | Yes |
| `advanceBuffDurations()` | (Called by completeRoom) | void | Yes |
| `applyBuff()` | On buff gain | boolean | Yes |
| `applyDebuff()` | On debuff gain | boolean | Yes |
| `useConsumable()` | When item used | Effect or null | Yes |
| `getActiveEffects()` | Before applying rewards | Effects object | No |
| `validateAchievements()` | Run completion | Array of earned IDs | Yes |
| `getRunSummary()` | Run end | Summary object | No |
| `generateLeaderboardEntry()` | Run end | Entry object | No |
| `getLeaderboard()` | Display request | Sorted array | No |
| `formatLeaderboardEntry()` | Display formatting | String | No |

---

**Last Updated**: Implementation Complete  
**Status**: Ready for Integration  
**Next**: Implement command handlers in RPGCommand.js
