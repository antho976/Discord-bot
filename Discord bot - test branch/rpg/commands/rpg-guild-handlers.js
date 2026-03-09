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
 * rpg-guild-handlers — extracted from RPGCommand.js
 * 45 methods, ~3094 lines
 */
export const GuildHandlers = {
  async handleGuildAchievements(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
      return;
    }

    const earnedAchievements = getEarnedGuildAchievements(guild);
    const unclaimedAchievements = earnedAchievements.filter(a => !a.claimed);
    const allAchievements = Object.values(GUILD_ACHIEVEMENTS);

    // Debug info - add guild age to description
    const guildAge = Math.floor((Date.now() - (guild.createdAt || Date.now())) / (24 * 60 * 60 * 1000));

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`🏅 [${guild.tag}] Guild Achievements`)
      .setDescription(
        `Collective achievements for your guild!\n\n` +
        `**Earned:** ${earnedAchievements.length} / ${allAchievements.length}\n` +
        `**Unclaimed:** ${unclaimedAchievements.length}\n` +
        `**Guild Age:** ${guildAge} days\n` +
        `**Members:** ${Object.keys(guild.members || {}).length}\n` +
        `**Level:** ${getGuildLevel(guild.xp || 0).level}`
      );

    // Show unclaimed achievements first
    if (unclaimedAchievements.length > 0) {
      const unclaimedList = unclaimedAchievements.map(a =>
        `${a.icon} **${a.name}** - _${a.description}_\n💰 Reward: ${a.rewards.gold}g + ${a.rewards.xp} XP`
      ).join('\n\n');
      embed.addFields({ name: '🎁 Unclaimed Achievements', value: unclaimedList, inline: false });
    }

    // Show recent earned achievements
    const recentEarned = earnedAchievements.filter(a => a.claimed).slice(0, 5);
    if (recentEarned.length > 0) {
      const earnedList = recentEarned.map(a =>
        `✅ ${a.icon} ${a.name}`
      ).join('\n');
      embed.addFields({ name: '✅ Recently Earned', value: earnedList, inline: false });
    }

    // Show all achievement categories
    if (earnedAchievements.length < allAchievements.length) {
      const unearnedAchievements = allAchievements.filter(ach => 
        !earnedAchievements.some(e => e.id === ach.id)
      );
      
      // Categorize achievements
      const categories = {
        'Members': [],
        'Guild Level': [],
        'Bosses': [],
        'Treasury': [],
        'Activities': [],
        'Milestones': []
      };

      unearnedAchievements.forEach(a => {
        let progress = '';
        const req = a.requirement;
        
        switch (req.type) {
          case 'memberCount':
            progress = `(${Object.keys(guild.members || {}).length}/${req.value})`;
            categories['Members'].push(`🔒 ${a.icon} **${a.name}** ${progress}`);
            break;
          case 'level':
            const guildLevel = getGuildLevel(guild.xp || 0);
            progress = `(${guildLevel.level}/${req.value})`;
            categories['Guild Level'].push(`🔒 ${a.icon} **${a.name}** ${progress}`);
            break;
          case 'bossesDefeated':
            progress = `(${(guild.bossHistory?.length || 0)}/${req.value})`;
            categories['Bosses'].push(`🔒 ${a.icon} **${a.name}** ${progress}`);
            break;
          case 'treasuryGold':
            progress = `(${guild.gold || 0}/${req.value})`;
            categories['Treasury'].push(`🔒 ${a.icon} **${a.name}** ${progress}`);
            break;
          case 'questsCompleted':
          case 'dungeonsCleared':
            const current = req.type === 'questsCompleted' ? 
              (guild.stats?.questsCompleted || 0) : 
              (guild.stats?.dungeonsCleared || 0);
            progress = `(${current}/${req.value})`;
            categories['Activities'].push(`🔒 ${a.icon} **${a.name}** ${progress}`);
            break;
          case 'age':
            const daysRequired = Math.floor(req.value / (24 * 60 * 60 * 1000));
            const daysElapsed = Math.floor((Date.now() - (guild.createdAt || Date.now())) / (24 * 60 * 60 * 1000));
            progress = `(${daysElapsed}/${daysRequired} days)`;
            categories['Milestones'].push(`🔒 ${a.icon} **${a.name}** ${progress}`);
            break;
        }
      });

      // Add fields for each category that has achievements
      for (const [category, achievements] of Object.entries(categories)) {
        if (achievements.length > 0) {
          embed.addFields({ 
            name: `🎯 ${category}`, 
            value: achievements.join('\n'), 
            inline: false 
          });
        }
      }
    }

    const components = [];
    
    // Add select menu for viewing achievement details
    if (allAchievements.length > 0) {
      const selectOptions = allAchievements
        .slice(0, 25) // Discord limit
        .map(ach => {
          const isEarned = earnedAchievements.some(e => e.id === ach.id);
          const isClaimed = isEarned && earnedAchievements.find(e => e.id === ach.id)?.claimed;
          let emoji = '🔒';
          if (isClaimed) emoji = '✅';
          else if (isEarned) emoji = '🎁';
          
          return {
            label: ach.name,
            value: ach.id,
            description: ach.description.substring(0, 100),
            emoji: emoji
          };
        });

      components.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-guild-achievement-details')
          .setPlaceholder('📖 View Achievement Details')
          .addOptions(selectOptions)
      ));
    }
    
    if (unclaimedAchievements.length > 0) {
      components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-guild-claim-achievements')
          .setLabel(`🎁 Claim All (${unclaimedAchievements.length})`)
          .setStyle(ButtonStyle.Success)
      ));
    }

    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    ));

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Handle claiming guild achievements
   */,

  async handleClaimGuildAchievements(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
      return;
    }

    const earnedAchievements = getEarnedGuildAchievements(guild);
    const unclaimedAchievements = earnedAchievements.filter(a => !a.claimed);

    if (unclaimedAchievements.length === 0) {
      await interaction.reply({ content: '❌ No achievements to claim!', ephemeral: true });
      return;
    }

    // Mark all as claimed and distribute rewards
    let totalGold = 0;
    let totalXP = 0;
    const claimedNames = [];

    for (const achievement of unclaimedAchievements) {
      // Mark as claimed in guild data
      if (!guild.claimedAchievements) guild.claimedAchievements = [];
      guild.claimedAchievements.push(achievement.id);
      
      totalGold += achievement.rewards.gold || 0;
      totalXP += achievement.rewards.xp || 0;
      claimedNames.push(achievement.name);
    }

    // Add to guild treasury
    guild.gold = (guild.gold || 0) + totalGold;
    guild.xp = (guild.xp || 0) + totalXP;
    
    this.guildManager.save();

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎁 Guild Achievements Claimed!')
      .setDescription(
        `Successfully claimed ${unclaimedAchievements.length} achievement${unclaimedAchievements.length > 1 ? 's' : ''}!\n\n` +
        `**Achievements:**\n${claimedNames.map(n => `✅ ${n}`).join('\n')}\n\n` +
        `**Total Rewards:**\n💰 ${totalGold} gold added to guild treasury\n⭐ ${totalXP} guild XP gained`
      );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-achievements')
        .setLabel('← Back to Achievements')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backButton],
    });
  }

  /**
   * Handle viewing individual achievement details
   */,

  async handleGuildAchievementDetails(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.update({ content: '❌ You are not in a guild!', components: [], embeds: [] });
      return;
    }

    const achievementId = interaction.values[0];
    const achievement = GUILD_ACHIEVEMENTS[achievementId];
    
    if (!achievement) {
      await interaction.update({ content: '❌ Achievement not found!', components: [], embeds: [] });
      return;
    }

    const isClaimed = (guild.claimedAchievements || []).includes(achievementId);
    
    // Check if earned and get current progress
    const checkResult = checkGuildAchievement(achievementId, guild);
    const isEarned = checkResult.earned;
    
    // Build progress string based on requirement type
    let currentProgress = '';
    if (achievement.requirement.type === 'memberCount') {
      const memberCount = Object.keys(guild.members || {}).length;
      currentProgress = `Members: ${memberCount}/${achievement.requirement.value}`;
    } else if (achievement.requirement.type === 'level') {
      const guildLevel = getGuildLevel(guild.xp || 0).level;
      currentProgress = `Guild Level: ${guildLevel}/${achievement.requirement.value}`;
    } else if (achievement.requirement.type === 'bossesDefeated') {
      const bossCount = guild.stats?.bossesDefeated || 0;
      currentProgress = `Bosses Defeated: ${bossCount}/${achievement.requirement.value}`;
    } else if (achievement.requirement.type === 'treasuryGold') {
      currentProgress = `Treasury: ${(guild.gold || 0).toLocaleString()}/${achievement.requirement.value.toLocaleString()} gold`;
    } else if (achievement.requirement.type === 'questsCompleted') {
      const questCount = guild.stats?.questsCompleted || 0;
      currentProgress = `Quests: ${questCount}/${achievement.requirement.value}`;
    } else if (achievement.requirement.type === 'dungeonsCleared') {
      const dungeonCount = guild.stats?.dungeonsCleared || 0;
      currentProgress = `Dungeons: ${dungeonCount}/${achievement.requirement.value}`;
    } else if (achievement.requirement.type === 'age') {
      const ageInDays = Math.floor((Date.now() - guild.createdAt) / (1000 * 60 * 60 * 24));
      currentProgress = `Guild Age: ${Math.max(0, ageInDays)}/${achievement.requirement.value} days`;
    }

    // Determine status
    let statusEmoji = '🔒';
    let statusText = 'Locked';
    if (isClaimed) {
      statusEmoji = '✅';
      statusText = 'Claimed';
    } else if (isEarned) {
      statusEmoji = '🎁';
      statusText = 'Ready to Claim';
    }

    // Build rewards string
    const rewardParts = [];
    if (achievement.rewards.gold) rewardParts.push(`💰 ${achievement.rewards.gold.toLocaleString()} gold`);
    if (achievement.rewards.xp) rewardParts.push(`⭐ ${achievement.rewards.xp.toLocaleString()} XP`);
    const rewardsText = rewardParts.length > 0 ? rewardParts.join('\n') : 'None';

    const embed = new EmbedBuilder()
      .setTitle(`${statusEmoji} ${achievement.name}`)
      .setDescription(achievement.description)
      .addFields(
        { name: '📊 Status', value: statusText, inline: true },
        { name: '📈 Progress', value: currentProgress, inline: true },
        { name: '🎁 Rewards', value: rewardsText, inline: false }
      )
      .setColor(isClaimed ? 0x00FF00 : isEarned ? 0xFFD700 : 0x808080);

    const backButton = new ButtonBuilder()
      .setCustomId('rpg-guild-achievements')
      .setLabel('← Back to Achievements')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(backButton);

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], components: [row] });
  }

  /**
   * Handle guild rankings
   */,

  async handleGuildRankings(interaction, player) {
    const allGuilds = Object.values(this.guildManager.guilds);
    
    // Sort by XP
    const topGuilds = allGuilds.sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('📊 Guild Rankings')
      .setDescription('Top guilds by experience');

    const rankingsList = topGuilds.map((g, i) => {
      const levelInfo = getGuildLevel(g.xp || 0);
      const memberCount = Object.keys(g.members || {}).length;
      return `${i + 1}. **[${g.tag}] ${g.name}**\n└ Level ${levelInfo.level} | ${memberCount} members | ${g.xp || 0} XP`;
    }).join('\n\n');

    embed.addFields({ name: '🏆 Top Guilds', value: rankingsList || 'No guilds yet', inline: false });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Handle guild announcements
   */
  /**
   * Handle guild roles management
   */,

  async handleGuildRoles(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
      return;
    }

    const member = guild.members[player.userId];
    const isOfficer = member.role === 'officer' || member.role === 'leader';

    if (!isOfficer) {
      await interaction.reply({ content: '❌ Only officers and leaders can manage roles!', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`👑 [${guild.tag}] Role Management`)
      .setDescription(
        `Manage guild member roles and permissions.\n\n` +
        `**👑 Leader:** Full control over the guild\n` +
        `**⭐ Officer:** Can manage buffs, invite members, kick members\n` +
        `**👤 Member:** Regular guild member`
      );

    // Show members by role
    const members = Object.values(guild.members);
    const leaders = members.filter(m => m.role === 'leader');
    const officers = members.filter(m => m.role === 'officer');
    const regularMembers = members.filter(m => m.role === 'member');

    embed.addFields(
      { name: `👑 Leaders (${leaders.length})`, value: leaders.map(m => `<@${m.userId}>`).join(', ') || 'None', inline: false },
      { name: `⭐ Officers (${officers.length})`, value: officers.map(m => `<@${m.userId}>`).join(', ') || 'None', inline: false },
      { name: `👤 Members (${regularMembers.length})`, value: regularMembers.length > 0 ? `${regularMembers.length} members` : 'None', inline: false }
    );

    // Fetch usernames for members
    const memberOptions = [];
    const membersToShow = members.filter(m => m.userId !== player.userId).slice(0, 25);
    
    for (const m of membersToShow) {
      try {
        const user = await this.client.users.fetch(m.userId);
        const roleIcon = m.role === 'leader' ? '👑' : m.role === 'officer' ? '⭐' : '👤';
        memberOptions.push({
          label: `${roleIcon} ${user.username}`,
          value: m.userId,
          description: `Current role: ${m.role}`,
        });
      } catch (err) {
        // Fallback if user fetch fails
        memberOptions.push({
          label: `User ${m.userId}`,
          value: m.userId,
          description: `Current role: ${m.role}`,
        });
      }
    }

    const components = [];
    
    if (memberOptions.length > 0) {
      components.push(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-guild-manage-member-role')
          .setPlaceholder('Select a member to promote/demote')
          .addOptions(memberOptions)
      ));
    }

    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    ));

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Handle guild member role selection
   */,

  async handleGuildMemberRoleSelect(interaction, player, targetUserId) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.update({ content: '❌ You are not in a guild!', components: [], embeds: [] });
      return;
    }

    const member = guild.members[player.userId];
    const targetMember = guild.members[targetUserId];

    if (!targetMember) {
      await interaction.update({ content: '❌ Member not found!', components: [], embeds: [] });
      return;
    }

    const isLeader = member.role === 'leader';
    if (!isLeader && member.role !== 'officer') {
      await interaction.update({ content: '❌ Only officers and leaders can manage roles!', components: [], embeds: [] });
      return;
    }

    // Fetch target user info
    let targetUsername = `User ${targetUserId}`;
    try {
      const targetUser = await this.client.users.fetch(targetUserId);
      targetUsername = targetUser.username;
    } catch (err) {
      // Use fallback
    }

    const roleIcon = targetMember.role === 'leader' ? '👑' : targetMember.role === 'officer' ? '⭐' : '👤';

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`👑 Manage Role: ${targetUsername}`)
      .setDescription(
        `**Current Role:** ${roleIcon} ${targetMember.role}\n\n` +
        `**Contributed:** ${targetMember.contributedXP || 0} XP | ${targetMember.contributedGold || 0}g\n\n` +
        `Select an action below:`
      );

    const buttons = new ActionRowBuilder();

    // Can't demote/promote leaders, officers can't promote to officer
    if (targetMember.role === 'member' && isLeader) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-guild-promote-${targetUserId}`)
          .setLabel('⭐ Promote to Officer')
          .setStyle(ButtonStyle.Success)
      );
    } else if (targetMember.role === 'officer' && isLeader) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-guild-demote-${targetUserId}`)
          .setLabel('👤 Demote to Member')
          .setStyle(ButtonStyle.Primary)
      );
    }

    // Kick button (officers can kick members, leaders can kick anyone except themselves)
    if (isLeader || (member.role === 'officer' && targetMember.role === 'member')) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-guild-kick-${targetUserId}`)
          .setLabel('🚪 Kick from Guild')
          .setStyle(ButtonStyle.Danger)
      );
    }

    const components = [];
    if (buttons.components.length > 0) {
      components.push(buttons);
    }

    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-roles')
        .setLabel('← Back to Roles')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-hub')
        .setLabel('🏠 Hub')
        .setStyle(ButtonStyle.Primary)
    ));

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Handle help menu
   */,

  async handleGuild(interaction, player) {
    this.trackMenuNavigation(player, 'guild');

    // Check if player is in a guild
    const playerGuild = this.guildManager.getPlayerGuild(player.userId);

    if (!playerGuild) {
      // Player not in guild - show guild browser/creation
      await this.handleGuildBrowser(interaction, player);
      return;
    }

    // Player in guild - show guild dashboard
    await this.handleGuildDashboard(interaction, player, playerGuild);
  }

  /**
   * Guild browser - for players not in a guild
   */,

  async handleGuildBrowser(interaction, player) {
    const topGuilds = this.guildManager.getTopGuilds(5);
    const publicGuilds = this.guildManager.getPublicGuilds().slice(0, 10);
    
    let guildList = '**Top Guilds:**\n';
    if (topGuilds.length === 0) {
      guildList += '_No guilds yet. Be the first to create one!_\n\n';
    } else {
      guildList += topGuilds.map((g, i) => {
        const levelInfo = getGuildLevel(g.xp);
        return `${i + 1}. **[${g.tag}] ${g.name}** - Level ${levelInfo.level} (${Object.keys(g.members).length} members)`;
      }).join('\n') + '\n\n';
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🏰 Guild Hall')
      .setDescription(
        '**Welcome to the Guild System!**\n\n' +
        'Guilds are player-run organizations that work together to tackle challenging content, earn rewards, and progress together.\n\n' +
        guildList +
        '**Guild Benefits:**\n' +
        '• Shared XP and Gold pools\n' +
        '• Guild Buffs (XP, Gold, Shop discounts)\n' +
        '• Exclusive Guild Bosses and Raids\n' +
        '• Guild Vault for shared storage\n' +
        '• Weekly rewards based on activity'
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-create')
        .setLabel('🏰 Create Guild (10,000g)')
        .setStyle(ButtonStyle.Success)
        .setDisabled((player.gold || 0) < 10000),
      new ButtonBuilder()
        .setCustomId('rpg-guild-search')
        .setLabel('🔍 Browse Guilds')
        .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-quests')
        .setLabel('📜 Solo Guild Quests')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-guild-bounties')
        .setLabel('📜 Bounty Board')
        .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back-to-hub')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2, row3],
    });
  }

  /**
   * Guild dashboard - for players in a guild
   */,

  async handleGuildDashboard(interaction, player, guild) {
    const guildInfo = this.guildManager.getGuildInfo(guild.id);
    const member = guild.members[player.userId];
    const isLeader = member.role === 'leader';
    const isOfficer = member.role === 'officer' || isLeader;

    const levelInfo = getGuildLevel(guild.xp);
    const buffs = getGuildBuffs(levelInfo.level, guild.buffs);

    // Check for unclaimed achievements
    const unclaimedAchievements = getUnclaimedGuildAchievements(guild);
    const achievementAlert = unclaimedAchievements.length > 0 ? `\n🏅 **${unclaimedAchievements.length} New Achievement${unclaimedAchievements.length > 1 ? 's' : ''}!**` : '';

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(`🏰 [${guild.tag}] ${guild.name}`)
      .setDescription((guild.description || 'No description set') + achievementAlert)
      .addFields(
        { name: '📊 Level', value: `${levelInfo.level} / 50`, inline: true },
        { name: '⭐ XP', value: `${guild.xp} (${guildInfo.xpToNext} to next)`, inline: true },
        { name: '👥 Members', value: `${guildInfo.memberCount} / ${guildInfo.memberLimit}`, inline: true },
        { name: '💰 Treasury', value: `${guild.gold.toLocaleString()} gold`, inline: true },
        { name: '🎯 Your Role', value: member.role.charAt(0).toUpperCase() + member.role.slice(1), inline: true },
        { name: '🏅 Your Points', value: `${member.contributionPoints || 0} points`, inline: true },
        { 
          name: '✨ Active Buffs', 
          value: `+${buffs.xpBonus}% XP | +${buffs.goldBonus}% Gold\n-${buffs.shopDiscount}% Shop | +${buffs.gatheringSpeed}% Gathering`, 
          inline: false 
        }
      )
      .setTimestamp();

    // Row 1: Core features
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-manage')
        .setLabel('📋 Manage')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-guild-achievements')
        .setLabel(unclaimedAchievements.length > 0 ? `🏅 Achievements (${unclaimedAchievements.length})` : '🏅 Achievements')
        .setStyle(unclaimedAchievements.length > 0 ? ButtonStyle.Success : ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-guild-bosses')
        .setLabel('🐉 Bosses')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-guild-rankings')
        .setLabel('📊 Rankings')
        .setStyle(ButtonStyle.Secondary)
    );

    // Row 2: Activities
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-quests')
        .setLabel('📜 Quests')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-guild-buffs')
        .setLabel('✨ Buffs')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!isOfficer),
      new ButtonBuilder()
        .setCustomId('rpg-guild-leave')
        .setLabel(isLeader ? '⚠️ Disband' : '🚪 Leave')
        .setStyle(ButtonStyle.Danger)
    );

    // Row 3: Back button
    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back-to-hub')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2, row3],
    });
  }

  /**
   * Browse public guilds
   */,

  async handleGuildSearch(interaction, player) {
    const publicGuilds = this.guildManager.getPublicGuilds();
    
    if (publicGuilds.length === 0) {
      await interaction.reply({
        content: '❌ No public guilds available. Create one!',
        ephemeral: true,
      });
      return;
    }

    const listedGuilds = publicGuilds.slice(0, 15);
    let guildList = listedGuilds.map((g, i) => {
      const levelInfo = getGuildLevel(g.xp);
      const memberCount = Object.keys(g.members).length;
      return `${i + 1}. **[${g.tag}] ${g.name}**\n└ Level ${levelInfo.level} | ${memberCount}/${levelInfo.info.memberLimit} members`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🔍 Public Guilds')
      .setDescription(guildList + '\n\n**Use the buttons below to join a guild.**')
      .setFooter({ text: 'Only public guilds can be joined directly' });

    const rows = [];
    const joinButtons = listedGuilds.slice(0, 6).map(g => (
      new ButtonBuilder()
        .setCustomId(`rpg-guild-join-${g.id}`)
        .setLabel(`Join [${g.tag}]`)
        .setStyle(ButtonStyle.Success)
    ));

    for (let i = 0; i < joinButtons.length; i += 2) {
      rows.push(new ActionRowBuilder().addComponents(...joinButtons.slice(i, i + 2)));
    }

    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-guild')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      )
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  }

  /**
   * Guild members list
   */,

  async handleGuildMembers(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.reply({
        content: '❌ You are not in a guild!',
        ephemeral: true,
      });
      return;
    }

    const member = guild.members[player.userId];
    const isLeader = member.role === 'leader';
    const isOfficer = member.role === 'officer' || isLeader;

    const membersList = Object.values(guild.members)
      .sort((a, b) => {
        const roleOrder = { leader: 0, officer: 1, member: 2 };
        return roleOrder[a.role] - roleOrder[b.role];
      })
      .map(m => {
        const roleIcon = m.role === 'leader' ? '👑' : m.role === 'officer' ? '⭐' : '👤';
        return `${roleIcon} ${m.userId === player.userId ? '**You**' : `<@${m.userId}>`} - ${m.role}\n└ Contributed: ${m.contributedXP} XP | ${m.contributedGold}g`;
      })
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`👥 [${guild.tag}] Members`)
      .setDescription(membersList || 'No members');

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('← Back to Guild')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Guild boss selection
   */,

  async handleGuildBosses(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.reply({
        content: '❌ You are not in a guild!',
        ephemeral: true,
      });
      return;
    }

    // If there's an active boss, show the boss fight UI instead
    if (guild.activeBoss) {
      return this.handleActiveBossFight(interaction, player, guild);
    }

    const member = guild.members[player.userId];
    const canStart = member.role === 'leader' || member.role === 'officer';

    const levelInfo = getGuildLevel(guild.xp);
    const availableBosses = getAvailableGuildBosses(levelInfo.level);
    const availableWorldBosses = getAvailableWorldBosses(levelInfo.level);

    if (availableBosses.length === 0 && availableWorldBosses.length === 0) {
      await interaction.reply({
        content: '❌ No bosses available for your guild level yet! Reach level 5.',
        ephemeral: true,
      });
      return;
    }

    // Determine which bosses can be fought (highest tier and one below)
    const fightableBossIds = new Set();
    if (availableBosses.length > 0) {
      fightableBossIds.add(availableBosses[availableBosses.length - 1].id); // Highest tier
      if (availableBosses.length > 1) {
        fightableBossIds.add(availableBosses[availableBosses.length - 2].id); // One below highest
      }
    }

    let bossList = '**Weekly Guild Bosses:**\n';
    bossList += availableBosses.map((boss, idx) => {
      const canFight = fightableBossIds.has(boss.id);
      const essenceReward = Math.max(1, Math.floor(idx * 1.5)); // Approximate tier-based reward
      const tierLabel = canFight ? '✅ Fightable' : '🔒 Locked';
      return `${boss.icon} **${boss.name}** (Level ${boss.minGuildLevel}+) ${tierLabel}\n└ ${boss.maxHP.toLocaleString()} HP | ${boss.rewards.guildXP} Guild XP & ${boss.rewards.guildGold}g\n└ Per Player: ${boss.rewards.perPlayer.gold}g & ${boss.rewards.perPlayer.xp} XP | 🔮 Boss Essence (defeat)`;
    }).join('\n\n');

    if (availableWorldBosses.length > 0) {
      bossList += '\n\n**World Bosses (48h events):**\n';
      bossList += availableWorldBosses.map(boss =>
        `${boss.icon} **${boss.name}** (Level ${boss.minGuildLevel}+)\n└ ${(boss.maxHP / 1000000).toFixed(1)}M HP | Massive Rewards`
      ).join('\n\n');
    }

    // Add boss essence tooltip
    const essenceTooltip = '\n\n**How to Get Boss Essence:**\n🔮 Earn from Guild Boss victory (based on tier)\n🔮 Complete Guild Quests (3-10 per quest)\n🔮 Use Boss Essence to upgrade Stats, Skills, Talents, and Enchants\n\n**Reward Scaling:**\n💫 Per-player Gold and XP scale with your level (+1% per level, max +50%)\n🏛️ You also earn Guild XP from guild boss rewards';

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🐉 Guild Bosses')
      .setDescription(
        bossList + 
        `\n\n${canStart ? '**You can fight the highest tier boss or one tier below it!**' : '*Only officers and leaders can start boss fights*'}` +
        essenceTooltip
      );

    // Create buttons for each boss
    const rows = [];
    const bossButtons = [];

    availableBosses.forEach((boss, idx) => {
      const canFight = fightableBossIds.has(boss.id);
      bossButtons.push(
        new ButtonBuilder()
          .setCustomId(`rpg-guild-start-boss-${boss.id}`)
          .setLabel(`${boss.icon} ${boss.name}`)
          .setStyle(canFight ? ButtonStyle.Danger : ButtonStyle.Secondary)
          .setDisabled(!canStart || !canFight)
      );
    });

    // Add buttons in rows of 2
    for (let i = 0; i < bossButtons.length; i += 2) {
      const row = new ActionRowBuilder().addComponents(
        ...bossButtons.slice(i, i + 2)
      );
      rows.push(row);
    }

    // Boss upgrade shops
    const upgradeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-boss-stats-shop')
        .setLabel('💰 Stats')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-guild-boss-skills-shop')
        .setLabel('⚔️ Skills')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-guild-boss-talents-shop')
        .setLabel('🌟 Talents')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-guild-boss-enchants-shop')
        .setLabel('✨ Enchants')
        .setStyle(ButtonStyle.Primary)
    );
    rows.push(upgradeRow);

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('← Back to Guild')
        .setStyle(ButtonStyle.Secondary)
    );
    rows.push(backRow);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  }

  /**
   * Show active boss fight UI
   */,

  async handleActiveBossFight(interaction, player, guild, statusMessage = null) {
    const boss = guild.activeBoss;
    const now = Date.now();

    if (boss.expiresAt && now >= boss.expiresAt) {
      const finalResult = this.finalizeGuildBossFight(guild, { reason: 'expired' });
      const summary = finalResult?.summary || '⏰ The guild boss has expired and rewards have been distributed.';
      const expiredEmbed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('⏰ Boss Expired')
        .setDescription(summary);
      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-guild-bosses')
          .setLabel('🔄 Back to Bosses')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-guild')
          .setLabel('← Back to Guild')
          .setStyle(ButtonStyle.Secondary)
      );
      await this.updateInteractionWithTracking(interaction, {
        embeds: [expiredEmbed],
        components: [backRow],
      });
      return;
    }
    
    // Safety checks
    const currentHP = Math.max(0, boss.currentHP || 0);
    const maxHP = Math.max(1, boss.maxHP || 1);
    const hpPercent = ((currentHP / maxHP) * 100).toFixed(1);
    const hpBar = this.buildProgressBar(currentHP, maxHP, 20);

    // Calculate player's damage contribution
    const playerDamage = boss.participants[player.userId] || 0;
    const totalDamage = Object.values(boss.participants).reduce((sum, dmg) => sum + dmg, 0);
    const playerPercent = totalDamage > 0 ? ((playerDamage / totalDamage) * 100).toFixed(1) : 0;

    // Check registration status
    const canParticipate = this.guildManager.canParticipateInBoss(guild.id, player.userId, now);
    const remainingAttempts = this.guildManager.getRemainingBossAttempts(guild.id, player.userId, 3);
    const registrationWindowClosesIn = this.formatTimeUntil(boss.registrationDeadline, now);
    const registrationStatus = now < boss.registrationDeadline 
      ? `📝 **Registration Open** - closes in ${registrationWindowClosesIn}` 
      : `✅ **Registration Closed** - fighting available only for registered participants`;

    // Top 3 contributors
    const topContributors = Object.entries(boss.participants)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([userId, damage], idx) => {
        const percent = ((damage / totalDamage) * 100).toFixed(1);
        const medal = ['🥇', '🥈', '🥉'][idx];
        return `${medal} <@${userId}>: ${damage.toLocaleString()} (${percent}%)`;
      })
      .join('\n');

    const duration = Math.floor((Date.now() - boss.startedAt) / 1000 / 60);
    const triesLeft = this.getGuildBossAttemptsLeft(player, now);
    const triesResetIn = this.formatTimeUntil(player.guildBossAttemptResetAt, now);
    const bossResetIn = boss.expiresAt ? this.formatTimeUntil(boss.expiresAt, now) : 'Unknown';

    const statusLine = statusMessage ? `${statusMessage}\n\n` : '';

    const embed = new EmbedBuilder()
      .setColor(statusMessage ? 0xe67e22 : 0xe74c3c)
      .setTitle(`${boss.icon} ${boss.name}`)
      .setDescription(
        `${statusLine}` +
        `**HP:** ${boss.currentHP.toLocaleString()} / ${boss.maxHP.toLocaleString()}\n${hpBar}\n\n` +
        `**Defense:** ${boss.defense} | **Attack:** ${boss.attack}\n` +
        `**Duration:** ${duration} minutes\n` +
        `**Boss Reset:** ${bossResetIn}\n` +
        `**Boss Attempts Left:** ${remainingAttempts}/3${remainingAttempts > 0 ? '' : ' ⚠️ NO ATTEMPTS LEFT'}\n` +
        `**Total Participants:** ${Object.keys(boss.participants).length}\n\n` +
        `${registrationStatus}\n\n` +
        `**Your Damage:** ${playerDamage.toLocaleString()} (${playerPercent}%)\n\n` +
        `**Top Contributors:**\n${topContributors || 'No damage dealt yet'}\n\n` +
        `_Attack the boss with your guild members!_`
      );

    const attackButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-boss-attack')
        .setLabel('⚔️ Attack!')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(remainingAttempts <= 0),
      new ButtonBuilder()
        .setCustomId('rpg-guild-bosses')
        .setLabel('🔄 Refresh')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('← Back to Guild')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [attackButton],
    });
  },

  async startGuildBossCombat(interaction, player, guild) {
    const boss = guild.activeBoss;
    if (!boss) {
      await interaction.reply({ content: '❌ No active boss fight!', ephemeral: true });
      return;
    }

    const now = Date.now();
    
    // Check if player can participate (registration window or already registered)
    const canParticipate = this.guildManager.canParticipateInBoss(guild.id, player.userId, now);
    if (!canParticipate.canFight) {
      await interaction.reply({
        content: `❌ ${canParticipate.reason}!\n\nRegistration window closed <t:${Math.floor(boss.registrationDeadline / 1000)}:R>`,
        ephemeral: true,
      });
      return;
    }

    // Auto-register player if registration window is still open
    if (canParticipate.isRegistrationOpen) {
      this.guildManager.registerForBoss(guild.id, player.userId);
    }

    // Check remaining attempts
    const remainingAttempts = this.guildManager.getRemainingBossAttempts(guild.id, player.userId, 3);
    if (remainingAttempts <= 0) {
      await interaction.reply({
        content: `❌ You have used all 3 attempts for this boss cycle! Come back next cycle.`,
        ephemeral: true,
      });
      return;
    }

    const bossLevel = boss.level || boss.minGuildLevel || 1;
    const bossPlayerStats = this.getBossCombatStats(player);
    this.applyBossBattleSnapshot(player, bossPlayerStats);
    const bossStats = {
      strength: Math.max(1, boss.attack || 1),
      defense: Math.max(1, boss.defense || 1),
      intelligence: Math.max(1, Math.floor((boss.attack || 1) * 0.6)),
      agility: Math.max(1, Math.floor((boss.attack || 1) * 0.4)),
    };

    const combatState = this.combatSystem.startCombatWithCustomEnemy(
      player,
      boss.name,
      bossLevel,
      Math.max(1, boss.currentHP || boss.maxHP || 1),
      bossStats,
      boss.skills || [],
      { type: 'guild_boss', guildId: guild.id, bossId: boss.bossId }
    );

    const bossSkills = this.getBossCombatSkills(player);
    combatState.playerStats = bossPlayerStats;
    combatState.playerSkills = bossSkills.length > 0 ? bossSkills : ['slash'];
    combatState.playerSkillLevels = { ...(player.bossSkillLevels || {}) };

    combatState.enemy.maxHp = Math.max(1, boss.maxHP || combatState.enemy.maxHp || 1);
    combatState.enemy.hp = Math.max(1, Math.min(boss.currentHP || combatState.enemy.hp, combatState.enemy.maxHp));

    this.persistPlayer(player);

    const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
    const buttons = this.createCombatButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  },

  async getPlayerOverallRank(player) {
    const players = await this.playerManager.getAllPlayers();
    if (!players || players.length === 0) return null;

    const rankings = players
      .filter(p => p.characterCreated)
      .map(p => ({
        player: p,
        score: this.calculateOverallScore(p)
      }))
      .sort((a, b) => b.score - a.score);

    const rank = rankings.findIndex(r => r.player.userId === player.userId);
    if (rank === -1) return null;

    return {
      rank: rank + 1,
      totalPlayers: rankings.length,
      inTopTen: rank < 10,
      score: rankings[rank].score
    };
  }

  /**
   * Handle guild boss stats shop
   */,

  async handleGuildBossStatsShop(interaction, player) {
    const bossEssenceId = 'boss_essence';
    const statsShop = [
      { stat: 'strength', icon: '🔥', costGold: 500, costEssence: 1, emoji: 'strength', description: 'Increases physical attack power' },
      { stat: 'defense', icon: '🛡️', costGold: 500, costEssence: 1, emoji: 'defense', description: 'Reduces incoming damage' },
      { stat: 'agility', icon: '⚡', costGold: 500, costEssence: 1, emoji: 'agility', description: 'Increases attack speed and dodge chance' },
      { stat: 'intelligence', icon: '🧠', costGold: 500, costEssence: 1, emoji: 'intelligence', description: 'Boosts magical damage' },
      { stat: 'vitality', icon: '❤️', costGold: 500, costEssence: 1, emoji: 'vitality', description: 'Enhances health regeneration' },
      { stat: 'wisdom', icon: '✨', costGold: 500, costEssence: 1, emoji: 'wisdom', description: 'Improves mana pool and recovery' },
      { stat: 'maxHp', icon: '💚', costGold: 1000, costEssence: 2, emoji: 'maxHp', display: 'Max HP', description: 'Increases total health by +50 HP per purchase' },
      { stat: 'maxMana', icon: '💙', costGold: 1000, costEssence: 2, emoji: 'maxMana', display: 'Max Mana', description: 'Increases total mana by +25 Mana per purchase' },
    ];

    // Ensure all boss stats have default values
    const bossStats = Object.assign({
      strength: 5,
      defense: 5,
      agility: 5,
      intelligence: 5,
      vitality: 5,
      wisdom: 5,
      maxHp: 100,
      maxMana: 50,
    }, player.bossStats || {});

    const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
    const selectOptions = statsShop.map(item => ({
      label: `${item.display || item.stat.charAt(0).toUpperCase() + item.stat.slice(1)} (${item.icon})`,
      value: item.emoji,
      description: `Cost: ${item.costGold}g + ${item.costEssence} Essence | Current: ${bossStats[item.stat] ?? 0}`,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-guild-boss-stats-select')
      .setPlaceholder('Select a stat to upgrade')
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const essenceInfo = '**How to Get Boss Essence:**\n🔮 Win Guild Boss fights (1-3+ per victory depending on tier)\n🔮 Complete Guild Quests (3-10 per quest)\n🔮 Higher tier bosses = more essence on victory';

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('💰 Guild Boss Stats Shop')
      .setDescription(
        `Purchase base stats to increase your power for boss fights!\n\n` +
        `**Your Gold:** ${player.gold.toLocaleString()}g\n` +
        `**Boss Essence:** ${bossEssenceCount}\n\n` +
        `_Select a stat below to view details and purchase_\n\n` +
        essenceInfo
      );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-bosses')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  },

  async handleGuildBossStatDetail(interaction, player, statEmoji) {
    const bossEssenceId = 'boss_essence';
    const statsShop = [
      { stat: 'strength', icon: '🔥', costGold: 500, costEssence: 1, emoji: 'strength', description: 'Increases physical attack power' },
      { stat: 'defense', icon: '🛡️', costGold: 500, costEssence: 1, emoji: 'defense', description: 'Reduces incoming damage' },
      { stat: 'agility', icon: '⚡', costGold: 500, costEssence: 1, emoji: 'agility', description: 'Increases attack speed and dodge chance' },
      { stat: 'intelligence', icon: '🧠', costGold: 500, costEssence: 1, emoji: 'intelligence', description: 'Boosts magical damage' },
      { stat: 'vitality', icon: '❤️', costGold: 500, costEssence: 1, emoji: 'vitality', description: 'Enhances health regeneration' },
      { stat: 'wisdom', icon: '✨', costGold: 500, costEssence: 1, emoji: 'wisdom', description: 'Improves mana pool and recovery' },
      { stat: 'maxHp', icon: '💚', costGold: 1000, costEssence: 2, emoji: 'maxHp', display: 'Max HP', description: 'Increases total health by +50 HP per purchase' },
      { stat: 'maxMana', icon: '💙', costGold: 1000, costEssence: 2, emoji: 'maxMana', display: 'Max Mana', description: 'Increases total mana by +25 Mana per purchase' },
    ];

    const item = statsShop.find(s => s.emoji === statEmoji);
    if (!item) {
      await interaction.reply({ content: '❌ Invalid stat!', ephemeral: true });
      return;
    }

    // Ensure all boss stats have default values
    const bossStats = Object.assign({
      strength: 5,
      defense: 5,
      agility: 5,
      intelligence: 5,
      vitality: 5,
      wisdom: 5,
      maxHp: 100,
      maxMana: 50,
    }, player.bossStats || {});

    const currentValue = bossStats[item.stat] ?? 0;
    const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
    const canAfford = player.gold >= item.costGold && bossEssenceCount >= item.costEssence;

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`${item.icon} Upgrade: ${item.display || item.stat.charAt(0).toUpperCase() + item.stat.slice(1)}`)
      .setDescription(
        `**Description:** ${item.description}\n\n` +
        `**Current Level:** ${currentValue}\n` +
        `**Cost:** ${item.costGold}g + ${item.costEssence} Boss Essence\n\n` +
        `**Your Resources:**\n` +
        `💰 Gold: ${player.gold.toLocaleString()}g ${player.gold >= item.costGold ? '✅' : '❌'}\n` +
        `🔮 Boss Essence: ${bossEssenceCount} ${bossEssenceCount >= item.costEssence ? '✅' : '❌'}`
      );

    const buyButton = new ButtonBuilder()
      .setCustomId(`rpg-guild-boss-buy-stat-${item.emoji}`)
      .setLabel(`Purchase +1 ${item.icon}`)
      .setStyle(canAfford ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!canAfford);

    const backButton = new ButtonBuilder()
      .setCustomId('rpg-guild-boss-stats-shop')
      .setLabel('← Back to Stats')
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(buyButton, backButton);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttonRow],
    });
  },

  async handleGuildBossSkillsShop(interaction, player) {
    const bossEssenceId = 'boss_essence';
    const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
    const items = this.getBossSkillShopItems();
    const owned = new Set(player.bossSkills || []);

    const selectOptions = items.map(item => ({
      label: `${item.name} ${owned.has(item.id) ? '(Owned)' : ''}`,
      value: item.id,
      description: `Cost: ${item.costGold}g + ${item.costEssence} Essence`,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-guild-boss-skills-select')
      .setPlaceholder('Select a skill to view')
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const essenceInfo = '**How to Get Boss Essence:**\n🔮 Win Guild Boss fights (1-3+ per victory depending on tier)\n🔮 Complete Guild Quests (3-10 per quest)\n🔮 Higher tier bosses = more essence on victory';

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('⚔️ Boss Skills Shop')
      .setDescription(
        `Unlock boss-only skills for guild boss fights.\n\n` +
        `**Your Gold:** ${player.gold.toLocaleString()}g\n` +
        `**Boss Essence:** ${bossEssenceCount}\n\n` +
        `_Select a skill below to view details_\n\n` +
        essenceInfo
      );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-bosses')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  },

  async handleGuildBossSkillDetail(interaction, player, skillId) {
    const bossEssenceId = 'boss_essence';
    const items = this.getBossSkillShopItems();
    const item = items.find(s => s.id === skillId);
    const owned = new Set(player.bossSkills || []);

    if (!item) {
      await interaction.reply({ content: '❌ Invalid skill!', ephemeral: true });
      return;
    }

    const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
    const canAfford = !owned.has(item.id) && player.gold >= item.costGold && bossEssenceCount >= item.costEssence;
    const isOwned = owned.has(item.id);

    const skillDescriptions = {
      slash: 'A basic melee slash technique. Deals moderate physical damage.',
      fireball: 'Hurl a fireball at your enemy. Deals fire damage.',
      whirlwind: 'Spin rapidly while attacking all nearby enemies. Deals area damage.',
      meteor: 'Rain down meteors from the sky. Deals massive area damage.',
    };

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle(`⚔️ Skill: ${item.name}`)
      .setDescription(
        `${skillDescriptions[item.id] || 'A powerful boss skill.'}\n\n` +
        `**Cost:** ${item.costGold}g + ${item.costEssence} Boss Essence\n` +
        `**Status:** ${isOwned ? '✅ Owned' : '🔒 Not Owned'}\n\n` +
        `**Your Resources:**\n` +
        `💰 Gold: ${player.gold.toLocaleString()}g ${player.gold >= item.costGold || isOwned ? '✅' : '❌'}\n` +
        `🔮 Boss Essence: ${bossEssenceCount} ${bossEssenceCount >= item.costEssence || isOwned ? '✅' : '❌'}`
      );

    const buyButton = new ButtonBuilder()
      .setCustomId(`rpg-guild-boss-buy-skill-${item.id}`)
      .setLabel(isOwned ? 'Already Owned' : `Purchase ${item.name}`)
      .setStyle(isOwned ? ButtonStyle.Secondary : (canAfford ? ButtonStyle.Success : ButtonStyle.Secondary))
      .setDisabled(isOwned || !canAfford);

    const backButton = new ButtonBuilder()
      .setCustomId('rpg-guild-boss-skills-shop')
      .setLabel('← Back to Skills')
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(buyButton, backButton);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttonRow],
    });
  },

  async handleGuildBossTalentsShop(interaction, player) {
    const bossEssenceId = 'boss_essence';
    const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
    const items = this.getBossTalentShopItems();
    const bossTalents = player.bossTalents || {};

    const selectOptions = items.map(item => ({
      label: `${item.name} (Rank: ${bossTalents[item.id] || 0})`,
      value: item.id,
      description: `${item.description} | Cost: ${item.costGold}g + ${item.costEssence} Essence`,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-guild-boss-talents-select')
      .setPlaceholder('Select a talent to upgrade')
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const essenceInfo = '**How to Get Boss Essence:**\n🔮 Win Guild Boss fights (1-3+ per victory depending on tier)\n🔮 Complete Guild Quests (3-10 per quest)\n🔮 Higher tier bosses = more essence on victory';

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🌟 Boss Talents Shop')
      .setDescription(
        `Upgrade boss-only talents for guild boss fights.\n\n` +
        `**Your Gold:** ${player.gold.toLocaleString()}g\n` +
        `**Boss Essence:** ${bossEssenceCount}\n\n` +
        `_Select a talent below to view details and upgrade_\n\n` +
        essenceInfo
      );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-bosses')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  },

  async handleGuildBossTalentDetail(interaction, player, talentId) {
    const bossEssenceId = 'boss_essence';
    const items = this.getBossTalentShopItems();
    const item = items.find(t => t.id === talentId);
    const bossTalents = player.bossTalents || {};
    const currentRank = bossTalents[item.id] || 0;

    if (!item) {
      await interaction.reply({ content: '❌ Invalid talent!', ephemeral: true });
      return;
    }

    const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
    const canAfford = player.gold >= item.costGold && bossEssenceCount >= item.costEssence;

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`🌟 Talent: ${item.name}`)
      .setDescription(
        `**Effect:** ${item.description}\n\n` +
        `**Current Rank:** ${currentRank}\n` +
        `**Next Rank:** ${currentRank + 1}\n\n` +
        `**Upgrade Cost:** ${item.costGold}g + ${item.costEssence} Boss Essence\n\n` +
        `**Your Resources:**\n` +
        `💰 Gold: ${player.gold.toLocaleString()}g ${player.gold >= item.costGold ? '✅' : '❌'}\n` +
        `🔮 Boss Essence: ${bossEssenceCount} ${bossEssenceCount >= item.costEssence ? '✅' : '❌'}`
      );

    const buyButton = new ButtonBuilder()
      .setCustomId(`rpg-guild-boss-buy-talent-${item.id}`)
      .setLabel(`Upgrade to Rank ${currentRank + 1}`)
      .setStyle(canAfford ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!canAfford);

    const backButton = new ButtonBuilder()
      .setCustomId('rpg-guild-boss-talents-shop')
      .setLabel('← Back to Talents')
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(buyButton, backButton);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttonRow],
    });
  },

  async handleGuildBossEnchantsShop(interaction, player) {
    const bossEssenceId = 'boss_essence';
    const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
    const items = this.getBossEnchantShopItems();
    const unlocked = new Set(player.bossEnchantRecipesUnlocked || []);

    const selectOptions = items.map(item => ({
      label: `${item.name} ${unlocked.has(item.id) ? '(Unlocked)' : ''}`,
      value: item.id,
      description: `Cost: ${item.costGold}g + ${item.costEssence} Essence`,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-guild-boss-enchants-select')
      .setPlaceholder('Select a recipe to view')
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const essenceInfo = '**How to Get Boss Essence:**\n🔮 Win Guild Boss fights (1-3+ per victory depending on tier)\n🔮 Complete Guild Quests (3-10 per quest)\n🔮 Higher tier bosses = more essence on victory';

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('✨ Boss Enchant Recipes')
      .setDescription(
        `Unlock high-tier boss damage enchant recipes.\n\n` +
        `**Your Gold:** ${player.gold.toLocaleString()}g\n` +
        `**Boss Essence:** ${bossEssenceCount}\n\n` +
        `_Select a recipe below to view details_\n\n` +
        essenceInfo
      );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-bosses')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  },

  async handleGuildBossEnchantDetail(interaction, player, recipeId) {
    const bossEssenceId = 'boss_essence';
    const items = this.getBossEnchantShopItems();
    const item = items.find(e => e.id === recipeId);
    const unlocked = new Set(player.bossEnchantRecipesUnlocked || []);

    if (!item) {
      await interaction.reply({ content: '❌ Invalid recipe!', ephemeral: true });
      return;
    }

    const bossEssenceCount = this.getMaterialCount(player, bossEssenceId);
    const canAfford = !unlocked.has(item.id) && player.gold >= item.costGold && bossEssenceCount >= item.costEssence;
    const isUnlocked = unlocked.has(item.id);

    const enchantDescriptions = {
      boss_damage_enchant_t4: 'Epic-tier damage enchantment for boss-specific weapons. Increases damage output by 30%.',
      boss_damage_enchant_t5: 'Legendary-tier damage enchantment for boss-specific weapons. Increases damage output by 50%.',
    };

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle(`✨ Recipe: ${item.name}`)
      .setDescription(
        `${enchantDescriptions[item.id] || 'A powerful enchant recipe.'}\n\n` +
        `**Cost:** ${item.costGold}g + ${item.costEssence} Boss Essence\n` +
        `**Status:** ${isUnlocked ? '✅ Unlocked' : '🔒 Not Unlocked'}\n\n` +
        `**Your Resources:**\n` +
        `💰 Gold: ${player.gold.toLocaleString()}g ${player.gold >= item.costGold || isUnlocked ? '✅' : '❌'}\n` +
        `🔮 Boss Essence: ${bossEssenceCount} ${bossEssenceCount >= item.costEssence || isUnlocked ? '✅' : '❌'}`
      );

    const buyButton = new ButtonBuilder()
      .setCustomId(`rpg-guild-boss-buy-enchant-${item.id}`)
      .setLabel(isUnlocked ? 'Already Unlocked' : `Unlock Recipe`)
      .setStyle(isUnlocked ? ButtonStyle.Secondary : (canAfford ? ButtonStyle.Success : ButtonStyle.Secondary))
      .setDisabled(isUnlocked || !canAfford);

    const backButton = new ButtonBuilder()
      .setCustomId('rpg-guild-boss-enchants-shop')
      .setLabel('← Back to Enchants')
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(buyButton, backButton);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttonRow],
    });
  },

  async handleGuildBossCombatTurn(interaction, player, action) {
    const combatState = this.combatSystem.getActiveCombat(player.userId);
    if (!combatState || combatState.meta?.type !== 'guild_boss') return false;

    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild || !guild.activeBoss || guild.activeBoss.bossId !== combatState.meta.bossId) {
      this.combatSystem.forceEndCombat(player.userId);
      this.restoreBossBattleSnapshot(player);
      this.persistPlayer(player);
      await interaction.reply({ content: '❌ No active guild boss fight found.', ephemeral: true });
      return true;
    }

    const now = Date.now();
    if (guild.activeBoss.expiresAt && now >= guild.activeBoss.expiresAt) {
      const finalResult = this.finalizeGuildBossFight(guild, { reason: 'expired' });
      const summary = this.buildGuildBossCompletionMessage(finalResult, player.userId);
      this.combatSystem.forceEndCombat(player.userId);
      this.restoreBossBattleSnapshot(player);
      this.persistPlayer(player);
      const expiredEmbed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('⏰ Boss Expired')
        .setDescription(summary);
      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-guild-bosses')
          .setLabel('🔄 Back to Bosses')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-guild')
          .setLabel('← Back to Guild')
          .setStyle(ButtonStyle.Secondary)
      );
      await this.updateInteractionWithTracking(interaction, {
        embeds: [expiredEmbed],
        components: [backRow],
      });
      return true;
    }

    const triesLeft = this.getGuildBossAttemptsLeft(player, now);
    if (triesLeft <= 0) {
      await interaction.reply({
        content: `❌ No guild boss tries left. Reset in ${this.formatTimeUntil(player.guildBossAttemptResetAt, now)}.`,
        ephemeral: true,
      });
      return true;
    }

    this.syncGuildBossCombatState(combatState, guild.activeBoss);
    const preHp = combatState.enemy.hp;

    let result = null;
    if (action.type === 'skill') {
      result = this.combatSystem.executeRoundWithSkill(player.userId, action.skillId);
    } else if (action.type === 'stance') {
      result = this.combatSystem.executeRoundWithStance(player.userId, action.stanceId);
    } else if (action.type === 'switch') {
      result = this.combatSystem.executeRoundWithSwitch(player.userId, action.switchIndex);
    } else if (action.type === 'gear') {
      const equipmentSet = player.equipmentSets?.[action.setIndex];
      if (!equipmentSet || !equipmentSet.items) {
        await interaction.reply({ content: 'Equipment set not found.', ephemeral: true });
        return true;
      }
      player.equippedItems = { ...equipmentSet.items };
      player.clearStatsCache();
      if (combatState.player) {
        combatState.player.equippedItems = { ...equipmentSet.items };
        if (combatState.player.clearStatsCache) {
          combatState.player.clearStatsCache();
        }
      }
      result = this.combatSystem.executeRound(player.userId);
    } else {
      result = this.combatSystem.executeRound(player.userId);
    }

    if (result?.error) {
      await interaction.reply({ content: result.error, ephemeral: true });
      return true;
    }

    if (result?.status === 'error') {
      await interaction.reply({ content: result.error || 'Action cannot be used.', ephemeral: true });
      return true;
    }

    const postHp = result?.combatState?.enemyStatus?.hp ?? result?.enemy?.hp ?? combatState.enemy.hp;
    const damageDealt = Math.max(0, Math.floor(preHp - postHp));
    const applyResult = this.guildManager.applyBossDamage(guild.id, player.userId, damageDealt);
    if (!applyResult.success) {
      await interaction.reply({ content: `❌ ${applyResult.error}`, ephemeral: true });
      return true;
    }

    combatState.enemy.hp = applyResult.bossHP;
    combatState.enemy.maxHp = applyResult.bossMaxHP;
    if (result?.combatState?.enemyStatus) {
      result.combatState.enemyStatus.hp = applyResult.bossHP;
      result.combatState.enemyStatus.maxHp = applyResult.bossMaxHP;
    }

    if (applyResult.defeated) {
      this.combatSystem.forceEndCombat(player.userId);
      this.restoreBossBattleSnapshot(player);
      this.trackCombatResult(player, combatState.enemy?.name || 'Guild Boss', 'victory', 'guildBoss');
      this.persistPlayer(player);
      const finalResult = this.finalizeGuildBossFight(guild, { reason: 'defeated' });
      const summary = this.buildGuildBossCompletionMessage(finalResult, player.userId);
      const victoryEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🎉 Guild Boss Defeated!')
        .setDescription(summary);
      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-guild-bosses')
          .setLabel('🔄 Back to Bosses')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-guild')
          .setLabel('← Back to Guild')
          .setStyle(ButtonStyle.Secondary)
      );
      await this.updateInteractionWithTracking(interaction, {
        embeds: [victoryEmbed],
        components: [backRow],
      });
      return true;
    }

    if (result?.status === 'ongoing') {
      const embed = UIBuilder.createCombatStateEmbed(result.combatState);
      const buttons = this.createGuildBossCombatButtons();
      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: buttons,
      });
      return true;
    }

    if (result?.status === 'defeat') {
      // Record this defeat (consumes 1 attempt)
      this.guildManager.recordBossDefeat(guild.id, player.userId);
      this.trackCombatResult(player, combatState.enemy?.name || 'Guild Boss', 'defeat', 'guildBoss');
      this.trackDeath(player, combatState.enemy, 'guildBoss');
      
      this.consumeGuildBossAttempt(player, now);
      this.combatSystem.forceEndCombat(player.userId);
      this.restoreBossBattleSnapshot(player);
      this.persistPlayer(player);
      const remainingAttempts = this.guildManager.getRemainingBossAttempts(guild.id, player.userId, 3);
      let defeatText = '💀 You were defeated by the guild boss.';
      if (remainingAttempts > 0) {
        defeatText += ` You have **${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'}** left.`;
      } else {
        defeatText += ' You have no attempts left for this boss cycle.';
      }
      // Show defeat then transition to boss status view
      await this.handleActiveBossFight(interaction, player, guild, defeatText);
      return true;
    }

    return true;
  }

  /**
   * Guild buff management
   */,

  async handleGuildBuffs(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.reply({
        content: '❌ You are not in a guild!',
        ephemeral: true,
      });
      return;
    }

    const member = guild.members[player.userId];
    if (member.role !== 'leader' && member.role !== 'officer') {
      await interaction.reply({
        content: '❌ Only officers and leaders can manage buffs!',
        ephemeral: true,
      });
      return;
    }

    const levelInfo = getGuildLevel(guild.xp);
    const buffs = getGuildBuffs(levelInfo.level, guild.buffs);

    // Create buff overview
    const buffOverview = [
      `📊 **Current Guild Buffs Overview:**`,
      ``,
      `**Progression Buffs:**`,
      `  ⭐ XP Bonus: ${buffs.xpBonus}%`,
      `  💰 Gold Bonus: ${buffs.goldBonus}%`,
      ``,
      `**Gathering & Crafting:**`,
      `  ⛏️ Gathering Speed: ${buffs.gatheringSpeed}%`,
      `  🔨 Crafting Speed: ${buffs.craftingSpeed}%`,
      ``,
      `**Combat & Rewards:**`,
      `  ⚔️ Damage Bonus: ${buffs.damageBonus}%`,
      `  🛡️ Defense Bonus: ${buffs.defenseBonus}%`,
      `  🐉 Boss Reward Boost: ${buffs.bossRewardBoost}%`,
      ``,
      `**Special:**`,
      `  ✨ Rare Drop Rate: +${buffs.rareDropRate}%`,
      `  🏪 Shop Discount: ${buffs.shopDiscount}%`,
    ].join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('✨ Guild Buffs Management')
      .setDescription(buffOverview)
      .addFields(
        { name: '💰 Guild Treasury', value: `${guild.gold.toLocaleString()}g`, inline: true },
        { name: '🎯 Guild Level', value: `${levelInfo.level} / 50`, inline: true }
      );

    // Create selector for buff overview
    const row1 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-guild-buff-overview')
        .setPlaceholder('📋 View detailed buff info')
        .addOptions(
          { label: '⭐ XP Bonus', value: 'xp_info', description: `Current: ${buffs.xpBonus}% | Max Cap: 50%` },
          { label: '💰 Gold Bonus', value: 'gold_info', description: `Current: ${buffs.goldBonus}% | Max Cap: 50%` },
          { label: '🛒 Shop Discount', value: 'shop_info', description: `Current: ${buffs.shopDiscount}% | Max Cap: 30%` },
          { label: '⛏️ Gathering Speed', value: 'gathering_info', description: `Current: ${buffs.gatheringSpeed}% | Max Cap: 70%` },
          { label: '🔨 Crafting Speed', value: 'crafting_info', description: `Current: ${buffs.craftingSpeed}% | Max Cap: 45%` },
          { label: '🐉 Boss Reward Boost', value: 'boss_info', description: `Current: ${buffs.bossRewardBoost}% | Max Cap: 40%` }
        )
    );

    const row2 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-guild-buff-purchase')
        .setPlaceholder('💳 Select buff to purchase')
        .addOptions(
          { label: `⭐ XP (${GUILD_BUFF_COSTS.xpBonus.toLocaleString()}g)`, value: 'buy_xp', description: `${buffs.xpBonus}% → ${Math.min(buffs.xpBonus + 1, 50)}%` },
          { label: `💰 Gold (${GUILD_BUFF_COSTS.goldBonus.toLocaleString()}g)`, value: 'buy_gold', description: `${buffs.goldBonus}% → ${Math.min(buffs.goldBonus + 1, 50)}%` },
          { label: `🛒 Shop (${GUILD_BUFF_COSTS.shopDiscount.toLocaleString()}g)`, value: 'buy_shop', description: `${buffs.shopDiscount}% → ${Math.min(buffs.shopDiscount + 1, 30)}%` },
          { label: `⛏️ Gathering (${GUILD_BUFF_COSTS.gatheringSpeed.toLocaleString()}g)`, value: 'buy_gathering', description: `${buffs.gatheringSpeed}% → ${Math.min(buffs.gatheringSpeed + 1, 70)}%` },
          { label: `🔨 Crafting (${GUILD_BUFF_COSTS.craftingSpeed.toLocaleString()}g)`, value: 'buy_crafting', description: `${buffs.craftingSpeed}% → ${Math.min(buffs.craftingSpeed + 1, 45)}%` },
          { label: `🐉 Boss Reward (${GUILD_BUFF_COSTS.bossRewardBoost.toLocaleString()}g)`, value: 'buy_boss', description: `${buffs.bossRewardBoost}% → ${Math.min(buffs.bossRewardBoost + 1, 40)}%` }
        )
    );

    const row3 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-guild-buff-purchase2')
        .setPlaceholder('💳 Select more buffs to purchase')
        .addOptions(
          { label: `✨ Rare Drop (${GUILD_BUFF_COSTS.rareDropRate.toLocaleString()}g)`, value: 'buy_rare', description: `${buffs.rareDropRate}% → ${Math.min(buffs.rareDropRate + 1, 15)}%` },
          { label: `⚔️ Damage (${GUILD_BUFF_COSTS.damageBonus.toLocaleString()}g)`, value: 'buy_damage', description: `${buffs.damageBonus}% → ${Math.min(buffs.damageBonus + 1, 30)}%` },
          { label: `🛡️ Defense (${GUILD_BUFF_COSTS.defenseBonus.toLocaleString()}g)`, value: 'buy_defense', description: `${buffs.defenseBonus}% → ${Math.min(buffs.defenseBonus + 1, 30)}%` }
        )
    );

    const row4 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-donate')
        .setLabel('💰 Donate Gold')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2, row3, row4],
    });
  }

  /**
   * Show detailed buff information
   */,

  async handleGuildBuffOverview(interaction, player, buffType) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
      return;
    }

    const levelInfo = getGuildLevel(guild.xp);
    const buffs = getGuildBuffs(levelInfo.level, guild.buffs);

    const buffInfo = {
      xp_info: {
        name: '⭐ XP Bonus',
        current: buffs.xpBonus,
        max: 50,
        description: 'Increases experience earned from all sources',
        benefits: '• Faster leveling\n• Accelerates skill progression\n• Speeds up achievement unlocks',
        cost: GUILD_BUFF_COSTS.xpBonus,
      },
      gold_info: {
        name: '💰 Gold Bonus',
        current: buffs.goldBonus,
        max: 50,
        description: 'Increases gold earned from combat, quests, and activities',
        benefits: '• More gold for purchasing items\n• Faster buff purchasing\n• Better vault expansion funds',
        cost: GUILD_BUFF_COSTS.goldBonus,
      },
      shop_info: {
        name: '🛒 Shop Discount',
        current: buffs.shopDiscount,
        max: 30,
        description: 'Reduces prices in all guild shops',
        benefits: '• Lower item costs\n• Save gold on equipment\n• Better deals on consumables',
        cost: GUILD_BUFF_COSTS.shopDiscount,
      },
      gathering_info: {
        name: '⛏️ Gathering Speed',
        current: buffs.gatheringSpeed,
        max: 70,
        description: 'Increases gathering speed and material acquisition rate',
        benefits: '• Faster material gathering\n• More items per gathering session\n• Speeds up crafting prep',
        cost: GUILD_BUFF_COSTS.gatheringSpeed,
      },
      crafting_info: {
        name: '🔨 Crafting Speed',
        current: buffs.craftingSpeed,
        max: 45,
        description: 'Reduces crafting time for all recipes',
        benefits: '• Faster crafting times\n• More items crafted per session\n• Improved production efficiency',
        cost: GUILD_BUFF_COSTS.craftingSpeed,
      },
      boss_info: {
        name: '🐉 Boss Reward Boost',
        current: buffs.bossRewardBoost,
        max: 40,
        description: 'Increases rewards from boss encounters',
        benefits: '• More gold from bosses\n• Increased item drop rates\n• Enhanced boss XP rewards',
        cost: GUILD_BUFF_COSTS.bossRewardBoost,
      },
    };

    const info = buffInfo[buffType];
    if (!info) {
      await interaction.reply({ content: '❌ Invalid buff type.', ephemeral: true });
      return;
    }

    const progressBar = this.buildProgressBar(info.current, info.max, 15);
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`${info.name} Details`)
      .setDescription(info.description)
      .addFields(
        { name: '📊 Progress', value: `${info.current}% / ${info.max}%\n${progressBar}`, inline: false },
        { name: '✨ Benefits', value: info.benefits, inline: false },
        { name: '💳 Purchase Cost', value: `${info.cost.toLocaleString()}g per +1%`, inline: true },
        { name: '💰 Guild Treasury', value: `${guild.gold.toLocaleString()}g`, inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rpg-guild-buy-buff-${buffType.split('_')[0]}`)
        .setLabel(`Purchase +1% (${info.cost.toLocaleString()}g)`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(guild.gold < info.cost || info.current >= info.max),
      new ButtonBuilder()
        .setCustomId('rpg-guild-buffs')
        .setLabel('← Back to Buffs')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      embeds: [embed],
      components: [row],
    });
  }

  /**
   * Handle buff purchase from selector menu - show quantity options
   */,

  async handleGuildBuffPurchaseFromSelector(interaction, player, action) {
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

    const buffMap = {
      'buy_xp': 'xpBonus',
      'buy_gold': 'goldBonus',
      'buy_shop': 'shopDiscount',
      'buy_gathering': 'gatheringSpeed',
      'buy_crafting': 'craftingSpeed',
      'buy_boss': 'bossRewardBoost',
      'buy_rare': 'rareDropRate',
      'buy_damage': 'damageBonus',
      'buy_defense': 'defenseBonus',
    };

    const buffKey = buffMap[action];
    if (!buffKey) {
      await interaction.reply({ content: '❌ Invalid buff type.', ephemeral: true });
      return;
    }

    const cost = GUILD_BUFF_COSTS[buffKey];
    if (!cost) {
      await interaction.reply({ content: '❌ This buff cannot be purchased.', ephemeral: true });
      return;
    }

    const levelInfo = getGuildLevel(guild.xp);
    const buffs = getGuildBuffs(levelInfo.level, guild.buffs);
    
    const buffCaps = {
      xpBonus: 50,
      goldBonus: 50,
      shopDiscount: 30,
      gatheringSpeed: 70,
      craftingSpeed: 45,
      bossRewardBoost: 40,
      rareDropRate: 15,
      damageBonus: 30,
      defenseBonus: 30,
    };

    const currentLevel = buffs[buffKey] || 0;
    const maxLevel = buffCaps[buffKey] || 50;
    const remainingCapacity = maxLevel - currentLevel;
    
    // Calculate max buyable with current gold
    const maxBuysWithGold = Math.floor(guild.gold / cost);
    const maxBuys = Math.min(maxBuysWithGold, remainingCapacity);

    if (maxBuys <= 0) {
      await interaction.reply({ 
        content: `❌ Cannot purchase! ${remainingCapacity === 0 ? 'Buff is maxed out.' : 'Not enough guild gold.'}`, 
        ephemeral: true 
      });
      return;
    }

    const buffNames = {
      xpBonus: '⭐ XP Bonus',
      goldBonus: '💰 Gold Bonus',
      shopDiscount: '🛒 Shop Discount',
      gatheringSpeed: '⛏️ Gathering Speed',
      craftingSpeed: '🔨 Crafting Speed',
      bossRewardBoost: '🐉 Boss Reward Boost',
      rareDropRate: '✨ Rare Drop Rate',
      damageBonus: '⚔️ Damage Bonus',
      defenseBonus: '🛡️ Defense Bonus',
    };

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle(`${buffNames[buffKey]} - Purchase Quantity`)
      .setDescription(
        `**Current Level:** ${currentLevel}%\n` +
        `**Maximum Level:** ${maxLevel}%\n` +
        `**Upgrade Cost:** ${cost.toLocaleString()}g per +1%\n` +
        `**Guild Gold:** ${guild.gold.toLocaleString()}g\n\n` +
        `**Available Options:**\n` +
        `• **Buy 1×**: ${cost.toLocaleString()}g\n` +
        `• **Buy 10×**: ${(cost * Math.min(10, maxBuys)).toLocaleString()}g\n` +
        `• **Buy 25×**: ${(cost * Math.min(25, maxBuys)).toLocaleString()}g\n` +
        `• **Buy Max**: ${(cost * maxBuys).toLocaleString()}g (${maxBuys}× levels)`
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rpg-guild-buff-buy-qty-${action}-1`)
        .setLabel(`1×`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`rpg-guild-buff-buy-qty-${action}-10`)
        .setLabel(`10×`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(maxBuys < 10),
      new ButtonBuilder()
        .setCustomId(`rpg-guild-buff-buy-qty-${action}-25`)
        .setLabel(`25×`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(maxBuys < 25),
      new ButtonBuilder()
        .setCustomId(`rpg-guild-buff-buy-qty-${action}-${maxBuys}`)
        .setLabel(`Max (${maxBuys}×)`)
        .setStyle(ButtonStyle.Success)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-buffs')
        .setLabel('← Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      embeds: [embed],
      components: [row1, row2],
    });
  }

  /**
   * Execute bulk buff purchase
   */,

  async handleGuildBuffBulkPurchase(interaction, player, action, quantity) {
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

    const buffMap = {
      'buy_xp': 'xpBonus',
      'buy_gold': 'goldBonus',
      'buy_shop': 'shopDiscount',
      'buy_gathering': 'gatheringSpeed',
      'buy_crafting': 'craftingSpeed',
      'buy_boss': 'bossRewardBoost',
      'buy_rare': 'rareDropRate',
      'buy_damage': 'damageBonus',
      'buy_defense': 'defenseBonus',
    };

    const buffKey = buffMap[action];
    if (!buffKey) {
      await interaction.reply({ content: '❌ Invalid buff type.', ephemeral: true });
      return;
    }

    const cost = GUILD_BUFF_COSTS[buffKey];
    const totalCost = cost * quantity;

    if (guild.gold < totalCost) {
      await interaction.reply({ content: `❌ Not enough guild gold! Need ${totalCost.toLocaleString()}g.`, ephemeral: true });
      return;
    }

    // Purchase each level
    let purchased = 0;
    for (let i = 0; i < quantity; i++) {
      const result = this.guildManager.purchaseBuff(guild.id, player.userId, buffKey, cost);
      if (!result.success) {
        break; // Stop if we hit the cap
      }
      purchased++;
    }

    const buffNames = {
      xpBonus: '⭐ XP Bonus',
      goldBonus: '💰 Gold Bonus',
      shopDiscount: '🛒 Shop Discount',
      gatheringSpeed: '⛏️ Gathering Speed',
      craftingSpeed: '🔨 Crafting Speed',
      bossRewardBoost: '🐉 Boss Reward Boost',
      rareDropRate: '✨ Rare Drop Rate',
      damageBonus: '⚔️ Damage Bonus',
      defenseBonus: '🛡️ Defense Bonus',
    };

    await interaction.reply({
      content: `✅ Purchased +${purchased}% **${buffNames[buffKey]}** for ${(cost * purchased).toLocaleString()}g!`,
      ephemeral: true,
    });

    setTimeout(() => {
      interaction.deleteReply().catch(() => {});
    }, 5000);

    // Refresh buffs page
    setTimeout(() => {
      this.handleGuildBuffs(interaction, player);
    }, 1000);
  }

  /**
   * Guild leave confirmation
   */,

  async handleGuildLeaveConfirm(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.reply({
        content: '❌ You are not in a guild!',
        ephemeral: true,
      });
      return;
    }

    const member = guild.members[player.userId];
    const isLeader = member.role === 'leader';

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(isLeader ? '⚠️ Disband/Leave Guild' : '🚪 Leave Guild')
      .setDescription(
        isLeader 
          ? `Are you sure you want to leave **[${guild.tag}] ${guild.name}**?\n\n` +
            `⚠️ **Warning:** As the guild leader, if you leave and there are other members, you must transfer leadership first. If you are the only member, the guild will be disbanded.`
          : `Are you sure you want to leave **[${guild.tag}] ${guild.name}**?\n\n` +
            `You will lose access to guild buffs and features.`
      );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-leave-confirm')
        .setLabel('✅ Yes, Leave Guild')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Guild settings (placeholder)
   */,

  async handleGuildSettings(interaction, player) {
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
        content: '❌ Only the guild leader can access settings!',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle('⚙️ Guild Settings')
      .setDescription(
        `Manage your guild's settings below.\n\n` +
        `**Public Listing:** ${guild.settings.isPublic ? '✅ Enabled' : '❌ Disabled'}\n` +
        `└ ${guild.settings.isPublic ? 'Guild appears in public search' : 'Guild is invite-only'}\n\n` +
        `**Minimum Level:** ${guild.settings.minLevel}\n` +
        `└ Required level to join this guild\n\n` +
        `**Application Required:** ${guild.settings.requireApplication ? '✅ Enabled' : '❌ Disabled'}\n` +
        `└ ${guild.settings.requireApplication ? 'Players must apply to join' : 'Players can join directly'}`
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-toggle-public')
        .setLabel(guild.settings.isPublic ? 'Make Private' : 'Make Public')
        .setStyle(guild.settings.isPublic ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('rpg-guild-toggle-application')
        .setLabel(guild.settings.requireApplication ? 'Disable Applications' : 'Require Applications')
        .setStyle(guild.settings.requireApplication ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setEmoji('📝')
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-set-minlevel')
        .setLabel('Set Min Level')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊'),
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2],
    });
  }

  /**
   * Toggle guild public/private status
   */,

  async handleGuildTogglePublic(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
      return;
    }

    const member = guild.members[player.userId];
    if (member.role !== 'leader') {
      await interaction.reply({ content: '❌ Only the guild leader can change settings!', ephemeral: true });
      return;
    }

    // Toggle the public setting
    guild.settings.isPublic = !guild.settings.isPublic;
    this.guildManager.save();

    await interaction.reply({
      content: `✅ Guild is now ${guild.settings.isPublic ? '**public**' : '**private (invite-only)**'}!`,
      ephemeral: true
    });

    // Refresh settings view
    setTimeout(() => {
      this.handleGuildSettings(interaction, player);
    }, 1000);
  }

  /**
   * Toggle guild application requirement
   */,

  async handleGuildToggleApplication(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.reply({ content: '❌ You are not in a guild!', ephemeral: true });
      return;
    }

    const member = guild.members[player.userId];
    if (member.role !== 'leader') {
      await interaction.reply({ content: '❌ Only the guild leader can change settings!', ephemeral: true });
      return;
    }

    // Toggle the application requirement
    guild.settings.requireApplication = !guild.settings.requireApplication;
    this.guildManager.save();

    await interaction.reply({
      content: `✅ Applications are now ${guild.settings.requireApplication ? '**required**' : '**not required**'}!`,
      ephemeral: true
    });

    // Refresh settings view
    setTimeout(() => {
      this.handleGuildSettings(interaction, player);
    }, 1000);
  }

  /**
   * Handle unified guild management (Members, Roles, Settings)
   */,

  async handleGuildManagement(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    if (!guild) {
      await interaction.reply({
        content: '❌ You are not in a guild!',
        ephemeral: true,
      });
      return;
    }

    const member = guild.members[player.userId];
    const isLeader = member.role === 'leader';
    const isOfficer = member.role === 'officer' || isLeader;

    // Build members list
    const membersList = Object.values(guild.members)
      .sort((a, b) => {
        const roleOrder = { leader: 0, officer: 1, member: 2 };
        return roleOrder[a.role] - roleOrder[b.role];
      })
      .map(m => {
        const roleIcon = m.role === 'leader' ? '👑' : m.role === 'officer' ? '⭐' : '👤';
        return `${roleIcon} ${m.userId === player.userId ? '**You**' : `<@${m.userId}>`} (${m.contributedXP} XP | ${m.contributedGold}g)`;
      })
      .join('\n');

    // Organize members by role
    const allMembers = Object.values(guild.members);
    const leaders = allMembers.filter(m => m.role === 'leader');
    const officers = allMembers.filter(m => m.role === 'officer');
    const regularMembers = allMembers.filter(m => m.role === 'member');

    // Build settings display
    const settingsDisplay = 
      `**Public Listing:** ${guild.settings.isPublic ? '✅' : '❌'}\n` +
      `**Minimum Level:** ${guild.settings.minLevel}\n` +
      `**Application Required:** ${guild.settings.requireApplication ? '✅' : '❌'}`;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`📋 [${guild.tag}] Guild Management Center`)
      .setDescription('View and manage members, roles, and guild settings in one place.')
      .addFields(
        {
          name: '👥 Members by Role',
          value: 
            `**👑 Leaders (${leaders.length}):** ${leaders.map(m => `<@${m.userId}>`).join(', ') || 'None'}\n` +
            `**⭐ Officers (${officers.length}):** ${officers.map(m => `<@${m.userId}>`).join(', ') || 'None'}\n` +
            `**👤 Members (${regularMembers.length}):** ${regularMembers.length > 0 ? `${regularMembers.length} members` : 'None'}`,
          inline: false
        },
        {
          name: '⚙️ Guild Settings',
          value: settingsDisplay,
          inline: false
        },
        {
          name: '📌 Quick Actions',
          value: isOfficer 
            ? '✅ You can manage members and roles\n' + (isLeader ? '✅ You can change guild settings' : '')
            : '👁️ You can view member information (Read-only)',
          inline: false
        }
      )
      .setFooter({ text: isOfficer ? 'Officers+ can manage. Leaders can change settings.' : 'You have read-only access' });

    const components = [];

    // Member selector for role management (only if officer)
    if (isOfficer) {
      const memberOptions = [];
      const membersToShow = allMembers.filter(m => m.userId !== player.userId).slice(0, 25);
      
      for (const m of membersToShow) {
        try {
          const user = await this.client.users.fetch(m.userId);
          const roleIcon = m.role === 'leader' ? '👑' : m.role === 'officer' ? '⭐' : '👤';
          memberOptions.push({
            label: `${roleIcon} ${user.username}`,
            value: m.userId,
            description: `Role: ${m.role}`,
          });
        } catch (err) {
          memberOptions.push({
            label: `User ${m.userId}`,
            value: m.userId,
            description: `Role: ${m.role}`,
          });
        }
      }

      if (memberOptions.length > 0) {
        components.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('rpg-guild-manage-member-role')
            .setPlaceholder('Select a member to manage role/actions')
            .addOptions(memberOptions)
        ));
      }
    }

    // Settings management buttons (only for leader)
    if (isLeader) {
      const settingsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-guild-toggle-public')
          .setLabel(guild.settings.isPublic ? '🔒 Make Private' : '🔓 Make Public')
          .setStyle(guild.settings.isPublic ? ButtonStyle.Secondary : ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rpg-guild-toggle-application')
          .setLabel(guild.settings.requireApplication ? '📝 Disable Apps' : '📝 Require Apps')
          .setStyle(guild.settings.requireApplication ? ButtonStyle.Secondary : ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-guild-set-minlevel')
          .setLabel('📊 Min Level')
          .setStyle(ButtonStyle.Primary)
      );
      components.push(settingsRow);
    }

    // Back button
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('← Back to Guild')
        .setStyle(ButtonStyle.Secondary)
    ));

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Check and reset daily/weekly quests
   */,

  async handleGuildQuestsMenu(interaction, player) {
    const embed = new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('📜 Guild Quests')
      .setDescription('Select the type of quests you want to complete.')
      .addFields(
        { name: '📅 Daily Quests', value: 'Reset every 24 hours. Great for consistent rewards!', inline: false },
        { name: '📆 Weekly Quests', value: 'Reset every 7 days. Higher rewards for more commitment.', inline: false },
        { name: '⚡ Limited Quests', value: 'First-come first-served. Exclusive rewards for the quick!', inline: false }
      );

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-guild-quests-select')
        .setPlaceholder('Select Quest Type')
        .addOptions(
          {
            label: 'Daily Quests',
            value: 'daily',
            emoji: '📅',
            description: 'Reset every 24 hours'
          },
          {
            label: 'Weekly Quests',
            value: 'weekly',
            emoji: '📆',
            description: 'Reset every 7 days'
          },
          {
            label: 'Limited Quests',
            value: 'limited',
            emoji: '⚡',
            description: 'First-come first-served'
          }
        )
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row, backRow],
    });
  }

  /**
   * Handle guild daily quests
   */,

  async handleGuildDailyQuests(interaction, player) {
    // Check for quest resets
    this.checkQuestResets(player);
    
    const dailyQuests = getAvailableDailyQuests(player.level, player.dailyQuestsCompleted);
    
    // Calculate time until next synchronized daily reset (UTC midnight)
    const now = Date.now();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    const todayMidnight = today.getTime();
    const tomorrowMidnight = todayMidnight + (24 * 60 * 60 * 1000);
    const timeUntilReset = Math.max(0, tomorrowMidnight - now);
    const hoursUntilReset = Math.floor(timeUntilReset / (60 * 60 * 1000));
    const minutesUntilReset = Math.floor((timeUntilReset % (60 * 60 * 1000)) / (60 * 1000));
    
    let descriptionBase = 'Complete daily quests to earn Guild XP and rewards!\n';
    if (dailyQuests.length > 0) {
      descriptionBase += `⏱️ **Reset in:** ${hoursUntilReset}h ${minutesUntilReset}m`;
    } else {
      descriptionBase += `✅ All daily quests completed!\n⏱️ **Next reset in:** ${hoursUntilReset}h ${minutesUntilReset}m`;
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📅 Daily Quests')
      .setDescription(descriptionBase)
      .setTimestamp();

    if (dailyQuests.length > 0) {
      dailyQuests.forEach(quest => {
        const progressLine = this.getGuildQuestProgressLine(player, quest);
        const progressText = progressLine ? `\n${progressLine}` : '';
        const rewards = quest.rewards || {};
        const guildXp = Number.isFinite(rewards.guildXP) ? rewards.guildXP : 0;
        const gold = Number.isFinite(rewards.gold) ? rewards.gold : 0;
        embed.addFields({
          name: `${quest.title}`,
          value: `${quest.description}${progressText}\n**Rewards:** ${guildXp} Guild XP, ${gold}g`,
          inline: false
        });
      });
    } else {
      // Show completed quests with checkmarks
      const allDailyQuests = getAllGuildQuests().daily.filter(q => 
        player.level >= (q.minLevel || 1)
      );
      const completedList = allDailyQuests.filter(q => player.dailyQuestsCompleted.includes(q.id));
      completedList.slice(0, 3).forEach(quest => {
        embed.addFields({
          name: `✅ ${quest.title}`,
          value: `Completed!`,
          inline: false
        });
      });
      if (completedList.length > 3) {
        embed.addFields({
          name: '...',
          value: `+${completedList.length - 3} more completed`,
          inline: false
        });
      }
    }

    const components = [];

    // Add navigation buttons for active quests
    if (dailyQuests.length > 0) {
      const questButtons = [];
      for (const quest of dailyQuests.slice(0, 4)) { // Limit to 4 buttons per row
        const navAction = this.getQuestNavigationAction(quest);
        if (navAction) {
          questButtons.push(new ButtonBuilder()
            .setCustomId(`rpg-quest-navigate-${quest.id}`)
            .setLabel(`${navAction.icon} ${quest.title.slice(0, 30)}`)
            .setStyle(ButtonStyle.Primary)
          );
        }
      }
      if (questButtons.length > 0) {
        // Split into rows of 2-3 buttons
        for (let i = 0; i < questButtons.length; i += 2) {
          components.push(new ActionRowBuilder().addComponents(questButtons.slice(i, i + 2)));
        }
      }
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-quests')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-guild-daily-refresh')
        .setLabel('🔄 Refresh')
        .setStyle(ButtonStyle.Primary)
    );
    components.push(backButton);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Handle guild weekly quests
   */,

  async handleGuildWeeklyQuests(interaction, player) {
    const weeklyQuests = getAvailableWeeklyQuests(player.level, player.weeklyQuestsCompleted);
    
    // Calculate time until next synchronized weekly reset (UTC Sunday midnight)
    const now = Date.now();
    const thisWeek = new Date(now);
    const dayOfWeek = thisWeek.getUTCDay();
    thisWeek.setUTCHours(0, 0, 0, 0);
    thisWeek.setUTCDate(thisWeek.getUTCDate() - dayOfWeek); // Go back to Sunday
    const weekStartMidnight = thisWeek.getTime();
    
    const nextWeekMidnight = weekStartMidnight + (7 * 24 * 60 * 60 * 1000);
    const timeUntilReset = Math.max(0, nextWeekMidnight - now);
    const daysUntilReset = Math.floor(timeUntilReset / (24 * 60 * 60 * 1000));
    const hoursUntilReset = Math.floor((timeUntilReset % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    let descriptionBase = 'Complete weekly quests for bigger rewards!\n';
    if (weeklyQuests.length > 0) {
      descriptionBase += `⏱️ **Reset in:** ${daysUntilReset}d ${hoursUntilReset}h`;
    } else {
      descriptionBase += `✅ All weekly quests completed!\n⏱️ **Next reset in:** ${daysUntilReset}d ${hoursUntilReset}h`;
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📆 Weekly Quests')
      .setDescription(descriptionBase)
      .setTimestamp();

    weeklyQuests.forEach(quest => {
      const progressLine = this.getGuildQuestProgressLine(player, quest);
      const progressText = progressLine ? `\n${progressLine}` : '';
      embed.addFields({
        name: `${quest.title}`,
        value: `${quest.description}${progressText}\n**Rewards:** ${quest.rewards.guildXP} Guild XP, ${quest.rewards.gold}g`,
        inline: false
      });
    });

    const components = [];
    
    // Add navigation buttons
    if (weeklyQuests.length > 0) {
      const questButtons = [];
      for (const quest of weeklyQuests.slice(0, 4)) {
        const navAction = this.getQuestNavigationAction(quest);
        if (navAction) {
          questButtons.push(new ButtonBuilder()
            .setCustomId(`rpg-quest-navigate-${quest.id}`)
            .setLabel(`${navAction.icon} ${quest.title.slice(0, 30)}`)
            .setStyle(ButtonStyle.Primary)
          );
        }
      }
      if (questButtons.length > 0) {
        for (let i = 0; i < questButtons.length; i += 2) {
          components.push(new ActionRowBuilder().addComponents(questButtons.slice(i, i + 2)));
        }
      }
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-quests')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );
    components.push(backButton);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Handle guild limited quests (first-come first-served)
   */,

  async handleGuildLimitedQuests(interaction, player) {
    const limitedQuests = getAvailableLimitedQuests(player.level, player.claimedQuests, player.currentWorld);
    
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('⚡ Limited Quests')
      .setDescription(limitedQuests.length > 0 
        ? '⚠️ First come, first served! Claim these quests before they\'re gone!'
        : '😢 No limited quests available right now. Check back later!')
      .setTimestamp();

    limitedQuests.forEach(quest => {
      const progressLine = this.getGuildQuestProgressLine(player, quest);
      const progressText = progressLine ? `\n${progressLine}` : '';
      const currentClaims = Number(quest.claimedCount ?? quest.currentClaims ?? 0);
      const maxClaims = Number(quest.maxClaims ?? 0);
      
      let rewardsText = `**Rewards:** ${quest.rewards.guildXP} Guild XP, ${quest.rewards.gold}g`;
      if (quest.rewards.materials) {
        const materialsList = Object.entries(quest.rewards.materials)
          .map(([matId, qty]) => {
            const mat = getMaterial(matId);
            return `${mat ? mat.name : matId} x${qty}`;
          })
          .join(', ');
        rewardsText += `, ${materialsList}`;
      }
      
      embed.addFields({
        name: `${quest.title} [${currentClaims}/${maxClaims} claimed]`,
        value: `${quest.description}${progressText}\n${rewardsText}`,
        inline: false
      });
    });

    const components = [];
    
    if (limitedQuests.length > 0) {
      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-guild-claim-limited')
          .setPlaceholder('Select a quest to claim')
          .addOptions(limitedQuests.map(q => ({
            label: q.title,
            value: q.id,
            description: `${q.currentClaims || 0}/${q.maxClaims || 0} claimed`,
          })))
      );
      components.push(selectMenu);
    }

    // Add navigation buttons for claimed (active) limited quests
    const claimedQuests = (player.claimedQuests || [])
      .map(id => getGuildQuestById(id))
      .filter(Boolean)
      .filter(q => !player.limitedQuestsCompleted.includes(q.id));

    if (claimedQuests.length > 0) {
      const questButtons = [];
      for (const quest of claimedQuests.slice(0, 4)) {
        const navAction = this.getQuestNavigationAction(quest);
        if (navAction) {
          questButtons.push(new ButtonBuilder()
            .setCustomId(`rpg-quest-navigate-${quest.id}`)
            .setLabel(`${navAction.icon} ${quest.title.slice(0, 30)}`)
            .setStyle(ButtonStyle.Primary)
          );
        }
      }
      if (questButtons.length > 0) {
        for (let i = 0; i < questButtons.length; i += 2) {
          components.push(new ActionRowBuilder().addComponents(questButtons.slice(i, i + 2)));
        }
      }
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild-quests')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );
    components.push(backButton);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Handle guild quest navigation - route player to appropriate activity
   */,

  async handleGuildQuestNavigation(interaction, player, questId) {
    const quest = getGuildQuestById(questId);
    if (!quest) {
      await interaction.reply({ content: '❌ Quest not found.', ephemeral: true });
      return;
    }

    const navAction = this.getQuestNavigationAction(quest);
    if (!navAction) {
      await interaction.reply({ content: '❌ No navigation available for this quest.', ephemeral: true });
      return;
    }

    // For mob hunts, try to find a specific dungeon
    if (navAction.action === 'mob-hunt' && navAction.mobName) {
      const dungeon = this.findDungeonWithMob(navAction.mobName);
      if (dungeon) {
        // Navigate to adventure with this dungeon
        player.selectedWorld = dungeon.world;
        this.persistPlayer(player);
        await this.handleAdventure(interaction, player);
        return;
      }
      // Fallback to general adventure if dungeon not found
      await this.handleAdventure(interaction, player);
      return;
    }

    // For other navigation types, use the standard routes
    const customId = navAction.customId;
    switch (customId) {
      case 'rpg-gather':
        await this.handleGatherMenu(interaction, player);
        break;
      case 'rpg-dungeons':
        await this.handleDungeonSelection(interaction, player);
        break;
      case 'rpg-raids':
        await this.handleRaidSelection(interaction, player);
        break;
      case 'rpg-adventure':
        await this.handleAdventure(interaction, player);
        break;
      default:
        await interaction.reply({ content: '❌ Unknown navigation action.', ephemeral: true });
    }
  }

  /**
   * Determine where a guild quest should navigate the player
   * Returns { action, label, icon } or null
   */,

  async handleGuildBounties(interaction, player) {
    await interaction.update({
      content: '❌ Guild quests and bounties have been removed from the system.',
      components: [],
      embeds: []
    });
  },

  async handleCreateBountyModal(interaction, player) {
    await interaction.update({
      content: '❌ Guild bounties have been removed from the system.',
      components: [],
      embeds: []
    });
  }

  /**
   * Handle weekly rewards claim
   */,

  async handleGuildWeeklyRewards(interaction, player) {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const canClaim = (now - player.lastWeeklyReward) >= oneWeekMs;
    
    const rankInfo = getRankByXP(player.guildXP);
    const rewards = rankInfo.weeklyRewards;
    
    const embed = new EmbedBuilder()
      .setColor(canClaim ? 0x2ecc71 : 0x95a5a6)
      .setTitle(`🎁 Weekly Rank Rewards - ${rankInfo.name}`)
      .setDescription(canClaim 
        ? '✅ Your weekly rewards are ready to claim!'
        : `⏰ Next reward in ${Math.ceil((oneWeekMs - (now - player.lastWeeklyReward)) / (60 * 60 * 1000))} hours`)
      .addFields(
        { name: '💰 Gold', value: `${rewards.gold}g`, inline: true },
        { name: '📦 Items', value: rewards.items.length > 0 ? rewards.items.join(', ') : 'None', inline: true }
      )
      .setTimestamp();

    const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
    const allRewardsText = rankOrder
      .filter(r => GUILD_RANKS[r])
      .map(r => {
        const info = GUILD_RANKS[r];
        const items = info.weeklyRewards.items?.length ? `, Items: ${info.weeklyRewards.items.length}` : ', Items: 0';
        return `${r}: ${info.weeklyRewards.gold}g${items}`;
      })
      .join('\n');

    const allBuffsText = rankOrder
      .filter(r => GUILD_RANKS[r])
      .map(r => {
        const info = GUILD_RANKS[r];
        return `${r}: Tax -${info.buffs.marketTaxReduction}% • Shop -${info.buffs.shopDiscount}% • Quest XP +${info.buffs.questXPBonus}%`;
      })
      .join('\n');

    embed.addFields(
      { name: '🏆 All Rank Rewards (Weekly)', value: allRewardsText, inline: false },
      { name: '🛡️ All Rank Buffs', value: allBuffsText, inline: false }
    );

    const components = [];
    
    if (canClaim) {
      const claimButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-guild-claim-weekly')
          .setLabel('🎁 Claim Rewards')
          .setStyle(ButtonStyle.Success)
      );
      components.push(claimButton);
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-guild')
        .setLabel('← Back to Guild')
        .setStyle(ButtonStyle.Secondary)
    );
    components.push(backButton);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Claim weekly rewards
   */,

  async handleClaimWeeklyReward(interaction, player) {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    
    if ((now - player.lastWeeklyReward) < oneWeekMs) {
      await interaction.reply({
        content: '❌ You can only claim weekly rewards once per week!',
        ephemeral: true,
      });
      return;
    }
    
    const rankInfo = getRankByXP(player.guildXP);
    const rewards = rankInfo.weeklyRewards;
    
    // Give rewards
    this.addGold(player, rewards.gold);
    if (rewards.items && rewards.items.length > 0) {
      player.inventory.push(...rewards.items);
    }
    
    player.lastWeeklyReward = now;
    this.playerManager.savePlayer(player);
    
    await interaction.reply({
      content: `✅ **Weekly Rewards Claimed!**\n💰 +${rewards.gold} gold${rewards.items.length > 0 ? `\n📦 +${rewards.items.length} items` : ''}`,
      ephemeral: false,
    });
    
    // Refresh the rewards view
    await this.handleGuildWeeklyRewards(interaction, player);
  }

  /**
   * Handle multi-layer raid with team package selection
   */,

  async handleGuildLeaderboard(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    
    if (!guild) {
      await interaction.reply({
        content: '❌ You\'re not in a guild!',
        ephemeral: true
      });
      return;
    }

    const leaderboard = this.guildAnalytics.getLeaderboard(guild.id, 'overall');

    if (leaderboard.length === 0) {
      await interaction.reply({
        content: '📊 No guild members recorded yet.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle('🏆 **Guild Leaderboard**')
      .setDescription('Top members ranked by overall strength');

    leaderboard.slice(0, 10).forEach((member, index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🔹';
      
      embed.addFields({
        name: `${medal} #${rank}`,
        value: `L${member.level} | 💪 ${member.totalDamage} DMG | 👹 ${member.bossesFelled} Bosses`,
        inline: false
      });
    });

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-tab-guild')
        .setLabel('← Back to Guild Tab')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, { 
      embeds: [embed], 
      components: [backButton],
      ephemeral: true 
    });
  }

  /**
   * Guild Member Growth Chart - Track guild progress
   */,

  async handleGuildGrowthChart(interaction, player) {
    const guild = this.guildManager.getPlayerGuild(player.userId);
    
    if (!guild) {
      await interaction.reply({
        content: '❌ You\'re not in a guild!',
        ephemeral: true
      });
      return;
    }

    const avgStats = this.guildAnalytics.getGuildAverageStats(guild.id);

    if (!avgStats) {
      await interaction.reply({
        content: '📊 Not enough guild data yet.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ccff)
      .setTitle('📊 **Guild Growth Chart**')
      .setDescription('Your guild\'s collective progress');

    const strengthBar = this.createProgressBar(avgStats.guildStrength, avgStats.guildStrength + 50, 15);

    embed.addFields(
      { name: '👥 Members', value: `${avgStats.memberCount}`, inline: true },
      { name: '📈 Average Level', value: `L${avgStats.averageLevel}`, inline: true },
      { name: '💪 Average Damage', value: `${avgStats.averageDamage}`, inline: true },
      { name: '👹 Total Bosses Defeated', value: `${avgStats.totalBossesFelled}`, inline: true },
      { name: '⭐ Guild Strength', value: `[${strengthBar}] ${avgStats.guildStrength.toFixed(1)}/100`, inline: false }
    );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-qol-tab-guild')
        .setLabel('← Back to Guild Tab')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, { 
      embeds: [embed], 
      components: [backButton],
      ephemeral: true 
    });
  }

  /**
   * Guild Quest Suggestions - Recommend content for members
   */,

  async handleGuildQuestSuggestions(interaction, player) {
    if (!player.guildId) {
      await interaction.reply({
        content: '❌ You\'re not in a guild!',
        ephemeral: true
      });
      return;
    }

    const suggestions = this.guildAnalytics.suggestGroupContent(player);

    const embed = new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('📜 **Guild Quest Suggestions**')
      .setDescription('Recommended group activities for you');

    suggestions.slice(0, 5).forEach(suggestion => {
      embed.addFields({
        name: `${suggestion.name}`,
        value: `${suggestion.reason}\n💰 Reward: ${suggestion.reward}`,
        inline: false
      });
    });

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * PHASE 2 QOL FEATURES
   */

  /**
   * Equipment Builds - Quick swap between saved equipment loadouts
   */,
};
