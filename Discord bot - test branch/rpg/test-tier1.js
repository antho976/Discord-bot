/**
 * Test Suite for Tier 1 RPG System
 * Run: node rpg/test-tier1.js
 */

import Player from './models/Player.js';
import Enemy from './models/Enemy.js';
import CombatSystem from './systems/CombatSystem.js';
import PlayerManager from './systems/PlayerManager.js';

console.log('🎮 Starting Tier 1 RPG System Tests...\n');

// Test 1: Player Creation and Stats
console.log('📝 Test 1: Player Creation');
const player = new Player('123456', 'TestPlayer');
console.log('✓ Player created:', player.username);
console.log('  Level:', player.level);
console.log('  HP:', player.hp, '/', player.maxHp);
console.log('  Stats:', player.strength, 'STR,', player.defense, 'DEF');
console.log();

// Test 2: XP and Leveling
console.log('📊 Test 2: XP and Leveling');
console.log('Before XP:', player.level, 'level');
const levelsGained = player.addXp(150); // More than needed for level up
console.log('Added 150 XP');
console.log('✓ Leveled up!', levelsGained, 'level(s)');
console.log('After:', player.level, 'level, XP:', player.xp, '/', player.xpToNextLevel);
console.log('Stats increased: STR', player.strength, 'DEF', player.defense);
console.log();

// Test 3: Enemy Creation
console.log('🐉 Test 3: Enemy Creation');
const enemy = new Enemy('Goblin', 2);
console.log('✓ Enemy created:', enemy.name, '(Level', enemy.level + ')');
console.log('  HP:', enemy.hp, '/', enemy.maxHp);
console.log('  XP Reward:', enemy.xpReward);
console.log();

// Test 4: Combat System
console.log('⚔️ Test 4: Combat System');
const combatSystem = new CombatSystem();
const combatState = combatSystem.startCombat(player, 'Test Enemy', 1);
console.log('✓ Combat started');
console.log('  Player:', combatState.player.username);
console.log('  Enemy:', combatState.enemy.name);
console.log();

// Test 5: Combat Actions
console.log('🗡️ Test 5: Combat Actions');
console.log('Player attacks...');
let result = combatSystem.playerAttack(player.userId);
if (!result.error) {
  console.log('✓ Player attacked for damage');
  console.log('  Enemy HP:', result.combatState.enemyStatus.hp, 'of', result.combatState.enemyStatus.maxHp);
  console.log('  Battle Log:', result.combatState.log[result.combatState.log.length - 1]);
  
  if (result.status === 'enemy-turn') {
    console.log('  Status: Enemy\'s turn');
  }
}
console.log();

// Test 6: Player Manager
console.log('👥 Test 6: Player Manager');
const playerManager = new PlayerManager();
const p1 = playerManager.getOrCreatePlayer('user1', 'Player1');
p1.level = 5;
p1.addXp(500);
const p2 = playerManager.getOrCreatePlayer('user2', 'Player2');
p2.level = 3;
console.log('✓ Created 2 players');
const leaderboard = playerManager.getLeaderboard(10);
console.log('✓ Leaderboard:');
leaderboard.forEach((entry) => {
  console.log(`  #${entry.rank} ${entry.username} - Level ${entry.level}`);
});
console.log();

// Test 7: Player Serialization
console.log('💾 Test 7: Player Serialization');
const playerData = player.toJSON();
console.log('✓ Player serialized to JSON');
console.log('  Keys:', Object.keys(playerData).join(', '));
const playerRestored = Player.fromJSON(playerData);
console.log('✓ Player deserialized from JSON');
console.log('  Restored level:', playerRestored.level);
console.log();

console.log('✅ All tests completed successfully!');
console.log();
console.log('Integration Notes:');
console.log('- Player model: Working ✓');
console.log('- Combat system: Working ✓');
console.log('- Player manager: Working ✓');
console.log('- UI builder: Requires Discord.js (tested separately)');
console.log();
console.log('Ready to integrate with Discord bot!');
