# Potion Usage Enhancement - Quantity Options Update

## Overview
Added functionality to use multiple potions at once with quantity selection options (1x, 5x, 10x, 25x, 50x, 100x).

## Changes Made

### 1. **New Quantity Selection Interface** (`handleUsePotionQuantity`)
- When a player selects a potion, they now see quantity buttons instead of immediately using 1x
- Available quantities are dynamically determined based on inventory:
  - 1x, 5x, 10x, 25x, 50x, 100x (or less if player has fewer)
  - "Use All" option appears if available quantity doesn't match standard options
- Clean button-based UI with up to 5 buttons per row

### 2. **Updated Potion Selection Flow**
- **Before**: Select potion → Use immediately (1x)
- **After**: Select potion → Select quantity → Use

### 3. **Multi-Potion Usage Handler** (`handleUsePotionMultiple`)
- Handles using multiple potions of the same type
- Consolidated buff system:
  - **Health Potions**: Added heal stacks (total = heal × quantity)
  - **XP Potions**: Bonus percentage stacks + duration extends (e.g., 5x = +50% for 5 uses)
  - **Gold Potions**: Bonus percentage stacks + duration extends
  - **Gathering Potions**: Bonus value stays same, duration multiplies (e.g., 5x = +15% for 150 mins)
  - **Loot Potions**: Bonus percentage stacks + uses extend (e.g., 5x = +50% for 25 combats)

### 4. **Button Handler Addition**
- Added handler for `rpg-use-potion-qty-{potionId}-{quantity}` buttons
- Properly parses custom IDs with hyphenated potion IDs
- Validates potion availability before consumption

## Technical Details

### Custom ID Format
```
rpg-use-potion-qty-{potionId}-{quantity}
Example: rpg-use-potion-qty-health_potion_t3-10
```

### Buff Stacking Logic
- **Additive buffs** (Health, XP %, Gold %): Multiply by quantity
- **Duration buffs** (Gathering Time): Multiply duration by quantity
- **Usage-based buffs** (Loot uses): Multiply uses by quantity

## User Experience

### Before
```
💊 Use Potion
[Select potion] → Immediately use 1x
```

### After
```
💊 Use Potion
[Select potion] → 💊 Select Quantity
[Button: Use 1x] [Use 5x] [Use 10x] [Use 25x] [Use 50x] [Use 100x]
→ Apply effects and consume
```

## Example Scenarios

### Health Potion Usage
- Using 5x Tier 3 Health Potion (200 HP each)
- Result: 💚 +1000 HP at next combat start

### XP Potion Usage
- Using 10x Tier 2 XP Potion (+20% each)
- Result: ✨ +200% XP bonus for next 10 actions

### Loot Potion Usage
- Using 5x Tier 1 Loot Potion (+10% for 5 combats each)
- Result: 🎁 +50% rare loot chance for next 25 combats

## Testing
- No errors detected in code compilation
- All handlers properly integrated into button interaction flow
- Inventory decrement validated before use

## Files Modified
- `rpg/commands/RPGCommand.js`
  - Modified `handleUsePotionSelector()` - now calls quantity selector
  - Added `handleUsePotionQuantity()` - displays quantity options
  - Modified `rpg-use-potion-select` handler - calls quantity selector
  - Added `rpg-use-potion-qty-*` button handler - processes quantity selection
  - Added `handleUsePotionMultiple()` - applies consolidated buffs for multiple potions
