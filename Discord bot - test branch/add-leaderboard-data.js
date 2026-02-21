import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const playersFile = path.join(__dirname, 'data', 'players.json');

// Read players
const playersData = JSON.parse(fs.readFileSync(playersFile, 'utf-8'));

// Add test data to first 5 characters created players for leaderboards
const charactersCreated = playersData.filter(p => p.characterCreated);
console.log(`Found ${charactersCreated.length} characters created`);

for (let i = 0; i < Math.min(5, charactersCreated.length); i++) {
  const player = playersData.find(p => p.userId === charactersCreated[i].userId);
  if (!player) continue;

  console.log(`\nUpdating ${player.username}...`);

  // Add arena stats
  player.arenaWins = Math.floor(Math.random() * 50) + 5;
  player.arenaLosses = Math.floor(Math.random() * 30) + 2;
  console.log(`  - Arena Wins: ${player.arenaWins}, Losses: ${player.arenaLosses}`);

  // Add boss essence to inventory
  const essenceIndex = player.inventory.findIndex(item => item.id === 'boss_essence');
  const essenceAmount = Math.floor(Math.random() * 100) + 10;
  if (essenceIndex >= 0) {
    player.inventory[essenceIndex].quantity = essenceAmount;
  } else {
    player.inventory.push({
      id: 'boss_essence',
      name: 'Boss Essence',
      type: 'material',
      quantity: essenceAmount
    });
  }
  console.log(`  - Boss Essence: ${essenceAmount}`);

  // Add equipped items with different rarities to show equipment power
  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const slots = ['head', 'chest', 'legs', 'feet', 'hands', 'accessory1', 'accessory2'];
  
  let equipmentCount = 0;
  for (let j = Math.floor(Math.random() * 3) + 2; j < slots.length && equipmentCount < 4; j++) {
    if (!player.equippedItems) player.equippedItems = {};
    
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];
    const itemId = `test_${slots[j]}_${rarity}`;
    player.equippedItems[slots[j]] = itemId;
    equipmentCount++;
  }
  console.log(`  - Equipped ${equipmentCount} items`);
}

// Save updated players
fs.writeFileSync(playersFile, JSON.stringify(playersData, null, 2));
console.log('\n✅ Leaderboard test data added successfully!');
