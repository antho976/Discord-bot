/**
 * Fix potions in player inventories - change type from 'equipment' to 'consumable'
 * Run this script once to fix potions that were incorrectly typed as equipment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAYERS_FILE = path.join(__dirname, 'data', 'players.json');

// List of all potion IDs that should be consumables
const POTION_IDS = [
  'health_potion', 'mana_potion',
  'health_potion_t1', 'health_potion_t2', 'health_potion_t3', 'health_potion_t4', 'health_potion_t5',
  'xp_potion_t1', 'xp_potion_t2', 'xp_potion_t3', 'xp_potion_t4', 'xp_potion_t5',
  'gold_potion_t1', 'gold_potion_t2', 'gold_potion_t3', 'gold_potion_t4', 'gold_potion_t5',
  'gathering_potion_t1', 'gathering_potion_t2', 'gathering_potion_t3', 'gathering_potion_t4', 'gathering_potion_t5',
  'loot_potion_t1', 'loot_potion_t2', 'loot_potion_t3', 'loot_potion_t4', 'loot_potion_t5',
];

function loadPlayers() {
  try {
    if (!fs.existsSync(PLAYERS_FILE)) {
      console.log('No players.json file found.');
      return [];
    }
    const data = fs.readFileSync(PLAYERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading players:', error);
    return [];
  }
}

function savePlayers(players) {
  try {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
    console.log('✅ Players saved successfully!');
  } catch (error) {
    console.error('Error saving players:', error);
  }
}

function fixPotions() {
  console.log('🧪 Fixing potion types in player inventories...\n');
  
  const players = loadPlayers();
  
  if (players.length === 0) {
    console.log('No players to fix.');
    return;
  }

  let fixedCount = 0;
  let totalPotionsFixed = 0;
  let totalPotionsRemoved = 0;

  for (const player of players) {
    let playerFixed = false;
    let potionsFixed = 0;
    let potionsRemoved = 0;

    // Fix potions in inventory
    if (player.inventory && Array.isArray(player.inventory)) {
      for (let i = player.inventory.length - 1; i >= 0; i--) {
        const item = player.inventory[i];
        
        // Check if item is a potion with wrong type
        if (item && typeof item === 'object' && POTION_IDS.includes(item.id)) {
          if (item.type !== 'consumable') {
            console.log(`  Found potion with wrong type: ${item.name} (type: ${item.type}) for ${player.username}`);
            item.type = 'consumable';
            // Remove slot if it was added
            delete item.slot;
            potionsFixed++;
            playerFixed = true;
          }
        }
      }
    }

    // Remove potions from equipped slots (potions should never be equipped)
    if (player.equippedItems) {
      const equippedSlots = Object.keys(player.equippedItems);
      for (const slot of equippedSlots) {
        const itemId = player.equippedItems[slot];
        if (POTION_IDS.includes(itemId)) {
          console.log(`  Removed equipped potion: ${itemId} from slot ${slot} for ${player.username}`);
          delete player.equippedItems[slot];
          potionsRemoved++;
          playerFixed = true;
        }
      }
    }

    if (playerFixed) {
      console.log(`✨ Fixed ${player.username}:`);
      if (potionsFixed > 0) console.log(`   - Corrected ${potionsFixed} potion types`);
      if (potionsRemoved > 0) console.log(`   - Removed ${potionsRemoved} equipped potions`);
      console.log('');
      fixedCount++;
      totalPotionsFixed += potionsFixed;
      totalPotionsRemoved += potionsRemoved;
    }
  }

  if (fixedCount > 0) {
    savePlayers(players);
    console.log(`\n✅ Fixed ${fixedCount} players!`);
    console.log(`📊 Total potions corrected: ${totalPotionsFixed}`);
    console.log(`📊 Total equipped potions removed: ${totalPotionsRemoved}`);
    console.log('\n💡 Players can now see and use their potions!');
  } else {
    console.log('✅ All players have correct potion types!');
  }
}

// Run the fix
fixPotions();
