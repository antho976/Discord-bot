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
 * rpg-progress-handlers — extracted from RPGCommand.js
 * 18 methods, ~1554 lines
 */
export const ProgressHandlers = {
  async handleProgressMenu(interaction, player, skipTracking = false) {
    if (!skipTracking) {
      this.trackMenuNavigation(player, 'progress');
    } else {
      player.currentMenu = 'progress';
    }

    const questFlags = Object.keys(player.questFlags || {}).filter(
      key => !key.endsWith('_abandoned') && !key.endsWith('_completed_at')
    );

    // Ensure progressStats exists
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

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📈 Progress & Statistics')
      .setDescription('Track your journey and achievements.');

    // Basic progress
    embed.addFields(
      { name: '📊 Character Info', value: `Level: **${player.level}** | XP: **${player.xp}**/${player.xpToNextLevel}\nGold: **${player.gold.toLocaleString()}** | World: **${getWorld(player.currentWorld)?.name || 'Unknown'}**`, inline: false },
      { name: '🎯 Quest Progress', value: `Quests Completed: **${questFlags.length}**\nWorld Bosses Defeated: **${player.worldBossesDefeated?.length || 0}**`, inline: true },
      { name: '🏛️ Guild & Skills', value: `Guild Rank: **${player.guildRank || 'F'}**\nSkills Learned: **${player.skills?.length || 0}**\nTalent Points: **${player.talentPoints || 0}**`, inline: true },
      { name: '📦 Inventory & Professions', value: `Inventory Items: **${player.inventory?.length || 0}**\nProfessions: **${player.professions?.length || 0}**/${player.maxProfessions || 1}`, inline: true }
    );

    // Lifetime Stats
    const stats = player.progressStats;
    embed.addFields({
      name: '⚔️ Lifetime Statistics',
      value: [
        `🗡️ Monsters Defeated: **${stats.monstersDefeated.toLocaleString()}**`,
        `⛏️ Gathering Actions: **${stats.gatheringActions.toLocaleString()}**`,
        `📦 Materials Collected: **${stats.materialsCollected.toLocaleString()}**`,
        `🔨 Items Crafted: **${stats.craftsCompleted.toLocaleString()}**`,
        `💰 Gold Earned: **${stats.goldEarned.toLocaleString()}**`,
        `💥 Critical Hits: **${stats.criticalHits.toLocaleString()}**`,
        `🏰 Dungeons Cleared: **${stats.dungeonsCleared.toLocaleString()}**`,
        `🐉 Raids Cleared: **${stats.raidsCleared.toLocaleString()}**`
      ].join('\n'),
      inline: false
    });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-achievements')
        .setLabel('🏅 Achievements')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-collectibles')
        .setLabel('📚 Collectibles')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-titles-badges')
        .setLabel('🎖️ Titles & Badges')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-progress-leaderboards')
        .setLabel('🏆 Leaderboards')
        .setStyle(ButtonStyle.Primary),
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
   * Handle achievements menu
   */,

  async handleAchievements(interaction, player, skipTracking = false) {
    if (!skipTracking) {
      this.trackMenuNavigation(player, 'achievements');
    } else {
      player.currentMenu = 'achievements';
    }

    const achievements = this.getAchievementData(player);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🏅 Achievements')
      .setDescription('Progress toward milestones.');

    achievements.forEach(a => {
      const completedTiers = a.tiers.filter(t => a.progressValue >= t.target).length;
      const totalTiers = a.tiers.length;
      const maxTarget = a.tiers[a.tiers.length - 1].target;
      const nextTier = a.tiers.find(t => a.progressValue < t.target);
      const nextLine = nextTier ? ` • Next: ${nextTier.name} (${nextTier.target})` : ' • All tiers complete';
      embed.addFields({
        name: a.name,
        value: `${Math.min(a.progressValue, maxTarget)}/${maxTarget} • Tiers: ${completedTiers}/${totalTiers}${nextLine}`,
        inline: false,
      });
    });

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-achievement-select')
        .setPlaceholder('View achievement details')
        .addOptions(
          achievements.map(a => ({
            label: a.name.substring(0, 100),
            value: a.id,
            description: a.description.substring(0, 100),
          }))
        )
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, buttons],
    });
  }

  /**
   * Handle leaderboards in progress tab
   */,

  async handleProgressLeaderboards(interaction, player, skipTracking = false) {
    if (!skipTracking) {
      this.trackMenuNavigation(player, 'progress_leaderboards');
    } else {
      player.currentMenu = 'progress_leaderboards';
    }

    const embed = new EmbedBuilder()
      .setColor(0xffe700)
      .setTitle('🏆 Player Leaderboards')
      .setDescription(
        `View how you rank against other players!\n\n` +
        `📊 Select a category to see the top players and your ranking.`
      );

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-progress-leaderboard-select')
        .setPlaceholder('Select a leaderboard category')
        .addOptions(
          { label: '🌟 Overall Score', value: 'overall', emoji: '🌟', description: 'Top players by combined level and experience' },
          { label: '⭐ Level / Experience', value: 'level', emoji: '⭐', description: 'Top players by character level and total XP' },
          { label: '💰 Total Gold', value: 'gold', emoji: '💰', description: 'Richest players by total gold owned' },
          { label: '🔮 Boss Essence', value: 'essence', emoji: '🔮', description: 'Players with most Boss Essence' },
          { label: '⚔️ Equipment Power', value: 'equipment', emoji: '⚔️', description: 'Highest average equipment rating' },
          { label: '🏰 Guild Leadership', value: 'guild', emoji: '🏰', description: 'Top guild leaders and officers' },
          { label: '🥊 Arena Wins', value: 'arena', emoji: '🥊', description: 'Players with most arena victories' }
        )
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row, buttons],
    });
  }

  /**
   * Build achievement data with tiered rewards
   */,

  async handleAchievementDetail(interaction, player, achievementId) {
    const achievements = this.getAchievementData(player);
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement) {
      await interaction.reply({ content: 'Achievement not found.', ephemeral: true });
      return;
    }

    const claimed = player.achievementRewardsClaimed?.[achievement.id] || {};
    const tierLines = achievement.tiers.map(tier => {
      const completed = achievement.progressValue >= tier.target;
      const isClaimed = !!claimed[tier.id];
      const status = isClaimed ? '✅ Claimed' : completed ? '🎁 Claimable' : '🔒 Locked';
      return `• ${tier.name} (${tier.target}) — ${status} (+${tier.reward.xp} XP, +${tier.reward.gold} gold)`;
    });

    const nextClaimable = achievement.tiers.find(tier => achievement.progressValue >= tier.target && !claimed[tier.id]);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`🏅 ${achievement.name}`)
      .setDescription(achievement.description)
      .addFields(
        {
          name: 'Progress',
          value: `${achievement.progressValue}/${achievement.tiers[achievement.tiers.length - 1].target}`,
          inline: true,
        },
        {
          name: 'Tiers',
          value: tierLines.join('\n'),
          inline: false,
        }
      );

    const rows = [];
    if (nextClaimable) {
      rows.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-achievement-claim-${achievement.id}-${nextClaimable.id}`)
            .setLabel(`🎁 Claim ${nextClaimable.name}`)
            .setStyle(ButtonStyle.Success)
        )
      );
    }

    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-achievements')
          .setLabel('← Back to Achievements')
          .setStyle(ButtonStyle.Secondary)
      )
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  }

  /**
   * Claim achievement tier reward
   */,

  async handleAchievementClaim(interaction, player, achievementId, tierId) {
    const achievements = this.getAchievementData(player);
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement) {
      await interaction.reply({ content: 'Achievement not found.', ephemeral: true });
      return;
    }

    const tier = achievement.tiers.find(t => t.id === tierId);
    if (!tier) {
      await interaction.reply({ content: 'Achievement tier not found.', ephemeral: true });
      return;
    }

    if (achievement.progressValue < tier.target) {
      await interaction.reply({ content: 'Tier not completed yet.', ephemeral: true });
      return;
    }

    if (!player.achievementRewardsClaimed) player.achievementRewardsClaimed = {};
    if (!player.achievementRewardsClaimed[achievement.id]) player.achievementRewardsClaimed[achievement.id] = {};
    if (player.achievementRewardsClaimed[achievement.id][tier.id]) {
      await interaction.reply({ content: 'Reward already claimed.', ephemeral: true });
      return;
    }

    player.achievementRewardsClaimed[achievement.id][tier.id] = true;
    if (tier.reward?.xp) player.addXp(tier.reward.xp);
    if (tier.reward?.gold) this.addGold(player, tier.reward.gold);
    this.persistPlayer(player);

    await interaction.reply({ content: `✅ Claimed ${tier.name} reward!`, ephemeral: true });
    await this.handleAchievementDetail(interaction, player, achievement.id);
  }

  /**
   * Handle collectibles menu
   */,

  async handleCollectibles(interaction, player, skipTracking = false) {
    if (!skipTracking) {
      this.trackMenuNavigation(player, 'collectibles');
    } else {
      player.currentMenu = 'collectibles';
    }

    if (!player.collectibles) player.collectibles = [];
    
    const collectedCount = player.collectibles.length;
    const claimedMilestones = player.claimedCollectibleMilestones || [];
    const nextMilestone = getNextMilestone(collectedCount, claimedMilestones);

    let milestoneText = '';
    if (nextMilestone) {
      milestoneText = `\n\n🎯 **Next Milestone:** ${nextMilestone.count} collectibles\n💰 Reward: ${nextMilestone.rewards.gold}g + ${nextMilestone.rewards.xp} XP`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📚 Collectibles Collection')
      .setDescription(
        `You have collected **${collectedCount}** unique collectibles.${milestoneText}\n\n` +
        `Collectibles are rare items found throughout your adventures. Collect them to earn exclusive rewards!`
      );

    // Show progress towards milestones with rewards
    const milestones = Object.values(COLLECTIBLE_MILESTONES);
    const milestoneProgress = milestones.map(m => {
      const claimed = claimedMilestones.includes(m.count);
      const reached = collectedCount >= m.count;
      const status = claimed ? '✅' : reached ? '🎁' : '🔒';
      const rewards = `${m.rewards.gold}g + ${m.rewards.xp}XP` + (m.rewards.items?.length > 0 ? ` + Items` : '');
      return `${status} **${m.count}** - ${m.title}\n    └ Rewards: ${rewards}`;
    }).join('\n');

    embed.addFields({ name: '🏆 Milestones & Rewards', value: milestoneProgress, inline: false });

    // Show some collected items
    if (player.collectibles.length > 0) {
      const recentCollectibles = player.collectibles.slice(-5).map(id => {
        const collectible = getCollectible(id);
        if (collectible) {
          return `${collectible.icon} ${collectible.name}`;
        }
        // Check if it's a crafted item
        if (id.startsWith('crafted_')) {
          const itemId = id.replace('crafted_', '');
          const item = getEquipment(itemId) || getItemByIdDynamic(itemId);
          if (item) {
            return `🛠️ ${item.name}`;
          }
        }
        return id;
      }).join('\n');
      embed.addFields({ name: '📝 Recent Collectibles', value: recentCollectibles, inline: false });
    }

    const buttons = new ActionRowBuilder().addComponents(
      nextMilestone ? new ButtonBuilder()
        .setCustomId('rpg-claim-collectible-milestone')
        .setLabel(`🎁 Claim ${nextMilestone.count} Reward`)
        .setStyle(ButtonStyle.Success) : new ButtonBuilder()
        .setCustomId('rpg-collectibles-view')
        .setLabel('📖 View All')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-progress-menu')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Handle viewing all collectibles
   */,

  async handleCollectiblesViewAll(interaction, player) {
    this.trackMenuNavigation(player, 'collectibles-view');

    if (!player.collectibles) player.collectibles = [];

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📚 All Collectibles')
      .setDescription(`You have collected **${player.collectibles.length}** unique items.`);

    if (player.collectibles.length > 0) {
      // Show all collectibles grouped
      const collectiblesList = player.collectibles.map(id => {
        const collectible = getCollectible(id);
        if (collectible) {
          return `${collectible.icon} **${collectible.name}** - ${collectible.rarity}`;
        }
        // Check if it's a crafted item
        if (id.startsWith('crafted_')) {
          const itemId = id.replace('crafted_', '');
          const item = getEquipment(itemId) || getItemByIdDynamic(itemId);
          if (item) {
            return `🛠️ **${item.name}** (Crafted) - ${item.rarity || 'Unknown'}`;
          }
        }
        return `❓ ${id}`;
      }).join('\n');

      // Split into chunks if too long
      const maxLength = 1024;
      if (collectiblesList.length > maxLength) {
        const chunks = [];
        let currentChunk = '';
        const lines = collectiblesList.split('\n');
        
        for (const line of lines) {
          if ((currentChunk + line + '\n').length > maxLength) {
            chunks.push(currentChunk);
            currentChunk = line + '\n';
          } else {
            currentChunk += line + '\n';
          }
        }
        if (currentChunk) chunks.push(currentChunk);

        chunks.forEach((chunk, i) => {
          embed.addFields({ 
            name: i === 0 ? '📦 Your Collection' : `📦 Collection (cont.)`, 
            value: chunk, 
            inline: false 
          });
        });
      } else {
        embed.addFields({ name: '📦 Your Collection', value: collectiblesList, inline: false });
      }
    } else {
      embed.addFields({ 
        name: '📦 Your Collection', 
        value: 'No collectibles yet. Keep adventuring to find them!', 
        inline: false 
      });
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-collectibles')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backButton],
    });
  }

  /**
   * Handle titles and badges menu
   */,

  async handleTitlesAndBadges(interaction, player) {
    this.trackMenuNavigation(player, 'titles-badges');

    const earnedTitles = getEarnedTitles(player);
    const earnedBadges = getEarnedBadges(player);
    const activeTitle = player.activeTitle ? getTitle(player.activeTitle) : null;
    const allTitles = Object.values(TITLES);
    const allBadges = Object.values(BADGES);

    let activeTitleInfo = activeTitle ? activeTitle.displayName : 'None';
    if (activeTitle) {
      const bonuses = [];
      if (activeTitle.activeBonus) bonuses.push(`🟢 ${activeTitle.activeBonus.description}`);
      if (activeTitle.passiveBonus) bonuses.push(`🔵 ${activeTitle.passiveBonus.description}`);
      if (bonuses.length > 0) {
        activeTitleInfo += `\n${bonuses.join(' | ')}`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🎖️ Titles & Badges')
      .setDescription(
        `Display your achievements with titles and badges!\n\n` +
        `**Active Title:**\n${activeTitleInfo}\n\n` +
        `**Progress:** ${earnedTitles.length}/${allTitles.length} Titles | ${earnedBadges.length}/${allBadges.length} Badges\n\n` +
        `**Bonus Types:**\n🟢 Active Bonus (only when title equipped) | 🔵 Passive Bonus (always active)`
      );

    // Show recent earned titles
    const recentTitles = earnedTitles.slice(0, 5).map(t => `${t.displayName}`).join(', ');
    embed.addFields({ 
      name: `🏆 Recent Titles (${earnedTitles.length} total)`, 
      value: recentTitles || 'No titles earned yet', 
      inline: false 
    });

    // Show recent earned badges
    const recentBadges = earnedBadges.slice(0, 5).map(b => `${b.icon} ${b.name}`).join(', ');
    embed.addFields({ 
      name: `🎖️ Recent Badges (${earnedBadges.length} total)`, 
      value: recentBadges || 'No badges earned yet', 
      inline: false 
    });

    const components = [];
    
    if (earnedTitles.length > 0) {
      const titleOptions = earnedTitles.slice(0, 25).map(t => ({
        label: t.name.substring(0, 100),
        value: t.id,
        description: t.description.substring(0, 100),
      }));
      components.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-select-title')
          .setPlaceholder('Select a title to equip')
          .addOptions(titleOptions)
      ));
    }

    // Add 4 buttons for viewing all titles/badges
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-titles-earned')
        .setLabel(`Earned Titles (${earnedTitles.length})`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-titles-unearned')
        .setLabel(`Locked Titles (${allTitles.length - earnedTitles.length})`)
        .setStyle(ButtonStyle.Secondary)
    ));

    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-badges-earned')
        .setLabel(`Earned Badges (${earnedBadges.length})`)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-badges-unearned')
        .setLabel(`Locked Badges (${allBadges.length - earnedBadges.length})`)
        .setStyle(ButtonStyle.Secondary)
    ));

    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-progress-menu')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    ));

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Handle viewing all earned titles
   */,

  async handleTitlesEarned(interaction, player) {
    const earnedTitles = getEarnedTitles(player);
    const activeTitle = player.activeTitle;

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🏆 Earned Titles')
      .setDescription(
        `You have earned ${earnedTitles.length} titles!\n\n` +
        `**Bonus Types:** 🟢 Active (equipped only) | 🔵 Passive (always active)`
      );

    if (earnedTitles.length > 0) {
      const titlesList = earnedTitles.map(t => {
        const isActive = t.id === activeTitle ? '✅ ' : '';
        const bonuses = [];
        if (t.activeBonus) bonuses.push(`🟢 ${t.activeBonus.description}`);
        if (t.passiveBonus) bonuses.push(`🔵 ${t.passiveBonus.description}`);
        const bonusText = bonuses.length > 0 ? `\n    └ ${bonuses.join(' | ')}` : '';
        return `${isActive}${t.displayName} - _${t.description}_${bonusText}`;
      }).join('\n\n');

      // Split into chunks if too long
      const maxLength = 1024;
      if (titlesList.length > maxLength) {
        const chunks = [];
        let currentChunk = '';
        const lines = titlesList.split('\n\n');
        
        for (const line of lines) {
          if ((currentChunk + line + '\n\n').length > maxLength) {
            chunks.push(currentChunk);
            currentChunk = line + '\n\n';
          } else {
            currentChunk += line + '\n\n';
          }
        }
        if (currentChunk) chunks.push(currentChunk);

        chunks.forEach((chunk, i) => {
          embed.addFields({ 
            name: i === 0 ? '🎖️ Your Titles' : `🎖️ Your Titles (cont.)`, 
            value: chunk, 
            inline: false 
          });
        });
      } else {
        embed.addFields({ name: '🎖️ Your Titles', value: titlesList, inline: false });
      }
    } else {
      embed.addFields({ name: '🎖️ Your Titles', value: 'No titles earned yet. Keep playing to earn them!', inline: false });
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-titles-badges')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backButton],
    });
  }

  /**
   * Handle viewing all unearned titles
   */,

  async handleTitlesUnearned(interaction, player) {
    const earnedTitles = getEarnedTitles(player);
    const earnedIds = new Set(earnedTitles.map(t => t.id));
    const allTitles = Object.values(TITLES);
    const unearnedTitles = allTitles.filter(t => !earnedIds.has(t.id));

    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle('🔒 Locked Titles')
      .setDescription(
        `${unearnedTitles.length} titles remaining to unlock.\n\n` +
        `**Bonus Types:** 🟢 Active (equipped only) | 🔵 Passive (always active)`
      );

    if (unearnedTitles.length > 0) {
      const titlesList = unearnedTitles.map(t => {
        const bonuses = [];
        if (t.activeBonus) bonuses.push(`🟢 ${t.activeBonus.description}`);
        if (t.passiveBonus) bonuses.push(`🔵 ${t.passiveBonus.description}`);
        const bonusText = bonuses.length > 0 ? `\n    └ ${bonuses.join(' | ')}` : '';
        return `🔒 ${t.displayName} - _${t.description}_${bonusText}`;
      }).join('\n\n');

      // Split into chunks if too long
      const maxLength = 1024;
      if (titlesList.length > maxLength) {
        const chunks = [];
        let currentChunk = '';
        const lines = titlesList.split('\n\n');
        
        for (const line of lines) {
          if ((currentChunk + line + '\n\n').length > maxLength) {
            chunks.push(currentChunk);
            currentChunk = line + '\n\n';
          } else {
            currentChunk += line + '\n\n';
          }
        }
        if (currentChunk) chunks.push(currentChunk);

        chunks.forEach((chunk, i) => {
          embed.addFields({ 
            name: i === 0 ? '🎯 Locked Titles' : `🎯 Locked Titles (cont.)`, 
            value: chunk, 
            inline: false 
          });
        });
      } else {
        embed.addFields({ name: '🎯 Locked Titles', value: titlesList, inline: false });
      }
    } else {
      embed.addFields({ name: '🎯 Locked Titles', value: 'You have earned all available titles! Congratulations!', inline: false });
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-titles-badges')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backButton],
    });
  }

  /**
   * Handle viewing all earned badges
   */,

  async handleBadgesEarned(interaction, player) {
    const earnedBadges = getEarnedBadges(player);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🎖️ Earned Badges')
      .setDescription(`You have earned ${earnedBadges.length} badges!`);

    if (earnedBadges.length > 0) {
      const badgesList = earnedBadges.map(b => 
        `${b.icon} **${b.name}** - _${b.description}_`
      ).join('\n');

      // Split into chunks if too long
      const maxLength = 1024;
      if (badgesList.length > maxLength) {
        const chunks = [];
        let currentChunk = '';
        const lines = badgesList.split('\n');
        
        for (const line of lines) {
          if ((currentChunk + line + '\n').length > maxLength) {
            chunks.push(currentChunk);
            currentChunk = line + '\n';
          } else {
            currentChunk += line + '\n';
          }
        }
        if (currentChunk) chunks.push(currentChunk);

        chunks.forEach((chunk, i) => {
          embed.addFields({ 
            name: i === 0 ? '🏅 Your Badges' : `🏅 Your Badges (cont.)`, 
            value: chunk, 
            inline: false 
          });
        });
      } else {
        embed.addFields({ name: '🏅 Your Badges', value: badgesList, inline: false });
      }
    } else {
      embed.addFields({ name: '🏅 Your Badges', value: 'No badges earned yet. Keep playing to earn them!', inline: false });
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-titles-badges')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backButton],
    });
  }

  /**
   * Handle viewing all unearned badges
   */,

  async handleBadgesUnearned(interaction, player) {
    const earnedBadges = getEarnedBadges(player);
    const earnedIds = new Set(earnedBadges.map(b => b.id));
    const allBadges = Object.values(BADGES);
    const unearnedBadges = allBadges.filter(b => !earnedIds.has(b.id));

    const embed = new EmbedBuilder()
      .setColor(0x7f8c8d)
      .setTitle('🔒 Locked Badges')
      .setDescription(`${unearnedBadges.length} badges remaining to unlock.`);

    if (unearnedBadges.length > 0) {
      const badgesList = unearnedBadges.map(b => 
        `🔒 ${b.icon} **${b.name}** - _${b.description}_`
      ).join('\n');

      // Split into chunks if too long
      const maxLength = 1024;
      if (badgesList.length > maxLength) {
        const chunks = [];
        let currentChunk = '';
        const lines = badgesList.split('\n');
        
        for (const line of lines) {
          if ((currentChunk + line + '\n').length > maxLength) {
            chunks.push(currentChunk);
            currentChunk = line + '\n';
          } else {
            currentChunk += line + '\n';
          }
        }
        if (currentChunk) chunks.push(currentChunk);

        chunks.forEach((chunk, i) => {
          embed.addFields({ 
            name: i === 0 ? '🎯 Locked Badges' : `🎯 Locked Badges (cont.)`, 
            value: chunk, 
            inline: false 
          });
        });
      } else {
        embed.addFields({ name: '🎯 Locked Badges', value: badgesList, inline: false });
      }
    } else {
      embed.addFields({ name: '🎯 Locked Badges', value: 'You have earned all available badges! Congratulations!', inline: false });
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-titles-badges')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backButton],
    });
  }

  /**
   * Handle guild achievements
   */,

  async handleAchievementProgress(interaction, player) {
    // Calculate achievement completion percentage
    const achievements = this.getAchievementData(player);
    let totalTiers = 0;
    let completedTiers = 0;
    
    achievements.forEach(achievement => {
      totalTiers += achievement.tiers.length;
      completedTiers += achievement.tiers.filter(tier => achievement.progressValue >= tier.target).length;
    });
    
    const overallProgress = totalTiers > 0 ? Math.round((completedTiers / totalTiers) * 100) : 0;

    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle('🏆 **Achievement Progress**')
      .setDescription(`Overall Completion: ${overallProgress}%`);

    // Show progress bar
    const filledBars = Math.round(overallProgress / 10);
    const emptyBars = 10 - filledBars;
    const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

    embed.addFields({
      name: 'Progress Bar',
      value: `[${progressBar}] ${overallProgress}%`,
      inline: false
    });
    
    embed.addFields({
      name: '📊 Achievement Breakdown',
      value: `**Completed Tiers:** ${completedTiers}/${totalTiers}\n**Total Achievements:** ${achievements.length}`,
      inline: false
    });

    embed.addFields({
      name: 'Keep playing to unlock more achievements!',
      value: 'Achievements track your growth and unlock special rewards.',
      inline: false
    });

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Show class mastery guide
   */,

  async handleMilestoneNotifications(interaction, player) {
    const milestones = this.qolSystem.getMilestonesApproaching(player);

    let embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle('🎯 **Upcoming Milestones**')
      .setDescription(`Your progress towards major goals`);

    if (milestones.length === 0) {
      embed.addFields({
        name: '✅ All Clear',
        value: 'No immediate milestones. Keep grinding!',
        inline: false
      });
    } else {
      milestones.forEach(milestone => {
        const progressBar = this.createProgressBar(milestone.progress, milestone.target, 10);
        embed.addFields({
          name: `🎯 ${milestone.description}`,
          value: `[${progressBar}] ${milestone.progress}/${milestone.target}`,
          inline: false
        });
      });
    }

    // Add next major milestones
    const nextLevel = Math.ceil(player.level / 5) * 5;
    const levelProgress = player.level / nextLevel;
    
    embed.addFields({
      name: '⭐ Next Level Milestone',
      value: `Level ${nextLevel} (Currently L${player.level})`,
      inline: true
    });

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Helper: Create visual progress bar
   */,

  async handleLeaderboards(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xffe700)
      .setTitle('🏆 Player Leaderboards')
      .setDescription(
        `View top players across multiple categories!\n\n` +
        `📊 Select a leaderboard category below to see the rankings.`
      )
      .addFields(
        { name: '⭐ Available Categories', value: '• Overall Score\n• Experience & Level\n• Total Gold\n• Boss Essence\n• Equipment Power\n• Guild Ranks\n• Arena Wins', inline: false }
      );

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-leaderboard-select')
        .setPlaceholder('Select a leaderboard category')
        .addOptions(
          { label: '🌟 Overall Score', value: 'overall', emoji: '🌟', description: 'Top players by combined level and experience' },
          { label: '⭐ Level / Experience', value: 'level', emoji: '⭐', description: 'Top players by character level and total XP' },
          { label: '💰 Total Gold', value: 'gold', emoji: '💰', description: 'Richest players by total gold owned' },
          { label: '🔮 Boss Essence', value: 'essence', emoji: '🔮', description: 'Players with most Boss Essence' },
          { label: '⚔️ Equipment Power', value: 'equipment', emoji: '⚔️', description: 'Highest average equipment rating' },
          { label: '🏰 Guild Leadership', value: 'guild', emoji: '🏰', description: 'Top guild leaders and officers' },
          { label: '🥊 Arena Wins', value: 'arena', emoji: '🥊', description: 'Players with most arena victories' }
        )
    );

    // For slash commands, use deferReply/editReply. For components, use update
    if (interaction.isChatInputCommand()) {
      await interaction.deferReply({ ephemeral: false });
      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } else {
      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
      });
    }
  }

  /**
   * Display specific leaderboard
   */,

  async handleLeaderboardView(interaction, category) {
    // Don't defer again if already deferred
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: false });
    }

    // Get all players from storage
    const players = await this.playerManager.getAllPlayers();
    if (!players || players.length === 0) {
      await interaction.editReply({
        content: '❌ No players found.',
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-leaderboard')
            .setLabel('← Back')
            .setStyle(ButtonStyle.Secondary)
        )],
      });
      return;
    }

    let entries = [];
    let title = '';
    let emoji = '';
    let pageSize = 10;

    switch(category) {
      case 'overall':
        title = '🌟 Overall Score Leaderboard';
        emoji = '🌟';
        entries = players
          .filter(p => p.characterCreated)
          .map(p => ({
            player: p,
            value: this.calculateOverallScore(p),
            secondary: p.level,
            displayValue: `Lvl ${p.level} | Score: ${Math.floor(this.calculateOverallScore(p)).toLocaleString()}`
          }))
          .sort((a, b) => b.value - a.value);
        break;

      case 'level':
        title = '⭐ Experience & Level Leaderboard';
        emoji = '⭐';
        entries = players
          .filter(p => p.characterCreated)
          .map(p => ({
            player: p,
            value: p.level,
            secondary: p.totalXP || 0,
            displayValue: `Lvl ${p.level} (${(p.totalXP || 0).toLocaleString()} XP)`
          }))
          .sort((a, b) => b.value !== a.value ? b.value - a.value : b.secondary - a.secondary);
        break;

      case 'gold':
        title = '💰 Total Gold Leaderboard';
        emoji = '💰';
        entries = players
          .filter(p => p.characterCreated)
          .map(p => ({
            player: p,
            value: p.gold || 0,
            displayValue: `${(p.gold || 0).toLocaleString()}g`
          }))
          .sort((a, b) => b.value - a.value);
        break;

      case 'essence':
        title = '🔮 Boss Essence Leaderboard';
        emoji = '🔮';
        entries = players
          .filter(p => p.characterCreated)
          .map(p => {
            const essenceCount = this.getMaterialCount(p, 'boss_essence');
            return {
              player: p,
              value: essenceCount,
              displayValue: `${essenceCount.toLocaleString()} Essence`
            };
          })
          .sort((a, b) => b.value - a.value)
          .filter(e => e.value > 0);
        break;

      case 'equipment':
        title = '⚔️ Equipment Power Leaderboard';
        emoji = '⚔️';
        entries = players
          .filter(p => p.characterCreated && p.inventory && p.inventory.length > 0)
          .map(p => {
            const equipment = p.inventory.filter(i => i && i.type === 'equipment' && i.equipped);
            const powerScore = equipment.reduce((sum, eq) => sum + (eq.rarity === 'legendary' ? 100 : eq.rarity === 'epic' ? 75 : eq.rarity === 'rare' ? 50 : 25), 0);
            return {
              player: p,
              value: powerScore,
              secondary: equipment.length,
              displayValue: `${powerScore} Power (${equipment.length} items)`
            };
          })
          .sort((a, b) => b.value !== a.value ? b.value - a.value : b.secondary - a.secondary)
          .filter(e => e.value > 0);
        break;

      case 'guild':
        title = '🏰 Guild Leadership Leaderboard';
        emoji = '🏰';
        const guildEntries = new Map();
        players.forEach(p => {
          if (p.characterCreated) {
            const guild = this.guildManager.getPlayerGuild(p.userId);
            if (guild && guild.leader === p.userId) {
              guildEntries.set(p.userId, {
                player: p,
                guild: guild,
                value: guild.members ? Object.keys(guild.members).length : 1,
                displayValue: `[${guild.tag}] ${guild.name} (${guild.members ? Object.keys(guild.members).length : 1} members)`
              });
            }
          }
        });
        entries = Array.from(guildEntries.values()).sort((a, b) => b.value - a.value);
        break;

      case 'arena':
        title = '🥊 Arena Wins Leaderboard';
        emoji = '🥊';
        entries = players
          .filter(p => p.characterCreated && (p.arenaWins || 0) > 0)
          .map(p => ({
            player: p,
            value: p.arenaWins || 0,
            secondary: p.arenaLosses || 0,
            displayValue: `${p.arenaWins || 0} Wins / ${p.arenaLosses || 0} Losses`
          }))
          .sort((a, b) => b.value - a.value);
        break;

      default:
        await interaction.editReply({ content: '❌ Unknown leaderboard category.' });
        return;
    }

    if (entries.length === 0) {
      await interaction.editReply({
        content: `❌ No data available for this leaderboard yet.`,
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-leaderboard')
            .setLabel('← Back')
            .setStyle(ButtonStyle.Secondary)
        )],
      });
      return;
    }

    // Create leaderboard display (top 10)
    const leaderboardText = entries.slice(0, pageSize)
      .map((entry, idx) => {
        const medal = ['🥇', '🥈', '🥉'][idx] || `#${idx + 1}`;
        return `${medal} **${entry.player.username}** - ${entry.displayValue}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xffe700)
      .setTitle(`${emoji} ${title}`)
      .setDescription(leaderboardText || 'No entries')
      .setFooter({ text: `Showing top ${Math.min(pageSize, entries.length)} of ${entries.length} players` });

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-leaderboard')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [backButton],
    });
  }

  /**
   * Display specific leaderboard from select menu (uses update instead of deferReply)
   */,

  async handleLeaderboardViewFromSelect(interaction, category) {
    try {
      // Get all players from storage
      const players = await this.playerManager.getAllPlayers();
      if (!players || players.length === 0) {
        await this.updateInteractionWithTracking(interaction, {
          content: '❌ No players found.',
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('rpg-leaderboard')
              .setLabel('← Back')
              .setStyle(ButtonStyle.Secondary)
          )],
        });
        return;
      }

      let entries = [];
      let title = '';
      let emoji = '';
      let pageSize = 10;

      switch(category) {
        case 'overall':
          title = '🌟 Overall Score Leaderboard';
          emoji = '🌟';
          entries = players
            .filter(p => p.characterCreated)
            .map(p => ({
              player: p,
              value: this.calculateOverallScore(p),
              secondary: p.level,
              displayValue: `Lvl ${p.level} | Score: ${Math.floor(this.calculateOverallScore(p)).toLocaleString()}`
            }))
            .sort((a, b) => b.value - a.value);
          break;

        case 'level':
          title = '⭐ Experience & Level Leaderboard';
          emoji = '⭐';
          entries = players
            .filter(p => p.characterCreated)
            .map(p => ({
              player: p,
              value: p.level,
              secondary: p.totalXP || 0,
              displayValue: `Lvl ${p.level} (${(p.totalXP || 0).toLocaleString()} XP)`
            }))
            .sort((a, b) => b.value !== a.value ? b.value - a.value : b.secondary - a.secondary);
          break;

        case 'gold':
          title = '💰 Total Gold Leaderboard';
          emoji = '💰';
          entries = players
            .filter(p => p.characterCreated)
            .map(p => ({
              player: p,
              value: p.gold || 0,
              displayValue: `${(p.gold || 0).toLocaleString()}g`
            }))
            .sort((a, b) => b.value - a.value);
          break;

        case 'essence':
          title = '🔮 Boss Essence Leaderboard';
          emoji = '🔮';
          entries = players
            .filter(p => p.characterCreated)
            .map(p => {
              const essenceCount = this.getMaterialCount(p, 'boss_essence');
              return {
                player: p,
                value: essenceCount,
                displayValue: `${essenceCount.toLocaleString()} Essence`
              };
            })
            .sort((a, b) => b.value - a.value)
            .filter(e => e.value > 0);
          break;

        case 'equipment':
          title = '⚔️ Equipment Power Leaderboard';
          emoji = '⚔️';
          entries = players
            .filter(p => p.characterCreated && p.inventory && p.inventory.length > 0)
            .map(p => {
              const equipment = p.inventory.filter(i => i && i.type === 'equipment' && i.equipped);
              const powerScore = equipment.reduce((sum, eq) => sum + (eq.rarity === 'legendary' ? 100 : eq.rarity === 'epic' ? 75 : eq.rarity === 'rare' ? 50 : 25), 0);
              return {
                player: p,
                value: powerScore,
                secondary: equipment.length,
                displayValue: `${powerScore} Power (${equipment.length} items)`
              };
            })
            .sort((a, b) => b.value !== a.value ? b.value - a.value : b.secondary - a.secondary)
            .filter(e => e.value > 0);
          break;

        case 'guild':
          title = '🏰 Guild Leadership Leaderboard';
          emoji = '🏰';
          const guildEntries = new Map();
          players.forEach(p => {
            try {
              if (p.characterCreated && this.guildManager) {
                const guild = this.guildManager.getPlayerGuild(p.userId);
                if (guild && guild.leader === p.userId) {
                  guildEntries.set(p.userId, {
                    player: p,
                    guild: guild,
                    value: guild.members ? Object.keys(guild.members).length : 1,
                    displayValue: `[${guild.tag}] ${guild.name} (${guild.members ? Object.keys(guild.members).length : 1} members)`
                  });
                }
              }
            } catch (err) {
              // Skip this guild entry if there's an error
              console.warn(`[Leaderboard] Error processing guild for ${p.username}:`, err.message);
            }
          });
          entries = Array.from(guildEntries.values()).sort((a, b) => b.value - a.value);
          break;

        case 'arena':
          title = '🥊 Arena Wins Leaderboard';
          emoji = '🥊';
          entries = players
            .filter(p => p.characterCreated && (p.arenaWins || 0) > 0)
            .map(p => ({
              player: p,
              value: p.arenaWins || 0,
              secondary: p.arenaLosses || 0,
              displayValue: `${p.arenaWins || 0} Wins / ${p.arenaLosses || 0} Losses`
            }))
            .sort((a, b) => b.value - a.value);
          break;

        default:
          await this.updateInteractionWithTracking(interaction, { content: '❌ Unknown leaderboard category.' });
          return;
      }

      if (entries.length === 0) {
        await this.updateInteractionWithTracking(interaction, {
          content: `❌ No data available for this leaderboard yet.`,
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('rpg-leaderboard')
              .setLabel('← Back')
              .setStyle(ButtonStyle.Secondary)
          )],
        });
        return;
      }

      // Create leaderboard display (top 10)
      const leaderboardText = entries.slice(0, pageSize)
        .map((entry, idx) => {
          const medal = ['🥇', '🥈', '🥉'][idx] || `#${idx + 1}`;
          return `${medal} **${entry.player.username}** - ${entry.displayValue}`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0xffe700)
        .setTitle(`${emoji} ${title}`)
        .setDescription(leaderboardText || 'No entries')
        .setFooter({ text: `Showing top ${Math.min(pageSize, entries.length)} of ${entries.length} players` });

      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-leaderboard')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [backButton],
      });
    } catch (error) {
      console.error('[Leaderboard] Error in handleLeaderboardViewFromSelect:', error);
      await this.updateInteractionWithTracking(interaction, {
        content: '❌ An error occurred while loading the leaderboards.',
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-leaderboard')
            .setLabel('← Back')
            .setStyle(ButtonStyle.Secondary)
        )],
      });
    }
  }

  /**
   * Handle progress tab leaderboard view with player rank displayed
   */,

  async handleProgressLeaderboardView(interaction, player, category) {
    try {
      // Get all players from storage
      const players = await this.playerManager.getAllPlayers();
      if (!players || players.length === 0) {
        await this.updateInteractionWithTracking(interaction, {
          content: '❌ No players found.',
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('rpg-progress-leaderboards')
              .setLabel('← Back')
              .setStyle(ButtonStyle.Secondary)
          )],
        });
        return;
      }

      let entries = [];
      let title = '';
      let emoji = '';
      let pageSize = 10;

      switch(category) {
        case 'overall':
          title = '🌟 Overall Score Leaderboard';
          emoji = '🌟';
          entries = players
            .filter(p => p.characterCreated)
            .map(p => ({
              player: p,
              value: this.calculateOverallScore(p),
              secondary: p.level,
              displayValue: `Lvl ${p.level} | Score: ${Math.floor(this.calculateOverallScore(p)).toLocaleString()}`
            }))
            .sort((a, b) => b.value - a.value);
          break;

        case 'level':
          title = '⭐ Experience & Level Leaderboard';
          emoji = '⭐';
          entries = players
            .filter(p => p.characterCreated)
            .map(p => ({
              player: p,
              value: p.level,
              secondary: p.totalXP || 0,
              displayValue: `Lvl ${p.level} (${(p.totalXP || 0).toLocaleString()} XP)`
            }))
            .sort((a, b) => b.value !== a.value ? b.value - a.value : b.secondary - a.secondary);
          break;

        case 'gold':
          title = '💰 Total Gold Leaderboard';
          emoji = '💰';
          entries = players
            .filter(p => p.characterCreated)
            .map(p => ({
              player: p,
              value: p.gold || 0,
              displayValue: `${(p.gold || 0).toLocaleString()}g`
            }))
            .sort((a, b) => b.value - a.value);
          break;

        case 'essence':
          title = '🔮 Boss Essence Leaderboard';
          emoji = '🔮';
          entries = players
            .filter(p => p.characterCreated)
            .map(p => {
              const essenceCount = this.getMaterialCount(p, 'boss_essence');
              return {
                player: p,
                value: essenceCount,
                displayValue: `${essenceCount.toLocaleString()} Essence`
              };
            })
            .sort((a, b) => b.value - a.value)
            .filter(e => e.value > 0);
          break;

        case 'equipment':
          title = '⚔️ Equipment Power Leaderboard';
          emoji = '⚔️';
          entries = players
            .filter(p => p.characterCreated && p.inventory && p.inventory.length > 0)
            .map(p => {
              const equipment = p.inventory.filter(i => i && i.type === 'equipment' && i.equipped);
              const powerScore = equipment.reduce((sum, eq) => sum + (eq.rarity === 'legendary' ? 100 : eq.rarity === 'epic' ? 75 : eq.rarity === 'rare' ? 50 : 25), 0);
              return {
                player: p,
                value: powerScore,
                secondary: equipment.length,
                displayValue: `${powerScore} Power (${equipment.length} items)`
              };
            })
            .sort((a, b) => b.value !== a.value ? b.value - a.value : b.secondary - a.secondary)
            .filter(e => e.value > 0);
          break;

        case 'guild':
          title = '🏰 Guild Leadership Leaderboard';
          emoji = '🏰';
          const guildEntries = new Map();
          players.forEach(p => {
            if (p.characterCreated) {
              const guild = this.guildManager.getPlayerGuild(p.userId);
              if (guild && guild.leader === p.userId) {
                guildEntries.set(p.userId, {
                  player: p,
                  guild: guild,
                  value: guild.members ? Object.keys(guild.members).length : 1,
                  displayValue: `[${guild.tag}] ${guild.name} (${guild.members ? Object.keys(guild.members).length : 1} members)`
                });
              }
            }
          });
          entries = Array.from(guildEntries.values()).sort((a, b) => b.value - a.value);
          break;

        case 'arena':
          title = '🥊 Arena Wins Leaderboard';
          emoji = '🥊';
          entries = players
            .filter(p => p.characterCreated && (p.arenaWins || 0) > 0)
            .map(p => ({
              player: p,
              value: p.arenaWins || 0,
              secondary: p.arenaLosses || 0,
              displayValue: `${p.arenaWins || 0} Wins / ${p.arenaLosses || 0} Losses`
            }))
            .sort((a, b) => b.value - a.value);
          break;

        default:
          await this.updateInteractionWithTracking(interaction, {
            content: '❌ Unknown leaderboard category.'
          });
          return;
      }

      if (entries.length === 0) {
        await this.updateInteractionWithTracking(interaction, {
          content: `❌ No data available for this leaderboard yet.`,
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('rpg-progress-leaderboards')
              .setLabel('← Back')
              .setStyle(ButtonStyle.Secondary)
          )],
        });
        return;
      }

      // Create leaderboard display (top 10)
      const leaderboardText = entries.slice(0, pageSize)
        .map((entry, idx) => {
          const medal = ['🥇', '🥈', '🥉'][idx] || `#${idx + 1}`;
          const highlight = entry.player.userId === player.userId ? ' ⭐' : '';
          return `${medal} **${entry.player.username}** - ${entry.displayValue}${highlight}`;
        })
        .join('\n');

      // Find player's rank
      let playerRankInfo = '';
      const playerRank = entries.findIndex(e => e.player.userId === player.userId);
      if (playerRank !== -1) {
        const medal = ['🥇', '🥈', '🥉'][playerRank] || `#${playerRank + 1}`;
        playerRankInfo = `\n\n**Your Rank:** ${medal} #${playerRank + 1} out of ${entries.length}`;
      } else {
        playerRankInfo = `\n\n**Your Rank:** Not ranked in this category`;
      }

      const embed = new EmbedBuilder()
        .setColor(0xffe700)
        .setTitle(`${emoji} ${title}`)
        .setDescription(leaderboardText || 'No entries')
        .setFooter({ text: `Showing top ${Math.min(pageSize, entries.length)} of ${entries.length} players` });

      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-progress-leaderboards')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [backButton],
      });

      // If player is in top 10, show message
      if (playerRank !== -1 && playerRank < 10) {
        const medal = ['🥇', '🥈', '🥉'][playerRank] || `#${playerRank + 1}`;
        await interaction.followUp({
          content: `🎉 **Congratulations!** You're ${medal} #${playerRank + 1} in this category!`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('[Leaderboard] Error in handleProgressLeaderboardView:', error);
      await this.updateInteractionWithTracking(interaction, {
        content: '❌ An error occurred while loading the leaderboards.',
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-progress-leaderboards')
            .setLabel('← Back')
            .setStyle(ButtonStyle.Secondary)
        )],
      });
    }
  }

  /**
   * ========================================
   * NIFLHEIM TOWER HANDLERS
   * ========================================
   */

  /**
   * Handle tower start - show overview and entry options
   */,
};
