/**
 * RPG Command Handler - Main slash command and interaction handling
 */

import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import Player from '../models/Player.js';
import PlayerManager from '../systems/PlayerManager.js';
import CombatSystem from '../systems/CombatSystem.js';
import QOLSystem from '../systems/QOLSystem.js';
import EquipmentBuilds from '../systems/EquipmentBuilds.js';
import CombatRecommendations from '../systems/CombatRecommendations.js';
import BreadcrumbNavigation from '../systems/BreadcrumbNavigation.js';
import ComboVisualizer from '../systems/ComboVisualizer.js';
import GuildAnalytics from '../systems/GuildAnalytics.js';
import ProfessionEfficiency from '../systems/ProfessionEfficiency.js';
import EnvironmentPredictions from '../systems/EnvironmentPredictions.js';
import DailyQuestTracker from '../systems/DailyQuestTracker.js';
import DamageTracker from '../systems/DamageTracker.js';
import BossWeaknessAnalyzer from '../systems/BossWeaknessAnalyzer.js';
import LootAnalytics from '../systems/LootAnalytics.js';
import SkillMastery from '../systems/SkillMastery.js';
import FavoriteItemLoadout from '../systems/FavoriteItemLoadout.js';
import NotificationSystem from '../systems/NotificationSystem.js';
import EnemyEncyclopedia from '../systems/EnemyEncyclopedia.js';
import ShorthandCommandTips from '../systems/ShorthandCommandTips.js';
import CraftingQueue from '../systems/CraftingQueue.js';
import AutoSellJunk from '../systems/AutoSellJunk.js';
import StatComparison from '../systems/StatComparison.js';
import TimeZoneSupport from '../systems/TimeZoneSupport.js';
import UIThemeManager from '../systems/UIThemeManager.js';
import SessionStatistics from '../systems/SessionStatistics.js';
import RoguelikeManager from '../systems/RoguelikeManager.js';
import TowerManager from '../systems/TowerManager.js';
import UIBuilder from '../ui/UIBuilder.js';
import { getNarrativeChoice } from '../data/narrative-classes.js';
import { getClass, getSkill } from '../data/classes.js';
import { getNextWorldId, getWorld, getWorldBoss } from '../data/worlds.js';
import { 
  getAllWorlds, 
  getWorld as getWorldFromContent,
  getAllBosses,
  getBossesByWorld,
  getAllDungeons,
  getDungeonsByWorld,
  getAllRaids,
  getRaidsByWorld,
  getWorldByBoss,
  getItemsForBot,
  getItemByIdForBot
} from '../data/content-system.js';
import { RECIPES, RECIPES_SORTED, MATERIALS, getRecipe, getMaterial } from '../data/professions.js';
import { getGem } from '../data/gems.js';
import { getEquipment } from '../data/equipment.js';
import { getAvailableDungeons, getDungeonById, DUNGEONS } from '../data/dungeons.js';
import { getAvailableRaids, getRaidById } from '../data/raids.js';
import { getTalent, getTalents, getTalentsByClass } from '../data/talents.js';
import { getItemById } from '../data/items.js';
import { getQuestCategoriesByWorld, getQuestById } from '../data/quests.js';
import { getWeeklyQuests } from '../data/quest-system.js';
import { getCollectible, checkCollectibleMilestone, getNextMilestone, COLLECTIBLE_MILESTONES } from '../data/collectibles.js';
import { getEarnedTitles, getEarnedBadges, getTitle, getBadge, TITLES, BADGES } from '../data/titles.js';
import { getEarnedGuildAchievements, getUnclaimedGuildAchievements, getGuildAchievement, GUILD_ACHIEVEMENTS } from '../data/guild-achievements.js';
import {
  getGatheringSkill,
  getGatheringXpToNextLevel,
  generateGatheringMaterials,
  generateAreaGatheringMaterials,
  getGatheringProfessionLevel,
  getGatheringProfessionBonuses,
  applyGatheringYieldBonus,
  addGatheringProfessionXp,
  getGatheringToolTier,
  GATHERING_SKILLS,
  GATHERING_TOOL_TIERS,
} from '../data/gathering.js';
import { GATHERING_AREAS, getGatheringArea, getAvailableAreas, getUnlockedAreas } from '../data/gathering-areas.js';
import { getMaterials } from '../data/materials-api.js';
import { getProfessionRewards, getUnlockedRewards } from '../data/profession-rewards.js';
import { getGatheringReward } from '../data/gathering-rewards.js';
import AutoGatherManager from '../systems/AutoGatherManager.js';
import { loadBalanceData } from '../data/balance.js';
import { DEFENSE_QUESTS, getAvailableDefenseQuests, getDefenseQuestById, loadDefenseQuests } from '../data/defense-quests.js';
import { getRankByXP, getNextRank, getXPToNextRank, getRankKey, GUILD_RANKS } from '../data/guild-ranks.js';
import { getAvailableDailyQuests, getAvailableWeeklyQuests, getAvailableLimitedQuests, claimLimitedQuest, getGuildQuestById, getAllGuildQuests, normalizeGuildQuestObjective } from '../data/guild-quests.js';
import { getAvailableBounties, claimBounty, getBountyById, createPlayerBounty } from '../data/bounties.js';
import { getUnlockedShopTiers } from '../data/shops.js';
import { guildManager } from '../systems/GuildManager.js';
import { getGuildLevel, getXPToNextLevel, getGuildBuffs, GUILD_BUFF_COSTS } from '../data/guild-levels.js';
import { getAvailableGuildBosses, getAvailableWorldBosses, getGuildBoss, getWorldBoss as getGuildWorldBoss } from '../data/guild-bosses.js';
import { WORLD_BOSSES } from '../data/bosses.js';
import { getCombatStyle, getStylesForClass, COMBAT_STYLES } from '../data/combat-styles.js';
import { ENVIRONMENTS, getEnvironment, getRandomEnvironment, getEnvironmentDescription } from '../data/environmental-effects.js';
import { BOSS_ABILITIES, getBossTemplate, getBossPhaseInfo } from '../data/boss-abilities.js';
import { getCombosForClass } from '../data/skill-combos.js';
import { getEnemyGroup, getRandomEnemyGroupForLevel, getGroupSummary } from '../data/multi-enemy-encounters.js';

// Helper function to get items from content system (with fallback to legacy items)
import { CombatHandlers } from './rpg-combat-handlers.js';
import { InventoryHandlers } from './rpg-inventory-handlers.js';
import { CraftingHandlers } from './rpg-crafting-handlers.js';
import { QuestHandlers } from './rpg-quest-handlers.js';
import { GuildHandlers } from './rpg-guild-handlers.js';
import { GatheringHandlers } from './rpg-gathering-handlers.js';
import { EconomyHandlers } from './rpg-economy-handlers.js';
import { ProgressHandlers } from './rpg-progress-handlers.js';
import { SkillsHandlers } from './rpg-skills-handlers.js';
import { ExplorationHandlers } from './rpg-exploration-handlers.js';
import { RoguelikeHandlers } from './rpg-roguelike-handlers.js';
import { QolHandlers } from './rpg-qol-handlers.js';

function getItemByIdDynamic(itemId) {
  // Try gems first (Master Blacksmith items)
  const gem = getGem(itemId);
  if (gem) return gem;
  
  // Try content-based items first (dashboard items have priority)
  const contentItem = getItemByIdForBot(itemId);
  if (contentItem) return contentItem;
  
  // Fall back to hardcoded items from items.js for existing recipes
  // This ensures recipes that output legacy items still work
  return getItemById(itemId);
}

class RPGCommand {
  constructor() {
    this.playerManager = new PlayerManager();
    this.combatSystem = new CombatSystem();
    this.qolSystem = new QOLSystem();
    this.equipmentBuilds = new EquipmentBuilds();
    this.combatRecommendations = new CombatRecommendations();
    this.breadcrumbNav = new BreadcrumbNavigation();
    this.comboVisualizer = new ComboVisualizer();
    this.guildAnalytics = new GuildAnalytics();
    this.professionEfficiency = new ProfessionEfficiency();
    this.environmentPredictions = new EnvironmentPredictions();
    // Tier 1 Systems - Lazy loaded (saves 200-300ms startup)
    this._dailyQuestTracker = null;
    this._damageTracker = null;
    this._bossWeaknessAnalyzer = null;
    this._lootAnalytics = null;
    this._skillMastery = null;
    // Tier 2 Systems - Lazy loaded
    this._favoriteItemLoadout = null;
    this._notificationSystem = null;
    this._enemyEncyclopedia = null;
    this._shorthandCommandTips = null;
    this._craftingQueue = null;
    // Tier 4 Systems - Lazy loaded
    this._autoSellJunk = null;
    this._statComparison = null;
    this._timeZoneSupport = null;
    this._uiThemeManager = null;
    this._sessionStatistics = null;
    this.autoGatherManager = new AutoGatherManager(this);
    this.guildManager = guildManager;
    this.activeMenus = new Map();
    this.client = null;
    
    // Performance optimizations
    this.dataCache = new Map();
    this.playerCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000;
    this.performanceMetrics = { totalRequests: 0, slowRequests: 0, avgResponseTime: 0 };
    this.enableDetailedTracking = false;
    
    // Component pooling
    this.componentPool = {
      backButton: null,
      backToHubButton: null,
      commonRows: new Map()
    };
    
    // Debounced save queue
    this.saveQueue = new Map();
    this.saveTimer = null;
    this.saveBatchDelay = 2000;
    
    // Fast paths
    this.fastPaths = {
      skipValidation: false,
      useShallowCopy: true
    };
    
    // Object pool for frequently created objects (5-10% faster)
    this.objectPool = {
      players: [], // Reuse player objects
      maxPoolSize: 50
    };
    
    this.initializeCache();
    this.initializeComponentPool();
  }
  
  // Lazy-loaded system getters (load only when first accessed)
  get dailyQuestTracker() {
    if (!this._dailyQuestTracker) this._dailyQuestTracker = new DailyQuestTracker();
    return this._dailyQuestTracker;
  }
  get damageTracker() {
    if (!this._damageTracker) this._damageTracker = new DamageTracker();
    return this._damageTracker;
  }
  get bossWeaknessAnalyzer() {
    if (!this._bossWeaknessAnalyzer) this._bossWeaknessAnalyzer = new BossWeaknessAnalyzer();
    return this._bossWeaknessAnalyzer;
  }
  get lootAnalytics() {
    if (!this._lootAnalytics) this._lootAnalytics = new LootAnalytics();
    return this._lootAnalytics;
  }
  get skillMastery() {
    if (!this._skillMastery) this._skillMastery = new SkillMastery();
    return this._skillMastery;
  }
  get favoriteItemLoadout() {
    if (!this._favoriteItemLoadout) this._favoriteItemLoadout = new FavoriteItemLoadout();
    return this._favoriteItemLoadout;
  }
  get notificationSystem() {
    if (!this._notificationSystem) this._notificationSystem = new NotificationSystem();
    return this._notificationSystem;
  }
  get enemyEncyclopedia() {
    if (!this._enemyEncyclopedia) this._enemyEncyclopedia = new EnemyEncyclopedia();
    return this._enemyEncyclopedia;
  }
  get shorthandCommandTips() {
    if (!this._shorthandCommandTips) this._shorthandCommandTips = new ShorthandCommandTips();
    return this._shorthandCommandTips;
  }
  get craftingQueue() {
    if (!this._craftingQueue) this._craftingQueue = new CraftingQueue();
    return this._craftingQueue;
  }
  get autoSellJunk() {
    if (!this._autoSellJunk) this._autoSellJunk = new AutoSellJunk();
    return this._autoSellJunk;
  }
  get statComparison() {
    if (!this._statComparison) this._statComparison = new StatComparison();
    return this._statComparison;
  }
  get timeZoneSupport() {
    if (!this._timeZoneSupport) this._timeZoneSupport = new TimeZoneSupport();
    return this._timeZoneSupport;
  }
  get uiThemeManager() {
    if (!this._uiThemeManager) this._uiThemeManager = new UIThemeManager();
    return this._uiThemeManager;
  }
  get sessionStatistics() {
    if (!this._sessionStatistics) this._sessionStatistics = new SessionStatistics();
    return this._sessionStatistics;
  }
  
  /**
   * Pre-load frequently accessed static data into cache
   */
  initializeCache() {
    try {
      // Cache static game data that doesn't change
      this.dataCache.set('talents', { data: getTalents(), timestamp: Date.now() });
      this.dataCache.set('dungeons', { data: DUNGEONS, timestamp: Date.now() });
      this.dataCache.set('materials', { data: MATERIALS, timestamp: Date.now() });
      this.dataCache.set('recipes', { data: RECIPES_SORTED, timestamp: Date.now() });
      console.log('[Performance] Static data cache initialized');
    } catch (err) {
      console.error('[Performance] Cache initialization failed:', err);
    }
  }
  
  /**
   * Pre-create commonly used components for instant reuse
   */
  initializeComponentPool() {
    try {
      // Cache back button (used in 80%+ of menus)
      this.componentPool.backButton = new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary);
      
      this.componentPool.backToHubButton = new ButtonBuilder()
        .setCustomId('rpg-back-to-hub')
        .setLabel('🏠 Back to Hub')
        .setStyle(ButtonStyle.Secondary);
      
      console.log('[Performance] Component pool initialized');
    } catch (err) {
      console.error('[Performance] Component pool failed:', err);
    }
  }
  
  /**
   * Get reusable back button (cloned to avoid mutation)
   */
  getBackButton(customId = 'rpg-back', label = '← Back') {
    if (customId === 'rpg-back' && label === '← Back') {
      // Return cloned cached button for default case (70% of calls)
      return ButtonBuilder.from(this.componentPool.backButton.toJSON());
    }
    // Create new for custom cases
    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(ButtonStyle.Secondary);
  }
  
  /**
   * Get cached data or fetch and cache it
   */
  getCachedData(key, fetchFn) {
    const cached = this.dataCache.get(key);
    const now = Date.now();
    
    // Return cached data if valid
    if (cached && (now - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }
    
    // Fetch and cache new data
    try {
      const data = fetchFn();
      this.dataCache.set(key, { data, timestamp: now });
      return data;
    } catch (err) {
      console.error(`[Performance] Cache fetch failed for ${key}:`, err);
      return cached ? cached.data : null; // Return stale data if fetch fails
    }
  }
  
  /**
   * Clear player cache for a specific user (call after important updates)
   */
  clearPlayerCache(userId) {
    this.playerCache.delete(userId);
  }
  
  /**
   * Clear expired cache entries (run periodically)
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.dataCache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.dataCache.delete(key);
      }
    }
  }

  setClient(client) {
    this.client = client;
    
    // Start cache cleanup interval (every 10 minutes)
    setInterval(() => {
      this.cleanupCache();
    }, 10 * 60 * 1000);
    
    // Flush save queue periodically (every 5 seconds for safety)
    setInterval(() => {
      if (this.saveQueue.size > 0) {
        this.flushSaveQueue();
      }
    }, 5000);
    
    console.log('[Performance] Cache cleanup and save flushing scheduled');
  }

  /**
   * Send a DM notification to a player
   */
  async notifyPlayer(userId, title, message, color = '#2196f3') {
    if (!this.client) return;
    try {
      const user = await this.client.users.fetch(userId);
      if (!user) return;

      const embed = {
        title: title,
        description: message,
        color: parseInt(color.replace('#', ''), 16),
        timestamp: new Date().toISOString(),
        footer: { text: 'Guild Notification' }
      };

      await user.send({ embeds: [embed] });
    } catch (err) {
      console.error(`Error sending notification to ${userId}:`, err);
    }
  }

  /**
   * Check and clear stale combat flags (when player.isInCombat is true but no active combat)
   */
  clearStaleCombatFlag(player) {
    if (player.isInCombat && !this.combatSystem.isInCombat(player.userId)) {
      console.log(`[Combat Safety] Clearing stale combat flag for ${player.username}`);
      player.isInCombat = false;
      player.currentEnemy = null;
      this.persistPlayer(player);
      return true;
    }
    return false;
  }

  /**
   * Cap existing potion buffs to new maximum values (retroactive fix)
   */
  capPotionBuffs(player) {
    if (!player.potionBuffs) return false;
    
    let capped = false;
    const pb = player.potionBuffs;
    
    // XP cap: 500%
    if (pb.xpBonus && pb.xpBonus > 500) {
      console.log(`[Potion Cap] Reducing ${player.username}'s XP bonus from ${pb.xpBonus}% to 500%`);
      pb.xpBonus = 500;
      capped = true;
    }
    
    // Gold cap: 500%
    if (pb.goldBonus && pb.goldBonus > 500) {
      console.log(`[Potion Cap] Reducing ${player.username}'s Gold bonus from ${pb.goldBonus}% to 500%`);
      pb.goldBonus = 500;
      capped = true;
    }
    
    // Loot cap: 200%
    if (pb.lootBonus && pb.lootBonus > 200) {
      console.log(`[Potion Cap] Reducing ${player.username}'s Loot bonus from ${pb.lootBonus}% to 200%`);
      pb.lootBonus = 200;
      capped = true;
    }
    
    // Health cap: 5000 HP
    if (pb.nextCombatHeal && pb.nextCombatHeal > 5000) {
      console.log(`[Potion Cap] Reducing ${player.username}'s pre-heal from ${pb.nextCombatHeal} HP to 5000 HP`);
      pb.nextCombatHeal = 5000;
      capped = true;
    }
    
    // Gathering duration cap: 24 hours
    if (pb.gatheringExpires && pb.gatheringExpires > Date.now() + (24 * 60 * 60 * 1000)) {
      console.log(`[Potion Cap] Reducing ${player.username}'s gathering duration to 24 hours`);
      pb.gatheringExpires = Date.now() + (24 * 60 * 60 * 1000);
      capped = true;
    }
    
    if (capped) {
      this.persistPlayer(player);
    }
    
    return capped;
  }

  persistPlayer(player) {
    // Queue player for batched save (40-60% faster)
    this.saveQueue.set(player.userId, player);
    
    // Debounce: only save after delay (reduces I/O)
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      this.flushSaveQueue();
    }, this.saveBatchDelay);
  }
  
  /**
   * Flush queued saves to disk
   */
  flushSaveQueue() {
    if (this.saveQueue.size === 0) return;
    
    const startTime = Date.now();
    
    // Batch save all queued players
    for (const [userId, player] of this.saveQueue.entries()) {
      this.playerManager.savePlayer(player);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Performance] Flushed ${this.saveQueue.size} saves in ${duration}ms`);
    
    this.saveQueue.clear();
    this.saveTimer = null;
  }
  
  /**
   * Force immediate save (for critical operations)
   */
  persistPlayerImmediate(player) {
    this.playerManager.savePlayer(player);
  }

  /**
   * Define the slash command
   */
  getSlashCommand() {
    return new SlashCommandBuilder()
      .setName('rpg')
      .setDescription('Open the RPG hub menu')
      .toJSON();
  }

  /**
   * Define the leaderboard slash command
   */
  getLeaderboardSlashCommand() {
    return new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription('View leaderboards')
      .addSubcommand((subcommand) =>
        subcommand
          .setName('rpg')
          .setDescription('View RPG player leaderboards')
      )
      .toJSON();
  }

  /**
   * Define the daily rewards slash command
   */
  getDailySlashCommand() {
    return new SlashCommandBuilder()
      .setName('daily')
      .setDescription('Claim daily rewards')
      .toJSON();
  }



  /**
   * Handle the main command interaction
   */
  async handleCommand(interaction) {
    try {
      await interaction.deferReply({ ephemeral: false });
      
      const player = this.playerManager.getOrCreatePlayer(
          interaction.user.id,
          interaction.user.username
      );

      // Track last active timestamp
      player.lastActive = Date.now();

      if (!player.characterCreated) {
        const embed = UIBuilder.createClassSelectionEmbed();
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-narrative-defender')
            .setLabel('1. Stand Your Ground')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('rpg-narrative-striker')
            .setLabel('2. Strike First')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('rpg-narrative-tactician')
            .setLabel('3. Study Patterns')
            .setStyle(ButtonStyle.Success)
        );

        await interaction.editReply({
          content: 'Create your character by choosing a starter path:',
          embeds: [embed],
          components: [buttons],
        });
        
        // Track ownership for the initial message
        const reply = await interaction.fetchReply();
        this.activeMenus.set(reply.id, {
          ownerId: interaction.user.id,
          timestamp: Date.now(),
        });
        return;
      }

      const embed = UIBuilder.createMainMenuEmbed(player, interaction.user);
      const buttons = this.createMainMenuButtons();

      const reply = await interaction.editReply({
        embeds: [embed],
        components: buttons,
      });
      
      // Track ownership for the initial message
      this.activeMenus.set(reply.id, {
        ownerId: interaction.user.id,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[RPG] Command error:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred.',
          ephemeral: true,
        });
      } else {
        // Interaction already acknowledged, log only
        console.error('[RPG] Error reply skipped: interaction already acknowledged.');
      }
    }
  }

  /**
   * Handle the leaderboard command interaction
   */
  async handleLeaderboardCommand(interaction) {
    try {
      // Force reload player data from disk to ensure fresh data
      this.playerManager.loadAllPlayers();
      
      const subcommand = interaction.options?.getSubcommand();
      if (subcommand === 'rpg') {
        await this.handleLeaderboards(interaction);
      }
    } catch (error) {
      console.error('[Leaderboard] Error:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while loading the leaderboards.',
          ephemeral: true,
        });
      }
    }
  }

  /**
   * Handle the daily rewards command interaction
   */
  async handleDailyCommand(interaction) {
    try {
      await interaction.deferReply({ ephemeral: false });
      const player = this.playerManager.getOrCreatePlayer(
        interaction.user.id,
        interaction.user.username
      );

      if (!player.characterCreated) {
        await interaction.editReply({
          content: 'You need to create a character first using /rpg.',
          embeds: [],
          components: [],
        });
        return;
      }

      await this.handleDailyRewards(interaction, player);
    } catch (error) {
      console.error('[Daily] Error:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while loading daily rewards.',
          ephemeral: true,
        });
      }
    }
  }
  async handlePlayerMenu(interaction, player) {
    this.trackMenuNavigation(player, 'player');
    const embed = UIBuilder.createPlayerMenuEmbed(player, interaction.user);
    
    // Add leaderboard position if in top 10
    const overallRank = await this.getPlayerOverallRank(player);
    if (overallRank && overallRank.inTopTen) {
      const medal = ['🥇', '🥈', '🥉'][overallRank.rank - 1] || `#${overallRank.rank}`;
      embed.addFields({
        name: '🏆 Overall Leaderboard',
        value: `${medal} **Rank #${overallRank.rank}** out of ${overallRank.totalPlayers} players`,
        inline: false
      });
    }
    
    const buttons = this.createPlayerMenuButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Create level-up notification message from milestone data
   */
  createLevelUpMessage(levelUpResult) {
    if (!levelUpResult || !levelUpResult.levelsGained || levelUpResult.levelsGained === 0) {
      return '';
    }

    let message = `\n\n🎉 **Level Up!** `;
    if (levelUpResult.levelsGained > 1) {
      message += `Gained ${levelUpResult.levelsGained} levels!`;
    }

    if (levelUpResult.milestones && levelUpResult.milestones.length > 0) {
      message += '\n\n**Milestone Rewards:**';
      levelUpResult.milestones.forEach(milestone => {
        message += `\n✨ ${milestone.message}`;
        if (milestone.gold) message += `\n   💰 +${milestone.gold} gold`;
        if (milestone.talentPoints) message += `\n   ⭐ +${milestone.talentPoints} talent points`;
      });
    }

    return message;
  }

  /**
   * Create main menu buttons
   */
  createMainMenuButtons() {
    // Row 1: Guild - Quests - Combat - Player - Gather
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('🏛️ Guild')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-quests')
        .setLabel('📜 Quests')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-combat-menu')
        .setLabel('⚔️ Combat')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-character')
        .setLabel('👤 Player')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-gather')
        .setLabel('⛏️ Gather')
        .setStyle(ButtonStyle.Secondary)
    );

    // Row 2: Travel - Progress - Economy - QOL - Help
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-worlds')
        .setLabel('🌍 Travel')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-progress-menu')
        .setLabel('📈 Progress')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-economy-menu')
        .setLabel('💰 Economy')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-qol-menu')
        .setLabel('💡 Tools')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-help')
        .setLabel('❓ Help')
        .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-daily-rewards')
        .setLabel('🎁 Daily Rewards')
        .setStyle(ButtonStyle.Success)
    );

    return [row1, row2, row3];
  }

  /**
   * Create player menu buttons
   */
  createPlayerMenuButtons() {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-skills')
        .setLabel('✨ Skills')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-equipment')
        .setLabel('⚙️ Equipment')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-crafting')
        .setLabel('🔨 Crafting')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-inventory')
        .setLabel('🎒 Inventory')
        .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-professions')
        .setLabel('💼 Professions')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-stats-talents')
        .setLabel('📊 Stats & Talents')
        .setStyle(ButtonStyle.Primary)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-back-to-hub')
        .setLabel('🏠 Back to Hub')
        .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2, row3];
  }

  /**
   * Create combat menu buttons
   */
  createCombatMenuButtons(player) {
    const level = player ? player.level : 1;
    const isTier2Plus = player && player.worldsUnlocked && player.worldsUnlocked.length >= 2;
    
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-combat-training')
        .setLabel('⚔️ Training')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-dungeons')
        .setLabel(level >= 10 ? '🏰 Dungeons' : '🔒 Dungeons (Lv 10)')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(level < 10),
      new ButtonBuilder()
        .setCustomId('rpg-world-boss')
        .setLabel('👹 World Boss')
        .setStyle(ButtonStyle.Danger)
    );

    const row1b = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-arena')
        .setLabel(level >= 5 ? '🏟️ Arena (Quick Battle)' : '🔒 Arena (Lv 5)')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(level < 5)
    );

    const components = [row1, row1b];

    // Add roguelike button for Tier 2+ players
    if (isTier2Plus) {
      const row1c = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike')
          .setLabel('🎲 Roguelike Dungeon')
          .setStyle(ButtonStyle.Success)
      );
      components.push(row1c);
    }

    // Add Niflheim Tower button (level 150+ required)
    const row1d = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-tower')
        .setLabel(level >= 150 ? '❄️ Niflheim Tower (100 Floors)' : '🔒 Niflheim Tower (Lv 150)')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(level < 150)
    );
    components.push(row1d);

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-back-to-hub')
        .setLabel('🏠 Back to Hub')
        .setStyle(ButtonStyle.Secondary)
    );

    components.push(row2);
    return components;
  }

  /**
   * Create quests menu buttons
   */
  createQuestsMenuButtons() {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-quests')
        .setLabel('📜 Quests')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-goals')
        .setLabel('🎯 Goals')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-story-log')
        .setLabel('📖 Story Log')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-back-to-hub')
        .setLabel('🏠 Back to Hub')
        .setStyle(ButtonStyle.Secondary)
    );

    return [row];
  }

  /**
   * Create economy hub buttons
   */
  createEconomyMenuButtons() {
    const row1 = new ActionRowBuilder().addComponents(
      // new ButtonBuilder()
      //   .setCustomId('rpg-shop')
      //   .setLabel('🛍️ Shop')
      //   .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-inventory')
        .setLabel('🎒 Inventory')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-crafting')
        .setLabel('🔨 Crafting')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-professions')
        .setLabel('💼 Professions')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-market')
        .setLabel('🏪 Player Market')
        .setStyle(ButtonStyle.Success)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-gambling')
        .setLabel('🎰 Gambling')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-back-to-hub')
        .setLabel('🏠 Back to Hub')
        .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
  }

  /**
   * Handle button interactions
   */
  async handleButtonInteraction(interaction) {
    // Check if interaction is expired (Discord expires after 3 seconds for button clicks)
    const interactionAge = Date.now() - interaction.createdTimestamp;
    if (interactionAge > 2900) {
      console.warn(`[Interaction] Expired interaction ignored: ${interaction.customId || 'unknown'} (age: ${interactionAge}ms)`);
      return; // Silently ignore - interaction too old
    }

    // Prevent other players from interacting with your embeds
    const player = this.playerManager.getPlayer(interaction.user.id);

    if (!player) {
      await interaction.reply({
        content: 'You need to run /rpg first!',
        ephemeral: true,
      });
      return;
    }

    // Safety check: Clear stale combat flags on every interaction
    this.clearStaleCombatFlag(player);
    
    // Cap existing potion buffs to new limits (retroactive fix)
    this.capPotionBuffs(player);

    // Ensure auto-gathering is running if it should be
    this.autoGatherManager.ensureGatheringActive(player);

    const customId = interaction.customId;
    const isQuestAction =
      customId === 'rpg-quests' ||
      customId === 'rpg-quests-menu' ||
      customId === 'rpg-quest-back' ||
      customId.startsWith('rpg-quest-tab-') ||
      customId.startsWith('rpg-quest-start-') ||
      customId.startsWith('rpg-quest-view-detail-') ||
      customId.startsWith('rpg-quest-choice-') ||
      customId.startsWith('rpg-quest-');

    // Check ownership - prevent users from clicking other people's menus
    const messageOwnerId = this.activeMenus.get(interaction.message.id)?.ownerId;
    if (!isQuestAction && messageOwnerId && messageOwnerId !== interaction.user.id) {
      await interaction.reply({
        content: '❌ This is not your menu! Use `/rpg` to create your own.',
        ephemeral: true,
      });
      return;
    }

    // Auto-delete previous menu when opening a new one (prevent duplicate instances)
    // Do this in background - don't await, don't block button response
    const lastMenuData = this.activeMenus.get(interaction.user.id);
    if (lastMenuData?.messageId && lastMenuData?.channelId && lastMenuData.messageId !== interaction.message?.id) {
      // Fire and forget - delete in background
      setImmediate(() => {
        try {
          const channel = interaction.client.channels.cache.get(lastMenuData.channelId);
          if (channel) {
            channel.messages.fetch(lastMenuData.messageId)
              .then(message => {
                if (message && message.id !== interaction.message?.id) {
                  message.delete().catch(() => null);
                }
              })
              .catch(() => null);
          }
        } catch (error) {
          // Silently fail
        }
      });
    }

    // Check if this player owns the interaction (player created the menu)
    if (!player.characterCreated) {
      const isNarrativeChoice = customId.startsWith('rpg-narrative-');
      const isClassSelect = customId.startsWith('rpg-select-') && !customId.startsWith('rpg-select-profession');
      const isProfessionSelect = customId === 'rpg-profession-initial-select' || customId === 'rpg-select-profession';
      if (!isNarrativeChoice && !isClassSelect && !isProfessionSelect) {
        const embed = UIBuilder.createClassSelectionEmbed();
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-narrative-defender')
            .setLabel('1. Stand Your Ground')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('rpg-narrative-striker')
            .setLabel('2. Strike First')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('rpg-narrative-tactician')
            .setLabel('3. Study Patterns')
            .setStyle(ButtonStyle.Success)
        );

        await this.updateInteractionWithTracking(interaction, {
          content: 'Create your character by choosing a starter path:',
          embeds: [embed],
          components: [buttons],
        });
        return;
      }
    }

    if (customId.startsWith('rpg-craft-')) {
      const recipeId = customId.replace('rpg-craft-', '');
      await this.handleCraftRecipe(interaction, player, recipeId);
      return;
    }

    if (customId.startsWith('rpg-use-potion-qty-')) {
      // Format: rpg-use-potion-qty-{potionId}-{quantity}
      const parts = customId.replace('rpg-use-potion-qty-', '').split('-');
      const quantity = parseInt(parts.pop()); // Last part is the quantity
      const potionId = parts.join('-'); // Rest is the potion ID
      
      if (!potionId || !quantity) {
        await interaction.reply({ content: 'Invalid potion or quantity.', ephemeral: true });
        return;
      }
      
      await this.handleUsePotionMultiple(interaction, player, potionId, quantity);
      return;
    }

    if (customId === 'rpg-back-to-gather') {
      await this.handleGatherMenu(interaction, player);
      return;
    }

    if (customId === 'rpg-gather-status') {
      await this.handleGatherStatus(interaction, player);
      return;
    }

    if (customId.startsWith('rpg-autogather-')) {
      const param = customId.replace('rpg-autogather-', '');
      
      // Check if it's an area-based gather (format: rpg-autogather-area-{areaId})
      if (param.startsWith('area-')) {
        const areaId = param.replace('area-', '');
        await this.handleAutoGatherFromArea(interaction, player, areaId);
      } else {
        // Skill-based gather (legacy)
        const skillId = param;
        await this.handleStartAutoGather(interaction, player, skillId);
      }
      return;
    }

    if (customId === 'rpg-stop-autogather') {
      await this.handleStopAutoGather(interaction, player);
      return;
    }

    if (customId === 'rpg-gather-status-overview') {
      await this.handleGatherDetailedOverview(interaction, player);
      return;
    }

    if (customId === 'rpg-gather-status') {
      await this.handleGatherStatus(interaction, player);
      return;
    }

    if (customId === 'rpg-gather-choose-area') {
      await this.handleGatheringAreaSelect(interaction, player);
      return;
    }

    if (customId === 'rpg-gather-rewards') {
      await this.handleGatheringRewards(interaction, player);
      return;
    }

    if (customId === 'rpg-gather-area-details-back') {
      await this.handleGatheringAreaSelect(interaction, player);
      return;
    }

    if (customId === 'rpg-gathering-tools' || customId === 'rpg-manage-tools') {
      await this.handleGatheringTools(interaction, player);
      return;
    }

    if (customId.startsWith('rpg-buy-gathering-tool-')) {
      const tier = parseInt(customId.replace('rpg-buy-gathering-tool-', ''));
      await this.handleBuyGatheringTool(interaction, player, tier);
      return;
    }

    if (customId === 'rpg-back-to-gather') {
      await this.handleGatherMenu(interaction, player);
      return;
    }

    if (customId.startsWith('rpg-gather-area-drops-')) {
      const areaId = customId.replace('rpg-gather-area-drops-', '').trim();
      await this.handleGatheringAreaDrops(interaction, player, areaId);
      return;
    }

    if (customId.startsWith('rpg-gather-area-details-')) {
      const areaId = customId.replace('rpg-gather-area-details-', '');
      await this.handleGatheringAreaDetails(interaction, player, areaId);
      return;
    }

    if (customId.startsWith('rpg-gather-area-')) {
      const areaId = customId.replace('rpg-gather-area-', '');
      const area = getGatheringArea(areaId);
      
      if (!area) {
        await interaction.reply({ content: '❌ Area not found.', ephemeral: true });
        return;
      }
      
      player.currentGatherArea = areaId;
      
      // Remove 'gather' from history if it's there (since we're going back to gather)
      if (player.menuHistory && player.menuHistory.length > 0 && 
          player.menuHistory[player.menuHistory.length - 1] === 'gather') {
        player.menuHistory.pop();
      }
      
      this.persistPlayer(player);
      
      // Update the interaction instead of replying - skip tracking to prevent history loop
      await this.handleGatherMenu(interaction, player, true);
      return;
    }

    if (customId.startsWith('rpg-gather-again-')) {
      const skillId = customId.replace('rpg-gather-again-', '');
      await this.handleGather(interaction, player, skillId);
      return;
    }

    if (customId.startsWith('rpg-crafting-page-')) {
      const page = parseInt(customId.replace('rpg-crafting-page-', ''), 10) || 0;
      await this.handleCraftingPage(interaction, player, page);
      return;
    }

    if (customId.startsWith('rpg-talents-page-')) {
      const page = parseInt(customId.replace('rpg-talents-page-', ''), 10) || 1;
      player.currentTalentPage = page;
      this.persistPlayer(player);
      await this.handleTalents(interaction, player, true);
      return;
    }

    switch (customId) {
      case 'rpg-gather':
        await this.handleGatherMenu(interaction, player);
        break;
      case 'rpg-quests-menu':
        await this.handleQuestsMenu(interaction, player);
        break;
      case 'rpg-shop':
        await this.handleShop(interaction, player);
        break;
      case 'rpg-gather-mining':
        await this.handleStartAutoGather(interaction, player, 'mining');
        break;
      case 'rpg-gather-chopping':
        await this.handleStartAutoGather(interaction, player, 'chopping');
        break;
      case 'rpg-gather-gathering':
        await this.handleStartAutoGather(interaction, player, 'gathering');
        break;
      case 'rpg-adventure':
        await this.handleAdventure(interaction, player);
        break;
      case 'rpg-class-select':
        await this.handleClassSelection(interaction, player);
        break;
      case 'rpg-character':
        await this.handlePlayerMenu(interaction, player);
        break;
      case 'rpg-hub':
        await this.handlePlayerMenu(interaction, player);
        break;
      case 'rpg-character-sheet':
        await this.handleCharacterSheet(interaction, player);
        break;
      case 'rpg-skills':
        await this.handleSkills(interaction, player);
        break;
      case 'rpg-talents':
        await this.handleTalents(interaction, player);
        break;
      case 'rpg-equipment':
        await this.handleEquipment(interaction, player);
        break;
      case 'rpg-manage-equipment':
        await this.handleManageEquipment(interaction, player);
        break;
      case 'rpg-equipment-sets':
        await this.handleEquipmentSets(interaction, player);
        break;
      case 'rpg-dismantle-multiple-start':
        await this.handleDismantleMultipleStart(interaction, player);
        break;
      case 'rpg-dismantle-multiple-confirm':
        await this.handleDismantleMultipleConfirm(interaction, player);
        break;
      case 'rpg-remove-enchant-start':
        await this.handleRemoveEnchantStart(interaction, player);
        break;
      case 'rpg-professions':
        await this.handleProfessions(interaction, player);
        break;
      case 'rpg-alchemy':
        await this.handleAlchemy(interaction, player);
        break;
      case 'rpg-enchant':
        await this.handleEnchant(interaction, player);
        break;
      case 'rpg-auto-enchant-menu':
        await this.handleAutoEnchantMenu(interaction, player);
        break;
      case 'rpg-crafting':
        await this.handleCrafting(interaction, player);
        break;
      case 'rpg-combat-menu':
        await this.handleCombatMenu(interaction, player);
        break;
      case 'rpg-arena':
        await this.handleArena(interaction, player);
        break;
      case 'rpg-arena-bot':
        await this.handleArenaBotFight(interaction, player);
        break;
      case 'rpg-arena-player':
        await this.handleArenaPlayerFight(interaction, player);
        break;
      case 'rpg-arena-shop':
        await this.handleArenaShop(interaction, player);
        break;
      case 'rpg-quick-battle':
        await this.handleArena(interaction, player);
        break;
      case 'rpg-world-boss':
        await this.handleWorldBoss(interaction, player);
        break;
      case 'rpg-combat-training':
        await this.handleCombatTraining(interaction, player);
        break;
      case 'rpg-daily-rewards':
        await this.handleDailyRewards(interaction, player);
        break;
      case 'rpg-daily-claim':
        await this.handleDailyRewardClaim(interaction, player, { restore: false });
        break;
      case 'rpg-daily-restore':
        await this.handleDailyRewardClaim(interaction, player, { restore: true });
        break;
      case 'rpg-quests':
        await this.handleQuests(interaction, player);
        break;
      case 'rpg-goals':
        await this.handleHelpMenu(interaction, player);
        break;
      case 'rpg-inventory':
        await this.handleInventory(interaction, player);
        break;
      case 'rpg-filter-materials':
        await this.handleInventoryFilter(interaction, player, 'material');
        break;
      case 'rpg-filter-consumables':
        await this.handleInventoryFilter(interaction, player, 'consumable');
        break;
      case 'rpg-filter-enchants':
        await this.handleInventoryFilter(interaction, player, 'enchant');
        break;
      case 'rpg-filter-all':
        await this.handleInventory(interaction, player);
        break;
      case 'rpg-use-potion':
        await this.handleUsePotionSelector(interaction, player);
        break;
      case 'rpg-open-lootbox':
        await this.handleOpenLootboxMenu(interaction, player);
        break;
      case 'rpg-inventory-rarity-select':
        const rarity = interaction.values?.[0];
        if (!rarity) {
          await interaction.reply({ content: 'No rarity selected.', ephemeral: true });
          return;
        }
        await this.handleInventoryFilterByRarity(interaction, player, rarity);
        break;
      case 'rpg-inventory-profession-select':
        const profession = interaction.values?.[0];
        if (!profession) {
          await interaction.reply({ content: 'No profession selected.', ephemeral: true });
          return;
        }
        await this.handleInventoryFilterByProfession(interaction, player, profession);
        break;
      case 'rpg-dismantle-select-item':
        const selectedItemId = interaction.values?.[0];
        if (selectedItemId) {
          await this.handleDismantleItemOverview(interaction, player, selectedItemId);
        }
        break;
      case 'rpg-dungeons':
        await this.handleDungeons(interaction, player);
        break;
      case 'rpg-roguelike':
        await this.handleRoguelikeStart(interaction, player);
        break;
      case 'rpg-roguelike-start-new':
        await this.handleRoguelikeStartNew(interaction, player);
        break;
      case 'rpg-roguelike-exit':
        await this.handleRoguelikeExit(interaction, player);
        break;
      case 'rpg-roguelike-boss-fight':
        await this.handleRoguelikeBossFight(interaction, player);
        break;
      case 'rpg-roguelike-skill-accept':
        await this.handleRoguelikeSkillAccept(interaction, player);
        break;
      case 'rpg-roguelike-skill-decline':
        await this.handleRoguelikeSkillDecline(interaction, player);
        break;
      case 'rpg-roguelike-upgrades':
        await this.handleRoguelikeUpgrades(interaction, player);
        break;
      case 'rpg-roguelike-stats':
        await this.handleRoguelikeStats(interaction, player);
        break;
      case 'rpg-roguelike-continue':
        await this.handleRoguelikeFloor(interaction, player);
        break;
      case 'rpg-tower':
        await this.handleTowerStart(interaction, player);
        break;
      case 'rpg-tower-enter':
        await this.handleTowerEnter(interaction, player);
        break;
      case 'rpg-tower-reset':
        await this.handleTowerReset(interaction, player);
        break;
      case 'rpg-tower-fight':
        await this.handleTowerFight(interaction, player);
        break;
      case 'rpg-tower-continue':
        await this.handleTowerContinue(interaction, player);
        break;
      case 'rpg-tower-status':
        await this.handleTowerStatus(interaction, player);
        break;
      case 'rpg-roguelike-shop-catalog':
        await this.handleRoguelikeShopCatalog(interaction, player);
        break;
      default:
        // Handle dynamic button IDs
        if (customId.startsWith('rpg-roguelike-upgrade-view-')) {
          const upgradeId = customId.replace('rpg-roguelike-upgrade-view-', '');
          await this.handleRoguelikeUpgradeView(interaction, player, upgradeId);
        } else if (customId.startsWith('rpg-roguelike-upgrade-buy-')) {
          const upgradeId = customId.replace('rpg-roguelike-upgrade-buy-', '');
          await this.handleRoguelikeUpgradePurchase(interaction, player, upgradeId);
        } else if (customId.startsWith('rpg-roguelike-upgrades-category-')) {
          const category = customId.replace('rpg-roguelike-upgrades-category-', '');
          await this.handleRoguelikeUpgrades(interaction, player, category);
        } else if (customId.startsWith('rpg-roguelike-skill-choose-')) {
          const parts = customId.replace('rpg-roguelike-skill-choose-', '').split('-');
          const skillIndex = parseInt(parts.pop(), 10);
          const roomId = parts.join('-');
          await this.handleRoguelikeSkillChoose(interaction, player, roomId, skillIndex);
        } else if (customId.startsWith('rpg-roguelike-skill-decline-')) {
          const roomId = customId.replace('rpg-roguelike-skill-decline-', '');
          await this.handleRoguelikeSkillDecline(interaction, player, roomId);
        } else if (customId.startsWith('rpg-roguelike-miniboss-fight-')) {
          const roomId = customId.replace('rpg-roguelike-miniboss-fight-', '');
          await this.handleRoguelikeMiniBossFight(interaction, player, roomId);
        } else if (customId.startsWith('rpg-roguelike-room-')) {
          const roomId = customId.replace('rpg-roguelike-room-', '');
          await this.handleRoguelikeRoomSelect(interaction, player, roomId);
        }
        break;
      case 'rpg-roguelike-shop-back':
        // Return to shop room
        const room = player.roguelikeState?.currentFloorRooms?.find(r => r.type === 'shop');
        if (room) {
          await this.handleRoguelikeShopRoom(interaction, player, room);
        }
        break;
      case 'rpg-roguelike-shop-leave':
        // Leave shop and advance floor
        if (player.roguelikeState) {
          const roguelike = new RoguelikeManager();
          const actionResults = {};
          roguelike.completeRoom(player.roguelikeState, { type: 'shop' }, actionResults);
          player.roguelikeState.currentFloor++;
          await this.playerManager.savePlayer(player);
          await this.handleRoguelikeFloor(interaction, player);
        }
        break;
    }

    // Handle shop buy buttons
    if (customId.startsWith('rpg-roguelike-shop-buy_')) {
      const itemIndex = parseInt(customId.replace('rpg-roguelike-shop-buy_', ''));
      await this.handleRoguelikeShopBuy(interaction, player, itemIndex);
      return;
    }

    // Handle dynamic button IDs (dungeon-normal, dungeon-boss, etc)
    if (customId.startsWith('rpg-dungeon-normal-')) {
      const dungeonId = customId.replace('rpg-dungeon-normal-', '');
      await this.handleNormalDungeonStart(interaction, player, dungeonId);
      return;
    }

    if (customId.startsWith('rpg-dungeon-boss-')) {
      const dungeonId = customId.replace('rpg-dungeon-boss-', '');
      await this.handleBossDungeonStart(interaction, player, dungeonId);
      return;
    }

    if (customId.startsWith('rpg-dismantle-qty-')) {
      const parts = customId.replace('rpg-dismantle-qty-', '').split('-');
      const qty = parts[parts.length - 1];
      const itemId = parts.slice(0, -1).join('-');
      await this.handleDismantleAddQuantity(interaction, player, itemId, qty);
      return;
    }

    if (customId === 'rpg-dismantle-multiple-start') {
      await this.handleDismantleMultipleStart(interaction, player);
      return;
    }

    if (customId.startsWith('rpg-roguelike-room-')) {
      const roomId = customId.replace('rpg-roguelike-room-', '');
      await this.handleRoguelikeRoomSelect(interaction, player, roomId);
      return;
    }

    if (customId === 'rpg-dismantle-add-another') {
      const selection = this.dismantleSelections?.[player.id];
      if (!selection) {
        await interaction.reply({ content: '❌ Selection expired.', ephemeral: true });
        return;
      }

      const selectOptions = selection.equipment.slice(0, 25).map(eq => {
        const count = player.inventory.filter(i => i && i.id === eq.id && i.type === 'equipment').reduce((sum, i) => sum + (i.quantity || 1), 0);
        return {
          label: `${(eq.equipment?.name || 'Unknown').substring(0, 70)} (x${count})`,
          value: eq.id,
          description: `Rarity: ${eq.equipment?.rarity || 'Common'}`,
        };
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('rpg-dismantle-select-item')
        .setPlaceholder('Select another item')
        .addOptions(selectOptions)
        .setMinValues(1)
        .setMaxValues(1);

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      const queueSummary = Object.entries(selection.queue)
        .map(([id, qty]) => {
          const item = selection.equipment.find(e => e.id === id);
          const name = item?.equipment?.name || 'Unknown';
          return `📋 ${name} x${qty}`;
        })
        .join('\n');

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-dismantle-finish')
          .setLabel('✅ Dismantle All')
          .setStyle(ButtonStyle.Success)
          .setDisabled(Object.keys(selection.queue).length === 0),
        new ButtonBuilder()
          .setCustomId('rpg-dismantle-cancel')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('rpg-dismantle-multiple-start')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );

      const embed = new EmbedBuilder()
        .setColor(16743680)
        .setTitle('♻️ Add More Items')
        .setDescription(`**Current Queue:**\n${queueSummary || 'Empty'}\n\nSelect another item:`);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [selectRow, buttonRow],
      });
      return;
    }

    if (customId === 'rpg-dismantle-finish') {
      await this.handleDismantleFinish(interaction, player);
      return;
    }

    if (customId === 'rpg-dismantle-cancel') {
      try {
        // Clear selection
        if (this.dismantleSelections) {
          delete this.dismantleSelections[player.id];
        }
        
        // Defer and update to cancel
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferUpdate();
        }
        
        await interaction.editReply({ 
          content: '❌ Cancelled multi-dismantle.',
          embeds: [],
          components: []
        });
      } catch (err) {
        console.error('Error in rpg-dismantle-cancel:', err);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Cancelled.', ephemeral: true });
          }
        } catch (e) {
          console.error('Failed to send cancel response:', e);
        }
      }
      return;
    }

    if (customId.startsWith('rpg-remove-enchant-confirm-')) {
      const slot = customId.replace('rpg-remove-enchant-confirm-', '');
      await this.handleRemoveEnchantConfirm(interaction, player, slot);
      return;
    }

    if (customId.startsWith('rpg-auto-enchant-confirm-')) {
      const payload = customId.replace('rpg-auto-enchant-confirm-', '');
      const parts = payload.split('-');
      const targetLevel = parts.pop();
      const enchantId = parts.join('-');
      player.confirmedAutoEnchant = true;
      this.persistPlayer(player);
      await this.handleEnchantCraft(interaction, player, enchantId, targetLevel);
      return;
    }

    // Continue with remaining cases
    switch (customId) {
      case 'rpg-equip-best-weapon':
        await this.handleEquipBestWeapon(interaction, player);
        break;
      case 'rpg-upgrade-weapon':
        await this.handleUpgradeWeapon(interaction, player);
        break;
      case 'rpg-crafting-upgrade':
        // Professions menu upgrade button - redirects to gear upgrade
        await this.handleUpgradeGear(interaction, player);
        break;
      case 'rpg-master-blacksmith-upgrade':
        await this.handleMasterBlacksmithUpgrade(interaction, player);
        break;
      case 'rpg-gem-socketing':
        await this.handleGemSocketing(interaction, player);
        break;
      case 'rpg-stats':
        await this.handleStats(interaction, player);
        break;
      case 'rpg-stats-talents':
        await this.handleStatsAndTalents(interaction, player);
        break;
      case 'rpg-combat-next-turn':
        await this.handleCombatNextTurn(interaction, player);
        break;
      case 'rpg-combat-skill-menu':
        await this.handleCombatSkillMenu(interaction, player);
        break;
      case 'rpg-combat-gear-set':
        await this.handleCombatGearSet(interaction, player);
        break;
      case 'rpg-combat-stance-menu':
        await this.handleCombatStanceMenu(interaction, player);
        break;
      case 'rpg-combat-refresh':
        await this.handleCombatRefresh(interaction, player);
        break;
      case 'rpg-combat-auto':
        await this.handleCombatAuto(interaction, player);
        break;
      case 'rpg-combat-manual':
        await this.handleCombatManual(interaction, player);
        break;
      case 'rpg-combat-action-attack':
        await this.handleCombatActionAttack(interaction, player);
        break;
      case 'rpg-combat-action-defend':
        await this.handleCombatActionDefend(interaction, player);
        break;
      case 'rpg-combat-forfeit':
        await this.handleCombatForfeit(interaction, player);
        break;
      case 'rpg-enter-world':
        await this.handleEnterWorld(interaction, player);
        break;
      case 'rpg-worlds':
        await this.handleWorldTravel(interaction, player);
        break;
      case 'rpg-guild':
        await this.handleGuild(interaction, player);
        break;
      case 'rpg-guild-create':
        // Show guild creation modal
        const guildModal = new ModalBuilder()
          .setCustomId('rpg-guild-create-modal')
          .setTitle('Create Your Guild');
        const guildNameInput = new TextInputBuilder()
          .setCustomId('guild_name')
          .setLabel('Guild Name (3-32 characters)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('The Legendary Heroes')
          .setRequired(true)
          .setMinLength(3)
          .setMaxLength(32);
        const guildTagInput = new TextInputBuilder()
          .setCustomId('guild_tag')
          .setLabel('Guild Tag (2-6 characters)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('HERO')
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(6);
        const guildDescInput = new TextInputBuilder()
          .setCustomId('guild_description')
          .setLabel('Guild Description')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('We are a guild of legendary heroes...')
          .setRequired(false);
        const row1 = new ActionRowBuilder().addComponents(guildNameInput);
        const row2 = new ActionRowBuilder().addComponents(guildTagInput);
        const row3 = new ActionRowBuilder().addComponents(guildDescInput);
        guildModal.addComponents(row1, row2, row3);
        await interaction.showModal(guildModal);
        return;
      case 'rpg-guild-search':
        await this.handleGuildSearch(interaction, player);
        break;
      case 'rpg-guild-members':
        await this.handleGuildMembers(interaction, player);
        break;
      case 'rpg-guild-manage':
        await this.handleGuildManagement(interaction, player);
        break;
      case 'rpg-guild-bosses':
        await this.handleGuildBosses(interaction, player);
        break;
      case 'rpg-guild-buffs':
        await this.handleGuildBuffs(interaction, player);
        break;
      case 'rpg-guild-donate':
        // Show donation modal
        const donateModal = new ModalBuilder()
          .setCustomId('rpg-guild-donate-modal')
          .setTitle('Donate to Guild Treasury');
        const donateInput = new TextInputBuilder()
          .setCustomId('amount')
          .setLabel('Amount to donate (gold)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('1000')
          .setRequired(true);
        const donateRow = new ActionRowBuilder().addComponents(donateInput);
        donateModal.addComponents(donateRow);
        await interaction.showModal(donateModal);
        return;
      case 'rpg-guild-leave':
        await this.handleGuildLeaveConfirm(interaction, player);
        break;
      case 'rpg-guild-settings':
        await this.handleGuildSettings(interaction, player);
        break;
      case 'rpg-guild-achievements':
        await this.handleGuildAchievements(interaction, player);
        break;
      case 'rpg-guild-claim-achievements':
        await this.handleClaimGuildAchievements(interaction, player);
        break;
      case 'rpg-guild-achievement-details':
        await this.handleGuildAchievementDetails(interaction, player);
        break;
      case 'rpg-guild-rankings':
        await this.handleGuildRankings(interaction, player);
        break;
      case 'rpg-guild-roles':
        await this.handleGuildRoles(interaction, player);
        break;
      case 'rpg-economy-menu':
        await this.handleEconomyMenu(interaction, player);
        break;
      case 'rpg-market':
        await this.handleMarket(interaction, player);
        break;
      case 'rpg-market-browse':
        await this.handleMarketBrowse(interaction, player);
        break;
      case 'rpg-market-sell':
        await this.handleMarketSellMenu(interaction, player);
        break;
      case 'rpg-market-my-listings':
        await this.handleMarketMyListings(interaction, player);
        break;
      case 'rpg-gambling':
        await this.handleGambling(interaction, player);
        break;
      case 'rpg-slots':
        await this.handleSlots(interaction, player);
        break;
      case 'rpg-slots-play-again':
        const lastBet = player.lastSlotsBet || 100;
        await this.playSlots(interaction, player, lastBet);
        break;
      case 'rpg-slots-custom':
        // Show modal for custom amount
        const modal = new ModalBuilder()
          .setCustomId('rpg-slots-custom-modal')
          .setTitle('Custom Bet Amount');
        const amountInput = new TextInputBuilder()
          .setCustomId('amount')
          .setLabel('Enter bet amount')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Enter amount in gold')
          .setRequired(true);
        const row = new ActionRowBuilder().addComponents(amountInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
        return;
      case 'rpg-coinflip':
        await this.handleCoinflip(interaction, player);
        break;
      case 'rpg-party-menu':
        await this.handlePartyMenu(interaction, player);
        break;
      case 'rpg-party-add':
        await this.handlePartyAdd(interaction, player);
        break;
      case 'rpg-party-remove':
        await this.handlePartyRemoveMenu(interaction, player);
        break;
      case 'rpg-party-active':
        await this.handlePartyActiveMenu(interaction, player);
        break;
      case 'rpg-progress-menu':
        await this.handleProgressMenu(interaction, player);
        break;
      case 'rpg-achievements':
        await this.handleAchievements(interaction, player);
        break;
      case 'rpg-collectibles':
        await this.handleCollectibles(interaction, player);
        break;
      case 'rpg-collectibles-view':
        await this.handleCollectiblesViewAll(interaction, player);
        break;
      case 'rpg-progress-leaderboards':
        await this.handleProgressLeaderboards(interaction, player);
        break;
      case 'rpg-titles-badges':
        await this.handleTitlesAndBadges(interaction, player);
        break;
      case 'rpg-titles-earned':
        await this.handleTitlesEarned(interaction, player);
        break;
      case 'rpg-titles-unearned':
        await this.handleTitlesUnearned(interaction, player);
        break;
      case 'rpg-badges-earned':
        await this.handleBadgesEarned(interaction, player);
        break;
      case 'rpg-badges-unearned':
        await this.handleBadgesUnearned(interaction, player);
        break;
      case 'rpg-qol-menu':
        await this.handleQOLMenu(interaction, player);
        break;
      case 'rpg-qol-tab-stats':
        await this.handleQOLStatsMenu(interaction, player);
        break;
      case 'rpg-qol-tab-combat':
        await this.handleQOLCombatMenu(interaction, player);
        break;
      case 'rpg-qol-tab-progress':
        await this.handleQOLProgressMenu(interaction, player);
        break;
      case 'rpg-qol-tab-gear':
        await this.handleQOLGearMenu(interaction, player);
        break;
      case 'rpg-qol-tab-utility':
        await this.handleQOLUtilityMenu(interaction, player);
        break;
      case 'rpg-qol-tab-guild':
        await this.handleQOLGuildMenu(interaction, player);
        break;
      case 'rpg-help':
        await this.handleHelpMenu(interaction, player);
        break;
      case 'rpg-narrative-defender':
      case 'rpg-narrative-striker':
      case 'rpg-narrative-tactician':
        await this.handleNarrativeChoice(interaction, player);
        break;
      case 'rpg-select-warrior':
      case 'rpg-select-mage':
      case 'rpg-select-rogue':
      case 'rpg-select-paladin':
        await this.handleClassSelect(interaction, player);
        break;
      case 'rpg-select-profession':
        await this.handleProfessionSelect(interaction, player);
        break;
      case 'rpg-back':
        await this.handleBackButton(interaction, player);
        break;
      case 'rpg-upgrade-confirm':
        if (player.confirmUpgrade) {
          await this.handleUpgradeGear(interaction, player);
        } else {
          await interaction.reply({ content: 'No upgrade confirmation pending.', ephemeral: true });
        }
        break;
      case 'rpg-upgrade-return':
        // Return to upgrade menu after completing upgrade
        await this.handleUpgradeGear(interaction, player);
        break;
      case 'rpg-back-to-hub':
        await this.handleBackToHub(interaction, player);
        break;
      case 'rpg-save-equipment-set':
        await this.handleSaveEquipmentSet(interaction, player);
        break;
      // QOL Feature Button Handlers
      case 'rpg-qol-combat-log':
        await this.handleCombatLog(interaction, player);
        break;
      case 'rpg-qol-boss-guide':
        await this.handleBossGuide(interaction, player);
        break;
      case 'rpg-qol-enemy-summary':
        await this.handleEnemySummary(interaction, player);
        break;
      case 'rpg-qol-combo-preview':
        await this.handleComboPreview(interaction, player);
        break;
      case 'rpg-qol-equipment-compare':
        await this.handleEquipmentComparison(interaction, player);
        break;
      case 'rpg-qol-damage-calc':
        await this.handleDamageCalculator(interaction, player);
        break;
      case 'rpg-qol-stats-timeline':
        await this.handleStatsTimeline(interaction, player);
        break;
      case 'rpg-qol-boss-tracker':
        await this.handleBossTracker(interaction, player);
        break;
      case 'rpg-qol-achievements':
        await this.handleAchievementProgress(interaction, player);
        break;
      case 'rpg-qol-class-guide':
        await this.handleClassMasteryGuide(interaction, player);
        break;
      case 'rpg-qol-env-tool':
        await this.handleEnvironmentTool(interaction, player);
        break;
      // Phase 2 QOL Features
      case 'rpg-qol-equipment-builds':
        await this.handleEquipmentSets(interaction, player);
        break;
      case 'rpg-qol-style-recommendation':
        await this.handleCombatStylesRecommendation(interaction, player);
        break;
      case 'rpg-qol-crit-display':
        await this.handleCriticalHitDisplay(interaction, player);
        break;
      case 'rpg-qol-damage-breakdown':
        await this.handleDamageBreakdown(interaction, player);
        break;
      case 'rpg-qol-milestones':
        await this.handleMilestoneNotifications(interaction, player);
        break;
      case 'rpg-qol-spell-wheel':
        await this.handleQuickSpellWheel(interaction, player);
        break;
      case 'rpg-qol-combo-viz':
        await this.handleComboVisualizer(interaction, player);
        break;
      case 'rpg-qol-env-predict':
        await this.handleEnvironmentPredictions(interaction, player);
        break;
      case 'rpg-qol-profession':
        await this.handleProfessionTips(interaction, player);
        break;
      case 'rpg-guild-leaderboard':
        await this.handleGuildLeaderboard(interaction, player);
        break;
      case 'rpg-guild-growth':
        await this.handleGuildGrowthChart(interaction, player);
        break;
      // Tier 1-4 Features
      case 'rpg-daily-quests':
        await this.handleDailyQuests(interaction, player);
        break;
      case 'rpg-damage-tracker':
        await this.handleDamageTracker(interaction, player);
        break;
      case 'rpg-boss-analyzer':
        await this.handleBossAnalyzer(interaction, player);
        break;
      case 'rpg-loot-analytics':
        await this.handleLootAnalytics(interaction, player);
        break;
      case 'rpg-skill-mastery':
        await this.handleSkillMastery(interaction, player);
        break;
      case 'rpg-favorite-items':
        await this.handleFavoriteItems(interaction, player);
        break;
      case 'rpg-notifications':
        await this.handleNotifications(interaction, player);
        break;
      case 'rpg-enemy-encyclopedia':
        await this.handleEnemyEncyclopedia(interaction, player);
        break;
      case 'rpg-auto-sell':
        await this.handleAutoSellSettings(interaction, player);
        break;
      case 'rpg-stat-comparison':
        await this.handleStatComparison(interaction, player);
        break;
      case 'rpg-timezone':
        await this.handleTimezoneSettings(interaction, player);
        break;
      case 'rpg-ui-theme':
        await this.handleUIThemeSettings(interaction, player);
        break;
      case 'rpg-session-stats':
        await this.handleSessionStats(interaction, player);
        break;
      case 'rpg-qol-back':
        await this.handleQOLMenu(interaction, player);
        break;
      case 'rpg-builds-save':
        // Show modal to save current equipment as a build
        const saveModal = new ModalBuilder()
          .setCustomId('rpg-builds-save-modal')
          .setTitle('Save Equipment Build');
        const buildNameInput = new TextInputBuilder()
          .setCustomId('build_name')
          .setLabel('Build Name (e.g., "Aggressive", "Defensive")')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('My Awesome Build')
          .setRequired(true)
          .setMaxLength(32);
        const buildRow = new ActionRowBuilder().addComponents(buildNameInput);
        saveModal.addComponents(buildRow);
        await interaction.showModal(saveModal);
        break;
      case 'rpg-builds-load':
        // Show select menu of saved builds
        const builds = this.equipmentBuilds.getBuilds(player.userId);
        if (builds.length === 0) {
          await interaction.reply({
            content: '❌ No builds saved yet! Use "Save Current" to create one.',
            ephemeral: true
          });
          return;
        }
        
        const buildSelectMenu = new StringSelectMenuBuilder()
          .setCustomId('rpg-builds-load-select')
          .setPlaceholder('Choose a build to load...')
          .addOptions(
            builds.map(build => ({
              label: build.name,
              value: build.name,
              emoji: '⚙️'
            }))
          );
        
        const buildSelectRow = new ActionRowBuilder().addComponents(buildSelectMenu);
        const buildEmbed = new EmbedBuilder()
          .setColor(0x00ccff)
          .setTitle('📂 **Load Equipment Build**')
          .setDescription('Select a build to equip');
        
        await this.updateInteractionWithTracking(interaction, {
          embeds: [buildEmbed],
          components: [buildSelectRow],
          ephemeral: true
        });
        break;
      case 'rpg-builds-delete':
        // Show select menu of builds to delete
        const deletableBuilds = this.equipmentBuilds.getBuilds(player.userId);
        if (deletableBuilds.length === 0) {
          await interaction.reply({
            content: '❌ No builds to delete.',
            ephemeral: true
          });
          return;
        }
        
        const deleteSelectMenu = new StringSelectMenuBuilder()
          .setCustomId('rpg-builds-delete-select')
          .setPlaceholder('Choose a build to delete...')
          .addOptions(
            deletableBuilds.map(build => ({
              label: build.name,
              value: build.name,
              emoji: '🗑️'
            }))
          );
        
        const deleteSelectRow = new ActionRowBuilder().addComponents(deleteSelectMenu);
        const deleteEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('🗑️ **Delete Equipment Build**')
          .setDescription('Select a build to permanently delete');
        
        await this.updateInteractionWithTracking(interaction, {
          embeds: [deleteEmbed],
          components: [deleteSelectRow],
          ephemeral: true
        });
        break;
      case 'rpg-guild-quests':
        await this.handleGuildQuestsMenu(interaction, player);
        break;
      case 'rpg-guild-daily':
      case 'rpg-guild-daily-refresh':
        await this.handleGuildDailyQuests(interaction, player);
        break;
      case 'rpg-guild-weekly':
        await this.handleGuildWeeklyQuests(interaction, player);
        break;
      case 'rpg-guild-limited':
        await this.handleGuildLimitedQuests(interaction, player);
        break;
      case 'rpg-guild-toggle-public':
        await this.handleGuildTogglePublic(interaction, player);
        break;
      case 'rpg-guild-toggle-application':
        await this.handleGuildToggleApplication(interaction, player);
        break;
      case 'rpg-guild-set-minlevel':
        // Show modal for minimum level
        const minLevelModal = new ModalBuilder()
          .setCustomId('rpg-guild-minlevel-modal')
          .setTitle('Set Minimum Level');
        const minLevelInput = new TextInputBuilder()
          .setCustomId('min_level')
          .setLabel('Minimum level required to join (1-100)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('10')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(3);
        const minLevelRow = new ActionRowBuilder().addComponents(minLevelInput);
        minLevelModal.addComponents(minLevelRow);
        await interaction.showModal(minLevelModal);
        return;
      default:
        // Handle auto-enchant target selection
        if (customId.startsWith('rpg-auto-enchant-target-')) {
          const targetLevel = parseInt(customId.replace('rpg-auto-enchant-target-', ''));
          const enchantId = player.pendingAutoEnchantType;
          
          if (!enchantId) {
            await interaction.reply({ 
              content: 'Please select an enchant type first from the dropdown menu.', 
              ephemeral: true 
            });
            return;
          }

          delete player.pendingAutoEnchantType;
          this.persistPlayer(player);
          
          // Now go to enchant craft with target level
          await this.handleEnchantCraft(interaction, player, enchantId, targetLevel);
          return;
        }
        // Handle enchant slot selection
        if (customId.startsWith('rpg-enchant-slot-')) {
          const payload = customId.replace('rpg-enchant-slot-', '');
          const knownSlots = this.getResolvedEquippedSlots(player).sort((a, b) => b.length - a.length);
          const matchedSlot = knownSlots.find(slotName => payload.startsWith(`${slotName}-`));
          const slot = matchedSlot || payload.split('-')[0];
          const remainingPayload = matchedSlot
            ? payload.slice(matchedSlot.length + 1)
            : payload.split('-').slice(1).join('-');
          
          // Check for target level pattern: enchantId-target{number}
          let enchantId = remainingPayload;
          let targetLevel = null;
          const targetMatch = remainingPayload.match(/^(.+)-target(\d+)$/);
          if (targetMatch) {
            enchantId = targetMatch[1];
            targetLevel = parseInt(targetMatch[2]);
          }

          if (!slot || !enchantId) {
            await interaction.reply({ content: 'Invalid enchant target selected.', ephemeral: true });
            return;
          }

          player.selectedEnchantSlot = slot;
          this.persistPlayer(player);
          await this.handleEnchantCraft(interaction, player, enchantId, targetLevel);
          return;
        }
        // Handle spell wheel click - Execute spell in combat
        if (customId.startsWith('rpg-spell-')) {
          const skillId = customId.replace('rpg-spell-', '');
          await this.handleSpellWheelClick(interaction, player, skillId);
          return;
        }
        // Handle upgrade slot selection
        if (customId.startsWith('rpg-upgrade-slot-')) {
          const slot = customId.replace('rpg-upgrade-slot-', '');
          player.selectedUpgradeSlot = slot;
          this.persistPlayer(player);
          await this.handleUpgradeGear(interaction, player);
          return;
        }
        if (customId.startsWith('rpg-achievement-claim-')) {
          const [, , , achievementId, tierId] = customId.split('-');
          await this.handleAchievementClaim(interaction, player, achievementId, tierId);
          return;
        }
        // Handle talent upgrade/downgrade
        if (customId.startsWith('rpg-talent-upgrade-max-')) {
          const talentId = customId.replace('rpg-talent-upgrade-max-', '');
          const talent = getTalent(talentId);
          if (talent) {
            if (!player.talents) player.talents = {};
            const currentRank = player.talents[talentId] || 0;
            const maxRank = talent.maxRank || 1;
            const points = player.talentPoints || 0;
            const ranksRemaining = Math.max(0, maxRank - currentRank);
            const spend = Math.min(points, ranksRemaining);
            if (spend <= 0) {
              await interaction.reply({ content: 'You have no talent points to spend.', ephemeral: true });
              return;
            }
            player.talents[talentId] = currentRank + spend;
            player.talentPoints -= spend;
            player.clearStatsCache();
            this.persistPlayer(player);
            await this.handleTalentUpgrade(interaction, player, talentId);
          }
          return;
        }

        if (customId.startsWith('rpg-talent-upgrade-')) {
          const talentId = customId.replace('rpg-talent-upgrade-', '');
          const talent = getTalent(talentId);
          if (talent) {
            if (!player.talents) player.talents = {};
            const currentRank = player.talents[talentId] || 0;
            const maxRank = talent.maxRank || 1;
            if (currentRank < maxRank) {
              if (!player.talentPoints || player.talentPoints <= 0) {
                await interaction.reply({ content: 'You have no talent points to spend.', ephemeral: true });
                return;
              }
              player.talents[talentId] = currentRank + 1;
              player.talentPoints -= 1;
              player.clearStatsCache();
              this.persistPlayer(player);
              await this.handleTalentUpgrade(interaction, player, talentId);
            }
          }
          return;
        }

        if (customId.startsWith('rpg-talent-downgrade-')) {
          const talentId = customId.replace('rpg-talent-downgrade-', '');
          const talent = getTalent(talentId);
          if (talent) {
            if (!player.talents) player.talents = {};
            const currentRank = player.talents[talentId] || 0;
            if (currentRank > 0) {
              player.talents[talentId] = currentRank - 1;
              if (player.talents[talentId] === 0) {
                delete player.talents[talentId];
              }
              this.persistPlayer(player);
              await this.handleTalentUpgrade(interaction, player, talentId);
            }
          }
          return;
        }

        // Handle quest tab buttons
        if (customId.startsWith('rpg-quest-tab-')) {
          const tabName = customId.replace('rpg-quest-tab-', '');
          player.questTab = tabName;
          await this.handleQuests(interaction, player, true);
          return;
        }

        if (customId.startsWith('rpg-open-lootbox-qty-')) {
          const payload = customId.replace('rpg-open-lootbox-qty-', '');
          const parts = payload.split('-');
          const quantity = parts.pop();
          const lootboxId = parts.join('-');
          await this.handleOpenLootbox(interaction, player, lootboxId, quantity);
          return;
        }

        // Handle confirm craft button
        if (customId.startsWith('rpg-confirm-craft-')) {
          const parts = customId.split('-');
          const recipeId = parts[3];
          let quantity;
          
          if (parts[4] === 'all') {
            // Calculate max craftable quantity
            const recipe = getRecipe(recipeId);
            if (recipe) {
              const baseMaterials = this.getAdjustedMaterials(recipe.materials);
              const adjustedMaterials = this.applyCostMultiplier(baseMaterials, this.getProfessionCostMultiplier(player));
              
              quantity = 1;
              for (let i = 2; i <= 100; i++) {
                const multipliedMats = {};
                for (const [matId, qty] of Object.entries(adjustedMaterials)) {
                  multipliedMats[matId] = qty * i;
                }
                if (!this.hasMaterials(player, multipliedMats)) {
                  quantity = i - 1;
                  break;
                }
                if (i === 100) quantity = 100;
              }
            } else {
              quantity = 1;
            }
          } else {
            quantity = parseInt(parts[4]) || 1;
          }
          
          await this.handleCraftRecipe(interaction, player, recipeId, quantity);
          return;
        }

        // Handle alchemy brew confirmation
        if (customId.startsWith('rpg-confirm-brew-')) {
          const parts = customId.split('-');
          const recipeId = parts[3];
          let quantity;
          
          if (parts[4] === 'max') {
            // Calculate max brewable quantity
            const recipe = getRecipe(recipeId);
            if (recipe) {
              const hasBotanic = player.professions?.includes('botanic');
              const baseMaterials = this.getAdjustedMaterials(recipe.materials);
              const costMultiplier = this.getProfessionCostMultiplier(player) * (hasBotanic ? 1 : 1.5);
              const adjustedMaterials = this.applyCostMultiplier(baseMaterials, costMultiplier);
              
              quantity = 1;
              for (let i = 2; i <= 100; i++) {
                const multipliedMats = {};
                for (const [matId, qty] of Object.entries(adjustedMaterials)) {
                  multipliedMats[matId] = qty * i;
                }
                if (!this.hasMaterials(player, multipliedMats)) {
                  quantity = i - 1;
                  break;
                }
                if (i === 100) quantity = 100;
              }
            } else {
              quantity = 1;
            }
          } else {
            quantity = parseInt(parts[4]) || 1;
          }
          
          await this.handleAlchemyBrewWithQuantity(interaction, player, recipeId, quantity);
          return;
        }

        // Handle slots betting
        if (customId.startsWith('rpg-slots-bet-')) {
          const amount = parseInt(customId.replace('rpg-slots-bet-', ''));
          await this.playSlots(interaction, player, amount, false);
          return;
        }

        if (customId === 'rpg-slots-allin') {
          const allInAmount = player.gold || 0;
          if (allInAmount > 0) {
            await this.playSlots(interaction, player, allInAmount, true);
          }
          return;
        }

        // Handle coinflip betting
        if (customId.startsWith('rpg-coinflip-bet-')) {
          const parts = customId.replace('rpg-coinflip-bet-', '').split('-');
          const amount = parseInt(parts[0]);
          const side = parts[1]; // 'heads' or 'tails'
          await this.playCoinflip(interaction, player, amount, side);
          return;
        }

        // Handle coinflip choice selection
        if (customId.startsWith('rpg-coinflip-choice-')) {
          const amount = parseInt(customId.replace('rpg-coinflip-choice-', ''));
          await this.handleCoinflipChoice(interaction, player, amount);
          return;
        }

        // Handle quest back button
        if (customId === 'rpg-quest-back') {
          await this.handleQuests(interaction, player, true);
          return;
        }

        // Handle quest start buttons
        if (customId.startsWith('rpg-quest-start-')) {
          const questId = customId.replace('rpg-quest-start-', '');
          await this.handleStartQuestFromDetail(interaction, player, questId);
          return;
        }

        // Handle quest view detail buttons (for quest chains)
        if (customId.startsWith('rpg-quest-view-detail-')) {
          const questId = customId.replace('rpg-quest-view-detail-', '');
          await this.handleQuestDetail(interaction, player, questId);
          return;
        }

        // Handle quest chain branch selection (route to next quest)
        if (customId.startsWith('rpg-quest-chain-choice-')) {
          const parts = customId.replace('rpg-quest-chain-choice-', '').split('-');
          const branchIdx = parseInt(parts[parts.length - 1]);
          const questId = parts.slice(0, -1).join('-');
          await this.handleQuestChainBranchSelection(interaction, player, questId, branchIdx);
          return;
        }

        // Handle quest choice buttons
        if (customId.startsWith('rpg-quest-choice-')) {
          const parts = customId.replace('rpg-quest-choice-', '').split('-');
          const questId = parts.slice(0, -1).join('-');
          const branchId = parts[parts.length - 1];
          await this.handleQuestChoiceSelection(interaction, player, questId, branchId);
          return;
        }

        // Handle world travel buttons
        if (customId.startsWith('rpg-travel-')) {
          const worldId = customId.replace('rpg-travel-', '');
          await this.handleTravelToWorld(interaction, player, worldId);
          return;
        }

        // Handle guild buff bulk purchases
        if (customId.startsWith('rpg-guild-buff-buy-qty-')) {
          const parts = customId.replace('rpg-guild-buff-buy-qty-', '').split('-');
          const quantity = parseInt(parts[parts.length - 1]);
          const action = parts.slice(0, -1).join('-');
          
          if (!action || !quantity || quantity <= 0) {
            await interaction.reply({ content: '❌ Invalid purchase quantity.', ephemeral: true });
            return;
          }
          
          await this.handleGuildBuffBulkPurchase(interaction, player, action, quantity);
          return;
        }

        // Handle guild buff purchases
        if (customId.startsWith('rpg-guild-buy-buff-')) {
          const buffType = customId.replace('rpg-guild-buy-buff-', '');
          const buffMap = {
            'xp': 'xpBonus',
            'gold': 'goldBonus',
            'shop': 'shopDiscount',
            'gathering': 'gatheringSpeed',
            'crafting': 'craftingSpeed',
            'boss': 'bossRewardBoost',
            'rare': 'rareDropRate',
            'damage': 'damageBonus',
            'defense': 'defenseBonus',
          };
          
          const buffKey = buffMap[buffType];
          if (!buffKey) {
            await interaction.reply({ content: '❌ Invalid buff type.', ephemeral: true });
            return;
          }

          const guild = this.guildManager.getPlayerGuild(player.userId);
          if (!guild) {
            await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
            return;
          }

          const member = guild.members[player.userId];
          if (member.role !== 'leader' && member.role !== 'officer') {
            await interaction.reply({ content: '❌ Only officers and leaders can purchase buffs!', ephemeral: true });
            return;
          }

          const cost = GUILD_BUFF_COSTS[buffKey];
          if (guild.gold < cost) {
            await interaction.reply({ content: `❌ Not enough guild gold! Need ${cost.toLocaleString()}g.`, ephemeral: true });
            return;
          }

          const result = this.guildManager.purchaseBuff(guild.id, player.userId, buffKey, cost);
          if (!result.success) {
            await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            return;
          }

          await interaction.reply({
            content: `✅ Purchased +1% ${buffKey} buff for ${cost.toLocaleString()}g!`,
            ephemeral: true,
          });

          setTimeout(() => {
            interaction.deleteReply().catch(() => {});
          }, 5000);

          // Refresh buffs page
          setTimeout(() => {
            this.handleGuildBuffs(interaction, player);
          }, 1000);
          return;
        }

        // Handle guild leave confirmation
        if (customId === 'rpg-guild-leave-confirm') {
          const result = this.guildManager.leaveGuild(player.userId);
          
          if (!result.success) {
            await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            return;
          }

          if (result.disbanded) {
            await interaction.reply({
              content: '✅ Guild disbanded successfully.',
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: '✅ You have left the guild.',
              ephemeral: true,
            });
          }

          setTimeout(() => {
            interaction.deleteReply().catch(() => {});
          }, 5000);

          // Return to guild browser
          setTimeout(() => {
            this.handleGuild(interaction, player);
          }, 1000);
          return;
        }

        // Handle guild join
        if (customId.startsWith('rpg-guild-join-')) {
          const guildId = customId.replace('rpg-guild-join-', '');
          
          // Get guild info first to check requirements
          const guild = this.guildManager.getGuild(guildId);
          if (!guild) {
            await interaction.reply({ content: '❌ Guild not found!', ephemeral: true });
            return;
          }

          // Check minimum level requirement
          if (player.level < guild.settings.minLevel) {
            await interaction.reply({ 
              content: `❌ You need to be at least level ${guild.settings.minLevel} to join this guild! You are level ${player.level}.`, 
              ephemeral: true 
            });
            return;
          }

          // Check if application is required
          if (guild.settings.requireApplication) {
            await interaction.reply({ 
              content: '❌ This guild requires an application. Please contact the guild leader for an invite.', 
              ephemeral: true 
            });
            return;
          }

          const result = this.guildManager.joinGuild(player.userId, guildId);

          if (!result.success) {
            await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            return;
          }

          await interaction.reply({
            content: `✅ You joined **[${result.guild.tag}] ${result.guild.name}**!`,
            ephemeral: true,
          });

          setTimeout(() => {
            interaction.deleteReply().catch(() => {});
          }, 5000);

          setTimeout(() => {
            this.handleGuild(interaction, player);
          }, 1000);
          return;
        }

        // Handle guild boss start
        if (customId.startsWith('rpg-guild-start-boss-')) {
          const bossId = customId.replace('rpg-guild-start-boss-', '');
          const boss = getGuildBoss(bossId);
          
          if (!boss) {
            await interaction.reply({ content: '❌ Invalid boss!', ephemeral: true });
            return;
          }

          const guild = this.guildManager.getPlayerGuild(player.userId);
          if (!guild) {
            await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
            return;
          }

          // Check tier restrictions - can only fight best boss or one tier below
          const levelInfo = getGuildLevel(guild.xp);
          const availableBosses = getAvailableGuildBosses(levelInfo.level);
          
          if (!availableBosses.includes(boss)) {
            await interaction.reply({ content: '❌ Your guild level is too low for this boss!', ephemeral: true });
            return;
          }

          // Get the highest tier boss available
          const highestBoss = availableBosses[availableBosses.length - 1];
          const secondHighestBoss = availableBosses.length > 1 ? availableBosses[availableBosses.length - 2] : null;
          
          // Player can only fight the highest tier or one below
          const canFight = boss.id === highestBoss.id || (secondHighestBoss && boss.id === secondHighestBoss.id);
          if (!canFight) {
            const tierText = secondHighestBoss ? `**${highestBoss.name}** or **${secondHighestBoss.name}**` : `**${highestBoss.name}**`;
            await interaction.reply({ content: `❌ You can only fight ${tierText} at your guild level!`, ephemeral: true });
            return;
          }

          const expiresAt = this.getNextGuildBossResetAt(Date.now());
          const bossData = { ...boss, expiresAt };
          const result = this.guildManager.startBoss(guild.id, player.userId, bossData);
          if (!result.success) {
            await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            return;
          }

          await interaction.reply({
            content: `🐉 **${boss.name}** has appeared! All guild members can now attack!`,
            ephemeral: false,
          });

          // Show boss fight UI
          setTimeout(() => {
            this.handleGuildBosses(interaction, player);
          }, 1000);
          return;
        }

        // Handle boss upgrade shops
        if (customId === 'rpg-guild-boss-stats-shop') {
          await this.handleGuildBossStatsShop(interaction, player);
          return;
        }
        if (customId === 'rpg-guild-boss-skills-shop') {
          await this.handleGuildBossSkillsShop(interaction, player);
          return;
        }
        if (customId === 'rpg-guild-boss-talents-shop') {
          await this.handleGuildBossTalentsShop(interaction, player);
          return;
        }
        if (customId === 'rpg-guild-boss-enchants-shop') {
          await this.handleGuildBossEnchantsShop(interaction, player);
          return;
        }

        // Handle buy stats from boss shop
        if (customId.startsWith('rpg-guild-boss-buy-stat-')) {
          const bossEssenceId = 'boss_essence';
          const statType = customId.replace('rpg-guild-boss-buy-stat-', '');
          const statMap = {
            'strength': { stat: 'strength', costGold: 500, costEssence: 1 },
            'defense': { stat: 'defense', costGold: 500, costEssence: 1 },
            'agility': { stat: 'agility', costGold: 500, costEssence: 1 },
            'intelligence': { stat: 'intelligence', costGold: 500, costEssence: 1 },
            'vitality': { stat: 'vitality', costGold: 500, costEssence: 1 },
            'wisdom': { stat: 'wisdom', costGold: 500, costEssence: 1 },
            'maxHp': { stat: 'maxHp', costGold: 1000, costEssence: 2 },
            'maxMana': { stat: 'maxMana', costGold: 1000, costEssence: 2 },
          };

          const stat = statMap[statType];
          if (!stat) {
            await interaction.reply({ content: '❌ Invalid stat!', ephemeral: true });
            return;
          }

          const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
          if (player.gold < stat.costGold || bossEssenceCount < stat.costEssence) {
            await interaction.reply({ content: `❌ You need ${stat.costGold}g + ${stat.costEssence} Boss Essence.`, ephemeral: true });
            return;
          }

          // Ensure bossStats has correct structure with all required properties
          const defaultBossStats = { strength: 5, defense: 5, agility: 5, intelligence: 5, vitality: 5, wisdom: 5, maxHp: 100, maxMana: 50 };
          if (!player.bossStats || typeof player.bossStats !== 'object' || player.bossStats.encounters !== undefined) {
            // Fix corrupted or old structure
            player.bossStats = { ...defaultBossStats };
          } else {
            // Ensure all properties exist with defaults
            for (const [key, value] of Object.entries(defaultBossStats)) {
              if (typeof player.bossStats[key] !== 'number') {
                player.bossStats[key] = value;
              }
            }
          }

          if (!player.bossShopSpent) {
            player.bossShopSpent = { gold: 0, bossEssence: 0 };
          }

          player.gold -= stat.costGold;
          this.trackGoldSpent(player, stat.costGold, 'shop');
          this.removeMaterialFromInventory(player, bossEssenceId, stat.costEssence);
          player.bossStats[stat.stat] += 1;
          player.bossShopSpent.gold = (player.bossShopSpent?.gold || 0) + stat.costGold;
          player.bossShopSpent.bossEssence = (player.bossShopSpent?.bossEssence || 0) + stat.costEssence;
          this.persistPlayer(player);
          this.clearStatsCache(player);

          await interaction.reply({ content: `✅ Purchased **+1 ${stat.stat}** for ${stat.costGold}g + ${stat.costEssence} Essence.`, ephemeral: true });
          setTimeout(() => {
            this.handleGuildBossStatDetail(interaction, player, statType);
          }, 500);
          return;
        }

        // Handle buy boss skill
        if (customId.startsWith('rpg-guild-boss-buy-skill-')) {
          const bossEssenceId = 'boss_essence';
          const skillId = customId.replace('rpg-guild-boss-buy-skill-', '');
          const skillItem = this.getBossSkillShopItems().find(item => item.id === skillId);
          if (!skillItem) {
            await interaction.reply({ content: '❌ Invalid skill!', ephemeral: true });
            return;
          }

          const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
          if (player.gold < skillItem.costGold || bossEssenceCount < skillItem.costEssence) {
            await interaction.reply({ content: `❌ You need ${skillItem.costGold}g + ${skillItem.costEssence} Boss Essence.`, ephemeral: true });
            return;
          }

          player.bossSkills = Array.isArray(player.bossSkills) ? player.bossSkills : [];
          if (player.bossSkills.includes(skillId)) {
            await interaction.reply({ content: '❌ You already own that skill.', ephemeral: true });
            return;
          }

          if (!player.bossShopSpent) {
            player.bossShopSpent = { gold: 0, bossEssence: 0 };
          }

          player.gold -= skillItem.costGold;
          this.trackGoldSpent(player, skillItem.costGold, 'shop');
          this.removeMaterialFromInventory(player, bossEssenceId, skillItem.costEssence);
          player.bossSkills.push(skillId);
          player.bossShopSpent.gold = (player.bossShopSpent?.gold || 0) + skillItem.costGold;
          player.bossShopSpent.bossEssence = (player.bossShopSpent?.bossEssence || 0) + skillItem.costEssence;
          this.persistPlayer(player);

          await interaction.reply({ content: `✅ Unlocked **${skillItem.name}**.`, ephemeral: true });
          setTimeout(() => {
            this.handleGuildBossSkillDetail(interaction, player, skillId);
          }, 500);
          return;
        }

        // Handle buy boss talent
        if (customId.startsWith('rpg-guild-boss-buy-talent-')) {
          const bossEssenceId = 'boss_essence';
          const talentId = customId.replace('rpg-guild-boss-buy-talent-', '');
          const talentItem = this.getBossTalentShopItems().find(item => item.id === talentId);
          if (!talentItem) {
            await interaction.reply({ content: '❌ Invalid talent!', ephemeral: true });
            return;
          }

          const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
          if (player.gold < talentItem.costGold || bossEssenceCount < talentItem.costEssence) {
            await interaction.reply({ content: `❌ You need ${talentItem.costGold}g + ${talentItem.costEssence} Boss Essence.`, ephemeral: true });
            return;
          }

          player.bossTalents = player.bossTalents || {};
          if (!player.bossShopSpent) {
            player.bossShopSpent = { gold: 0, bossEssence: 0 };
          }

          player.gold -= talentItem.costGold;
          this.trackGoldSpent(player, talentItem.costGold, 'shop');
          this.removeMaterialFromInventory(player, bossEssenceId, talentItem.costEssence);
          player.bossTalents[talentId] = (player.bossTalents[talentId] || 0) + 1;
          player.bossShopSpent.gold = (player.bossShopSpent?.gold || 0) + talentItem.costGold;
          player.bossShopSpent.bossEssence = (player.bossShopSpent?.bossEssence || 0) + talentItem.costEssence;
          this.persistPlayer(player);

          await interaction.reply({ content: `✅ Upgraded **${talentItem.name}** to Rank ${player.bossTalents[talentId]}.`, ephemeral: true });
          setTimeout(() => {
            this.handleGuildBossTalentDetail(interaction, player, talentId);
          }, 500);
          return;
        }

        // Handle buy boss enchant recipe
        if (customId.startsWith('rpg-guild-boss-buy-enchant-')) {
          const bossEssenceId = 'boss_essence';
          const recipeId = customId.replace('rpg-guild-boss-buy-enchant-', '');
          const recipeItem = this.getBossEnchantShopItems().find(item => item.id === recipeId);
          if (!recipeItem) {
            await interaction.reply({ content: '❌ Invalid recipe!', ephemeral: true });
            return;
          }

          const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
          if (player.gold < recipeItem.costGold || bossEssenceCount < recipeItem.costEssence) {
            await interaction.reply({ content: `❌ You need ${recipeItem.costGold}g + ${recipeItem.costEssence} Boss Essence.`, ephemeral: true });
            return;
          }

          player.bossEnchantRecipesUnlocked = Array.isArray(player.bossEnchantRecipesUnlocked)
            ? player.bossEnchantRecipesUnlocked
            : [];
          if (player.bossEnchantRecipesUnlocked.includes(recipeId)) {
            await interaction.reply({ content: '❌ You already unlocked that recipe.', ephemeral: true });
            return;
          }

          if (!player.bossShopSpent) {
            player.bossShopSpent = { gold: 0, bossEssence: 0 };
          }

          player.gold -= recipeItem.costGold;
          this.trackGoldSpent(player, recipeItem.costGold, 'shop');
          this.removeMaterialFromInventory(player, bossEssenceId, recipeItem.costEssence);
          player.bossEnchantRecipesUnlocked.push(recipeId);
          player.bossShopSpent.gold = (player.bossShopSpent?.gold || 0) + recipeItem.costGold;
          player.bossShopSpent.bossEssence = (player.bossShopSpent?.bossEssence || 0) + recipeItem.costEssence;
          this.persistPlayer(player);

          await interaction.reply({ content: `✅ Unlocked **${recipeItem.name}**.`, ephemeral: true });
          setTimeout(() => {
            this.handleGuildBossEnchantDetail(interaction, player, recipeId);
          }, 500);
          return;
        }

        // Handle reset boss upgrades
        if (customId === 'rpg-guild-boss-reset-stats') {
          const refundGold = player.bossShopSpent?.gold || 0;
          const refundEssence = player.bossShopSpent?.bossEssence || 0;
          const bossEssenceId = 'boss_essence';

          player.gold += refundGold;
          if (refundEssence > 0) {
            this.addMaterialToInventory(player, bossEssenceId, refundEssence);
          }

          player.bossStats = { strength: 5, defense: 5, agility: 5, intelligence: 5, vitality: 5, wisdom: 5, maxHp: 100, maxMana: 50 };
          player.bossSkills = [];
          player.bossSkillLevels = {};
          player.bossTalents = {};
          player.bossEnchantRecipesUnlocked = [];
          player.bossShopSpent = { gold: 0, bossEssence: 0 };
          this.persistPlayer(player);
          this.clearStatsCache(player);

          await interaction.reply({ content: `🔄 **Boss upgrades reset!** Refunded ${refundGold}g and ${refundEssence} Essence.`, ephemeral: true });
          setTimeout(() => {
            this.handleGuildBossStatsShop(interaction, player);
          }, 500);
          return;
        }

        // Handle guild member promote
        if (customId.startsWith('rpg-guild-promote-')) {
          const targetUserId = customId.replace('rpg-guild-promote-', '');
          const guild = this.guildManager.getPlayerGuild(player.userId);
          
          if (!guild) {
            await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
            return;
          }

          const member = guild.members[player.userId];
          if (member.role !== 'leader') {
            await interaction.reply({ content: '❌ Only the guild leader can promote members!', ephemeral: true });
            return;
          }

          const targetMember = guild.members[targetUserId];
          if (!targetMember) {
            await interaction.reply({ content: '❌ Member not found!', ephemeral: true });
            return;
          }

          if (targetMember.role !== 'member') {
            await interaction.reply({ content: '❌ That member is already promoted!', ephemeral: true });
            return;
          }

          // Get username
          let targetUsername = `User ${targetUserId}`;
          try {
            const targetUser = await this.client.users.fetch(targetUserId);
            targetUsername = targetUser.username;
          } catch (err) {
            // Use fallback
          }

          // Promote to officer
          targetMember.role = 'officer';
          this.guildManager.save();

          // Notify the promoted member
          this.notifyPlayer(targetUserId, '⭐ Guild Promotion!', `You have been promoted to Officer in [${guild.tag}] ${guild.name}!`, '#FFD700');
          
          // Show success message and refresh roles view
          await interaction.update({
            content: `✅ **${targetUsername}** has been promoted to Officer!`,
            embeds: [],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('rpg-guild-roles')
                  .setLabel('← Back to Roles')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId('rpg-hub')
                  .setLabel('🏠 Hub')
                  .setStyle(ButtonStyle.Primary)
              )
            ]
          });
          return;
        }

        // Handle guild member demote
        if (customId.startsWith('rpg-guild-demote-')) {
          const targetUserId = customId.replace('rpg-guild-demote-', '');
          const guild = this.guildManager.getPlayerGuild(player.userId);
          
          if (!guild) {
            await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
            return;
          }

          const member = guild.members[player.userId];
          if (member.role !== 'leader') {
            await interaction.reply({ content: '❌ Only the guild leader can demote members!', ephemeral: true });
            return;
          }

          const targetMember = guild.members[targetUserId];
          if (!targetMember) {
            await interaction.reply({ content: '❌ Member not found!', ephemeral: true });
            return;
          }

          if (targetMember.role !== 'officer') {
            await interaction.reply({ content: '❌ That member is not an officer!', ephemeral: true });
            return;
          }

          // Get username
          let targetUsername = `User ${targetUserId}`;
          try {
            const targetUser = await this.client.users.fetch(targetUserId);
            targetUsername = targetUser.username;
          } catch (err) {
            // Use fallback
          }

          // Demote to member
          targetMember.role = 'member';
          this.guildManager.save();

          // Notify the demoted member
          this.notifyPlayer(targetUserId, '👤 Guild Demotion', `You have been demoted to Member in [${guild.tag}] ${guild.name}.`, '#FFA500');
          
          // Show success message and refresh roles view
          await interaction.update({
            content: `✅ **${targetUsername}** has been demoted to Member.`,
            embeds: [],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('rpg-guild-roles')
                  .setLabel('← Back to Roles')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId('rpg-hub')
                  .setLabel('🏠 Hub')
                  .setStyle(ButtonStyle.Primary)
              )
            ]
          });
          return;
        }

        // Handle guild member kick
        if (customId.startsWith('rpg-guild-kick-')) {
          const targetUserId = customId.replace('rpg-guild-kick-', '');
          const guild = this.guildManager.getPlayerGuild(player.userId);
          
          if (!guild) {
            await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
            return;
          }

          const member = guild.members[player.userId];
          const targetMember = guild.members[targetUserId];

          if (!targetMember) {
            await interaction.reply({ content: '❌ Member not found!', ephemeral: true });
            return;
          }

          const isLeader = member.role === 'leader';
          const isOfficer = member.role === 'officer';

          // Permission check
          if (!isLeader && !isOfficer) {
            await interaction.reply({ content: '❌ Only officers and leaders can kick members!', ephemeral: true });
            return;
          }

          // Officers can only kick regular members
          if (isOfficer && !isLeader && targetMember.role !== 'member') {
            await interaction.reply({ content: '❌ Officers can only kick regular members!', ephemeral: true });
            return;
          }

          // Can't kick the leader
          if (targetMember.role === 'leader') {
            await interaction.reply({ content: '❌ Cannot kick the guild leader!', ephemeral: true });
            return;
          }

          // Get username
          let targetUsername = `User ${targetUserId}`;
          try {
            const targetUser = await this.client.users.fetch(targetUserId);
            targetUsername = targetUser.username;
          } catch (err) {
            // Use fallback
          }

          // Remove from guild
          delete guild.members[targetUserId];
          this.guildManager.save();

          // Notify the kicked member
          this.notifyPlayer(targetUserId, '🚪 Removed from Guild', `You have been removed from [${guild.tag}] ${guild.name}.`, '#FF0000');
          
          // Show success message and refresh roles view
          await interaction.update({
            content: `✅ **${targetUsername}** has been kicked from the guild.`,
            embeds: [],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('rpg-guild-roles')
                  .setLabel('← Back to Roles')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId('rpg-hub')
                  .setLabel('🏠 Hub')
                  .setStyle(ButtonStyle.Primary)
              )
            ]
          });
          return;
        }

        // Handle guild boss attack
        if (customId === 'rpg-guild-boss-attack') {
          const guild = this.guildManager.getPlayerGuild(player.userId);
          if (!guild) {
            await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
            return;
          }

          if (!guild.activeBoss) {
            await interaction.reply({ content: '❌ No active boss fight!', ephemeral: true });
            return;
          }

          const existingCombat = this.combatSystem.getActiveCombat(player.userId);
          if (existingCombat && existingCombat.meta?.type !== 'guild_boss') {
            await interaction.reply({ content: '❌ Finish your current combat before attacking the guild boss.', ephemeral: true });
            return;
          }

          if (existingCombat && existingCombat.meta?.type === 'guild_boss') {
            await this.handleCombatRefresh(interaction, player);
            return;
          }

          await this.startGuildBossCombat(interaction, player, guild);
          return;
        }

        // Handle dungeon floor continuation
        if (customId.startsWith('rpg-dungeon-continue-')) {
          await interaction.deferUpdate();
          
          const parts = customId.replace('rpg-dungeon-continue-', '').split('-');
          const dungeonId = parts[0];
          const completedFloor = parseInt(parts[1]) || 1;
          const nextFloor = completedFloor + 1;
          
          const dungeon = getDungeonById(dungeonId);

          if (!dungeon) {
            await interaction.reply({ content: 'Invalid dungeon.', ephemeral: true });
            return;
          }

          if (this.combatSystem.isInCombat(player.userId)) {
            await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
            return;
          }

          const totalFloors = dungeon.floors || 1;
          
          if (nextFloor > totalFloors) {
            await interaction.reply({ content: 'All floors completed!', ephemeral: true });
            return;
          }

          // Get the boss for this floor (cycle through bosses if fewer bosses than floors)
          const bossIndex = Math.min(nextFloor - 1, (dungeon.bosses?.length || 1) - 1);
          
          let enemyName = 'Dungeon Foe';
          let enemyLevel = Math.max(1, player.level + nextFloor); // Scale level with floor
          let bossData = null;

          if (dungeon.bosses && dungeon.bosses.length > 0) {
            const currentBoss = dungeon.bosses[bossIndex];
            let bossId = null;
            
            if (typeof currentBoss === 'string') {
              bossId = currentBoss;
            } else if (currentBoss && typeof currentBoss === 'object') {
              enemyName = currentBoss.name || enemyName;
              enemyLevel = currentBoss.level || enemyLevel;
            }
            
            if (bossId) {
              const allWorlds = getAllWorlds();
              for (const world of allWorlds) {
                if (world.entities?.worldBosses?.[bossId]) {
                  bossData = world.entities.worldBosses[bossId];
                  enemyName = bossData.name || enemyName;
                  enemyLevel = parseInt(bossData.level) || enemyLevel;
                  break;
                }
              }
            }
          }

          let combatState;
          const combatMeta = {
            type: 'dungeon',
            dungeonId: dungeon.id,
            currentFloor: nextFloor,
            totalFloors: totalFloors,
            bossIndex: bossIndex
          };
          
          // Dungeon difficulty multipliers
          const DUNGEON_HP_MULT = 2.5;
          const DUNGEON_STAT_MULT = 1.8;
          
          if (bossData && bossData.hp) {
            const baseHp = parseInt(bossData.hp) || 100;
            const baseStr = parseInt(bossData.strength) || 10;
            const baseDef = parseInt(bossData.constitution) || 5;
            const baseInt = parseInt(bossData.intelligence) || 5;
            const baseAgi = parseInt(bossData.dexterity) || 5;
            
            combatState = this.combatSystem.startCombatWithCustomEnemy(
              player,
              enemyName,
              enemyLevel,
              Math.floor(baseHp * DUNGEON_HP_MULT),
              {
                strength: Math.floor(baseStr * DUNGEON_STAT_MULT),
                defense: Math.floor(baseDef * DUNGEON_STAT_MULT),
                intelligence: Math.floor(baseInt * DUNGEON_STAT_MULT),
                agility: Math.floor(baseAgi * DUNGEON_STAT_MULT),
              },
              bossData.abilities || [],
              combatMeta
            );
          } else {
            combatState = this.combatSystem.startCombat(
              player,
              enemyName,
              enemyLevel,
              { meta: combatMeta }
            );
          }

          this.persistPlayer(player);

          const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
          embed.setFooter({ text: `Floor ${nextFloor}/${totalFloors}` });
          
          const buttons = this.createCombatButtons();

          await interaction.editReply({
            embeds: [embed],
            components: buttons,
          });
          return;
        }

        if (customId.startsWith('rpg-raid-continue-')) {
          await interaction.deferUpdate();
          
          const parts = customId.replace('rpg-raid-continue-', '').split('-');
          const raidId = parts[0];
          const completedBossIndex = parseInt(parts[1]) || 0;
          const nextBossIndex = completedBossIndex + 1;
          
          const raid = getRaidById(raidId);

          if (!raid) {
            await interaction.reply({ content: 'Invalid raid.', ephemeral: true });
            return;
          }

          if (this.combatSystem.isInCombat(player.userId)) {
            await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
            return;
          }

          const totalBosses = raid.bosses?.length || 0;
          
          if (nextBossIndex >= totalBosses) {
            await interaction.reply({ content: 'All raid bosses defeated!', ephemeral: true });
            return;
          }

          // Get the next boss
          const boss = raid.bosses[nextBossIndex];
          const enemyName = boss.name || 'Raid Boss';
          const enemyLevel = boss.level || raid.minLevel;
          const enemyHp = boss.hp || (enemyLevel * 100);

          console.log('[Raid] Continuing raid:', raid.name);
          console.log('[Raid] Fighting boss:', nextBossIndex + 1, '/', totalBosses);

          // Calculate current floor based on bosses per floor (approximate)
          const totalFloors = raid.floors || 1;
          const bossesPerFloor = Math.ceil(totalBosses / totalFloors);
          const currentFloor = Math.min(Math.floor(nextBossIndex / bossesPerFloor) + 1, totalFloors);

          // Start combat with next raid boss
          const combatState = this.combatSystem.startCombatWithCustomEnemy(
            player,
            enemyName,
            enemyLevel,
            enemyHp,
            {
              strength: enemyLevel * 2,
              defense: enemyLevel,
              intelligence: enemyLevel,
              agility: enemyLevel,
            },
            boss.abilities || [],
            { 
              type: 'raid', 
              raidId: raid.id,
              currentFloor: currentFloor,
              totalFloors: totalFloors,
              bossIndex: nextBossIndex,
              totalBosses: totalBosses
            }
          );

          this.persistPlayer(player);

          const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
          embed.setFooter({ text: `Boss ${nextBossIndex + 1}/${totalBosses} • Floor ${currentFloor}/${totalFloors}` });
          
          const buttons = this.createCombatButtons();

          await interaction.editReply({
            embeds: [embed],
            components: buttons,
          });
          return;
        }

        // Handle dungeon claim reward button
        if (customId.startsWith('rpg-dungeon-claim-')) {
          await interaction.deferUpdate();
          const parts = customId.replace('rpg-dungeon-claim-', '').split('-');
          const dungeonId = parts[0];
          const currentFloor = parseInt(parts[1]) || 1;
          const dungeon = getDungeonById(dungeonId);

          if (!dungeon) {
            await interaction.reply({ content: 'Invalid dungeon.', ephemeral: true });
            return;
          }

          // Get floor-specific rewards
          const floorReward = dungeon.floorRewards?.[currentFloor] || dungeon.rewards;
          
          if (floorReward) {
            let extraXp = floorReward.xp || 0;
            const extraGold = floorReward.gold || 0;
            const loot = floorReward.loot || floorReward.items || [];
            const materials = floorReward.materials || [];

            // Apply XP potion bonus to dungeon rewards
            if (extraXp > 0 && player.potionBuffs) {
              if (player.potionBuffs.xpRemaining && player.potionBuffs.xpRemaining > 0 && player.potionBuffs.xpBonus) {
                const bonusXp = Math.floor(extraXp * (player.potionBuffs.xpBonus / 100));
                extraXp += bonusXp;
                // Note: potion charges are decremented in CombatSystem, not here
              }
            }

            let levelUp = null;
            if (extraXp > 0) levelUp = player.addXp(extraXp);
            if (extraGold > 0) this.addGold(player, extraGold);

            const lootNames = [];
            let weaponGiven = false;
            const playerClass = player.class || player.internalClass;
            
            for (const lootItem of loot) {
              let itemId, quantity;
              if (typeof lootItem === 'string') {
                itemId = lootItem;
                quantity = 1;
              } else {
                itemId = lootItem.id;
                quantity = lootItem.quantity || 1;
              }
              
              const equipment = getEquipment(itemId);
              const item = getItemByIdDynamic(itemId);
              const material = getMaterial(itemId);

              if (equipment) {
                if (equipment.slot === 'weapon') {
                  if (weaponGiven) continue;
                  if (equipment.classRestriction && equipment.classRestriction !== playerClass) {
                    const classWeapon = this.findClassWeaponInLoot(loot, playerClass);
                    if (classWeapon) {
                      this.addCraftedItem(player, classWeapon.id, quantity);
                      lootNames.push(`${classWeapon.name} x${quantity}`);
                      weaponGiven = true;
                      continue;
                    }
                    continue;
                  }
                }
                
                this.addCraftedItem(player, equipment.id, quantity);
                lootNames.push(`${equipment.name} x${quantity}`);
                
                if (equipment.slot === 'weapon') {
                  weaponGiven = true;
                }
              } else if (item) {
                this.addCraftedItem(player, item.id, quantity);
                lootNames.push(`${item.name} x${quantity}`);
              } else if (material) {
                this.addMaterialToInventory(player, material.id, quantity);
                lootNames.push(`${material.name} x${quantity}`);
              }
            }
            
            for (const matItem of materials) {
              let matId, quantity;
              if (typeof matItem === 'string') {
                matId = matItem;
                quantity = 1;
              } else {
                matId = matItem.id;
                quantity = matItem.quantity || 1;
              }
              
              const material = getMaterial(matId);
              if (material) {
                this.addMaterialToInventory(player, material.id, quantity);
                lootNames.push(`${material.name} x${quantity}`);
              }
            }

            // Update dungeon progress stats
            if (!player.progressStats) {
              player.progressStats = {
                monstersDefeated: 0,
                gatheringActions: 0,
                materialsCollected: 0,
                craftsCompleted: 0,
                goldEarned: 0,
                criticalHits: 0,
                dungeonsCleared: 0,
                raidsCleared: 0,
              };
            }
            
            // Count as dungeon cleared if floor 3
            if (currentFloor >= 3) {
              player.progressStats.dungeonsCleared += 1;

              const dailyQuests = getAvailableDailyQuests(player.level, player.dailyQuestsCompleted);
              const weeklyQuests = getAvailableWeeklyQuests(player.level, player.weeklyQuestsCompleted);
              const claimedLimited = (player.claimedQuests || [])
                .map(id => getGuildQuestById(id))
                .filter(Boolean)
                .filter(q => !player.limitedQuestsCompleted.includes(q.id));

              if (!player.guildQuestProgress) player.guildQuestProgress = {};

              this.applyGuildQuestProgress(player, dailyQuests, weeklyQuests, claimedLimited, {
                type: 'explore',
                target: 'dungeon',
                targetName: dungeon?.name || 'Dungeon',
                count: 1,
                tags: ['dungeon'],
              });
            }

            this.persistPlayer(player);

            // Create reward summary embed
            const embed = new EmbedBuilder()
              .setColor(0x00ff00)
              .setTitle(`💰 ${dungeon.name} - Floor ${currentFloor} Claimed!`)
              .setDescription(`You claimed your rewards and left the dungeon safely.`);

            const rewardParts = [];
            if (extraXp > 0) rewardParts.push(`+${extraXp} XP`);
            if (extraGold > 0) rewardParts.push(`+${extraGold} Gold`);
            if (lootNames.length > 0) rewardParts.push(`**Loot:**\n${lootNames.join('\n')}`);

            if (rewardParts.length > 0) {
              embed.addFields({
                name: '🎁 Rewards',
                value: rewardParts.join('\n'),
                inline: false,
              });
            }

            if (levelUp && levelUp.levelsGained > 0) {
              const levelUpText = this.createLevelUpMessage(levelUp);
              if (levelUpText) {
                embed.addFields({
                  name: '🎉 Level Up!',
                  value: levelUpText.trim(),
                  inline: false,
                });
              }
            }

            const buttons = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('rpg-back')
                .setLabel('← Back to Menu')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`rpg-redo-dungeon-${dungeonId}`)
                .setLabel('🔄 Redo Dungeon')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('rpg-hub')
                .setLabel('🏠 Hub')
                .setStyle(ButtonStyle.Success)
            );

            await interaction.editReply({
              embeds: [embed],
              components: [buttons],
            });
          } else {
            await interaction.reply({ content: 'No rewards configured for this floor.', ephemeral: true });
          }
          return;
        }

        // Handle dungeon/raid redo buttons
        if (customId.startsWith('rpg-redo-dungeon-')) {
          await interaction.deferUpdate();
          
          const dungeonId = customId.replace('rpg-redo-dungeon-', '');
          const dungeon = getDungeonById(dungeonId);

          if (!dungeon) {
            await interaction.reply({ content: 'Invalid dungeon.', ephemeral: true });
            return;
          }

          if (this.combatSystem.isInCombat(player.userId)) {
            await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
            return;
          }

          // Start from floor 1
          const currentFloor = 1;
          const totalFloors = dungeon.floors || 1;
          
          // Reuse dungeon combat start logic
          let enemyName = 'Dungeon Foe';
          let enemyLevel = Math.max(1, player.level);
          let bossData = null;

          if (dungeon.bosses && dungeon.bosses.length > 0) {
            const firstBoss = dungeon.bosses[0];
            let bossId = null;
            
            if (typeof firstBoss === 'string') {
              bossId = firstBoss;
            } else if (firstBoss && typeof firstBoss === 'object') {
              enemyName = firstBoss.name || enemyName;
              enemyLevel = firstBoss.level || enemyLevel;
            }
            
            if (bossId) {
              const allWorlds = getAllWorlds();
              for (const world of allWorlds) {
                if (world.entities?.worldBosses?.[bossId]) {
                  bossData = world.entities.worldBosses[bossId];
                  enemyName = bossData.name || enemyName;
                  enemyLevel = parseInt(bossData.level) || enemyLevel;
                  break;
                }
              }
            }
          }

          let combatState;
          const combatMeta = {
            type: 'dungeon',
            dungeonId: dungeon.id,
            currentFloor: currentFloor,
            totalFloors: totalFloors,
            bossIndex: 0
          };
          
          // Dungeon difficulty multipliers
          const DUNGEON_HP_MULT = 2.5;
          const DUNGEON_STAT_MULT = 1.8;
          
          if (bossData && bossData.hp) {
            const baseHp = parseInt(bossData.hp) || 100;
            const baseStr = parseInt(bossData.strength) || 10;
            const baseDef = parseInt(bossData.constitution) || 5;
            const baseInt = parseInt(bossData.intelligence) || 5;
            const baseAgi = parseInt(bossData.dexterity) || 5;
            
            combatState = this.combatSystem.startCombatWithCustomEnemy(
              player,
              enemyName,
              enemyLevel,
              Math.floor(baseHp * DUNGEON_HP_MULT),
              {
                strength: Math.floor(baseStr * DUNGEON_STAT_MULT),
                defense: Math.floor(baseDef * DUNGEON_STAT_MULT),
                intelligence: Math.floor(baseInt * DUNGEON_STAT_MULT),
                agility: Math.floor(baseAgi * DUNGEON_STAT_MULT),
              },
              bossData.abilities || [],
              combatMeta
            );
          } else {
            combatState = this.combatSystem.startCombat(
              player,
              enemyName,
              enemyLevel,
              { meta: combatMeta }
            );
          }

          this.persistPlayer(player);

          const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
          if (totalFloors > 1) {
            embed.setFooter({ text: `Floor ${currentFloor}/${totalFloors}` });
          }
          
          const buttons = this.createCombatButtons();

          await interaction.editReply({
            embeds: [embed],
            components: buttons,
          });
          return;
        }

        if (customId.startsWith('rpg-redo-raid-')) {
          await interaction.deferUpdate();
          const raidId = customId.replace('rpg-redo-raid-', '');
          const raid = getRaidById(raidId);

          if (!raid) {
            await interaction.reply({ content: 'Invalid raid.', ephemeral: true });
            return;
          }

          if (this.combatSystem.isInCombat(player.userId)) {
            await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
            return;
          }

          if (player.level < raid.minLevel) {
            await interaction.reply({ 
              content: `You need to be level ${raid.minLevel} to attempt this raid.`, 
              ephemeral: true 
            });
            return;
          }

          // Restart raid from first boss
          const bossIndex = 0;
          const boss = raid.bosses[bossIndex];
          const enemyName = boss.name || 'Raid Boss';
          const enemyLevel = boss.level || raid.minLevel;
          const enemyHp = boss.hp || (enemyLevel * 100);
          const totalFloors = raid.floors || 1;

          console.log('[Raid] Restarting raid:', raid.name);

          // Start combat with first raid boss
          const combatState = this.combatSystem.startCombatWithCustomEnemy(
            player,
            enemyName,
            enemyLevel,
            enemyHp,
            {
              strength: enemyLevel * 2,
              defense: enemyLevel,
              intelligence: enemyLevel,
              agility: enemyLevel,
            },
            boss.abilities || [],
            { 
              type: 'raid', 
              raidId: raid.id,
              currentFloor: 1,
              totalFloors: totalFloors,
              bossIndex: bossIndex,
              totalBosses: raid.bosses.length
            }
          );

          this.persistPlayer(player);

          const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
          embed.setFooter({ text: `Boss 1/${raid.bosses.length} • Floor 1/${totalFloors}` });
          
          const buttons = this.createCombatButtons();

          await interaction.editReply({
            embeds: [embed],
            components: buttons,
          });
          return;
        }

        // Handle skill upgrade
        if (customId.startsWith('rpg-skill-upgrade-')) {
          const skillId = customId.replace('rpg-skill-upgrade-', '');
          const skill = getSkill(skillId);

          if (!skill || !player.skills.includes(skillId)) {
            await interaction.reply({ content: '❌ Skill not found or not learned.', ephemeral: true });
            return;
          }

          const currentLevel = player.skillLevels?.[skillId] || 1;
          const maxLevel = skill.maxLevel || 3;

          if (currentLevel >= maxLevel) {
            await interaction.reply({ content: '❌ Skill is already at maximum level!', ephemeral: true });
            return;
          }

          // Upgrade cost is always 1 skill point per level (separate from unlock cost)
          const upgradeCost = 1;

          if ((player.skillPoints || 0) < upgradeCost) {
            await interaction.reply({ 
              content: `❌ You need ${upgradeCost} skill point to upgrade this skill. You have ${player.skillPoints || 0}.`,
              ephemeral: true 
            });
            return;
          }

          // Apply upgrade
          player.skillPoints -= upgradeCost;
          player.skillLevels[skillId] = (player.skillLevels?.[skillId] || 1) + 1;
          this.persistPlayer(player);

          const newLevel = player.skillLevels[skillId];
          await interaction.reply({ 
            content: `✅ **${skill.name}** upgraded to **Level ${newLevel}/${maxLevel}**! (${player.skillPoints} points remaining)`,
            ephemeral: true 
          });

          // Refresh skill detail view
          await this.handleSkillDetail(interaction, player, skillId, 'learned');
          return;
        }

        // Handle skill unlock
        if (customId.startsWith('rpg-skill-unlock-')) {
          const skillId = customId.replace('rpg-skill-unlock-', '');
          const skill = getSkill(skillId);

          if (!skill) {
            await interaction.reply({ content: '❌ Skill not found.', ephemeral: true });
            return;
          }

          if (player.skills.includes(skillId)) {
            await interaction.reply({ content: '❌ This skill is already learned!', ephemeral: true });
            return;
          }

          // Get unlock cost from skill tree
          const playerClass = player.class || player.internalClass;
          const classData = getClass(playerClass);
          let unlockCost = 1;
          let unlockLevel = 1;
          
          if (classData && classData.skillTree) {
            const skillTreeEntry = classData.skillTree.find(s => s.skillId === skillId);
            if (skillTreeEntry) {
              unlockCost = skillTreeEntry.pointCost;
              unlockLevel = skillTreeEntry.unlockLevel;
            }
          }

          if (player.level < unlockLevel) {
            await interaction.reply({ 
              content: `❌ You need to be level ${unlockLevel} to unlock this skill. You are level ${player.level}.`,
              ephemeral: true 
            });
            return;
          }

          if ((player.skillPoints || 0) < unlockCost) {
            await interaction.reply({ 
              content: `❌ You need ${unlockCost} skill points to unlock this skill. You have ${player.skillPoints || 0}.`,
              ephemeral: true 
            });
            return;
          }

          // Apply unlock
          player.skillPoints -= unlockCost;
          player.skills.push(skillId);
          player.skillLevels[skillId] = 1;
          player.skillCooldowns[skillId] = 0;
          this.persistPlayer(player);

          await interaction.reply({ 
            content: `✅ **${skill.name}** unlocked! (${player.skillPoints} points remaining)`,
            ephemeral: true 
          });

          // Refresh skill detail view
          await this.handleSkillDetail(interaction, player, skillId, 'learned');
          return;
        }

        // Handle quest navigation buttons
        if (customId.startsWith('rpg-quest-navigate-')) {
          const questId = customId.replace('rpg-quest-navigate-', '');
          await this.handleGuildQuestNavigation(interaction, player, questId);
          return;
        }
        if (customId === 'rpg-guild-bounties') {
          await this.handleGuildBounties(interaction, player);
          return;
        }
        if (customId === 'rpg-guild-raids') {
          await this.handleRaids(interaction, player);
          return;
        }
        if (customId === 'rpg-create-bounty') {
          await this.handleCreateBountyModal(interaction, player);
          return;
        }
        if (customId === 'rpg-guild-rewards') {
          await this.handleGuildWeeklyRewards(interaction, player);
          return;
        }
        if (customId === 'rpg-guild-claim-weekly') {
          await this.handleClaimWeeklyReward(interaction, player);
          return;
        }

        // Quick-swap equipment sets from tabs
        if (customId.startsWith('rpg-quickswap-set-')) {
          const setIndex = parseInt(customId.replace('rpg-quickswap-set-', ''));
          const set = player.equipmentSets?.[setIndex];

          if (!set || !set.items) {
            await interaction.reply({ content: 'Equipment set not found.', ephemeral: true });
            return;
          }

          // Defer update first to prevent double-reply
          await interaction.deferUpdate();

          // Load the set
          player.equippedItems = { ...set.items };
          player.clearStatsCache();
          this.persistPlayer(player);

          // Refresh the equipment view with update
          await this.handleEquipment(interaction, player, true);
          return;
        }

        // Leaderboard button
        if (customId === 'rpg-leaderboard') {
          // Force reload player data from disk to ensure fresh data
          this.playerManager.loadAllPlayers();
          await this.handleLeaderboards(interaction);
          return;
        }

        // Repeat training dummy battle
        if (customId === 'rpg-repeat-training') {
          // Get the last combat style used from player data or combat history
          const lastTrainingStyle = player.lastTrainingStyle || null;
          await this.startTrainingCombat(interaction, player, lastTrainingStyle);
          return;
        }
        
        // Only reply if not already replied/deferred
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'Unknown action',
            ephemeral: true,
          });
        }
    }
  }

  /**
   * Handle select menu interactions
   */
  async handleSelectMenuInteraction(interaction) {
    const customId = interaction.customId;
    const player = this.playerManager.getPlayer(interaction.user.id);

    if (!player) {
      await interaction.reply({
        content: 'You need to run /rpg first!',
        ephemeral: true,
      });
      return;
    }

    // Ensure auto-gathering is running if it should be
    this.autoGatherManager.ensureGatheringActive(player);

    // Handle roguelike upgrade selection
    if (customId === 'rpg-roguelike-upgrade-select') {
      const upgradeId = interaction.values?.[0];
      if (upgradeId) {
        await this.handleRoguelikeUpgradeView(interaction, player, upgradeId);
      }
      return;
    }

    // Handle dismantle item selection
    if (customId === 'rpg-dismantle-select-item') {
      const selectedItemId = interaction.values?.[0];
      if (selectedItemId) {
        await this.handleDismantleItemOverview(interaction, player, selectedItemId);
      }
      return;
    }

    if (customId === 'rpg-talents-select') {
      const talentId = interaction.values?.[0];
      const talent = getTalent(talentId);
      if (!talent) {
        await interaction.reply({ content: 'Invalid talent selection.', ephemeral: true });
        return;
      }

      const currentRank = player.talents?.[talentId] || 0;
      const maxRank = talent.maxRank || 1;
      if (currentRank >= maxRank) {
        await interaction.reply({ content: 'That talent is already maxed.', ephemeral: true });
        return;
      }

      await this.handleTalentUpgrade(interaction, player, talentId);
      return;
    }

    if (customId === 'rpg-guild-quests-select') {
      const questType = interaction.values?.[0];
      if (!questType) {
        await interaction.reply({ content: 'No quest type selected.', ephemeral: true });
        return;
      }
      
      if (questType === 'daily') {
        await this.handleGuildDailyQuests(interaction, player);
      } else if (questType === 'weekly') {
        await this.handleGuildWeeklyQuests(interaction, player);
      } else if (questType === 'limited') {
        await this.handleGuildLimitedQuests(interaction, player);
      }
      return;
    }

    if (customId === 'rpg-guild-claim-limited') {
      const questId = interaction.values?.[0];
      if (!questId) {
        await interaction.reply({ content: 'No quest selected.', ephemeral: true });
        return;
      }
      
      const claimResult = claimLimitedQuest(questId, player.userId);
      if (!claimResult.success) {
        await interaction.reply({ content: `❌ ${claimResult.error}`, ephemeral: true });
        return;
      }
      
      if (!player.claimedQuests) player.claimedQuests = [];
      player.claimedQuests.push(questId);
      this.persistPlayer(player);
      
      await interaction.reply({ content: `✅ Quest claimed! Check your limited quests to track progress.`, ephemeral: true });
      await this.handleGuildLimitedQuests(interaction, player);
      return;
    }

    if (customId === 'rpg-guild-bounty-select') {
      const bountyId = interaction.values?.[0];
      if (!bountyId) {
        await interaction.reply({ content: 'No bounty selected.', ephemeral: true });
        return;
      }
      await this.handleGuildBountySelect(interaction, player, bountyId);
      return;
    }

    if (customId === 'rpg-guild-manage-member-role') {
      const targetUserId = interaction.values?.[0];
      if (!targetUserId) {
        await interaction.reply({ content: 'No member selected.', ephemeral: true });
        return;
      }
      await this.handleGuildMemberRoleSelect(interaction, player, targetUserId);
      return;
    }

    if (customId === 'rpg-gather-area-select-menu') {
      const areaId = interaction.values?.[0];
      if (!areaId) {
        await interaction.reply({ content: 'No area selected.', ephemeral: true });
        return;
      }
      await this.handleGatheringAreaDetails(interaction, player, areaId);
      return;
    }

    if (customId === 'rpg-arena-opponent-select') {
      const opponentId = interaction.values?.[0];
      if (!opponentId) {
        await interaction.reply({ content: 'No opponent selected.', ephemeral: true });
        return;
      }
      await this.handleArenaFightStart(interaction, player, opponentId);
      return;
    }

    if (customId === 'rpg-arena-shop-buy') {
      const itemId = interaction.values?.[0];
      if (!itemId) {
        await interaction.reply({ content: 'No item selected.', ephemeral: true });
        return;
      }
      await this.handleArenaShopPurchase(interaction, player, itemId);
      return;
    }

    if (customId === 'rpg-market-item-select') {
      const itemId = interaction.values?.[0];
      if (!itemId) {
        await interaction.reply({ content: 'No item selected.', ephemeral: true });
        return;
      }
      await this.handleMarketItemDetails(interaction, player, itemId);
      return;
    }

    if (customId === 'rpg-market-listing-select') {
      const listingId = interaction.values?.[0];
      if (!listingId) {
        await interaction.reply({ content: 'No listing selected.', ephemeral: true });
        return;
      }
      await this.handleMarketPurchase(interaction, player, listingId);
      return;
    }

    if (customId === 'rpg-market-my-listing-select') {
      const listingId = interaction.values?.[0];
      if (!listingId) {
        await interaction.reply({ content: 'No listing selected.', ephemeral: true });
        return;
      }
      await this.handleMarketCancelListing(interaction, player, listingId);
      return;
    }

    if (customId === 'rpg-select-dungeon') {
      const dungeonId = interaction.values?.[0];
      const dungeon = getDungeonById(dungeonId);

      if (!dungeon) {
        await interaction.reply({ content: 'Invalid dungeon selection.', ephemeral: true });
        return;
      }

      if (this.combatSystem.isInCombat(player.userId)) {
        await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
        return;
      }

      // Ask to choose between normal dungeon or boss encounter
      const choiceRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-dungeon-normal-${dungeonId}`)
          .setLabel('Normal Dungeon')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`rpg-dungeon-boss-${dungeonId}`)
          .setLabel('Boss Encounter')
          .setStyle(ButtonStyle.Danger)
      );

      const embed = new EmbedBuilder()
        .setColor(0xff8800)
        .setTitle(`${dungeon.name}`)
        .setDescription(dungeon.description || 'Enter the dungeon')
        .addFields(
          { name: 'Choose Your Challenge', value: 'Normal Dungeon - Standard enemies and rewards\nBoss Encounter - Powerful boss with greater rewards' }
        );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [choiceRow],
      });
      return;
    }

    if (customId === 'rpg-select-raid') {
      const raidId = interaction.values?.[0];
      const raid = getRaidById(raidId);

      if (!raid) {
        await interaction.reply({ content: 'Invalid raid selection.', ephemeral: true });
        return;
      }

      if (this.combatSystem.isInCombat(player.userId)) {
        await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
        return;
      }

      if (player.level < raid.minLevel) {
        await interaction.reply({ 
          content: `You need to be level ${raid.minLevel} to attempt this raid.`, 
          ephemeral: true 
        });
        return;
      }

      // Initialize raid progress
      const currentFloor = 1;
      const totalFloors = raid.floors || 1;
      const bossIndex = 0;
      
      // Get the first boss from the raid
      if (!raid.bosses || raid.bosses.length === 0) {
        await interaction.reply({ content: 'This raid has no bosses configured.', ephemeral: true });
        return;
      }

      const boss = raid.bosses[bossIndex];
      const enemyName = boss.name || 'Raid Boss';
      const enemyLevel = boss.level || raid.minLevel;
      const enemyHp = boss.hp || (enemyLevel * 100);

      console.log('[Raid] Selected raid:', raid.name);
      console.log('[Raid] Total floors:', totalFloors);
      console.log('[Raid] Boss count:', raid.bosses.length);
      console.log('[Raid] Starting boss:', enemyName);

      // Start combat with raid boss
      const combatState = this.combatSystem.startCombatWithCustomEnemy(
        player,
        enemyName,
        enemyLevel,
        enemyHp,
        {
          strength: enemyLevel * 2,
          defense: enemyLevel,
          intelligence: enemyLevel,
          agility: enemyLevel,
        },
        boss.abilities || [],
        { 
          type: 'raid', 
          raidId: raid.id,
          currentFloor: currentFloor,
          totalFloors: totalFloors,
          bossIndex: bossIndex,
          totalBosses: raid.bosses.length
        }
      );

      this.persistPlayer(player);

      const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
      const buttons = this.createCombatButtons();

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: buttons,
      });
    }

    if (customId === 'rpg-alchemy-select') {
      const value = interaction.values?.[0];
      if (!value) {
        await interaction.reply({ content: 'No selection made.', ephemeral: true });
        return;
      }
      
      // Check if viewing details
      if (value.startsWith('details-')) {
        const recipeId = value.replace('details-', '');
        await this.handlePotionDetails(interaction, player, recipeId);
        return;
      }
      
      await this.handleAlchemyCraft(interaction, player, value);
      return;
    }

    // Handle boss upgrade shop selectors
    if (customId === 'rpg-guild-boss-stats-select') {
      const statEmoji = interaction.values?.[0];
      if (statEmoji) {
        await this.handleGuildBossStatDetail(interaction, player, statEmoji);
      }
      return;
    }

    if (customId === 'rpg-guild-boss-skills-select') {
      const skillId = interaction.values?.[0];
      if (skillId) {
        await this.handleGuildBossSkillDetail(interaction, player, skillId);
      }
      return;
    }

    if (customId === 'rpg-guild-boss-talents-select') {
      const talentId = interaction.values?.[0];
      if (talentId) {
        await this.handleGuildBossTalentDetail(interaction, player, talentId);
      }
      return;
    }

    if (customId === 'rpg-guild-boss-enchants-select') {
      const recipeId = interaction.values?.[0];
      if (recipeId) {
        await this.handleGuildBossEnchantDetail(interaction, player, recipeId);
      }
      return;
    }

    if (customId === 'rpg-enchant-select') {
      const enchantId = interaction.values?.[0];
      if (!enchantId) {
        await interaction.reply({ content: 'No enchant selected.', ephemeral: true });
        return;
      }
      await this.handleEnchantCraft(interaction, player, enchantId);
      return;
    }

    if (customId === 'rpg-auto-enchant-type-select') {
      const enchantId = interaction.values?.[0];
      if (!enchantId) {
        await interaction.reply({ content: 'No enchant type selected.', ephemeral: true });
        return;
      }
      // Store selected enchant type, waiting for target level
      player.pendingAutoEnchantType = enchantId;
      this.persistPlayer(player);
      await interaction.reply({ 
        content: `Selected **${enchantId}**. Now click a target level button above.`, 
        ephemeral: true 
      });
      return;
    }

    if (customId === 'rpg-use-potion-select') {
      const potionId = interaction.values?.[0];
      if (!potionId) {
        await interaction.reply({ content: 'No potion selected.', ephemeral: true });
        return;
      }
      await this.handleUsePotionQuantity(interaction, player, potionId);
      return;
    }

    if (customId === 'rpg-open-lootbox-select') {
      const lootboxId = interaction.values?.[0];
      if (!lootboxId) {
        await interaction.reply({ content: 'No lootbox selected.', ephemeral: true });
        return;
      }
      await this.handleOpenLootboxQuantityMenu(interaction, player, lootboxId);
      return;
    }

    // Handle guild buff overview selector
    if (customId === 'rpg-guild-buff-overview') {
      const buffType = interaction.values?.[0];
      if (!buffType) return;
      await this.handleGuildBuffOverview(interaction, player, buffType);
      return;
    }

    // Handle guild buff purchase selectors
    if (customId === 'rpg-guild-buff-purchase' || customId === 'rpg-guild-buff-purchase2') {
      const action = interaction.values?.[0];
      if (!action) return;
      await this.handleGuildBuffPurchaseFromSelector(interaction, player, action);
      return;
    }

    if (customId === 'rpg-select-title') {
      const titleId = interaction.values?.[0];
      if (!titleId) {
        await interaction.reply({ content: 'No title selected.', ephemeral: true });
        return;
      }

      const title = getTitle(titleId);
      if (!title) {
        await interaction.reply({ content: '❌ Invalid title selected.', ephemeral: true });
        return;
      }

      // Check if player has earned this title
      const earnedTitles = getEarnedTitles(player);
      if (!earnedTitles.find(t => t.id === titleId)) {
        await interaction.reply({ content: '❌ You have not earned this title yet!', ephemeral: true });
        return;
      }

      // Set active title
      player.activeTitle = titleId;
      this.persistPlayer(player);

      const bonuses = [];
      if (title.activeBonus) bonuses.push(`🟢 ${title.activeBonus.description}`);
      if (title.passiveBonus) bonuses.push(`🔵 ${title.passiveBonus.description}`);
      const bonusText = bonuses.length > 0 ? `\n\n**Bonuses:**\n${bonuses.join('\n')}` : '';

      await interaction.reply({
        content: `✅ Equipped title: **${title.displayName}**${bonusText}`,
        ephemeral: true,
      });
      return;
    }

    if (customId === 'rpg-crafting-world') {
      const selectedWorldId = interaction.values?.[0];
      if (!selectedWorldId) {
        await interaction.reply({ content: 'No world selected.', ephemeral: true });
        return;
      }
      await this.handleCraftingPage(interaction, player, 0, selectedWorldId);
      return;
    }

    if (customId.startsWith('rpg-crafting-select-')) {
      const recipeId = interaction.values?.[0];
      if (!recipeId) {
        await interaction.reply({ content: 'No recipe selected.', ephemeral: true });
        return;
      }
      await this.handleCraftingOverview(interaction, player, recipeId);
    }

    if (customId === 'rpg-equip-item') {
      const rawValue = interaction.values?.[0];
      const itemId = rawValue ? rawValue.split('::')[0] : null;
      if (!itemId) {
        await interaction.reply({ content: 'No item selected.', ephemeral: true });
        return;
      }

      const equipment = getEquipment(itemId) || getItemByIdDynamic(itemId);
      const inventoryItem = player.inventory.find(item =>
        item && typeof item === 'object' && item.id === itemId
      );
      const resolvedSlot = equipment?.slot || inventoryItem?.slot || (equipment ? this.inferSlotFromCategory(equipment) : null);
      if (!equipment || !resolvedSlot) {
        await interaction.reply({ content: 'Invalid equipment selected.', ephemeral: true });
        return;
      }

      const slot = resolvedSlot;
      const currentlyEquipped = player.equippedItems?.[slot];

      // Toggle equip/unequip
      if (currentlyEquipped === itemId) {
        // Unequip - restore weapon to inventory
        delete player.equippedItems[slot];
        if (player.equipment && typeof player.equipment === 'object') {
          delete player.equipment[slot];
        }
        
        // Add the unequipped item back to inventory
        this.addInventoryItem(player, {
          id: equipment.id,
          name: equipment.name,
          type: 'equipment',
          slot: equipment.slot,
        });
        
        player.clearStatsCache();
        this.persistPlayer(player);
        await interaction.reply({
          content: `✅ Unequipped **${equipment.name}** from ${slot} slot. Added to inventory.`,
          ephemeral: true,
        });
      } else {
        // Equip
        if (!player.equippedItems) player.equippedItems = {};
        if (!player.equipment || typeof player.equipment !== 'object') player.equipment = {};
        
        // If replacing an equipped item, return it to inventory
        if (currentlyEquipped && currentlyEquipped !== itemId) {
          const oldEquip = getEquipment(currentlyEquipped) || getItemByIdDynamic(currentlyEquipped);
          if (oldEquip) {
            this.addInventoryItem(player, {
              id: oldEquip.id,
              name: oldEquip.name,
              type: 'equipment',
              slot: oldEquip.slot || slot,
            });
          }
        }

        // Remove item from inventory if it's there
        const invIndex = player.inventory.findIndex(item => 
          item && typeof item === 'object' && item.id === itemId
        );
        if (invIndex !== -1) {
          const invItem = player.inventory[invIndex];
          if (invItem && invItem.quantity > 1) {
            invItem.quantity -= 1;
          } else {
            player.inventory.splice(invIndex, 1);
          }
        }
        
        player.equippedItems[slot] = itemId;
        player.equipment[slot] = equipment;
        player.clearStatsCache();
        this.persistPlayer(player);
        
        let message = `✅ Equipped **${equipment.name}** to ${slot} slot.`;
        if (currentlyEquipped) {
          const oldEquip = getEquipment(currentlyEquipped);
          message += ` (Replaced ${oldEquip?.name || currentlyEquipped})`;
        }
        
        await interaction.reply({
          content: message,
          ephemeral: true,
        });
      }

      // Refresh the equipment management view
      await this.handleManageEquipment(interaction, player);
      return;
    }

    if (customId === 'rpg-dismantle-item') {
      const rawValue = interaction.values?.[0];
      const itemId = rawValue ? rawValue.split('::')[0] : null;
      if (!itemId) {
        await interaction.reply({ content: 'No item selected.', ephemeral: true });
        return;
      }

      const equipment = getEquipment(itemId) || getItemByIdDynamic(itemId);
      if (!equipment) {
        await interaction.reply({ content: 'Invalid equipment selected.', ephemeral: true });
        return;
      }

      // Check if item is equipped
      const isEquipped = Object.values(player.equippedItems || {}).includes(itemId);
      
      // Find the recipe for this item to determine materials
      const recipe = Object.values(RECIPES).find(r => r.output.item === itemId);
      
      if (!recipe || !recipe.materials) {
        await interaction.reply({ 
          content: `❌ Cannot dismantle **${equipment.name}** - no recipe found.`, 
          ephemeral: true 
        });
        return;
      }

      // Calculate 20% of materials (rounded down)
      const baseMaterials = this.getAdjustedMaterials(recipe.materials);
      const adjustedMaterials = this.applyCostMultiplier(baseMaterials, this.getProfessionCostMultiplier(player));
      const refundMaterials = {};
      
      for (const [matId, qty] of Object.entries(adjustedMaterials)) {
        const refundQty = Math.floor(qty * 0.2);
        if (refundQty > 0) {
          refundMaterials[matId] = refundQty;
        }
      }

      // Remove item from inventory or equipped slot
      if (isEquipped) {
        // Find which slot and unequip
        for (const [slot, equippedId] of Object.entries(player.equippedItems)) {
          if (equippedId === itemId) {
            delete player.equippedItems[slot];
            break;
          }
        }
      } else {
        // Remove from inventory
        const invItem = player.inventory.find(i => i && i.id === itemId && i.type === 'equipment');
        if (invItem) {
          if (invItem.quantity > 1) {
            invItem.quantity -= 1;
          } else {
            const index = player.inventory.indexOf(invItem);
            if (index > -1) player.inventory.splice(index, 1);
          }
        }
      }

      // Add materials back to inventory
      const refundedItems = [];
      for (const [matId, qty] of Object.entries(refundMaterials)) {
        const material = getMaterial(matId);
        this.addMaterialToInventory(player, matId, qty);
        refundedItems.push(`${material?.name || matId} x${qty}`);
      }

      player.clearStatsCache();
      this.persistPlayer(player);

      // Limit materials list to first 5, then summarize if more
      let materialsText = refundedItems.length > 0 
        ? refundedItems.slice(0, 5).join(', ')
        : 'No materials recovered (all materials < 5 units)';
      
      if (refundedItems.length > 5) {
        materialsText += ` and ${refundedItems.length - 5} more material${refundedItems.length - 5 !== 1 ? 's' : ''}`;
      }

      const refundText = refundedItems.length > 0 
        ? `\n🔧 Recovered: ${materialsText}`
        : '\n⚠️ No materials recovered (all materials < 5 units)';

      await interaction.reply({
        content: `♻️ Dismantled **${equipment.name}** for parts.${refundText}`,
        ephemeral: true,
      });
      return;
    }

    if (customId === 'rpg-load-equipment-set') {
      const setValue = interaction.values?.[0];
      if (!setValue || !setValue.startsWith('set_')) {
        await interaction.reply({ content: 'Invalid set selection.', ephemeral: true });
        return;
      }

      const setIndex = parseInt(setValue.replace('set_', ''));
      const set = player.equipmentSets?.[setIndex];

      if (!set || !set.items) {
        await interaction.reply({ content: 'Equipment set not found.', ephemeral: true });
        return;
      }

      // Load the set
      player.equippedItems = { ...set.items };
      player.clearStatsCache();
      this.persistPlayer(player);

      await interaction.reply({
        content: `✅ Loaded equipment set: **${set.name}**`,
        ephemeral: true,
      });

      // Refresh the sets view
      await this.handleEquipmentSets(interaction, player);
      return;
    }

    if (customId === 'rpg-delete-equipment-set') {
      const setValue = interaction.values?.[0];
      if (!setValue || !setValue.startsWith('delete_')) {
        await interaction.reply({ content: 'Invalid set selection.', ephemeral: true });
        return;
      }

      const setIndex = parseInt(setValue.replace('delete_', ''));
      const set = player.equipmentSets?.[setIndex];

      if (!set) {
        await interaction.reply({ content: 'Equipment set not found.', ephemeral: true });
        return;
      }

      player.equipmentSets.splice(setIndex, 1);
      this.persistPlayer(player);

      await interaction.reply({
        content: `🗑️ Deleted equipment set: **${set.name}**`,
        ephemeral: true,
      });

      // Refresh the sets view
      await this.handleEquipmentSets(interaction, player);
      return;
    }

    if (customId === 'rpg-profession-initial-select') {
      const professionId = interaction.values?.[0];
      if (!professionId) {
        await interaction.reply({ content: 'No profession selected.', ephemeral: true });
        return;
      }

      if (!player.professions) player.professions = [];
      if (!player.professionLevels) player.professionLevels = {};

      player.professions.push(professionId);
      player.professionLevels[professionId] = 1;
      player.characterCreated = true;
      this.persistPlayer(player);

      // Show welcome message and continue button
      const professionNames = { blacksmith: 'Blacksmith', botanic: 'Botanic', enchanter: 'Enchanter', gathering: 'Gatherer' };
      const embed = UIBuilder.createStoryIntroEmbed();
      const continueButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-enter-world')
          .setLabel('Begin Adventure')
          .setStyle(ButtonStyle.Success)
      );

      await this.updateInteractionWithTracking(interaction, {
        content: `💼 Profession selected: **${professionNames[professionId]}**\n\n✨ Profession slots unlock at levels 15, 20, and 35.`,
        embeds: [embed],
        components: [continueButton],
      });
      return;
    }

    if (customId === 'rpg-profession-select') {
      const professionId = interaction.values?.[0];
      if (!professionId) {
        await interaction.reply({ content: 'No profession selected.', ephemeral: true });
        return;
      }

      const maxSlots = player.maxProfessions || 1;
      if ((player.professions?.length || 0) >= maxSlots) {
        await interaction.reply({ content: 'No available profession slots.', ephemeral: true });
        return;
      }

      if (!player.professions) player.professions = [];
      if (!player.professionLevels) player.professionLevels = {};

      if (!player.professions.includes(professionId)) {
        player.professions.push(professionId);
        player.professionLevels[professionId] = 1;
        this.persistPlayer(player);
      }

      await this.handleProfessions(interaction, player);
      return;
    }

    if (customId === 'rpg-profession-rewards-select') {
      const professionId = interaction.values?.[0];
      if (!professionId) {
        await interaction.reply({ content: 'No profession selected.', ephemeral: true });
        return;
      }
      await this.handleProfessionRewardsDisplay(interaction, player, professionId);
      return;
    }

    if (customId === 'rpg-talent-select') {
      const talentId = interaction.values?.[0];
      if (!talentId) {
        await interaction.reply({ content: 'No talent selected.', ephemeral: true });
        return;
      }
      await this.handleTalentUpgrade(interaction, player, talentId);
      return;
    }

    if (customId === 'rpg-skill-select') {
      const selection = interaction.values?.[0];
      if (!selection) {
        await interaction.reply({ content: 'No skill selected.', ephemeral: true });
        return;
      }
      
      // Parse selection: "learned-{skillId}" or "unlock-{skillId}"
      const parts = selection.split('-');
      const action = parts[0]; // "learned" or "unlock"
      const skillId = parts.slice(1).join('-'); // rejoin in case skillId has hyphens
      
      await this.handleSkillDetail(interaction, player, skillId, action);
      return;
    }

    if (customId === 'rpg-combat-style-select') {
      const selection = interaction.values?.[0];
      if (!selection || !selection.startsWith('style-')) {
        await interaction.reply({ content: 'No style selected.', ephemeral: true });
        return;
      }
      const styleId = selection.replace('style-', '');
      await this.startTrainingCombat(interaction, player, styleId);
      return;
    }

    if (customId === 'rpg-combat-skill-select') {
      const skillId = interaction.values?.[0];
      if (!skillId) {
        await interaction.reply({ content: 'No skill selected.', ephemeral: true });
        return;
      }
      await this.handleCombatSkillSelect(interaction, player, skillId);
      return;
    }

    if (customId === 'rpg-combat-gear-select') {
      const indexValue = interaction.values?.[0];
      if (indexValue === undefined) {
        await interaction.reply({ content: 'No gear set selected.', ephemeral: true });
        return;
      }
      const setIndex = Number(indexValue);
      await this.handleCombatGearSelect(interaction, player, setIndex);
      return;
    }

    if (customId === 'rpg-combat-stance-select') {
      const stanceId = interaction.values?.[0];
      if (!stanceId) {
        await interaction.reply({ content: 'No stance selected.', ephemeral: true });
        return;
      }
      await this.handleCombatStanceSelect(interaction, player, stanceId);
      return;
    }

    if (customId === 'rpg-boss-style-select') {
      const selection = interaction.values?.[0];
      if (!selection || !selection.startsWith('boss-style-')) {
        await interaction.reply({ content: 'No style selected.', ephemeral: true });
        return;
      }
      const parts = selection.replace('boss-style-', '').split('-');
      const bossId = parts[0];
      const styleId = parts[1];
      await this.startBossFight(interaction, player, bossId, styleId);
      return;
    }

    if (customId === 'rpg-group-style-select') {
      const selection = interaction.values?.[0];
      if (!selection || !selection.startsWith('group-style-')) {
        await interaction.reply({ content: 'No style selected.', ephemeral: true });
        return;
      }
      const parts = selection.replace('group-style-', '').split('-');
      const groupId = parts[0];
      const styleId = parts[1];
      await this.startGroupFight(interaction, player, groupId, 1, styleId);
      return;
    }

    if (customId === 'rpg-dungeon-boss-style-select') {
      const styleId = interaction.values?.[0];
      if (!styleId) {
        await interaction.reply({ content: 'No style selected.', ephemeral: true });
        return;
      }
      
      // Try memory context first, then fall back to player data (survives bot restarts)
      let dungeonContext = this.dungeonBossContext?.get(interaction.user.id);
      if (!dungeonContext && player.pendingBossDungeon) {
        dungeonContext = player.pendingBossDungeon;
      }
      
      if (!dungeonContext) {
        await interaction.reply({ content: 'Dungeon context lost. Please try again.', ephemeral: true });
        return;
      }
      
      // Get dungeon data
      const dungeon = getAvailableDungeons(player.level, player.currentWorld)
        .find(d => d.id === dungeonContext.dungeonId);
      
      if (!dungeon) {
        await interaction.reply({ content: 'Dungeon not found!', ephemeral: true });
        return;
      }

      // Start the dungeon boss fight with stored boss data
      await this.startDungeonBossFight(interaction, player, dungeon, dungeonContext.bossData, styleId);
      
      // Clear the context from both places
      this.dungeonBossContext?.delete(interaction.user.id);
      delete player.pendingBossDungeon;
      this.persistPlayer(player);
      return;
    }

    if (customId === 'rpg-achievement-select') {
      const achievementId = interaction.values?.[0];
      if (!achievementId) {
        await interaction.reply({ content: 'No achievement selected.', ephemeral: true });
        return;
      }
      await this.handleAchievementDetail(interaction, player, achievementId);
      return;
    }

    if (customId === 'rpg-party-remove-select') {
      const indexValue = interaction.values?.[0];
      if (indexValue === undefined) {
        await interaction.reply({ content: 'No party member selected.', ephemeral: true });
        return;
      }
      await this.handlePartyRemoveSelect(interaction, player, Number(indexValue));
      return;
    }

    if (customId === 'rpg-party-active-select') {
      const indexValue = interaction.values?.[0];
      if (indexValue === undefined) {
        await interaction.reply({ content: 'No party member selected.', ephemeral: true });
        return;
      }
      await this.handlePartyActiveSelect(interaction, player, Number(indexValue));
      return;
    }

    if (customId === 'rpg-quest-view-detail') {
      const questId = interaction.values?.[0];
      if (!questId) {
        await interaction.reply({ content: 'No quest selected.', ephemeral: true });
        return;
      }
      await this.handleQuestDetail(interaction, player, questId);
      return;
    }

    if (customId === 'rpg-defense-quest-select') {
      const questId = interaction.values?.[0];
      if (!questId) {
        await interaction.reply({ content: 'No quest selected.', ephemeral: true });
        return;
      }
      await this.handleDefenseQuestComplete(interaction, player, questId);
    }

    if (customId === 'rpg-guild-claim-limited') {
      // Guild quests have been removed
      await interaction.update({ content: '❌ Guild quests have been removed from the system.', components: [], embeds: [] });
      return;
    }

    /**
     * QOL Select Menu Handlers
     */
    
    // Boss Guide Select
    if (customId === 'rpg-boss-guide-select') {
      const bossId = interaction.values?.[0];
      if (!bossId) {
        await interaction.reply({ content: 'No boss selected.', ephemeral: true });
        return;
      }
      
      const boss = getBossTemplate(bossId);
      
      if (!boss) {
        await interaction.reply({ content: '❌ Boss not found.', ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`👹 **${boss.name} Guide**`)
        .setDescription(boss.description || 'A powerful boss')
        .addFields(
          { name: '💥 Element', value: boss.element || 'Unknown', inline: true },
          { name: '🛡️ Weakness', value: boss.weakness || 'Unknown', inline: true },
          { name: '🔥 Resistance', value: boss.resistance || 'None', inline: true }
        );

      // Add phase information
      for (let phase = 1; phase <= 3; phase++) {
        const phaseInfo = phase === 1 ? boss.phase1 : phase === 2 ? boss.phase2 : boss.phase3;
        if (phaseInfo) {
          const abilities = phaseInfo.abilities ? phaseInfo.abilities.map(a => typeof a === 'string' ? `• ${a}` : `• ${a.name || 'Unknown'}`).join('\n') : 'No abilities';
          embed.addFields({
            name: `Phase ${phase} (${phaseInfo.trigger || 100}% HP)`,
            value: `${phaseInfo.description || 'Special phase'}\n${abilities}`,
            inline: false
          });
        }
      }
      
      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-qol-boss-guide')
          .setLabel('Back to Boss List')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rpg-hub')
          .setLabel('🏠 Hub')
          .setStyle(ButtonStyle.Primary)
      );

      await this.updateInteractionWithTracking(interaction, { embeds: [embed], components: [backButton], ephemeral: true });
      return;
    }

    // Equipment Comparison Select
    if (customId === 'rpg-equipment-compare-select') {
      const slot = interaction.values?.[0];
      if (!slot) {
        await interaction.reply({ content: 'No slot selected.', ephemeral: true });
        return;
      }

      const equipped = player.equipment?.[slot];
      if (!equipped) {
        await interaction.reply({ content: `No equipment in ${slot} slot.`, ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ccff)
        .setTitle(`🔄 **${slot.toUpperCase()} Comparison**`);

      // Show current equipment
      embed.addFields({
        name: `Currently Equipped: ${equipped.name || 'Unknown'}`,
        value: `
          **Stats:**
          • Damage: ${equipped.damage || 0}
          • Defense: ${equipped.defense || 0}
          • Intelligence: ${equipped.intelligence || 0}
          • Agility: ${equipped.agility || 0}
          **Rarity:** ${equipped.rarity || 'common'}
        `,
        inline: false
      });

      embed.addFields({
        name: 'Tip',
        value: 'Use your inventory to compare with items you own.',
        inline: false
      });

      await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
      return;
    }

    // Environment Advantage Tool Select
    if (customId === 'rpg-env-advantage-select') {
      const envId = interaction.values?.[0];
      if (!envId) {
        await interaction.reply({ content: 'No environment selected.', ephemeral: true });
        return;
      }

      const env = getEnvironment(envId);

      if (!env) {
        await interaction.reply({ content: '❌ Environment not found.', ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`⚔️ **${env.name} Advantage Analysis**`)
        .setDescription(env.description || 'A battle arena');

      if (env.effects && env.effects.length > 0) {
        const hazards = env.effects.filter(e => e.type === 'hazard');
        const buffs = env.effects.filter(e => e.type === 'buff');

        if (hazards.length > 0) {
          const hazardText = hazards.map(h => `• ${h.name}: ${h.description} (${h.frequency}% chance)`).join('\n');
          embed.addFields({
            name: '⚠️ Environmental Hazards',
            value: hazardText,
            inline: false
          });
        }

        if (buffs.length > 0) {
          const buffText = buffs.map(b => `• ${b.name}: ${b.description} (${b.frequency}% chance)`).join('\n');
          embed.addFields({
            name: '✨ Environmental Buffs',
            value: buffText,
            inline: false
          });
        }
      }

      embed.addFields({
        name: '💡 Strategy Tip',
        value: 'Bring elements that counter the hazards and elements that benefit from the buffs!',
        inline: false
      });

      await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
      return;
    }

    // Equipment Builds - Load
    if (customId === 'rpg-builds-load-select') {
      const buildName = interaction.values?.[0];
      if (!buildName) {
        await interaction.reply({ content: 'No build selected.', ephemeral: true });
        return;
      }

      const result = this.equipmentBuilds.loadBuild(player.userId, buildName);
      if (!result.success) {
        await interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
        return;
      }

      // Equip all items from the build
      const build = result.build;
      Object.entries(build).forEach(([slot, item]) => {
        if (item) {
          if (!player.equipment) player.equipment = {};
          player.equipment[slot] = item;
        }
      });

      this.persistPlayer(player);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ **Build Loaded**')
        .setDescription(`Equipped build: **${buildName}**`);

      await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
      return;
    }

    // Equipment Builds - Delete
    if (customId === 'rpg-builds-delete-select') {
      const buildName = interaction.values?.[0];
      if (!buildName) {
        await interaction.reply({ content: 'No build selected.', ephemeral: true });
        return;
      }

      const result = this.equipmentBuilds.deleteBuild(player.userId, buildName);
      
      const embed = new EmbedBuilder()
        .setColor(result.success ? 0xff0000 : 0xff0000)
        .setTitle(result.success ? '✅ **Build Deleted**' : '❌ **Error**')
        .setDescription(result.message);

      await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
      return;
    }

    /**
     * NEW REMAINING FEATURES SELECT HANDLERS
     */

    // Profession Efficiency Select
    if (customId === 'rpg-profession-tips-select') {
      const professionId = interaction.values?.[0];
      if (!professionId) {
        await interaction.reply({ content: 'No profession selected.', ephemeral: true });
        return;
      }

      const strategy = this.professionEfficiency.getStrategyForLevel(player.level, professionId);
      const profit = this.professionEfficiency.calculateOptimalProfit(professionId, player.level, 1);
      const nextGoal = this.professionEfficiency.getNextLevelGoal(professionId, player.level);

      const embed = new EmbedBuilder()
        .setColor(0x00aa00)
        .setTitle(`💡 **${professionId.charAt(0).toUpperCase() + professionId.slice(1)} Efficiency Guide**`)
        .setDescription(`Optimized strategies for level ${player.level}`);

      if (strategy) {
        embed.addFields({
          name: '📍 Recommended Locations',
          value: strategy.locations?.join(', ') || 'N/A',
          inline: false
        }, {
          name: '💰 Hourly Profit',
          value: `~${profit.hourlyRate} gold/hour`,
          inline: true
        }, {
          name: '📊 Yield Rate',
          value: `${profit.yield} items/hour`,
          inline: true
        }, {
          name: '💡 Tip',
          value: strategy.tip || 'Keep improving your skills!',
          inline: false
        });
      }

      if (nextGoal) {
        embed.addFields({
          name: '🎯 Next Level Goal',
          value: `${nextGoal.requirement} → ${nextGoal.reward}`,
          inline: false
        });
      }

      await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
      return;
    }

    // Environment Predictions Select
    if (customId === 'rpg-env-predict-select') {
      const envId = interaction.values?.[0];
      if (!envId) {
        await interaction.reply({ content: 'No environment selected.', ephemeral: true });
        return;
      }

      const prediction = this.environmentPredictions.predictEffects(envId);
      const safeStrat = this.environmentPredictions.getSafeStrategy(envId);

      const embed = new EmbedBuilder()
        .setColor(0x6600ff)
        .setTitle(`🔮 **Environmental Prediction: ${prediction.environment}**`)
        .setDescription(prediction.prediction || 'No prediction available');

      if (prediction.hazards && prediction.hazards.length > 0) {
        const hazardText = prediction.hazards
          .map(h => `• ${h.name}: ${h.chance}% chance (${h.damage} damage)`)
          .join('\n');
        embed.addFields({
          name: '⚠️ Hazards',
          value: hazardText,
          inline: false
        });
      }

      if (prediction.buffs && prediction.buffs.length > 0) {
        const buffText = prediction.buffs
          .map(b => `• ${b.name}: ${b.chance}% chance (${b.effect})`)
          .join('\n');
        embed.addFields({
          name: '✨ Environmental Buffs',
          value: buffText,
          inline: false
        });
      }

      if (safeStrat && safeStrat.strategy) {
        embed.addFields({
          name: '🛡️ Safe Strategy',
          value: safeStrat.strategy,
          inline: false
        });
      }

      await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
      return;
    }

    // Theme Select
    if (customId === 'rpg-theme-select') {
      const themeId = interaction.values?.[0];
      if (!themeId) {
        await interaction.reply({ content: 'No theme selected.', ephemeral: true });
        return;
      }

      const result = this.uiThemeManager.setTheme(player.userId, themeId);

      if (result.success) {
        await interaction.reply({
          content: `✅ ${result.message}`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `❌ ${result.message}`,
          ephemeral: true
        });
      }
      return;
    }

    // Guild Leaderboard Sort Select
    if (customId === 'rpg-guild-leaderboard-sort') {
      const sortType = interaction.values?.[0];
      if (!sortType) {
        await interaction.reply({ content: 'No sort type selected.', ephemeral: true });
        return;
      }

      if (!player.guildId) {
        await interaction.reply({ content: '❌ You\'re not in a guild!', ephemeral: true });
        return;
      }

      const leaderboard = this.guildAnalytics.getLeaderboard(player.guildId, sortType);

      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle(`🏆 **Guild Leaderboard - Sorted by ${sortType.toUpperCase()}**`)
        .setDescription('Top members in your guild');

      leaderboard.slice(0, 10).forEach((member, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔹';
        
        let statLine = '';
        if (sortType === 'level') {
          statLine = `L${member.level}`;
        } else if (sortType === 'damage') {
          statLine = `${member.totalDamage} DMG`;
        } else if (sortType === 'bosses') {
          statLine = `${member.bossesFelled} Bosses`;
        } else if (sortType === 'dungeons') {
          statLine = `${member.dungeonsClear} Dungeons`;
        } else {
          statLine = `L${member.level} | ${member.totalDamage} DMG`;
        }

        embed.addFields({
          name: `${medal} #${rank}`,
          value: statLine,
          inline: false
        });
      });

      await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
      return;
    }

    // Player Leaderboard Category Select
    if (customId === 'rpg-leaderboard-select') {
      const category = interaction.values?.[0];
      if (!category) {
        await interaction.reply({ content: 'No category selected.', ephemeral: true });
        return;
      }
      // For select menus, use update() not deferReply()
      await this.handleLeaderboardViewFromSelect(interaction, category);
      return;
    }

    // Progress Tab Leaderboard Category Select
    if (customId === 'rpg-progress-leaderboard-select') {
      const category = interaction.values?.[0];
      const player = this.playerManager.getPlayer(interaction.user.id);
      if (!category) {
        await interaction.reply({ content: 'No category selected.', ephemeral: true });
        return;
      }
      // For select menus, use update() not deferReply()
      await this.handleProgressLeaderboardView(interaction, player, category);
      return;
    }
  }

  /**
   * Handle modal submit interactions
   */
  async handleModalSubmit(interaction) {
    const customId = interaction.customId;
    const player = this.playerManager.getPlayer(interaction.user.id);

    if (!player) {
      await interaction.reply({
        content: 'You need to run /rpg first!',
        ephemeral: true,
      });
      return;
    }

    if (customId === 'rpg-bounty-create-modal') {
      const title = interaction.fields.getTextInputValue('bounty_title');
      const description = interaction.fields.getTextInputValue('bounty_description');
      const target = interaction.fields.getTextInputValue('bounty_target');
      const rewardStr = interaction.fields.getTextInputValue('bounty_reward');

      const reward = parseInt(rewardStr, 10);
      if (isNaN(reward) || reward < 10 || reward > 10000) {
        await interaction.reply({
          content: '❌ Reward must be between 10 and 10000 gold.',
          ephemeral: true,
        });
        return;
      }

      if (!title.trim() || !description.trim() || !target.trim()) {
        await interaction.reply({
          content: '❌ Please fill in all fields.',
          ephemeral: true,
        });
        return;
      }

      // Create the bounty
      try {
        const newBounty = createPlayerBounty(player.userId, {
          title: title.trim(),
          description: description.trim(),
          target: target.trim(),
          creatorName: player.username,
          worldId: player.currentWorld,
          rewards: {
            gold: reward,
          },
        });

        await interaction.reply({
          content: `✅ **Bounty Created!**\n\n**${newBounty.title}**\nTarget: ${newBounty.target}\nReward: ${newBounty.rewards.gold}g`,
          ephemeral: false,
        });

        // Return to bounties list
        setTimeout(() => {
          this.handleGuildBounties(interaction, player);
        }, 500);
      } catch (error) {
        console.error('Error creating bounty:', error);
        await interaction.reply({
          content: '❌ Failed to create bounty. Please try again.',
          ephemeral: true,
        });
      }
      return;
    }

    if (customId === 'rpg-builds-save-modal') {
      const buildName = interaction.fields.getTextInputValue('build_name');

      if (!buildName.trim()) {
        await interaction.reply({
          content: '❌ Build name cannot be empty.',
          ephemeral: true
        });
        return;
      }

      const result = this.equipmentBuilds.saveBuild(player.userId, buildName.trim(), player.equipment || {});

      const embed = new EmbedBuilder()
        .setColor(result.success ? 0x00ff00 : 0xff0000)
        .setTitle(result.success ? '✅ **Build Saved**' : '❌ **Error**')
        .setDescription(result.message);

      await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
      return;
    }

    if (customId.startsWith('rpg-market-list-')) {
      const itemId = customId.replace('rpg-market-list-', '');
      const priceStr = interaction.fields.getTextInputValue('item_price');
      const quantityStr = interaction.fields.getTextInputValue('item_quantity') || '1';

      const price = parseInt(priceStr, 10);
      const quantity = parseInt(quantityStr, 10);

      if (isNaN(price) || price < 1) {
        await interaction.reply({
          content: '❌ Price must be at least 1 gold.',
          ephemeral: true,
        });
        return;
      }

      if (isNaN(quantity) || quantity < 1) {
        await interaction.reply({
          content: '❌ Quantity must be at least 1.',
          ephemeral: true,
        });
        return;
      }

      await this.handleMarketCreateListing(interaction, player, itemId, price, quantity);
      return;
    }

    if (customId === 'rpg-save-set-modal') {
      const setName = interaction.fields.getTextInputValue('set-name');
      
      if (!setName || setName.trim().length === 0) {
        await interaction.reply({
          content: '❌ Please provide a valid set name.',
          ephemeral: true,
        });
        return;
      }

      // Save the current equipment as a new set
      if (!player.equipmentSets) {
        player.equipmentSets = [];
      }

      // Check if set with same name exists
      const existingIndex = player.equipmentSets.findIndex(s => s.name === setName.trim());
      
      const newSet = {
        name: setName.trim(),
        items: { ...(player.equippedItems || {}) },
        savedAt: Date.now(),
      };

      if (existingIndex >= 0) {
        // Update existing set
        player.equipmentSets[existingIndex] = newSet;
        await interaction.reply({
          content: `✅ Updated equipment set: **${setName.trim()}**`,
          ephemeral: true,
        });
      } else {
        // Add new set
        player.equipmentSets.push(newSet);
        await interaction.reply({
          content: `✅ Saved new equipment set: **${setName.trim()}**`,
          ephemeral: true,
        });
      }

      this.persistPlayer(player);

      // Show the updated equipment sets view
      await this.handleEquipmentSets(interaction, player);
      return;
    }

    if (customId === 'rpg-party-add-modal') {
      const memberName = interaction.fields.getTextInputValue('member-name');
      const memberClass = interaction.fields.getTextInputValue('member-class');

      if (!memberName || memberName.trim().length === 0) {
        await interaction.reply({ content: '❌ Please provide a valid member name.', ephemeral: true });
        return;
      }

      if (!player.party) {
        player.party = { maxSize: 4, activeIndex: 0, members: [] };
      }

      if ((player.party.members?.length || 0) >= (player.party.maxSize || 4)) {
        await interaction.reply({ content: 'Party is full (max 4).', ephemeral: true });
        return;
      }

      player.party.members.push({
        userId: null,
        name: memberName.trim(),
        classId: memberClass?.trim() || null,
        role: 'member',
      });

      this.persistPlayer(player);
      await interaction.reply({ content: `✅ Added ${memberName.trim()} to the party.`, ephemeral: true });
      await this.handlePartyMenu(interaction, player);
      return;
    }

    if (customId === 'rpg-slots-custom-modal') {
      const amountStr = interaction.fields.getTextInputValue('amount');
      const amount = parseInt(amountStr, 10);
      const playerGold = player.gold || 0;

      if (isNaN(amount) || amount < 1) {
        await interaction.reply({
          content: '❌ Please enter a valid amount (minimum 1 gold).',
          ephemeral: true,
        });
        return;
      }

      if (amount > playerGold) {
        await interaction.reply({
          content: `❌ You don't have enough gold! You have ${playerGold}, but tried to bet ${amount}.`,
          ephemeral: true,
        });
        return;
      }

      if (amount > 100000) {
        await interaction.reply({
          content: '❌ Maximum bet is 100,000 gold.',
          ephemeral: true,
        });
        return;
      }

      await this.playSlots(interaction, player, amount);
      return;
    }

    if (customId === 'rpg-guild-create-modal') {
      const guildName = interaction.fields.getTextInputValue('guild_name');
      const guildTag = interaction.fields.getTextInputValue('guild_tag');
      const guildDescription = interaction.fields.getTextInputValue('guild_description') || '';

      const creationCost = 10000;
      if ((player.gold || 0) < creationCost) {
        await interaction.reply({
          content: `❌ You need ${creationCost} gold to create a guild!`,
          ephemeral: true,
        });
        return;
      }

      const result = this.guildManager.createGuild(
        player.userId,
        guildName.trim(),
        guildTag.trim().toUpperCase(),
        guildDescription.trim(),
        { isPublic: true, minLevel: 1 }
      );

      if (!result.success) {
        await interaction.reply({
          content: `❌ ${result.error}`,
          ephemeral: true,
        });
        return;
      }

      // Deduct gold
      player.gold -= creationCost;
      this.trackGoldSpent(player, creationCost, 'guild');
      this.persistPlayer(player);

      await interaction.reply({
        content: `✅ **Guild Created!**\n\n🏰 **[${result.guild.tag}] ${result.guild.name}**\n\nYou are now the guild leader. Invite members and start your adventure!`,
        ephemeral: true,
      });

      setTimeout(() => {
        interaction.deleteReply().catch(() => {});
      }, 5000);

      // Show guild dashboard
      setTimeout(() => {
        this.handleGuild(interaction, player);
      }, 1000);
      return;
    }

    if (customId === 'rpg-guild-donate-modal') {
      const amountStr = interaction.fields.getTextInputValue('amount');
      const amount = parseInt(amountStr, 10);

      if (isNaN(amount) || amount < 1) {
        await interaction.reply({
          content: '❌ Please enter a valid amount (minimum 1 gold).',
          ephemeral: true,
        });
        return;
      }

      if ((player.gold || 0) < amount) {
        await interaction.reply({
          content: `❌ You don't have enough gold! You have ${player.gold}, but tried to donate ${amount}.`,
          ephemeral: true,
        });
        return;
      }

      const guild = this.guildManager.getPlayerGuild(player.userId);
      if (!guild) {
        await interaction.reply({
          content: '❌ You are not in a guild!',
          ephemeral: true,
        });
        return;
      }

      const result = this.guildManager.contributeGold(guild.id, player.userId, amount);
      if (!result.success) {
        await interaction.reply({
          content: `❌ ${result.error}`,
          ephemeral: true,
        });
        return;
      }

      player.gold -= amount;
      this.trackGoldSpent(player, amount, 'guild');
      this.persistPlayer(player);

      await interaction.reply({
        content: `✅ Donated **${amount}** gold to the guild treasury!`,
        ephemeral: true,
      });

      setTimeout(() => {
        interaction.deleteReply().catch(() => {});
      }, 5000);

      // Show guild dashboard
      setTimeout(() => {
        this.handleGuild(interaction, player);
      }, 500);
      return;
    }

    if (customId === 'rpg-guild-minlevel-modal') {
      const minLevelStr = interaction.fields.getTextInputValue('min_level');
      const minLevel = parseInt(minLevelStr, 10);

      if (isNaN(minLevel) || minLevel < 1 || minLevel > 100) {
        await interaction.reply({
          content: '❌ Minimum level must be between 1 and 100.',
          ephemeral: true,
        });
        return;
      }

      const guild = this.guildManager.getPlayerGuild(player.userId);
      if (!guild) {
        await interaction.reply({
          content: '❌ You are not in a guild!',
          ephemeral: true,
        });
        return;
      }

      const member = guild.members[player.userId];
      if (member.role !== 'leader') {
        await interaction.reply({
          content: '❌ Only the guild leader can change settings!',
          ephemeral: true,
        });
        return;
      }

      guild.settings.minLevel = minLevel;
      this.guildManager.save();

      await interaction.reply({
        content: `✅ Minimum level requirement set to **${minLevel}**!`,
        ephemeral: true,
      });

      // Refresh settings view
      setTimeout(() => {
        this.handleGuildSettings(interaction, player);
      }, 1000);
      return;
    }
  }

  /**
   * Handle stats button
   */
  buildQuestHierarchy(quests) {
    if (!Array.isArray(quests) || quests.length === 0) return { roots: [], childToParent: new Map() };
    
    const questIds = new Set(quests.map(quest => quest.id));
    const childToParent = new Map();
    
    quests.forEach(quest => {
      // Map direct nextQuestId (linear chain progression)
      if (quest.nextQuestId) {
        childToParent.set(quest.nextQuestId, quest.id);
      }
      
      // Map branch quest IDs to their parent (choice-based progression)
      if (Array.isArray(quest.branches)) {
        quest.branches.forEach(branch => {
          if (branch.nextQuestId) {
            childToParent.set(branch.nextQuestId, quest.id);
          }
        });
      }
    });

    // Infer chain links from quest ID patterns when explicit links are missing
    quests.forEach(quest => {
      const id = quest.id;
      if (!id || childToParent.has(id)) return;

      const stepMatch = id.match(/^(.*)_step(\d+)$/);
      if (stepMatch) {
        const baseId = stepMatch[1];
        const stepNumber = Number(stepMatch[2]);
        const previousStepId = `${baseId}_step${stepNumber - 1}`;
        if (stepNumber > 1 && questIds.has(previousStepId)) {
          childToParent.set(id, previousStepId);
          return;
        }
        if (questIds.has(baseId)) {
          childToParent.set(id, baseId);
          return;
        }
      }

      const choiceMatch = id.match(/^(.*)_choice$/);
      if (choiceMatch) {
        const baseId = choiceMatch[1];
        let highestStep = null;
        let highestStepNumber = 0;
        for (const candidateId of questIds) {
          const candidateMatch = candidateId.match(new RegExp(`^${baseId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_step(\\d+)$`));
          if (!candidateMatch) continue;
          const candidateStepNumber = Number(candidateMatch[1]);
          if (candidateStepNumber > highestStepNumber) {
            highestStep = candidateId;
            highestStepNumber = candidateStepNumber;
          }
        }
        if (highestStep) {
          childToParent.set(id, highestStep);
          return;
        }
        if (questIds.has(baseId)) {
          childToParent.set(id, baseId);
          return;
        }
      }

      const branchMatch = id.match(/^(.*\d+)([a-z])$/i);
      if (branchMatch) {
        const baseId = branchMatch[1];
        const choiceId = `${baseId}_choice`;
        if (questIds.has(choiceId)) {
          childToParent.set(id, choiceId);
          return;
        }
        if (questIds.has(baseId)) {
          childToParent.set(id, baseId);
        }
      }
    });
    
    // Find root quests (ones that don't have a parent)
    const roots = quests.filter(quest => !childToParent.has(quest.id));
    
    return { roots, childToParent };
  }

  filterStartingQuests(quests) {
    if (!Array.isArray(quests) || quests.length === 0) return [];
    
    // Use quest hierarchy - include root quests (chains start) and standalone quests
    const { roots } = this.buildQuestHierarchy(quests);
    return roots;
  }

  inferNextQuestInChain(currentQuest, allQuests) {
    if (!currentQuest || !Array.isArray(allQuests) || allQuests.length === 0) return null;

    const questById = new Map(allQuests.map(quest => [quest.id, quest]));

    if (currentQuest.nextQuestId && questById.has(currentQuest.nextQuestId)) {
      return questById.get(currentQuest.nextQuestId);
    }

    const currentId = currentQuest.id || '';
    const stepMatch = currentId.match(/^(.*)_step(\d+)$/);
    if (stepMatch) {
      const baseId = stepMatch[1];
      const stepNumber = Number(stepMatch[2]);
      const nextStepId = `${baseId}_step${stepNumber + 1}`;
      if (questById.has(nextStepId)) return questById.get(nextStepId);

      const choiceId = `${baseId}_choice`;
      if (questById.has(choiceId)) return questById.get(choiceId);
      return null;
    }

    if (!currentId.endsWith('_choice')) {
      const step1Id = `${currentId}_step1`;
      if (questById.has(step1Id)) return questById.get(step1Id);

      const choiceId = `${currentId}_choice`;
      if (questById.has(choiceId)) return questById.get(choiceId);
    }

    return null;
  }

  /**
   * Handle quests button
   */
  getItemProfessionType(item) {
    if (!item) return null;
    
    // Check by profession crafting materials
    const professionMaterials = {
      blacksmith: ['iron_ore', 'coal', 'copper_ore', 'leather', 'mithril_ore', 'adamantite', 'steel', 'granite', 'dragonhide'],
      botanic: ['herb', 'rare_flower', 'water', 'moonflower', 'blaze_flower', 'mystic_bark', 'arcane_essence'],
      enchanter: ['mana_crystal', 'mithril_ore', 'arcane_essence', 'adamantite'],
    };

    const itemId = (item.id || '').toLowerCase();
    for (const [profession, materials] of Object.entries(professionMaterials)) {
      if (materials.some(mat => itemId.includes(mat))) {
        return profession;
      }
    }
    return null;
  }

  /**
   * Handle inventory filter by rarity
   */
  dismantleMultipleItems(player, itemIds) {
    const results = {
      successful: [],
      failed: [],
      totalMaterials: {},
    };

    for (const itemId of itemIds) {
      const equipment = getEquipment(itemId) || getItemByIdDynamic(itemId);
      if (!equipment) {
        results.failed.push(`❌ ${itemId || 'Unknown'}: Item not found`);
        continue;
      }

      const recipe = Object.values(RECIPES).find(r => r.output.item === itemId);
      if (!recipe || !recipe.materials) {
        results.failed.push(`❌ ${equipment.name}: Cannot dismantle (unique/dungeon gear)`);
        continue;
      }

      // Calculate materials
      const baseMaterials = this.getAdjustedMaterials(recipe.materials);
      const adjustedMaterials = this.applyCostMultiplier(baseMaterials, this.getProfessionCostMultiplier(player));
      const refundMaterials = {};
      
      for (const [matId, qty] of Object.entries(adjustedMaterials)) {
        const refundQty = Math.floor(qty * 0.2);
        if (refundQty > 0) {
          refundMaterials[matId] = refundQty;
          results.totalMaterials[matId] = (results.totalMaterials[matId] || 0) + refundQty;
        }
      }

      // Check if equipped
      const isEquipped = Object.values(player.equippedItems || {}).includes(itemId);

      // Remove item from inventory or equipped slot
      if (isEquipped) {
        for (const [slot, equippedId] of Object.entries(player.equippedItems)) {
          if (equippedId === itemId) {
            delete player.equippedItems[slot];
            break;
          }
        }
      } else {
        const invItem = player.inventory.find(i => i && i.id === itemId && i.type === 'equipment');
        if (invItem) {
          if (invItem.quantity > 1) {
            invItem.quantity -= 1;
          } else {
            const index = player.inventory.indexOf(invItem);
            if (index > -1) player.inventory.splice(index, 1);
          }
        }
      }

      // Add materials
      for (const [matId, qty] of Object.entries(refundMaterials)) {
        this.addMaterialToInventory(player, matId, qty);
      }

      results.successful.push(`♻️ ${equipment.name}`);
    }

    // Save once at the end
    player.clearStatsCache();
    this.persistPlayer(player);

    return results;
  }

  /**
   * Start the remove enchant flow - show slots with enchants
   */
  async updateInteractionWithTracking(interaction, options) {
    const startTime = Date.now();
    
    try {
      // Check if interaction is already replied or deferred
      if (interaction.replied) {
        await interaction.editReply(options);
      } else if (interaction.deferred) {
        await interaction.editReply(options);
      } else {
        await interaction.update(options);
      }
      
      // Always track ownership; auto-delete tracking remains optional
      this.trackMenuMessage(interaction.user.id, interaction);
      
      // Track performance metrics
      const responseTime = Date.now() - startTime;
      this.updatePerformanceMetrics(responseTime);
      
      // Log slow requests for debugging
      if (responseTime > 1000) {
        console.warn(`[Performance] Slow interaction: ${responseTime}ms - ${interaction.customId}`);
      }
    } catch (err) {
      // Gracefully handle expired interactions (15 minute timeout)
      if (err.code === 10062 || err.message?.includes('Unknown interaction')) {
        console.warn(`[Interaction] Expired interaction ignored: ${interaction.customId || 'unknown'}`);
        return; // Silently ignore - user was clicking old message
      }
      console.error('[Performance] Interaction update failed:', err);
      throw err;
    }
  }
  
  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(responseTime) {
    this.performanceMetrics.totalRequests++;
    if (responseTime > 2000) {
      this.performanceMetrics.slowRequests++;
    }
    
    // Calculate rolling average
    const { avgResponseTime, totalRequests } = this.performanceMetrics;
    this.performanceMetrics.avgResponseTime = 
      ((avgResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const { totalRequests, slowRequests, avgResponseTime } = this.performanceMetrics;
    return {
      totalRequests,
      slowRequests,
      slowRequestRate: totalRequests > 0 ? (slowRequests / totalRequests * 100).toFixed(1) + '%' : '0%',
      avgResponseTime: avgResponseTime.toFixed(0) + 'ms',
      cacheSize: this.dataCache.size,
      playerCacheSize: this.playerCache.size
    };
  }

  /**
   * Track menu for auto-deletion on next interaction
   */
  trackMenuMessage(userId, interaction) {
    const messageId = interaction.message?.id;
    
    // Track by user ID for auto-deletion only when detailed tracking is enabled
    if (this.enableDetailedTracking) {
      this.activeMenus.set(userId, {
        messageId: messageId,
        channelId: interaction.channel?.id,
        timestamp: Date.now(),
      });
    }
    
    // Also track ownership by message ID to prevent other users from clicking
    if (messageId) {
      this.activeMenus.set(messageId, {
        ownerId: userId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Track navigation when entering a menu
   */
  trackMenuNavigation(player, menuName) {
    // Skip tracking if disabled for performance
    if (!this.enableDetailedTracking) {
      player.currentMenu = menuName;
      return;
    }
    
    if (!player.menuHistory) player.menuHistory = [];
    if (!player.currentMenu) player.currentMenu = 'main';
    
    // Only add to history if different from current
    if (player.currentMenu !== menuName) {
      // Don't add duplicate consecutive entries
      const lastInHistory = player.menuHistory[player.menuHistory.length - 1];
      if (lastInHistory !== player.currentMenu) {
        player.menuHistory.push(player.currentMenu);
      }
      player.currentMenu = menuName;
      
      // Limit history to prevent infinite loops (max 10 levels deep)
      if (player.menuHistory.length > 10) {
        player.menuHistory = player.menuHistory.slice(-10);
      }
    }
  }

  /**
   * Get previous menu from history
   */
  getPreviousMenu(player) {
    if (!player.menuHistory || player.menuHistory.length === 0) {
      return 'main';
    }
    return player.menuHistory.pop();
  }

  async handleBackButton(interaction, player) {
    if (!player.characterCreated) {
      const embed = UIBuilder.createClassSelectionEmbed();
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-narrative-defender')
          .setLabel('1. Stand Your Ground')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-narrative-striker')
          .setLabel('2. Strike First')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('rpg-narrative-tactician')
          .setLabel('3. Study Patterns')
          .setStyle(ButtonStyle.Success)
      );

      await this.updateInteractionWithTracking(interaction, {
        content: 'Create your character by choosing a starter path:',
        embeds: [embed],
        components: [buttons],
      });
      return;
    }

    // Sub-menus that should go back to their parent menu
    const subMenuMap = {
      // Equipment sub-menus
      'manage-equipment': 'equipment',
      'equipment-sets': 'equipment',
      'upgrade': 'equipment',
      // Inventory sub-menus
      'inventory-rarity-filter': 'inventory',
      'inventory-profession-filter': 'inventory',
      // Professions sub-menus
      'alchemy': 'professions',
      'enchant': 'professions',
      // Skills sub-menus
      'skill-detail': 'skills',
      // Gathering sub-menus - gather goes to main since it's on the main menu
      'gather': 'main',
      'gather-area-select': 'gather',
      'gather-area-details': 'gather',
      'gather-area-drops': 'gather',
      'gather-rewards': 'gather',
      'autogather': 'gather',
      'gathering-tools': 'gather',
      'daily-rewards': 'main',
      // Stats sub-menus
      'stats-talents': 'stats',
      // Combat sub-menus (single parents - always come from combat-menu)
      'dungeon': 'combat-menu',
      'raids': 'combat-menu',
      'combat-training': 'combat-menu',
      'world-boss': 'combat-menu',
      // Arena sub-menus
      'arena': 'combat-menu',
      'arena-shop': 'arena',
      // Player sub-menus (character, skills, equipment, talents are sub-menus of player)
      'character': 'player',
      'skills': 'player',
      'equipment': 'player',
      'talents': 'player',
      'progress': 'main',
      'achievements': 'progress',
      'collectibles': 'progress',
      'collectibles-view': 'collectibles',
      'session-stats': 'progress',
      'story-log': 'player',
      // NOTE: Removed 'arena' from subMenuMap because it can be accessed from multiple parents
      // (combat-menu, economy, player, etc.). It now relies on history tracking for proper back navigation.
      // NOTE: Removed 'alchemy', 'enchant', 'professions' from subMenuMap because they have multiple parents:
      // - alchemy/enchant: accessible from both Crafting AND Professions menus
      // - professions: accessible from Crafting, Player, and Economy menus
      // These now rely on history stack for proper back navigation
    };

    // If current menu is a sub-menu, go to parent
    if (subMenuMap[player.currentMenu]) {
      const parentMenu = subMenuMap[player.currentMenu];
      
      // Remove the parent from history if it's at the end (prevents loops)
      if (player.menuHistory && player.menuHistory.length > 0 && 
          player.menuHistory[player.menuHistory.length - 1] === parentMenu) {
        player.menuHistory.pop();
      }
      
      player.currentMenu = parentMenu;
      
      // Call handler with skipTracking to prevent adding to history
      return await this.navigateToMenu(interaction, player, parentMenu, true);
    }

    // Get previous menu from history
    if (!player.menuHistory || player.menuHistory.length === 0) {
      // No history, go to main menu
      player.currentMenu = 'main';
      player.menuHistory = [];
      const embed = UIBuilder.createMainMenuEmbed(player, interaction.user);
      const buttons = this.createMainMenuButtons();
      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: buttons,
      });
      return;
    }

    const previousMenu = this.getPreviousMenu(player);
    
    // If going back to main, clear history
    if (previousMenu === 'main') {
      player.currentMenu = 'main';
      player.menuHistory = [];
      const embed = UIBuilder.createMainMenuEmbed(player, interaction.user);
      const buttons = this.createMainMenuButtons();
      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: buttons,
      });
      return;
    }

    // Route to the previous menu based on what it was
    player.currentMenu = previousMenu;
    return await this.navigateToMenu(interaction, player, previousMenu, true);
  }

  /**
   * Navigate to a specific menu
   */
  async navigateToMenu(interaction, player, menuName, skipTracking = false) {
    switch(menuName) {
      case 'main':
        player.currentMenu = 'main';
        player.menuHistory = [];
        const mainEmbed = UIBuilder.createMainMenuEmbed(player, interaction.user);
        const mainButtons = this.createMainMenuButtons();
        await this.updateInteractionWithTracking(interaction, {
          embeds: [mainEmbed],
          components: mainButtons,
        });
        return;
      case 'player':
        return await this.handlePlayerMenu(interaction, player, skipTracking);
      case 'character':
        return await this.handleCharacterSheet(interaction, player, skipTracking);
      case 'inventory':
        return await this.handleInventory(interaction, player, skipTracking);
      case 'skills':
        return await this.handleSkills(interaction, player, skipTracking);
      case 'equipment':
        return await this.handleEquipment(interaction, player, skipTracking);
      case 'talents':
        return await this.handleTalents(interaction, player, skipTracking);
      case 'stats':
        return await this.handleStats(interaction, player, skipTracking);
      case 'quests':
        return await this.handleQuests(interaction, player, skipTracking);
      case 'goals':
        return await this.handleGoals(interaction, player, skipTracking);
      case 'crafting':
        return await this.handleCrafting(interaction, player, skipTracking);
      case 'professions':
        return await this.handleProfessions(interaction, player, skipTracking);
      case 'alchemy':
        return await this.handleAlchemy(interaction, player, skipTracking);
      case 'enchant':
        return await this.handleEnchant(interaction, player, skipTracking);
      case 'shop':
        return await this.handleShop(interaction, player, skipTracking);
      case 'adventure':
        return await this.handleAdventure(interaction, player, skipTracking);
      case 'gather':
        return await this.handleGatherMenu(interaction, player, skipTracking);
      case 'gather-area-select':
        return await this.handleGatheringAreaSelect(interaction, player, skipTracking);
      case 'dungeon':
        return await this.handleDungeons(interaction, player, skipTracking);
      case 'raids':
        return await this.handleRaids(interaction, player, skipTracking);
      case 'combat-menu':
        return await this.handleCombatMenu(interaction, player, skipTracking);
      case 'guild':
        return await this.handleGuild(interaction, player, skipTracking);
      case 'economy':
        return await this.handleEconomyMenu(interaction, player, skipTracking);
      case 'party':
        return await this.handlePartyMenu(interaction, player, skipTracking);
      case 'progress':
        return await this.handleProgressMenu(interaction, player, skipTracking);
      case 'achievements':
        return await this.handleAchievements(interaction, player, skipTracking);
      case 'collectibles':
        return await this.handleCollectibles(interaction, player, skipTracking);
      case 'help':
        return await this.handleHelpMenu(interaction, player, skipTracking);
      case 'story-log':
        return await this.handleStoryLog(interaction, player, skipTracking);
      default:
        // Fall back to main menu
        player.currentMenu = 'main';
        player.menuHistory = [];
        const embed = UIBuilder.createMainMenuEmbed(player, interaction.user);
        const buttons = this.createMainMenuButtons();
        await this.updateInteractionWithTracking(interaction, {
          embeds: [embed],
          components: buttons,
        });
        return;
    }
  }

  async handleBackToHub(interaction, player) {
    if (!player.characterCreated) {
      return await this.handleBackButton(interaction, player);
    }

    player.currentMenu = 'main';
    player.menuHistory = [];
    const embed = UIBuilder.createMainMenuEmbed(player, interaction.user);
    const buttons = this.createMainMenuButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Create combat action buttons
   */
  createCombatButtons(allowGearSwitch = true) {
    const row1Components = [
      new ButtonBuilder()
        .setCustomId('rpg-combat-next-turn')
        .setLabel('⚡ Next Turn')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-combat-skill-menu')
        .setLabel('⚔️ Skills')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-combat-stance-menu')
        .setLabel('🛡️ Stance')
        .setStyle(ButtonStyle.Primary),
    ];

    if (allowGearSwitch) {
      row1Components.push(
        new ButtonBuilder()
          .setCustomId('rpg-combat-gear-set')
          .setLabel('⚙️ Gear Set')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    row1Components.push(
      new ButtonBuilder()
        .setCustomId('rpg-combat-auto')
        .setLabel('⚔️ Auto')
        .setStyle(ButtonStyle.Secondary)
    );

    const row1 = new ActionRowBuilder().addComponents(row1Components);
    
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-combat-forfeit')
        .setLabel('🏃 Forfeit & Exit')
        .setStyle(ButtonStyle.Danger)
    );

    return [row1, row2];
  }

  createGuildBossCombatButtons(allowGearSwitch = true) {
    const components = [
      new ButtonBuilder()
        .setCustomId('rpg-combat-next-turn')
        .setLabel('⚡ Next Turn')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-combat-skill-menu')
        .setLabel('⚔️ Skills')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-combat-stance-menu')
        .setLabel('🛡️ Stance')
        .setStyle(ButtonStyle.Primary),
    ];

    if (allowGearSwitch) {
      components.push(
        new ButtonBuilder()
          .setCustomId('rpg-combat-gear-set')
          .setLabel('⚙️ Gear Set')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    components.push(
      new ButtonBuilder()
        .setCustomId('rpg-combat-refresh')
        .setLabel('🔄 Refresh')
        .setStyle(ButtonStyle.Secondary)
    );

    const row1 = new ActionRowBuilder().addComponents(components);
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-boss-attack')
        .setLabel('← Back to Boss')
        .setStyle(ButtonStyle.Secondary)
    );
    return [row1, row2];
  }

  /**
   * Handle class selection
   */
  async handleClassSelection(interaction, player) {
    const embed = UIBuilder.createClassSelectionEmbed();
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-narrative-defender')
        .setLabel('1. Stand Your Ground')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-narrative-striker')
        .setLabel('2. Strike First')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-narrative-tactician')
        .setLabel('3. Study Patterns')
        .setStyle(ButtonStyle.Success)
    );

    const back = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons, back],
    });
  }

  async handleNarrativeChoice(interaction, player) {
    const choiceId = interaction.customId.replace('rpg-narrative-', '');
    const choice = getNarrativeChoice(choiceId);
    if (!choice) {
      await interaction.reply({
        content: 'Invalid choice.',
        ephemeral: true,
      });
      return;
    }

    player.applyNarrativeChoice(choiceId);
    player.characterCreated = false; // Still need to select actual class
    this.persistPlayer(player);

    // Show class selection
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎓 Choose Your Class')
      .setDescription(`Your narrative path: **${choice.title}**\n\nNow select your combat class:\n\n**Warrior** - High HP, strong defense, melee attacks\n**Mage** - High mana, powerful spells, ranged damage\n**Rogue** - High agility, critical strikes, swift attacks\n**Paladin** - Balanced fighter with healing abilities`);

    const classButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-select-warrior')
        .setLabel('⚔️ Warrior')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-select-mage')
        .setLabel('🔮 Mage')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-select-rogue')
        .setLabel('🗡️ Rogue')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-select-paladin')
        .setLabel('✨ Paladin')
        .setStyle(ButtonStyle.Primary)
    );

    await this.updateInteractionWithTracking(interaction, {
      content: `✨ Your path is chosen: **${choice.title}**`,
      embeds: [embed],
      components: [classButtons],
    });
  }

  /**
   * Handle class selection
   */
  async handleClassSelect(interaction, player) {
    const classId = interaction.customId.replace('rpg-select-', '');
    const classData = getClass(classId);
    
    if (!classData) {
      await interaction.reply({
        content: 'Invalid class selected.',
        ephemeral: true,
      });
      return;
    }

    // Apply class to player
    player.class = classId;
    player.classUnlocked = true;
    
    // Add starting skills
    if (classData.startingSkills) {
      player.skills = [...classData.startingSkills];
      // Initialize skill levels to 1 for starting skills
      for (const skillId of classData.startingSkills) {
        player.skillLevels[skillId] = 1;
      }
    }
    
    this.persistPlayer(player);

    const embed = UIBuilder.createStoryIntroEmbed();
    const continueButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-select-profession')
        .setLabel('Choose Profession')
        .setStyle(ButtonStyle.Success)
    );

    await this.updateInteractionWithTracking(interaction, {
      content: `⚔️ Class selected: **${classData.name}**`,
      embeds: [embed],
      components: [continueButton],
    });
  }

  /**
   * Handle initial profession selection during character creation
   */
  async handleProfessionSelect(interaction, player) {
    const embed = new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('⚙️ Choose Your First Profession')
      .setDescription(
        'Professions allow you to craft items, gather materials, and earn rewards. You can select another profession at level 10.\n\n' +
        '**Blacksmith** - Craft weapons and armor\n' +
        '**Botanic** - Craft potions and herbal remedies\n' +
        '**Enchanter** - Enhance equipment with magical properties'
      );

    const professions = [
      { label: 'Blacksmith', value: 'blacksmith', emoji: '🔨' },
      { label: 'Botanic', value: 'botanic', emoji: '🌿' },
      { label: 'Enchanter', value: 'enchanter', emoji: '✨' },
    ];

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-profession-initial-select')
        .setPlaceholder('Choose your profession')
        .addOptions(professions.map((p) => ({
          label: p.label,
          value: p.value,
          emoji: p.emoji,
        })))
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow],
    });
  }

  /**
   * Enter the current world (Tier 1)
   */
  async handleEnterWorld(interaction, player) {
    if (!player.characterCreated) {
      await this.handleClassSelection(interaction, player);
      return;
    }

    const embed = UIBuilder.createMainMenuEmbed(player, interaction.user);
    const buttons = this.createMainMenuButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Handle character sheet
   */
  calculateEquipmentScore(equipment) {
    if (!equipment) return 0;
    const stats = equipment.stats || equipment.bonuses || equipment;
    let score = 0;
    // Weight positive stats heavily, negative stats reduce score
    const statKeys = [
      'strength', 'defense', 'agility', 'intelligence', 'vitality', 'wisdom',
      'damage', 'hp', 'maxHp', 'mana', 'maxMana', 'damageBonus', 'spellPower',
      'critChance', 'critDamage', 'dodgeChance', 'blockChance', 'damageReduction',
      'hpRegen', 'luck', 'luckBonus'
    ];
    statKeys.forEach(key => {
      const value = stats[key];
      if (typeof value === 'number') {
        score += Math.abs(value) * (value > 0 ? 1 : 0.5);
      }
    });
    const rarityValues = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
    const rarityValue = rarityValues[String(equipment.rarity || '').toLowerCase()] || 0;
    if (rarityValue > 0) {
      score *= 1 + (rarityValue * 0.08);
    }
    return score;
  }

  /**
   * Find the best weapon/equipment overall
   */
  findBestEquipment(equipmentItems) {
    if (!equipmentItems || equipmentItems.length === 0) return null;
    
    let bestItem = null;
    let bestScore = -1;
    
    for (const item of equipmentItems) {
      const equipment = getEquipment(item.id) || getItemByIdDynamic(item.id);
      const slot = equipment?.slot || item.slot || (equipment ? this.inferSlotFromCategory(equipment) : null);
      const hasDamage = typeof equipment?.damage === 'number' && equipment.damage > 0;
      if (equipment && (slot === 'weapon' || hasDamage)) {
        const score = this.calculateEquipmentScore(equipment);
        if (score > bestScore) {
          bestScore = score;
          bestItem = { item, equipment, score };
        }
      }
    }
    
    return bestItem;
  }

  /**
   * Generate boss loot based on enemy level
   */
  generateBossLoot(bossLevel, rarity = 'rare') {
    const lootTable = {
      common: {
        0: ['iron_sword', 'copper_dagger'],
        1: ['iron_greatsword', 'wooden_bow'],
        2: ['steel_sword', 'steel_dagger'],
      },
      rare: {
        0: ['iron_sword', 'copper_dagger'],
        1: ['iron_greatsword', 'wooden_bow'],
        2: ['steel_sword', 'steel_dagger', 'mithril_blade'],
        3: ['mithril_blade', 'demonic_blade', 'iron_greatsword'],
        4: ['demonic_blade', 'tyrfing', 'infernal_armor'],
        5: ['tyrfing', 'harpe'],
      },
      epic: {
        0: ['iron_greatsword', 'wooden_bow'],
        1: ['steel_sword', 'steel_dagger', 'mithril_blade'],
        2: ['mithril_blade', 'demonic_blade'],
        3: ['demonic_blade', 'tyrfing', 'infernal_armor'],
        4: ['tyrfing', 'harpe', 'crown_darkness'],
        5: ['harpe', 'crown_darkness', 'hellfire_ring'],
      },
      legendary: {
        0: ['mithril_blade', 'demonic_blade'],
        1: ['demonic_blade', 'tyrfing', 'infernal_armor'],
        2: ['tyrfing', 'harpe', 'crown_darkness'],
        3: ['harpe', 'crown_darkness', 'hellfire_ring'],
        4: ['crown_darkness', 'hellfire_ring', 'deathbringer'],
        5: ['hellfire_ring', 'deathbringer', 'void_staff'],
      },
    };
    
    const tierIndex = Math.min(Math.floor(bossLevel / 8), 5);
    const rarityTable = lootTable[rarity] || lootTable.rare;
    const lootPool = rarityTable[tierIndex] || rarityTable[5];
    
    // Random variation: drop 2-4 items instead of always the same number
    const itemCount = Math.max(1, Math.floor(bossLevel / 8) + Math.floor(Math.random() * 3) + 1);
    const selectedLoot = [];
    
    for (let i = 0; i < itemCount; i++) {
      const randomItem = lootPool[Math.floor(Math.random() * lootPool.length)];
      if (!selectedLoot.includes(randomItem)) {
        selectedLoot.push(randomItem);
      }
    }
    
    return selectedLoot.length > 0 ? selectedLoot : [lootPool[0]];
  }

  /**
   * Generate boss materials based on enemy level
   */
  generateBossMaterials(bossLevel) {
    const materials = [];
    const tierIndex = Math.floor(bossLevel / 5);
    
    // Increase quantity based on level
    const quantity = Math.ceil(bossLevel / 3);
    
    // Select materials based on tier
    const tierMaterials = [
      [{ id: 'herb', quantity }, { id: 'wood', quantity }],
      [{ id: 'copper_ore', quantity: quantity * 2 }, { id: 'iron_ore', quantity }],
      [{ id: 'granite', quantity }, { id: 'lumber', quantity: quantity * 2 }],
      [{ id: 'mithril_ore', quantity: quantity * 2 }, { id: 'dragonstone', quantity }],
      [{ id: 'adamantite', quantity: quantity * 3 }, { id: 'moonflower', quantity }],
      [{ id: 'phoenix_feather', quantity: quantity * 2 }, { id: 'dragonstone', quantity: quantity * 2 }],
    ];
    
    return tierMaterials[Math.min(tierIndex, 5)] || tierMaterials[5];
  }

  /**
   * Generate boss potions based on enemy level
   */
  generateBossPotions(bossLevel) {
    const potions = [];
    const tierIndex = Math.floor(bossLevel / 5) + 1; // Potions are 1 tier ahead
    const potionTier = Math.min(Math.max(tierIndex, 1), 4);
    
    potions.push({ id: `health_potion_t${potionTier}`, quantity: Math.ceil(bossLevel / 4) });
    potions.push({ id: `xp_potion_t${potionTier}`, quantity: Math.ceil(bossLevel / 6) });
    potions.push({ id: `gold_potion_t${potionTier}`, quantity: Math.ceil(bossLevel / 8) });
    
    if (bossLevel >= 15) {
      potions.push({ id: `gathering_potion_t${Math.min(potionTier, 3)}`, quantity: 2 });
    }
    
    return potions;
  }

  /**
   * Generate boss enchants based on enemy level
   */
  generateBossEnchants(bossLevel) {
    const enchants = [];
    const tierIndex = Math.floor(bossLevel / 8) + 1;
    const enchantTier = Math.min(Math.max(tierIndex, 1), 3);
    
    if (bossLevel >= 5) {
      enchants.push({ id: `damage_enchant_t${enchantTier}`, quantity: 1 });
    }
    if (bossLevel >= 10) {
      enchants.push({ id: `xp_enchant_t${enchantTier}`, quantity: 1 });
    }
    if (bossLevel >= 15) {
      enchants.push({ id: `loot_enchant_t${enchantTier}`, quantity: 1 });
    }
    
    return enchants;
  }

  getPotionBuffsSummary(player) {
    if (!player.potionBuffs) return '';
    
    const buffs = [];
    const pb = player.potionBuffs;
    
    if (pb.xpBonus && pb.xpRemaining > 0) {
      const capIndicator = pb.xpBonus >= 500 ? ' 🔴' : '';
      buffs.push(`✨ **+${pb.xpBonus}%** XP (${pb.xpRemaining} uses left)${capIndicator}`);
    }
    
    if (pb.goldBonus && pb.goldRemaining > 0) {
      const capIndicator = pb.goldBonus >= 500 ? ' 🔴' : '';
      buffs.push(`💰 **+${pb.goldBonus}%** Gold (${pb.goldRemaining} uses left)${capIndicator}`);
    }
    
    if (pb.lootBonus && pb.lootRemaining > 0) {
      const capIndicator = pb.lootBonus >= 200 ? ' 🔴' : '';
      buffs.push(`🎁 **+${pb.lootBonus}%** Loot (${pb.lootRemaining} combats)${capIndicator}`);
    }
    
    if (pb.nextCombatHeal > 0) {
      const capIndicator = pb.nextCombatHeal >= 5000 ? ' 🔴' : '';
      buffs.push(`💚 **${pb.nextCombatHeal} HP** heal ready${capIndicator}`);
    }
    
    if (pb.gatheringBonus && pb.gatheringExpires > Date.now()) {
      const minutesLeft = Math.ceil((pb.gatheringExpires - Date.now()) / 60000);
      const hoursLeft = Math.floor(minutesLeft / 60);
      const timeStr = hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft % 60}m` : `${minutesLeft}m`;
      buffs.push(`⛏️ **+${pb.gatheringBonus}%** Gathering (${timeStr} left)`);
    }
    
    if (buffs.length === 0) return '';
    
    return buffs.join('\n') + '\n🔴 = Capped (max bonus reached)';
  }

  /**
   * Extract enchant type from recipe ID (e.g., "damage_enchant_t3" -> "damage")
   */
  getEnchantType(enchantId) {
    if (!enchantId) return 'unknown';
    const match = enchantId.match(/^([a-z]+)_enchant/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Migrate old enchant data structure (number) to new structure (object with types)
   * Old: { weapon: 5 } -> New: { weapon: { damage: 5 } }
   */
  migrateEnchantData(player) {
    if (!player.equipmentEnchants) {
      player.equipmentEnchants = {};
      return;
    }

    // Check if migration is needed (old structure has numbers as values)
    let needsMigration = false;
    for (const [slot, value] of Object.entries(player.equipmentEnchants)) {
      if (typeof value === 'number') {
        needsMigration = true;
        break;
      }
    }

    if (!needsMigration) return;

    // Migrate: assume old enchants were "damage" type (most common)
    const migratedEnchants = {};
    for (const [slot, level] of Object.entries(player.equipmentEnchants)) {
      if (typeof level === 'number' && level > 0) {
        migratedEnchants[slot] = { damage: level };
      } else if (typeof level === 'object') {
        migratedEnchants[slot] = level; // Already migrated
      } else {
        migratedEnchants[slot] = {}; // Empty enchants
      }
    }

    player.equipmentEnchants = migratedEnchants;
    this.persistPlayer(player);
  }

  /**
   * Perform auto-enchanting until target level or materials run out
   */

  getAsgardWorldId(worlds = null) {
    const list = Array.isArray(worlds) ? worlds : getAllWorlds();
    const asgard = list.find(w => String(w?.name || '').toLowerCase() === 'asgard');
    return asgard?.id || 'world_1770519709022';
  }

  buildCraftingComponents(player, page = 0, selectedWorldId = null) {
    const RECIPES_PER_PAGE = 25; // select menu limit
    const blacksmithLevel = player.professionLevels?.blacksmith || 0;
    const hasMasterBlacksmith = player.masterBlacksmith === true;

    const worlds = getAllWorlds();
    const worldList = Array.isArray(worlds) ? worlds : [];
    const worldById = new Map(worldList.map(w => [String(w.id), w]));
    const resolvedWorldId = selectedWorldId && worldById.has(String(selectedWorldId))
      ? String(selectedWorldId)
      : null;
    const asgardWorldId = this.getAsgardWorldId(worldList);
    const isAsgardSelection = resolvedWorldId && String(resolvedWorldId) === String(asgardWorldId);
    const playerInAsgard = String(player.currentWorld) === String(asgardWorldId);

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    if (worldList.length > 0) {
      const worldOptions = worldList.slice(0, RECIPES_PER_PAGE).map(world => {
        const minLevel = Number(world.minLevel) || 0;
        const maxLevel = Number(world.maxLevel) || 0;
        const levelText = minLevel || maxLevel ? `Lvl ${minLevel}-${maxLevel || minLevel}` : 'World';
        return {
          label: String(world.name || world.id).slice(0, 100),
          value: String(world.id),
          description: levelText.slice(0, 100),
        };
      });

      if (worldOptions.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('rpg-crafting-world')
            .setPlaceholder(
              resolvedWorldId && worldById.has(String(resolvedWorldId))
                ? `World: ${worldById.get(String(resolvedWorldId)).name || resolvedWorldId}`
                : 'Choose a world'
            )
            .addOptions(worldOptions)
        ));
      }

      if (!resolvedWorldId) {
        rows.push(backRow);
        return rows;
      }
    }

    // Filter recipes by:
    // 1. Output item must exist in equipment or items data (dashboard items included)
    // 2. Item/recipe must not have a class restriction for a different class
    // 3. Exclude potions (botanic) and enchantments - they have their own menus
    const playerClass = player.class || player.internalClass;
    const availableRecipes = RECIPES_SORTED.filter(recipe => {
      // Exclude potions and enchantments - they're crafted through their own menus
      if (recipe.profession === 'botanic' || recipe.profession === 'enchanter') {
        return false;
      }

      // Check if output item exists
      const outputItem = getEquipment(recipe.output.item) || getItemByIdDynamic(recipe.output.item);
      if (!outputItem) {
        return false;
      }
      // Check if recipe has class restriction
      if (recipe.classRestriction && recipe.classRestriction !== playerClass) {
        return false;
      }
      // Check if output item has class restriction
      if (outputItem && outputItem.classRestriction && outputItem.classRestriction !== playerClass) {
        return false; // Hide recipes that output items for other classes
      }

      return true;
    });

    const materialGeneral = new Set();
    const materialWorlds = new Map();
    for (const area of Object.values(GATHERING_AREAS || {})) {
      const commonMats = area?.materials?.common || [];
      const rareMats = area?.materials?.rare || [];
      const mats = [...commonMats, ...rareMats].filter(Boolean);
      if (area?.requiredWorld) {
        for (const mat of mats) {
          if (!materialWorlds.has(mat)) {
            materialWorlds.set(mat, new Set());
          }
          materialWorlds.get(mat).add(String(area.requiredWorld));
        }
      } else {
        mats.forEach(mat => materialGeneral.add(mat));
      }
    }

    const defaultWorldId = worldList[0]?.id || player.currentWorld;
    const getRecipeWorldIds = (recipe) => {
      const mats = Object.keys(recipe.materials || {});
      const worldSet = new Set();
      for (const matId of mats) {
        const worldIds = materialWorlds.get(matId);
        if (worldIds && !materialGeneral.has(matId)) {
          worldIds.forEach(id => worldSet.add(String(id)));
        }
      }
      if (worldSet.size === 0) {
        return [String(defaultWorldId)];
      }
      return [...worldSet];
    };

    const worldFilteringEnabled = worldList.length > 0 && resolvedWorldId;
    const filteredRecipes = worldFilteringEnabled
      ? availableRecipes.filter(recipe => {
          const outputItem = getEquipment(recipe.output.item) || getItemByIdDynamic(recipe.output.item) || {};
          const isGemRecipe = recipe.requiresMasterBlacksmith || outputItem.category === 'gem';
          if (isGemRecipe) {
            return true;
          }
          const recipeWorldIds = getRecipeWorldIds(recipe);
          return recipeWorldIds.includes(String(resolvedWorldId));
        })
      : availableRecipes;

    const categorized = {
      weapons: [],
      armor: [],
      gems: [],
      items: [],
    };

    const armorSlots = ['chest', 'head', 'legs', 'boots', 'gloves', 'shield'];

    for (const recipe of filteredRecipes) {
      const outputItem = getEquipment(recipe.output.item) || getItemByIdDynamic(recipe.output.item) || {};
      let category = 'items';

      if (outputItem.slot === 'weapon' || (outputItem.category === 'weapon' && !armorSlots.includes(outputItem.slot))) {
        category = 'weapons';
      } else if (armorSlots.includes(outputItem.slot) || outputItem.category === 'armor') {
        category = 'armor';
      } else if (outputItem.category === 'gem') {
        category = 'gems';
      } else if (outputItem.category === 'consumable' || outputItem.heals || outputItem.restoresMana) {
        category = 'items';
      }

      categorized[category].push(recipe);
    }

    const allCount = categorized.weapons.length + categorized.armor.length + categorized.gems.length + categorized.items.length;
    if (allCount === 0) {
      rows.push(backRow);
      return rows;
    }

    const isGemWorldLocked = worldFilteringEnabled ? !isAsgardSelection : !playerInAsgard;
    const buildOptions = (list) => list.slice(0, RECIPES_PER_PAGE).map((rec) => {
      const outputName = this.getItemDisplayName(rec.output.item);
      let label = `Craft ${outputName}`;
      const requiredLevel = rec.level || 1;
      const masterLocked = rec.requiresMasterBlacksmith && !hasMasterBlacksmith;
      const asgardLocked = rec.requiresMasterBlacksmith && isGemWorldLocked;
      if (blacksmithLevel < requiredLevel || masterLocked || asgardLocked) {
        label += ' [Locked]';
      }
      return {
        label: label.slice(0, 100),
        value: String(rec.id),
        description: this.formatRecipeDescription(rec, blacksmithLevel, {
          hasMasterBlacksmith,
          isAsgardWorld: worldFilteringEnabled ? isAsgardSelection : playerInAsgard,
        }).slice(0, 100),
      };
    });

    const weaponOptions = buildOptions(categorized.weapons);
    if (weaponOptions.length > 0 && Array.isArray(weaponOptions)) {
      const validWeapons = weaponOptions.filter(opt => opt && opt.label && opt.value);
      if (validWeapons.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('rpg-crafting-select-weapons')
            .setPlaceholder('Weapons')
            .addOptions(validWeapons)
        ));
      }
    }

    const armorOptions = buildOptions(categorized.armor);
    if (armorOptions.length > 0 && Array.isArray(armorOptions)) {
      const validArmor = armorOptions.filter(opt => opt && opt.label && opt.value);
      if (validArmor.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('rpg-crafting-select-armor')
            .setPlaceholder('Armor')
            .addOptions(validArmor)
        ));
      }
    }

    const gemOptions = buildOptions(categorized.gems);
    if (gemOptions.length > 0 && Array.isArray(gemOptions)) {
      const validGems = gemOptions.filter(opt => opt && opt.label && opt.value);
      if (validGems.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('rpg-crafting-select-gems')
            .setPlaceholder('💎 Gems (Asgard)')
            .addOptions(validGems)
        ));
      }
    }

    rows.push(backRow);
    return rows;
  }

  formatRecipeDescription(recipe, blacksmithLevel = 0, options = {}) {
    const requiredLevel = recipe.level || 1;
    const parts = [`Lvl ${requiredLevel}`];

    const needsMaster = recipe.requiresMasterBlacksmith === true;
    const masterLocked = needsMaster && !options.hasMasterBlacksmith;
    const asgardLocked = needsMaster && options.isAsgardWorld === false;
    if (blacksmithLevel < requiredLevel || masterLocked || asgardLocked) {
      parts.push('Locked');
    }
    if (masterLocked) {
      parts.push('Master');
    }
    if (asgardLocked) {
      parts.push('Asgard');
    }

    const equipment = getEquipment(recipe.output.item);
    const item = getItemByIdDynamic(recipe.output.item);
    const stats = equipment?.bonuses || equipment?.stats || item?.stats;

    if (stats) {
      const statText = Object.entries(stats)
        .filter(([, val]) => typeof val === 'number' && val !== 0)
        .map(([key, val]) => `${key.slice(0, 3).toUpperCase()} ${val > 0 ? '+' : ''}${val}`)
        .slice(0, 2)
        .join(' ');
      if (statText) parts.push(statText);
    }

    const mats = this.getAdjustedMaterials(recipe.materials || {});
    const matText = Object.entries(mats)
      .slice(0, 2)
      .map(([id, qty]) => {
        const mat = getMaterial(id);
        const gem = mat ? null : getGem(id);
        const matName = mat?.name || gem?.name || id;
        return `${qty}x ${matName}`;
      })
      .join(', ');
    if (matText) parts.push(matText);

    let description = parts.join(' • ');
    if (description.length > 100) {
      description = description.slice(0, 97) + '...';
    }
    return description;
  }


  getItemDisplayName(itemId) {
    const equipment = getEquipment(itemId);
    if (equipment) return equipment.name;
    const item = getItemByIdDynamic(itemId);
    if (item) return item.name;
    return itemId;
  }

  buildProgressBar(current, max, segments = 10) {
    // Safety checks to prevent invalid values
    const safeCurrent = Math.max(0, Number(current) || 0);
    const safeMax = Math.max(1, Number(max) || 1);
    const safeSegments = Math.max(1, Math.min(50, Number(segments) || 10)); // Cap at 50 segments
    
    const filled = Math.floor((safeCurrent / safeMax) * safeSegments);
    const empty = safeSegments - filled;
    return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
  }

  getMaterialCounts(player) {
    const counts = {};
    if (!player.inventory) return counts;
    for (const item of player.inventory) {
      if (!item || typeof item !== 'object') continue;
      const isGem = item.id ? getGem(item.id) : null;
      if (item.type === 'material' || isGem) {
        counts[item.id] = (counts[item.id] || 0) + (item.quantity || 1);
      }
    }
    return counts;
  }

  /**
   * Create recipe button rows - cached and reused across crafting flow
   * Uses pre-sorted RECIPES_SORTED to avoid sorting on every craft attempt
   */
  createRecipeButtonRows(player) {
    return this.buildCraftingComponents(player, 0);
  }

  getAdjustedMaterials(materials) {
    const balance = loadBalanceData();
    const multiplier = Number(balance.craftingCostMultiplier) || 1;
    const minQty = Number(balance.craftingCostMin) || 1;
    const adjusted = {};
    for (const [id, qty] of Object.entries(materials || {})) {
      const scaled = Math.ceil(Number(qty) * multiplier);
      adjusted[id] = Math.max(minQty, scaled);
    }
    return adjusted;
  }

  getProfessionCostMultiplier(player) {
    const levels = Object.values(player.professionLevels || {}).map((val) => Number(val) || 0);
    const totalLevels = levels.reduce((sum, val) => sum + val, 0);
    const reduction = Math.min(totalLevels * 0.01, 0.3);
    return Math.max(0.7, 1 - reduction);
  }

  applyCostMultiplier(materials, multiplier = 1) {
    const adjusted = {};
    for (const [id, qty] of Object.entries(materials || {})) {
      adjusted[id] = Math.max(1, Math.ceil(Number(qty) * multiplier));
    }
    return adjusted;
  }

  hasMaterials(player, materials) {
    const counts = this.getMaterialCounts(player);
    for (const [id, qty] of Object.entries(materials)) {
      if ((counts[id] || 0) < qty) return false;
    }
    return true;
  }

  getMissingMaterials(player, materials) {
    const counts = this.getMaterialCounts(player);
    const missing = [];
    for (const [id, qty] of Object.entries(materials)) {
      const have = counts[id] || 0;
      if (have < qty) {
        const mat = getMaterial(id);
        const gem = mat ? null : getGem(id);
        missing.push({ id, name: mat?.name || gem?.name || id, quantity: qty - have });
      }
    }
    return missing;
  }

  /**
   * Find the best gathering activity for the given missing materials
   * Returns the gathering type that can gather the most missing materials
   */
  getBestGatheringForMaterials(missingMaterials) {
    if (!missingMaterials || missingMaterials.length === 0) return null;

    const gatheringCounts = {
      mining: 0,
      chopping: 0,
      gathering: 0,
    };

    // Comprehensive hardcoded map: materialId -> gathering type
    // Covers ALL known materials from GATHERING_SKILLS, BASE_MATERIALS, and recipes
    const MATERIAL_GATHER_MAP = {
      // Mining materials
      iron_ore: 'mining', copper_ore: 'mining', coal: 'mining', granite: 'mining',
      mana_crystal: 'mining', mithril_ore: 'mining', adamantite: 'mining',
      dragonstone: 'mining', bronze_ore: 'mining', world_essence_ore: 'mining',
      mythril_ore: 'mining',
      // Chopping materials
      wood: 'chopping', lumber: 'chopping', leather: 'chopping',
      hardwood: 'chopping', dragonhide: 'chopping', mystic_bark: 'chopping',
      ash_wood: 'chopping', pine_wood: 'chopping', yew_wood: 'chopping',
      ancient_wood: 'chopping', storm_touched_wood: 'chopping', divine_wood: 'chopping',
      stormhide: 'chopping', 'godbeast-hide': 'chopping', treated_leather: 'chopping',
      // Gathering / Herbing materials
      herb: 'gathering', water: 'gathering', rare_flower: 'gathering',
      moonflower: 'gathering', arcane_essence: 'gathering', phoenix_feather: 'gathering',
      wild_herbs: 'gathering', medicinal_herbs: 'gathering',
      sacred_herbs: 'gathering', ambrosia_bloom: 'gathering', fatebound_fang: 'gathering',
      pure_water: 'gathering',
    };

    // Also build a lookup from GATHERING_SKILLS for any we missed
    for (const [skillId, skill] of Object.entries(GATHERING_SKILLS)) {
      for (const mat of (skill.baseMaterials || [])) {
        if (!MATERIAL_GATHER_MAP[mat.id]) MATERIAL_GATHER_MAP[mat.id] = skillId;
      }
      for (const mat of (skill.rareMaterials || [])) {
        if (!MATERIAL_GATHER_MAP[mat.id]) MATERIAL_GATHER_MAP[mat.id] = skillId;
      }
    }

    const normalizeGatheringType = (value) => {
      if (!value) return null;
      const raw = String(value).toLowerCase();
      if (raw.includes('mine') || raw === 'mining') return 'mining';
      if (raw.includes('chop') || raw === 'chopping') return 'chopping';
      if (raw.includes('gather') || raw.includes('forage') || raw === 'gathering' || raw.includes('herb')) return 'gathering';
      return null;
    };

    // Guess gathering type from material name if all else fails
    const guessFromName = (name) => {
      if (!name) return null;
      const n = name.toLowerCase();
      if (n.includes('ore') || n.includes('crystal') || n.includes('stone') || n.includes('granite') || n.includes('coal') || n.includes('adamant') || n.includes('mithril')) return 'mining';
      if (n.includes('wood') || n.includes('lumber') || n.includes('bark') || n.includes('hide') || n.includes('leather')) return 'chopping';
      if (n.includes('herb') || n.includes('water') || n.includes('flower') || n.includes('essence') || n.includes('feather') || n.includes('bloom') || n.includes('potion')) return 'gathering';
      return null;
    };

    // Count which gathering type can provide each material
    for (const missingMat of missingMaterials) {
      const type = this.getGatheringTypeForMaterial(missingMat, {
        MATERIAL_GATHER_MAP,
        normalizeGatheringType,
        guessFromName,
      });
      if (type) gatheringCounts[type]++;
    }

    // Find the gathering type with the most materials
    let bestType = null;
    let maxCount = 0;
    for (const [type, count] of Object.entries(gatheringCounts)) {
      if (count > maxCount) {
        maxCount = count;
        bestType = type;
      }
    }

    return maxCount > 0 ? bestType : null;
  }

  getGatheringTypeForMaterial(missingMat, helpers = null) {
    if (!missingMat) return null;

    const buildHelpers = () => {
      const MATERIAL_GATHER_MAP = {
        // Mining materials
        iron_ore: 'mining', copper_ore: 'mining', coal: 'mining', granite: 'mining',
        mana_crystal: 'mining', mithril_ore: 'mining', adamantite: 'mining',
        dragonstone: 'mining', bronze_ore: 'mining', world_essence_ore: 'mining',
        mythril_ore: 'mining',
        // Chopping materials
        wood: 'chopping', lumber: 'chopping', leather: 'chopping',
        hardwood: 'chopping', dragonhide: 'chopping', mystic_bark: 'chopping',
        ash_wood: 'chopping', pine_wood: 'chopping', yew_wood: 'chopping',
        ancient_wood: 'chopping', storm_touched_wood: 'chopping', divine_wood: 'chopping',
        stormhide: 'chopping', 'godbeast-hide': 'chopping', treated_leather: 'chopping',
        // Gathering / Herbing materials
        herb: 'gathering', water: 'gathering', rare_flower: 'gathering',
        moonflower: 'gathering', arcane_essence: 'gathering', phoenix_feather: 'gathering',
        wild_herbs: 'gathering', medicinal_herbs: 'gathering',
        sacred_herbs: 'gathering', ambrosia_bloom: 'gathering', fatebound_fang: 'gathering',
        pure_water: 'gathering',
      };

      for (const [skillId, skill] of Object.entries(GATHERING_SKILLS)) {
        for (const mat of (skill.baseMaterials || [])) {
          if (!MATERIAL_GATHER_MAP[mat.id]) MATERIAL_GATHER_MAP[mat.id] = skillId;
        }
        for (const mat of (skill.rareMaterials || [])) {
          if (!MATERIAL_GATHER_MAP[mat.id]) MATERIAL_GATHER_MAP[mat.id] = skillId;
        }
      }

      const normalizeGatheringType = (value) => {
        if (!value) return null;
        const raw = String(value).toLowerCase();
        if (raw.includes('mine') || raw === 'mining') return 'mining';
        if (raw.includes('chop') || raw === 'chopping') return 'chopping';
        if (raw.includes('gather') || raw.includes('forage') || raw === 'gathering' || raw.includes('herb')) return 'gathering';
        return null;
      };

      const guessFromName = (name) => {
        if (!name) return null;
        const n = name.toLowerCase();
        if (n.includes('ore') || n.includes('crystal') || n.includes('stone') || n.includes('granite') || n.includes('coal') || n.includes('adamant') || n.includes('mithril')) return 'mining';
        if (n.includes('wood') || n.includes('lumber') || n.includes('bark') || n.includes('hide') || n.includes('leather')) return 'chopping';
        if (n.includes('herb') || n.includes('water') || n.includes('flower') || n.includes('essence') || n.includes('feather') || n.includes('bloom') || n.includes('potion')) return 'gathering';
        return null;
      };

      return { MATERIAL_GATHER_MAP, normalizeGatheringType, guessFromName };
    };

    const { MATERIAL_GATHER_MAP, normalizeGatheringType, guessFromName } = helpers || buildHelpers();
    const matId = missingMat.id;

    if (MATERIAL_GATHER_MAP[matId]) {
      return MATERIAL_GATHER_MAP[matId];
    }

    const material = getMaterial(matId);
    const gatherType = normalizeGatheringType(material?.gatheringType);
    if (gatherType) return gatherType;

    return guessFromName(material?.name || missingMat.name || matId);
  }

  formatGatherButtonLabel(skillId, mats) {
    const icons = { mining: '⛏️', chopping: '🪓', gathering: '🌿', all: '🌟' };
    const names = (mats || []).map((mat) => mat.name || getMaterial(mat.id)?.name || mat.id);

    const maxNames = skillId === 'all' ? 3 : 2;
    const shown = names.slice(0, maxNames);
    const extra = names.length - shown.length;
    const suffix = extra > 0 ? ` +${extra}` : '';

    const prefix = skillId === 'all' ? 'Gather All' : 'Gather';
    const label = `${icons[skillId] || '⛏️'} ${prefix}: ${shown.join(', ')}${suffix}`;
    return label.length > 80 ? label.slice(0, 77) + '...' : label;
  }

  /**best multi-skill area for materials from multiple gathering types
   */
  getBestMultiSkillAreaForMaterials(missingMaterials, playerLevel = 1, worldsUnlocked = []) {
    if (!missingMaterials || missingMaterials.length === 0) return null;

    const missingIds = new Set(missingMaterials.map(mat => mat.id));
    const neededSkills = new Set();

    // Determine which skills are needed
    for (const mat of missingMaterials) {
      const type = this.getGatheringTypeForMaterial(mat);
      if (type) neededSkills.add(type);
    }

    // Find areas that support all needed skills
    const areas = getUnlockedAreas(playerLevel, worldsUnlocked).filter(area => {
      if (!area.skillTypes) return false;
      for (const skill of neededSkills) {
        if (!area.skillTypes.includes(skill)) return false;
      }
      return true;
    });

    if (areas.length === 0) return null;

    // Find area with best material coverage
    let bestArea = null;
    let bestScore = 0;

    for (const area of areas) {
      const common = area.materials?.common || [];
      const rare = area.materials?.rare || [];

      let matches = 0;
      for (const id of missingIds) {
        if (common.includes(id) || rare.includes(id)) matches++;
      }

      // Only consider areas that have ALL materials
      if (matches < missingIds.size) continue;

      const score = matches + (area.rarity * 10);

      if (score > bestScore) {
        bestScore = score;
        bestArea = area;
      }
    }

    return bestArea;
  }

  /**
   * Find 
   * Find the best gathering area for missing materials
   * Prefers unlocked areas that contain more of the missing items
   */
  getBestGatheringAreaForMaterials(missingMaterials, skillId, playerLevel = 1, worldsUnlocked = []) {
    if (!missingMaterials || missingMaterials.length === 0 || !skillId) return null;

    const areas = getUnlockedAreas(playerLevel, worldsUnlocked).filter(area =>
      area.skillTypes && area.skillTypes.includes(skillId)
    );
    if (areas.length === 0) return null;

    const missingIds = new Set(missingMaterials.map(mat => mat.id));

    let bestArea = null;
    let bestScore = 0;

    for (const area of areas) {
      const common = area.materials?.common || [];
      const rare = area.materials?.rare || [];

      let commonMatches = 0;
      let rareMatches = 0;

      for (const id of common) {
        if (missingIds.has(id)) commonMatches += 1;
      }
      for (const id of rare) {
        if (missingIds.has(id)) rareMatches += 1;
      }

      const totalMatches = commonMatches + rareMatches;
      if (totalMatches < missingIds.size) {
        continue;
      }

      const score = (commonMatches * 3) + rareMatches;

      if (score > bestScore) {
        bestScore = score;
        bestArea = area;
      } else if (score > 0 && score === bestScore && bestArea) {
        if ((area.rarity || 0) > (bestArea.rarity || 0)) {
          bestArea = area;
        } else if ((area.baseXp || 0) > (bestArea.baseXp || 0)) {
          bestArea = area;
        }
      }
    }

    return bestScore > 0 ? bestArea : null;
  }

  /**
   * Group missing materials by their best gathering areas
   * Returns { areaId: { area, materials: [...] }, ... }
   */
  getGatheringAreasByMaterials(missingMaterials, playerLevel = 1) {
    if (!missingMaterials || missingMaterials.length === 0) return {};

    const areaMap = {}; // areaId -> { area, materials }

    for (const mat of missingMaterials) {
      const skillId = this.getGatheringTypeForMaterial(mat);
      if (!skillId) continue;

      // Find best area for this individual material
      const bestArea = this.getBestGatheringAreaForMaterials([mat], skillId, playerLevel, []);
      if (!bestArea) continue;

      const areaId = bestArea.id;
      if (!areaMap[areaId]) {
        areaMap[areaId] = { area: bestArea, materials: [] };
      }
      areaMap[areaId].materials.push(mat);
    }

    return areaMap;
  }

  consumeMaterials(player, materials) {
    for (const [id, qty] of Object.entries(materials)) {
      this.removeMaterialFromInventory(player, id, qty);
    }
  }

  removeMaterialFromInventory(player, materialId, quantity) {
    let remaining = quantity;
    // Use splice loop instead of map+filter for better performance
    for (let i = player.inventory.length - 1; i >= 0; i--) {
      const item = player.inventory[i];
      if (!item || typeof item !== 'object' || item.id !== materialId) {
        continue;
      }
      const isGem = item.id ? getGem(item.id) : null;
      if (item.type !== 'material' && !isGem) continue;
      const currentQty = item.quantity || 1;
      if (remaining <= 0) break;
      
      if (currentQty > remaining) {
        item.quantity = currentQty - remaining;
        remaining = 0;
        break;
      }
      
      remaining -= currentQty;
      player.inventory.splice(i, 1);
    }
    this.persistPlayer(player);
  }

  // Helper to track gold earnings for progress stats
  addGold(player, amount) {
    if (amount <= 0) return;
    player.gold += amount;
    if (!player.progressStats) {
      player.progressStats = {
        monstersDefeated: 0,
        gatheringActions: 0,
        materialsCollected: 0,
        craftsCompleted: 0,
        goldEarned: 0,
        criticalHits: 0,
        dungeonsCleared: 0,
        raidsCleared: 0,
      };
    }
    player.progressStats.goldEarned += amount;
  }

  // Helper to track gold spending by category
  trackGoldSpent(player, amount, category = 'other') {
    if (amount <= 0) return;
    if (!player.goldSpentTotal) player.goldSpentTotal = 0;
    if (!player.goldSpentBreakdown) player.goldSpentBreakdown = { shop: 0, crafting: 0, gambling: 0, guild: 0, upgrades: 0, marketplace: 0, other: 0 };
    player.goldSpentTotal += amount;
    player.goldSpentBreakdown[category] = (player.goldSpentBreakdown[category] || 0) + amount;
  }

  // Helper to record combat result
  trackCombatResult(player, enemyName, status, combatType = 'normal') {
    if (!player.combatRecord) player.combatRecord = { totalWins: 0, totalLosses: 0, totalForfeits: 0, byEnemy: {}, byType: { normal: {wins:0,losses:0}, boss: {wins:0,losses:0}, worldBoss: {wins:0,losses:0}, dungeon: {wins:0,losses:0}, arena: {wins:0,losses:0}, guildBoss: {wins:0,losses:0}, raid: {wins:0,losses:0} } };
    const isWin = status === 'victory';
    if (isWin) player.combatRecord.totalWins++; else player.combatRecord.totalLosses++;
    if (!player.combatRecord.byEnemy[enemyName]) player.combatRecord.byEnemy[enemyName] = { wins: 0, losses: 0 };
    if (isWin) player.combatRecord.byEnemy[enemyName].wins++; else player.combatRecord.byEnemy[enemyName].losses++;
    if (!player.combatRecord.byType[combatType]) player.combatRecord.byType[combatType] = { wins: 0, losses: 0 };
    if (isWin) player.combatRecord.byType[combatType].wins++; else player.combatRecord.byType[combatType].losses++;
  }

  // Helper to log player death
  trackDeath(player, enemy, combatType = 'normal') {
    if (!player.deathLog) player.deathLog = [];
    player.deathLog.push({ enemy: enemy?.name || 'Unknown', enemyLevel: enemy?.level || 0, playerLevel: player.level || 1, timestamp: Date.now(), type: combatType });
    if (player.deathLog.length > 50) player.deathLog = player.deathLog.slice(-50);
  }

  // Helper to track skill usage
  trackSkillUsage(player, skillName, damage = 0) {
    if (!player.skillUsageStats) player.skillUsageStats = {};
    if (!player.skillUsageStats[skillName]) player.skillUsageStats[skillName] = { timesUsed: 0, totalDamage: 0 };
    player.skillUsageStats[skillName].timesUsed++;
    player.skillUsageStats[skillName].totalDamage += damage;
  }

  addMaterialToInventory(player, materialId, quantity) {
    const material = getMaterial(materialId);
    if (!material) return;
    const existing = player.inventory.find(
      (item) => item && typeof item === 'object' && item.id === materialId && item.type === 'material'
    );
    if (existing) {
      existing.quantity = (existing.quantity || 1) + quantity;
      if (!player.progressStats) {
        player.progressStats = {
          monstersDefeated: 0,
          gatheringActions: 0,
          materialsCollected: 0,
          craftsCompleted: 0,
          goldEarned: 0,
          criticalHits: 0,
          dungeonsCleared: 0,
          raidsCleared: 0,
        };
      }
      player.progressStats.materialsCollected += quantity;
      this.persistPlayer(player);
      return;
    }
    player.inventory.push({
      id: materialId,
      name: material.name,
      type: 'material',
      quantity,
    });
    if (!player.progressStats) {
      player.progressStats = {
        monstersDefeated: 0,
        gatheringActions: 0,
        materialsCollected: 0,
        craftsCompleted: 0,
        goldEarned: 0,
        criticalHits: 0,
        dungeonsCleared: 0,
        raidsCleared: 0,
      };
    }
    player.progressStats.materialsCollected += quantity;
    this.persistPlayer(player);
  }

  findClassWeaponInLoot(loot, playerClass) {
    // Find a weapon in loot array that matches the player's class
    for (const lootItem of loot) {
      let itemId = typeof lootItem === 'string' ? lootItem : lootItem.id;
      const equipment = getEquipment(itemId);
      if (equipment && equipment.slot === 'weapon' && 
          (!equipment.classRestriction || equipment.classRestriction === playerClass)) {
        return equipment;
      }
    }
    return null;
  }

  /**
   * Distribute raid layer rewards with team package sharing
   * Processes items/materials with class-aware weapons
   */
  distributeRaidLayerRewards(player, rewardPackage) {
    const lootNames = [];
    let weaponGiven = false;
    const playerClass = player.class || player.internalClass;
    
    if (!rewardPackage) return lootNames;

    // Process items with class awareness
    const items = rewardPackage.items || [];
    for (const item of items) {
      let itemId, quantity;
      if (typeof item === 'string') {
        itemId = item;
        quantity = 1;
      } else {
        itemId = item.id;
        quantity = item.quantity || 1;
      }

      const equipment = getEquipment(itemId);
      const itemObj = getItemByIdDynamic(itemId);
      const material = getMaterial(itemId);

      if (equipment) {
        // Handle class-aware weapon distribution
        if (equipment.slot === 'weapon') {
          // Only one weapon per package
          if (weaponGiven) continue;

          // If weapon is restricted to another class, try to substitute
          if (equipment.classRestriction && equipment.classRestriction !== playerClass) {
            const classWeapon = this.findClassWeaponInLoot(items, playerClass);
            if (classWeapon) {
              this.addCraftedItem(player, classWeapon.id, quantity);
              lootNames.push(`${classWeapon.name} x${quantity}`);
              weaponGiven = true;
              continue;
            }
            // No class weapon available, skip this weapon
            continue;
          }
        }

        this.addCraftedItem(player, equipment.id, quantity);
        lootNames.push(`${equipment.name} x${quantity}`);

        if (equipment.slot === 'weapon') {
          weaponGiven = true;
        }
      } else if (itemObj) {
        this.addCraftedItem(player, itemObj.id, quantity);
        lootNames.push(`${itemObj.name} x${quantity}`);
      } else if (material) {
        this.addMaterialToInventory(player, material.id, quantity);
        lootNames.push(`${material.name} x${quantity}`);
      }
    }

    // Process materials
    const materials = rewardPackage.materials || [];
    for (const mat of materials) {
      let matId, quantity;
      if (typeof mat === 'string') {
        matId = mat;
        quantity = 1;
      } else {
        matId = mat.id;
        quantity = mat.quantity || 1;
      }

      const material = getMaterial(matId);
      if (material) {
        this.addMaterialToInventory(player, material.id, quantity);
        lootNames.push(`${material.name} x${quantity}`);
      }
    }

    return lootNames;
  }

  /**
   * Infer equipment slot from item category and type
   */
  inferSlotFromCategory(item) {
    // If item already has a slot, use it
    if (item.slot) return item.slot;
    
    const category = item.category?.toLowerCase() || '';
    const itemType = item.itemType?.toLowerCase() || '';
    
    // Map category/itemType to slots
    if (category === 'weapon' || itemType === 'sword' || itemType === 'axe' || itemType === 'mace' || itemType === 'bow' || itemType === 'staff' || itemType === 'dagger') {
      return 'weapon';
    }
    if (category === 'armor' || category === 'chest' || itemType === 'chest' || itemType === 'body' || itemType === 'cuirass') {
      return 'chest';
    }
    if (itemType === 'helm' || itemType === 'head' || itemType === 'crown') {
      return 'head';
    }
    if (itemType === 'legs' || itemType === 'greaves' || itemType === 'pants') {
      return 'legs';
    }
    if (itemType === 'boots' || itemType === 'feet' || itemType === 'shoes') {
      return 'boots';
    }
    if (itemType === 'shield') {
      return 'shield';
    }
    if (itemType === 'ring') {
      return 'ring';
    }
    if (itemType === 'amulet' || itemType === 'necklace' || itemType === 'pendant') {
      return 'amulet';
    }
    
    // Default based on damage/defense stats
    if ((item.damage || 0) > 0) {
      return 'weapon';
    }
    if ((item.defense || 0) > 0) {
      return 'chest';
    }
    
    // Fallback default
    return 'weapon';
  }

  getResolvedEquippedSlots(player) {
    const slots = new Set();
    const addSlots = (source) => {
      if (!source || typeof source !== 'object') return;
      for (const [slot, value] of Object.entries(source)) {
        const itemId = typeof value === 'string' ? value : value?.id || value?.itemId;
        if (slot && itemId) slots.add(slot);
      }
    };

    addSlots(player.equippedItems);
    addSlots(player.equipment);
    return [...slots];
  }

  getResolvedEquippedItemId(player, slot) {
    const fromEquippedItems = player.equippedItems?.[slot];
    if (typeof fromEquippedItems === 'string') return fromEquippedItems;
    if (fromEquippedItems && typeof fromEquippedItems === 'object') {
      return fromEquippedItems.id || fromEquippedItems.itemId || null;
    }

    const fromLegacyEquipment = player.equipment?.[slot];
    if (typeof fromLegacyEquipment === 'string') return fromLegacyEquipment;
    if (fromLegacyEquipment && typeof fromLegacyEquipment === 'object') {
      return fromLegacyEquipment.id || fromLegacyEquipment.itemId || null;
    }

    return null;
  }

  addCraftedItem(player, itemId, quantity) {
    const equipped = [];
    const added = [];
    for (let i = 0; i < quantity; i += 1) {
      // First, check if it's equipment (weapons/armor with slots)
      const equipment = getEquipment(itemId);
      if (equipment) {
        // Check class restriction (use internalClass since class is only set after quest unlock)
        const playerClass = player.class || player.internalClass;
        const slot = equipment.slot || 'weapon';
        
        // If item has class restriction and player doesn't match, add to inventory (can't auto-equip)
        if (equipment.classRestriction && equipment.classRestriction !== playerClass) {
          this.addInventoryItem(player, {
            id: equipment.id,
            name: equipment.name,
            type: 'equipment',
            slot: equipment.slot,
          });
          added.push(equipment.name);
          continue;
        }
        
        // If slot is empty and player can use it, auto-equip
        if (!player.equippedItems[slot]) {
          player.equippedItems[slot] = equipment.id;
          equipped.push(equipment.name);
          continue;
        }
        
        // Slot has an item - compare stats and auto-equip if better
        const currentEquippedId = player.equippedItems[slot];
        const currentEquipment = getEquipment(currentEquippedId) || getItemByIdDynamic(currentEquippedId);
        
        if (currentEquipment) {
          const currentScore = this.calculateEquipmentScore(currentEquipment);
          const newScore = this.calculateEquipmentScore(equipment);
          
          // If new equipment is better, equip it and add old to inventory
          if (newScore > currentScore) {
            player.equippedItems[slot] = equipment.id;
            equipped.push(`${equipment.name} (replaced ${currentEquipment.name})`);
            this.addInventoryItem(player, {
              id: currentEquipment.id,
              name: currentEquipment.name,
              type: 'equipment',
              slot: currentEquipment.slot,
            });
            continue;
          }
        }
        
        // Otherwise add to inventory
        this.addInventoryItem(player, {
          id: equipment.id,
          name: equipment.name,
          type: 'equipment',
          slot: equipment.slot,
        });
        added.push(equipment.name);
        continue;
      }

      // If not equipment, check if it's a consumable or other item
      const item = getItemByIdDynamic(itemId);
      if (item) {
        // Determine type: equipment if it has combat stats or a slot designation
        let itemType = 'consumable';
        let itemSlot = undefined;
        
        if (item.damage > 0 || item.defense > 0 || item.slot || item.classRestriction) {
          itemType = 'equipment'; // Weapons and armor have stats/slots or class restrictions
          itemSlot = this.inferSlotFromCategory(item); // Infer slot from category
        }
        
        this.addInventoryItem(player, {
          id: item.id,
          name: item.name,
          type: itemType,
          slot: itemSlot,
        });
        added.push(item.name);
      } else {
        // Fallback: item not found, but still add it with a generated name
        // This ensures items are never lost even if definitions are missing
        const fallbackName = itemId.startsWith('item_') 
          ? `Unknown Item (${itemId.slice(-6)})` 
          : itemId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        this.addInventoryItem(player, {
          id: itemId,
          name: fallbackName,
          type: 'consumable',
        });
        added.push(fallbackName);
        
        // Log warning for debugging
        console.warn(`⚠️ Item not found in system: ${itemId} - added with fallback name`);
      }
    }
    
    player.clearStatsCache(); // Clear cache after crafting (equipment bonuses changed)
    this.persistPlayer(player);
    return { equipped, added };
  }

  applyMissingGatheringRewards(player) {
    const hasGathering = player.professions?.includes('gathering') || Number(player.professionLevels?.gathering) > 0;
    if (!hasGathering) return false;

    const gatheringLevel = getGatheringProfessionLevel(player);
    const safeLevel = Math.max(1, Number(gatheringLevel) || 1);
    const claimedLevel = Math.max(0, Number(player.gatheringRewardsClaimedLevel) || 0);
    if (safeLevel <= claimedLevel) return false;

    for (let level = claimedLevel + 1; level <= safeLevel; level += 1) {
      const reward = getGatheringReward(level);
      if (!reward || !Array.isArray(reward.items)) continue;
      for (const itemId of reward.items) {
        this.addCraftedItem(player, itemId, 1);
      }
    }

    player.gatheringRewardsClaimedLevel = safeLevel;
    this.persistPlayer(player);
    return true;
  }

  /**
   * Handle combat menu group
   */
  async handleQuestsMenu(interaction, player) {
    this.trackMenuNavigation(player, 'quests');
    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('📜 Quests & Objectives')
      .setDescription('Your journey and goals');

    const buttons = this.createQuestsMenuButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Handle economy hub menu
   */
  getAchievementData(player) {
    const questsCompleted = Object.keys(player.questFlags || {}).filter(
      key => !key.endsWith('_abandoned') && !key.endsWith('_completed_at')
    ).length;
    const bossesDefeated = player.worldBossesDefeated?.length || 0;
    const skillsLearned = player.skills?.length || 0;
    const craftedItems = player.inventory?.filter(i => i?.type === 'equipment').length || 0;

    // Progress stats (with fallback for legacy players)
    const stats = player.progressStats || {
      monstersDefeated: 0,
      gatheringActions: 0,
      materialsCollected: 0,
      craftsCompleted: 0,
      goldEarned: 0,
      criticalHits: 0,
      dungeonsCleared: 0,
      raidsCleared: 0,
    };

    return [
      {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Reach level 5.',
        progressValue: player.level,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 3, reward: { xp: 50, gold: 25 } },
          { id: 'silver', name: 'Silver', target: 4, reward: { xp: 75, gold: 40 } },
          { id: 'gold', name: 'Gold', target: 5, reward: { xp: 120, gold: 60 } },
        ],
      },
      {
        id: 'questing',
        name: 'Questing',
        description: 'Complete 10 quests.',
        progressValue: questsCompleted,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 3, reward: { xp: 60, gold: 40 } },
          { id: 'silver', name: 'Silver', target: 6, reward: { xp: 90, gold: 70 } },
          { id: 'gold', name: 'Gold', target: 10, reward: { xp: 150, gold: 120 } },
        ],
      },
      {
        id: 'boss_hunter',
        name: 'Boss Hunter',
        description: 'Defeat 5 world bosses.',
        progressValue: bossesDefeated,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 1, reward: { xp: 80, gold: 80 } },
          { id: 'silver', name: 'Silver', target: 3, reward: { xp: 140, gold: 140 } },
          { id: 'gold', name: 'Gold', target: 5, reward: { xp: 220, gold: 220 } },
        ],
      },
      {
        id: 'skill_collector',
        name: 'Skill Collector',
        description: 'Learn 12 skills.',
        progressValue: skillsLearned,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 4, reward: { xp: 60, gold: 30 } },
          { id: 'silver', name: 'Silver', target: 8, reward: { xp: 110, gold: 70 } },
          { id: 'gold', name: 'Gold', target: 12, reward: { xp: 180, gold: 120 } },
        ],
      },
      {
        id: 'crafter',
        name: 'Crafter',
        description: 'Craft 20 equipment items.',
        progressValue: craftedItems,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 5, reward: { xp: 70, gold: 50 } },
          { id: 'silver', name: 'Silver', target: 12, reward: { xp: 120, gold: 90 } },
          { id: 'gold', name: 'Gold', target: 20, reward: { xp: 200, gold: 150 } },
        ],
      },
      // New achievements based on progress stats
      {
        id: 'monster_slayer',
        name: 'Monster Slayer',
        description: 'Defeat 1000 monsters.',
        progressValue: stats.monstersDefeated,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 100, reward: { xp: 150, gold: 100 } },
          { id: 'silver', name: 'Silver', target: 500, reward: { xp: 400, gold: 300 } },
          { id: 'gold', name: 'Gold', target: 1000, reward: { xp: 800, gold: 600 } },
        ],
      },
      {
        id: 'gatherer',
        name: 'Master Gatherer',
        description: 'Complete 5000 gathering actions.',
        progressValue: stats.gatheringActions,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 1000, reward: { xp: 200, gold: 150 } },
          { id: 'silver', name: 'Silver', target: 2500, reward: { xp: 500, gold: 400 } },
          { id: 'gold', name: 'Gold', target: 5000, reward: { xp: 1000, gold: 800 } },
        ],
      },
      {
        id: 'material_hoarder',
        name: 'Material Hoarder',
        description: 'Collect 10,000 materials.',
        progressValue: stats.materialsCollected,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 1000, reward: { xp: 180, gold: 120 } },
          { id: 'silver', name: 'Silver', target: 5000, reward: { xp: 450, gold: 350 } },
          { id: 'gold', name: 'Gold', target: 10000, reward: { xp: 900, gold: 700 } },
        ],
      },
      {
        id: 'master_crafter',
        name: 'Master Crafter',
        description: 'Craft 500 items.',
        progressValue: stats.craftsCompleted,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 50, reward: { xp: 150, gold: 100 } },
          { id: 'silver', name: 'Silver', target: 200, reward: { xp: 400, gold: 300 } },
          { id: 'gold', name: 'Gold', target: 500, reward: { xp: 800, gold: 600 } },
        ],
      },
      {
        id: 'gold_magnate',
        name: 'Gold Magnate',
        description: 'Earn 1,000,000 gold lifetime.',
        progressValue: stats.goldEarned,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 10000, reward: { xp: 200, gold: 500 } },
          { id: 'silver', name: 'Silver', target: 100000, reward: { xp: 500, gold: 1500 } },
          { id: 'gold', name: 'Gold', target: 1000000, reward: { xp: 1000, gold: 5000 } },
        ],
      },
      {
        id: 'crit_master',
        name: 'Critical Master',
        description: 'Land 1000 critical hits.',
        progressValue: stats.criticalHits,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 100, reward: { xp: 150, gold: 100 } },
          { id: 'silver', name: 'Silver', target: 500, reward: { xp: 400, gold: 300 } },
          { id: 'gold', name: 'Gold', target: 1000, reward: { xp: 800, gold: 600 } },
        ],
      },
      {
        id: 'dungeon_explorer',
        name: 'Dungeon Explorer',
        description: 'Clear 100 dungeons.',
        progressValue: stats.dungeonsCleared,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 10, reward: { xp: 200, gold: 150 } },
          { id: 'silver', name: 'Silver', target: 50, reward: { xp: 500, gold: 400 } },
          { id: 'gold', name: 'Gold', target: 100, reward: { xp: 1000, gold: 800 } },
        ],
      },
      {
        id: 'raid_conqueror',
        name: 'Raid Conqueror',
        description: 'Complete 50 raid floors.',
        progressValue: stats.raidsCleared,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 5, reward: { xp: 300, gold: 250 } },
          { id: 'silver', name: 'Silver', target: 20, reward: { xp: 700, gold: 600 } },
          { id: 'gold', name: 'Gold', target: 50, reward: { xp: 1500, gold: 1200 } },
        ],
      },
      {
        id: 'completionist',
        name: 'Completionist',
        description: 'Complete 50 quests.',
        progressValue: questsCompleted,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 15, reward: { xp: 250, gold: 200 } },
          { id: 'silver', name: 'Silver', target: 30, reward: { xp: 600, gold: 500 } },
          { id: 'gold', name: 'Gold', target: 50, reward: { xp: 1200, gold: 1000 } },
        ],
      },
      {
        id: 'world_champion',
        name: 'World Champion',
        description: 'Defeat 15 world bosses.',
        progressValue: bossesDefeated,
        tiers: [
          { id: 'bronze', name: 'Bronze', target: 7, reward: { xp: 350, gold: 300 } },
          { id: 'silver', name: 'Silver', target: 12, reward: { xp: 800, gold: 700 } },
          { id: 'gold', name: 'Gold', target: 15, reward: { xp: 1500, gold: 1300 } },
        ],
      },
    ];
  }

  /**
   * Handle achievement detail view
   */
  async handleHelpMenu(interaction, player) {
    this.trackMenuNavigation(player, 'help');

    const world = getWorld(player.currentWorld);
    const worldBoss = getWorldBoss(player.currentWorld);
    const bossStatus = worldBoss
      ? `${worldBoss.name} (Lvl ${worldBoss.level}) • Defeated: ${
          (player.worldBossesDefeated || []).map(String).includes(String(player.currentWorld)) ? '✅' : '❌'
        }`
      : 'No boss data';

    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle('❓ Help, Tips & Objectives')
      .setDescription('Everything you need to know to progress faster.');

    embed.addFields(
      { name: '🎯 Objectives', value: `World: ${world?.name || 'Unknown'}\nWorld Boss: ${bossStatus}`, inline: false },
      { name: '⚔️ Combat', value: 'Use ⚔️ Skills to select skills, manage cooldowns, and exploit type advantages. Access Arena for quick PvP battles (Lv 5+).', inline: false },
      { name: '📜 Quests', value: 'Complete daily quests, world quests, and defense quests. World quests unlock new areas and progress the story.', inline: false },
      { name: '⛏️ Gathering & Crafting', value: 'Gather materials from your current world. Use Professions to craft gear, consumables, and upgrades. Level professions to unlock better recipes.', inline: false },
      { name: '🏛️ Guild', value: 'Join or create a guild. Complete guild quests for Guild XP. Higher guild ranks provide weekly rewards and powerful buffs. Check guild leaderboard and growth in QOL menu.', inline: false },
      { name: '📈 Progression', value: 'Level up to unlock features: Dungeons (Lv 10), Arena (Lv 5), Raids (Lv 20). Use QOL Menu for advanced features like Enemy Encyclopedia, Loot Analytics, and Damage Tracker.', inline: false },
      { name: '💡 Pro Tips', value: 'Equip best gear sets, spend talent points wisely, check Achievements for passive bonuses. Use Quick Swap in combat to change gear sets. Track boss weaknesses in Boss Analyzer.', inline: false },
      { name: '🎨 Quality of Life', value: 'Access QOL menu for 60+ features: Gear Compare, Favorites, Auto-Sell, Notifications, UI Themes, Timezone Settings, and much more!', inline: false }
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-back-to-hub')
        .setLabel('🏠 Back to Hub')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Handle combined stats and talents view
   */
  getGuildRank(guildXP) {
    return getRankByXP(guildXP || 0);
  }

  /**
   * Arena mode (single battle)
   */
  getArenaRank(points) {
    if (points >= 5000) return '👑 Champion';
    if (points >= 2500) return '💎 Master';
    if (points >= 1000) return '⚔️ Gladiator';
    if (points >= 500) return '🛡️ Warrior';
    if (points >= 250) return '⚡ Fighter';
    if (points >= 100) return '🔰 Apprentice';
    return '🌱 Novice';
  }

  getClassEmoji(classId) {
    const emojis = {
      warrior: '⚔️',
      mage: '✨',
      rogue: '🗡️',
      ranger: '🏹',
      paladin: '🛡️',
    };
    return emojis[classId] || '⚔️';
  }

  /**
   * Update arena snapshots - saves current stats of all players
   */
  loadMarketData() {
    try {
      const marketPath = path.join(process.cwd(), 'rpg', 'data', 'market.json');
      
      if (fs.existsSync(marketPath)) {
        const data = fs.readFileSync(marketPath, 'utf8');
        return JSON.parse(data);
      }
      return { listings: [] };
    } catch (error) {
      console.error('Error loading market data:', error);
      return { listings: [] };
    }
  }

  /**
   * Save market data to file
   */
  saveMarketData(marketData) {
    try {
      const marketPath = path.join(process.cwd(), 'rpg', 'data', 'market.json');
      fs.writeFileSync(marketPath, JSON.stringify(marketData, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving market data:', error);
    }
  }

  /**
   * Handle Market Main Menu
   */
  getItemTypeEmoji(type) {
    const emojis = {
      material: '⚒️',
      consumable: '🧪',
      equipment: '⚔️',
      enchant: '✨',
      quest: '📜',
    };
    return emojis[type] || '📦';
  }

  /**
   * Handle Market Purchase
   */

  addInventoryItem(player, item) {
    // Ensure item has a name (fallback if missing)
    if (!item.name || typeof item.name !== 'string') {
      item.name = item.id || 'Unknown Item';
    }
    
    // Equipment items (weapons/armor) should NOT stack - each piece is unique
    // Only stack consumables and materials
    if (item.type === 'equipment' || item.slot) {
      // Add as separate item (don't stack equipment)
      player.inventory.push({ ...item, quantity: 1 });
      this.persistPlayer(player);
      return;
    }
    
    // For non-equipment (consumables), allow stacking
    const existing = player.inventory.find(
      (invItem) => invItem && typeof invItem === 'object' && invItem.id === item.id && invItem.type === item.type
    );
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
      this.persistPlayer(player);
      return;
    }
    player.inventory.push({ ...item, quantity: 1 });
    this.persistPlayer(player);
  }

  /**
   * Handle raids
   */
  retroactivelyUnlockWorlds(player) {
    const allWorlds = getAllWorlds();
    if (!allWorlds || allWorlds.length === 0) return;

    // Ensure arrays exist
    if (!player.worldBossesDefeated) player.worldBossesDefeated = [];
    if (!player.worldsUnlocked) player.worldsUnlocked = [];

    const sortedWorlds = allWorlds.sort((a, b) => (a.tier || 1) - (b.tier || 1));
    let unlocked = false;

    const defeatedWorldIds = player.worldBossesDefeated.map(String);
    const unlockedWorldIds = player.worldsUnlocked.map(String);

    // For each defeated world boss, unlock the next world tier
    for (const defeatedWorldId of defeatedWorldIds) {
      const defeatedWorld = sortedWorlds.find(w => String(w.id) === defeatedWorldId);
      if (defeatedWorld) {
        const currentTier = defeatedWorld.tier || 1;
        const nextWorld = sortedWorlds.find(w => (w.tier || 1) === currentTier + 1);

        // Unlock the next world if it exists and isn't already unlocked
        if (nextWorld && !unlockedWorldIds.includes(String(nextWorld.id))) {
          player.worldsUnlocked.push(nextWorld.id);
          unlockedWorldIds.push(String(nextWorld.id));
          unlocked = true;
        }
      }
    }

    // ADDITIONAL CHECK: If player level suggests they've progressed beyond a world's max level,
    // assume they defeated that world's boss and unlock subsequent worlds
    const playerLevel = player.level || 1;
    for (const world of sortedWorlds) {
      const maxLevel = world.maxLevel || 999;
      const worldTier = world.tier || 1;
      
      // If player is significantly beyond this world's max level, they likely defeated its boss
      if (playerLevel > maxLevel) {
        // Mark as defeated if not already
        if (!defeatedWorldIds.includes(String(world.id))) {
          player.worldBossesDefeated.push(world.id);
          defeatedWorldIds.push(String(world.id));
          unlocked = true;
        }
        
        // Unlock next tier world
        const nextWorld = sortedWorlds.find(w => (w.tier || 1) === worldTier + 1);
        if (nextWorld && !unlockedWorldIds.includes(String(nextWorld.id))) {
          player.worldsUnlocked.push(nextWorld.id);
          unlockedWorldIds.push(String(nextWorld.id));
          unlocked = true;
        }
      }
    }

    // Also ensure first world is unlocked
    if (sortedWorlds.length > 0 && !unlockedWorldIds.includes(String(sortedWorlds[0].id))) {
      player.worldsUnlocked.push(sortedWorlds[0].id);
      unlocked = true;
    }

    if (unlocked) {
      this.persistPlayer(player);
    }
  }

  /**
   * Handle world travel selection
   */

  getBossCombatStats(player) {
    const defaultStats = {
      strength: 5,
      defense: 5,
      agility: 5,
      intelligence: 5,
      vitality: 5,
      wisdom: 5,
      maxHp: 100,
      maxMana: 50,
    };
    
    // Fix corrupted or old bossStats structure
    let base = { ...defaultStats };
    if (player.bossStats && typeof player.bossStats === 'object' && !player.bossStats.encounters) {
      // Valid structure - merge with defaults
      for (const [key, value] of Object.entries(player.bossStats)) {
        if (typeof value === 'number' && key in defaultStats) {
          base[key] = value;
        }
      }
    }

    const stats = {
      strength: Math.max(1, base.strength || 5),
      defense: Math.max(1, base.defense || 5),
      agility: Math.max(1, base.agility || 5),
      intelligence: Math.max(1, base.intelligence || 5),
      vitality: Math.max(1, base.vitality || 5),
      wisdom: Math.max(1, base.wisdom || 5),
      hp: Math.max(1, base.maxHp || 100),
      mana: Math.max(1, base.maxMana || 50),
    };

    const talentBonuses = {
      boss_power: { strength: 2 },
      boss_guard: { defense: 2 },
      boss_endurance: { hp: 20 },
      boss_focus: { intelligence: 2, wisdom: 1 },
    };

    const bossTalents = player.bossTalents || {};
    for (const [talentId, rank] of Object.entries(bossTalents)) {
      const bonuses = talentBonuses[talentId];
      if (!bonuses || !rank) continue;
      for (const [stat, value] of Object.entries(bonuses)) {
        stats[stat] = (stats[stat] || 0) + (value * rank);
      }
    }

    return stats;
  }

  getBossCombatSkills(player) {
    return Array.isArray(player.bossSkills) ? player.bossSkills : [];
  }

  applyBossBattleSnapshot(player, bossStats) {
    if (!player._bossSnapshot) {
      player._bossSnapshot = {
        maxHp: player.maxHp,
        hp: player.hp,
        maxMana: player.maxMana,
        mana: player.mana,
      };
    }

    player.maxHp = Math.max(1, bossStats.hp || 1);
    player.hp = player.maxHp;
    player.maxMana = Math.max(0, bossStats.mana || 0);
    player.mana = player.maxMana;
    player.clearStatsCache();
  }

  restoreBossBattleSnapshot(player) {
    if (!player._bossSnapshot) return;
    player.maxHp = player._bossSnapshot.maxHp;
    player.hp = Math.min(player._bossSnapshot.hp, player.maxHp);
    player.maxMana = player._bossSnapshot.maxMana;
    player.mana = Math.min(player._bossSnapshot.mana, player.maxMana);
    player._bossSnapshot = null;
    player.clearStatsCache();
  }

  getMaterialCount(player, materialId) {
    const entry = (player.inventory || []).find(
      (item) => item && typeof item === 'object' && item.id === materialId && item.type === 'material'
    );
    return Number(entry?.quantity || 0);
  }

  removeMaterialFromInventory(player, materialId, quantity) {
    if (!quantity || quantity <= 0) return false;
    const entryIndex = (player.inventory || []).findIndex(
      (item) => item && typeof item === 'object' && item.id === materialId && item.type === 'material'
    );
    if (entryIndex === -1) return false;
    const entry = player.inventory[entryIndex];
    if ((entry.quantity || 0) < quantity) return false;
    entry.quantity -= quantity;
    if (entry.quantity <= 0) {
      player.inventory.splice(entryIndex, 1);
    }
    return true;
  }

  /**
   * Calculate overall ranking score (level + xp contribution)
   */
  calculateOverallScore(player) {
    const levelScore = (player.level || 1) * 10000;
    const xpScore = (player.totalXP || 0) / 100;
    return levelScore + xpScore;
  }

  /**
   * Get player's rank and position in overall leaderboard
   */

  getBossSkillShopItems() {
    return [
      { id: 'slash', name: 'Slash', costGold: 1500, costEssence: 1 },
      { id: 'fireball', name: 'Fireball', costGold: 2000, costEssence: 2 },
      { id: 'whirlwind', name: 'Whirlwind', costGold: 3500, costEssence: 3 },
      { id: 'meteor', name: 'Meteor', costGold: 5000, costEssence: 4 },
    ];
  }

  getBossTalentShopItems() {
    return [
      { id: 'boss_power', name: 'Boss Power', description: '+2 Strength per rank', costGold: 2500, costEssence: 2 },
      { id: 'boss_guard', name: 'Boss Guard', description: '+2 Defense per rank', costGold: 2500, costEssence: 2 },
      { id: 'boss_endurance', name: 'Boss Endurance', description: '+20 HP per rank', costGold: 3000, costEssence: 3 },
      { id: 'boss_focus', name: 'Boss Focus', description: '+2 Int / +1 Wis per rank', costGold: 2500, costEssence: 2 },
    ];
  }

  getBossEnchantShopItems() {
    return [
      { id: 'boss_damage_enchant_t4', name: 'Epic Boss Damage Enchant Recipe', costGold: 8000, costEssence: 5 },
      { id: 'boss_damage_enchant_t5', name: 'Legendary Boss Damage Enchant Recipe', costGold: 15000, costEssence: 8 },
    ];
  }


  resolveGuildBossTierRewards(rewards, tier) {
    if (!rewards?.tiers || tier <= 0) return null;

    let base = null;
    if (tier <= 2) base = rewards.tiers.tier1;
    else if (tier <= 4) base = rewards.tiers.tier3;
    else base = rewards.tiers.tier5;

    if (!base) return null;

    const multiplier = tier % 2 === 0 ? 2 : 1;
    const items = (base.items || []).map(item => ({
      id: item.id,
      quantity: Math.max(1, Math.floor((item.quantity || 1) * multiplier)),
    }));

    return {
      gold: Math.floor((base.gold || 0) * multiplier),
      xp: Math.floor((base.xp || 0) * multiplier),
      items,
      multiplier,
    };
  }

  scaleRewardItems(items, multiplier) {
    if (!Array.isArray(items) || multiplier <= 1) return items || [];
    return items.map(item => ({
      id: item.id,
      quantity: Math.max(1, Math.floor((item.quantity || 1) * multiplier)),
    }));
  }

  applyRewardItemsToPlayer(player, items) {
    const names = [];
    for (const rewardItem of (items || [])) {
      const equipment = getEquipment(rewardItem.id);
      const item = getItemByIdDynamic(rewardItem.id);
      const material = getMaterial(rewardItem.id);

      if (equipment) {
        this.addCraftedItem(player, equipment.id, rewardItem.quantity || 1);
        names.push(`${equipment.name} x${rewardItem.quantity || 1}`);
      } else if (item) {
        this.addCraftedItem(player, item.id, rewardItem.quantity || 1);
        names.push(`${item.name} x${rewardItem.quantity || 1}`);
      } else if (material) {
        this.addMaterialToInventory(player, material.id, rewardItem.quantity || 1);
        names.push(`${material.name} x${rewardItem.quantity || 1}`);
      } else {
        this.addCraftedItem(player, rewardItem.id, rewardItem.quantity || 1);
        names.push(`${rewardItem.id} x${rewardItem.quantity || 1}`);
      }
    }
    return names;
  }

  finalizeGuildBossFight(guild, options = {}) {
    const result = this.guildManager.completeBoss(guild.id, options);
    if (!result.success) return null;

    const boss = result.boss;
    const rewards = boss.rewards || {};
    const tier = result.tier || 0;
    const defeated = result.defeated;

    const tierRewards = this.resolveGuildBossTierRewards(rewards, tier);
    const killBonus = defeated ? rewards.killBonus : null;
    const killMultiplier = defeated ? (killBonus?.multiplier || 1) : 1;
    const tierGroupMultiplier = tier > 0 ? Math.ceil(tier / 2) : 0;
    const tierEvenMultiplier = tier > 0 && tier % 2 === 0 ? 2 : 1;
    const guildRewardMultiplier = tierGroupMultiplier * tierEvenMultiplier;

    if (guildRewardMultiplier > 0) {
      guild.xp += Math.floor((rewards.guildXP || 0) * guildRewardMultiplier);
      guild.gold += Math.floor((rewards.guildGold || 0) * guildRewardMultiplier);
    }

    if (defeated && killBonus?.badgeId) {
      if (!guild.badges) guild.badges = [];
      guild.badges.push({
        id: killBonus.badgeId,
        bossId: boss.bossId,
        earnedAt: Date.now(),
      });
    }

    this.guildManager.save();

    const topMultipliers = [1.5, 1.25, 1.1];
    const topContributors = Object.entries(result.participants || {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    const topMap = new Map();
    topContributors.forEach(([userId], idx) => {
      topMap.set(userId, topMultipliers[idx] || 1);
    });

    const participantRewards = {};
    for (const [userId, damage] of Object.entries(result.participants || {})) {
      const participant = this.playerManager.getPlayer(userId);
      if (!participant) continue;

      const baseGold = tier > 0 ? (rewards.perPlayer?.gold || 0) : 0;
      const baseXp = tier > 0 ? (rewards.perPlayer?.xp || 0) : 0;

      const tierGold = tierRewards ? Math.floor((tierRewards.gold || 0) * killMultiplier) : 0;
      const tierXp = tierRewards ? Math.floor((tierRewards.xp || 0) * killMultiplier) : 0;
      const tierItems = tierRewards ? this.scaleRewardItems(tierRewards.items, killMultiplier) : [];

      let totalGold = baseGold + tierGold;
      let totalXp = baseXp + tierXp;

      const bonusMultiplier = topMap.get(userId) || 1;
      totalGold = Math.floor(totalGold * bonusMultiplier);
      totalXp = Math.floor(totalXp * bonusMultiplier);

      const level = Number(participant.level || 1);
      const levelMultiplier = 1 + Math.min(0.5, Math.max(0, (level - 1) * 0.01));
      totalGold = Math.floor(totalGold * levelMultiplier);
      totalXp = Math.floor(totalXp * levelMultiplier);

      const baseGuildXp = rewards.perPlayer?.guildXP || Math.floor((baseXp + tierXp) * 0.1);
      const totalGuildXp = Math.floor(baseGuildXp * bonusMultiplier * levelMultiplier);

      if (totalGold > 0) this.addGold(participant, totalGold);
      if (totalXp > 0) participant.addXp(totalXp);
      if (totalGuildXp > 0) {
        participant.guildXP = (participant.guildXP || 0) + totalGuildXp;
        const newRank = getRankKey(participant.guildXP);
        if (newRank && newRank !== participant.guildRank) {
          participant.guildRank = newRank;
        }
      }

      const itemNames = this.applyRewardItemsToPlayer(participant, tierItems);
      
      // Award boss essence based on tier and defeat status
      let bossEssenceAmount = 0;
      if (defeated) {
        bossEssenceAmount = Math.max(1, Math.floor(tier * 1.5)); // 1-2 essence per tier when defeated
        if (bossEssenceAmount > 0) {
          this.addMaterialToInventory(participant, 'boss_essence', bossEssenceAmount);
        }
      }
      
      this.persistPlayer(participant);

      participantRewards[userId] = {
        gold: totalGold,
        xp: totalXp,
        guildXp: totalGuildXp,
        items: itemNames,
        bossEssence: bossEssenceAmount,
        damageDealt: damage,
        bonusMultiplier,
      };
    }

    const tierLabel = tier > 0 ? `Tier ${tier}` : 'No Tier';
    const summary = `${boss.icon} **${boss.name}** ${defeated ? 'defeated' : 'completed'} (${tierLabel})`;

    return {
      ...result,
      participantRewards,
      summary,
      topContributors,
    };
  }

  isGuildBossCombat(player) {
    const combatState = this.combatSystem.getActiveCombat(player.userId);
    return combatState?.meta?.type === 'guild_boss';
  }

  syncGuildBossCombatState(combatState, boss) {
    if (!combatState || !boss) return;
    combatState.enemy.maxHp = Math.max(1, boss.maxHP || combatState.enemy.maxHp || 1);
    combatState.enemy.hp = Math.max(1, Math.min(boss.currentHP || combatState.enemy.hp, combatState.enemy.maxHp));
  }

  buildGuildBossCompletionMessage(finalResult, viewerId) {
    if (!finalResult) return '✅ Guild boss rewards have been distributed.';

    const boss = finalResult.boss;
    const tierLabel = finalResult.tier > 0 ? `Tier ${finalResult.tier}` : 'No Tier';
    const header = `${boss.icon} **${boss.name}** ${finalResult.defeated ? 'Defeated!' : 'Completed'} (${tierLabel})`;

    const guildRewards = boss.rewards || {};
    const guildRewardMultiplier = finalResult.tier > 0 ? Math.ceil(finalResult.tier / 2) * (finalResult.tier % 2 === 0 ? 2 : 1) : 0;
    const guildXp = Math.floor((guildRewards.guildXP || 0) * guildRewardMultiplier);
    const guildGold = Math.floor((guildRewards.guildGold || 0) * guildRewardMultiplier);

    const viewerReward = viewerId ? finalResult.participantRewards?.[viewerId] : null;
    const viewerLines = [];
    if (viewerReward) {
      if (viewerReward.gold) viewerLines.push(`└ ${viewerReward.gold} Gold`);
      if (viewerReward.xp) viewerLines.push(`└ ${viewerReward.xp} XP`);
      if (viewerReward.guildXp) viewerLines.push(`└ ${viewerReward.guildXp} Guild XP`);
      if (viewerReward.items?.length) viewerLines.push(`└ Items: ${viewerReward.items.join(', ')}`);
    }

    const topLines = (finalResult.topContributors || []).map(([userId, damage], idx) => {
      const medal = ['🥇', '🥈', '🥉'][idx];
      return `${medal} <@${userId}>: ${damage.toLocaleString()}`;
    });

    let message = `${header}\n\n`;
    if (guildRewardMultiplier > 0) {
      message += `**Guild Rewards:**\n└ ${guildXp} Guild XP\n└ ${guildGold} Guild Gold\n\n`;
    }
    if (viewerReward) {
      message += `**Your Rewards:**\n${viewerLines.join('\n') || '└ None'}\n\n`;
    }
    if (topLines.length > 0) {
      message += `**Top Contributors:**\n${topLines.join('\n')}\n`;
    }
    return message.trim();
  }

  checkQuestResets(player) {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneWeekMs = 7 * oneDayMs;

    // Get today's UTC midnight timestamp (synchronized for all players)
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    const todayMidnight = today.getTime();
    
    // Get this week's Sunday UTC midnight (Week starts on Sunday)
    const thisWeek = new Date(now);
    const dayOfWeek = thisWeek.getUTCDay();
    thisWeek.setUTCHours(0, 0, 0, 0);
    thisWeek.setUTCDate(thisWeek.getUTCDate() - dayOfWeek); // Go back to Sunday
    const weekStartMidnight = thisWeek.getTime();

    // Check daily reset - synchronized at UTC midnight for all players
    if (!player.lastDailyReset || player.lastDailyReset < todayMidnight) {
      player.dailyQuestsCompleted = [];
      this.clearGuildQuestProgressByType(player, 'daily');
      player.lastDailyReset = todayMidnight;
      this.playerManager.savePlayer(player);
    }

    // Check weekly reset - synchronized at UTC Sunday midnight for all players
    if (!player.lastWeeklyReset || player.lastWeeklyReset < weekStartMidnight) {
      player.weeklyQuestsCompleted = [];
      this.clearGuildQuestProgressByType(player, 'weekly');
      player.lastWeeklyReset = weekStartMidnight;
      this.playerManager.savePlayer(player);
    }
  }

  getGuildBossResetConfig() {
    return {
      timeZone: 'America/Toronto',
      hour: 17,
      minute: 0,
      maxAttempts: 3,
      resetDays: 3,
    };
  }

  getTimeZoneParts(date, timeZone) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(date);
    const map = {};
    for (const part of parts) {
      if (part.type !== 'literal') map[part.type] = part.value;
    }
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      second: Number(map.second || 0),
    };
  }

  zonedTimeToUtcMillis(parts, timeZone) {
    const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0);
    const guessDate = new Date(utcGuess);
    const zonedParts = this.getTimeZoneParts(guessDate, timeZone);
    const zonedAsUtc = Date.UTC(
      zonedParts.year,
      zonedParts.month - 1,
      zonedParts.day,
      zonedParts.hour,
      zonedParts.minute,
      zonedParts.second || 0
    );
    return utcGuess + (utcGuess - zonedAsUtc);
  }

  getNextDailyResetAt(timeZone, hour, minute, now = Date.now()) {
    const nowDate = new Date(now);
    const today = this.getTimeZoneParts(nowDate, timeZone);
    const todayReset = this.zonedTimeToUtcMillis({
      year: today.year,
      month: today.month,
      day: today.day,
      hour,
      minute,
      second: 0,
    }, timeZone);

    if (todayReset > now) {
      return todayReset;
    }

    const todayMidnight = this.zonedTimeToUtcMillis({
      year: today.year,
      month: today.month,
      day: today.day,
      hour: 0,
      minute: 0,
      second: 0,
    }, timeZone);
    const tomorrowDate = new Date(todayMidnight + 24 * 60 * 60 * 1000);
    const tomorrow = this.getTimeZoneParts(tomorrowDate, timeZone);
    return this.zonedTimeToUtcMillis({
      year: tomorrow.year,
      month: tomorrow.month,
      day: tomorrow.day,
      hour,
      minute,
      second: 0,
    }, timeZone);
  }

  getNextGuildBossResetAt(now = Date.now()) {
    const cfg = this.getGuildBossResetConfig();
    const nextDaily = this.getNextDailyResetAt(cfg.timeZone, cfg.hour, cfg.minute, now);
    return nextDaily + (cfg.resetDays - 1) * 24 * 60 * 60 * 1000;
  }

  ensureGuildBossAttemptState(player, now = Date.now()) {
    const cfg = this.getGuildBossResetConfig();
    if (!player.guildBossAttemptsToday && player.guildBossAttemptsToday !== 0) {
      player.guildBossAttemptsToday = 0;
    }
    if (!player.guildBossAttemptResetAt) {
      player.guildBossAttemptResetAt = this.getNextGuildBossResetAt(now);
    }

    if (now >= player.guildBossAttemptResetAt) {
      player.guildBossAttemptsToday = 0;
      player.guildBossAttemptResetAt = this.getNextGuildBossResetAt(now);
      this.persistPlayer(player);
    }
  }

  getGuildBossAttemptsLeft(player, now = Date.now()) {
    this.ensureGuildBossAttemptState(player, now);
    const cfg = this.getGuildBossResetConfig();
    return Math.max(0, cfg.maxAttempts - (player.guildBossAttemptsToday || 0));
  }

  consumeGuildBossAttempt(player, now = Date.now()) {
    this.ensureGuildBossAttemptState(player, now);
    const cfg = this.getGuildBossResetConfig();
    const used = player.guildBossAttemptsToday || 0;
    if (used >= cfg.maxAttempts) {
      return { ok: false, remaining: 0, resetAt: player.guildBossAttemptResetAt };
    }
    player.guildBossAttemptsToday = used + 1;
    this.persistPlayer(player);
    return { ok: true, remaining: Math.max(0, cfg.maxAttempts - player.guildBossAttemptsToday), resetAt: player.guildBossAttemptResetAt };
  }

  formatTimeUntil(timestamp, now = Date.now()) {
    const ms = Math.max(0, timestamp - now);
    const totalMinutes = Math.ceil(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  }

  ensureGuildQuestState(player) {
    if (!player.guildQuestProgress) player.guildQuestProgress = {};
    if (!Array.isArray(player.limitedQuestsCompleted)) player.limitedQuestsCompleted = [];
    if (!Array.isArray(player.dailyQuestsCompleted)) player.dailyQuestsCompleted = [];
    if (!Array.isArray(player.weeklyQuestsCompleted)) player.weeklyQuestsCompleted = [];
  }

  clearGuildQuestProgressByType(player, type) {
    this.ensureGuildQuestState(player);
    const allQuests = getAllGuildQuests();
    const list = allQuests?.[type] || [];
    for (const quest of list) {
      delete player.guildQuestProgress[quest.id];
    }
  }

  getGuildQuestProgressLine(player, quest) {
    this.ensureGuildQuestState(player);
    const objective = normalizeGuildQuestObjective(quest);
    if (!objective) return null;
    const current = player.guildQuestProgress?.[quest.id]?.count || 0;
    const total = Number(objective.count || 1);
    return `**Progress:** ${Math.min(current, total)}/${total}`;
  }

  normalizeQuestTarget(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  matchesQuestTarget(questTarget, eventTarget) {
    const q = this.normalizeQuestTarget(questTarget);
    const e = this.normalizeQuestTarget(eventTarget);
    if (!q) return true;
    if (!e) return false;
    return e.includes(q) || q.includes(e);
  }

  isLevelSufficient(playerLevel, requiredLevel) {
    return Number(playerLevel || 0) >= Number(requiredLevel || 0);
  }

  guildQuestObjectiveMatches(objective, event) {
    if (!objective || objective.type !== event.type) return false;

    const questTarget = objective.target || '';
    const eventTargets = [event.target, event.targetId, event.targetName].filter(Boolean);

    if (questTarget === 'boss' && event.tags?.includes('boss')) return true;
    if (questTarget === 'world_boss' && event.tags?.includes('world_boss')) return true;
    if (questTarget === 'material' && event.type === 'gather') return true;
    if (questTarget === 'enemy' && event.type === 'kill') return true;
    if (questTarget === 'dungeon' && event.type === 'explore') return true;

    if (eventTargets.length === 0) return true;

    return eventTargets.some(t => this.matchesQuestTarget(questTarget, t));
  }

  awardGuildQuestRewards(player, quest) {
    const rewards = quest.rewards || {};
    const lines = [];

    if (rewards.guildXP) {
      player.guildXP += rewards.guildXP;
      lines.push(`+${rewards.guildXP} Guild XP`);
    }

    if (rewards.gold) {
      this.addGold(player, rewards.gold);
      lines.push(`+${rewards.gold} gold`);
    }

    // Guild quests do not grant XP - gold and Guild XP only
    if (rewards.xp) {
      // XP reward is intentionally ignored for guild quests
    }

    const itemNames = [];
    for (const rewardItem of (rewards.items || [])) {
      const itemId = typeof rewardItem === 'string' ? rewardItem : rewardItem?.id;
      const quantity = typeof rewardItem === 'object' ? rewardItem.quantity || 1 : 1;
      if (!itemId) continue;

      const equipment = getEquipment(itemId);
      const item = getItemByIdDynamic(itemId);
      const material = getMaterial(itemId);

      if (equipment) {
        this.addCraftedItem(player, equipment.id, quantity);
        itemNames.push(`${equipment.name} x${quantity}`);
      } else if (item) {
        this.addCraftedItem(player, item.id, quantity);
        itemNames.push(`${item.name} x${quantity}`);
      } else if (material) {
        this.addMaterialToInventory(player, material.id, quantity);
        itemNames.push(`${material.name} x${quantity}`);
      }
    }

    if (itemNames.length > 0) {
      lines.push(`Items: ${itemNames.join(', ')}`);
    }

    const previousRank = player.guildRank;
    const newRank = getRankKey(player.guildXP);
    if (newRank && newRank !== previousRank) {
      player.guildRank = newRank;
      lines.push(`🎖️ Rank Up: ${previousRank} → ${newRank}`);
    }

    return lines;
  }

  /**
   * Handle guild quests menu with quest type selector
   */
  getQuestNavigationAction(quest) {
    const objective = normalizeGuildQuestObjective(quest);
    if (!objective) return null;

    const { type, target } = objective;

    // Gathering quests
    if (type === 'gather' || target === 'material') {
      return { action: 'gather', label: 'Go to Gathering', icon: '🌿', customId: 'rpg-gather' };
    }

    // Dungeon/Explore quests
    if (type === 'explore' || target === 'dungeon') {
      return { action: 'dungeon', label: 'Go to Dungeons', icon: '🏰', customId: 'rpg-dungeons' };
    }

    // Boss/Raid quests
    if (target === 'boss' || (target === 'enemy' && quest.title?.toLowerCase().includes('boss'))) {
      return { action: 'raid', label: 'Go to Raids', icon: '👑', customId: 'rpg-raids' };
    }

    // Specific mob quests - try to find lowest level dungeon with that enemy
    if (type === 'kill' && target === 'enemy') {
      const mobName = this.extractMobNameFromObjective(quest);
      if (mobName) {
        // Return special action to find dungeon by mob
        return { action: 'mob-hunt', label: `Hunt ${mobName}`, icon: '⚔️', mobName };
      }
      // Generic combat
      return { action: 'adventure', label: 'Go to Adventures', icon: '⚔️', customId: 'rpg-adventure' };
    }

    // Default to adventure
    return { action: 'adventure', label: 'Go to Adventures', icon: '⚔️', customId: 'rpg-adventure' };
  }

  /**
   * Extract mob/enemy name from quest objective text
   */
  extractMobNameFromObjective(quest) {
    const objectiveText = Array.isArray(quest.objectives) ? quest.objectives[0] : quest.objectives;
    if (!objectiveText) return null;

    const text = String(objectiveText).toLowerCase();
    
    // Try to match patterns like "Defeat X [mob]" or "Hunt X [mob]"
    const patterns = [
      /defeat.*?\b(the\s+)?([a-zA-Z\s]+?)(?:\s*(?:\(\d+\))?$)/i, // "Defeat the X" or "Defeat X"
      /hunt.*?\b(the\s+)?([a-zA-Z\s]+?)(?:\s*(?:\(\d+\))?$)/i,    // "Hunt the X" or "Hunt X"
      /kill.*?\b(the\s+)?([a-zA-Z\s]+?)(?:\s*(?:\(\d+\))?$)/i,    // "Kill the X" or "Kill X"
    ];

    for (const pattern of patterns) {
      const match = objectiveText.match(pattern);
      if (match && match[2]) {
        return match[2].trim().replace(/\s+/g, ' '); // Clean up extra spaces
      }
    }

    return null;
  }

  /**
   * Find the lowest level dungeon containing a specific mob
   */
  findDungeonWithMob(mobName) {
    if (!mobName) return null;

    const name = mobName.toLowerCase();
    const allDungeons = Object.values(DUNGEONS || {})
      .flatMap(world => Array.isArray(world) ? world : [world])
      .filter(d => d && typeof d === 'object');

    // Filter dungeons that might have this enemy (by name match or boss name)
    const candidates = allDungeons.filter(d => {
      const dungeonName = (d.name || '').toLowerCase();
      const bossName = d.boss ? String(d.boss).toLowerCase() : '';
      const bosses = Array.isArray(d.bosses) ? d.bosses.map(b => {
        if (typeof b === 'string') return b.toLowerCase();
        return (b.name || '').toLowerCase();
      }) : [];
      
      return dungeonName.includes(name) || bossName.includes(name) || bosses.some(b => b.includes(name));
    });

    // Sort by min level and return lowest
    if (candidates.length > 0) {
      candidates.sort((a, b) => (a.minLevel || 1) - (b.minLevel || 1));
      return candidates[0];
    }

    return null;
  }

  /**
   * Apply guild quest progress for an event
   * Returns { updates: [], completions: [] }
   */
  applyGuildQuestProgress(player, dailyQuests, weeklyQuests, claimedLimited, event) {
    const updates = [];
    const completions = [];

    this.ensureGuildQuestState(player);

    // Safety checks - ensure all inputs are arrays
    if (!Array.isArray(dailyQuests)) dailyQuests = [];
    if (!Array.isArray(weeklyQuests)) weeklyQuests = [];
    if (!Array.isArray(claimedLimited)) claimedLimited = [];

    const questBuckets = [
      ...dailyQuests.map(q => ({ quest: q, category: 'daily' })),
      ...weeklyQuests.map(q => ({ quest: q, category: 'weekly' })),
      ...claimedLimited.map(q => ({ quest: q, category: 'limited' })),
    ];

    for (const { quest, category } of questBuckets) {
      const objective = normalizeGuildQuestObjective(quest);
      if (!objective) continue;
      if (!this.guildQuestObjectiveMatches(objective, event)) continue;

      const current = player.guildQuestProgress?.[quest.id]?.count || 0;
      const increment = Number(event.count || 1);
      const total = Number(objective.count || 1);
      const updated = Math.min(total, current + increment);

      if (updated === current) continue;

      player.guildQuestProgress[quest.id] = {
        count: updated,
        updatedAt: Date.now(),
      };

      updates.push(`• ${quest.title}: ${updated}/${total}`);

      if (updated >= total) {
        const rewardLines = this.awardGuildQuestRewards(player, quest);
        if (category === 'daily') player.dailyQuestsCompleted.push(quest.id);
        if (category === 'weekly') player.weeklyQuestsCompleted.push(quest.id);
        if (category === 'limited') player.limitedQuestsCompleted.push(quest.id);
        completions.push(`✅ ${quest.title}${rewardLines.length ? ` (Rewards: ${rewardLines.join(', ')})` : ''}`);
      }
    }

    // Save player after quest progress update
    if (updates.length > 0 || completions.length > 0) {
      this.persistPlayer(player);
    }

    return { updates, completions };
  }

  /**
   * Check if quest objective matches an event
   */
  guildQuestObjectiveMatches(objective, event) {
    if (!objective || !event) return false;
    if (objective.type !== event.type) return false;

    const questTarget = objective.target || '';
    const eventTargets = [event.target, event.targetId, event.targetName].filter(Boolean);

    if (questTarget === 'boss' && event.tags?.includes('boss')) return true;
    if (questTarget === 'world_boss' && event.tags?.includes('world_boss')) return true;
    if (questTarget === 'material' && event.type === 'gather') return true;
    if (questTarget === 'enemy' && event.type === 'kill') return true;
    if (questTarget === 'dungeon' && event.type === 'explore') return true;

    if (eventTargets.length === 0) return true;

    return eventTargets.some(t => this.matchesQuestTarget(questTarget, t));
  }

  /**
   * Award rewards for completing a guild quest
   */
  awardGuildQuestRewards(player, quest) {
    const rewardLines = [];
    const rewards = quest.rewards || {};

    if (rewards.guildXP) {
      player.guildXP = (player.guildXP || 0) + rewards.guildXP;
      rewardLines.push(`+${rewards.guildXP} Guild XP`);
    }

    if (rewards.gold) {
      this.addGold(player, rewards.gold);
      rewardLines.push(`+${rewards.gold} gold`);
    }

    // Guild quests do not grant XP - gold and Guild XP only
    if (rewards.xp) {
      // XP reward is intentionally ignored for guild quests
    }

    // Handle material rewards
    if (rewards.materials) {
      const materialNames = [];
      for (const [materialId, quantity] of Object.entries(rewards.materials)) {
        this.addMaterialToInventory(player, materialId, quantity);
        const material = getMaterial(materialId);
        const materialName = material ? material.name : materialId;
        materialNames.push(`${materialName} x${quantity}`);
      }
      if (materialNames.length > 0) {
        rewardLines.push(`Materials: ${materialNames.join(', ')}`);
      }
    }

    const itemNames = [];
    for (const rewardItem of (rewards.items || [])) {
      const itemId = typeof rewardItem === 'string' ? rewardItem : rewardItem?.id;
      const quantity = typeof rewardItem === 'object' ? rewardItem.quantity || 1 : 1;
      if (!itemId) continue;

      const equipment = getEquipment(itemId);
      const item = getItemByIdDynamic(itemId);
      const material = getMaterial(itemId);

      if (equipment) {
        this.addCraftedItem(player, equipment.id, quantity);
        itemNames.push(`${equipment.name} x${quantity}`);
      } else if (item) {
        this.addCraftedItem(player, item.id, quantity);
        itemNames.push(`${item.name} x${quantity}`);
      } else if (material) {
        this.addMaterialToInventory(player, material.id, quantity);
        itemNames.push(`${material.name} x${quantity}`);
      }
    }

    if (itemNames.length > 0) {
      rewardLines.push(`Items: ${itemNames.join(', ')}`);
    }

    const previousRank = player.guildRank;
    const newRank = getRankKey(player.guildXP);
    if (newRank && newRank !== previousRank) {
      player.guildRank = newRank;
      rewardLines.push(`🎖️ Rank Up: ${previousRank} → ${newRank}`);
    }

    return rewardLines;
  }

  /**
   * Get progress line for a guild quest
   */
  getGuildQuestProgressLine(player, quest) {
    this.ensureGuildQuestState(player);
    const objective = normalizeGuildQuestObjective(quest);
    if (!objective) return null;

    const progress = player.guildQuestProgress[quest.id];
    const current = progress?.count || 0;
    const total = objective.count || 1;

    if (current >= total) {
      return `✅ Progress: ${current}/${total} (Complete!)`;
    }

    const percentage = Math.floor((current / total) * 100);
    return `📊 Progress: ${current}/${total} (${percentage}%)`;
  }

  /**
   * Check and reset daily/weekly quests if needed
   */
  checkQuestResets(player) {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    // Initialize reset timestamps if missing
    if (!player.lastDailyReset) {
      player.lastDailyReset = now;
    }
    if (!player.lastWeeklyReset) {
      player.lastWeeklyReset = now;
    }

    // Check daily reset
    if (now - player.lastDailyReset >= oneDayMs) {
      player.dailyQuestsCompleted = [];
      player.lastDailyReset = now;
      // Clear progress for daily quests
      if (player.guildQuestProgress) {
        const dailyQuestIds = getAllGuildQuests().daily.map(q => q.id);
        dailyQuestIds.forEach(id => {
          if (player.guildQuestProgress[id]) {
            delete player.guildQuestProgress[id];
          }
        });
      }
      this.persistPlayer(player);
    }

    // Check weekly reset
    if (now - player.lastWeeklyReset >= oneWeekMs) {
      player.weeklyQuestsCompleted = [];
      player.lastWeeklyReset = now;
      // Clear progress for weekly quests
      if (player.guildQuestProgress) {
        const weeklyQuestIds = getAllGuildQuests().weekly.map(q => q.id);
        weeklyQuestIds.forEach(id => {
          if (player.guildQuestProgress[id]) {
            delete player.guildQuestProgress[id];
          }
        });
      }
      this.persistPlayer(player);
    }
  }

  /**
   * Handle guild bounty board - Guild quests have been removed
   */

  unlockNextWorld(player, worldId) {
    // Mark this world's boss as defeated
    if (!player.worldBossesDefeated.includes(worldId)) {
      player.worldBossesDefeated.push(worldId);
    }

    // Get all worlds and find the next one by tier
    const allWorlds = getAllWorlds();
    const currentWorld = allWorlds.find(w => w.id === worldId);
    
    if (!currentWorld) {
      this.persistPlayer(player);
      return;
    }

    // Find the next world (next tier)
    const currentTier = currentWorld.tier || 1;
    const nextWorld = allWorlds.find(w => (w.tier || 1) === currentTier + 1);

    // Unlock the next world if it exists
    if (nextWorld && !player.worldsUnlocked.includes(nextWorld.id)) {
      player.worldsUnlocked.push(nextWorld.id);
      // Optionally auto-travel to the next world
      // player.currentWorld = nextWorld.id;
    }

    this.persistPlayer(player);
  }

  /**
   * Handle adventure (main progression mechanic)
   */

  generateAdventureMaterials(player) {
    const commonPool = ['iron_ore', 'coal', 'herb', 'water', 'leather'];
    const materialsFound = [];

    for (let i = 0; i < 2; i += 1) {
      const materialId = commonPool[Math.floor(Math.random() * commonPool.length)];
      const quantity = 1 + Math.floor(Math.random() * 2);
      this.addMaterialToInventory(player, materialId, quantity);
      const material = getMaterial(materialId) || MATERIALS[materialId];
      materialsFound.push({ id: materialId, name: material?.name || materialId, quantity });
    }

    if (Math.random() < 0.15) {
      const materialId = 'mana_crystal';
      this.addMaterialToInventory(player, materialId, 1);
      const material = getMaterial(materialId) || MATERIALS[materialId];
      materialsFound.push({ id: materialId, name: material?.name || materialId, quantity: 1 });
    }

    return materialsFound;
  }

  /**
   * Handle gather menu - now shows auto-gather skill selection
   */
  generateBossRewardPreview(bossData, dungeon) {
    if (!bossData) {
      return '💰 Massive XP & Gold\n🎯 Epic Equipment\n✨ Legendary Materials\n🧪 High-tier Potions\n📿 Powerful Enchantments';
    }

    const lines = [];
    
    // XP and Gold
    if (bossData.xpReward || bossData.goldReward) {
      lines.push(`💰 ${(bossData.xpReward || 0).toLocaleString()} XP & ${(bossData.goldReward || 0).toLocaleString()} Gold`);
    }
    
    // Materials
    if (bossData.materials && bossData.materials.length > 0) {
      const matCount = bossData.materials.reduce((sum, m) => sum + (m.quantity || 1), 0);
      lines.push(`🎁 ${matCount}+ Legendary Materials`);
    }
    
    // Potions  
    if (bossData.potions && bossData.potions.length > 0) {
      const potionCount = bossData.potions.reduce((sum, p) => sum + (p.quantity || 1), 0);
      lines.push(`🧪 ${potionCount}+ High-tier Potions`);
    }
    
    // Enchantments
    if (bossData.enchants && bossData.enchants.length > 0) {
      const enchantCount = bossData.enchants.reduce((sum, e) => sum + (e.quantity || 1), 0);
      lines.push(`📿 ${enchantCount}+ Powerful Enchantments`);
    }
    
    // Equipment
    if (bossData.loot && bossData.loot.length > 0) {
      lines.push(`⚔️ ${bossData.loot.length}+ Epic Equipment`);
    }

    return lines.length > 0 ? lines.join('\n') : '💎 Legendary Boss Rewards';
  }

  /**
   * Start dungeon boss fight (called after style selection)
   */
  createProgressBar(current, max, length = 10) {
    const percentage = Math.min(1, current / max);
    const filled = Math.round(percentage * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Main QOL Menu - Hub for all quality-of-life features
   */

  getDailyRewardState(player, now = Date.now()) {
    const dayMs = 24 * 60 * 60 * 1000;
    const lastClaimAt = Number(player.dailyRewardLastClaimAt || 0);
    const streak = Number(player.dailyRewardStreak || 0);

    if (!lastClaimAt) {
      return {
        canClaim: true,
        missedDays: 0,
        restoreCost: 0,
        streak,
        lastClaimAt: null,
        nextClaimAt: now,
        streakExpired: false,
      };
    }

    const daysSince = Math.floor((now - lastClaimAt) / dayMs);
    const canClaim = daysSince >= 1;
    const missedDays = canClaim ? Math.max(0, daysSince - 1) : 0;
    const streakExpired = missedDays >= 4;
    const restoreCost = missedDays > 0 && !streakExpired ? 500 * missedDays * missedDays : 0;
    const nextClaimAt = lastClaimAt + dayMs;

    return {
      canClaim,
      missedDays,
      restoreCost,
      streak,
      lastClaimAt,
      nextClaimAt,
      streakExpired,
    };
  }

  getDailyLootboxTiersForDay(streakDay) {
    const tiers = ['common'];
    if (streakDay % 3 === 0) tiers.push('uncommon');
    if (streakDay % 7 === 0) tiers.push('rare');
    if (streakDay % 14 === 0) tiers.push('epic');
    if (streakDay % 30 === 0) tiers.push('legendary');
    return tiers;
  }

  getDailyLootboxPools() {
    return {
      common: {
        weights: { material: 0.4, potion: 0.35, enchant: 0.15, gear: 0.1 },
        material: ['iron_ore', 'granite', 'rare_flower', 'moonflower'],
        potion: ['health_potion_t1', 'xp_potion_t1', 'gold_potion_t1'],
        enchant: ['damage_enchant_t1', 'loot_enchant_t1'],
        gear: ['bronze_sword'],
      },
      uncommon: {
        weights: { material: 0.35, potion: 0.3, enchant: 0.2, gear: 0.15 },
        material: ['iron_ore', 'mana_crystal', 'granite', 'rare_flower'],
        potion: ['health_potion_t1', 'xp_potion_t2', 'gold_potion_t1'],
        enchant: ['damage_enchant_t1', 'loot_enchant_t1', 'xp_enchant_t1'],
        gear: ['iron_greatsword', 'steel_longsword'],
      },
      rare: {
        weights: { material: 0.3, potion: 0.25, enchant: 0.25, gear: 0.2 },
        material: ['mithril_ore', 'mana_crystal', 'ice_crystal', 'boss_essence'],
        potion: ['health_potion_t2', 'xp_potion_t2', 'gold_potion_t2', 'loot_potion_t1'],
        enchant: ['damage_enchant_t2', 'loot_enchant_t2', 'xp_enchant_t2'],
        gear: ['mithril_blade', 'odin_blade', 'hermes_staff'],
      },
      epic: {
        weights: { material: 0.25, potion: 0.25, enchant: 0.25, gear: 0.25 },
        material: ['adamantite', 'arcane_essence', 'dragonhide', 'boss_essence'],
        potion: ['health_potion_t3', 'xp_potion_t3', 'gold_potion_t3', 'loot_potion_t2'],
        enchant: ['damage_enchant_t3', 'loot_enchant_t3', 'doublehit_enchant_t2'],
        gear: ['thor_axe_junior', 'athena_staff_junior', 'hermes_daggers', 'zeus_hammer_junior'],
      },
      legendary: {
        weights: { material: 0.2, potion: 0.2, enchant: 0.25, gear: 0.35 },
        material: ['dragonstone', 'phoenix_feather', 'boss_essence', 'titan_core'],
        potion: ['health_potion_t4', 'xp_potion_t4', 'loot_potion_t3'],
        enchant: ['damage_enchant_t3', 'loot_enchant_t3', 'doublehit_enchant_t3'],
        gear: ['cosmic_destroyer', 'astral_conduit', 'reality_shards', 'eternal_arbiter'],
      },
    };
  }

  getLootboxItemId(tier) {
    return `lootbox_${tier}`;
  }

  getLootboxDisplayName(tier) {
    const label = String(tier || 'common');
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} Lootbox`;
  }

  getLootboxTierFromId(lootboxId) {
    const match = String(lootboxId || '').match(/^lootbox_(.+)$/);
    return match ? match[1] : 'common';
  }

  addLootboxToInventory(player, tier, quantity = 1) {
    if (!player.inventory) player.inventory = [];
    const id = this.getLootboxItemId(tier);
    const existing = player.inventory.find(item =>
      item && typeof item === 'object' && item.id === id && item.type === 'consumable' && item.subtype === 'lootbox'
    );
    if (existing) {
      existing.quantity = (existing.quantity || 1) + quantity;
      return;
    }

    player.inventory.push({
      id,
      name: this.getLootboxDisplayName(tier),
      type: 'consumable',
      subtype: 'lootbox',
      rarity: tier,
      quantity,
    });
  }

  removeLootboxFromInventory(player, lootboxId, quantity = 1) {
    if (!player.inventory) return false;
    const item = player.inventory.find(i =>
      i && typeof i === 'object' && i.id === lootboxId && i.type === 'consumable' && i.subtype === 'lootbox'
    );
    if (!item) return false;
    const currentQty = item.quantity || 1;
    if (currentQty < quantity) return false;

    if (currentQty > quantity) {
      item.quantity = currentQty - quantity;
    } else {
      const index = player.inventory.indexOf(item);
      if (index > -1) player.inventory.splice(index, 1);
    }
    return true;
  }

  getLootboxInventoryItems(player) {
    if (!player.inventory) return [];
    return player.inventory.filter(item =>
      item && typeof item === 'object' && item.type === 'consumable' && item.subtype === 'lootbox'
    );
  }

  getLootboxRewardDisplayName(rewardId) {
    const equipment = getEquipment(rewardId);
    if (equipment?.name) return equipment.name;
    const item = getItemByIdDynamic(rewardId);
    if (item?.name) return item.name;
    const material = getMaterial(rewardId);
    if (material?.name) return material.name;
    return rewardId;
  }

  generateDailyLootboxReward(tier) {
    const pools = this.getDailyLootboxPools();
    const pool = pools[tier];
    if (!pool) return null;

    const rewardType = this.pickWeighted(pool.weights);
    const rewardId = this.pickRandom(pool[rewardType]);
    if (!rewardId) return null;

    const quantity = rewardType === 'material'
      ? Math.max(1, Math.floor(Math.random() * 3) + 1)
      : 1;

    return { tier, rewardType, rewardId, quantity };
  }

  applyDailyLootboxReward(player, reward) {
    if (!reward) return null;
    const { rewardType, rewardId, quantity } = reward;

    if (rewardType === 'material' || rewardId === 'boss_essence') {
      this.addMaterialToInventory(player, rewardId, quantity);
      const material = getMaterial(rewardId);
      return `${material?.name || rewardId} x${quantity}`;
    }

    this.addCraftedItem(player, rewardId, quantity);
    const displayName = this.getLootboxRewardDisplayName(rewardId);
    return `${displayName}${quantity > 1 ? ` x${quantity}` : ''}`;
  }

  getLootboxRollItems(tier) {
    const pools = this.getDailyLootboxPools();
    const pool = pools[tier];
    if (!pool) return [];

    const allIds = []
      .concat(pool.material || [])
      .concat(pool.potion || [])
      .concat(pool.enchant || [])
      .concat(pool.gear || []);

    const names = allIds.map(id => this.getLootboxRewardDisplayName(id));
    return names.filter((value, index, self) => self.indexOf(value) === index);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  pickWeighted(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;
    for (const [key, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return key;
    }
    return entries[0]?.[0] || 'material';
  }

  pickRandom(list) {
    if (!Array.isArray(list) || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  rollDailyLootboxRewards(player, tier) {
    const reward = this.generateDailyLootboxReward(tier);
    if (!reward) return [];
    const applied = this.applyDailyLootboxReward(player, reward);
    return applied ? [applied] : [];
  }

  grantDailyRewardsForDay(player, streakDay) {
    const tiers = this.getDailyLootboxTiersForDay(streakDay);
    const lines = [];

    tiers.forEach((tier) => {
      this.addLootboxToInventory(player, tier, 1);
      lines.push(`🎁 ${tier.toUpperCase()} Lootbox added to inventory`);
    });

    return { tiers, lines };
  }

  getTowerMilestones(currentFloor) {
    const milestones = [];
    const checkpoints = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    
    for (const checkpoint of checkpoints) {
      if (checkpoint >= currentFloor) {
        const floorsAway = checkpoint - currentFloor;
        const isClose = floorsAway <= 5;
        milestones.push(
          `${isClose ? '🔥' : '📍'} Floor ${checkpoint} - ${floorsAway === 0 ? '**NEXT!**' : `${floorsAway} floors away`} ${checkpoint % 10 === 0 ? '(2x Rewards)' : ''}`
        );
        if (milestones.length >= 3) break;
      }
    }
    
    return milestones.length > 0 ? milestones.join('\n') : 'Tower Complete! 🎉';
  }
}

Object.assign(RPGCommand.prototype, CombatHandlers);
Object.assign(RPGCommand.prototype, InventoryHandlers);
Object.assign(RPGCommand.prototype, CraftingHandlers);
Object.assign(RPGCommand.prototype, QuestHandlers);
Object.assign(RPGCommand.prototype, GuildHandlers);
Object.assign(RPGCommand.prototype, GatheringHandlers);
Object.assign(RPGCommand.prototype, EconomyHandlers);
Object.assign(RPGCommand.prototype, ProgressHandlers);
Object.assign(RPGCommand.prototype, SkillsHandlers);
Object.assign(RPGCommand.prototype, ExplorationHandlers);
Object.assign(RPGCommand.prototype, RoguelikeHandlers);
Object.assign(RPGCommand.prototype, QolHandlers);




export default RPGCommand;