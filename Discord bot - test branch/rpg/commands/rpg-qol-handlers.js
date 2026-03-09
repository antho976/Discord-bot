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
 * rpg-qol-handlers — extracted from RPGCommand.js
 * 30 methods, ~1516 lines
 */
export const QolHandlers = {
  async handleStoryLog(interaction, player) {
    this.trackMenuNavigation(player, 'story-log');

    const flagEntries = Object.entries(player.questFlags || {})
      .filter(([, value]) => typeof value === 'number')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const lines = flagEntries.map(([questId, timestamp], index) => {
      const quest = getQuestById(questId) || getDefenseQuestById(questId);
      const questName = quest?.name || quest?.title || questId;
      const dateLabel = new Date(timestamp).toLocaleDateString();
      return `${index + 1}. **${questName}** — ${dateLabel}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x1abc9c)
      .setTitle('📖 Story Log')
      .setDescription(lines.length > 0 ? lines.join('\n') : 'No story entries yet.');

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
   * Get guild rank info by XP
   */,

  async handleJumpMenu(interaction, player) {
    const recentActions = this.qolSystem.getRecentActions(player.userId, 5);
    
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-jump-last-combat')
        .setLabel('Last Combat')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚔️'),
      new ButtonBuilder()
        .setCustomId('rpg-jump-last-dungeon')
        .setLabel('Last Dungeon')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🗝️'),
      new ButtonBuilder()
        .setCustomId('rpg-jump-guild')
        .setLabel('Guild')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🏰')
    );

    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle('🚀 **Jump Menu**')
      .setDescription('Quick access to recent activities');

    if (recentActions.length > 0) {
      embed.addFields({
        name: 'Recent Actions',
        value: recentActions.map((a, i) => `${i + 1}. ${a.description}`).join('\n'),
        inline: false
      });
    }

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
      ephemeral: true
    });
  }

  /**
   * Show hotkey favorites menu
   */,

  async handleHotkeys(interaction, player) {
    const favorites = player.favorites || [];

    const embed = new EmbedBuilder()
      .setColor(0xff00ff)
      .setTitle('⭐ **Hotkey Favorites**')
      .setDescription(`You have ${favorites.length}/3 favorites set`);

    if (favorites.length > 0) {
      embed.addFields({
        name: 'Your Favorites',
        value: favorites.map((fav, i) => `${i + 1}. ${fav.name}`).join('\n'),
        inline: false
      });
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-hotkeys-combat')
        .setLabel('Set Combat')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-hotkeys-guild')
        .setLabel('Set Guild')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-hotkeys-inventory')
        .setLabel('Set Inventory')
        .setStyle(ButtonStyle.Primary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
      ephemeral: true
    });
  }

  /**
   * Show stats timeline (growth over time)
   */,

  async handleStatsTimeline(interaction, player) {
    const history = this.qolSystem.getStatsHistory(player.userId);
    const growth = this.qolSystem.getStatGrowth(player.userId, 4);

    if (!history || history.length < 2) {
      await interaction.reply({
        content: '📊 Not enough historical data yet. Keep playing to track your growth!',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('📈 **Stats Timeline**')
      .setDescription(`Your growth over the last ${growth.weeksTracked} weeks`);

    if (growth) {
      embed.addFields(
        { name: '💪 Strength', value: `+${growth.strengthGrowth}`, inline: true },
        { name: '🧠 Intelligence', value: `+${growth.intelligenceGrowth}`, inline: true },
        { name: '🎯 Agility', value: `+${growth.agilityGrowth}`, inline: true },
        { name: '❤️ Constitution', value: `+${growth.constitutionGrowth}`, inline: true },
        { name: '📊 Level Growth', value: `+${growth.levelGrowth} levels`, inline: true },
        { name: '⏱️ Time Period', value: `${growth.weeksTracked} weeks`, inline: true }
      );
    }

    const latestWeek = history[history.length - 1];
    embed.addFields({
      name: 'Current Stats',
      value: `L${latestWeek.level} | STR: ${latestWeek.strength} | INT: ${latestWeek.intelligence} | AGI: ${latestWeek.agility}`,
      inline: false
    });

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Show boss defeat tracker
   */,

  async handleBossTracker(interaction, player) {
    const bossesFelled = this.qolSystem.getBossDefeats(player.userId);

    if (bossesFelled.length === 0) {
      await interaction.reply({
        content: '👹 No bosses defeated yet. Go challenge yourself!',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('👹 **Boss Defeat Tracker**')
      .setDescription(`You've defeated ${bossesFelled.length} unique boss(es)`);

    bossesFelled.slice(0, 10).forEach(boss => {
      const winRate = Math.round((boss.defeatedCount / boss.totalAttempts) * 100);
      const lastDefeated = new Date(boss.lastDefeated).toLocaleDateString();
      
      embed.addFields({
        name: `⚔️ ${boss.bossName}`,
        value: `Defeats: ${boss.defeatedCount} | Attempts: ${boss.totalAttempts} | Win Rate: ${winRate}% | Last: ${lastDefeated}`,
        inline: false
      });
    });

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Show achievement progress with percentages
   */,

  async handleEnvironmentTool(interaction, player) {
    const envList = Object.keys(ENVIRONMENTS);
    if (envList.length === 0) {
      await interaction.reply({
        content: '❌ No environments available.',
        ephemeral: true
      });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-env-advantage-select')
      .setPlaceholder('Choose environment to analyze...')
      .addOptions(
        envList.slice(0, 25).map(envId => {
          const env = ENVIRONMENTS[envId];
          return {
            label: env.name,
            value: envId,
            description: env.description?.substring(0, 100) || 'A battle arena',
            emoji: '🌍'
          };
        })
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const backButton = new ButtonBuilder()
      .setCustomId('rpg-qol-tab-utility')
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row2 = new ActionRowBuilder().addComponents(backButton);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('⚔️ **Environment Advantage Tool**')
      .setDescription('Learn which elements and strategies work best in each arena');

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row, row2],
      ephemeral: true
    });
  }

  /**
   * REMAINING FEATURES - Quick Spell Wheel, Breadcrumb, Visualizers, etc.
   */

  /**
   * Quick Spell Wheel - Button grid for faster skill access
   */,

  async handleQuickSpellWheel(interaction, player) {
    const playerClass = player.class || player.internalClass;
    
    // Auto-populate starting skills if player has class but no skills
    if (playerClass && (!player.skills || player.skills.length === 0)) {
      const classData = getClass(playerClass);
      if (classData && classData.startingSkills) {
        player.skills = [...classData.startingSkills];
        this.persistPlayer(player);
      }
    }
    
    const skills = player.skills || [];

    if (skills.length === 0) {
      await interaction.reply({
        content: '⚠️ No skills unlocked yet. Level up and unlock skills to use the spell wheel!',
        ephemeral: true
      });
      return;
    }

    // Create button grid (max 5 per row)
    const rows = [];
    for (let i = 0; i < skills.length; i += 4) {
      const row = new ActionRowBuilder();
      const slicedSkills = skills.slice(i, i + 4);
      
      slicedSkills.forEach(skillId => {
        const skill = getSkill(skillId);
        if (skill) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`rpg-spell-${skillId}`)
              .setLabel(skill.name?.substring(0, 20))
              .setStyle(ButtonStyle.Primary)
              .setEmoji('⚡')
          );
        }
      });
      
      if (row.components.length > 0) {
        rows.push(row);
      }
    }

    // Add back button as last row
    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0x9900ff)
      .setTitle('⚡ **Quick Spell Wheel**')
      .setDescription('Rapid access to your most useful spells')
      .addFields({
        name: '🎯 Click any spell below to use it in combat',
        value: `${skills.length} spells available`,
        inline: false
      });

    // Combine skill rows and back button (max 5 rows total)
    const allRows = [...rows.slice(0, 4), backRow];

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: allRows,
      ephemeral: true
    });
  }

  /**
   * Handle spell wheel click - Execute spell in combat
   */,

  async handleSpellWheelClick(interaction, player, skillId) {
    const skill = getSkill(skillId);

    if (!skill) {
      await interaction.reply({
        content: '❌ Skill not found.',
        ephemeral: true
      });
      return;
    }

    // Check if player is in combat
    if (!this.combatSystem.isInCombat(player.userId)) {
      const embed = new EmbedBuilder()
        .setColor(0xff6600)
        .setTitle(`⚡ **${skill.name}**`)
        .setDescription('Not in combat - spell details only')
        .addFields({
          name: '📊 Spell Information',
          value: `
            **Damage:** ${skill.damage || 'Variable'}
            **Mana Cost:** ${skill.manaCost || 0}
            **Cooldown:** ${skill.cooldown || 0}s
            **Type:** ${skill.type || 'Physical'}
            **Description:** ${skill.description || 'A powerful spell'}
          `,
          inline: false
        });

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
      return;
    }

    // In combat - attempt to use spell
    const combatState = this.combatSystem.getCombatState(player.userId);
    
    if (!combatState) {
      await interaction.reply({
        content: '❌ Combat state lost.',
        ephemeral: true
      });
      return;
    }

    // Check if spell is ready (cooldown check would go here)
    const playerSpellData = player.spellData || {};
    const lastUse = playerSpellData[skillId] || 0;
    const cooldown = skill.cooldown || 0;
    const now = Date.now();

    if (now - lastUse < cooldown * 1000) {
      const timeLeft = Math.ceil((cooldown * 1000 - (now - lastUse)) / 1000);
      await interaction.reply({
        content: `⏳ **${skill.name}** is on cooldown for ${timeLeft}s`,
        ephemeral: true
      });
      return;
    }

    // Execute spell
    const damage = (skill.damage || 10) * (1 + player.intelligence / 100);
    const actualDamage = Math.max(1, Math.floor(damage - (combatState.enemy.defense || 0) * 0.5));

    // Record spell use
    playerSpellData[skillId] = now;
    player.spellData = playerSpellData;

    // Apply damage to enemy
    combatState.enemy.hp -= actualDamage;

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`⚡ **${skill.name}** Used!`)
      .setDescription(`Dealt **${actualDamage}** damage to ${combatState.enemy.name}`)
      .addFields({
        name: `Enemy HP`,
        value: `${Math.max(0, combatState.enemy.hp)} / ${combatState.enemy.maxHp || combatState.enemy.hp + actualDamage}`,
        inline: false
      });

    // Check if enemy is defeated
    if (combatState.enemy.hp <= 0) {
      embed.setColor(0xffff00);
      embed.setTitle('⚡ **Victory!**');
      embed.setDescription(`${skill.name} defeated ${combatState.enemy.name}!`);
      
      // Handle victory
      this.handleCombatVictory(player, combatState.enemy);
      this.combatSystem.endCombat(player.userId);
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

    this.persistPlayer(player);
  }

  /**
   * Combo Chain Visualizer - Show skill sequences visually  
   */,

  async handleEnvironmentPredictions(interaction, player) {
    const envList = Object.keys(ENVIRONMENTS);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-env-predict-select')
      .setPlaceholder('Choose environment to predict...')
      .addOptions(
        envList.slice(0, 25).map(envId => {
          const env = ENVIRONMENTS[envId];
          return {
            label: env.name,
            value: envId,
            description: 'Preview hazards and buffs',
            emoji: '🔮'
          };
        })
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const backButton = new ButtonBuilder()
      .setCustomId('rpg-qol-tab-utility')
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row2 = new ActionRowBuilder().addComponents(backButton);

    const embed = new EmbedBuilder()
      .setColor(0x6600ff)
      .setTitle('🔮 **Environmental Effect Predictions**')
      .setDescription('Predict hazards and buffs before entering each arena');

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row, row2],
      ephemeral: true
    });
  }

  /**
   * Profession Efficiency Tips - Optimal gathering/crafting strategies
   */,

  async handleQOLMenu(interaction, player) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-tab-stats')
        .setLabel('Stats')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-tab-combat')
        .setLabel('Combat')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚔️'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-tab-progress')
        .setLabel('Progress')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎯'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-tab-gear')
        .setLabel('Gear')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⚙️'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-tab-utility')
        .setLabel('Utility')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🧰')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-tab-guild')
        .setLabel('Guild')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏆'),
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-back-to-hub')
        .setLabel('🏠 Hub')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('💡 **Quality-of-Life Tools**')
      .setDescription('Choose a tab to access all QOL tools.')
      .addFields(
        { name: '📊 Stats', value: 'Damage, crits, breakdowns, sessions', inline: true },
        { name: '⚔️ Combat', value: 'Combat log, boss tools, combos, spell wheel', inline: true },
        { name: '🎯 Progress', value: 'Achievements, milestones, quests, mastery', inline: true },
        { name: '⚙️ Gear', value: 'Builds, compare, favorites, auto-sell, crafting', inline: true },
        { name: '🧰 Utility', value: 'Navigation, hotkeys, notifications, themes, timezones', inline: true },
        { name: '🏆 Guild', value: 'Leaderboards and growth', inline: true }
      );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2],
      ephemeral: false
    });
  }

  /**
   * QOL Stats Tab
   */,

  async handleQOLStatsMenu(interaction, player) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-stats-timeline')
        .setLabel('Stats Timeline')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📈'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-damage-calc')
        .setLabel('Damage Calc')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💥'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-crit-display')
        .setLabel('Crit Analysis')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎯'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-damage-breakdown')
        .setLabel('Damage Breakdown')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📊')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-damage-tracker')
        .setLabel('Damage Tracker')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚔️'),
      new ButtonBuilder()
        .setCustomId('rpg-session-stats')
        .setLabel('Session Stats')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊')
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0x00bfff)
      .setTitle('📊 **QOL Stats**')
      .setDescription('All combat and performance stats in one place.');

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2, row3],
      ephemeral: false
    });
  }

  /**
   * QOL Combat Tab
   */,

  async handleQOLCombatMenu(interaction, player) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-combat-log')
        .setLabel('Combat Log')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📖'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-boss-guide')
        .setLabel('Boss Guide')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👹'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-enemy-summary')
        .setLabel('Enemy Summary')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-combo-preview')
        .setLabel('Combos')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✨')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-spell-wheel')
        .setLabel('Spell Wheel')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⚡'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-combo-viz')
        .setLabel('Combo Visuals')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✨'),
      new ButtonBuilder()
        .setCustomId('rpg-boss-analyzer')
        .setLabel('Boss Analyzer')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👹')
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0xff5555)
      .setTitle('⚔️ **QOL Combat**')
      .setDescription('Combat planning, tracking, and execution tools.');

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2, row3],
      ephemeral: false
    });
  }

  /**
   * QOL Progress Tab
   */,

  async handleQOLProgressMenu(interaction, player) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-achievements')
        .setLabel('Achievements')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏆'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-milestones')
        .setLabel('Milestones')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎯'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-boss-tracker')
        .setLabel('Boss Tracker')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👹')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-skill-mastery')
        .setLabel('Skill Mastery')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⭐'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-class-guide')
        .setLabel('Class Guide')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📚'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-profession')
        .setLabel('Prof Tips')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💡'),
      new ButtonBuilder()
        .setCustomId('rpg-crafting-queue')
        .setLabel('Crafting')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚒️')
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle('🎯 **QOL Progress**')
      .setDescription('Progression, mastery, and long-term goals.');

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2, row3],
      ephemeral: false
    });
  }

  /**
   * QOL Gear Tab
   */,

  async handleQOLGearMenu(interaction, player) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-equipment-compare')
        .setLabel('Gear Compare')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⚙️'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-equipment-builds')
        .setLabel('Gear Builds')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💾'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-style-recommendation')
        .setLabel('Style Tips')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💡'),
      new ButtonBuilder()
        .setCustomId('rpg-favorite-items')
        .setLabel('Favorites')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💎')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-stat-comparison')
        .setLabel('Stat Comp')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📐'),
      new ButtonBuilder()
        .setCustomId('rpg-loot-analytics')
        .setLabel('Loot Analytics')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎁'),
      new ButtonBuilder()
        .setCustomId('rpg-auto-sell')
        .setLabel('Auto-Sell')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🤖')
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle('⚙️ **QOL Gear**')
      .setDescription('Build, compare, craft, and optimize your loadout.');

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2, row3],
      ephemeral: false
    });
  }

  /**
   * QOL Utility Tab
   */,

  async handleQOLUtilityMenu(interaction, player) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-notifications')
        .setLabel('Notifications')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔔')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-enemy-encyclopedia')
        .setLabel('Encyclopedia')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📚'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-env-tool')
        .setLabel('Env Tool')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🌍'),
      new ButtonBuilder()
        .setCustomId('rpg-qol-env-predict')
        .setLabel('Env Predict')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔮'),
      new ButtonBuilder()
        .setCustomId('rpg-timezone')
        .setLabel('Timezone')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🕒')
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-ui-theme')
        .setLabel('UI Theme')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎨')
    );

    const row4 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0x6aa0ff)
      .setTitle('🧰 **QOL Utility**')
      .setDescription('Navigation, notifications, and UI preferences.');

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2, row3, row4],
      ephemeral: false
    });
  }

  /**
   * QOL Guild Tab
   */,

  async handleQOLGuildMenu(interaction, player) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-leaderboard')
        .setLabel('Guild Leaderboard')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏆'),
      new ButtonBuilder()
        .setCustomId('rpg-guild-growth')
        .setLabel('Guild Growth')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📊')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🏆 **QOL Guild**')
      .setDescription('Guild analytics and ranking tools.');

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2],
      ephemeral: false
    });
  }

  /**
   * Handler for Daily Quest Tracker feature
   */,

  async handleDamageTracker(interaction, player) {
    try {
      // Use progress stats data
      const stats = player.progressStats || {};
      const monstersDefeated = stats.monstersDefeated || 0;
      const criticalHits = stats.criticalHits || 0;
      const dungeonsCleared = stats.dungeonsCleared || 0;
      const raidsCleared = stats.raidsCleared || 0;

      // Estimate total damage based on monsters defeated and player stats
      const playerStats = player.getStats();
      const strength = playerStats.strength || 0;
      const agility = playerStats.agility || 0;
      const level = player.level || 1;
      
      // Calculate average damage per fight using strength, agility, and level
      const avgDamagePerFight = Math.round(strength * 8 + agility * 3 + level * 5);
      const estimatedDamage = monstersDefeated * avgDamagePerFight;

      const embed = new EmbedBuilder()
        .setColor(0xff5555)
        .setTitle('⚔️ **Damage Tracker**')
        .setDescription(`Estimated Total Damage: ${estimatedDamage.toLocaleString()}`)
        .addFields(
          { name: '💀 Monsters Defeated', value: `${monstersDefeated.toLocaleString()}`, inline: true },
          { name: '💥 Critical Hits', value: `${criticalHits.toLocaleString()}`, inline: true },
          { name: '📊 Crit Rate', value: `${monstersDefeated > 0 ? Math.round((criticalHits / monstersDefeated) * 100) : 0}%`, inline: true },
          { name: '🏰 Dungeons Cleared', value: `${dungeonsCleared}`, inline: true },
          { name: '🐉 Raids Cleared', value: `${raidsCleared}`, inline: true },
          { name: '⚔️ Avg Damage/Kill', value: `~${avgDamagePerFight.toLocaleString()}`, inline: true }
        )
        .setTimestamp();

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleDamageTracker:', error);
      await interaction.reply({ content: 'Failed to load damage statistics.', ephemeral: true });
    }
  }

  /**
   * Handler for Boss Weakness Analyzer feature
   */,

  async handleBossAnalyzer(interaction, player) {
    try {
      const bosses = this.bossWeaknessAnalyzer.getAllBossStats(player.userId);
      const recommendations = this.bossWeaknessAnalyzer.getRecommendations(player.userId);

      const fields = [];
      
      // Check if there's any boss data
      if (!bosses || Object.keys(bosses).length === 0) {
        await interaction.reply({
          content: '👹 No boss encounter data yet. Defeat some bosses to see their analysis!',
          ephemeral: true
        });
        return;
      }
      
      for (const bossName in bosses) {
        const boss = bosses[bossName];
        const weakness = this.bossWeaknessAnalyzer.getElementalWeakness(bossName, player.userId);
        fields.push({
          name: `${bossName} (Win Rate: ${boss.winRate}%)`,
          value: `Difficulty: ${boss.difficulty} | Best Strategy: ${weakness || 'Mixed'}`,
          inline: false
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xcc00cc)
        .setTitle('👹 **Boss Weakness Analyzer**')
        .setDescription('Analyze your boss encounter history and get recommendations')
        .addFields(...fields)
        .addFields({ name: '💡 Recommendations', value: recommendations || 'Keep exploring!', inline: false })
        .setTimestamp();

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleBossAnalyzer:', error);
      await interaction.reply({ content: '👹 No boss data available yet. Defeat bosses to unlock analysis!', ephemeral: true });
    }
  }

  /**
   * Handler for Loot Analytics feature
   */,

  async handleLootAnalytics(interaction, player) {
    try {
      const rarityDist = this.lootAnalytics.getRarityDistribution(player.userId) || { total: 0, distribution: [] };
      const efficiency = this.lootAnalytics.getFarmingEfficiency(player.userId) || [];
      const recentDrops = this.lootAnalytics.getRecentDrops(player.userId, 5) || [];

      const dropList = rarityDist.distribution.slice(0, 5).map(d => `${d.rarity}: ${d.count} (${d.percentage}%)`).join('\n');
      const efficiencyList = efficiency.slice(0, 3).map(e => `${e.enemyName}: ${e.profitability}`).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle('🎁 **Loot Analytics**')
        .setDescription('Track your drops and farming efficiency')
        .addFields(
          { name: '📊 Drop Distribution', value: dropList || 'No drops yet', inline: true },
          { name: '⚡ Best Farms', value: efficiencyList || 'No data yet', inline: true },
          { name: '🔄 Recent Drops', value: recentDrops.map(d => `${d.itemName} (${d.timeAgo})`).join('\n') || 'None', inline: false }
        )
        .setFooter({ text: `Total Drops: ${rarityDist.total}` })
        .setTimestamp();

      const backButton = new ButtonBuilder()
        .setCustomId('rpg-qol-tab-gear')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row = new ActionRowBuilder().addComponents(backButton);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleLootAnalytics:', error);
      await interaction.reply({ content: 'Failed to load loot analytics.', ephemeral: true });
    }
  }

  /**
   * Handler for Skill Mastery feature
   */,

  async handleSkillMastery(interaction, player) {
    try {
      const skills = this.skillMastery.getPlayerSkills(player.id);
      const masteries = this.skillMastery.getAchievedMasteries(player.id);

      const skillList = Object.entries(skills).slice(0, 8).map(([skill, data]) => 
        `${skill}: Lvl ${data.level} ${data.level >= 10 ? '⭐' : ''}`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle('⭐ **Skill Mastery System**')
        .setDescription(`Masteries Achieved: ${masteries.length}`)
        .addFields(
          { name: '🎯 Your Skills', value: skillList || 'No skills learned yet', inline: false },
          { name: '🏆 Achieved Masteries', value: masteries.join(', ') || 'Keep leveling!', inline: false }
        )
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rpg-skills-details').setLabel('Skill Details').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rpg-skills-variants').setLabel('Variants').setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [buttons],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleSkillMastery:', error);
      await interaction.reply({ content: 'Failed to load skill mastery data.', ephemeral: true });
    }
  }

  /**
   * Handler for Favorite Item Loadout feature
   */,

  async handleFavoriteItems(interaction, player) {
    try {
      const favoritesData = this.favoriteItemLoadout.getFavorites(player.userId);
      const favorites = favoritesData.items || [];

      // For suggested, we'd need inventory items - for now show placeholder
      const suggested = [];

      const favList = favorites.map((fav, i) => `${i + 1}. ${fav.itemName} (${fav.itemSlot})`).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xff00ff)
        .setTitle('⭐ **Favorite Items**')
        .setDescription(`${favoritesData.total}/${favoritesData.maxSlots} Favorites Saved`)
        .addFields(
          { name: '💎 Your Favorites', value: favList || 'No favorites set', inline: false },
          { name: '💡 Info', value: 'Mark items as favorites for quick access!', inline: false }
        )
        .setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rpg-fav-add').setLabel('Add Favorite').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('rpg-fav-equip').setLabel('Quick Equip').setStyle(ButtonStyle.Success).setDisabled(true)
      );

      const backButton = new ButtonBuilder()
        .setCustomId('rpg-qol-tab-gear')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row2 = new ActionRowBuilder().addComponents(backButton);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleFavoriteItems:', error);
      await interaction.reply({ content: 'Failed to load favorite items.', ephemeral: true });
    }
  }

  /**
   * Handler for Notification System feature
   */,

  async handleNotifications(interaction, player) {
    try {
      const unreadData = this.notificationSystem.getUnreadNotifications(player.userId);
      const preferences = this.notificationSystem.getPreferences(player.userId);
      const history = this.notificationSystem.getAllNotifications(player.userId, 10);

      const notifList = unreadData.notifications.slice(0, 5).map(n => `${n.icon} ${n.type}: ${n.description}`).join('\n');
      const enabledPrefs = Object.entries(preferences).filter(([k, v]) => v && k !== 'playerId').map(([k]) => k).join(', ');

      const embed = new EmbedBuilder()
        .setColor(0x0088ff)
        .setTitle('🔔 **Notifications**')
        .setDescription(`${unreadData.count} Unread Notifications`)
        .addFields(
          { name: '📬 Recent', value: notifList || 'All caught up!', inline: false },
          { name: '⚙️ Enabled Types', value: enabledPrefs || 'All enabled', inline: false }
        )
        .setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rpg-notif-clear').setLabel('Clear All').setStyle(ButtonStyle.Danger).setDisabled(true),
        new ButtonBuilder().setCustomId('rpg-notif-prefs').setLabel('Preferences').setStyle(ButtonStyle.Secondary).setDisabled(true)
      );

      const backButton = new ButtonBuilder()
        .setCustomId('rpg-qol-tab-utility')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row2 = new ActionRowBuilder().addComponents(backButton);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleNotifications:', error);
      await interaction.reply({ content: 'Failed to load notifications.', ephemeral: true });
    }
  }

  /**
   * Handler for Enemy Encyclopedia feature
   */,

  async handleEnemyEncyclopedia(interaction, player) {
    try {
      const encyclopedia = this.enemyEncyclopedia.getEncyclopedia(player.userId);
      const trophies = this.enemyEncyclopedia.getTrophies(player.userId);
      
      const topEnemies = Object.values(encyclopedia.enemies || {}).sort((a, b) => b.encounters - a.encounters).slice(0, 5);
      const enemyList = topEnemies.map(data => `${data.enemyName}: ${data.defeatRate || 0}% WR (${data.encounters} encounters)`).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xaa0000)
        .setTitle('📚 **Enemy Encyclopedia**')
        .setDescription(`${encyclopedia.uniqueEnemies} Enemies Encountered`)
        .addFields(
          { name: '⚔️ Most Encountered', value: enemyList || 'No enemies yet', inline: false },
          { name: '🏆 Trophies', value: `${trophies.length} Trophy Sets Completed`, inline: true }
        )
        .setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rpg-enc-view').setLabel('View All').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('rpg-enc-trophies').setLabel('Trophies').setStyle(ButtonStyle.Secondary).setDisabled(true)
      );

      const backButton = new ButtonBuilder()
        .setCustomId('rpg-qol-tab-utility')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row2 = new ActionRowBuilder().addComponents(backButton);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleEnemyEncyclopedia:', error);
      await interaction.reply({ content: 'Failed to load enemy encyclopedia.', ephemeral: true });
    }
  }

  /**
   * Handler for Command Hotkeys feature
   */,

  async handleCommandHotkeys(interaction, player) {
    try {
      const hotkeys = this.shorthandCommandTips.getPlayerHotkeys(player.id);
      const defaultHotkeys = this.shorthandCommandTips.getDefaultHotkeys();
      const favorites = this.shorthandCommandTips.getFavorites(player.id);

      const customHotkeys = Object.entries(hotkeys.custom || {}).slice(0, 5).map(([key, cmd]) => `\`${key}\` → ${cmd}`).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x00ddff)
        .setTitle('⌨️ **Command Hotkeys**')
        .setDescription('Quick access to common commands')
        .addFields(
          { name: '⭐ Favorites', value: (favorites || []).slice(0, 5).join(', ') || 'None', inline: false },
          { name: '🔧 Custom Bindings', value: customHotkeys || 'None set', inline: false }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rpg-hotkey-add').setLabel('Add Hotkey').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rpg-hotkey-view').setLabel('View All').setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleCommandHotkeys:', error);
      await interaction.reply({ content: 'Failed to load command hotkeys.', ephemeral: true });
    }
  }

  /**
   * Handler for Crafting Queue feature
   */,

  async handleCraftingQueue(interaction, player) {
    try {
      const queue = this.craftingQueue.getPlayerQueue(player.id);
      const stats = this.craftingQueue.getQueueStats(player.id);

      const queueList = queue.slice(0, 5).map((item, i) => `${i + 1}. ${item.name} - ${item.estimatedTime}s`).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xffcc00)
        .setTitle('⚒️ **Crafting Queue**')
        .setDescription(`${queue.length}/20 Items Queued`)
        .addFields(
          { name: '📋 Queue', value: queueList || 'Queue empty', inline: false },
          { name: '📊 Stats', value: `Total Crafted: ${stats.totalCrafted} | This Session: ${queue.length}`, inline: true },
          { name: '⏱️ Est. Time', value: `${stats.totalEstimatedTime}s`, inline: true }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rpg-craft-add').setLabel('Add Item').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rpg-craft-start').setLabel('Start Crafting').setStyle(ButtonStyle.Success)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleCraftingQueue:', error);
      await interaction.reply({ content: 'Failed to load crafting queue.', ephemeral: true });
    }
  }

  /**
   * Handler for Auto-Sell Junk feature
   */,

  async handleAutoSellSettings(interaction, player) {
    try {
      const settings = this.autoSellJunk.getSettings(player.userId);
      const stats = this.autoSellJunk.getStatistics(player.userId);

      const filters = stats.rarityFilter.length > 0 ? stats.rarityFilter.join(', ') : 'None';
      const excluded = settings.excludedItems.length > 0 ? settings.excludedItems.slice(0, 5).map(e => e.itemName).join(', ') : 'None';

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle('🤖 **Auto-Sell Junk**')
        .setDescription('Configure automatic selling of low-value items')
        .addFields(
          { name: '⚙️ Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: '📊 Rarity Filter', value: filters, inline: false },
          { name: '💰 Stats', value: `Items Sold: ${stats.totalItemsSold} | Gold Earned: ${stats.totalGoldEarned}`, inline: false },
          { name: '⛔ Excluded Items', value: excluded, inline: false }
        )
        .setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rpg-sell-toggle').setLabel(settings.enabled ? 'Disable' : 'Enable').setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('rpg-sell-config').setLabel('Configure').setStyle(ButtonStyle.Primary).setDisabled(true)
      );

      const backButton = new ButtonBuilder()
        .setCustomId('rpg-qol-tab-gear')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row2 = new ActionRowBuilder().addComponents(backButton);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleAutoSellSettings:', error);
      await interaction.reply({ content: 'Failed to load auto-sell settings.', ephemeral: true });
    }
  }

  /**
   * Handler for Stat Comparison feature
   */,

  async handleStatComparison(interaction, player) {
    try {
      const equipped = player.equippedItems || {};
      const stats = player.getStats();

      const slots = ['weapon', 'armor', 'shield', 'ring', 'amulet'];
      const equipmentInfo = slots.map(slot => {
        const item = equipped[slot];
        return `${slot.charAt(0).toUpperCase() + slot.slice(1)}: ${item ? `${item.name} (${item.rarity || 'Common'})` : 'Empty'}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x0066ff)
        .setTitle('⚔️ **Stat Comparison**')
        .setDescription('View your current equipment and stats')
        .addFields(
          { name: '🗡️ Equipment', value: equipmentInfo, inline: false },
          { name: '📊 Total Stats', value: `Attack: ${stats.attack || 0}\nDefense: ${stats.defense || 0}\nHP: ${stats.maxHp || 0}`, inline: true },
          { name: '⚡ Combat Stats', value: `Strength: ${stats.strength || 0}\nAgility: ${stats.agility || 0}\nIntelligence: ${stats.intelligence || 0}`, inline: true }
        )
        .setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rpg-comp-slot-view').setLabel('View Slot Details').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('rpg-comp-set-compare').setLabel('Set Comparison').setStyle(ButtonStyle.Secondary).setDisabled(true)
      );

      const backButton = new ButtonBuilder()
        .setCustomId('rpg-qol-tab-gear')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row2 = new ActionRowBuilder().addComponents(backButton);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleStatComparison:', error);
      await interaction.reply({ content: 'Failed to load stat comparison.', ephemeral: true });
    }
  }

  /**
   * Handler for Timezone Support feature
   */,

  async handleTimezoneSettings(interaction, player) {
    try {
      const settings = this.timeZoneSupport.getPlayerSettings(player.userId);
      const currentTime = this.timeZoneSupport.getCurrentLocalTime(player.userId);

      const embed = new EmbedBuilder()
        .setColor(0x00ffaa)
        .setTitle('🌍 **Timezone Support**')
        .setDescription(`Current Timezone: ${settings.timeZone}`)
        .addFields(
          { name: '⏰ Local Time', value: `${currentTime.time} (${currentTime.utcOffset})`, inline: true },
          { name: '📅 Date', value: currentTime.localDate, inline: true },
          { name: '💡 Info', value: 'Set your timezone for accurate event scheduling!', inline: false }
        )
        .setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rpg-tz-change').setLabel('Change Timezone').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('rpg-tz-schedule').setLabel('View Full Schedule').setStyle(ButtonStyle.Secondary).setDisabled(true)
      );

      const backButton = new ButtonBuilder()
        .setCustomId('rpg-qol-tab-utility')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row2 = new ActionRowBuilder().addComponents(backButton);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleTimezoneSettings:', error);
      await interaction.reply({ content: 'Failed to load timezone settings.', ephemeral: true });
    }
  }

  /**
   * Handler for UI Theme Manager feature
   */,

  async handleUIThemeSettings(interaction, player) {
    try {
      const themeSettings = this.uiThemeManager.getPlayerTheme(player.userId);
      const availableThemes = this.uiThemeManager.getAvailableThemes();

      const currentTheme = themeSettings.currentTheme || 'dark';

      const embed = new EmbedBuilder()
        .setColor(0xff00ff)
        .setTitle('🎨 **UI Theme Manager**')
        .setDescription(`Current Theme: **${currentTheme}**`)
        .addFields(
          { name: '🎪 Available Themes', value: `${availableThemes.length} themes available`, inline: true },
          { name: '⚙️ Settings', value: `Font: ${themeSettings.fontSize || 'medium'} | Animations: ${themeSettings.animations !== false ? 'On' : 'Off'}`, inline: true }
        )
        .setTimestamp();

      const select = new StringSelectMenuBuilder()
        .setCustomId('rpg-theme-select')
        .setPlaceholder('Choose a theme...')
        .addOptions(availableThemes.slice(0, 25).map(t => ({
          label: t.name,
          value: t.id,
          description: t.description?.substring(0, 100) || 'Theme option'
        })));

      const row1 = new ActionRowBuilder().addComponents(select);

      const backButton = new ButtonBuilder()
        .setCustomId('rpg-qol-tab-utility')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('◀️');

      const row2 = new ActionRowBuilder().addComponents(backButton);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleUIThemeSettings:', error);
      await interaction.reply({ content: 'Failed to load theme settings.', ephemeral: true });
    }
  }

  /**
   * Handler for Session Statistics feature
   */,

  async handleSessionStats(interaction, player) {
    try {
      // Use progress stats data for session overview
      const stats = player.progressStats || {};
      const monstersDefeated = stats.monstersDefeated || 0;
      const gatheringActions = stats.gatheringActions || 0;
      const craftsCompleted = stats.craftsCompleted || 0;
      const goldEarned = stats.goldEarned || 0;

      // Calculate session info
      const level = player.level || 1;
      const xp = player.xp || 0;
      const gold = player.gold || 0;
      const recentActivity = this.combatSystem.isInCombat(player.userId) ? '⚔️ In Combat' : '🛡️ Idle';

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('📊 **Session Statistics**')
        .setDescription(`Level ${level} | ${xp.toLocaleString()} XP | ${gold.toLocaleString()}g`)
        .addFields(
          { name: '🎮 Current Status', value: recentActivity, inline: false },
          { name: '💀 Monsters Defeated', value: `${monstersDefeated.toLocaleString()}`, inline: true },
          { name: '⛏️ Resources Gathered', value: `${gatheringActions.toLocaleString()}`, inline: true },
          { name: '🔨 Items Crafted', value: `${craftsCompleted.toLocaleString()}`, inline: true },
          { name: '💰 Total Gold Earned', value: `${goldEarned.toLocaleString()}g`, inline: true },
          { name: '🏆 Dungeons Cleared', value: `${stats.dungeonsCleared || 0}`, inline: true },
          { name: '🐉 Raids Cleared', value: `${stats.raidsCleared || 0}`, inline: true }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rpg-back').setLabel('Back').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rpg-progress-menu').setLabel('Progress Menu').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rpg-achievements').setLabel('Achievements').setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleSessionStats:', error);
      await interaction.reply({ content: 'Failed to load session statistics.', ephemeral: true });
    }
  }

  /**
   * Handle roguelike dungeon start
   */,
};
