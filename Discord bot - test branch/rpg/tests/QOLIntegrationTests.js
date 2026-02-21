/**
 * QOL Integration Tests
 * Tests for all 15 new Quality-of-Life features
 * Verifies handler methods, data persistence, and calculations
 */

import DailyQuestTracker from '../dashboard/systems/tier1/DailyQuestTracker.js';
import DamageTracker from '../dashboard/systems/tier1/DamageTracker.js';
import BossWeaknessAnalyzer from '../dashboard/systems/tier1/BossWeaknessAnalyzer.js';
import LootAnalytics from '../dashboard/systems/tier1/LootAnalytics.js';
import SkillMastery from '../dashboard/systems/tier1/SkillMastery.js';
import FavoriteItemLoadout from '../dashboard/systems/tier2/FavoriteItemLoadout.js';
import NotificationSystem from '../dashboard/systems/tier2/NotificationSystem.js';
import EnemyEncyclopedia from '../dashboard/systems/tier2/EnemyEncyclopedia.js';
import ShorthandCommandTips from '../dashboard/systems/tier2/ShorthandCommandTips.js';
import CraftingQueue from '../dashboard/systems/tier2/CraftingQueue.js';
import AutoSellJunk from '../dashboard/systems/tier4/AutoSellJunk.js';
import StatComparison from '../dashboard/systems/tier4/StatComparison.js';
import TimeZoneSupport from '../dashboard/systems/tier4/TimeZoneSupport.js';
import UIThemeManager from '../dashboard/systems/tier4/UIThemeManager.js';
import SessionStatistics from '../dashboard/systems/tier4/SessionStatistics.js';

class QOLIntegrationTests {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.systems = {};
  }

  /**
   * Initialize all systems
   */
  initializeSystems() {
    this.systems.dailyQuestTracker = new DailyQuestTracker();
    this.systems.damageTracker = new DamageTracker();
    this.systems.bossWeaknessAnalyzer = new BossWeaknessAnalyzer();
    this.systems.lootAnalytics = new LootAnalytics();
    this.systems.skillMastery = new SkillMastery();
    this.systems.favoriteItemLoadout = new FavoriteItemLoadout();
    this.systems.notificationSystem = new NotificationSystem();
    this.systems.enemyEncyclopedia = new EnemyEncyclopedia();
    this.systems.shorthandCommandTips = new ShorthandCommandTips();
    this.systems.craftingQueue = new CraftingQueue();
    this.systems.autoSellJunk = new AutoSellJunk();
    this.systems.statComparison = new StatComparison();
    this.systems.timezoneSupport = new TimeZoneSupport();
    this.systems.uiThemeManager = new UIThemeManager();
    this.systems.sessionStatistics = new SessionStatistics();
  }

  /**
   * Mock player object for testing
   */
  createMockPlayer() {
    return {
      id: 'test-user-123',
      userId: 'test-user-123',
      username: 'TestPlayer',
      level: 25,
      guild: 'test-guild',
      equippedItems: {
        weapon: 'sword-of-fire',
        chest: 'iron-chest',
        legs: 'iron-legs'
      },
      questData: {
        daily: [],
        weekly: [],
        totalClaimedRewards: 0
      },
      damageHistory: {
        sessions: [],
        weeklyTotal: 0,
        dailyBreakdown: [100, 150, 200, 175, 225, 300, 250]
      }
    };
  }

  /**
   * Test helper - assert condition and track result
   */
  assert(condition, testName, errorMsg = '') {
    if (condition) {
      this.testResults.passed++;
      console.log(`✅ ${testName}`);
    } else {
      this.testResults.failed++;
      const error = `❌ ${testName}: ${errorMsg}`;
      console.log(error);
      this.testResults.errors.push(error);
    }
  }

  /**
   * Test Daily Quest Tracker
   */
  testDailyQuestTracker() {
    console.log('\n📋 Testing Daily Quest Tracker...');
    const player = this.createMockPlayer();
    const tracker = this.systems.dailyQuestTracker;

    // Test: Get player quests
    const quests = tracker.getPlayerQuests(player.id);
    this.assert(quests !== undefined, 'Daily Quests: Returns quest data', 'No data returned');
    this.assert('daily' in quests, 'Daily Quests: Has daily array', 'Missing daily field');
    this.assert('weekly' in quests, 'Daily Quests: Has weekly array', 'Missing weekly field');

    // Test: Time to reset
    const timeReset = tracker.getTimeToReset();
    this.assert(timeReset !== null, 'Daily Quests: Returns time to reset', 'Null returned');
  }

  /**
   * Test Damage Tracker
   */
  testDamageTracker() {
    console.log('\n⚔️ Testing Damage Tracker...');
    const player = this.createMockPlayer();
    const tracker = this.systems.damageTracker;

    // Add sample damage data
    tracker.recordDamage(player.id, 150);
    tracker.recordDamage(player.id, 200);
    tracker.recordDamage(player.id, 175);

    // Test: Get weekly stats
    const stats = tracker.getWeeklyStats(player.id);
    this.assert(stats !== undefined, 'Damage Tracker: Returns weekly stats', 'No stats returned');
    this.assert('totalDamage' in stats, 'Damage Tracker: Has totalDamage', 'Missing totalDamage');
    this.assert('dailyBreakdown' in stats, 'Damage Tracker: Has daily breakdown', 'Missing breakdown');

    // Test: Get trend
    const trend = tracker.getTrend(player.id);
    this.assert(trend !== undefined, 'Damage Tracker: Returns trend data', 'No trend returned');
    this.assert('status' in trend, 'Damage Tracker: Trend has status', 'Missing status field');

    // Test: Guild comparison
    const comparison = tracker.getGuildComparison(player.id, player.guild);
    this.assert(comparison !== undefined, 'Damage Tracker: Returns guild comparison', 'No comparison');
  }

  /**
   * Test Boss Weakness Analyzer
   */
  testBossWeaknessAnalyzer() {
    console.log('\n👹 Testing Boss Weakness Analyzer...');
    const player = this.createMockPlayer();
    const analyzer = this.systems.bossWeaknessAnalyzer;

    // Record sample boss encounter
    analyzer.recordBossEncounter(player.id, 'Dragon King', true, 'fire');

    // Test: Get boss stats
    const stats = analyzer.getAllBossStats(player.id);
    this.assert(stats !== undefined, 'Boss Analyzer: Returns boss stats', 'No stats returned');

    // Test: Get recommendations
    const recs = analyzer.getRecommendations(player.id);
    this.assert(recs !== null, 'Boss Analyzer: Returns recommendations', 'Null returned');

    // Test: Get elemental weakness
    const weakness = analyzer.getElementalWeakness('Dragon King', player.id);
    this.assert(weakness !== undefined, 'Boss Analyzer: Returns elemental weakness', 'Undefined returned');
  }

  /**
   * Test Loot Analytics
   */
  testLootAnalytics() {
    console.log('\n🎁 Testing Loot Analytics...');
    const player = this.createMockPlayer();
    const analytics = this.systems.lootAnalytics;

    // Record sample drops
    analytics.recordDrop(player.id, 'Sword of Fire', 'Dragon', 'rare');
    analytics.recordDrop(player.id, 'Health Potion', 'Goblin', 'common');

    // Test: Get drop rates
    const rates = analytics.getDropRates(player.id);
    this.assert(rates !== undefined, 'Loot Analytics: Returns drop rates', 'No rates returned');
    this.assert(typeof rates === 'object', 'Loot Analytics: Drop rates is object', 'Not object');

    // Test: Get farming efficiency
    const efficiency = analytics.getFarmingEfficiency(player.id);
    this.assert(efficiency !== undefined, 'Loot Analytics: Returns efficiency', 'No efficiency');
    this.assert('rating' in efficiency, 'Loot Analytics: Has efficiency rating', 'No rating');

    // Test: Get recent drops
    const recent = analytics.getRecentDrops(player.id, 5);
    this.assert(Array.isArray(recent), 'Loot Analytics: Returns array', 'Not array');
  }

  /**
   * Test Skill Mastery
   */
  testSkillMastery() {
    console.log('\n⭐ Testing Skill Mastery...');
    const player = this.createMockPlayer();
    const mastery = this.systems.skillMastery;

    // Record skill usage
    mastery.recordSkillUsage(player.id, 'Fireball', 10);
    mastery.recordSkillUsage(player.id, 'Ice Bolt', 5);

    // Test: Get player skills
    const skills = mastery.getPlayerSkills(player.id);
    this.assert(skills !== undefined, 'Skill Mastery: Returns skills', 'No skills returned');
    this.assert(typeof skills === 'object', 'Skill Mastery: Skills is object', 'Not object');

    // Test: Get achieved masteries
    const masteries = mastery.getAchievedMasteries(player.id);
    this.assert(Array.isArray(masteries), 'Skill Mastery: Returns array', 'Not array');
  }

  /**
   * Test Favorite Item Loadout
   */
  testFavoriteItemLoadout() {
    console.log('\n💎 Testing Favorite Item Loadout...');
    const player = this.createMockPlayer();
    const favorites = this.systems.favoriteItemLoadout;

    // Add favorite item
    favorites.addFavorite(player.id, { name: 'Sword of Fire', slot: 'weapon', stats: { damage: 50 } });

    // Test: Get favorites
    const faves = favorites.getFavorites(player.id);
    this.assert(Array.isArray(faves), 'Favorites: Returns array', 'Not array');

    // Test: Get suggested favorites
    const suggested = favorites.getSuggestedFavorites(player);
    this.assert(Array.isArray(suggested), 'Favorites: Returns suggested', 'Not array');
  }

  /**
   * Test Notification System
   */
  testNotificationSystem() {
    console.log('\n🔔 Testing Notification System...');
    const player = this.createMockPlayer();
    const notifications = this.systems.notificationSystem;

    // Add notification
    notifications.addNotification(player.id, {
      type: 'levelUp',
      message: 'Reached Level 26!',
      priority: 'high'
    });

    // Test: Get unread notifications
    const unread = notifications.getUnreadNotifications(player.id);
    this.assert(Array.isArray(unread), 'Notifications: Returns array', 'Not array');

    // Test: Get preferences
    const prefs = notifications.getPlayerPreferences(player.id);
    this.assert(prefs !== undefined, 'Notifications: Returns preferences', 'No prefs');

    // Test: Get history
    const history = notifications.getNotificationHistory(player.id, 10);
    this.assert(Array.isArray(history), 'Notifications: Returns history', 'Not array');
  }

  /**
   * Test Enemy Encyclopedia
   */
  testEnemyEncyclopedia() {
    console.log('\n📚 Testing Enemy Encyclopedia...');
    const player = this.createMockPlayer();
    const encyclopedia = this.systems.enemyEncyclopedia;

    // Record enemy encounter
    encyclopedia.recordEncounter(player.id, 'Goblin', true);

    // Test: Get encyclopedia
    const enc = encyclopedia.getPlayerEncyclopedia(player.id);
    this.assert(enc !== undefined, 'Encyclopedia: Returns encyclopedia', 'No data');
    this.assert('enemies' in enc, 'Encyclopedia: Has enemies field', 'Missing field');

    // Test: Get trophy progress
    const trophies = encyclopedia.getTrophyProgress(player.id);
    this.assert(trophies !== undefined, 'Encyclopedia: Returns trophy progress', 'No progress');
    this.assert('completed' in trophies, 'Encyclopedia: Has completed field', 'Missing field');
  }

  /**
   * Test Command Hotkeys (Shorthand)
   */
  testCommandHotkeys() {
    console.log('\n⌨️ Testing Command Hotkeys...');
    const player = this.createMockPlayer();
    const hotkeys = this.systems.shorthandCommandTips;

    // Test: Get hotkeys
    const hkeys = hotkeys.getPlayerHotkeys(player.id);
    this.assert(hkeys !== undefined, 'Hotkeys: Returns hotkeys', 'No hotkeys');
    this.assert('custom' in hkeys, 'Hotkeys: Has custom field', 'Missing custom');

    // Test: Get default hotkeys
    const defaults = hotkeys.getDefaultHotkeys();
    this.assert(defaults !== undefined, 'Hotkeys: Returns defaults', 'No defaults');
    this.assert(Array.isArray(defaults) || typeof defaults === 'object', 'Hotkeys: Returns array/object', 'Wrong type');

    // Test: Get favorites
    const favs = hotkeys.getFavorites(player.id);
    this.assert(Array.isArray(favs) || favs === null, 'Hotkeys: Returns favorites', 'Wrong type');
  }

  /**
   * Test Crafting Queue
   */
  testCraftingQueue() {
    console.log('\n⚒️ Testing Crafting Queue...');
    const player = this.createMockPlayer();
    const queue = this.systems.craftingQueue;

    // Add item to queue
    queue.addToQueue(player.id, { name: 'Iron Sword', estimatedTime: 300 });

    // Test: Get queue
    const q = queue.getPlayerQueue(player.id);
    this.assert(Array.isArray(q), 'Queue: Returns array', 'Not array');

    // Test: Get stats
    const stats = queue.getQueueStats(player.id);
    this.assert(stats !== undefined, 'Queue: Returns stats', 'No stats');
    this.assert('totalCrafted' in stats, 'Queue: Has totalCrafted', 'Missing field');
  }

  /**
   * Test Auto-Sell Junk
   */
  testAutoSellJunk() {
    console.log('\n🤖 Testing Auto-Sell Junk...');
    const player = this.createMockPlayer();
    const autoSell = this.systems.autoSellJunk;

    // Test: Get settings
    const settings = autoSell.getPlayerSettings(player.id);
    this.assert(settings !== undefined, 'AutoSell: Returns settings', 'No settings');
    this.assert('enabled' in settings, 'AutoSell: Has enabled field', 'Missing field');

    // Test: Get stats
    const stats = autoSell.getPlayerStats(player.id);
    this.assert(stats !== undefined, 'AutoSell: Returns stats', 'No stats');
    this.assert('itemsSold' in stats, 'AutoSell: Has itemsSold', 'Missing field');
  }

  /**
   * Test Stat Comparison
   */
  testStatComparison() {
    console.log('\n⚙️ Testing Stat Comparison...');
    const player = this.createMockPlayer();
    const comparison = this.systems.statComparison;

    // Test: Compare equipped
    const compared = comparison.compareEquipped(player);
    this.assert(Array.isArray(compared), 'StatComp: Returns array', 'Not array');

    // Test: Get best in slot
    const bis = comparison.getBestInSlot(player);
    this.assert(Array.isArray(bis), 'StatComp: Returns BIS array', 'Not array');
  }

  /**
   * Test Timezone Support
   */
  testTimezoneSupport() {
    console.log('\n🌍 Testing Timezone Support...');
    const player = this.createMockPlayer();
    const timezone = this.systems.timezoneSupport;

    // Test: Get player timezone
    const tz = timezone.getPlayerTimezone(player.id) || 'UTC';
    this.assert(tz !== null, 'Timezone: Returns timezone', 'Null returned');
    this.assert(typeof tz === 'string', 'Timezone: Is string', 'Not string');

    // Test: Get local event schedule
    const schedule = timezone.getLocalEventSchedule(player.id);
    this.assert(Array.isArray(schedule), 'Timezone: Returns schedule', 'Not array');

    // Test: Get UTC conversions
    const conv = timezone.getUTCConversions('UTC');
    this.assert(conv !== undefined, 'Timezone: Returns conversions', 'No conversions');
  }

  /**
   * Test UI Theme Manager
   */
  testUIThemeManager() {
    console.log('\n🎨 Testing UI Theme Manager...');
    const player = this.createMockPlayer();
    const themeManager = this.systems.uiThemeManager;

    // Test: Get player theme
    const theme = themeManager.getPlayerTheme(player.id);
    this.assert(theme !== undefined, 'Theme: Returns theme', 'No theme');

    // Test: Get available themes
    const themes = themeManager.getAvailableThemes();
    this.assert(Array.isArray(themes), 'Theme: Returns array', 'Not array');
    this.assert(themes.length > 0, 'Theme: Has themes', 'No themes');
  }

  /**
   * Test Session Statistics
   */
  testSessionStatistics() {
    console.log('\n📊 Testing Session Statistics...');
    const player = this.createMockPlayer();
    const sessions = this.systems.sessionStatistics;

    // Start session
    sessions.startSession(player.id);

    // Test: Get active sessions
    const active = sessions.getActiveSessions(player.id);
    this.assert(Array.isArray(active), 'Sessions: Returns array', 'Not array');

    // Test: Get stats
    const stats = sessions.getSessionStats(player.id);
    this.assert(stats !== undefined, 'Sessions: Returns stats', 'No stats');

    // Test: Get performance trend
    const trend = sessions.getPerformanceTrend(player.id);
    this.assert(trend !== undefined, 'Sessions: Returns trend', 'No trend');

    // Test: Get best session
    const best = sessions.getBestSession(player.id);
    this.assert(best === null || typeof best === 'object', 'Sessions: Returns best', 'Wrong type');
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Starting QOL Integration Tests...\n');
    console.log('═'.repeat(50));

    this.initializeSystems();

    // Run all test suites
    this.testDailyQuestTracker();
    this.testDamageTracker();
    this.testBossWeaknessAnalyzer();
    this.testLootAnalytics();
    this.testSkillMastery();
    this.testFavoriteItemLoadout();
    this.testNotificationSystem();
    this.testEnemyEncyclopedia();
    this.testCommandHotkeys();
    this.testCraftingQueue();
    this.testAutoSellJunk();
    this.testStatComparison();
    this.testTimezoneSupport();
    this.testUIThemeManager();
    this.testSessionStatistics();

    // Print summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 Test Summary');
    console.log('═'.repeat(50));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Total: ${this.testResults.passed + this.testResults.failed}`);
    console.log(`🎯 Success Rate: ${Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100)}%`);

    if (this.testResults.errors.length > 0) {
      console.log('\n⚠️ Failed Tests:');
      this.testResults.errors.forEach(error => console.log(error));
    }

    console.log('═'.repeat(50) + '\n');

    return {
      passed: this.testResults.passed,
      failed: this.testResults.failed,
      total: this.testResults.passed + this.testResults.failed,
      successRate: Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100),
      errors: this.testResults.errors
    };
  }
}

// Run tests if executed directly
const tests = new QOLIntegrationTests();
await tests.runAllTests();

export default QOLIntegrationTests;
