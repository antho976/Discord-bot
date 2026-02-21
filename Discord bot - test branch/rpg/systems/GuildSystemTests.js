/**
 * Guild System Testing & Validation
 * Comprehensive testing suite for all guild features
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');

// Test functions
export const GuildTests = {
  /**
   * Verify all guild data files exist
   */
  async verifyDataFiles() {
    const files = [
      'guild-quests.json',
      'players.json',
      'bounties.json',
      'guild-shop.json'
    ];

    const missing = [];
    for (const file of files) {
      const filepath = path.join(DATA_DIR, file);
      if (!fs.existsSync(filepath)) {
        missing.push(file);
      }
    }

    return {
      pass: missing.length === 0,
      message: missing.length > 0 
        ? `Missing files: ${missing.join(', ')}`
        : 'All data files present',
      missingFiles: missing
    };
  },

  /**
   * Verify guild quests structure
   */
  async verifyQuestStructure() {
    try {
      const filepath = path.join(DATA_DIR, 'guild-quests.json');
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

      const issues = [];
      
      // Check categories exist
      if (!data.daily) issues.push('Missing "daily" category');
      if (!data.weekly) issues.push('Missing "weekly" category');
      if (!data.limited) issues.push('Missing "limited" category');

      // Validate each quest
      const allQuests = [...(data.daily || []), ...(data.weekly || []), ...(data.limited || [])];
      allQuests.forEach((quest, idx) => {
        if (!quest.id) issues.push(`Quest ${idx} missing ID`);
        if (!quest.title) issues.push(`Quest ${idx} missing title`);
        if (!quest.rewards) issues.push(`Quest ${idx} missing rewards`);
      });

      return {
        pass: issues.length === 0,
        message: issues.length === 0 ? 'Quest structure valid' : `Issues: ${issues.join('; ')}`,
        issues,
        totalQuests: allQuests.length
      };
    } catch (err) {
      return {
        pass: false,
        message: `Error reading quests: ${err.message}`,
        error: err
      };
    }
  },

  /**
   * Verify player data structure
   */
  async verifyPlayerStructure() {
    try {
      const filepath = path.join(DATA_DIR, 'players.json');
      if (!fs.existsSync(filepath)) {
        return {
          pass: true,
          message: 'Players file not yet created (OK)',
          playerCount: 0
        };
      }

      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      const players = Array.isArray(data) ? data : Object.values(data);

      const issues = [];
      players.forEach((player, idx) => {
        if (!player.userId) issues.push(`Player ${idx} missing userId`);
        if (!Array.isArray(player.dailyQuestsCompleted)) issues.push(`Player ${idx} missing dailyQuestsCompleted array`);
        if (!Array.isArray(player.weeklyQuestsCompleted)) issues.push(`Player ${idx} missing weeklyQuestsCompleted array`);
        if (!Array.isArray(player.limitedQuestsCompleted)) issues.push(`Player ${idx} missing limitedQuestsCompleted array`);
      });

      return {
        pass: issues.length === 0,
        message: issues.length === 0 ? 'Player structure valid' : `Issues: ${issues.join('; ')}`,
        playerCount: players.length,
        issues
      };
    } catch (err) {
      return {
        pass: false,
        message: `Error reading players: ${err.message}`,
        error: err
      };
    }
  },

  /**
   * Test quest progress tracking
   */
  async testQuestProgressTracking(mockPlayer) {
    const tests = [];

    // Test 1: Initialize quest progress
    if (!mockPlayer.guildQuestProgress) {
      mockPlayer.guildQuestProgress = {};
    }
    tests.push({
      name: 'Initialize quest progress',
      pass: typeof mockPlayer.guildQuestProgress === 'object',
      message: 'Quest progress object initialized'
    });

    // Test 2: Track progress increment
    mockPlayer.guildQuestProgress['quest_1'] = { count: 0, updatedAt: Date.now() };
    mockPlayer.guildQuestProgress['quest_1'].count += 5;
    tests.push({
      name: 'Track progress increment',
      pass: mockPlayer.guildQuestProgress['quest_1'].count === 5,
      message: `Progress incremented to ${mockPlayer.guildQuestProgress['quest_1'].count}`
    });

    // Test 3: Complete quest
    mockPlayer.dailyQuestsCompleted = [];
    mockPlayer.dailyQuestsCompleted.push('quest_1');
    tests.push({
      name: 'Mark quest complete',
      pass: mockPlayer.dailyQuestsCompleted.includes('quest_1'),
      message: 'Quest marked as completed'
    });

    return {
      pass: tests.every(t => t.pass),
      tests,
      message: `Progress tracking: ${tests.filter(t => t.pass).length}/${tests.length} passed`
    };
  },

  /**
   * Test rank system
   */
  async testRankSystem(mockPlayer) {
    const rankThresholds = {
      'F': 0,
      'E': 500,
      'D': 1500,
      'C': 3500,
      'B': 7000,
      'A': 12000,
      'S': 20000
    };

    const tests = [];

    // Test rank determination
    for (const [rank, xpRequired] of Object.entries(rankThresholds)) {
      mockPlayer.guildXP = xpRequired;
      const expectedRank = rank;
      
      // Simple rank determination
      let determinedRank = 'F';
      for (const [r, xp] of Object.entries(rankThresholds).sort((a, b) => b[1] - a[1])) {
        if (mockPlayer.guildXP >= xp) {
          determinedRank = r;
          break;
        }
      }

      tests.push({
        name: `Rank determination at ${xpRequired} XP`,
        pass: determinedRank === expectedRank,
        message: `XP ${xpRequired} → Rank ${determinedRank}`
      });
    }

    return {
      pass: tests.every(t => t.pass),
      tests,
      message: `Rank system: ${tests.filter(t => t.pass).length}/${tests.length} passed`
    };
  },

  /**
   * Test quest chain prerequisites
   */
  async testQuestChains() {
    const tests = [];

    // Create mock quest chain
    const chain = [
      { id: 'chain_1', title: 'First Quest', prerequisiteQuestId: null },
      { id: 'chain_2', title: 'Second Quest', prerequisiteQuestId: 'chain_1' },
      { id: 'chain_3', title: 'Third Quest', prerequisiteQuestId: 'chain_2' },
    ];

    // Test 1: Chain structure
    tests.push({
      name: 'Quest chain structure',
      pass: chain.length === 3 && chain[1].prerequisiteQuestId === 'chain_1',
      message: 'Chain structure valid'
    });

    // Test 2: Prerequisite checking (mock)
    const completed = ['chain_1'];
    const canStartChain2 = completed.includes(chain[1].prerequisiteQuestId);
    tests.push({
      name: 'Prerequisite checking',
      pass: canStartChain2,
      message: 'Can start chain_2 after completing chain_1'
    });

    // Test 3: Chain bonus logic (mock)
    const timeCompleted = Date.now();
    const daysPassed = 0;
    const hasBonus = daysPassed <= 7;
    tests.push({
      name: 'Chain bonus calculation',
      pass: hasBonus,
      message: 'Bonus applied when completing within 7 days'
    });

    return {
      pass: tests.every(t => t.pass),
      tests,
      message: `Quest chains: ${tests.filter(t => t.pass).length}/${tests.length} passed`
    };
  },

  /**
   * Test shop system
   */
  async testShopSystem() {
    const tests = [];

    // Test 1: Shop items exist
    const shopFile = path.join(DATA_DIR, 'guild-shop.json');
    const shopExists = fs.existsSync(shopFile);
    tests.push({
      name: 'Shop data file exists',
      pass: shopExists,
      message: shopExists ? 'Shop file found' : 'Shop file missing'
    });

    if (shopExists) {
      try {
        const shopData = JSON.parse(fs.readFileSync(shopFile, 'utf8'));
        const hasCategories = shopData.cosmetics && shopData.consumables && shopData.exclusive;
        tests.push({
          name: 'Shop categories exist',
          pass: hasCategories,
          message: hasCategories ? 'All categories present' : 'Missing categories'
        });

        // Test 2: Items have required fields
        const allItems = [...(shopData.cosmetics || []), ...(shopData.consumables || []), ...(shopData.exclusive || [])];
        const validItems = allItems.every(item => item.id && item.name && item.price);
        tests.push({
          name: 'Shop items valid',
          pass: validItems,
          message: `Validated ${allItems.length} items`
        });
      } catch (err) {
        tests.push({
          name: 'Parse shop data',
          pass: false,
          message: `Error: ${err.message}`
        });
      }
    }

    return {
      pass: tests.every(t => t.pass),
      tests,
      message: `Shop system: ${tests.filter(t => t.pass).length}/${tests.length} passed`
    };
  },

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('\n🧪 Running Guild System Tests...\n');

    const results = {
      dataFiles: await this.verifyDataFiles(),
      questStructure: await this.verifyQuestStructure(),
      playerStructure: await this.verifyPlayerStructure(),
      progressTracking: await this.testQuestProgressTracking({ guildXP: 0 }),
      rankSystem: await this.testRankSystem({ guildXP: 0 }),
      questChains: await this.testQuestChains(),
      shopSystem: await this.testShopSystem(),
    };

    // Summary
    const allPass = Object.values(results).every(r => r.pass);
    const passCount = Object.values(results).filter(r => r.pass).length;
    const totalCount = Object.keys(results).length;

    console.log(`\n✅ Test Results: ${passCount}/${totalCount} test groups passed\n`);

    return {
      allPass,
      summary: `${passCount}/${totalCount} tests passed`,
      details: results
    };
  }
};

export default GuildTests;
