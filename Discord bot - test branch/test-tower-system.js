/**
 * Test script for Niflheim Tower system
 * Run with: node test-tower-system.js
 */

import TowerManager from './rpg/systems/TowerManager.js';

console.log('🧪 Testing Niflheim Tower System...\n');

// Create tower instance
const tower = new TowerManager();
console.log('✅ TowerManager instantiated\n');

// Create mock player at level 150+
const mockPlayer = {
  level: 150,
  id: 'test-player-123',
  username: 'TestWarrior',
  hp: 50000,
  maxHp: 50000,
  damage: 5000,
  defense: 2000,
  inventory: [],
  gold: 10000
};

console.log('📋 Mock Player Created:');
console.log(`  Level: ${mockPlayer.level}`);
console.log(`  HP: ${mockPlayer.hp}/${mockPlayer.maxHp}`);
console.log(`  Damage: ${mockPlayer.damage}`);
console.log(`  Defense: ${mockPlayer.defense}\n`);

// Test 1: Check entry requirements
console.log('TEST 1: Entry Requirements Check');
const canEnter = tower.canEnterTower(mockPlayer);
console.log(`  Can Enter: ${canEnter.allowed ? '✅ YES' : '❌ NO'}`);
if (!canEnter.allowed) {
  console.log(`  Reason: ${canEnter.reason}`);
}
console.log();

// Test 2: Initialize tower progress
console.log('TEST 2: Initialize Tower Progress');
tower.initializeTowerProgress(mockPlayer);
console.log(`  Current Floor: ${mockPlayer.towerProgress.currentFloor}`);
console.log(`  Highest Floor: ${mockPlayer.towerProgress.highestFloor}`);
console.log(`  Total Clears: ${mockPlayer.towerProgress.totalClears}`);
console.log(`  Total Attempts: ${mockPlayer.towerProgress.totalAttempts}`);
console.log();

// Test 3: Generate enemies for various floors
console.log('TEST 3: Enemy Generation');
const floors = [1, 5, 25, 50, 75, 100];
for (const floor of floors) {
  const isBoss = tower.isBossFloor(floor);
  const enemy = tower.generateEnemy(floor, isBoss);
  console.log(`  Floor ${floor} ${isBoss ? '(BOSS)' : '      '}:`);
  console.log(`    ${enemy.emoji} ${enemy.name}`);
  console.log(`    HP: ${enemy.hp.toLocaleString()}, Damage: ${enemy.damage.toLocaleString()}, Defense: ${enemy.defense.toLocaleString()}`);
}
console.log();

// Test 4: Generate rewards for various floors
console.log('TEST 4: Reward Generation');
const rewardFloors = [1, 10, 25, 50, 100];
for (const floor of rewardFloors) {
  const isBoss = tower.isBossFloor(floor);
  const rewards = tower.generateFloorRewards(floor, isBoss);
  console.log(`  Floor ${floor}:`);
  console.log(`    Gold: ${rewards.gold.toLocaleString()}`);
  console.log(`    Essence: ${rewards.guildEssence.toLocaleString()}`);
  console.log(`    Materials: ${rewards.materials.length} types`);
  console.log(`    Lootboxes: ${rewards.lootboxes.length}`);
  console.log(`    Enchants: ${rewards.enchants.length}`);
  console.log(`    Potions: ${rewards.potions.length}`);
}
console.log();

// Test 5: Complete a floor
console.log('TEST 5: Complete Floor 1');
const mockCombatResult = {
  victory: true,
  damageDealt: 15000,
  damageTaken: 5000,
  turns: 3
};
const completion = tower.completeFloor(mockPlayer, 1, mockCombatResult);
console.log(`  Completed: ${completion.success ? '✅ YES' : '❌ NO'}`);
console.log(`  Next Floor: ${completion.nextFloor}`);
console.log(`  Tower Completed: ${completion.completedTower ? '🎉 YES' : 'No'}`);
console.log(`  Gold Reward: ${completion.rewards.gold.toLocaleString()}`);
console.log(`  Current Floor Now: ${mockPlayer.towerProgress.currentFloor}`);
console.log(`  Highest Floor: ${mockPlayer.towerProgress.highestFloor}`);
console.log();

// Test 6: Get tower status
console.log('TEST 6: Tower Status');
const status = tower.getTowerStatus(mockPlayer);
console.log(`  Current Floor: ${status.currentFloor}/${tower.TOTAL_FLOORS}`);
console.log(`  Highest Floor: ${status.highestFloor}/${tower.TOTAL_FLOORS}`);
console.log(`  Progress: ${status.percentComplete}%`);
console.log(`  Next is Boss: ${status.nextIsBoss ? 'YES' : 'NO'}`);
console.log(`  Lifetime Gold: ${status.lifetimeRewards.gold.toLocaleString()}`);
console.log(`  Lifetime Essence: ${status.lifetimeRewards.essence.toLocaleString()}`);
console.log();

// Test 7: Handle defeat
console.log('TEST 7: Handle Defeat');
const beforeAttempts = mockPlayer.towerProgress.totalAttempts;
tower.handleDefeat(mockPlayer, 5);
console.log(`  Attempts Before: ${beforeAttempts}`);
console.log(`  Attempts After: ${mockPlayer.towerProgress.totalAttempts}`);
console.log(`  Current Floor Unchanged: ${mockPlayer.towerProgress.currentFloor === 2 ? '✅ YES' : '❌ NO'}`);
console.log();

// Test 8: Reset progress
console.log('TEST 8: Reset Progress');
tower.resetProgress(mockPlayer);
console.log(`  Current Floor: ${mockPlayer.towerProgress.currentFloor}`);
console.log(`  Highest Floor Preserved: ${mockPlayer.towerProgress.highestFloor}`);
console.log(`  Lifetime Rewards Preserved: ${mockPlayer.towerProgress.lifetimeRewards.gold > 0 ? '✅ YES' : '❌ NO'}`);
console.log();

// Test 9: Scaling verification
console.log('TEST 9: Scaling Verification');
const floor1Enemy = tower.generateEnemy(1, false);
const floor50Enemy = tower.generateEnemy(50, false);
const floor100Enemy = tower.generateEnemy(100, false);
console.log('  Regular Enemy Scaling:');
console.log(`    Floor 1:   HP ${floor1Enemy.hp.toLocaleString()}, DMG ${floor1Enemy.damage.toLocaleString()}`);
console.log(`    Floor 50:  HP ${floor50Enemy.hp.toLocaleString()}, DMG ${floor50Enemy.damage.toLocaleString()} (${(floor50Enemy.hp / floor1Enemy.hp).toFixed(1)}x)`);
console.log(`    Floor 100: HP ${floor100Enemy.hp.toLocaleString()}, DMG ${floor100Enemy.damage.toLocaleString()} (${(floor100Enemy.hp / floor1Enemy.hp).toFixed(1)}x)`);

const floor5Boss = tower.generateEnemy(5, true);
const floor100Boss = tower.generateEnemy(100, true);
console.log('\n  Boss Enemy Scaling:');
console.log(`    Floor 5:   HP ${floor5Boss.hp.toLocaleString()}, DMG ${floor5Boss.damage.toLocaleString()}`);
console.log(`    Floor 100: HP ${floor100Boss.hp.toLocaleString()}, DMG ${floor100Boss.damage.toLocaleString()} (${(floor100Boss.hp / floor5Boss.hp).toFixed(1)}x)`);
console.log();

// Test 10: Boss floor detection
console.log('TEST 10: Boss Floor Detection');
const bossFloors = [5, 10, 15, 20, 25, 50, 75, 100];
console.log('  Boss Floors:');
for (const floor of bossFloors) {
  const isBoss = tower.isBossFloor(floor);
  console.log(`    Floor ${floor}: ${isBoss ? '✅ BOSS' : '❌ Not Boss'}`);
}
console.log();

console.log('✅ All Tests Complete!\n');
console.log('═══════════════════════════════════════');
console.log('📊 TOWER SYSTEM SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`Total Floors: ${tower.TOTAL_FLOORS}`);
console.log(`Boss Interval: Every ${tower.BOSS_INTERVAL} floors`);
console.log(`Min Level: ${tower.MIN_LEVEL_REQUIREMENT}`);
console.log(`Boss Count: ${Math.floor(tower.TOTAL_FLOORS / tower.BOSS_INTERVAL)}`);
console.log(`Regular Floors: ${tower.TOTAL_FLOORS - Math.floor(tower.TOTAL_FLOORS / tower.BOSS_INTERVAL)}`);
console.log('═══════════════════════════════════════\n');
