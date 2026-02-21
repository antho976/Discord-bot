/**
 * Data Migration Script
 * Migrate existing hardcoded content to the new JSON-based systems
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { RAIDS } from './raids.js';
import { saveRaid, saveBoss, saveReward } from './content-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migrate raids from raids.js to content-system.js
 */
function migrateRaids() {
  console.log('🔄 Starting raids migration...');
  
  let migratedCount = 0;
  
  for (const [worldKey, raids] of Object.entries(RAIDS)) {
    for (const raid of raids) {
      try {
        // First, create bosses for each raid floor
        const bossList = [];
        const rewardsList = [];
        
        if (raid.bosses && Array.isArray(raid.bosses)) {
          raid.bosses.forEach((boss, idx) => {
            const bossId = `${raid.id}_boss_${idx + 1}`;
            
            // Create boss
            saveBoss({
              id: bossId,
              name: boss.name,
              description: `Boss from ${raid.name}`,
              hp: boss.hp || 100,
              attack: boss.attack || 10,
              def: boss.def || 5,
              level: boss.level || 1,
              abilities: boss.abilities || [],
              rewardId: `${bossId}_reward`,
            });
            
            bossList.push(bossId);
            
            // Create reward for this boss
            saveReward(`${bossId}_reward`, {
              name: `${boss.name} Victory`,
              xp: boss.xpReward || 0,
              gold: Math.floor((boss.xpReward || 0) / 2),
              items: [],
              abilities: [],
            });
            
            rewardsList.push(`${bossId}_reward`);
          });
        }
        
        // Create main raid reward
        const raidRewardId = `${raid.id}_completion_reward`;
        saveReward(raidRewardId, {
          name: `${raid.name} Completion`,
          xp: raid.rewards?.xp || 0,
          gold: raid.rewards?.gold || 0,
          items: raid.rewards?.loot || [],
          abilities: raid.rewards?.abilities || [],
        });
        
        rewardsList.push(raidRewardId);
        
        // Create raid
        saveRaid({
          id: raid.id,
          name: raid.name,
          description: raid.description,
          floors: raid.bosses?.length || 1,
          teamSize: raid.maxPartySize || 5,
          minLevel: raid.minLevel || 1,
          bosses: bossList,
          rewards: rewardsList,
        });
        
        migratedCount++;
        console.log(`✅ Migrated raid: ${raid.name}`);
      } catch (err) {
        console.error(`❌ Failed to migrate raid ${raid.id}:`, err.message);
      }
    }
  }
  
  console.log(`🎉 Migration complete! Migrated ${migratedCount} raids`);
}

/**
 * Example migration for worlds (you'll need to customize based on your worlds.js structure)
 */
function migrateWorlds() {
  console.log('ℹ️  World migration - Please run this manually with your existing worlds data');
  console.log('   Use the Content Editor at /editor to add worlds manually');
}

/**
 * Example migration for quests
 */
function migrateQuests() {
  console.log('ℹ️  Quest migration - Please run this manually with your existing quests data');
  console.log('   Use the Content Editor at /editor to add quests manually');
}

// Run migrations
console.log('🚀 Starting data migration...\n');

try {
  migrateRaids();
  console.log('\n');
  migrateWorlds();
  console.log('\n');
  migrateQuests();
  console.log('\n✨ All migrations complete!');
} catch (err) {
  console.error('❌ Migration failed:', err);
  process.exit(1);
}
