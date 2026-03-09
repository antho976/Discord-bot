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
 * rpg-gathering-handlers — extracted from RPGCommand.js
 * 14 methods, ~1168 lines
 */
export const GatheringHandlers = {
  async handleGatherMenu(interaction, player, skipTracking = false) {
    // Stop message updates when leaving the gathering overview
    this.autoGatherManager.stopMessageUpdates(player.userId);

    if (!skipTracking) {
      this.trackMenuNavigation(player, 'gather');
    } else {
      // Even when skipping history, update currentMenu so back button works
      player.currentMenu = 'gather';
    }
    
    // Check if already gathering
    const isGathering = player.isAutoGathering;
    const gatheringSkill = isGathering ? getGatheringSkill(player.autoGatherSkill) : null;
    const currentArea = player.currentGatherArea ? getGatheringArea(player.currentGatherArea) : null;
    
    let description = 'Choose a gathering activity to auto-farm resources continuously!\n\n💡 **How it works:**\n• Gathers every 5 seconds automatically\n• **Works in the background** - navigate freely!\n• Return here anytime to check progress or stop\n• Passive stat boosts as you level!';
    
    // Pick the right icon for the active skill (or default ⛏️)
    const skillIcon = gatheringSkill ? (gatheringSkill.icon || '⛏️') : '⛏️';

    if (isGathering && gatheringSkill) {
      const elapsedMs = Date.now() - player.autoGatherStartTime;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const areaText = currentArea ? ` at **${currentArea.name}**` : '';
      description = `🔄 **Currently Gathering: ${gatheringSkill.name}**${areaText}\n⏱️ Duration: ${elapsedMinutes} minutes\n${skillIcon} Cycles: ${player.autoGatherCount}\n📈 Total XP: ${player.autoGatherTotalXp}\n\n` + description;
    }
    
    const embed = new EmbedBuilder()
      .setColor(isGathering ? 0x27ae60 : 0x3498db)
      .setTitle(`${skillIcon} Auto-Gathering${gatheringSkill ? ': ' + gatheringSkill.name : ''}`)
      .setDescription(description);

    // Show selected gathering area if any
    if (player.currentGatherArea && currentArea) {
      const skillIcons = {
        mining: '⛏️',
        chopping: '🪓',
        gathering: '🌿'
      };
      const availableSkills = currentArea.skillTypes.map(s => skillIcons[s] || s).join(' ');
      
      embed.addFields({
        name: '📍 Current Area',
        value: `**${currentArea.name}**\n${currentArea.description}\n⭐ Difficulty: ${currentArea.difficulty} | 💎 Rare Chance: ${(currentArea.rarity * 100).toFixed(0)}%\n🎯 Available Skills: ${availableSkills}`,
        inline: false,
      });
    }

    const buttons = [];
    
    if (isGathering) {
      // Show status and stop button
      const statusRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-gather-status')
          .setLabel('📊 View Detailed Status')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rpg-stop-autogather')
          .setLabel('⏹️ Stop Gathering')
          .setStyle(ButtonStyle.Danger)
      );
      buttons.push(statusRow);
    } else {
      // Show skill selection - filter based on current area's available skills
      const areaSkillTypes = currentArea?.skillTypes || ['mining', 'chopping', 'gathering'];
      
      const skillRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-autogather-mining')
          .setLabel('⛏️ Mining')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!areaSkillTypes.includes('mining')),
        new ButtonBuilder()
          .setCustomId('rpg-autogather-chopping')
          .setLabel('🪓 Chopping')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!areaSkillTypes.includes('chopping')),
        new ButtonBuilder()
          .setCustomId('rpg-autogather-gathering')
          .setLabel('🌿 Gathering')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!areaSkillTypes.includes('gathering'))
      );
      buttons.push(skillRow);

      // Add area selection and manage tools buttons
      const areaRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-gather-choose-area')
          .setLabel('📍 Choose Gathering Area')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rpg-manage-tools')
          .setLabel('🔧 Manage Tools')
          .setStyle(ButtonStyle.Secondary)
      );
      buttons.push(areaRow);
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
  }

  /**
   * Handle gathering area selection - shows compact list
   */,

  async handleGatheringAreaSelect(interaction, player, skipTracking = false) {
    if (!skipTracking) {
      this.trackMenuNavigation(player, 'gather-area-select');
    } else {
      // Even when skipping history, update currentMenu so back button works
      player.currentMenu = 'gather-area-select';
    }
    
    const playerLevel = player.level || 1;
    const gatheringLevel = getGatheringProfessionLevel(player);
    const currentTool = getGatheringToolTier(gatheringLevel);
    const toolEquipped = player.gatheringToolTier || 0;
    
    const availableAreas = getAvailableAreas(playerLevel);
    
    if (!availableAreas || availableAreas.length === 0) {
      await interaction.reply({
        content: '❌ No gathering areas available.',
        ephemeral: true,
      });
      return;
    }

    // Show compact list
    const areasList = availableAreas
      .map((area) => {
        const locked = playerLevel < area.minLevel ? ' 🔒' : '';
        const selected = player.currentGatherArea === area.id ? ' ✅' : '';
        return `**${area.name}** (Lvl ${area.minLevel}+ | Diff ${area.difficulty})${locked}${selected}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('📍 Gathering Areas')
      .setDescription(
        `Select an area below to view details and set it as your gathering location.\n\n` +
        `**Current Tool:** ${currentTool.name} (${currentTool.tier})\n` +
        `**Gathering Level:** ${gatheringLevel}\n` +
        // Check if there's a higher tier tool available at this level
        `${GATHERING_TOOL_TIERS.some(t => gatheringLevel >= t.level && toolEquipped < GATHERING_TOOL_TIERS.indexOf(t)) ? '⚠️ _You can upgrade your tools!_' : '✅ _Tool is up to date_'}`
      )
      .addFields({
        name: 'Available Areas',
        value: areasList,
        inline: false,
      });

    // Create select menu for detailed view
    const selectOptions = availableAreas.map((area) => {
      const isLocked = playerLevel < area.minLevel;
      const skills = area.skillTypes.map(s => s === 'mining' ? '⛏️' : s === 'chopping' ? '🪓' : '🌿').join('');
      return {
        label: area.name.substring(0, 100),
        value: area.id,
        description: `Lvl ${area.minLevel}+ | Diff ${area.difficulty} | ${(area.rarity * 100).toFixed(0)}% rare | ${skills} ${area.skillTypes.join(', ')}`,
        emoji: area.icon,
        default: player.currentGatherArea === area.id,
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-gather-area-select-menu')
      .setPlaceholder('Select an area to view details')
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back-to-gather')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  }

  /**
   * Handle gathering area details view
   */,

  async handleGatheringAreaDetails(interaction, player, areaId) {
    this.trackMenuNavigation(player, 'gather-area-details');
    
    const area = getGatheringArea(areaId);
    if (!area) {
      await interaction.reply({
        content: '❌ Area not found.',
        ephemeral: true,
      });
      return;
    }

    const playerLevel = player.level || 1;
    const isLocked = playerLevel < area.minLevel;
    const commonMaterials = (area.materials?.common || []).join(', ');
    const rareMaterials = (area.materials?.rare || []).join(', ');
    const skillTypes = area.skillTypes.join(', ');

    // Calculate drop chances for unified view - use cached materials
    const dashboardMaterials = this.getCachedData('dashboard-materials', getMaterials);
    let dropChances = { common: {}, rare: {} };

    const commonCount = area.materials?.common?.length || 0;
    const commonChance = commonCount > 0 ? ((1 - area.rarity) / commonCount) * 100 : 0;

    if (area.materials?.common) {
      area.materials.common.forEach((matId) => {
        const dashMat = dashboardMaterials[matId];
        const displayChance = dashMat?.dropChance || commonChance;
        dropChances.common[matId] = {
          chance: displayChance,
          source: dashMat ? 'dashboard' : 'hardcoded',
          level: dashMat?.adventureLevel || 1,
        };
      });
    }

    const rareCount = area.materials?.rare?.length || 0;
    const rareChance = rareCount > 0 ? (area.rarity / rareCount) * 100 : 0;

    if (area.materials?.rare) {
      area.materials.rare.forEach((matId) => {
        const dashMat = dashboardMaterials[matId];
        const displayChance = dashMat?.dropChance || rareChance;
        dropChances.rare[matId] = {
          chance: displayChance,
          source: dashMat ? 'dashboard' : 'hardcoded',
          level: dashMat?.adventureLevel || 1,
        };
      });
    }

    // Build drop chance field values
    const commonDropValue = Object.entries(dropChances.common)
      .sort((a, b) => b[1].chance - a[1].chance)
      .map(([matId, data]) => {
        const source = data.source === 'dashboard' ? '📌' : '📝';
        return `${source} **${matId}** - ${data.chance.toFixed(1)}%${data.level > 1 ? ` (Lvl ${data.level}+)` : ''}`;
      })
      .join('\n') || 'None';

    const rareDropValue = Object.entries(dropChances.rare)
      .sort((a, b) => b[1].chance - a[1].chance)
      .map(([matId, data]) => {
        const source = data.source === 'dashboard' ? '📌' : '📝';
        return `${source} **${matId}** - ${data.chance.toFixed(1)}%${data.level > 1 ? ` (Lvl ${data.level}+)` : ''}`;
      })
      .join('\n') || 'None';

    const embed = new EmbedBuilder()
      .setColor(isLocked ? 0xe74c3c : 0x27ae60)
      .setTitle(area.name)
      .setDescription(area.description)
      .addFields(
        { name: '⭐ Difficulty', value: `${area.difficulty}`, inline: true },
        { name: '📍 Level Required', value: `${area.minLevel}+`, inline: true },
        { name: '💎 Rare Chance', value: `${(area.rarity * 100).toFixed(0)}%`, inline: true },
        { name: '📈 Base XP', value: `${area.baseXp}`, inline: true },
        { name: '🎯 Skills', value: skillTypes, inline: true },
        { name: '', value: '', inline: true }, // spacer
        { name: '📦 Common Materials', value: commonMaterials || 'None', inline: false },
        { name: '✨ Rare Materials', value: rareMaterials || 'None', inline: false },
        { name: `📊 Common Drop Chances (${((1 - area.rarity) * 100).toFixed(1)}% total)`, value: commonDropValue, inline: false },
        { name: `📊 Rare Drop Chances (${(area.rarity * 100).toFixed(1)}% total)`, value: rareDropValue, inline: false }
      );

    const rows = [];

    // Top row: Select area button only (no more separate drop chances button)
    const topRowButtons = [];
    if (!isLocked) {
      topRowButtons.push(
        new ButtonBuilder()
          .setCustomId(`rpg-gather-area-${areaId}`)
          .setLabel(`Select ${area.name.substring(0, 30)}`)
          .setStyle(ButtonStyle.Success)
      );
    }

    if (topRowButtons.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(topRowButtons));
    }

    // Back button
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-gather-area-details-back')
          .setLabel('← Back to Areas')
          .setStyle(ButtonStyle.Secondary)
      )
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  }

  /**
   * Handle showing drop chances for gathering area
   */,

  async handleGatheringAreaDrops(interaction, player, areaId) {
    this.trackMenuNavigation(player, 'gather-area-drops');

    const area = getGatheringArea(areaId);
    
    if (!area) {
      await interaction.update({
        content: `❌ Area not found.\nReceived ID: "${areaId}"\nAvailable: forest, mine, shadow_forest, deep_mine, enchanted_garden, mithril_mine, ancient_forest, dragon_peak, elders_grotto`,
        embeds: [],
        components: [],
      });
      return;
    }

    const playerLevel = player.level || 1;
    const dashboardMaterials = this.getCachedData('dashboard-materials', getMaterials);

    // Calculate drop chances
    let dropChances = { common: {}, rare: {} };

    // Hardcoded common materials
    const commonCount = area.materials?.common?.length || 0;
    const commonChance = commonCount > 0 ? ((1 - area.rarity) / commonCount) * 100 : 0;

    if (area.materials?.common) {
      area.materials.common.forEach((matId) => {
        const dashMat = dashboardMaterials[matId];
        const displayChance = dashMat?.dropChance || commonChance;
        dropChances.common[matId] = {
          chance: displayChance,
          source: dashMat ? 'dashboard' : 'hardcoded',
          level: dashMat?.adventureLevel || 1,
        };
      });
    }

    // Hardcoded rare materials
    const rareCount = area.materials?.rare?.length || 0;
    const rareChance = rareCount > 0 ? (area.rarity / rareCount) * 100 : 0;

    if (area.materials?.rare) {
      area.materials.rare.forEach((matId) => {
        const dashMat = dashboardMaterials[matId];
        const displayChance = dashMat?.dropChance || rareChance;
        dropChances.rare[matId] = {
          chance: displayChance,
          source: dashMat ? 'dashboard' : 'hardcoded',
          level: dashMat?.adventureLevel || 1,
        };
      });
    }

    // Build drop chance fields
    const commonFieldValue = Object.entries(dropChances.common)
      .sort((a, b) => b[1].chance - a[1].chance)
      .map(([matId, data]) => {
        const source = data.source === 'dashboard' ? '📌' : '📝';
        return `${source} **${matId}** - ${data.chance.toFixed(1)}%${data.level > 1 ? ` (Lvl ${data.level}+)` : ''}`;
      })
      .join('\n') || 'None';

    const rareFieldValue = Object.entries(dropChances.rare)
      .sort((a, b) => b[1].chance - a[1].chance)
      .map(([matId, data]) => {
        const source = data.source === 'dashboard' ? '📌' : '📝';
        return `${source} **${matId}** - ${data.chance.toFixed(1)}%${data.level > 1 ? ` (Lvl ${data.level}+)` : ''}`;
      })
      .join('\n') || 'None';

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`📊 ${area.name} - Drop Chances`)
      .setDescription('Breakdown of material drop percentages in this area')
      .addFields(
        {
          name: `📦 Common Materials (${(((1 - area.rarity) * 100).toFixed(1))}% total)`,
          value: commonFieldValue,
          inline: false,
        },
        {
          name: `✨ Rare Materials (${((area.rarity * 100).toFixed(1))}% total)`,
          value: rareFieldValue,
          inline: false,
        },
        {
          name: 'Legend',
          value: '📝 = Hardcoded Material\n📌 = Dashboard Material (crafting.json)',
          inline: false,
        }
      );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rpg-gather-area-details-${areaId}`)
        .setLabel('← Back to Area Details')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backRow],
    });
  }

  /**
   * Handle gather status view - shows detailed overview directly
   */,

  async handleGatherStatus(interaction, player) {
    return this.handleGatherDetailedOverview(interaction, player);
  }

  /**
   * Handle detailed gathering overview
   */,

  async handleGatherDetailedOverview(interaction, player) {
    this.trackMenuNavigation(player, 'autogather-overview');
    
    if (!player.isAutoGathering) {
      await interaction.reply({ content: 'You are not currently gathering.', ephemeral: true });
      return;
    }

    const skill = getGatheringSkill(player.autoGatherSkill);
    const area = player.currentGatherArea ? getGatheringArea(player.currentGatherArea) : null;
    const elapsedMs = Date.now() - player.autoGatherStartTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const elapsedHours = Math.floor(elapsedMinutes / 60);

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('📊 Gathering Session Overview')
      .addFields(
        { name: '⚙️ Gathering Skill', value: String(skill?.name || player.autoGatherSkill || 'Unknown'), inline: true },
        { name: '📍 Current Area', value: String(area?.name || 'Random Areas'), inline: true },
        { name: '📈 Total XP Earned', value: String(player.autoGatherTotalXp || 0), inline: true },
        { name: '⏱️ Duration', value: elapsedHours > 0 
          ? `${elapsedHours}h ${elapsedMinutes % 60}m` 
          : `${elapsedMinutes}m ${elapsedSeconds % 60}s`, inline: true },
        { name: '⛏️ Gathering Cycles', value: String(player.autoGatherCount || 0), inline: true },
        { name: '📦 Items in Inventory', value: String(player.inventory?.length || 0), inline: true }
      );

    // Show materials collected summary
    if (player.materials && Object.keys(player.materials).length > 0) {
      const materialsList = Object.entries(player.materials)
        .slice(0, 10)
        .map(([matId, qty]) => {
          const mat = getMaterial(matId);
          return `${mat?.name || matId}: **${qty}**`;
        })
        .join('\n');
      
      const remaining = Object.keys(player.materials).length > 10 
        ? `\n+(${Object.keys(player.materials).length - 10} more)`
        : '';
      
      const materialsValue = (materialsList || 'No materials yet') + remaining;
      
      embed.addFields({
        name: '💎 Materials Collected',
        value: String(materialsValue),
        inline: false,
      });
    }

    // Add note about auto-updating
    embed.addFields({
      name: '✨ Auto-Updating',
      value: 'This view updates automatically every 30 seconds while active!',
      inline: false,
    });

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-stop-autogather')
        .setLabel('⏹️ Stop Gathering')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-back-to-gather')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    // Send the message and start updates
    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttonRow],
    });

    // Get message ID from interaction and start periodic updates
    try {
      const message = await interaction.fetchReply();
      if (message) {
        this.autoGatherManager.startMessageUpdates(
          player.userId,
          message.id,
          interaction.channelId,
          this.client
        );
      }
    } catch (err) {
      // Silently fail - message updates optional
    }
  }

  /**
   * Start auto-gathering for a player
   */,

  async handleStartAutoGather(interaction, player, skillId) {
    this.trackMenuNavigation(player, 'autogather');
    
    // Handle "Gather All" button - find multi-skill area
    if (skillId === 'all') {
      if (player.pendingGatherAllMaterials && player.pendingGatherAllMaterials.length > 0) {
        const bestArea = this.getBestMultiSkillAreaForMaterials(
          player.pendingGatherAllMaterials,
          player.level || 1,
          player.worldsUnlocked || []
        );
        
        if (bestArea) {
          player.currentGatherArea = bestArea.id;
          // Default to first supported skill for the area
          skillId = bestArea.skillTypes[0];
        } else {
          await interaction.reply({ 
            content: '❌ No area found that supports all needed gathering types. Try selecting a specific skill instead.', 
            ephemeral: true 
          });
          return;
        }
        
        player.pendingGatherAllMaterials = null;
        player.pendingGatherMaterialsBySkill = null;
      } else {
        await interaction.reply({ content: '❌ No pending materials to gather.', ephemeral: true });
        return;
      }
    }

    const skill = getGatheringSkill(skillId);
    if (!skill) {
      await interaction.reply({ content: 'Unknown gathering skill.', ephemeral: true });
      return;
    }

    if (player.pendingGatherMaterialsBySkill && typeof player.pendingGatherMaterialsBySkill === 'object') {
      const pending = player.pendingGatherMaterialsBySkill[skillId] || [];
      if (pending.length > 0) {
        const bestArea = this.getBestGatheringAreaForMaterials(
          pending,
          skillId,
          player.level || 1,
          player.worldsUnlocked || []
        );
        player.currentGatherArea = bestArea ? bestArea.id : null;
      }
      player.pendingGatherAllMaterials = null;
      player.pendingGatherMaterialsBySkill = null;
      player.pendingGatherSkill = null;
    }

    // Start auto-gather
    const result = this.autoGatherManager.startAutoGather(player, skillId, interaction);
    if (!result.success) {
      await interaction.reply({ content: `Error: ${result.error}`, ephemeral: true });
      return;
    }

    this.persistPlayer(player);

    // Show initial summary
    const embed = this.autoGatherManager.createAutoGatherSummaryEmbed(player, skill);
    const buttons = this.autoGatherManager.getStopButton();

    // Update interaction - no periodic updates, just let them navigate away
    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });

    // Auto-gathering continues silently in background
    // No message updates - user can navigate freely without being interrupted
  }

  /**
   * Auto-gather from a specific area for missing materials
   */,

  async handleAutoGatherFromArea(interaction, player, areaId) {
    this.trackMenuNavigation(player, 'autogather');
    
    const area = getGatheringArea(areaId);
    if (!area) {
      await interaction.reply({ content: '❌ Gathering area not found.', ephemeral: true });
      return;
    }

    // Set the area for gathering
    player.currentGatherArea = areaId;

    // Determine which skill to use (just use first available skill for this area)
    const skillId = area.skillTypes && area.skillTypes.length > 0 ? area.skillTypes[0] : 'gathering';
    const skill = getGatheringSkill(skillId);
    if (!skill) {
      await interaction.reply({ content: 'Unknown gathering skill.', ephemeral: true });
      return;
    }

    // Start auto-gather
    const result = this.autoGatherManager.startAutoGather(player, skillId, interaction);
    if (!result.success) {
      await interaction.reply({ content: `Error: ${result.error}`, ephemeral: true });
      return;
    }

    this.persistPlayer(player);

    // Show initial summary
    const embed = this.autoGatherManager.createAutoGatherSummaryEmbed(player, skill);
    const buttons = this.autoGatherManager.getStopButton();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Stop auto-gathering (legacy handler for individual gather - now unused)
   */,

  async handleGather(interaction, player, skillId) {
    const skill = getGatheringSkill(skillId);
    if (!skill) {
      await interaction.reply({ content: 'Unknown gathering skill.', ephemeral: true });
      return;
    }

    const now = Date.now();
    const timeWaited = now - player.lastGatherTime[skillId];
    const minutesWaited = Math.floor(timeWaited / 60000);

    // Perform gathering - rarity based on wait time
    const balance = loadBalanceData();
    const baseXp = skill.baseXp;
    const xpMult = Number(balance.gatheringXpMultiplier) || 1;
    const xpGained = Math.floor(baseXp * (1 + player.gatheringLevels[skillId] * 0.1) * xpMult);
    const materialsRaw = generateGatheringMaterials(skillId, player.gatheringLevels[skillId], timeWaited);

    // Map materials to include names
    const materials = materialsRaw.map((mat) => {
      const matData = getMaterial(mat.id);
      return {
        ...mat,
        name: matData?.name || mat.id,
      };
    });

    // Add XP and check level up
    const currentLevel = player.gatheringLevels[skillId];
    const currentXpToLevel = getGatheringXpToNextLevel(currentLevel);
    player.gatheringXp[skillId] += xpGained;

    let levelsGained = 0;
    while (player.gatheringXp[skillId] >= currentXpToLevel) {
      player.gatheringXp[skillId] -= currentXpToLevel;
      player.gatheringLevels[skillId] += 1;
      levelsGained += 1;
    }

    // Add materials to inventory
    for (const mat of materials) {
      this.addMaterialToInventory(player, mat.id, mat.quantity);
    }

    // Track guild quest progress for gathering
    const dailyQuests = getAvailableDailyQuests(player.level, player.dailyQuestsCompleted);
    const weeklyQuests = getAvailableWeeklyQuests(player.level, player.weeklyQuestsCompleted);
    const claimedLimited = (player.claimedQuests || [])
      .map(id => getGuildQuestById(id))
      .filter(Boolean)
      .filter(q => !player.limitedQuestsCompleted.includes(q.id));

    if (!player.guildQuestProgress) player.guildQuestProgress = {};

    for (const mat of materials) {
      const event = {
        type: 'gather',
        target: mat.id,
        targetName: mat.name || mat.id,
        count: mat.quantity || 1,
      };
      this.applyGuildQuestProgress(player, dailyQuests, weeklyQuests, claimedLimited, event);
    }

    player.lastGatherTime[skillId] = now;
    player.clearStatsCache(); // Clear cache after gathering (gains stat boosts)
    this.persistPlayer(player);

    // Show results with time bonus info
    const embed = UIBuilder.createGatheringResultEmbed(
      skill,
      xpGained,
      levelsGained,
      player.gatheringLevels[skillId],
      materials,
      minutesWaited
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rpg-gather-again-${skillId}`)
        .setLabel(`${skill.icon} Again`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-back-to-gather')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Stop auto-gathering for a player
   */,

  async handleStopAutoGather(interaction, player) {
    // Stop message updates
    this.autoGatherManager.stopMessageUpdates(player.userId);

    if (!player.isAutoGathering) {
      await interaction.reply({ content: 'You are not currently auto-gathering.', ephemeral: true });
      return;
    }

    const skill = getGatheringSkill(player.autoGatherSkill);
    const elapsedMs = Date.now() - player.autoGatherStartTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    // Capture summary data BEFORE stopping (in case it gets cleared)
    const cycles = player.autoGatherCount || 0;
    const totalXp = player.autoGatherTotalXp || 0;
    const currentLevel = player.gatheringLevels[player.autoGatherSkill];
    const materialsGathered = { ...player.autoGatherMaterials }; // Copy the object

    // Transfer gathered materials to actual inventory before stopping
    if (player.autoGatherMaterials && Object.keys(player.autoGatherMaterials).length > 0) {
      for (const [materialId, quantity] of Object.entries(player.autoGatherMaterials)) {
        this.addMaterialToInventory(player, materialId, quantity);
      }
      // Clear the temporary gathering materials after transfer
      player.autoGatherMaterials = {};
    }

    // Stop the gathering
    this.autoGatherManager.stopAutoGather(player);
    this.persistPlayer(player);

    // Create final summary
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`${skill.icon} Auto-Gathering Complete!`)
      .setDescription(`You finished your auto-gathering session.`)
      .addFields(
        {
          name: '⏱️ Total Time',
          value: `${elapsedMinutes}m ${elapsedSeconds % 60}s`,
          inline: true,
        },
        {
          name: '⛏️ Cycles',
          value: `${cycles}`,
          inline: true,
        },
        {
          name: '📈 Total XP',
          value: `${totalXp}`,
          inline: true,
        },
        {
          name: '⭐ Level',
          value: `${currentLevel}`,
          inline: true,
        }
      )
      .setTimestamp();

    // Materials summary
    if (Object.keys(materialsGathered).length > 0) {
      let materialsText = Object.entries(materialsGathered)
        .map(([id, qty]) => {
          const mat = getMaterial(id);
          return `• ${mat?.name || id}: ${qty}`;
        })
        .join('\n');
      embed.addFields({
        name: '🧰 Materials Gathered',
        value: materialsText,
        inline: false,
      });
    } else {
      embed.addFields({
        name: '🧰 Materials Gathered',
        value: 'No materials gathered yet',
        inline: false,
      });
    }

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
   * Handle goals/objectives display
   */,

  async handleGatheringRewards(interaction, player) {
    this.trackMenuNavigation(player, 'gather-rewards');
    this.applyMissingGatheringRewards(player);
    
    // Import the gathering rewards
    const { getGatheringProfessionLevel } = await import('../data/gathering.js');
    const { getGatheringReward, getNextGatheringMilestone, getGatheringRewardsUpTo } = await import('../data/gathering-rewards.js');
    
    const gatheringLevel = getGatheringProfessionLevel(player);
    const currentReward = getGatheringReward(gatheringLevel);
    const nextMilestone = getNextGatheringMilestone(gatheringLevel);
    const allRewards = getGatheringRewardsUpTo(gatheringLevel);
    
    // Build rewards list
    const rewardsList = allRewards
      .filter(r => !r.isSmall) // Only show major milestones
      .slice(-5) // Show last 5 major milestones
      .map(r => {
        const level = r.level;
        const rewards = r.rewards ? r.rewards.join(', ') : 'None';
        const tools = r.tools ? `\n🔧 Tools: ${r.tools.join(', ')}` : '';
        const bonuses = r.passiveBonus ? 
          `\n📊 Stats: ${Object.entries(r.passiveBonus).map(([stat, val]) => `${stat}+${val}`).join(', ')}` : '';
        return `**Level ${level}**\n${rewards}${tools}${bonuses}`;
      })
      .join('\n\n');
    
    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('🎁 Gathering Profession Rewards')
      .setDescription(
        `**Your Gathering Level: ${gatheringLevel}**\n\n` +
        `Gathering levels provide powerful bonuses including:\n` +
        `• **Specialized Tools** that boost gathering efficiency\n` +
        `• **Passive Stat Bonuses** that make you stronger\n` +
        `• **Yield & Rarity Bonuses** for better materials\n` +
        `• **Access to Better Areas** with rarer materials`
      );
    
    if (currentReward) {
      const currentBonuses = currentReward.passiveBonus ? 
        Object.entries(currentReward.passiveBonus).map(([stat, val]) => `${stat.toUpperCase()}+${val}`).join(', ') : 
        'None';
      embed.addFields({
        name: `✨ Current Level ${gatheringLevel} Bonuses`,
        value: currentBonuses,
        inline: false
      });
    }
    
    if (nextMilestone) {
      const nextRewards = nextMilestone.reward.rewards ? nextMilestone.reward.rewards.join('\n• ') : 'None';
      embed.addFields({
        name: `🎯 Next Major Milestone: Level ${nextMilestone.level}`,
        value: `• ${nextRewards}`,
        inline: false
      });
    }
    
    if (rewardsList) {
      embed.addFields({
        name: '📚 Recent Milestones Unlocked',
        value: rewardsList || 'None yet',
        inline: false
      });
    }
    
    embed.setFooter({ text: 'Keep gathering to unlock more rewards!' });
    
    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back-to-gather')
        .setLabel('← Back to Gathering')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-hub')
        .setLabel('🏠 Hub')
        .setStyle(ButtonStyle.Primary)
    );
    
    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backRow],
    });
  }

  /**
   * Handle gathering tools management
   */,

  async handleGatheringTools(interaction, player) {
    this.trackMenuNavigation(player, 'gathering-tools');
    
    const gatheringLevel = getGatheringProfessionLevel(player);
    const currentToolTier = player.gatheringToolTier || 0;
    const availableToolTier = getGatheringToolTier(gatheringLevel);
    
    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('🛠️ Gathering Tools')
      .setDescription(
        `Upgrade your gathering tools to unlock higher tier equipment and improve your efficiency!\n\n` +
        `**Your Gathering Level:** ${gatheringLevel}\n` +
        `**Current Tool Tier:** ${currentToolTier || 'None'}\n` +
        `**Available Tool Tier:** ${availableToolTier.tier} (Level ${availableToolTier.level}+)`
      );

    // Show all tool tiers
    const worldsUnlocked = player.worldsUnlocked || [];
    const toolsList = GATHERING_TOOL_TIERS.map((tool, index) => {
      const isOwned = currentToolTier >= index;
      const hasWorldAccess = !tool.requiredWorld || worldsUnlocked.includes(tool.requiredWorld);
      const canBuy = gatheringLevel >= tool.level && currentToolTier < index && hasWorldAccess;
      const cost = Math.floor(500 * Math.pow(2, index)); // Exponential cost
      
      let status = '';
      if (isOwned) status = '✅ Owned';
      else if (!hasWorldAccess) status = '🌍 Requires Asgard Access';
      else if (canBuy) status = `💰 ${cost} gold`;
      else status = `🔒 Level ${tool.level}+ required`;
      
      return `**${tool.name}** (${tool.tier})\n└ ${status}`;
    }).join('\n\n');

    embed.addFields({
      name: '📦 Available Tools',
      value: toolsList,
      inline: false,
    });

    embed.addFields({
      name: '💡 Benefits',
      value: 
        '• **Better Tools** = Higher efficiency\n' +
        '• **Unlock Tool Recipes** at gathering profession milestones\n' +
        '• **Automatic Upgrades** when you reach new tier levels',
      inline: false,
    });

    const rows = [];
    
    // Add purchase buttons for available tools
    const buyButtons = [];
    GATHERING_TOOL_TIERS.forEach((tool, index) => {
      const hasWorldAccess = !tool.requiredWorld || worldsUnlocked.includes(tool.requiredWorld);
      const canBuy = gatheringLevel >= tool.level && currentToolTier < index && hasWorldAccess;
      if (canBuy && buyButtons.length < 5) {
        const cost = Math.floor(500 * Math.pow(2, index));
        buyButtons.push(
          new ButtonBuilder()
            .setCustomId(`rpg-buy-gathering-tool-${index}`)
            .setLabel(`${tool.tier} (${cost}g)`)
            .setStyle(ButtonStyle.Success)
            .setDisabled((player.gold || 0) < cost)
        );
      }
    });

    if (buyButtons.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(buyButtons));
    }

    // Back button
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-back-to-gather')
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
   * Handle buying a gathering tool
   */,

  async handleBuyGatheringTool(interaction, player, tier) {
    const gatheringLevel = getGatheringProfessionLevel(player);
    const currentToolTier = player.gatheringToolTier || 0;
    const tool = GATHERING_TOOL_TIERS[tier];
    
    if (!tool) {
      await interaction.reply({
        content: '❌ Invalid tool tier.',
        ephemeral: true,
      });
      return;
    }

    // Check requirements
    if (gatheringLevel < tool.level) {
      await interaction.reply({
        content: `❌ You need gathering level ${tool.level}+ to purchase this tool.`,
        ephemeral: true,
      });
      return;
    }

    // Check world access requirement
    if (tool.requiredWorld) {
      const worldsUnlocked = player.worldsUnlocked || [];
      if (!worldsUnlocked.includes(tool.requiredWorld)) {
        await interaction.reply({
          content: `❌ You need to unlock Asgard (Tier 2 World) to purchase this tool!`,
          ephemeral: true,
        });
        return;
      }
    }

    if (currentToolTier >= tier) {
      await interaction.reply({
        content: '❌ You already own this or a better tool!',
        ephemeral: true,
      });
      return;
    }

    const cost = Math.floor(500 * Math.pow(2, tier));
    if ((player.gold || 0) < cost) {
      await interaction.reply({
        content: `❌ Not enough gold! Need ${cost}, have ${player.gold || 0}.`,
        ephemeral: true,
      });
      return;
    }

    // Purchase the tool
    player.gold -= cost;
    this.trackGoldSpent(player, cost, 'shop');
    player.gatheringToolTier = tier;
    this.persistPlayer(player);

    // Refresh the tools menu
    await this.handleGatheringTools(interaction, player);
  }

  /**
   * Handle Master Blacksmith upgrade purchase
   */,

  async handleMasterBlacksmithUpgrade(interaction, player) {
    const hasAsgardAccess = (player.worldsUnlocked || []).includes('world_1770519709022');
    const blacksmithLevel = player.professionLevels?.blacksmith || 0;
    const cost = 50000;

    // Check requirements
    if (!hasAsgardAccess) {
      await interaction.reply({
        content: '❌ You must unlock Asgard (Tier 2 World) to upgrade to Master Blacksmith!',
        ephemeral: true,
      });
      return;
    }

    if (blacksmithLevel < 25) {
      await interaction.reply({
        content: `❌ You need Blacksmith level 25+ to upgrade! (Current: ${blacksmithLevel})`,
        ephemeral: true,
      });
      return;
    }

    if (player.masterBlacksmith) {
      await interaction.reply({
        content: '❌ You are already a Master Blacksmith!',
        ephemeral: true,
      });
      return;
    }

    if ((player.gold || 0) < cost) {
      await interaction.reply({
        content: `❌ Not enough gold! Need ${cost.toLocaleString()}, have ${(player.gold || 0).toLocaleString()}.`,
        ephemeral: true,
      });
      return;
    }

    // Purchase the upgrade
    player.gold -= cost;
    this.trackGoldSpent(player, cost, 'upgrades');
    player.masterBlacksmith = true;
    this.persistPlayer(player);

    const embed = new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('🔥 Master Blacksmith Unlocked!')
      .setDescription(
        `You have ascended to the legendary rank of **Master Blacksmith**!\n\n` +
        `**New Abilities Unlocked:**\n` +
        `💎 **Gem Crafting** - Forge powerful gems from rare materials\n` +
        `🔷 **Gem Socketing** - Socket gems into equipment for bonus stats\n` +
        `📜 **Legendary Recipes** - Access to Norse god-tier gem recipes\n\n` +
        `**Socket Slots:**\n` +
        `⚔️ Weapon: 2 sockets\n` +
        `🛡️ Chest: 2 sockets\n` +
        `👖 Legs: 1 socket\n` +
        `👢 Boots: 1 socket\n` +
        `🧤 Gloves: 1 socket\n` +
        `⛑️ Helmet: 1 socket`
      )
      .setFooter({ text: 'Visit the professions menu to socket gems and craft legendary items!' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });
  }

  /**
   * Handle gem socketing interface
   */,
};
