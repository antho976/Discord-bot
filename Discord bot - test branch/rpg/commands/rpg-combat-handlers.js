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
 * rpg-combat-handlers — extracted from RPGCommand.js
 * 40 methods, ~3522 lines
 */
export const CombatHandlers = {
  async handleDungeons(interaction, player) {
    if (player.level < 10) {
      await interaction.reply({
        content: '🔒 **Dungeons Locked**\nReach level 10 to unlock Dungeons!',
        ephemeral: true,
      });
      return;
    }
    
    this.trackMenuNavigation(player, 'dungeon');
    try {
      const dungeons = getAvailableDungeons(player.level, player.currentWorld);
      const embed = UIBuilder.createDungeonsEmbed(player.level, player.currentWorld);

      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-combat-menu')
          .setLabel('← Back to Combat')
          .setStyle(ButtonStyle.Secondary)
      );

      if (dungeons.length === 0) {
        await this.updateInteractionWithTracking(interaction, {
          embeds: [embed],
          components: [backButton],
        });
        return;
      }

      // Validate dungeon data before creating options
      const validDungeons = dungeons.filter(d => d && d.id && d.name);
      
      if (validDungeons.length === 0) {
        await this.updateInteractionWithTracking(interaction, {
          embeds: [embed],
          components: [backButton],
        });
        return;
      }

      const options = validDungeons.map(d => {
        const floors = d.floors || 1;
        const floorText = floors > 1 ? ` • ${floors} Floors` : '';
        const label = `${d.name} (Lvl ${d.minLevel}${floorText})`.substring(0, 100);
        return {
          label: label,
          value: d.id.substring(0, 100),
          description: (d.description || 'A challenging dungeon').substring(0, 100),
        };
      });

      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-select-dungeon')
          .setPlaceholder('Select a dungeon to fight')
          .addOptions(options)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [selectMenu, backButton],
      });
    } catch (error) {
      console.error('Error in handleDungeons:', error);
      await interaction.reply({
        content: '❌ Error loading dungeons. Please try again.',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle combat training (start combat)
   */,

  async handleCombatTraining(interaction, player) {
    this.trackMenuNavigation(player, 'combat-training');
    
    // Safety check: Clear stale combat flags if no active combat exists
    this.clearStaleCombatFlag(player);
    
    // Check if player is in combat
    if (this.combatSystem.isInCombat(player.userId)) {
      await interaction.reply({
        content: 'You are already in combat!',
        ephemeral: true,
      });
      return;
    }

    // Show combat style selection before starting
    const styles = getStylesForClass(player.class || player.internalClass);
    if (styles.length === 0) {
      // No styles available, use default combat
      await this.startTrainingCombat(interaction, player);
      return;
    }

    // Show style selection
    const options = styles.map((style, idx) => ({
      label: style.name,
      value: `style-${style.id}`,
      description: style.description,
      emoji: style.icon,
    }));

    // Add random environment option
    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-combat-style-select')
        .setPlaceholder('Choose Combat Style')
        .addOptions(options)
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-combat-menu')
        .setLabel('← Back to Combat')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('⚔️ Combat Training - Choose Your Style')
      .setDescription(`Select a combat style for your Training Dummy fight (Level ${Math.max(1, player.level - 1)})`)
      .addFields(
        { name: '🎯 Combat Styles', value: styles.map(s => `${s.icon} **${s.name}** - ${s.description}`).join('\n') }
      );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  },

  async startTrainingCombat(interaction, player, styleId = null) {
    const style = styleId ? getCombatStyle(styleId) : null;
    
    // Create a training dummy scaled to player level (much weaker for practice)
    const dummyLevel = Math.max(1, Math.floor(player.level * 0.5)); // 50% of player level
    const combatState = this.combatSystem.startCombat(
      player,
      'Training Dummy',
      dummyLevel
    );

    // Assign combat style if selected
    if (style && combatState) {
      combatState.combatStyle = style;
      // Save the style for quick repeat
      player.lastTrainingStyle = styleId;
    }

    // Select random environment
    combatState.environment = getRandomEnvironment(true);

    this.persistPlayer(player);

    const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
    
    // Add environment info
    if (combatState.environment) {
      embed.addFields({
        name: `${combatState.environment.name}`,
        value: combatState.environment.description
      });
    }

    // Add style info
    if (style) {
      embed.addFields({
        name: `${style.icon} ${style.name}`,
        value: style.description
      });
    }

    const buttons = this.createCombatButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Handle combat next turn (AI-driven)
   */,

  async handleCombatNextTurn(interaction, player) {
    if (this.isGuildBossCombat(player)) {
      await this.handleGuildBossCombatTurn(interaction, player, { type: 'next' });
      return;
    }

    const result = this.combatSystem.executeRound(player.userId);

    if (result.error) {
      // Combat state was lost - reset player flag
      player.isInCombat = false;
      player.currentEnemy = null;
      this.persistPlayer(player);
      
      await interaction.reply({
        content: '⚠️ Combat session expired. Start a new battle!',
        ephemeral: true,
      });
      return;
    }

    // Check victory/defeat FIRST (endCombat result doesn't have combatState)
    if (result.status === 'ongoing') {
      if (!result.combatState) {
        await interaction.reply({
          content: '⚠️ Combat state was lost. Ending battle.',
          ephemeral: true,
        });
        player.isInCombat = false;
        player.currentEnemy = null;
        this.persistPlayer(player);
        return;
      }

      const embed = UIBuilder.createCombatStateEmbed(result.combatState);
      const buttons = this.createCombatButtons();

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: buttons,
      });
      return;
    }

    if (result.status === 'victory' || result.status === 'defeat') {
      // Use the player from result if available (has combat modifications)
      const combatPlayer = result.player || player;
      await this.handleCombatResolution(interaction, combatPlayer, result);
    }
  }

  /**
   * Show combat skill selection with pagination support
   */,

  async handleCombatSkillMenu(interaction, player) {
    if (!this.combatSystem.isInCombat(player.userId)) {
      const guild = this.guildManager.getPlayerGuild(player.userId);
      if (guild?.activeBoss) {
        await this.handleGuildBosses(interaction, player);
        return;
      }
      await interaction.reply({ content: 'You are not in combat.', ephemeral: true });
      return;
    }

    const skills = this.combatSystem.getAvailableSkills(player.userId);
    if (!skills || skills.length === 0) {
      await interaction.reply({ content: 'No skills available for combat.', ephemeral: true });
      return;
    }

    const combatState = this.combatSystem.getActiveCombat(player.userId);
    const bossSkillLevels = combatState?.playerSkillLevels || player.skillLevels || {};

    // Show all skills in the select menu (Discord supports up to 25 options)
    const options = skills.slice(0, 25).map((skill) => {
      // Get cooldown based on skill level
      const skillLevel = bossSkillLevels[skill.id] || 1;
      const cooldownValue = skill.getCooldown ? skill.getCooldown(skillLevel) : (skill.cooldown || 0);
      const cooldownText = cooldownValue > 0 ? `CD ${cooldownValue}t` : 'Ready';
      
      const accuracyText = `Acc ${Math.round((skill.accuracy ?? 1) * 100)}%`;
      const typeText = `Type ${skill.element || skill.type || 'normal'}`;
      const statusText = skill.canUse ? 'Ready' : `Locked: ${skill.reason}`;

      return {
        label: `${skill.name} Lv${skillLevel}`.substring(0, 100),
        value: skill.id,
        description: `${typeText} • ${accuracyText} • ${statusText}`.substring(0, 100),
        emoji: '⚡',
      };
    });

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-combat-skill-select')
        .setPlaceholder(`Select a skill to use (${skills.length} available)`)
        .addOptions(options)
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-combat-refresh')
        .setLabel('← Back to Combat')
        .setStyle(ButtonStyle.Secondary)
    );

    const combatSummary = combatState ? this.combatSystem.getCombatSummary(combatState) : null;
    const embed = combatSummary
      ? UIBuilder.createCombatStateEmbed(combatSummary)
      : new EmbedBuilder().setColor(0xff6600).setTitle('⚔️ Combat');

    embed.addFields({
      name: '⚔️ Choose a Move',
      value: 'Pick one of your 4 moves for this turn.',
      inline: false,
    });

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  }

  /**
   * Refresh combat state without advancing the turn
   */,

  async handleCombatRefresh(interaction, player) {
    const combatState = this.combatSystem.getActiveCombat(player.userId);
    if (!combatState) {
      // Check if player is in a guild with an active boss
      const guild = this.guildManager.getPlayerGuild(player.userId);
      if (guild?.activeBoss) {
        await this.handleGuildBosses(interaction, player);
        return;
      }
      await interaction.reply({ content: 'You are not in combat.', ephemeral: true });
      return;
    }

    if (combatState.meta?.type === 'guild_boss') {
      const guild = this.guildManager.getPlayerGuild(player.userId);
      if (guild?.activeBoss) {
        this.syncGuildBossCombatState(combatState, guild.activeBoss);
      }
    }

    const combatSummary = this.combatSystem.getCombatSummary(combatState);
    const embed = UIBuilder.createCombatStateEmbed(combatSummary);
    const buttons = combatState.meta?.type === 'guild_boss'
      ? this.createGuildBossCombatButtons()
      : this.createCombatButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Execute a combat skill selection
   */,

  async handleCombatSkillSelect(interaction, player, skillId) {
    if (this.isGuildBossCombat(player)) {
      await this.handleGuildBossCombatTurn(interaction, player, { type: 'skill', skillId });
      return;
    }

    const result = this.combatSystem.executeRoundWithSkill(player.userId, skillId);

    // Track skill usage
    if (!result.error && result.status !== 'error') {
      const skillData = getSkill ? getSkill(skillId) : null;
      const skillName = skillData?.name || skillId;
      const dmg = result.combatState?.lastPlayerDamage || result.playerDamage || 0;
      this.trackSkillUsage(player, skillName, dmg);
    }

    if (result.error) {
      await interaction.reply({ content: result.error, ephemeral: true });
      return;
    }

    if (result.status === 'error') {
      await interaction.reply({ content: result.error || 'Skill cannot be used.', ephemeral: true });
      return;
    }

    if (result.status === 'ongoing') {
      if (!result.combatState) {
        await interaction.reply({
          content: '⚠️ Combat state was lost. Ending battle.',
          ephemeral: true,
        });
        player.isInCombat = false;
        player.currentEnemy = null;
        this.persistPlayer(player);
        return;
      }

      const embed = UIBuilder.createCombatStateEmbed(result.combatState);
      const buttons = this.createCombatButtons(false); // Gear button removed after attack

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: buttons,
      });
      return;
    }

    if (result.status === 'victory' || result.status === 'defeat') {
      // Use the player from result if available (has combat modifications)
      const combatPlayer = result.player || player;
      await this.handleCombatResolution(interaction, combatPlayer, result);
    }
  }

  /**
   * Show gear set selection menu during combat
   */,

  async handleCombatGearSet(interaction, player) {
    if (!this.combatSystem.isInCombat(player.userId)) {
      const guild = this.guildManager.getPlayerGuild(player.userId);
      if (guild?.activeBoss) {
        await this.handleGuildBosses(interaction, player);
        return;
      }
      await interaction.reply({ content: 'You are not in combat.', ephemeral: true });
      return;
    }

    // Get saved equipment sets
    const equipmentSets = player.equipmentSets || [];
    if (equipmentSets.length === 0) {
      await interaction.reply({ 
        content: 'No saved equipment sets. Create one in Equipment menu first!', 
        ephemeral: true 
      });
      return;
    }

    const options = equipmentSets.slice(0, 25).map((set, index) => ({
      label: `${index + 1}. ${set.name || `Set ${index + 1}`}`.substring(0, 100),
      value: String(index),
      description: (set.description || 'Switch to this set').substring(0, 100),
      emoji: '⚙️',
    }));

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-combat-gear-select')
        .setPlaceholder('Select a gear set to equip')
        .addOptions(options)
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-combat-refresh')
        .setLabel('← Back to Combat')
        .setStyle(ButtonStyle.Secondary)
    );

    const combatState = this.combatSystem.getActiveCombat(player.userId);
    const combatSummary = combatState ? this.combatSystem.getCombatSummary(combatState) : null;
    const embed = combatSummary
      ? UIBuilder.createCombatStateEmbed(combatSummary)
      : new EmbedBuilder().setColor(0xff6600).setTitle('⚔️ Combat');

    embed.addFields({
      name: '⚙️ Switch Gear Set',
      value: 'Switching consumes your turn, and the enemy will act.',
      inline: false,
    });

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  }

  /**
   * Execute gear set change
   */,

  async handleCombatGearSelect(interaction, player, setIndex) {
    if (this.isGuildBossCombat(player)) {
      await this.handleGuildBossCombatTurn(interaction, player, { type: 'gear', setIndex });
      return;
    }

    const combatState = this.combatSystem.getActiveCombat(player.userId);
    if (!combatState) {
      const guild = this.guildManager.getPlayerGuild(player.userId);
      if (guild?.activeBoss) {
        await this.handleGuildBosses(interaction, player);
        return;
      }
      await interaction.reply({ content: 'You are not in combat.', ephemeral: true });
      return;
    }

    // Get the equipment set
    const equipmentSet = player.equipmentSets?.[setIndex];
    if (!equipmentSet || !equipmentSet.items) {
      await interaction.reply({ content: 'Equipment set not found.', ephemeral: true });
      return;
    }

    // Update player's equipped items
    player.equippedItems = { ...equipmentSet.items };
    player.clearStatsCache();

    // Also update the combat state player's equipment
    if (combatState.player) {
      combatState.player.equippedItems = { ...equipmentSet.items };
      if (combatState.player.clearStatsCache) {
        combatState.player.clearStatsCache();
      }
    }

    // Execute the round (consume the turn)
    const result = this.combatSystem.executeRound(player.userId);

    if (result.error) {
      await interaction.reply({ content: result.error, ephemeral: true });
      return;
    }

    if (result.status === 'ongoing') {
      if (!result.combatState) {
        await interaction.reply({
          content: '⚠️ Combat state was lost. Ending battle.',
          ephemeral: true,
        });
        player.isInCombat = false;
        player.currentEnemy = null;
        this.persistPlayer(player);
        return;
      }

      const embed = UIBuilder.createCombatStateEmbed(result.combatState);
      const buttons = this.createCombatButtons(); // Show all buttons on next turn

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: buttons,
      });

      // Persist the gear change
      this.persistPlayer(player);
      return;
    }

    if (result.status === 'victory' || result.status === 'defeat') {
      const combatPlayer = result.player || player;
      await this.handleCombatResolution(interaction, combatPlayer, result);
    }
  }

  /**
   * Show party switch menu
   */,

  async handleCombatSwitchMenu(interaction, player) {
    const combatState = this.combatSystem.getActiveCombat(player.userId);
    if (!combatState) {
      const guild = this.guildManager.getPlayerGuild(player.userId);
      if (guild?.activeBoss) {
        await this.handleGuildBosses(interaction, player);
        return;
      }
      await interaction.reply({ content: 'You are not in combat.', ephemeral: true });
      return;
    }

    const party = combatState.party;
    if (!party || !Array.isArray(party.members) || party.members.length < 2) {
      await interaction.reply({ content: 'No party members available to switch.', ephemeral: true });
      return;
    }

    const options = party.members.slice(0, 4).map((member, index) => {
      const isActive = index === party.activeIndex;
      return {
        label: member.name || `Member ${index + 1}`,
        value: String(index),
        description: isActive ? 'Active' : 'Switch to this member',
        emoji: isActive ? '✅' : '🔁',
      };
    });

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-combat-switch-select')
        .setPlaceholder('Select a party member')
        .addOptions(options)
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-combat-refresh')
        .setLabel('← Back to Combat')
        .setStyle(ButtonStyle.Secondary)
    );

    const combatSummary = this.combatSystem.getCombatSummary(combatState);
    const embed = UIBuilder.createCombatStateEmbed(combatSummary);
    embed.addFields({
      name: '🔁 Switch Party Member',
      value: 'Switching consumes your turn, and the enemy will act.',
      inline: false,
    });

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  }

  /**
   * Show combat stance selection
   */,

  async handleCombatStanceMenu(interaction, player) {
    const combatState = this.combatSystem.getActiveCombat(player.userId);
    if (!combatState) {
      const guild = this.guildManager.getPlayerGuild(player.userId);
      if (guild?.activeBoss) {
        await this.handleGuildBosses(interaction, player);
        return;
      }
      await interaction.reply({ content: 'You are not in combat.', ephemeral: true });
      return;
    }

    const currentStance = combatState.playerStance || 'balanced';
    const stances = [
      { id: 'balanced', label: 'Balanced', description: 'No modifiers', emoji: '⚖️' },
      { id: 'aggressive', label: 'Aggressive', description: '+15% damage dealt, +10% damage taken', emoji: '🔥' },
      { id: 'defensive', label: 'Defensive', description: '-10% damage dealt, -20% damage taken', emoji: '🛡️' },
      { id: 'focused', label: 'Focused', description: '+10% accuracy and crit for skills', emoji: '🎯' },
      { id: 'evasive', label: 'Evasive', description: '-10% accuracy, +10% dodge chance', emoji: '💨' },
    ];

    const options = stances.map((stance) => ({
      label: `${stance.label}${stance.id === currentStance ? ' (Current)' : ''}`.substring(0, 100),
      value: stance.id,
      description: stance.description.substring(0, 100),
      emoji: stance.emoji,
    }));

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-combat-stance-select')
        .setPlaceholder('Choose a stance for this turn')
        .addOptions(options)
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-combat-refresh')
        .setLabel('← Back to Combat')
        .setStyle(ButtonStyle.Secondary)
    );

    const combatSummary = this.combatSystem.getCombatSummary(combatState);
    const embed = UIBuilder.createCombatStateEmbed(combatSummary);
    embed.addFields({
      name: '🛡️ Choose a Stance',
      value: 'Selecting a stance uses your turn and the enemy will act.',
      inline: false,
    });

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  }

  /**
   * Execute party switch
   */,

  async handleCombatSwitchSelect(interaction, player, switchIndex) {
    if (this.isGuildBossCombat(player)) {
      await this.handleGuildBossCombatTurn(interaction, player, { type: 'switch', switchIndex });
      return;
    }

    const result = this.combatSystem.executeRoundWithSwitch(player.userId, switchIndex);

    if (result.error) {
      await interaction.reply({ content: result.error, ephemeral: true });
      return;
    }

    if (result.status === 'error') {
      await interaction.reply({ content: result.error || 'Cannot switch party member.', ephemeral: true });
      return;
    }

    if (result.status === 'ongoing') {
      if (!result.combatState) {
        await interaction.reply({
          content: '⚠️ Combat state was lost. Ending battle.',
          ephemeral: true,
        });
        player.isInCombat = false;
        player.currentEnemy = null;
        this.persistPlayer(player);
        return;
      }

      const embed = UIBuilder.createCombatStateEmbed(result.combatState);
      const buttons = this.createCombatButtons();

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: buttons,
      });
      return;
    }

    if (result.status === 'victory' || result.status === 'defeat') {
      // Use the player from result if available (has combat modifications)
      const combatPlayer = result.player || player;
      await this.handleCombatResolution(interaction, combatPlayer, result);
    }
  }

  /**
   * Execute stance selection
   */,

  async handleCombatStanceSelect(interaction, player, stanceId) {
    if (this.isGuildBossCombat(player)) {
      await this.handleGuildBossCombatTurn(interaction, player, { type: 'stance', stanceId });
      return;
    }

    const result = this.combatSystem.executeRoundWithStance(player.userId, stanceId);

    if (result.error) {
      await interaction.reply({ content: result.error, ephemeral: true });
      return;
    }

    if (result.status === 'ongoing') {
      if (!result.combatState) {
        await interaction.reply({
          content: '⚠️ Combat state was lost. Ending battle.',
          ephemeral: true,
        });
        player.isInCombat = false;
        player.currentEnemy = null;
        this.persistPlayer(player);
        return;
      }

      const embed = UIBuilder.createCombatStateEmbed(result.combatState);
      const buttons = this.createCombatButtons();

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: buttons,
      });
      return;
    }

    if (result.status === 'victory' || result.status === 'defeat') {
      const combatPlayer = result.player || player;
      await this.handleCombatResolution(interaction, combatPlayer, result);
    }
  }

  /**
   * Forfeit combat and exit
   */,

  async handleCombatForfeit(interaction, player) {
    const combatState = this.combatSystem.getActiveCombat(player.userId);
    
    // Allow forfeit even without active combat to help players exit combat screen
    if (combatState) {
      // End active combat without rewards
      this.combatSystem.forceEndCombat(player.userId);
    }
    
    // Restore some HP so player isn't punished too harshly
    player.hp = Math.max(player.hp, Math.floor(player.maxHp * 0.5));
    player.isInCombat = false;
    player.currentEnemy = null;
    player.currentMenu = 'combat-menu';

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('🏃 Combat Forfeited')
      .setDescription(
        combatState 
          ? `You have fled from combat!\n\n` +
            `**HP Restored:** ${player.hp}/${player.maxHp}\n\n` +
            `You can start a new adventure whenever you're ready.`
          : `Combat screen cleared!\n\n` +
            `**Current HP:** ${player.hp}/${player.maxHp}\n\n` +
            `You can start a new adventure whenever you're ready.`
      );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-combat-menu')
        .setLabel('⚔️ Return to Combat')
        .setStyle(ButtonStyle.Primary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backButton],
    });
  }

  /**
   * Handle combat completion and rewards
   */,

  async handleCombatResolution(interaction, player, result) {
    if (result.status === 'victory' && result.meta?.type === 'worldBoss') {
      this.unlockNextWorld(player, result.meta.worldId);
    }

    // Reset menu state so back button works properly after combat
    if (result.meta?.type === 'arena') {
      player.currentMenu = 'arena';
    } else if (result.meta?.type === 'dungeon' || result.meta?.type === 'raid' || result.meta?.type === 'boss') {
      player.currentMenu = 'combat-menu';
    } else {
      player.currentMenu = 'main';
    }

    // Handle defense quest completion rewards
    let defenseQuestRewardsText = null;
    let questLevelUp = null;
    if (result.status === 'victory' && result.meta?.defenseQuest) {
      const quest = getDefenseQuestById(result.meta.defenseQuest);
      if (quest?.reward && !player.hasQuestFlag(quest.id)) {
        const reward = quest.reward;
        if (reward.xp) questLevelUp = player.addXp(reward.xp);
        if (reward.gold) this.addGold(player, reward.gold);

        const itemNames = [];
        for (const rewardItem of (reward.items || [])) {
          const { id, quantity } = rewardItem;
          const equipment = getEquipment(id);
          const item = getItemByIdDynamic(id);
          const material = getMaterial(id);

          if (equipment) {
            this.addCraftedItem(player, equipment.id, quantity || 1);
            itemNames.push(`${equipment.name} x${quantity || 1}`);
          } else if (item) {
            this.addCraftedItem(player, item.id, quantity || 1);
            itemNames.push(`${item.name} x${quantity || 1}`);
          } else if (material) {
            this.addMaterialToInventory(player, material.id, quantity || 1);
            itemNames.push(`${material.name} x${quantity || 1}`);
          }
        }

        player.setQuestFlag(quest.id, true);

        if (reward.unlockClass && !player.classUnlocked && player.internalClass) {
          const playerClass = getClass(player.internalClass);
          player.class = player.internalClass;
          player.classUnlocked = true;
          if (playerClass?.startingSkills?.length) {
            for (const skillId of playerClass.startingSkills) {
              if (!player.skills.includes(skillId)) player.skills.push(skillId);
            }
          }
        }

        const rewardParts = [];
        if (reward.xp) rewardParts.push(`+${reward.xp} XP`);
        if (reward.gold) rewardParts.push(`+${reward.gold} gold`);
        if (itemNames.length > 0) rewardParts.push(`Items: ${itemNames.join(', ')}`);
        if (reward.unlockClass) rewardParts.push('Class Unlocked');
        defenseQuestRewardsText = rewardParts.join('\n');
      }
    }

    // Handle world quest completion rewards
    let worldQuestRewardsText = null;
    let nextQuestInChain = null;
    let choiceQuestForSelection = null;
    if (result.status === 'victory' && result.meta?.worldQuest) {
      const { main, side, daily } = getQuestCategoriesByWorld(player.currentWorld);
      const allQuests = [...(main || []), ...(side || []), ...(daily || [])];
      const quest = allQuests.find(q => q.id === result.meta.worldQuest);
      
      if (quest?.reward && !player.hasQuestFlag(quest.id)) {
        const reward = quest.reward;
        if (reward.xp) player.addXp(reward.xp);
        if (reward.gold) this.addGold(player, reward.gold);

        const itemNames = [];
        for (const rewardItem of (reward.items || [])) {
          const { id, quantity } = rewardItem;
          const equipment = getEquipment(id);
          const item = getItemByIdDynamic(id);
          const material = getMaterial(id);

          if (equipment) {
            this.addCraftedItem(player, equipment.id, quantity || 1);
            itemNames.push(`${equipment.name} x${quantity || 1}`);
          } else if (item) {
            this.addCraftedItem(player, item.id, quantity || 1);
            itemNames.push(`${item.name} x${quantity || 1}`);
          } else if (material) {
            this.addMaterialToInventory(player, material.id, quantity || 1);
            itemNames.push(`${material.name} x${quantity || 1}`);
          }
        }

        player.setQuestFlag(quest.id, true);

        const rewardParts = [];
        if (reward.xp) rewardParts.push(`+${reward.xp} XP`);
        if (reward.gold) rewardParts.push(`+${reward.gold} gold`);
        if (itemNames.length > 0) rewardParts.push(`Items: ${itemNames.join(', ')}`);
        worldQuestRewardsText = `✅ **${quest.name}** Complete!\n${rewardParts.join('\n')}`;
        
        // Check if there's a next quest in the chain
        if (quest.nextQuestId) {
          nextQuestInChain = allQuests.find(q => q.id === quest.nextQuestId);
        } else {
          nextQuestInChain = this.inferNextQuestInChain(quest, allQuests);
        }

        // Check if this is a choice quest with branches (only when no linear next step)
        if (!nextQuestInChain && Array.isArray(quest.branches) && quest.branches.length > 0) {
          choiceQuestForSelection = quest;
          worldQuestRewardsText += `\n\n🔀 **Quest continues with a choice!**`;
        }
      }
    }

    let dungeonRewardsText = null;
    if (result.status === 'victory' && result.meta?.type === 'dungeon') {
      // Always give rewards after completing a floor
      const dungeon = getDungeonById(result.meta.dungeonId);
        if (dungeon) {
          const currentFloor = result.meta?.currentFloor || 1;
          
          // Use floor-specific rewards if available
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

            if (extraXp > 0) player.addXp(extraXp);
            if (extraGold > 0) this.addGold(player, extraGold);

            const lootNames = [];
            
            // Process loot items (can be items, equipment, or materials)
            let weaponGiven = false;
            const playerClass = player.class || player.internalClass;
            
            for (const lootItem of loot) {
              // Handle both string IDs and { id, quantity } objects
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
                // Handle class-aware weapon distribution
                if (equipment.slot === 'weapon') {
                  // Skip if we already gave a weapon from this package
                  if (weaponGiven) continue;
                  
                  // If weapon is restricted to another class, try to substitute
                  if (equipment.classRestriction && equipment.classRestriction !== playerClass) {
                    const classWeapon = this.findClassWeaponInLoot(loot, playerClass);
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
              } else if (item) {
                this.addCraftedItem(player, item.id, quantity);
                lootNames.push(`${item.name} x${quantity}`);
              } else if (material) {
                this.addMaterialToInventory(player, material.id, quantity);
                lootNames.push(`${material.name} x${quantity}`);
              }
            }
            
            // Process explicit materials field
            for (const matItem of materials) {
              // Handle both string IDs and { id, quantity } objects
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

            const rewardParts = [];
            if (extraXp > 0) rewardParts.push(`+${extraXp} XP`);
            if (extraGold > 0) rewardParts.push(`+${extraGold} gold`);
            if (lootNames.length > 0) rewardParts.push(`Loot: ${lootNames.join(', ')}`);
            dungeonRewardsText = `**Floor ${currentFloor} Rewards:**\n${rewardParts.join('\n')}`;
          }
        }
    }

    // Handle BOSS ENCOUNTER rewards (single-floor, massive rewards)
    let bossRewardsText = null;
    if (result.status === 'victory' && result.meta?.type === 'boss') {
      const bossData = result.meta?.bossData;
      
      if (bossData) {
        const lootNames = [];
        
        // Give XP and Gold
        if (bossData.xpReward) {
          player.addXp(bossData.xpReward);
        }
        if (bossData.goldReward) {
          this.addGold(player, bossData.goldReward);
        }
        
        // Give Materials
        if (bossData.materials && Array.isArray(bossData.materials)) {
          for (const matItem of bossData.materials) {
            const material = getMaterial(matItem.id);
            if (material) {
              this.addMaterialToInventory(player, material.id, matItem.quantity || 1);
              lootNames.push(`${material.name} x${matItem.quantity || 1}`);
            } else {
              // Fallback if material not found
              this.addMaterialToInventory(player, matItem.id, matItem.quantity || 1);
              lootNames.push(`${matItem.id} x${matItem.quantity || 1}`);
            }
          }
        }
        
        // Give Potions
        if (bossData.potions && Array.isArray(bossData.potions)) {
          for (const potionItem of bossData.potions) {
            const potion = getItemByIdDynamic(potionItem.id);
            if (potion) {
              this.addCraftedItem(player, potion.id, potionItem.quantity || 1);
              lootNames.push(`${potion.name} x${potionItem.quantity || 1}`);
            } else {
              // Fallback if potion not found
              this.addCraftedItem(player, potionItem.id, potionItem.quantity || 1);
              lootNames.push(`${potionItem.id} x${potionItem.quantity || 1}`);
            }
          }
        }
        
        // Give Enchantments
        if (bossData.enchants && Array.isArray(bossData.enchants)) {
          for (const enchantItem of bossData.enchants) {
            const enchant = getItemByIdDynamic(enchantItem.id);
            if (enchant) {
              this.addCraftedItem(player, enchant.id, enchantItem.quantity || 1);
              lootNames.push(`${enchant.name} x${enchantItem.quantity || 1}`);
            } else {
              // Fallback if enchant not found
              this.addCraftedItem(player, enchantItem.id, enchantItem.quantity || 1);
              lootNames.push(`${enchantItem.id} x${enchantItem.quantity || 1}`);
            }
          }
        }
        
        // Give Equipment Loot
        if (bossData.loot && Array.isArray(bossData.loot)) {
          const playerClass = player.class || player.internalClass;
          let weaponGiven = false;
          
          for (const lootItem of bossData.loot) {
            const equipment = getEquipment(lootItem);
            const item = getItemByIdDynamic(lootItem);
            
            if (equipment) {
              // Handle class-aware weapon distribution
              if (equipment.slot === 'weapon') {
                if (weaponGiven) continue;
                
                if (equipment.classRestriction && equipment.classRestriction !== playerClass) {
                  continue;  // Skip wrong-class weapons
                }
                weaponGiven = true;
              }
              
              this.addCraftedItem(player, equipment.id, 1);
              lootNames.push(equipment.name);
            } else if (item) {
              this.addCraftedItem(player, item.id, 1);
              lootNames.push(item.name);
            } else {
              // If item still not found, still add it - addCraftedItem handles the fallback
              const fallbackName = lootItem.startsWith('item_') 
                ? `Unknown Item (${lootItem.slice(-6)})`
                : lootItem;
              this.addCraftedItem(player, lootItem, 1);
              lootNames.push(fallbackName);
            }
          }
        }

        const rewardParts = [];
        if (bossData.xpReward) rewardParts.push(`💫 +${bossData.xpReward.toLocaleString()} XP`);
        if (bossData.goldReward) rewardParts.push(`💰 +${bossData.goldReward.toLocaleString()} Gold`);
        if (lootNames.length > 0) {
          rewardParts.push(`\n🎁 **Boss Loot:**\n${lootNames.join('\n')}`);
        }
        
        if (rewardParts.length === 0) {
          rewardParts.push('No rewards found (check configuration)');
        }
        
        bossRewardsText = `👹 **BOSS DEFEATED!**\n${rewardParts.join('\n')}`;
      } else {
        // Fallback for bosses without explicit reward data
        const bossXp = Math.floor((player.level * 200) + 1000);
        const bossGold = Math.floor((player.level * 100) + 500);
        player.addXp(bossXp);
        this.addGold(player, bossGold);
        bossRewardsText = `👹 **BOSS DEFEATED!**\n💫 +${bossXp.toLocaleString()} XP\n💰 +${bossGold.toLocaleString()} Gold`;
      }
    }

    // Track guild quest progress for combat victories
    let guildQuestUpdateText = null;
    if (result.status === 'victory' && result.enemy?.name !== 'Training Dummy') {
      // Track monsters defeated for progress stats
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
      player.progressStats.monstersDefeated += 1;

      // Track combat result (win)
      const combatType = result.meta?.type || 'normal';
      this.trackCombatResult(player, result.enemy?.name || 'Unknown', 'victory', combatType);

      // Update guild quest progress
      const dailyQuests = getAvailableDailyQuests(player.level, player.dailyQuestsCompleted);
      const weeklyQuests = getAvailableWeeklyQuests(player.level, player.weeklyQuestsCompleted);
      const claimedLimited = (player.claimedQuests || [])
        .map(id => getGuildQuestById(id))
        .filter(Boolean)
        .filter(q => !player.limitedQuestsCompleted.includes(q.id));

      if (!player.guildQuestProgress) player.guildQuestProgress = {};
      
      const updates = [];
      const completions = [];
      const tags = [];
      
      if (result.meta?.type === 'worldBoss') {
        tags.push('boss', 'world_boss');
      }
      if (result.meta?.type === 'dungeon') {
        tags.push('dungeon');
      }
      if (result.meta?.type === 'raid') {
        tags.push('raid', 'boss');
      }

      const enemyName = result.enemy?.name || '';
      const event = {
        type: 'kill',
        target: 'enemy',
        targetName: enemyName,
        enemy: enemyName,
        count: 1,
        tags
      };

      const questResult = this.applyGuildQuestProgress(player, dailyQuests, weeklyQuests, claimedLimited, event);
      updates.push(...questResult.updates);
      completions.push(...questResult.completions);

      if (updates.length > 0) {
        guildQuestUpdateText = `📋 Guild Quest Progress:\n${updates.join('\n')}`;
      }
      if (completions.length > 0) {
        if (guildQuestUpdateText) {
          guildQuestUpdateText += `\n\n${completions.join('\n')}`;
        } else {
          guildQuestUpdateText = completions.join('\n');
        }
      }
    }

    // Handle arena points
    let arenaRewardText = null;
    if (result.status === 'victory' && result.meta?.type === 'arena') {
      const isPlayerOpponent = result.meta?.opponent === 'player';
      const opponentSnapshot = result.meta?.opponentSnapshot;
      
      // Calculate fair arena points based on level difference
      let arenaPointsGained = isPlayerOpponent ? 50 : 10;
      
      if (isPlayerOpponent && opponentSnapshot) {
        const levelDiff = opponentSnapshot.level - player.level;
        // Base 50 points, adjusted by level difference
        // +10% per level above player, -15% per level below (less fair = less points)
        const multiplier = 1 + (levelDiff * (levelDiff >= 0 ? 0.10 : -0.15));
        arenaPointsGained = Math.max(10, Math.round(50 * multiplier));
      }
      
      const oldPoints = player.arenaPoints || 0;
      player.arenaPoints = oldPoints + arenaPointsGained;
      arenaRewardText = `⚔️ **+${arenaPointsGained} Arena Points** (Total: ${player.arenaPoints})`;
      console.log(`[Arena] ${player.username} earned ${arenaPointsGained} AP (${oldPoints} → ${player.arenaPoints})`);
      
      // Persist immediately after arena points
      this.persistPlayer(player);
    }

    // Save last enemy for Enemy Summary feature
    if (result.enemy) {
      player.lastEnemy = {
        name: result.enemy.name,
        level: result.enemy.level,
        type: result.enemy.type,
        currentHp: result.enemy.currentHp,
        maxHp: result.enemy.maxHp,
        stats: result.enemy.stats,
        abilities: result.enemy.abilities,
        resistances: result.enemy.resistances
      };
    }

    // Persist player for other changes
    if (result.status !== 'victory' || result.meta?.type !== 'arena') {
      this.persistPlayer(player);
    }

    const embed = UIBuilder.createCombatEndEmbed(
      result.status === 'victory',
      player,
      result.enemy,
      result.xpGained
    );

    // Add improvement suggestions for defeat
    if (result.status === 'defeat') {
      // Track combat defeat + death
      const defeatType = result.meta?.type || 'normal';
      this.trackCombatResult(player, result.enemy?.name || 'Unknown', 'defeat', defeatType);
      this.trackDeath(player, result.enemy, defeatType);

      const suggestions = [];
      
      // Check if player has unspent skill/talent points
      const availableSkillPoints = player.skillPoints || 0;
      const availableTalentPoints = player.talentPoints || 0;
      const playerGold = player.gold || 0;
      
      if (availableTalentPoints > 0) {
        suggestions.push(`🌟 **Upgrade Talents** - You have ${availableTalentPoints} unspent talent point${availableTalentPoints > 1 ? 's' : ''}! Click the button below.`);
      }
      
      if (availableSkillPoints > 0) {
        suggestions.push(`⚡ **Upgrade Skills** - You have ${availableSkillPoints} skill point${availableSkillPoints > 1 ? 's' : ''} available! Click the button below.`);
      }
      
      // Check blacksmith level for crafting
      const blacksmithLevel = player.professions?.blacksmith?.level || 0;
      if (blacksmithLevel >= 1) {
        suggestions.push(`🔨 **Craft Better Gear** - Your Blacksmith is level ${blacksmithLevel}. Check crafting!`);
      }
      
      // Check if player has low-quality equipment or gold to upgrade
      const equipment = player.equippedItems || {};
      const hasBasicGear = Object.values(equipment).some(item => {
        const equip = getEquipment(item);
        return equip && (!equip.rarity || equip.rarity === 'common');
      });
      
      if (hasBasicGear || Object.keys(equipment).length < 5) {
        suggestions.push(`⚔️ **Upgrade Equipment** - Visit Equipment menu or shop for better gear!`);
      }
      
      if (playerGold >= 100) {
        suggestions.push(`💰 **Buy Better Gear** - You have ${playerGold} gold! Browse the shop for upgrades.`);
      }
      
      // Suggest using potions
      suggestions.push(`🧪 **Use Potions** - Health potions heal at combat start!`);
      
      // Suggest training
      suggestions.push(`🎯 **Train More** - Practice with the Training Dummy to test strategies!`);
      
      if (suggestions.length > 0) {
        embed.addFields({
          name: '💡 Quick Improvements Available',
          value: suggestions.join('\n'),
          inline: false,
        });
      }
      
      // Show available resources
      const resourceList = [];
      if (availableTalentPoints > 0) resourceList.push(`🌟 ${availableTalentPoints} Talent Point${availableTalentPoints > 1 ? 's' : ''}`);
      if (availableSkillPoints > 0) resourceList.push(`⚡ ${availableSkillPoints} Skill Point${availableSkillPoints > 1 ? 's' : ''}`);
      if (playerGold >= 100) resourceList.push(`💰 ${playerGold} Gold`);
      
      if (resourceList.length > 0) {
        embed.addFields({
          name: '📊 Your Available Resources',
          value: resourceList.join(' • '),
          inline: false,
        });
      }
    }

    // Add level-up notification if applicable
    const combatLevelUp = result.levelUp || questLevelUp;
    if (combatLevelUp && combatLevelUp.levelsGained > 0) {
      const levelUpText = this.createLevelUpMessage(combatLevelUp);
      if (levelUpText) {
        embed.addFields({
          name: '🎉 Level Up!',
          value: levelUpText.trim(),
          inline: false,
        });
      }
    }

    if (defenseQuestRewardsText) {
      embed.addFields({
        name: '🛡️ Quest Rewards',
        value: defenseQuestRewardsText,
        inline: false,
      });
    }

    if (worldQuestRewardsText) {
      embed.addFields({
        name: '📜 Quest Complete!',
        value: worldQuestRewardsText,
        inline: false,
      });
    }

    if (dungeonRewardsText) {
      embed.addFields({
        name: '🏰 Dungeon Rewards',
        value: dungeonRewardsText,
        inline: false,
      });
    }

    if (bossRewardsText) {
      embed.addFields({
        name: '👹 Boss Rewards',
        value: bossRewardsText,
        inline: false,
      });
    }

    if (arenaRewardText) {
      embed.addFields({
        name: '🎯 Arena Rewards',
        value: arenaRewardText,
        inline: false,
      });
    }

    if (guildQuestUpdateText) {
      embed.addFields({
        name: '📋 Guild Quest Progress',
        value: guildQuestUpdateText,
        inline: false,
      });
    }

    // Create buttons row - don't add back button yet for boss encounters (will add custom one)
    const buttons = new ActionRowBuilder();
    
    // Add improvement buttons for defeat
    if (result.status === 'defeat') {
      const availableSkillPoints = player.skillPoints || 0;
      const availableTalentPoints = player.talentPoints || 0;
      const blacksmithLevel = player.professions?.blacksmith?.level || 0;
      
      // Check if player can craft better equipment than what they have
      const canCraftBetterEquipment = () => {
        if (blacksmithLevel < 1) return false;
        
        try {
          // Load crafting recipes
          const craftingDataPath = path.join(process.cwd(), 'data', 'crafting.json');
          const craftingData = JSON.parse(fs.readFileSync(craftingDataPath, 'utf8'));
          const recipes = craftingData.recipes || {};
          
          // Get player's equipped items stats/tier
          const equippedItems = player.equippedItems || {};
          const allEquipment = getEquipment();
          
          // Find recipes player can craft
          const craftableRecipes = Object.values(recipes).filter(recipe => 
            recipe.profession === 'blacksmith' && recipe.level <= blacksmithLevel
          );
          
          // Check if any craftable item would be better than current equipment
          for (const recipe of craftableRecipes) {
            const craftableItemId = recipe.output?.item;
            if (!craftableItemId) continue;
            
            const craftableItem = allEquipment.find(item => item.id === craftableItemId);
            if (!craftableItem) continue;
            
            const slot = craftableItem.slot;
            if (!slot) continue;
            
            // If slot is empty, player can craft better equipment
            if (!equippedItems[slot]) return true;
            
            // If slot has item, check if craftable item is better
            const equippedItemId = equippedItems[slot];
            const equippedItem = allEquipment.find(item => item.id === equippedItemId);
            
            if (equippedItem && craftableItem) {
              // Simple comparison: check rarity levels
              const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
              const equippedRarity = rarityOrder.indexOf(equippedItem.rarity || 'common');
              const craftableRarity = rarityOrder.indexOf(craftableItem.rarity || 'common');
              
              if (craftableRarity > equippedRarity) return true;
              
              // If same rarity, compare total stats
              const equippedStats = Object.values(equippedItem.stats || {}).reduce((sum, val) => sum + Math.abs(val), 0);
              const craftableStats = Object.values(craftableItem.stats || {}).reduce((sum, val) => sum + Math.abs(val), 0);
              
              if (craftableStats > equippedStats) return true;
            }
          }
          
          return false;
        } catch (error) {
          console.error('Error checking craftable equipment:', error);
          return blacksmithLevel >= 1; // Fallback to just checking blacksmith level
        }
      };
      
      // Add back button first
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );
      
      // Add improvement buttons based on what's available
      if (availableTalentPoints > 0) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-talents')
            .setLabel('🌟 Talents')
            .setStyle(ButtonStyle.Success)
        );
      }
      
      if (availableSkillPoints > 0) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-skills')
            .setLabel('⚡ Skills')
            .setStyle(ButtonStyle.Success)
        );
      }
      
      if (canCraftBetterEquipment()) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-crafting')
            .setLabel('🔨 Crafting')
            .setStyle(ButtonStyle.Primary)
        );
      }
      
      // Add shop button if player has enough gold
      const playerGold = player.gold || 0;
      if (playerGold >= 100 && buttons.components.length < 5) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-shop')
            .setLabel('🛒 Shop')
            .setStyle(ButtonStyle.Primary)
        );
      }
      
      // Always show equipment option if space available
      if (buttons.components.length < 5) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-equipment')
            .setLabel('⚔️ Equipment')
            .setStyle(ButtonStyle.Primary)
        );
      }
    }
    // Add back button for non-boss victories
    else if (!(result.status === 'victory' && result.meta?.type === 'boss')) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    // Check if dungeon has more floors to complete
    if (result.status === 'victory' && result.meta?.type === 'dungeon') {
      const currentFloor = result.meta?.currentFloor || 1;
      const totalFloors = result.meta?.totalFloors || 3;
      const dungeonId = result.meta?.dungeonId;
      
      // If not claiming reward (just completed floor), show choice
      if (!result.meta?.claimReward) {
        if (currentFloor < totalFloors) {
          // More floors available - give player a choice
          buttons.addComponents(
            new ButtonBuilder()
              .setCustomId(`rpg-dungeon-claim-${dungeonId}-${currentFloor}`)
              .setLabel(`💰 Claim Floor ${currentFloor} Reward`)
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`rpg-dungeon-continue-${dungeonId}-${currentFloor}`)
              .setLabel(`⬆️ Risk Floor ${currentFloor + 1}/${totalFloors}`)
              .setStyle(ButtonStyle.Danger)
          );
          
          embed.setFooter({ text: `Floor ${currentFloor}/${totalFloors} Complete! Claim your reward or risk it for better loot on Floor ${currentFloor + 1}...` });
        } else {
          // Last floor - auto-claim
          buttons.addComponents(
            new ButtonBuilder()
              .setCustomId(`rpg-dungeon-claim-${dungeonId}-${currentFloor}`)
              .setLabel(`💰 Claim Floor ${currentFloor} Reward`)
              .setStyle(ButtonStyle.Success)
          );
          
          embed.setFooter({ text: `All ${totalFloors} floors cleared! Claim your final reward!` });
        }
      } else {
        // Reward was claimed - show redo button
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-redo-dungeon-${dungeonId}`)
            .setLabel('🔄 Redo Dungeon')
            .setStyle(ButtonStyle.Primary)
        );
        
        embed.setFooter({ text: `Dungeon completed! You claimed Floor ${currentFloor} rewards.` });
      }
    }
    
    // Check if raid has more bosses to fight
    if (result.status === 'victory' && result.meta?.type === 'raid') {
      const currentBossIndex = result.meta?.bossIndex || 0;
      const totalBosses = result.meta?.totalBosses || 1;
      
      if (currentBossIndex < totalBosses - 1) {
        // More bosses to fight - add continue button
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-raid-continue-${result.meta?.raidId}-${currentBossIndex}`)
            .setLabel(`⚔️ Boss ${currentBossIndex + 2}/${totalBosses}`)
            .setStyle(ButtonStyle.Primary)
        );
        
        embed.setFooter({ text: `Boss ${currentBossIndex + 1}/${totalBosses} Defeated! Continue to the next boss...` });
      } else {
        // All bosses defeated - add redo button
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-redo-raid-${result.meta?.raidId}`)
            .setLabel('🔄 Redo Raid')
            .setStyle(ButtonStyle.Success)
        );
        
        embed.setFooter({ text: `All ${totalBosses} bosses defeated! Raid complete!` });
      }
    }

    // Handle boss encounter (single floor)
    if (result.status === 'victory' && result.meta?.type === 'boss') {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('Return to Menu')
          .setStyle(ButtonStyle.Primary)
      );
      
      embed.setFooter({ text: '👹 Boss Defeated! Legendary rewards claimed!' });
    }

    // Handle training dummy victory - add repeat button
    if (result.status === 'victory' && result.enemy?.name === 'Training Dummy') {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-repeat-training')
          .setLabel('🔁 Fight Again')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );
      
      embed.setFooter({ text: '✅ Training complete! Ready for another round?' });
    }

    // Add "Continue Quest Chain" button if there's a next quest
    if (nextQuestInChain && result.status === 'victory') {
      // Check if there's space in the button row
      if (buttons.components.length < 5) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-quest-view-detail-${nextQuestInChain.id}`)
            .setLabel('➡️ Continue Quest')
            .setStyle(ButtonStyle.Success)
        );
      }
      
      // Add notification to the embed
      embed.setFooter({ text: `⛓️ Quest chain continues: ${nextQuestInChain.name}` });
    }

    // Add "Choose Path" button when the completed quest has branch choices
    if (!nextQuestInChain && choiceQuestForSelection && result.status === 'victory') {
      if (buttons.components.length < 5) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-quest-view-detail-${choiceQuestForSelection.id}`)
            .setLabel('🔀 Choose Path')
            .setStyle(ButtonStyle.Success)
        );
      }

      embed.setFooter({ text: '🔀 Choice available: select your quest path.' });
    }

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Handle auto battle - runs combat to completion
   */
  /**
   * Handle manual combat - show action menu
   */,

  async handleCombatManual(interaction, player) {
    await interaction.deferUpdate();

    if (!player.isInCombat) {
      await interaction.followUp({
        content: '❌ You are not in combat.',
        ephemeral: true,
      });
      return;
    }

    const combatState = this.combatSystem.activeCombats.get(player.userId);
    if (!combatState) {
      await interaction.followUp({
        content: '❌ Combat state not found.',
        ephemeral: true,
      });
      return;
    }

    // Show combat UI with action buttons
    await this.displayCombatUI(interaction, player, combatState);
  }

  /**
   * Display combat UI with all available actions
   */,

  async displayCombatUI(interaction, player, combatState) {
    const { enemy, round, log, worldState } = combatState;

    // Create combat status embed
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`⚔️ Combat - Round ${round}`)
      .setDescription(
        `**${player.username}** vs **${enemy.name}** (Lvl ${enemy.level})\n\n` +
        `❤️ Your HP: **${player.hp}/${player.maxHp}**\n` +
        `👹 Enemy HP: **${enemy.hp}/${enemy.maxHp}**\n\n` +
        `**Recent Actions:**\n${log.slice(-5).join('\n')}`
      )
      .setTimestamp();

    // Add world state modifiers if any
    if (worldState?.modifiers) {
      const mods = [];
      if (worldState.modifiers.xpGain !== 1) mods.push(`XP: ${Math.round(worldState.modifiers.xpGain * 100)}%`);
      if (worldState.modifiers.goldGain !== 1) mods.push(`Gold: ${Math.round(worldState.modifiers.goldGain * 100)}%`);
      if (mods.length > 0) {
        embed.addFields({ name: '🌍 World Modifiers', value: mods.join(' | '), inline: false });
      }
    }

    // Create action buttons
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-combat-action-attack')
        .setLabel('⚔️ Attack')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-combat-action-defend')
        .setLabel('🛡️ Defend')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-combat-action-skill')
        .setLabel('✨ Use Skill')
        .setStyle(ButtonStyle.Success)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-combat-action-potion')
        .setLabel('💊 Use Potion')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-combat-auto')
        .setLabel('⚡ Switch to Auto')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-combat-forfeit')
        .setLabel('🏳️ Forfeit')
        .setStyle(ButtonStyle.Danger)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2],
    });
  }

  /**
   * Handle combat action - attack
   */,

  async handleCombatActionAttack(interaction, player) {
    await interaction.deferUpdate();

    if (!player.isInCombat) {
      await interaction.followUp({ content: '❌ Not in combat.', ephemeral: true });
      return;
    }

    // Execute one round with player attacking
    const result = this.combatSystem.executeRound(player.userId, 'attack');
    
    if (result.error) {
      await interaction.followUp({ content: result.error, ephemeral: true });
      return;
    }

    if (result.status === 'victory' || result.status === 'defeat') {
      await this.handleCombatResolution(interaction, result.player || player, result);
    } else {
      const combatState = this.combatSystem.activeCombats.get(player.userId);
      await this.displayCombatUI(interaction, player, combatState);
    }
  }

  /**
   * Handle combat action - defend
   */,

  async handleCombatActionDefend(interaction, player) {
    await interaction.deferUpdate();

    if (!player.isInCombat) {
      await interaction.followUp({ content: '❌ Not in combat.', ephemeral: true });
      return;
    }

    // Execute one round with player defending
    const result = this.combatSystem.executeRound(player.userId, 'defend');
    
    if (result.error) {
      await interaction.followUp({ content: result.error, ephemeral: true });
      return;
    }

    if (result.status === 'victory' || result.status === 'defeat') {
      await this.handleCombatResolution(interaction, result.player || player, result);
    } else {
      const combatState = this.combatSystem.activeCombats.get(player.userId);
      await this.displayCombatUI(interaction, player, combatState);
    }
  }

  /**
   * Handle auto combat (existing function)
   */,

  async handleCombatAuto(interaction, player) {
    await interaction.deferUpdate();

    if (this.isGuildBossCombat(player)) {
      await interaction.followUp({
        content: '❌ Auto battle is disabled for guild bosses. Choose your actions manually.',
        ephemeral: true,
      });
      return;
    }

    let result;
    let rounds = 0;
    const MAX_ROUNDS = 50;

    while (rounds < MAX_ROUNDS) {
      result = this.combatSystem.executeRound(player.userId);
      rounds++;

      if (result.error || result.status === 'victory' || result.status === 'defeat') {
        break;
      }
    }

    if (!result || result.error) {
      await interaction.followUp({
        content: result?.error || 'Combat error',
        ephemeral: true,
      });
      return;
    }

    if (result.status === 'victory' || result.status === 'defeat') {
      // Use the player from combat result (has XP, gold, and combat modifications)
      player = result.player || player;
      
      // Reset menu state so back button works properly after combat
      if (result.meta?.type === 'arena') {
        player.currentMenu = 'arena';
      } else if (result.meta?.type === 'dungeon' || result.meta?.type === 'raid' || result.meta?.type === 'boss') {
        player.currentMenu = 'combat-menu';
      } else {
        player.currentMenu = 'main';
      }
      
      if (result.status === 'victory' && result.meta?.type === 'worldBoss') {
        this.unlockNextWorld(player, result.meta.worldId);
      }

      // Handle defense quest completion rewards
      let defenseQuestRewardsText = null;
      if (result.status === 'victory' && result.meta?.defenseQuest) {
        const quest = getDefenseQuestById(result.meta.defenseQuest);
        if (quest?.reward && !player.hasQuestFlag(quest.id)) {
          const reward = quest.reward;
          if (reward.xp) player.addXp(reward.xp);
          if (reward.gold) this.addGold(player, reward.gold);

          const itemNames = [];
          for (const rewardItem of (reward.items || [])) {
            const { id, quantity } = rewardItem;
            const equipment = getEquipment(id);
            const item = getItemByIdDynamic(id);
            const material = getMaterial(id);

            if (equipment) {
              this.addCraftedItem(player, equipment.id, quantity || 1);
              itemNames.push(`${equipment.name} x${quantity || 1}`);
            } else if (item) {
              this.addCraftedItem(player, item.id, quantity || 1);
              itemNames.push(`${item.name} x${quantity || 1}`);
            } else if (material) {
              this.addMaterialToInventory(player, material.id, quantity || 1);
              itemNames.push(`${material.name} x${quantity || 1}`);
            }
          }

          player.setQuestFlag(quest.id, true);

          if (reward.unlockClass && !player.classUnlocked && player.internalClass) {
            const playerClass = getClass(player.internalClass);
            player.class = player.internalClass;
            player.classUnlocked = true;
            if (playerClass?.startingSkills?.length) {
              for (const skillId of playerClass.startingSkills) {
                if (!player.skills.includes(skillId)) player.skills.push(skillId);
              }
            }
          }

          const rewardParts = [];
          if (reward.xp) rewardParts.push(`+${reward.xp} XP`);
          if (reward.gold) rewardParts.push(`+${reward.gold} gold`);
          if (itemNames.length > 0) rewardParts.push(`Items: ${itemNames.join(', ')}`);
          if (reward.unlockClass) rewardParts.push('Class Unlocked');
          defenseQuestRewardsText = rewardParts.join('\n');
        }
      }

      // Handle world quest completion rewards
      let worldQuestRewardsText = null;
      let nextQuestInChain = null;
      let choiceQuestForSelection = null;
      if (result.status === 'victory' && result.meta?.worldQuest) {
        const { main, side, daily } = getQuestCategoriesByWorld(player.currentWorld);
        const allQuests = [...(main || []), ...(side || []), ...(daily || [])];
        const quest = allQuests.find(q => q.id === result.meta.worldQuest);
        
        if (quest?.reward && !player.hasQuestFlag(quest.id)) {
          const reward = quest.reward;
          if (reward.xp) player.addXp(reward.xp);
          if (reward.gold) this.addGold(player, reward.gold);

          const itemNames = [];
          for (const rewardItem of (reward.items || [])) {
            const { id, quantity } = rewardItem;
            const equipment = getEquipment(id);
            const item = getItemByIdDynamic(id);
            const material = getMaterial(id);

            if (equipment) {
              this.addCraftedItem(player, equipment.id, quantity || 1);
              itemNames.push(`${equipment.name} x${quantity || 1}`);
            } else if (item) {
              this.addCraftedItem(player, item.id, quantity || 1);
              itemNames.push(`${item.name} x${quantity || 1}`);
            } else if (material) {
              this.addMaterialToInventory(player, material.id, quantity || 1);
              itemNames.push(`${material.name} x${quantity || 1}`);
            }
          }

          player.setQuestFlag(quest.id, true);

          const rewardParts = [];
          if (reward.xp) rewardParts.push(`+${reward.xp} XP`);
          if (reward.gold) rewardParts.push(`+${reward.gold} gold`);
          if (itemNames.length > 0) rewardParts.push(`Items: ${itemNames.join(', ')}`);
          worldQuestRewardsText = `✅ **${quest.name}** Complete!\n${rewardParts.join('\n')}`;

          if (quest.nextQuestId) {
            nextQuestInChain = allQuests.find(q => q.id === quest.nextQuestId);
          } else {
            nextQuestInChain = this.inferNextQuestInChain(quest, allQuests);
          }

          if (!nextQuestInChain && Array.isArray(quest.branches) && quest.branches.length > 0) {
            choiceQuestForSelection = quest;
            worldQuestRewardsText += `\n\n🔀 **Quest continues with a choice!**`;
          }
        }
      }

      let dungeonRewardsText = null;
      if (result.status === 'victory' && result.meta?.type === 'dungeon') {
        const dungeon = getDungeonById(result.meta.dungeonId);
        if (dungeon) {
          const currentFloor = result.meta?.currentFloor || 1;
          const floorReward = dungeon.floorRewards?.[currentFloor] || dungeon.rewards;

          let extraXp = floorReward?.xp || 0;
          const extraGold = floorReward?.gold || 0;
          const loot = floorReward?.loot || floorReward?.items || [];
          const materials = floorReward?.materials || [];

          // Apply XP potion bonus to dungeon rewards
          if (extraXp > 0 && player.potionBuffs) {
            if (player.potionBuffs.xpRemaining && player.potionBuffs.xpRemaining > 0 && player.potionBuffs.xpBonus) {
              const bonusXp = Math.floor(extraXp * (player.potionBuffs.xpBonus / 100));
              extraXp += bonusXp;
              // Note: potion charges are decremented in CombatSystem, not here
            }
          }

          if (extraXp > 0) player.addXp(extraXp);
          if (extraGold > 0) this.addGold(player, extraGold);

          const lootNames = [];
          
          // Process loot items (can be items, equipment, or materials)
          let weaponGiven = false;
          const playerClass = player.class || player.internalClass;
          
          for (const lootItem of loot) {
            // Handle both string IDs and { id, quantity } objects
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
              // Handle class-aware weapon distribution
              if (equipment.slot === 'weapon') {
                // Skip if we already gave a weapon from this package
                if (weaponGiven) continue;
                
                // If weapon is restricted to another class, try to substitute
                if (equipment.classRestriction && equipment.classRestriction !== playerClass) {
                  const classWeapon = this.findClassWeaponInLoot(loot, playerClass);
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
            } else if (item) {
              this.addCraftedItem(player, item.id, quantity);
              lootNames.push(`${item.name} x${quantity}`);
            } else if (material) {
              this.addMaterialToInventory(player, material.id, quantity);
              lootNames.push(`${material.name} x${quantity}`);
            }
          }
          
          // Process explicit materials field
          for (const matItem of materials) {
            // Handle both string IDs and { id, quantity } objects
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

          const rewardParts = [];
          if (extraXp > 0) rewardParts.push(`+${extraXp} XP`);
          if (extraGold > 0) rewardParts.push(`+${extraGold} gold`);
          if (lootNames.length > 0) rewardParts.push(`Loot: ${lootNames.join(', ')}`);
          dungeonRewardsText = `**Floor ${currentFloor} Rewards:**\n${rewardParts.join('\n')}`;
        }
      }

      // Handle BOSS ENCOUNTER rewards (single-floor, massive rewards)
      let bossRewardsText = null;
      if (result.status === 'victory' && result.meta?.type === 'boss') {
        const bossData = result.meta?.bossData;
        
        if (bossData) {
          const lootNames = [];
          
          // Give XP and Gold
          if (bossData.xpReward) {
            player.addXp(bossData.xpReward);
          }
          if (bossData.goldReward) {
            this.addGold(player, bossData.goldReward);
          }
          
          // Give Materials
          if (bossData.materials && Array.isArray(bossData.materials)) {
            for (const matItem of bossData.materials) {
              const material = getMaterial(matItem.id);
              if (material) {
                this.addMaterialToInventory(player, material.id, matItem.quantity || 1);
                lootNames.push(`${material.name} x${matItem.quantity || 1}`);
              } else {
                // Fallback if material not found
                this.addMaterialToInventory(player, matItem.id, matItem.quantity || 1);
                lootNames.push(`${matItem.id} x${matItem.quantity || 1}`);
              }
            }
          }
          
          // Give Potions
          if (bossData.potions && Array.isArray(bossData.potions)) {
            for (const potionItem of bossData.potions) {
              const potion = getItemByIdDynamic(potionItem.id);
              if (potion) {
                this.addCraftedItem(player, potion.id, potionItem.quantity || 1);
                lootNames.push(`${potion.name} x${potionItem.quantity || 1}`);
              } else {
                // Fallback if potion not found
                this.addCraftedItem(player, potionItem.id, potionItem.quantity || 1);
                lootNames.push(`${potionItem.id} x${potionItem.quantity || 1}`);
              }
            }
          }
          
          // Give Enchantments
          if (bossData.enchants && Array.isArray(bossData.enchants)) {
            for (const enchantItem of bossData.enchants) {
              const enchant = getItemByIdDynamic(enchantItem.id);
              if (enchant) {
                this.addCraftedItem(player, enchant.id, enchantItem.quantity || 1);
                lootNames.push(`${enchant.name} x${enchantItem.quantity || 1}`);
              } else {
                // Fallback if enchant not found
                this.addCraftedItem(player, enchantItem.id, enchantItem.quantity || 1);
                lootNames.push(`${enchantItem.id} x${enchantItem.quantity || 1}`);
              }
            }
          }
          
          // Give Equipment Loot
          if (bossData.loot && Array.isArray(bossData.loot)) {
            const playerClass = player.class || player.internalClass;
            let weaponGiven = false;
            
            for (const lootItem of bossData.loot) {
              const equipment = getEquipment(lootItem);
              const item = getItemByIdDynamic(lootItem);
              
              if (equipment) {
                // Handle class-aware weapon distribution
                if (equipment.slot === 'weapon') {
                  if (weaponGiven) continue;
                  
                  if (equipment.classRestriction && equipment.classRestriction !== playerClass) {
                    continue;  // Skip wrong-class weapons
                  }
                  weaponGiven = true;
                }
                
                this.addCraftedItem(player, equipment.id, 1);
                lootNames.push(equipment.name);
              } else if (item) {
                this.addCraftedItem(player, item.id, 1);
                lootNames.push(item.name);
              } else {
                // If item still not found, still add it - addCraftedItem handles the fallback
                const fallbackName = lootItem.startsWith('item_') 
                  ? `Unknown Item (${lootItem.slice(-6)})`
                  : lootItem;
                this.addCraftedItem(player, lootItem, 1);
                lootNames.push(fallbackName);
              }
            }
          }

          const rewardParts = [];
          if (bossData.xpReward) rewardParts.push(`💫 +${bossData.xpReward.toLocaleString()} XP`);
          if (bossData.goldReward) rewardParts.push(`💰 +${bossData.goldReward.toLocaleString()} Gold`);
          if (lootNames.length > 0) {
            rewardParts.push(`\n🎁 **Boss Loot:**\n${lootNames.join('\n')}`);
          }
          
          if (rewardParts.length === 0) {
            rewardParts.push('No rewards found (check configuration)');
          }
          
          bossRewardsText = `👹 **BOSS DEFEATED!**\n${rewardParts.join('\n')}`;
        } else {
          // Fallback for bosses without explicit reward data
          const bossXp = Math.floor((player.level * 200) + 1000);
          const bossGold = Math.floor((player.level * 100) + 500);
          player.addXp(bossXp);
          this.addGold(player, bossGold);
          bossRewardsText = `👹 **BOSS DEFEATED!**\n💫 +${bossXp.toLocaleString()} XP\n💰 +${bossGold.toLocaleString()} Gold`;
        }
      }

      // Save last enemy for Enemy Summary feature
      if (result.enemy) {
        player.lastEnemy = {
          name: result.enemy.name,
          level: result.enemy.level,
          type: result.enemy.type,
          currentHp: result.enemy.currentHp,
          maxHp: result.enemy.maxHp,
          stats: result.enemy.stats,
          abilities: result.enemy.abilities,
          resistances: result.enemy.resistances
        };
      }

      this.persistPlayer(player);

      const embed = UIBuilder.createCombatEndEmbed(
        result.status === 'victory',
        player,
        result.enemy,
        result.xpGained
      );

      embed.setFooter({ text: `Battle completed in ${rounds} rounds` });

      if (defenseQuestRewardsText) {
        embed.addFields({
          name: '🛡️ Quest Rewards',
          value: defenseQuestRewardsText,
          inline: false,
        });
      }

      if (worldQuestRewardsText) {
        embed.addFields({
          name: '📜 Quest Complete!',
          value: worldQuestRewardsText,
          inline: false,
        });
      }

      if (dungeonRewardsText) {
        embed.addFields({
          name: '🏰 Dungeon Rewards',
          value: dungeonRewardsText,
          inline: false,
        });
      }

      if (bossRewardsText) {
        embed.addFields({
          name: '👹 Boss Rewards',
          value: bossRewardsText,
          inline: false,
        });
      }

      // Handle arena points
      let arenaRewardText = null;
      if (result.status === 'victory' && result.meta?.type === 'arena') {
        const isPlayerOpponent = result.meta?.opponent === 'player';
        const opponentSnapshot = result.meta?.opponentSnapshot;
        
        // Calculate fair arena points based on level difference
        let arenaPointsGained = isPlayerOpponent ? 50 : 10;
        
        if (isPlayerOpponent && opponentSnapshot) {
          const levelDiff = opponentSnapshot.level - player.level;
          // Base 50 points, adjusted by level difference
          // +10% per level above player, -15% per level below (less fair = less points)
          const multiplier = 1 + (levelDiff * (levelDiff >= 0 ? 0.10 : -0.15));
          arenaPointsGained = Math.max(10, Math.round(50 * multiplier));
        }
        
        player.arenaPoints = (player.arenaPoints || 0) + arenaPointsGained;
        arenaRewardText = `⚔️ **+${arenaPointsGained} Arena Points** (Total: ${player.arenaPoints})`;
        
        // Persist again with arena points
        this.persistPlayer(player);
      }

      if (arenaRewardText) {
        embed.addFields({
          name: '🎯 Arena Rewards',
          value: arenaRewardText,
          inline: false,
        });
      }

      const backTarget = (result.meta?.worldQuest || result.meta?.defenseQuest)
        ? 'rpg-quest-back'
        : result.meta?.type === 'dungeon'
          ? 'rpg-combat-menu'
          : 'rpg-back';
      const backLabel = backTarget === 'rpg-quest-back'
        ? '← Back to Quests'
        : backTarget === 'rpg-combat-menu'
          ? '← Back to Combat'
          : '← Back';
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(backTarget)
          .setLabel(backLabel)
          .setStyle(ButtonStyle.Secondary)
      );

      // Check if dungeon has more floors to complete
      if (result.status === 'victory' && result.meta?.type === 'dungeon') {
        const currentFloor = result.meta?.currentFloor || 1;
        const totalFloors = result.meta?.totalFloors || 3;
        const dungeonId = result.meta?.dungeonId;
        
        // If not claiming reward (just completed floor), show choice
        if (!result.meta?.claimReward) {
          if (currentFloor < totalFloors) {
            // More floors available - give player a choice
            buttons.addComponents(
              new ButtonBuilder()
                .setCustomId(`rpg-dungeon-claim-${dungeonId}-${currentFloor}`)
                .setLabel(`💰 Claim Floor ${currentFloor} Reward`)
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`rpg-dungeon-continue-${dungeonId}-${currentFloor}`)
                .setLabel(`⬆️ Risk Floor ${currentFloor + 1}/${totalFloors}`)
                .setStyle(ButtonStyle.Danger)
            );
            
            embed.setFooter({ text: `Floor ${currentFloor}/${totalFloors} Complete! Claim your reward or risk it for better loot on Floor ${currentFloor + 1}...` });
          } else {
            // Last floor - auto-claim
            buttons.addComponents(
              new ButtonBuilder()
                .setCustomId(`rpg-dungeon-claim-${dungeonId}-${currentFloor}`)
                .setLabel(`💰 Claim Floor ${currentFloor} Reward`)
                .setStyle(ButtonStyle.Success)
            );
            
            embed.setFooter({ text: `All ${totalFloors} floors cleared! Claim your final reward!` });
          }
        } else {
          // Reward was claimed - show redo button
          buttons.addComponents(
            new ButtonBuilder()
              .setCustomId(`rpg-redo-dungeon-${dungeonId}`)
              .setLabel('🔄 Redo Dungeon')
              .setStyle(ButtonStyle.Primary)
          );
          
          embed.setFooter({ text: `Dungeon completed! You claimed Floor ${currentFloor} rewards.` });
        }
      }

      if (nextQuestInChain && result.status === 'victory') {
        if (buttons.components.length < 5) {
          buttons.addComponents(
            new ButtonBuilder()
              .setCustomId(`rpg-quest-view-detail-${nextQuestInChain.id}`)
              .setLabel('➡️ Continue Quest')
              .setStyle(ButtonStyle.Success)
          );
        }

        embed.setFooter({ text: `⛓️ Quest chain continues: ${nextQuestInChain.name}` });
      }

      if (!nextQuestInChain && choiceQuestForSelection && result.status === 'victory') {
        if (buttons.components.length < 5) {
          buttons.addComponents(
            new ButtonBuilder()
              .setCustomId(`rpg-quest-view-detail-${choiceQuestForSelection.id}`)
              .setLabel('🔀 Choose Path')
              .setStyle(ButtonStyle.Success)
          );
        }

        embed.setFooter({ text: '🔀 Choice available: select your quest path.' });
      }

      await interaction.editReply({
        embeds: [embed],
        components: [buttons],
      });
    }
  }

  /**
   * Handle back button (return to main menu)
   */
  /**
   * Update interaction and track the message for auto-deletion
   */,

  async handleCombatMenu(interaction, player) {
    this.trackMenuNavigation(player, 'combat-menu');
    
    const isTier2Plus = player && player.worldsUnlocked && player.worldsUnlocked.length >= 2;
    const roguelikeLine = isTier2Plus ? '🎲 **Roguelike Dungeon** - Challenge a procedurally-generated dungeon. Test your skills through 26 floors.\n' : '';

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('⚔️ Combat Menu')
      .setDescription(
        '**Choose a combat challenge:**\n\n' +
        '⚔️ **Training** - Practice fights. No risk, consistent rewards.\n' +
        '🏰 **Dungeons** - Multi-enemy instances, escalating difficulty. (Lv 10+)\n' +
        '👹 **World Boss** - Rare powerful boss. High risk, high reward.\n' +
        '🏟️ **Arena** - Competitive 1v1 matches. Earn Arena Points. (Lv 5+)\n' +
        roguelikeLine
      );

    const buttons = this.createCombatMenuButtons(player);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Handle quests menu group
   */,

  async handleQuickBattle(interaction, player) {
    await this.handleArena(interaction, player);
  }

  /**
   * Party battle mode
   */,

  async handlePartyBattle(interaction, player) {
    if (this.combatSystem.isInCombat(player.userId)) {
      await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
      return;
    }

    const combatState = this.combatSystem.startCombat(
      player,
      'Party Trial',
      Math.max(1, player.level + 2),
      { meta: { type: 'partyBattle' } }
    );

    this.persistPlayer(player);

    const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
    embed.addFields({
      name: '👥 Party Battle',
      value: 'Switch members to manage damage and momentum.',
      inline: false,
    });

    const buttons = this.createCombatButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  },

  async handleBossCombat(interaction, player, bossId) {
    if (this.combatSystem.isInCombat(player.userId)) {
      await interaction.reply({
        content: 'You are already in combat!',
        ephemeral: true,
      });
      return;
    }

    const bossTemplate = getBossTemplate(bossId);
    if (!bossTemplate) {
      await interaction.reply({
        content: '❌ Boss not found!',
        ephemeral: true,
      });
      return;
    }

    // Show combat style selection before boss fight
    const styles = getStylesForClass(player.class || player.internalClass);
    
    if (styles.length > 0) {
      const options = styles.map((style) => ({
        label: style.name,
        value: `boss-style-${bossId}-${style.id}`,
        description: style.description,
        emoji: style.icon,
      }));

      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-boss-style-select')
          .setPlaceholder('Choose Combat Style for Boss Fight')
          .addOptions(options)
      );

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`⚔️ ${bossTemplate.name} - Choose Your Style`)
        .setDescription('Select your combat style before facing this boss!')
        .addFields(
          { name: 'Boss Info', value: `Element: ${bossTemplate.element}\nWeakness: ${bossTemplate.weakness}\nResistance: ${bossTemplate.resistance}` }
        );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [selectRow],
      });
    } else {
      await this.startBossFight(interaction, player, bossId);
    }
  },

  async startBossFight(interaction, player, bossId, styleId = null) {
    const bossTemplate = getBossTemplate(bossId);
    if (!bossTemplate) return;

    const combatState = this.combatSystem.startBossCombat(
      player,
      bossTemplate.name,
      bossId,
      Math.max(player.level, 5)
    );

    if (!combatState) {
      await interaction.reply({ content: 'Failed to start boss combat!', ephemeral: true });
      return;
    }

    if (styleId) {
      combatState.combatStyle = getCombatStyle(styleId);
    }

    this.persistPlayer(player);

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`🔥 Boss Battle: ${combatState.enemy.name}`)
      .setDescription(`${combatState.enemy.hp}/${combatState.enemy.maxHp} HP`)
      .addFields(
        { name: `${combatState.environment.name}`, value: combatState.environment.description },
        { name: '⚔️ Phase 1', value: bossTemplate.phase1.description }
      );

    if (combatState.combatStyle) {
      embed.addFields({
        name: `${combatState.combatStyle.icon} ${combatState.combatStyle.name}`,
        value: combatState.combatStyle.description
      });
    }

    const buttons = this.createCombatButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Start a group enemy encounter
   */,

  async handleGroupCombat(interaction, player, groupId, scaleFactor = 1) {
    if (this.combatSystem.isInCombat(player.userId)) {
      await interaction.reply({
        content: 'You are already in combat!',
        ephemeral: true,
      });
      return;
    }

    const group = getEnemyGroup(groupId);
    if (!group) {
      await interaction.reply({
        content: '❌ Enemy group not found!',
        ephemeral: true,
      });
      return;
    }

    // Show combat style selection
    const styles = getStylesForClass(player.class || player.internalClass);
    
    if (styles.length > 0) {
      const options = styles.map((style) => ({
        label: style.name,
        value: `group-style-${groupId}-${style.id}`,
        description: style.description,
        emoji: style.icon,
      }));

      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-group-style-select')
          .setPlaceholder('Choose Combat Style')
          .addOptions(options)
      );

      const summary = getGroupSummary(group);
      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle(`⚔️ ${summary.name} - Choose Your Style`)
        .setDescription(`Difficulty: ${summary.difficulty}`)
        .addFields(
          { name: 'Enemies', value: summary.enemies },
          { name: 'Count', value: `${summary.totalCount} enemies` }
        );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [selectRow],
      });
    } else {
      await this.startGroupFight(interaction, player, groupId, scaleFactor);
    }
  },

  async startGroupFight(interaction, player, groupId, scaleFactor = 1, styleId = null) {
    const group = getEnemyGroup(groupId);
    if (!group) return;

    const combatState = this.combatSystem.startMultiEnemyCombat(
      player,
      groupId,
      scaleFactor
    );

    if (!combatState) {
      await interaction.reply({ content: 'Failed to start group combat!', ephemeral: true });
      return;
    }

    if (styleId) {
      combatState.combatStyle = getCombatStyle(styleId);
    }

    this.persistPlayer(player);

    const summary = getGroupSummary(group);
    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle(`⚔️ Group Battle: ${summary.name}`)
      .setDescription(`Facing ${summary.totalCount} enemies`)
      .addFields(
        { name: 'Current Target', value: `${combatState.enemy.name} - ${combatState.enemy.hp}/${combatState.enemy.maxHp} HP` },
        { name: `${combatState.environment.name}`, value: combatState.environment.description }
      );

    if (combatState.combatStyle) {
      embed.addFields({
        name: `${combatState.combatStyle.icon} ${combatState.combatStyle.name}`,
        value: combatState.combatStyle.description
      });
    }

    const buttons = this.createCombatButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Handle normal dungeon encounter selection
   */,

  async handleNormalDungeonStart(interaction, player, dungeonId) {
    const dungeon = getAvailableDungeons(player.level, player.currentWorld)
      .find(d => d.id === dungeonId);
    
    if (!dungeon) {
      await interaction.reply({ content: '❌ Dungeon not found!', ephemeral: true });
      return;
    }

    if (this.combatSystem.isInCombat(player.userId)) {
      await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
      return;
    }

    // Start MULTI-FLOOR dungeon combat system (3 floors with risk/reward)
    const currentFloor = 1;
    const totalFloors = dungeon.floors || 3;
    
    // Get first boss/enemy
    let enemyName = 'Dungeon Foe';
    let enemyLevel = Math.max(1, player.level + currentFloor);
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

    // Create combat metadata for multi-floor dungeon
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
    
    let combatState;
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

    if (!combatState) {
      await interaction.reply({ content: 'Failed to start dungeon!', ephemeral: true });
      return;
    }

    this.persistPlayer(player);

    const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
    embed.setTitle(`🏰 **${dungeon.name} - Floor ${currentFloor}/${totalFloors}**`);
    embed.setDescription(`You enter the dungeon and encounter a powerful foe! Defeat all ${totalFloors} floors for maximum rewards!`);
    embed.setFooter({ text: `Floor ${currentFloor}/${totalFloors} - Complete each floor to claim rewards or risk continuing!` });

    const buttons = this.createCombatButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Handle boss dungeon encounter selection
   */,

  async handleBossDungeonStart(interaction, player, dungeonId) {
    const dungeon = getAvailableDungeons(player.level, player.currentWorld)
      .find(d => d.id === dungeonId);
    
    if (!dungeon) {
      await interaction.reply({ content: '❌ Dungeon not found!', ephemeral: true });
      return;
    }

    if (this.combatSystem.isInCombat(player.userId)) {
      await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
      return;
    }

    // BOSS ENCOUNTER - Single floor, powerful boss, MASSIVE rewards
    // Get dungeon boss data from dungeon definition first
    let bossData = null;
    let enemyName = dungeon.name + ' Boss';
    let enemyLevel = Math.max(player.level + 5, dungeon.minLevel + 3);

    // Try to get boss from dungeon definition first (preferred method)
    if (dungeon.bosses && dungeon.bosses.length > 0) {
      const firstBoss = dungeon.bosses[0];
      
      if (typeof firstBoss === 'string') {
        // It's a boss ID - try to find it in world entities
        const allWorlds = getAllWorlds();
        for (const world of allWorlds) {
          if (world.entities?.worldBosses?.[firstBoss]) {
            const worldBoss = world.entities.worldBosses[firstBoss];
            enemyName = worldBoss.name || enemyName;
            enemyLevel = parseInt(worldBoss.level) || enemyLevel;
            
            // Create proper loot data with variation - generate based on boss level
            bossData = {
              ...worldBoss,
              xpReward: worldBoss.rewards?.xp || Math.floor(enemyLevel * 250 + Math.random() * 500),
              goldReward: worldBoss.rewards?.gold || Math.floor(enemyLevel * 150 + Math.random() * 300),
              loot: worldBoss.loot || this.generateBossLoot(enemyLevel, 'legendary'),
              materials: worldBoss.materials || this.generateBossMaterials(enemyLevel),
              potions: worldBoss.potions || this.generateBossPotions(enemyLevel),
              enchants: worldBoss.enchants || this.generateBossEnchants(enemyLevel),
            };
            break;
          }
        }
      } else if (firstBoss && typeof firstBoss === 'object') {
        enemyName = firstBoss.name || enemyName;
        enemyLevel = firstBoss.level || enemyLevel;
        
        // Create proper loot data with variation
        bossData = {
          ...firstBoss,
          xpReward: firstBoss.rewards?.xp || Math.floor(enemyLevel * 250 + Math.random() * 500),
          goldReward: firstBoss.rewards?.gold || Math.floor(enemyLevel * 150 + Math.random() * 300),
          loot: firstBoss.loot || this.generateBossLoot(enemyLevel, 'legendary'),
          materials: firstBoss.materials || this.generateBossMaterials(enemyLevel),
          potions: firstBoss.potions || this.generateBossPotions(enemyLevel),
          enchants: firstBoss.enchants || this.generateBossEnchants(enemyLevel),
        };
      }
    }
    
    // Fallback: Use WORLD_BOSSES only if no dungeon-specific boss is defined
    if (!bossData) {
      const worldNum = player.currentWorld || 1;
      if (WORLD_BOSSES[worldNum]) {
        bossData = WORLD_BOSSES[worldNum];
        enemyName = bossData.name || enemyName;
        enemyLevel = parseInt(bossData.minLevel) || enemyLevel;
      }
    }

    // Show combat style selection for boss fight
    const styles = getStylesForClass(player.class || player.internalClass);
    if (!styles || styles.length === 0) {
      // No styles, start boss fight directly
      await this.startDungeonBossFight(interaction, player, dungeon, bossData, null);
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-dungeon-boss-style-select')
      .setPlaceholder('Choose your combat style...')
      .addOptions(
        styles.map(style => ({
          label: style.name,
          value: style.id,
          description: style.description.substring(0, 100),
          emoji: style.icon || '⚔️'
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Store dungeon context for style selection handler
    // Use both memory (fast) and player data (survives bot restarts)
    const contextData = {
      dungeonId: dungeon.id,
      dungeonName: dungeon.name,
      bossData: bossData
    };
    
    if (!this.dungeonBossContext) {
      this.dungeonBossContext = new Map();
    }
    this.dungeonBossContext.set(interaction.user.id, contextData);
    
    // Also save to player data to survive bot restarts
    player.pendingBossDungeon = contextData;
    this.persistPlayer(player);

    const rewardPreview = this.generateBossRewardPreview(bossData, dungeon);

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`👹 **Boss Encounter: ${enemyName}**`)
      .setDescription(`A legendary boss guards this dungeon. Defeat it for MASSIVE rewards!\n\n**Single Floor** - No risk/reward mechanic, just pure boss carnage!`)
      .addFields(
        { name: '⚔️ Difficulty', value: `Level ${enemyLevel} - Extremely Dangerous`, inline: true },
        { name: '🎁 Rewards', value: rewardPreview, inline: false }
      );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row],
    });
  }

  /**
   * Generate boss reward preview text
   */,

  async startDungeonBossFight(interaction, player, dungeon, bossData, styleId = null) {
    let enemyName = dungeon.name + ' Boss';
    let enemyLevel = Math.max(player.level + 5, dungeon.minLevel + 3);

    if (bossData) {
      enemyName = bossData.name || enemyName;
      enemyLevel = parseInt(bossData.level) || enemyLevel;
    }

    // Boss difficulty multipliers (even higher than dungeon)
    const BOSS_HP_MULT = 4.0;  // Bosses have 4x HP
    const BOSS_STAT_MULT = 2.5;  // Bosses have 2.5x stats

    const combatMeta = {
      type: 'boss',
      dungeonId: dungeon.id,
      bossData: bossData,  // Store boss data for reward distribution
      singleFloor: true
    };

    let combatState;
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
        Math.floor(baseHp * BOSS_HP_MULT),
        {
          strength: Math.floor(baseStr * BOSS_STAT_MULT),
          defense: Math.floor(baseDef * BOSS_STAT_MULT),
          intelligence: Math.floor(baseInt * BOSS_STAT_MULT),
          agility: Math.floor(baseAgi * BOSS_STAT_MULT),
        },
        bossData.abilities || bossData.skills || [],
        combatMeta
      );
    } else {
      // Fallback generic boss
      combatState = this.combatSystem.startCombat(
        player,
        enemyName,
        enemyLevel,
        { meta: combatMeta }
      );
    }

    if (!combatState) {
      await interaction.reply({ content: 'Failed to start boss fight!', ephemeral: true });
      return;
    }

    if (styleId) {
      combatState.combatStyle = getCombatStyle(styleId);
    }

    this.persistPlayer(player);

    const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
    embed.setTitle(`👹 **BOSS: ${enemyName}**`);
    embed.setDescription(`A legendary boss blocks your path! Defeat it for MASSIVE rewards!`);
    embed.setColor(0xff0000);
    embed.setFooter({ text: '⚠️ Boss Encounter - Single Floor - No Retreat!' });

    const buttons = this.createCombatButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * QOL FEATURES - Information & Visibility
   */

  /**
   * Show combat log (last 5 actions)
   */,

  async handleCombatLog(interaction, player) {
    const combatLog = this.qolSystem.getCombatLog(player.userId, 5);
    const isInCombat = this.combatSystem.isInCombat(player.userId);
    
    if (combatLog.length === 0) {
      await interaction.reply({
        content: isInCombat ? '📖 No combat actions yet. Start your attack!' : '📖 No recent combat history. Start a battle first!',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('⚔️ **Combat Log**')
      .setDescription(isInCombat ? 'Last 5 actions in current battle:' : 'Last 5 actions from recent battles:');

    combatLog.forEach((action, index) => {
      const timestamp = new Date(action.timestamp).toLocaleTimeString();
      let description = `**${action.source}** → ${action.description}`;
      
      if (action.damage > 0) {
        description += ` 💥 **${action.damage}** damage`;
      }
      if (action.healing > 0) {
        description += ` 💚 **${action.healing}** healing`;
      }
      if (action.environmentalEffect) {
        description += ` 🌪️ ${action.environmentalEffect}`;
      }

      embed.addFields({
        name: `${index + 1}. [${timestamp}]`,
        value: description,
        inline: false
      });
    });

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Show boss guide with templates and strategies
   */,

  async handleBossGuide(interaction, player) {
    const bossList = Object.keys(BOSS_ABILITIES);
    if (bossList.length === 0) {
      await interaction.reply({
        content: '❌ No boss templates found.',
        ephemeral: true
      });
      return;
    }

    // Create select menu for boss selection
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-boss-guide-select')
      .setPlaceholder('Choose a boss to learn about...')
      .addOptions(
        bossList.slice(0, 25).map(bossId => {
          const boss = BOSS_ABILITIES[bossId];
          return {
            label: boss.name,
            value: bossId,
            description: boss.description?.substring(0, 100) || 'A powerful boss',
            emoji: '👹'
          };
        })
      );

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('👹 **Boss Guide**')
      .setDescription('Learn about boss mechanics, phases, and recommended strategies')
      .addFields({
        name: 'Available Bosses',
        value: bossList.slice(0, 10).join(', ') + (bossList.length > 10 ? `... and ${bossList.length - 10} more` : ''),
        inline: false
      });

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2],
      ephemeral: true
    });
  }

  /**
   * Show enemy summary before combat
   */,

  async handleEnemySummary(interaction, player) {
    const isInCombat = this.combatSystem.isInCombat(player.userId);
    const combatState = isInCombat ? this.combatSystem.getCombatState(player.userId) : null;
    
    let enemy = null;
    let statusText = '';
    
    if (isInCombat && combatState?.enemy) {
      enemy = combatState.enemy;
      statusText = '⚔️ Current Combat';
    } else if (player.lastEnemy) {
      enemy = player.lastEnemy;
      statusText = '📜 Last Enemy Fought';
    } else {
      await interaction.reply({
        content: '❌ No enemy data available. Fight an enemy first!',
        ephemeral: true
      });
      return;
    }

    const hpPercent = Math.max(0, Math.round((enemy.currentHp / enemy.maxHp) * 100));

    const embed = new EmbedBuilder()
      .setColor(isInCombat ? 0xff6600 : 0x888888)
      .setTitle(`📊 **${enemy.name} Summary**`)
      .setDescription(`${statusText}\nLevel ${enemy.level} ${enemy.type || 'Enemy'}`)
      .addFields(
        { name: '❤️ Health', value: `${enemy.currentHp}/${enemy.maxHp} (${hpPercent}%)`, inline: true },
        { name: '💪 Strength', value: `${enemy.stats?.strength || 0}`, inline: true },
        { name: '🧠 Intelligence', value: `${enemy.stats?.intelligence || 0}`, inline: true },
        { name: '⚔️ Defense', value: `${enemy.stats?.defense || 0}`, inline: true },
        { name: '🎯 Agility', value: `${enemy.stats?.agility || 0}`, inline: true },
        { name: '✨ Special', value: enemy.abilities?.length ? `${enemy.abilities.length} abilities` : 'Standard', inline: true }
      );

    if (enemy.resistances && Object.keys(enemy.resistances).length > 0) {
      embed.addFields({
        name: '🛡️ Resistances',
        value: Object.entries(enemy.resistances)
          .map(([element, value]) => `${element}: ${value}%`)
          .join(', '),
        inline: false
      });
    }

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Show combo preview for current class
   */,

  async handleComboPreview(interaction, player) {
    const playerClass = player.class || player.internalClass;
    
    // Auto-populate starting skills if player has class but no skills
    if (playerClass && (!player.skills || player.skills.length === 0)) {
      const classData = getClass(playerClass);
      if (classData && classData.startingSkills) {
        player.skills = [...classData.startingSkills];
        this.persistPlayer(player);
      }
    }
    
    const playerSkills = player.skills || [];
    const combos = getCombosForClass(playerSkills);

    if (!combos || combos.length === 0) {
      await interaction.reply({
        content: `⚠️ No combos available yet. Unlock more skills to discover combos!`,
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x9900ff)
      .setTitle(`✨ **${playerClass} Skill Combos**`)
      .setDescription(`${combos.length} combo chains available`);

    combos.slice(0, 10).forEach(combo => {
      const firstSkill = getSkill(combo.first);
      const secondSkill = getSkill(combo.second);
      const skillChain = `${firstSkill?.name || combo.first} → ${secondSkill?.name || combo.second}`;
      const damageMultiplier = combo.bonus?.damageMultiplier || 1;
      const damageBonus = damageMultiplier > 1 ? `+${((damageMultiplier - 1) * 100).toFixed(0)}%` : 'N/A';
      const effect = combo.bonus?.effect ? ` + ${combo.bonus.effect.type}` : '';
      
      embed.addFields({
        name: `${combo.icon || '⚡'} ${combo.id}`,
        value: `${combo.description}\n**Chain:** ${skillChain}\n**Bonus:** ${damageBonus}${effect}`,
        inline: false
      });
    });

    if (combos.length > 10) {
      embed.setFooter({ text: `... and ${combos.length - 10} more combos` });
    }

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Show equipment comparison
   */,

  async handleEquipmentComparison(interaction, player) {
    const equipped = player.equippedItems || {};
    const hasAnyEquipment = Object.keys(equipped).length > 0;

    if (!hasAnyEquipment) {
      await interaction.reply({
        content: '⚠️ No equipment equipped yet. Equip some gear first!',
        ephemeral: true
      });
      return;
    }

    // Create select menu to pick slot to compare
    const slots = ['weapon', 'armor', 'shield', 'ring', 'amulet'];
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-equipment-compare-select')
      .setPlaceholder('Choose equipment slot to compare...')
      .addOptions(
        slots.map(slot => ({
          label: slot.charAt(0).toUpperCase() + slot.slice(1),
          value: slot,
          emoji: slot === 'weapon' ? '⚔️' : slot === 'armor' ? '🛡️' : slot === 'shield' ? '🔰' : slot === 'ring' ? '💍' : '📿'
        }))
      );

    const backButton = new ButtonBuilder()
      .setCustomId('rpg-qol-gear')
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️');

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(backButton);

    const embed = new EmbedBuilder()
      .setColor(0x00ccff)
      .setTitle('🔄 **Equipment Comparison**')
      .setDescription('Select a slot to compare with your inventory');

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2],
      ephemeral: true
    });
  }

  /**
   * Damage calculator - estimate damage before action
   */,

  async handleDamageCalculator(interaction, player) {
    const inCombat = this.combatSystem.isInCombat(player.userId);
    const combatState = inCombat ? this.combatSystem.getCombatState(player.userId) : null;

    // Calculate player stats
    const stats = player.getStats();
    const baseDamage = stats.strength * 1.2;
    const weaponBonus = stats.weaponDamage || 0;
    const totalDamage = Math.round(baseDamage + weaponBonus);

    const critChance = Math.min(95, (stats.dexterity || 0) * 0.5 + 5);
    const critDamage = Math.round(totalDamage * 1.5);

    const styleBonus = player.combatStyle?.statMods?.damageDealt || 0;
    const styledDamage = Math.round(totalDamage * (1 + styleBonus / 100));

    const enemyInfo = combatState?.enemy 
      ? `Current Enemy: ${combatState.enemy.name}` 
      : 'Not in combat - showing base calculations';

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('📊 **Damage Calculator**')
      .setDescription(enemyInfo)
      .addFields(
        { name: '⚔️ Base Attack', value: `${totalDamage} damage`, inline: true },
        { name: '🎯 Critical Hit', value: `${critDamage} damage (${Math.round(critChance)}% chance)`, inline: true },
        { name: '💫 With Style Bonus', value: `${styledDamage} damage (+${styleBonus}%)`, inline: true },
        { name: '📊 Your Stats', value: `STR: ${stats.strength} | DEX: ${stats.dexterity}`, inline: false }
      );

    if (combatState?.enemy) {
      embed.addFields({ 
        name: '❤️ Enemy Defense', 
        value: `${combatState.enemy.stats?.defense || 0} (reduces damage by ~${Math.round((combatState.enemy.stats?.defense || 0) * 0.5)})`, 
        inline: false 
      });
    }

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Show Jump Menu - quick access to recent content
   */,

  async handleComboVisualizer(interaction, player) {
    const playerClass = player.class || player.internalClass;
    
    // Auto-populate starting skills if player has class but no skills
    if (playerClass && (!player.skills || player.skills.length === 0)) {
      const classData = getClass(playerClass);
      if (classData && classData.startingSkills) {
        player.skills = [...classData.startingSkills];
        this.persistPlayer(player);
      }
    }
    
    const playerSkills = player.skills || [];
    const combos = getCombosForClass(playerSkills);

    if (!combos || combos.length === 0) {
      await interaction.reply({
        content: '❌ No combos found yet. Unlock more skills to discover powerful combo chains!',
        ephemeral: true
      });
      return;
    }

    const topCombos = combos.slice(0, 3);

    const embed = new EmbedBuilder()
      .setColor(0xff00ff)
      .setTitle('✨ **Combo Chain Visualizer**')
      .setDescription('Visual breakdown of your most powerful skill combos');

    topCombos.forEach(combo => {
      const firstSkill = getSkill(combo.first);
      const secondSkill = getSkill(combo.second);
      const visualization = `${firstSkill?.name || combo.first} ➜ ${secondSkill?.name || combo.second}`;
      const damageMultiplier = combo.bonus?.damageMultiplier || 1;
      const totalDamage = damageMultiplier > 1 ? `x${damageMultiplier.toFixed(2)}` : 'N/A';
      const effect = combo.bonus?.effect ? `**Effect:** ${combo.bonus.effect.type} (${combo.bonus.effect.duration} turns)` : '';
      
      embed.addFields({
        name: `${combo.icon || '⚡'} ${combo.id}`,
        value: `${combo.description}\n🕐 ${visualization}\n**Damage Multiplier:** ${totalDamage}\n${effect}`,
        inline: false
      });
    });

    embed.addFields({
      name: '💡 Pro Tip',
      value: 'Chain these combos in sequence for maximum damage output!',
      inline: false
    });

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Environmental Effect Predictions - Show hazards/buffs ahead of time
   */,

  async handleCombatStylesRecommendation(interaction, player) {
    const inCombat = this.combatSystem.isInCombat(player.userId);
    const combatState = inCombat ? this.combatSystem.getCombatState(player.userId) : null;
    const enemy = combatState?.enemy;

    if (!inCombat || !enemy) {
      // Show general style tips when not in combat
      const playerClass = player.class || player.internalClass;
      const currentStyle = player.combatStyle?.id || 'balanced';
      
      const embed = new EmbedBuilder()
        .setColor(0xffaa00)
        .setTitle('⚔️ **Combat Style Tips**')
        .setDescription('General combat style recommendations for your class.');

      embed.addFields(
        { name: '🎯 Aggressive Style', value: 'High damage, low defense. Best for quick fights and when you have healing support.', inline: false },
        { name: '🛡️ Defensive Style', value: 'Low damage, high defense. Best for tough enemies and long fights.', inline: false },
        { name: '⚖️ Balanced Style', value: 'Moderate damage and defense. Best all-around style for most situations.', inline: false },
        { name: '💨 Current Style', value: `You are using **${currentStyle}** style.`, inline: false },
        { name: '💡 Tip', value: 'Enter combat to get specific recommendations for that enemy!', inline: false }
      );

      await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
      return;
    }

    const recommendation = this.combatRecommendations.generateBattleRecommendation(
      player.combatStyle?.id || 'balanced',
      player.element || 'neutral',
      enemy.template || 'standard',
      enemy.stats
    );

    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle(`⚔️ **${enemy.name} - Combat Strategy**`)
      .setDescription(`Success Probability: **${recommendation.overall.successProbability}%**`);

    embed.addFields(
      { name: '📊 Difficulty', value: `${recommendation.overall.difficultyRating}/10`, inline: true },
      { name: '⏱️ Estimated Duration', value: recommendation.overall.estimatedDuration, inline: true },
      { name: '💫 Current Style', value: `${recommendation.style.current}\n${recommendation.style.effectiveness}`, inline: false },
      { name: '🎯 Recommended Style', value: recommendation.style.recommended, inline: true },
      { name: '✨ Element', value: `Current: ${recommendation.element.current}\nRecommended: ${recommendation.element.recommended}`, inline: true }
    );

    if (recommendation.strengthsToExploit.length > 0) {
      embed.addFields({
        name: '💪 Strengths To Exploit',
        value: recommendation.strengthsToExploit.join(', '),
        inline: false
      });
    }

    if (recommendation.tips.length > 0) {
      embed.addFields({
        name: '💡 Battle Tips',
        value: recommendation.tips.slice(0, 3).join('\n'),
        inline: false
      });
    }

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Critical Hit Chance Display - Shows crit calculations
   */,

  async handleCriticalHitDisplay(interaction, player) {
    const baseCrit = 5; // 5% base
    const agilityBonus = (player.agility || 0) * 0.4; // 0.4% per agility
    const gearBonus = (player.equipment?.weapon?.crit || 0); // From gear
    const styleBonus = (player.combatStyle?.statMods?.crit || 0);

    const totalCrit = Math.min(95, baseCrit + agilityBonus + gearBonus + styleBonus);
    const critDamage = 150; // Default 50% bonus damage on crit

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🎯 **Critical Hit Analysis**')
      .setDescription(`Your current critical strike chance`)
      .addFields(
        { name: 'Base Crit Chance', value: `${baseCrit.toFixed(1)}%`, inline: true },
        { name: 'From Agility', value: `+${agilityBonus.toFixed(1)}%`, inline: true },
        { name: 'From Gear', value: `+${gearBonus.toFixed(1)}%`, inline: true },
        { name: 'From Style', value: `+${styleBonus.toFixed(1)}%`, inline: true },
        { name: '⚡ TOTAL CRIT', value: `**${totalCrit.toFixed(1)}%**`, inline: false },
        { name: 'Crit Damage', value: `${critDamage}% of base damage`, inline: true }
      );

    // Show how much agility would help
    const needPercentage = Math.max(0, 50 - totalCrit);
    if (needPercentage > 0) {
      const agilityNeeded = Math.ceil(needPercentage / 0.4);
      embed.addFields({
        name: '💡 Path to 50% Crit',
        value: `Need +${agilityNeeded} Agility or +${needPercentage.toFixed(1)}% Crit from gear`,
        inline: false
      });
    }

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Damage Breakdown - Shows damage source allocation
   */,

  async handleDamageBreakdown(interaction, player) {
    const baseStr = player.strength || 0;
    const baseDamage = baseStr * 1.2;

    const weaponDamage = player.equipment?.weapon?.damage || 0;
    const equipmentDamage = (player.equipment?.armor?.damage || 0) + 
                            (player.equipment?.ring?.damage || 0) + 
                            (player.equipment?.amulet?.damage || 0);
    const styleDamage = ((player.combatStyle?.statMods?.damageDealt || 0) / 100) * baseDamage;
    const totalDamage = baseDamage + weaponDamage + equipmentDamage + styleDamage;

    // Calculate percentages
    const basePct = (baseDamage / totalDamage * 100).toFixed(1);
    const weaponPct = (weaponDamage / totalDamage * 100).toFixed(1);
    const equipPct = (equipmentDamage / totalDamage * 100).toFixed(1);
    const stylePct = (styleDamage / totalDamage * 100).toFixed(1);

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('💥 **Damage Breakdown**')
      .setDescription(`Total Attack Power: **${Math.round(totalDamage)}**`)
      .addFields(
        { name: '💪 Base (from Strength)', value: `${Math.round(baseDamage)} (${basePct}%)`, inline: true },
        { name: '⚔️ Weapon', value: `${Math.round(weaponDamage)} (${weaponPct}%)`, inline: true },
        { name: '⚙️ Gear', value: `${Math.round(equipmentDamage)} (${equipPct}%)`, inline: true },
        { name: '💫 Style Bonus', value: `${Math.round(styleDamage)} (${stylePct}%)`, inline: true }
      );

    // Show how to maximize damage
    const highestSource = Math.max(baseDamage, weaponDamage, equipmentDamage, styleDamage);
    let recommendation = '';
    if (highestSource === baseDamage) {
      const strNeeded = Math.ceil((totalDamage * 0.2) / 1.2);
      recommendation = `Increase Strength by ${strNeeded} to boost damage`;
    } else if (highestSource === weaponDamage) {
      recommendation = 'Your weapon is your strongest asset - upgrade it!';
    } else if (highestSource === styleDamage) {
      recommendation = 'Your combat style is highly optimized';
    }

    embed.addFields({
      name: '💡 Optimization Tip',
      value: recommendation,
      inline: false
    });

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Milestone Notifications - Show approaching level-ups and milestones
   */,
};
