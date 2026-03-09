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

/**
 * rpg-quest-handlers — extracted from RPGCommand.js
 * 15 methods, ~1338 lines
 */
export const QuestHandlers = {
  async handleQuests(interaction, player, skipTracking = false) {
    if (!skipTracking) {
      this.trackMenuNavigation(player, 'quests');
    }
    player.questTab = player.questTab || 'side'; // Default to side quests
    
    const { main, side, daily } = getQuestCategoriesByWorld(player.currentWorld);
    const weekly = getWeeklyQuests(player) || [];
    const allDefense = loadDefenseQuests();
    const playerLevel = player.level;

    // Get quests for current tab (filter out abandoned and completed quests)
    let currentQuests = [];
    let tabLabel = 'Side Quests';
    
    if (player.questTab === 'side') {
      // Filter to show only starting quests (not intermediate steps or choice branches)
      const startingQuests = this.filterStartingQuests(side || []);
      currentQuests = startingQuests.filter(q => !player.hasQuestFlag(`${q.id}_abandoned`));
      tabLabel = 'Side Quests';
    } else if (player.questTab === 'daily') {
      currentQuests = (daily || []).filter(q => !player.hasQuestFlag(`${q.id}_abandoned`));
      tabLabel = 'Daily Quests';
    } else if (player.questTab === 'weekly') {
      currentQuests = weekly;
      tabLabel = 'Weekly Quests';
    } else if (player.questTab === 'defense') {
      currentQuests = allDefense;
      tabLabel = 'Town Defence Quests';
    }

    const completedCount = currentQuests.filter(q => player.hasQuestFlag(q.id)).length;
    const totalCount = currentQuests.length;

    // Create embed for current tab
    let description = `**${tabLabel}**\n`;
    if (totalCount > 0) {
      description += `Progress: ${completedCount}/${totalCount} completed\n`;
    }

    if (player.questTab === 'daily') {
      description += '⏱️ Daily quests reset every 24h.\n';
    }
    if (player.questTab === 'weekly') {
      description += '📆 Weekly quests reset on Sunday.\n';
    }

    description += '\n';
    if (currentQuests.length > 0) {
      const sortedQuests = [...currentQuests].sort((a, b) => (a.minLevel || 1) - (b.minLevel || 1));
      description += sortedQuests.map((q, idx) => {
        const questName = q.name || q.title || `Quest ${idx + 1}`;
        const isCompleted = player.hasQuestFlag(q.id);
        const icon = isCompleted ? '✅' : '📋';
        const warning = q.minLevel > playerLevel ? ' ⚠️' : '';
        return `${idx + 1}. **${questName}** ${icon} (Lvl ${q.minLevel || 1}${warning})`;
      }).join('\n');
    } else {
      description += 'No quests in this category.';
    }

    const embed = new EmbedBuilder()
      .setColor(0x00aa00)
      .setTitle('📜 Quests')
      .setDescription(description)
      .setTimestamp();

    const components = [];

    // Tab buttons - Only Side Quests
    const tabButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-quest-tab-side')
        .setLabel('Side Quests')
        .setStyle(ButtonStyle.Primary)
    );
    components.push(tabButtons);

    // Quest selector for current tab (only active quests, sorted by level)
    if (currentQuests.length > 0) {
      const selectorQuests = currentQuests
        .filter(q => !player.hasQuestFlag(q.id)) // Hide completed quests from selector
        .sort((a, b) => (a.minLevel || 1) - (b.minLevel || 1)); // Sort by level: lowest to highest
      
      if (selectorQuests.length > 0) {
        const options = selectorQuests.slice(0, 25).map(q => ({
          label: (q.name || q.title || 'Quest').slice(0, 100),
          value: q.id,
          description: `Lvl ${q.minLevel || 1}${(q.minLevel || 1) > playerLevel ? ' ⚠️' : ''}`.slice(0, 100),
        }));

        const selectMenu = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('rpg-quest-view-detail')
            .setPlaceholder('Select a quest to view details')
            .addOptions(options)
        );
        components.push(selectMenu);
      }
    }

    // Back button
    const backButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );
    components.push(backButtons);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Handle quest detail view and start quest
   */,

  async handleQuestDetail(interaction, player, questId) {
    // Find the quest
    const { main, side, daily } = getQuestCategoriesByWorld(player.currentWorld);
    const weekly = getWeeklyQuests(player) || [];
    const allDefense = loadDefenseQuests();
    
    let quest = null;
    let questType = null;
    
    const allQuests = [
      ...((main || []).map(q => ({ ...q, type: 'main' }))),
      ...((side || []).map(q => ({ ...q, type: 'side' }))),
      ...((daily || []).map(q => ({ ...q, type: 'daily' }))),
      ...((weekly || []).map(q => ({ ...q, type: 'weekly' }))),
      ...(allDefense.map(q => ({ ...q, type: 'defense' })))
    ];
    
    for (const q of allQuests) {
      if (q.id === questId) {
        quest = q;
        questType = q.type;
        break;
      }
    }

    if (!quest) {
      await interaction.reply({ content: 'Quest not found.', ephemeral: true });
      return;
    }

    const questName = quest.name || quest.title || 'Quest';
    const hasStepChainStart = allQuests.some(q => q.id === `${questId}_step1`);
    
    // Check if this is a quest chain (has branches)
    const hasChain = Array.isArray(quest.branches) && quest.branches.length > 0 && !hasStepChainStart;
    
    if (hasChain) {
      // Show quest chain options
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📝 ${questName} - Quest Line`)
        .setDescription(quest.description || 'No description');

      // Add quest chain info
      let chainInfo = `This quest line has **${quest.branches.length}** paths:\n\n`;
      quest.branches.forEach((branch, idx) => {
        chainInfo += `**Path ${idx + 1}: ${branch.choice}**\n`;
      });
      embed.addFields({
        name: 'Available Paths',
        value: chainInfo,
        inline: false,
      });

      embed.addFields({
        name: 'Recommended Level',
        value: String(quest.minLevel || 1),
        inline: true,
      });

      if (quest.reward) {
        let rewardText = `${quest.reward.xp} XP, ${quest.reward.gold} Gold`;
        if (quest.reward.items && quest.reward.items.length > 0) {
          rewardText += ', Items';
        }
        embed.addFields({
          name: 'Rewards',
          value: rewardText,
          inline: true,
        });
      }

      const components = [];

      // Show path choices directly for chain quests (only if not started)
      const isQuestStarted = player.questFlags?.[questId]?.started;
      const isQuestAbandoned = player.questFlags?.[questId]?._abandoned;
      
      if (!isQuestStarted && !isQuestAbandoned) {
        const choiceButtons = quest.branches.slice(0, 5).map((branch, idx) =>
          new ButtonBuilder()
            .setCustomId(`rpg-quest-chain-choice-${questId}-${idx}`)
            .setLabel((branch.choice || `Path ${idx + 1}`).slice(0, 80))
            .setStyle(ButtonStyle.Primary)
        );

        for (let i = 0; i < choiceButtons.length; i += 5) {
          components.push(new ActionRowBuilder().addComponents(choiceButtons.slice(i, i + 5)));
        }
      }

      // Back button
      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-quest-back')
          .setLabel('← Back to Quests')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rpg-hub')
          .setLabel('🏠 Hub')
          .setStyle(ButtonStyle.Primary)
      );
      components.push(backButton);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components,
      });
    } else {
      // Regular single quest or child quest - check if has prerequisite
      const { roots, childToParent } = this.buildQuestHierarchy(
        questType === 'side' ? (side || []) : []
      );
      
      const parentQuestId = childToParent.get(questId);
      const parentQuest = parentQuestId ? allQuests.find(q => q.id === parentQuestId) : null;
      
      let prerequisiteWarning = '';
      if (parentQuest) {
        const parentCompleted = player.questFlags?.[parentQuestId];
        if (!parentCompleted) {
          prerequisiteWarning = `⚠️ **Prerequisite:** Must complete **${parentQuest.name}** first!\n\n`;
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📝 ${questName}`)
        .setDescription((prerequisiteWarning || '') + (quest.description || 'No description'));

      // Add details based on type
      if (questType === 'defense' && quest.type === 'combat') {
        embed.addFields({
          name: 'Enemy',
          value: `${quest.enemy.name} (Lvl ${quest.enemy.level})`,
          inline: false,
        });
      }

      if (quest.objectives && quest.objectives.length > 0) {
        embed.addFields({
          name: 'Objectives',
          value: quest.objectives.map(o => `• ${o}`).join('\n'),
          inline: false,
        });
      }

      embed.addFields({
        name: 'Recommended Level',
        value: String(quest.minLevel || 1),
        inline: true,
      });

      if (quest.reward) {
        let rewardText = `${quest.reward.xp} XP, ${quest.reward.gold} Gold`;
        if (quest.reward.unlockClass) {
          rewardText += ', 🎓 Class Unlock';
        }
        embed.addFields({
          name: 'Rewards',
          value: rewardText,
          inline: true,
        });
      }

      const components = [];

      // Start button (show for all quest types except already started/abandoned, and check prerequisites)
      const isQuestStarted = player.questFlags?.[questId]?.started;
      const isQuestAbandoned = player.questFlags?.[questId]?._abandoned;
      const canStart = !isQuestStarted && !isQuestAbandoned && (!parentQuest || player.questFlags?.[parentQuestId]);
      
      if (!isQuestStarted && !isQuestAbandoned) {
        const startButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-quest-start-${questId}`)
            .setLabel('⚔️ Start Quest')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!canStart)
        );
        components.push(startButton);
      }

      // Back button
      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-quest-back')
          .setLabel('← Back to Quests')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rpg-hub')
          .setLabel('🏠 Hub')
          .setStyle(ButtonStyle.Primary)
      );
      components.push(backButton);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components,
      });
    }
  }

  /**
   * Handle inventory button
   */,

  async handleGoals(interaction, player) {
    this.trackMenuNavigation(player, 'goals');
    const embed = UIBuilder.createGoalsEmbed(player);
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Display gathering profession rewards and milestones
   */,

  async handleStartQuestFromDetail(interaction, player, questId) {
    const { main, side, daily } = getQuestCategoriesByWorld(player.currentWorld);
    const weekly = getWeeklyQuests(player) || [];
    const allDefense = loadDefenseQuests();
    
    let quest = null;
    let questType = null;
    
    // Search for quest in all categories
    for (const q of main || []) {
      if (q.id === questId) {
        quest = q;
        questType = 'main';
        break;
      }
    }
    if (!quest) {
      for (const q of side || []) {
        if (q.id === questId) {
          quest = q;
          questType = 'side';
          break;
        }
      }
    }
    if (!quest) {
      for (const q of daily || []) {
        if (q.id === questId) {
          quest = q;
          questType = 'daily';
          break;
        }
      }
    }
    if (!quest) {
      for (const q of weekly || []) {
        if (q.id === questId) {
          quest = q;
          questType = 'weekly';
          break;
        }
      }
    }
    if (!quest) {
      for (const q of allDefense) {
        if (q.id === questId) {
          quest = q;
          questType = 'defense';
          break;
        }
      }
    }

    if (!quest) {
      await interaction.reply({ content: 'Quest not found.', ephemeral: true });
      return;
    }

    const allQuests = [...(main || []), ...(side || []), ...(daily || []), ...weekly, ...allDefense];

    // Check if already completed
    if (player.hasQuestFlag(questId)) {
      await interaction.reply({ content: '✅ You already completed this quest.', ephemeral: true });
      return;
    }

    // Show warning if below recommended level but allow starting
    let levelWarning = '';
    if (player.level < quest.minLevel) {
      levelWarning = `\n⚠️ **Warning:** Recommended level is ${quest.minLevel}, you are level ${player.level}. This may be difficult!`;
    }

    // Handle quests with branches (quest chains with choices)
    const hasLinearStepChain = allQuests.some(q => q.id === `${questId}_step1`);
    const hasChainBranches = Array.isArray(quest.branches) && quest.branches.some(b => b.nextQuestId) && !hasLinearStepChain;
    if (hasChainBranches) {
      // Quest chain with branch selection
      await this.handleQuestChoice(interaction, player, quest, levelWarning);
      return;
    }

    // Handle choice-based quests (outcome-based choices)
    if ((questType === 'defense' && quest.type === 'choice') || quest.type === 'choice') {
      await this.handleQuestChoice(interaction, player, quest, levelWarning);
      return;
    }

    // Start combat for combat quests
    if ((questType === 'defense' && quest.type === 'combat') || questType !== 'defense') {
      // For defense quests, use enemy data
      let enemyData = quest.enemy;
      
      if (!enemyData) {
        // For regular quests, create a scaled enemy based on quest level
        const questLevel = quest.minLevel || player.level;
        
        // Generate enemy name from quest description
        let enemyName = `${quest.name}`;
        
        // Extract enemy type from quest description or name
        const description = (quest.description || '').toLowerCase();
        const questName = (quest.name || '').toLowerCase();
        const combined = description + ' ' + questName;
        
        if (combined.includes('dragon') || combined.includes('wyrm')) {
          enemyName = `Ancient Wyrm`;
        } else if (combined.includes('giant') || combined.includes('titan')) {
          enemyName = `Frost Giant`;
        } else if (combined.includes('dark elf') || combined.includes('elf')) {
          enemyName = `Dark Elf Warrior`;
        } else if (combined.includes('construct') || combined.includes('golem')) {
          enemyName = `Ancient Construct`;
        } else if (combined.includes('demon') || combined.includes('fiend')) {
          enemyName = `Demon Lord`;
        } else if (combined.includes('undead') || combined.includes('skeleton') || combined.includes('zombie')) {
          enemyName = `Undead Champion`;
        } else if (combined.includes('beast') || combined.includes('wolf') || combined.includes('bear')) {
          enemyName = `Mythical Beast`;
        } else if (combined.includes('shadow') || combined.includes('wraith')) {
          enemyName = `Shadow Wraith`;
        } else if (combined.includes('champion') || combined.includes('warlord') || combined.includes('einherjar')) {
          enemyName = `Elite Champion`;
        } else if (combined.includes('bandit') || combined.includes('thief') || combined.includes('raider')) {
          enemyName = `Bandit Leader`;
        } else if (combined.includes('cultist') || combined.includes('ritual')) {
          enemyName = `Dark Cultist`;
        } else {
          enemyName = `${quest.name} - Boss`;
        }
        
        // Scale stats based on quest level (matching Enemy.js scaling)
        const levelMultiplier = 1 + (questLevel - 1) * 0.18;
        
        // Quest enemies are slightly stronger than normal enemies (1.5x multiplier)
        const questMultiplier = 1.5;
        
        // Generate proper stats
        const baseHp = 70;
        const baseStr = 10;
        const baseDef = 8;
        const baseAgi = 6;
        const baseInt = 6;
        
        enemyData = {
          name: enemyName,
          level: questLevel,
          hp: Math.floor(baseHp * levelMultiplier * questMultiplier),
          stats: {
            strength: Math.floor(baseStr * levelMultiplier * questMultiplier),
            defense: Math.floor(baseDef * levelMultiplier * questMultiplier),
            intelligence: Math.floor(baseInt * levelMultiplier * questMultiplier),
            agility: Math.floor(baseAgi * levelMultiplier * questMultiplier)
          },
          skills: [] // Could add skills for higher level quests
        };
        
        // Add a skill for higher level quests (level 50+)
        if (questLevel >= 50) {
          enemyData.skills = ['power_strike']; // Basic combat skill
        }
        if (questLevel >= 80) {
          enemyData.skills.push('shield_bash'); // Add defensive skill
        }
        if (questLevel >= 100) {
          enemyData.skills.push('whirlwind'); // Add AoE skill
        }
      }

      const combatState = this.combatSystem.startCombatWithCustomEnemy(
        player,
        enemyData.name,
        enemyData.level,
        enemyData.hp,
        enemyData.stats,
        enemyData.skills,
        { defenseQuest: questType === 'defense' ? questId : null, worldQuest: questType !== 'defense' ? questId : null }
      );

      const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
      if (levelWarning) {
        embed.setDescription((embed.data.description || '') + levelWarning);
      }

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-combat-auto')
          .setLabel('⚔️ Auto Battle')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-combat-manual')
          .setLabel('🎮 Manual Combat')
          .setStyle(ButtonStyle.Success)
      );

      await this.updateInteractionWithTracking(interaction, { embeds: [embed], components: [row1] });
    }
  }

  /**
   * Start a defense quest battle
   */,

  async handleDefenseQuestComplete(interaction, player, questId) {
    const quest = getDefenseQuestById(questId);
    if (!quest) {
      await interaction.reply({ content: 'Quest not found.', ephemeral: true });
      return;
    }

    if (player.hasQuestFlag(quest.id)) {
      await interaction.reply({ content: 'You already completed this defense quest.', ephemeral: true });
      return;
    }

    // Show warning but allow starting quest below recommended level
    let levelWarning = '';
    if (player.level < quest.minLevel) {
      levelWarning = '⚠️ **Warning:** Recommended level is ' + quest.minLevel + ', you are level ' + player.level + '. This may be difficult!\n\n';
    }

    if (quest.unlocks && !player.hasQuestFlag(quest.unlocks)) {
      await interaction.reply({ content: 'Complete the previous defense quest first.', ephemeral: true });
      return;
    }

    // Handle choice-based quests
    if (quest.type === 'choice' && quest.branches && quest.branches.length > 0) {
      await this.handleQuestChoice(interaction, player, quest, levelWarning);
      return;
    }

    // Start combat with quest enemy
    const enemyData = quest.enemy;
    const combatState = this.combatSystem.startCombatWithCustomEnemy(
      player,
      enemyData.name,
      enemyData.level,
      enemyData.hp,
      enemyData.stats,
      enemyData.skills,
      { defenseQuest: quest.id }
    );

    const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
    
    // Add level warning if exists
    if (levelWarning) {
      embed.setDescription((embed.data.description || '') + '\n\n' + levelWarning);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-combat-auto')
        .setLabel('⚔️ Auto Battle')
        .setStyle(ButtonStyle.Primary)
    );

    // Use updateInteractionWithTracking instead of reply to keep the menu open
    await this.updateInteractionWithTracking(interaction, { 
      embeds: [embed], 
      components: [row] 
    });
  }

  /**
   * Handle quest choice presentation
   */,

  async handleQuestChoice(interaction, player, quest, levelWarning = '') {
    // Check if this is a quest chain branch quest (has nextQuestId) vs outcome-based quest
    const { main, side } = getQuestCategoriesByWorld(player.currentWorld);
    const allQuests = [...(main || []), ...(side || [])];
    const hasLinearStepChain = allQuests.some(q => q.id === `${quest.id}_step1`);
    const isChainBranch = quest.branches?.some(branch => branch.nextQuestId) && !hasLinearStepChain;
    
    if (isChainBranch) {
      // Quest chain branch selection - each branch leads to a different quest
      const { daily } = getQuestCategoriesByWorld(player.currentWorld);
      
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`📜 ${quest.name}`)
        .setDescription(levelWarning + quest.description + '\n\n**Choose your path:**')
        .setFooter({ text: 'Your choice will have consequences and lead to a different ending!' });

      // Create buttons for each branch
      const buttons = quest.branches.slice(0, 5).map((branch, idx) => 
        new ButtonBuilder()
          .setCustomId(`rpg-quest-chain-choice-${quest.id}-${idx}`)
          .setLabel(branch.choice)
          .setStyle(ButtonStyle.Primary)
      );

      // Add branch descriptions with next quest info
      for (let i = 0; i < quest.branches.length; i++) {
        const branch = quest.branches[i];
        const nextQuest = allQuests.find(q => q.id === branch.nextQuestId);
        const nextQuestInfo = nextQuest ? `\n→ Continues as: **${nextQuest.name}** (Lvl ${nextQuest.minLevel})` : '';
        
        embed.addFields({
          name: `Path ${i + 1}: ${branch.choice}`,
          value: nextQuestInfo || 'Next quest: Unknown',
          inline: false,
        });
      }

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
      }

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: rows,
      });
    } else {
      // Original outcome-based quest choice system
      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle(`📜 ${quest.name}`)
        .setDescription(levelWarning + quest.description + '\n\n**Choose your path:**')
        .setFooter({ text: 'Your choice will have consequences!' });

      // Create buttons for each branch
      const buttons = quest.branches.slice(0, 5).map(branch => 
        new ButtonBuilder()
          .setCustomId(`rpg-quest-choice-${quest.id}-${branch.id}`)
          .setLabel(branch.title)
          .setStyle(ButtonStyle.Primary)
      );

      // Add branch descriptions as fields
      quest.branches.forEach(branch => {
        embed.addFields({
          name: branch.title,
          value: branch.description,
          inline: false,
        });
      });

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
      }

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: rows,
      });
    }
  }

  /**
   * Handle quest chain branch selection - starts the next quest in the chain
   */,

  async handleQuestChainBranchSelection(interaction, player, questId, branchIdx) {
    const { main, side, daily } = getQuestCategoriesByWorld(player.currentWorld);
    const weekly = getWeeklyQuests(player) || [];
    const allDefense = loadDefenseQuests();
    
    let quest = null;
    let questType = null;
    
    // Search for quest in all categories
    for (const q of [...(main || []), ...(side || []), ...(daily || []), ...weekly, ...allDefense]) {
      if (q.id === questId) {
        quest = q;
        questType = quest.type || (allDefense.includes(q) ? 'defense' : 'side');
        break;
      }
    }

    if (!quest || !quest.branches || !quest.branches[branchIdx]) {
      await interaction.reply({ content: '❌ Quest or branch not found.', ephemeral: true });
      return;
    }

    const branch = quest.branches[branchIdx];
    const nextQuestId = branch.nextQuestId;

    if (!nextQuestId) {
      await interaction.reply({ content: '❌ This branch has no next quest configured.', ephemeral: true });
      return;
    }

    // Mark the current quest as completed and the choice as made
    player.setQuestFlag(questId, true);
    
    // Store which branch was chosen for reference
    if (!player.questFlags) player.questFlags = {};
    const existingFlag = player.questFlags[questId];
    if (!existingFlag || typeof existingFlag !== 'object') {
      player.questFlags[questId] = { completed: !!existingFlag };
    }
    player.questFlags[questId].chosenBranch = branchIdx;
    player.questFlags[questId].chosenBranchQuestId = nextQuestId;

    // Start the next quest
    await this.handleStartQuestFromDetail(interaction, player, nextQuestId);
  }

  /**
   * Handle quest choice selection
   */,

  async handleQuestChoiceSelection(interaction, player, questId, branchId) {
    const quest = getDefenseQuestById(questId);
    if (!quest) {
      await interaction.reply({ content: 'Quest not found.', ephemeral: true });
      return;
    }

    const outcome = quest.outcomes?.find(o => o.branchId === branchId);
    if (!outcome) {
      await interaction.reply({ content: 'Invalid choice.', ephemeral: true });
      return;
    }

    // Apply the outcome
    await this.applyQuestOutcome(player, quest, outcome);

    // Create result embed
    const embed = new EmbedBuilder()
      .setColor(outcome.isNegative ? 0xff0000 : 0x00ff00)
      .setTitle(`${outcome.isNegative ? '⚠️' : '✅'} ${outcome.title}`)
      .setDescription(outcome.description);

    // Show rewards/losses
    const rewardText = [];
    if (outcome.reward.xp !== 0) {
      rewardText.push(`**XP:** ${outcome.reward.xp > 0 ? '+' : ''}${outcome.reward.xp}`);
    }
    if (outcome.reward.gold !== 0) {
      rewardText.push(`**Gold:** ${outcome.reward.gold > 0 ? '+' : ''}${outcome.reward.gold}`);
    }
    if (outcome.reward.items?.length > 0) {
      rewardText.push(`**Items:** ${outcome.reward.items.map(i => `${i.id} x${i.quantity || 1}`).join(', ')}`);
    }

    if (rewardText.length > 0) {
      embed.addFields({
        name: outcome.isNegative ? 'Consequences' : 'Rewards',
        value: rewardText.join('\\n'),
        inline: false,
      });
    }

    // Show special effects
    if (outcome.consequences) {
      const consequenceText = [];
      if (outcome.consequences.healthLoss) {
        consequenceText.push(`❤️ Lost ${outcome.consequences.healthLoss}% health`);
      }
      if (outcome.consequences.debuff) {
        consequenceText.push(`🔻 Debuff: ${outcome.consequences.debuff.name}`);
      }
      if (outcome.consequences.permanentDebuff) {
        consequenceText.push(`⚠️ Permanent: ${outcome.consequences.permanentDebuff.name}`);
      }
      if (outcome.consequences.vendorPriceIncrease) {
        consequenceText.push(`💰 Vendors charge ${outcome.consequences.vendorPriceIncrease}% more`);
      }
      if (outcome.consequences.goldLossPerDay) {
        consequenceText.push(`💸 Lose ${outcome.consequences.goldLossPerDay} gold per day`);
      }

      if (consequenceText.length > 0) {
        embed.addFields({
          name: '⚠️ Additional Effects',
          value: consequenceText.join('\\n'),
          inline: false,
        });
      }
    }

    if (outcome.bonuses) {
      const bonusText = [];
      if (outcome.bonuses.nextCombatBonus) {
        const bonuses = Object.entries(outcome.bonuses.nextCombatBonus)
          .map(([stat, val]) => `+${val} ${stat.toUpperCase()}`)
          .join(', ');
        bonusText.push(`⚔️ Next Combat: ${bonuses}`);
      }
      if (outcome.bonuses.permanentBuff) {
        bonusText.push(`✨ Permanent: ${outcome.bonuses.permanentBuff.name}`);
      }
      if (outcome.bonuses.skillUnlock) {
        bonusText.push(`🎯 Skill Unlocked: ${outcome.bonuses.skillUnlock}`);
      }

      if (bonusText.length > 0) {
        embed.addFields({
          name: '✨ Bonuses',
          value: bonusText.join('\\n'),
          inline: false,
        });
      }
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-quests')
        .setLabel('← Back to Quests')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backButton],
    });
  }

  /**
   * Apply quest outcome effects to player
   */,

  async applyQuestOutcome(player, quest, outcome) {
    // Mark quest as complete
    player.setQuestFlag(quest.id, true);

    // Set outcome flags
    if (outcome.flagsSet) {
      outcome.flagsSet.forEach(flag => player.setQuestFlag(flag, true));
    }

    // Apply rewards
    if (outcome.reward.xp) {
      player.addXp(Math.max(0, outcome.reward.xp));
    }
    if (outcome.reward.gold) {
      player.gold = Math.max(0, player.gold + outcome.reward.gold);
    }
    if (outcome.reward.items) {
      outcome.reward.items.forEach(item => {
        const quantity = item.quantity || 1;
        for (let i = 0; i < quantity; i++) {
          player.inventory.push({
            id: item.id,
            name: item.id,
            type: item.type || 'item',
            quantity: 1,
          });
        }
      });
    }

    // Apply consequences
    if (outcome.consequences) {
      if (outcome.consequences.healthLoss) {
        const lossPercent = outcome.consequences.healthLoss / 100;
        player.hp = Math.max(1, Math.floor(player.hp * (1 - lossPercent)));
      }

      if (outcome.consequences.debuff) {
        if (!player.activeDebuffs) player.activeDebuffs = [];
        player.activeDebuffs.push(outcome.consequences.debuff);
      }

      if (outcome.consequences.permanentDebuff) {
        if (!player.permanentEffects) player.permanentEffects = [];
        player.permanentEffects.push(outcome.consequences.permanentDebuff);
      }

      if (outcome.consequences.vendorPriceIncrease) {
        if (!player.questEffects) player.questEffects = {};
        player.questEffects.vendorPriceIncrease = outcome.consequences.vendorPriceIncrease;
        player.questEffects.vendorPriceIncreaseCount = 3;
      }

      if (outcome.consequences.goldLossPerDay) {
        if (!player.questEffects) player.questEffects = {};
        player.questEffects.goldLossPerDay = outcome.consequences.goldLossPerDay;
      }
    }

    // Apply bonuses
    if (outcome.bonuses) {
      if (outcome.bonuses.nextCombatBonus) {
        if (!player.questEffects) player.questEffects = {};
        player.questEffects.nextCombatBonus = outcome.bonuses.nextCombatBonus;
      }

      if (outcome.bonuses.permanentBuff) {
        if (!player.permanentEffects) player.permanentEffects = [];
        player.permanentEffects.push(outcome.bonuses.permanentBuff);
      }

      if (outcome.bonuses.skillUnlock) {
        if (!player.skills.includes(outcome.bonuses.skillUnlock)) {
          player.skills.push(outcome.bonuses.skillUnlock);
        }
      }
    }

    player.clearStatsCache();
    this.persistPlayer(player);
  }

  /**
   * Start a boss combat encounter
   */,

  async handleDailyQuests(interaction, player) {
    try {
      const questData = this.dailyQuestTracker.getPlayerQuests(player.id);
      const dailyCount = questData.daily.filter(q => !q.completed).length;
      const weeklyCount = questData.weekly.filter(q => !q.completed).length;
      const totalRewards = questData.totalClaimedRewards || 0;

      const embed = new EmbedBuilder()
        .setColor(0x00aaff)
        .setTitle('📋 **Daily Quest Tracker**')
        .setDescription(`Active Daily: ${dailyCount} | Active Weekly: ${weeklyCount}\nTotal Claimed Rewards: ${totalRewards}`)
        .addFields(
          { name: '📅 Daily Quests', value: questData.daily.map(q => `${q.completed ? '✅' : '⏳'} ${q.name} - ${q.progress}/${q.goal}`).join('\n') || 'No daily quests', inline: false },
          { name: '📆 Weekly Quests', value: questData.weekly.map(q => `${q.completed ? '✅' : '⏳'} ${q.name} - ${q.progress}/${q.goal}`).join('\n') || 'No weekly quests', inline: false },
          { name: '⏰ Time to Reset', value: this.dailyQuestTracker.getTimeToReset(), inline: true }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rpg-daily-claim-all').setLabel('Claim All Rewards').setStyle(ButtonStyle.Success)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleDailyQuests:', error);
      await interaction.reply({ content: 'Failed to load daily quests.', ephemeral: true });
    }
  },

  async handleDailyRewards(interaction, player) {
    this.trackMenuNavigation(player, 'daily-rewards');
    const now = Date.now();
    const state = this.getDailyRewardState(player, now);

    const nextClaimText = state.canClaim
      ? 'Available now'
      : `Next claim in ${this.formatTimeUntil(state.nextClaimAt, now)}`;

    const streakText = state.streak > 0 ? `${state.streak} day(s)` : 'No active streak';
    const missedText = state.missedDays > 0
      ? `${state.missedDays} day(s)`
      : 'None';
    const previewStartDay = Math.max(1, state.streak + 1);
    const previewLines = [];
    for (let i = 0; i < 5; i += 1) {
      const day = previewStartDay + i;
      const tiers = this.getDailyLootboxTiersForDay(day);
      const tierNames = tiers.map(t => `${t.charAt(0).toUpperCase()}${t.slice(1)}`).join(', ');
      previewLines.push(`Day ${day}: ${tierNames}`);
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🎁 Daily Rewards')
      .setDescription(
        `**Streak:** ${streakText}\n` +
        `**Next Claim:** ${nextClaimText}\n` +
        `**Missed Days:** ${missedText}`
      )
      .addFields(
        { name: 'Lootboxes', value: 'Lootboxes are added to your inventory. Common daily, with bonus tiers at 3/7/14/30 day streaks.', inline: false },
        { name: 'Next 5 Rewards', value: previewLines.join('\n'), inline: false },
        { name: 'Missed Days', value: 'You can restore up to 3 missed days for a coin fee. 4+ missed days resets the streak.', inline: false }
      );

    if (state.missedDays > 0 && !state.streakExpired) {
      embed.addFields({
        name: 'Restore Cost',
        value: `${state.restoreCost.toLocaleString()}g to restore and claim missed rewards`,
        inline: false,
      });
    }

    if (state.streakExpired) {
      embed.addFields({
        name: 'Streak Lost',
        value: 'You missed 4+ days. Claiming today starts a new streak.',
        inline: false,
      });
    }

    const buttons = [];
    const row = new ActionRowBuilder();
    if (state.canClaim) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-daily-claim')
          .setLabel('Claim Daily Rewards')
          .setStyle(ButtonStyle.Success)
      );
    }

    if (state.canClaim && state.missedDays > 0 && !state.streakExpired) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-daily-restore')
          .setLabel(`Restore Streak (${state.restoreCost}g)`)
          .setStyle(ButtonStyle.Primary)
      );
    }

    if (row.components.length > 0) {
      buttons.push(row);
    }

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );
    buttons.push(backRow);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  },

  async handleDailyRewardClaim(interaction, player, options = {}) {
    const now = Date.now();
    const state = this.getDailyRewardState(player, now);

    if (!state.canClaim) {
      await interaction.reply({
        content: `⏳ Daily rewards are not ready yet. Next claim in ${this.formatTimeUntil(state.nextClaimAt, now)}.`,
        ephemeral: true,
      });
      return;
    }

    if (state.missedDays > 0 && state.streakExpired) {
      // Streak lost, only allow reset claim
      options.restore = false;
    }

    if (options.restore && state.missedDays > 0) {
      if ((player.gold || 0) < state.restoreCost) {
        await interaction.reply({
          content: `❌ Not enough gold to restore the streak. Need ${state.restoreCost}g.`,
          ephemeral: true,
        });
        return;
      }
      player.gold -= state.restoreCost;
      this.trackGoldSpent(player, state.restoreCost, 'other');
    } else if (state.missedDays > 0) {
      // Reset streak if not restoring
      player.dailyRewardStreak = 0;
    }

    const daysToGrant = options.restore && state.missedDays > 0
      ? state.missedDays + 1
      : 1;

    let streak = Number(player.dailyRewardStreak || 0);
    const rewardLines = [];

    for (let i = 0; i < daysToGrant; i += 1) {
      streak += 1;
      const reward = this.grantDailyRewardsForDay(player, streak);
      rewardLines.push(`**Day ${streak}:**\n${reward.lines.join('\n')}`);
    }

    player.dailyRewardStreak = streak;
    player.dailyRewardLastClaimAt = now;
    player.dailyRewardTotalClaims = (player.dailyRewardTotalClaims || 0) + daysToGrant;
    this.persistPlayer(player);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Daily Rewards Claimed')
      .setDescription(rewardLines.join('\n\n'))
      .addFields({
        name: 'Open Lootboxes',
        value: 'Go to 🎒 Inventory and choose "Open Lootbox" to reveal the rewards.',
        inline: false,
      })
      .setFooter({ text: `Current Streak: ${player.dailyRewardStreak} day(s)` });

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backRow],
    });
  },

  async handleOpenLootboxMenu(interaction, player) {
    this.trackMenuNavigation(player, 'lootbox-menu');
    const lootboxes = this.getLootboxInventoryItems(player);

    if (!lootboxes.length) {
      await interaction.reply({ content: 'You do not have any lootboxes to open.', ephemeral: true });
      return;
    }

    const grouped = new Map();
    for (const lootbox of lootboxes) {
      const id = lootbox.id;
      const current = grouped.get(id) || {
        id,
        name: lootbox.name || this.getLootboxDisplayName(this.getLootboxTierFromId(id)),
        rarity: lootbox.rarity || this.getLootboxTierFromId(id),
        quantity: 0,
      };
      current.quantity += lootbox.quantity || 1;
      grouped.set(id, current);
    }

    const options = Array.from(grouped.values()).slice(0, 25).map(box => ({
      label: `${box.name} (x${box.quantity})`.substring(0, 100),
      value: box.id,
      description: `Rarity: ${box.rarity}`.substring(0, 100),
      emoji: '🎁',
    }));

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-open-lootbox-select')
        .setPlaceholder('Select a lootbox to open')
        .addOptions(options)
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-inventory')
        .setLabel('← Back to Inventory')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🎁 Open Lootbox')
      .setDescription('Pick a lootbox to open. You can open multiple at once.');

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  },

  async handleOpenLootboxQuantityMenu(interaction, player, lootboxId) {
    this.trackMenuNavigation(player, 'lootbox-quantity');
    const lootboxes = this.getLootboxInventoryItems(player);
    const selected = lootboxes.find(box => box.id === lootboxId);

    if (!selected) {
      await interaction.reply({ content: 'Lootbox not found in inventory.', ephemeral: true });
      return;
    }

    const available = selected.quantity || 1;
    const tier = this.getLootboxTierFromId(lootboxId);
    const displayName = selected.name || this.getLootboxDisplayName(tier);

    const quantities = [1, 5, 10, 25, 50, 100].filter(qty => qty <= available);
    if (available > 1 && !quantities.includes(available)) quantities.push(available);
    quantities.sort((a, b) => a - b);

    const buttons = quantities.map(qty =>
      new ButtonBuilder()
        .setCustomId(`rpg-open-lootbox-qty-${lootboxId}-${qty}`)
        .setLabel(`Open ${qty}x`)
        .setStyle(qty === 1 ? ButtonStyle.Primary : ButtonStyle.Success)
    );

    buttons.push(
      new ButtonBuilder()
        .setCustomId('rpg-open-lootbox')
        .setLabel('← Change Lootbox')
        .setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`🎁 ${displayName}`)
      .setDescription(`You have **${available}** available. Choose how many to open.`);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  },

  async handleOpenLootbox(interaction, player, lootboxId, quantity = 1) {
    this.trackMenuNavigation(player, 'lootbox-open');
    const tier = this.getLootboxTierFromId(lootboxId);
    const displayName = this.getLootboxDisplayName(tier);
    const openCount = quantity === 'max' ? Number.MAX_SAFE_INTEGER : parseInt(quantity, 10) || 1;

    const available = this.getLootboxInventoryItems(player)
      .filter(box => box.id === lootboxId)
      .reduce((sum, box) => sum + (box.quantity || 1), 0);

    const finalCount = Math.min(openCount, available);
    if (finalCount <= 0) {
      await interaction.reply({ content: 'Lootbox not found in inventory.', ephemeral: true });
      return;
    }

    if (!this.removeLootboxFromInventory(player, lootboxId, finalCount)) {
      await interaction.reply({ content: 'Lootbox not found in inventory.', ephemeral: true });
      return;
    }

    const rollPool = this.getLootboxRollItems(tier);
    const pool = rollPool.length > 0 ? rollPool : [displayName];

    const buildRollWindow = (forceReward) => {
      const size = 7;
      const items = [];
      for (let i = 0; i < size; i += 1) {
        items.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      if (forceReward) {
        items[Math.floor(size / 2)] = pool[Math.floor(Math.random() * pool.length)];
      }
      return items;
    };

    const renderRoll = (items, highlightIndex) => {
      return items
        .map((name, idx) => (idx === highlightIndex ? `➡️ ${name}` : `  ${name}`))
        .join('\n');
    };

    const highlightIndex = 3;
    const frames = [
      buildRollWindow(false),
      buildRollWindow(false),
      buildRollWindow(true),
    ];

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }

    for (let i = 0; i < frames.length; i += 1) {
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`🎁 ${displayName}`)
        .setDescription(`Spinning x${finalCount}...\n\n${renderRoll(frames[i], highlightIndex)}`)
        .setFooter({ text: 'Rolling rewards...' });

      await interaction.editReply({ embeds: [embed], components: [] });
      await this.sleep(550);
    }

    const rewardSummary = new Map();
    for (let i = 0; i < finalCount; i += 1) {
      const reward = this.generateDailyLootboxReward(tier);
      if (!reward) continue;
      this.applyDailyLootboxReward(player, reward);
      const total = rewardSummary.get(reward.rewardId) || 0;
      rewardSummary.set(reward.rewardId, total + (reward.quantity || 1));
    }

    this.persistPlayer(player);

    const summaryLines = Array.from(rewardSummary.entries()).map(([rewardId, qty]) => {
      const name = this.getLootboxRewardDisplayName(rewardId);
      return qty > 1 ? `${name} x${qty}` : name;
    });

    const finalEmbed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`✅ ${displayName} Opened x${finalCount}`)
      .setDescription(summaryLines.length > 0 ? summaryLines.join('\n') : 'No rewards found.')
      .setFooter({ text: 'Loot delivered to your inventory.' });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-open-lootbox')
        .setLabel('Open Another')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-inventory')
        .setLabel('← Back to Inventory')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [finalEmbed], components: [buttons] });
  }

  /**
   * Handler for Damage Tracker feature
   */,
};
