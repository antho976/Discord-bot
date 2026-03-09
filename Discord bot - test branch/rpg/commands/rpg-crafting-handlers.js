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
 * rpg-crafting-handlers — extracted from RPGCommand.js
 * 16 methods, ~2165 lines
 */
export const CraftingHandlers = {
  async handleCrafting(interaction, player) {
    this.trackMenuNavigation(player, 'crafting');
    await this.handleCraftingPage(interaction, player, 0, null);
  },

  async handleCraftingPage(interaction, player, page = 0, selectedWorldId = null) {
    const embed = UIBuilder.createCraftingEmbed(player);
    const components = this.buildCraftingComponents(player, page, selectedWorldId);
    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  },

  async handleAlchemy(interaction, player) {
    this.trackMenuNavigation(player, 'alchemy');
    const hasBotanic = player.professions?.includes('botanic');
    const botanicLevel = Number(player.professionLevels?.botanic) || 0;

    const recipes = RECIPES_SORTED.filter((rec) => rec.profession === 'botanic');

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🧪 Alchemy - Potion Brewing')
      .setDescription(
        hasBotanic
          ? `**Botanic Level: ${botanicLevel}**\n**Tier 1-2**: Accessible to all\n**Tier 3-5**: Requires Botanic profession`
          : `**No Botanic Profession**\nAccess Tier 1-2 potions. Tier 3-5 require the profession.\nCosts 50% more materials without profession.`
      );

    const options = recipes.slice(0, 25).map((rec) => {
      const recLevel = Number(rec.level) || 1;
      const recTier = Number(rec.tier) || 1;
      const playerLock = player.level < recLevel;
      const requiresProf = rec.requiresProfession && (!hasBotanic || botanicLevel < recLevel);
      const locked = playerLock || requiresProf;
      
      // Build requirement text
      let reqText = '';
      if (playerLock) {
        reqText = `❌ Requires Player Lvl ${recLevel}`;
      } else if (requiresProf) {
        reqText = `❌ Requires Botanic Lvl ${recLevel}`;
      } else {
        reqText = `✓ Tier ${recTier}`;
      }
      
      // Build materials text
      const matText = Object.entries(rec.materials || {})
        .map(([mat, qty]) => `${Number(qty) || 1}x ${getMaterial(mat)?.name || mat}`)
        .join(', ');
      
      const lockTag = locked ? ' [🔒]' : '';
      const desc = matText ? `${reqText} • ${matText}` : reqText;
      return {
        label: `${rec.name}${lockTag}`.slice(0, 100),
        value: String(rec.id),
        description: (desc || 'Potion').slice(0, 100),
      };
    });

    // Add view details option with special prefix
    const detailOptions = recipes.slice(0, 25).map((rec) => ({
      label: `ℹ️ ${rec.name}`.slice(0, 100),
      value: `details-${String(rec.id)}`,
      description: 'View details'.slice(0, 100),
    }));

    const rows = [];
    if (options.length > 0) {
      // Validate and filter options
      const validOptions = options.filter(opt => opt && opt.label && opt.value);
      const validDetailOptions = detailOptions.filter(opt => opt && opt.label && opt.value);
      
      if (validOptions.length > 0 || validDetailOptions.length > 0) {
        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('rpg-alchemy-select')
              .setPlaceholder('Select a potion to brew or view details')
              .addOptions([...validOptions, ...validDetailOptions].slice(0, 25))
          )
        );
      }
    }

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );
    rows.push(backRow);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  },

  async handleAlchemyCraft(interaction, player, recipeId) {
    const recipe = getRecipe(recipeId);
    if (!recipe || recipe.profession !== 'botanic') {
      await interaction.reply({ content: 'Invalid alchemy recipe.', ephemeral: true });
      return;
    }

    const hasBotanic = player.professions?.includes('botanic');
    const botanicLevel = player.professionLevels?.botanic || 0;
    const requiredLevel = recipe.level || 1;
    const tier = recipe.tier || 1;

    if (player.level < requiredLevel) {
      await interaction.reply({ content: `You need player level ${requiredLevel} to brew this potion.`, ephemeral: true });
      return;
    }

    // Check tier-based access
    if (recipe.requiresProfession && (!hasBotanic || botanicLevel < requiredLevel)) {
      await interaction.reply({ content: `Tier ${tier} potions require Botanic Level ${requiredLevel}.`, ephemeral: true });
      return;
    }

    const baseMaterials = this.getAdjustedMaterials(recipe.materials || {});
    const costMultiplier = this.getProfessionCostMultiplier(player) * (hasBotanic ? 1 : 1.5);
    const adjustedMaterials = this.applyCostMultiplier(baseMaterials, costMultiplier);

    // Create overview embed
    const embed = UIBuilder.createAlchemyEmbed(player, { ...recipe, materials: adjustedMaterials });

    // Add XP and failure rate information
    const xpGain = requiredLevel * 10;
    const currentXp = player.professionXp?.botanic || 0;
    const xpThreshold = 100;
    const xpNeededForNextLevel = xpThreshold - currentXp;
    const xpProgressBar = this.buildProgressBar(currentXp, xpThreshold, 10);
    
    const baseFailChance = Math.min(0.35 + (requiredLevel * 0.03), 0.8);
    const reduction = hasBotanic ? botanicLevel * 0.02 : 0;
    const penalty = hasBotanic ? 0 : 0.15;
    const failChance = Math.min(Math.max(baseFailChance - reduction + penalty, 0.05), 0.9);
    
    // Build materials status with checkmarks and Xs
    const materialStatusList = Object.entries(adjustedMaterials)
      .map(([matId, qty]) => {
        const materialName = getMaterial(matId)?.name || matId;
        const playerCount = this.getMaterialCounts(player)[matId] || 0;
        const hasEnough = playerCount >= qty;
        const icon = hasEnough ? '✅' : '❌';
        return `${icon} ${materialName} x${qty}`;
      })
      .join('\n');
    
    embed.addFields(
      {
        name: '📦 Required Materials',
        value: materialStatusList || 'None',
        inline: false
      },
      {
        name: '⭐ Profession XP',
        value: hasBotanic 
          ? `Gain: **${xpGain} XP** per craft\n` +
            `Progress: ${xpProgressBar} (${currentXp}/${xpThreshold})\n` +
            `Until Next Level: **${xpNeededForNextLevel} XP**`
          : `❌ Not a Botanic - No XP gained`,
        inline: false
      },
      {
        name: '⚠️ Failure Rate',
        value: `${(failChance * 100).toFixed(1)}% chance to waste materials${hasBotanic ? '' : ' (+15% penalty)'}`,
        inline: false
      }
    );

    // Calculate how many times they can craft
    const hasEnough1x = this.hasMaterials(player, adjustedMaterials);
    let maxCrafts = 1;
    if (hasEnough1x) {
      for (let i = 2; i <= 100; i++) {
        const multipliedMats = {};
        for (const [matId, qty] of Object.entries(adjustedMaterials)) {
          multipliedMats[matId] = qty * i;
        }
        if (!this.hasMaterials(player, multipliedMats)) {
          maxCrafts = i - 1;
          break;
        }
        if (i === 100) maxCrafts = 100;
      }
    }
    
    // Build quantity buttons
    const quantityRow = new ActionRowBuilder();
    const buttons = [
      new ButtonBuilder()
        .setCustomId(`rpg-confirm-brew-${recipeId}-1`)
        .setLabel('✅ 1x')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!hasEnough1x)
    ];
    
    if (maxCrafts >= 5) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`rpg-confirm-brew-${recipeId}-5`)
          .setLabel('✅ 5x')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(maxCrafts < 5)
      );
    }
    
    if (maxCrafts >= 10) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`rpg-confirm-brew-${recipeId}-10`)
          .setLabel('✅ 10x')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(maxCrafts < 10)
      );
    }
    
    // Add "Max" button only if max is more than 10
    if (maxCrafts > 10) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`rpg-confirm-brew-${recipeId}-max`)
          .setLabel(`✅ Max (${maxCrafts}x)`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!hasEnough1x)
      );
    }
    
    quantityRow.addComponents(...buttons);
    const components = [quantityRow];

    // Check if missing materials for gather buttons
    const missingMats = this.getMissingMaterials(player, adjustedMaterials);

    if (missingMats.length > 0) {
      // Add gather buttons for missing materials
      const gatherButtons = [];
      const areaMap = this.getGatheringAreasByMaterials(missingMats, player.level || 1);
      const areas = Object.values(areaMap);

      if (areas.length > 0) {
        const gatherRow = new ActionRowBuilder();
        player.pendingGatherAllMaterials = missingMats.map(({ id, quantity }) => ({ id, quantity }));
        this.persistPlayer(player);

        for (const { area, materials } of areas.slice(0, 5)) {
          const matNames = materials.map(m => m.name || getMaterial(m.id)?.name || m.id);
          const label = `🌿 ${area.name}: ${matNames.slice(0, 2).join(', ')}${materials.length > 2 ? ` +${materials.length - 2}` : ''}`;
          
          gatherRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`rpg-autogather-area-${area.id}`)
              .setLabel(label.slice(0, 80))
              .setStyle(ButtonStyle.Primary)
          );
          
          if (gatherRow.components.length >= 5) break;
        }
        
        if (gatherRow.components.length > 0) {
          components.push(gatherRow);
        }
      }
    }

    // Add back button
    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-alchemy')
        .setLabel('← Back to Alchemy')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-hub')
        .setLabel('🏠 Hub')
        .setStyle(ButtonStyle.Primary)
    );
    components.push(backRow);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  },

  async handleAlchemyBrewWithQuantity(interaction, player, recipeId, quantity = 1) {
    // Defer the interaction to allow editReply and followUp later
    await interaction.deferUpdate();

    const recipe = getRecipe(recipeId);
    if (!recipe || recipe.profession !== 'botanic') {
      await interaction.followUp({ content: 'Invalid alchemy recipe.', ephemeral: true });
      return;
    }

    const hasBotanic = player.professions?.includes('botanic');
    const botanicLevel = player.professionLevels?.botanic || 0;
    const requiredLevel = recipe.level || 1;

    const baseMaterials = this.getAdjustedMaterials(recipe.materials || {});
    const costMultiplier = this.getProfessionCostMultiplier(player) * (hasBotanic ? 1 : 1.5);
    const adjustedMaterials = this.applyCostMultiplier(baseMaterials, costMultiplier);

    // Multiply materials by quantity
    const totalMaterials = {};
    for (const [matId, qty] of Object.entries(adjustedMaterials)) {
      totalMaterials[matId] = qty * quantity;
    }

    if (!this.hasMaterials(player, totalMaterials)) {
      await interaction.followUp({
        content: `❌ Not enough materials to brew ${quantity}x.`,
        ephemeral: true,
      });
      return;
    }

    const baseFailChance = Math.min(0.35 + (requiredLevel * 0.03), 0.8);
    const reduction = hasBotanic ? botanicLevel * 0.02 : 0;
    const penalty = hasBotanic ? 0 : 0.15;
    const failChance = Math.min(Math.max(baseFailChance - reduction + penalty, 0.05), 0.9);

    // Consume all materials upfront
    this.consumeMaterials(player, totalMaterials);

    // Get output name before loop
    const outputName = this.getItemDisplayName(recipe.output.item);

    // Process each brew attempt
    let successCount = 0;
    let failCount = 0;
    let totalOutput = 0;
    const xpThreshold = 100;
    const MAX_PROFESSION_LEVEL = 80;
    
    // Send initial progress embed that will be edited
    const initialEmbed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`🧪 Brewing Progress: 0/${quantity}`)
      .setDescription(
        `**Item:** ${outputName}\n` +
        `**Success:** 0 | **Failed:** 0\n` +
        `**Botanic Level:** ${botanicLevel}/${MAX_PROFESSION_LEVEL}\n` +
        `**XP Gained:** 0 XP\n` +
        `**Progress:** 0/${quantity}`
      );

    let progressMessage = await interaction.editReply({ embeds: [initialEmbed] });

    for (let i = 0; i < quantity; i++) {
      const roll = Math.random();
      if (roll < failChance) {
        failCount++;
      } else {
        successCount++;
        totalOutput += recipe.output.quantity;
      }

      // Update overview embed to show progress every craft (or every 5 for large batches)
      const shouldUpdate = quantity <= 10 || (i + 1) % 5 === 0 || i === quantity - 1;
      if (shouldUpdate) {
        const xpGainCurrent = requiredLevel * 10 * successCount;
        const currentBotanicLevel = player.professionLevels.botanic || 1;
        const currentXp = player.professionXp?.botanic || 0;
        const xpProgress = currentXp % xpThreshold;
        const xpNeeded = xpThreshold - xpProgress;
        const xpProgressBar = this.buildProgressBar(xpProgress, xpThreshold, 10);

        const updatedEmbed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle(`🧪 Brewing Progress: ${i + 1}/${quantity}`)
          .setDescription(
            `**Item:** ${outputName}\n` +
            `**Success:** ${successCount} | **Failed:** ${failCount}\n` +
            `**Botanic Level:** ${currentBotanicLevel}/${MAX_PROFESSION_LEVEL}\n` +
            `**XP Progress:** ${xpProgressBar} (${xpProgress}/${xpThreshold})\n` +
            `**XP Gained:** ${xpGainCurrent} XP\n` +
            `**Until Next Level:** ${xpNeeded} XP`
          );

        try {
          await interaction.editReply({ embeds: [updatedEmbed] });
        } catch (err) {
          // Silently fail if edit rate limit hit
        }
      }
    }

    // Add all successful brews to inventory
    let craftResult = { equipped: [], added: [] };
    if (totalOutput > 0) {
      craftResult = this.addCraftedItem(player, recipe.output.item, totalOutput);
    }

    // Award XP for successful brews
    if (hasBotanic && successCount > 0) {
      const xpGain = requiredLevel * 10 * successCount;
      player.professionXp = player.professionXp || {};
      player.professionLevels = player.professionLevels || {};
      
      if (botanicLevel < MAX_PROFESSION_LEVEL) {
        player.professionXp.botanic = (player.professionXp.botanic || 0) + xpGain;
        while (player.professionXp.botanic >= xpThreshold && (player.professionLevels.botanic || 1) < MAX_PROFESSION_LEVEL) {
          player.professionXp.botanic -= xpThreshold;
          player.professionLevels.botanic = (player.professionLevels.botanic || 1) + 1;
        }
        // Cap excess XP at max level
        if ((player.professionLevels.botanic || 1) >= MAX_PROFESSION_LEVEL) {
          player.professionXp.botanic = 0;
        }
      }
    }

    this.persistPlayer(player);

    // Show final result message
    let resultMessage = '';
    if (successCount > 0) {
      resultMessage += `✅ Successfully brewed **${outputName} x${totalOutput}**`;
      if (failCount > 0) {
        resultMessage += `\n❌ ${failCount} brew(s) failed (wasted materials)`;
      }
    } else {
      resultMessage = `❌ All ${quantity} brew(s) failed! Materials wasted. (Fail chance: ${(failChance * 100).toFixed(1)}%)`;
    }

    const response = await interaction.followUp({
      content: resultMessage,
      ephemeral: false,
      fetchReply: true,
    });
    
    // Delete the result message after 5 seconds
    setTimeout(() => {
      response.delete().catch(() => {});
    }, 5000);
  },

  async handlePotionDetails(interaction, player, recipeId) {
    const recipe = getRecipe(recipeId);
    if (!recipe || recipe.profession !== 'botanic') {
      await interaction.reply({ content: 'Invalid potion recipe.', ephemeral: true });
      return;
    }

    const getPotionEffect = (itemId) => {
      if (itemId.includes('xp_potion')) {
        const tier = parseInt(itemId.match(/t(\d+)/)?.[1] || 1);
        const bonus = [10, 20, 35, 50, 75][tier - 1] || 10;
        return `+${bonus}% XP gain for the next combat or quest`;
      }
      if (itemId.includes('gold_potion')) {
        const tier = parseInt(itemId.match(/t(\d+)/)?.[1] || 1);
        const bonus = [10, 20, 35, 50, 75][tier - 1] || 10;
        return `+${bonus}% Gold earned for the next combat or quest`;
      }
      if (itemId.includes('health_potion')) {
        const tier = parseInt(itemId.match(/t(\d+)/)?.[1] || 1);
        const heal = [50, 100, 200, 350, 500][tier - 1] || 50;
        return `Restores ${heal} HP instantly`;
      }
      if (itemId.includes('gathering_potion')) {
        const tier = parseInt(itemId.match(/t(\d+)/)?.[1] || 1);
        const bonus = [15, 25, 40, 60, 80][tier - 1] || 15;
        return `+${bonus}% gathering yield for 30 minutes`;
      }
      if (itemId.includes('loot_potion')) {
        const tier = parseInt(itemId.match(/t(\d+)/)?.[1] || 1);
        const bonus = [10, 20, 30, 45, 60][tier - 1] || 10;
        return `+${bonus}% rare loot chance for next 5 combats`;
      }
      return 'Unknown effect';
    };

    const effect = getPotionEffect(recipe.output.item);
    const tier = recipe.tier || 1;
    const tierNames = ['', 'Basic', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    
    // Build materials status with checkmarks and Xs
    const baseMaterials = this.getAdjustedMaterials(recipe.materials || {});
    const costMultiplier = this.getProfessionCostMultiplier(player) * (player.professions?.includes('botanic') ? 1 : 1.5);
    const adjustedMaterials = this.applyCostMultiplier(baseMaterials, costMultiplier);
    
    const matList = Object.entries(adjustedMaterials)
      .map(([matId, qty]) => {
        const materialName = getMaterial(matId)?.name || matId;
        const playerCount = this.getMaterialCounts(player)[matId] || 0;
        const hasEnough = playerCount >= qty;
        const icon = hasEnough ? '✅' : '❌';
        return `${icon} ${materialName} x${qty}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`🧪 ${recipe.name}`)
      .setDescription(`**Tier ${tier}** - ${tierNames[tier] || 'Unknown'}`)
      .addFields(
        { name: '✨ Effect', value: effect, inline: false },
        { name: '📊 Output', value: `${recipe.output.quantity}x potions per craft`, inline: true },
        { name: '⏱️ Craft Time', value: `${recipe.craftTime || 2} seconds`, inline: true },
        { name: '📦 Required Materials', value: matList || 'None', inline: false }
      );

    if (recipe.requiresProfession) {
      embed.addFields({
        name: '🔒 Requirements',
        value: `Requires Botanic profession (Level ${recipe.level || 1}+)`,
        inline: false
      });
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-alchemy')
        .setLabel('← Back to Alchemy')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * POTION BONUS CAPS (to prevent exploit via stacking 500+ potions):
   * - XP Bonus: 500% max (50x multiplier)
   * - Gold Bonus: 500% max (50x multiplier)
   * - Loot Bonus: 200% max (3x drop rate)
   * - Health Pre-heal: 5000 HP max
   * - Gathering Duration: 24 hours max
   */,

  async handleUsePotionSelector(interaction, player) {
    const consumables = player.inventory.filter(
      item => item && typeof item === 'object' && item.type === 'consumable' && item.subtype !== 'lootbox'
    );

    if (consumables.length === 0) {
      await interaction.reply({
        content: '🧪 You have no potions to use!',
        ephemeral: true,
      });
      return;
    }

    // Sort consumables by rarity (highest to lowest)
    const rarityOrder = { 'legendary': 4, 'epic': 3, 'rare': 2, 'uncommon': 1, 'basic': 0 };
    
    consumables.sort((a, b) => {
      // Get rarity from the item rarity property or parse from name
      const getRarity = (item) => {
        if (item.rarity) return item.rarity.toLowerCase();
        const rarities = ['legendary', 'epic', 'rare', 'uncommon', 'basic'];
        for (const rarity of rarities) {
          if (item.name.toLowerCase().includes(rarity)) return rarity;
        }
        return 'basic';
      };
      
      const rarityA = getRarity(a);
      const rarityB = getRarity(b);
      return (rarityOrder[rarityB] || 0) - (rarityOrder[rarityA] || 0);
    });

    const options = consumables.slice(0, 25).map(item => ({
      label: `${item.name} x${item.quantity || 1}`.slice(0, 100),
      value: item.id,
      description: `Use this potion`.slice(0, 100),
    }));

    // Build active buffs summary
    let buffsStatus = this.getPotionBuffsSummary(player);
    let descriptionText = '🧪 **Potion Bonus Caps:**\n' +
      '• XP/Gold: 500% max | Loot: 200% max | Health: 5000 HP max\n' +
      '• Gathering: 24 hours max\n\n' +
      'Potions at cap will be wasted!';
    
    if (buffsStatus) {
      descriptionText += `\n\n**Your Active Buffs:**\n${buffsStatus}`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('💊 Use Potion')
      .setDescription(descriptionText);

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-use-potion-select')
        .setPlaceholder('Select a potion to use')
        .addOptions(options)
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-inventory')
        .setLabel('← Back to Inventory')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  },

  async handleUsePotionQuantity(interaction, player, potionId) {
    // Find the potion in inventory
    const potion = player.inventory.find(
      item => item && typeof item === 'object' && item.type === 'consumable' && item.id === potionId
    );

    if (!potion || !potion.quantity) {
      await interaction.reply({
        content: '❌ Potion not found in inventory!',
        ephemeral: true,
      });
      return;
    }

    const maxQuantity = potion.quantity;
    const quantities = [1, 5, 10, 25, 50, 100].filter(q => q <= maxQuantity);

    // Add "Use All" option if there's a quantity not covered
    if (maxQuantity > 1 && !quantities.includes(maxQuantity)) {
      quantities.push(maxQuantity);
    }
    quantities.sort((a, b) => a - b);

    const buttons = quantities.map(qty =>
      new ButtonBuilder()
        .setCustomId(`rpg-use-potion-qty-${potionId}-${qty}`)
        .setLabel(`Use ${qty}x`)
        .setStyle(ButtonStyle.Primary)
    );

    // Add cancel button
    buttons.push(
      new ButtonBuilder()
        .setCustomId('rpg-inventory')
        .setLabel('← Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    // Get current buff info for this potion type
    let currentBuffInfo = '';
    const pb = player.potionBuffs || {};
    
    if (potionId.includes('xp_potion')) {
      const current = pb.xpBonus || 0;
      const cap = 500;
      const remaining = cap - current;
      currentBuffInfo = `\n\n📊 **Current:** ${current}% / ${cap}% (${remaining}% until cap)`;
      if (current >= cap) currentBuffInfo += `\n⚠️ **Already at maximum!** Potions will be wasted.`;
    } else if (potionId.includes('gold_potion')) {
      const current = pb.goldBonus || 0;
      const cap = 500;
      const remaining = cap - current;
      currentBuffInfo = `\n\n📊 **Current:** ${current}% / ${cap}% (${remaining}% until cap)`;
      if (current >= cap) currentBuffInfo += `\n⚠️ **Already at maximum!** Potions will be wasted.`;
    } else if (potionId.includes('loot_potion')) {
      const current = pb.lootBonus || 0;
      const cap = 200;
      const remaining = cap - current;
      currentBuffInfo = `\n\n📊 **Current:** ${current}% / ${cap}% (${remaining}% until cap)`;
      if (current >= cap) currentBuffInfo += `\n⚠️ **Already at maximum!** Potions will be wasted.`;
    } else if (potionId.includes('health_potion')) {
      const current = pb.nextCombatHeal || 0;
      const cap = 5000;
      const remaining = cap - current;
      currentBuffInfo = `\n\n📊 **Current:** ${current} HP / ${cap} HP (${remaining} HP until cap)`;
      if (current >= cap) currentBuffInfo += `\n⚠️ **Already at maximum!** Potions will be wasted.`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('💊 Select Quantity')
      .setDescription(`**${potion.name}**\n\nYou have **${maxQuantity}x** available.\nSelect how many to use:${currentBuffInfo}`)
      .addFields({ name: 'Current Stock', value: `${maxQuantity} potions`, inline: true });

    // Split buttons into rows (5 per row max)
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  },

  async handleUsePotion(interaction, player, potionId) {
    // Find the potion in inventory
    const potionIndex = player.inventory.findIndex(
      item => item && typeof item === 'object' && item.type === 'consumable' && item.id === potionId
    );

    if (potionIndex === -1) {
      await interaction.reply({
        content: '❌ Potion not found in inventory!',
        ephemeral: true,
      });
      return;
    }

    const potion = player.inventory[potionIndex];
    let effectMessage = '';

    // Apply potion effects
    if (potionId.includes('health_potion')) {
      const tier = parseInt(potionId.match(/t(\d+)/)?.[1] || 1);
      const heal = [50, 100, 200, 350, 500][tier - 1] || 50;
      
      // Note: Since there's no HP tracking in non-combat, store this as a buff
      player.potionBuffs = player.potionBuffs || {};
      const currentHeal = player.potionBuffs.nextCombatHeal || 0;
      const HEALTH_CAP = 5000; // Maximum 5000 HP pre-heal
      
      if (currentHeal >= HEALTH_CAP) {
        effectMessage = `⚠️ Pre-combat heal is already at maximum (${HEALTH_CAP} HP)! Potion wasted.`;
      } else {
        const newHeal = Math.min(currentHeal + heal, HEALTH_CAP);
        const actualHeal = newHeal - currentHeal;
        player.potionBuffs.nextCombatHeal = newHeal;
        effectMessage = `💚 You will restore ${actualHeal} HP at the start of your next combat! (Total: ${newHeal} HP)`;
        if (newHeal === HEALTH_CAP) effectMessage += ` **[CAPPED]**`;
      }
    }
    else if (potionId.includes('xp_potion')) {
      const tier = parseInt(potionId.match(/t(\d+)/)?.[1] || 1);
      const bonus = [10, 20, 35, 50, 75][tier - 1] || 10;
      
      player.potionBuffs = player.potionBuffs || {};
      const currentBonus = player.potionBuffs.xpBonus || 0;
      const XP_CAP = 500; // Maximum 500% XP bonus
      
      if (currentBonus >= XP_CAP) {
        effectMessage = `⚠️ XP bonus is already at maximum (${XP_CAP}%)! Potion wasted.`;
      } else {
        const newBonus = Math.min(currentBonus + bonus, XP_CAP);
        const actualBonus = newBonus - currentBonus;
        player.potionBuffs.xpBonus = newBonus;
        player.potionBuffs.xpRemaining = (player.potionBuffs.xpRemaining || 0) + 1;
        effectMessage = `✨ +${actualBonus}% XP bonus for your next combat or quest! (Total: ${newBonus}%)`;
        if (newBonus === XP_CAP) effectMessage += ` **[CAPPED]**`;
      }
    }
    else if (potionId.includes('gold_potion')) {
      const tier = parseInt(potionId.match(/t(\d+)/)?.[1] || 1);
      const bonus = [10, 20, 35, 50, 75][tier - 1] || 10;
      
      player.potionBuffs = player.potionBuffs || {};
      const currentBonus = player.potionBuffs.goldBonus || 0;
      const GOLD_CAP = 500; // Maximum 500% Gold bonus
      
      if (currentBonus >= GOLD_CAP) {
        effectMessage = `⚠️ Gold bonus is already at maximum (${GOLD_CAP}%)! Potion wasted.`;
      } else {
        const newBonus = Math.min(currentBonus + bonus, GOLD_CAP);
        const actualBonus = newBonus - currentBonus;
        player.potionBuffs.goldBonus = newBonus;
        player.potionBuffs.goldRemaining = (player.potionBuffs.goldRemaining || 0) + 1;
        effectMessage = `💰 +${actualBonus}% Gold bonus for your next combat or quest! (Total: ${newBonus}%)`;
        if (newBonus === GOLD_CAP) effectMessage += ` **[CAPPED]**`;
      }
    }
    else if (potionId.includes('gathering_potion')) {
      const tier = parseInt(potionId.match(/t(\d+)/)?.[1] || 1);
      const bonus = [15, 25, 40, 60, 80][tier - 1] || 15;
      const duration = 30 * 60 * 1000; // 30 minutes
      
      player.potionBuffs = player.potionBuffs || {};
      player.potionBuffs.gatheringBonus = bonus;
      player.potionBuffs.gatheringExpires = Date.now() + duration;
      effectMessage = `⛏️ +${bonus}% gathering yield for 30 minutes!`;
    }
    else if (potionId.includes('loot_potion')) {
      const tier = parseInt(potionId.match(/t(\d+)/)?.[1] || 1);
      const bonus = [10, 20, 30, 45, 60][tier - 1] || 10;
      
      player.potionBuffs = player.potionBuffs || {};
      const currentBonus = player.potionBuffs.lootBonus || 0;
      const LOOT_CAP = 200; // Maximum 200% Loot bonus
      
      if (currentBonus >= LOOT_CAP) {
        effectMessage = `⚠️ Loot bonus is already at maximum (${LOOT_CAP}%)! Potion wasted.`;
      } else {
        const newBonus = Math.min(currentBonus + bonus, LOOT_CAP);
        const actualBonus = newBonus - currentBonus;
        player.potionBuffs.lootBonus = newBonus;
        player.potionBuffs.lootRemaining = (player.potionBuffs.lootRemaining || 0) + 5;
        effectMessage = `🎁 +${actualBonus}% rare loot chance for next 5 combats! (Total: ${newBonus}%)`;
        if (newBonus === LOOT_CAP) effectMessage += ` **[CAPPED]**`;
      }
    }
    else {
      effectMessage = '✅ Potion consumed!';
    }

    // Remove one potion from inventory (only if not wasted)
    let potionWasted = effectMessage.includes('already at maximum');
    
    if (!potionWasted) {
      if (potion.quantity > 1) {
        potion.quantity -= 1;
      } else {
        player.inventory.splice(potionIndex, 1);
      }
    }

    this.persistPlayer(player);

    // Build active buffs summary
    let buffsStatus = this.getPotionBuffsSummary(player);
    let statusText = buffsStatus ? `\n\n**Active Buffs:**\n${buffsStatus}` : '';

    const reply = await interaction.reply({
      content: `🧪 **Used ${potion.name}!**\n${effectMessage}${statusText}`,
      ephemeral: false,
    });

    // Auto-delete after 8 seconds (longer to read)
    setTimeout(() => {
      reply.delete().catch(() => {});
    }, 8000);
  },

  async handleUsePotionMultiple(interaction, player, potionId, quantity) {
    // Find the potion in inventory
    const potionIndex = player.inventory.findIndex(
      item => item && typeof item === 'object' && item.type === 'consumable' && item.id === potionId
    );

    if (potionIndex === -1) {
      await interaction.reply({
        content: '❌ Potion not found in inventory!',
        ephemeral: true,
      });
      return;
    }

    const potion = player.inventory[potionIndex];
    
    // Check if we have enough potions
    if (!potion.quantity || potion.quantity < quantity) {
      await interaction.reply({
        content: `❌ You don't have enough potions! (Need ${quantity}, Have ${potion.quantity || 1})`,
        ephemeral: true,
      });
      return;
    }

    let totalEffectMessage = '';
    let totalHeal = 0;
    let totalXpBonus = 0;
    let totalGoldBonus = 0;
    let totalLootBonus = 0;
    let gatheringBonus = 0;

    // Apply potion effects for each potion consumed
    for (let i = 0; i < quantity; i++) {
      if (potionId.includes('health_potion')) {
        const tier = parseInt(potionId.match(/t(\d+)/)?.[1] || 1);
        const heal = [50, 100, 200, 350, 500][tier - 1] || 50;
        totalHeal += heal;
      }
      else if (potionId.includes('xp_potion')) {
        const tier = parseInt(potionId.match(/t(\d+)/)?.[1] || 1);
        const bonus = [10, 20, 35, 50, 75][tier - 1] || 10;
        totalXpBonus += bonus;
      }
      else if (potionId.includes('gold_potion')) {
        const tier = parseInt(potionId.match(/t(\d+)/)?.[1] || 1);
        const bonus = [10, 20, 35, 50, 75][tier - 1] || 10;
        totalGoldBonus += bonus;
      }
      else if (potionId.includes('gathering_potion')) {
        const tier = parseInt(potionId.match(/t(\d+)/)?.[1] || 1);
        const bonus = [15, 25, 40, 60, 80][tier - 1] || 15;
        gatheringBonus = bonus; // Use the highest bonus (it stacks in duration, not value)
      }
      else if (potionId.includes('loot_potion')) {
        const tier = parseInt(potionId.match(/t(\d+)/)?.[1] || 1);
        const bonus = [10, 20, 30, 45, 60][tier - 1] || 10;
        totalLootBonus += bonus;
      }
    }

    // Apply consolidated buffs
    player.potionBuffs = player.potionBuffs || {};
    
    if (totalHeal > 0) {
      const currentHeal = player.potionBuffs.nextCombatHeal || 0;
      const HEALTH_CAP = 5000;
      const newHeal = Math.min(currentHeal + totalHeal, HEALTH_CAP);
      const actualHeal = newHeal - currentHeal;
      
      player.potionBuffs.nextCombatHeal = newHeal;
      totalEffectMessage += `💚 +${actualHeal} HP at next combat start (Total: ${newHeal} HP)`;
      if (newHeal === HEALTH_CAP) totalEffectMessage += ` **[CAPPED]**`;
      totalEffectMessage += `\n`;
    }
    if (totalXpBonus > 0) {
      const currentBonus = player.potionBuffs.xpBonus || 0;
      const XP_CAP = 500;
      const newBonus = Math.min(currentBonus + totalXpBonus, XP_CAP);
      const actualBonus = newBonus - currentBonus;
      
      player.potionBuffs.xpBonus = newBonus;
      player.potionBuffs.xpRemaining = (player.potionBuffs.xpRemaining || 0) + quantity;
      totalEffectMessage += `✨ +${actualBonus}% XP bonus for next ${quantity} actions (Total: ${newBonus}%)`;
      if (newBonus === XP_CAP) totalEffectMessage += ` **[CAPPED]**`;
      totalEffectMessage += `\n`;
    }
    if (totalGoldBonus > 0) {
      const currentBonus = player.potionBuffs.goldBonus || 0;
      const GOLD_CAP = 500;
      const newBonus = Math.min(currentBonus + totalGoldBonus, GOLD_CAP);
      const actualBonus = newBonus - currentBonus;
      
      player.potionBuffs.goldBonus = newBonus;
      player.potionBuffs.goldRemaining = (player.potionBuffs.goldRemaining || 0) + quantity;
      totalEffectMessage += `💰 +${actualBonus}% Gold bonus for next ${quantity} actions (Total: ${newBonus}%)`;
      if (newBonus === GOLD_CAP) totalEffectMessage += ` **[CAPPED]**`;
      totalEffectMessage += `\n`;
    }
    if (gatheringBonus > 0) {
      const DURATION_CAP = 24 * 60 * 60 * 1000; // Cap at 24 hours
      const duration = Math.min(30 * 60 * 1000 * quantity, DURATION_CAP); // 30 minutes per potion
      const minutes = Math.floor(duration / 60000);
      
      player.potionBuffs.gatheringBonus = gatheringBonus;
      player.potionBuffs.gatheringExpires = Date.now() + duration;
      totalEffectMessage += `⛏️ +${gatheringBonus}% gathering yield for ${minutes} minutes`;
      if (duration === DURATION_CAP) totalEffectMessage += ` **[CAPPED at 24h]**`;
      totalEffectMessage += `\n`;
    }
    if (totalLootBonus > 0) {
      const currentBonus = player.potionBuffs.lootBonus || 0;
      const LOOT_CAP = 200;
      const newBonus = Math.min(currentBonus + totalLootBonus, LOOT_CAP);
      const actualBonus = newBonus - currentBonus;
      
      player.potionBuffs.lootBonus = newBonus;
      player.potionBuffs.lootRemaining = (player.potionBuffs.lootRemaining || 0) + (5 * quantity);
      totalEffectMessage += `🎁 +${actualBonus}% rare loot chance for next ${5 * quantity} combats (Total: ${newBonus}%)`;
      if (newBonus === LOOT_CAP) totalEffectMessage += ` **[CAPPED]**`;
      totalEffectMessage += `\n`;
    }

    // Remove potions from inventory
    potion.quantity -= quantity;
    if (potion.quantity <= 0) {
      player.inventory.splice(potionIndex, 1);
    }

    this.persistPlayer(player);

    // Build active buffs summary
    let buffsStatus = this.getPotionBuffsSummary(player);
    let statusText = buffsStatus ? `\n\n**Active Buffs:**\n${buffsStatus}` : '';

    const quantityText = quantity > 1 ? `${quantity}x ` : '';
    const reply = await interaction.reply({
      content: `🧪 **Used ${quantityText}${potion.name}!**\n${totalEffectMessage || '✅ Potions consumed!'}${statusText}`,
      ephemeral: false,
    });

    // Auto-delete after 8 seconds (longer to read)
    setTimeout(() => {
      reply.delete().catch(() => {});
    }, 8000);
  }

  /**
   * Get summary of active potion buffs for display
   */,

  async performAutoEnchant(player, slot, enchantType, recipe, targetLevel, hasEnchanter, enchanterLevel, requiredLevel) {
    const startLevel = (player.equipmentEnchants[slot][enchantType] || 0);
    let currentLevel = startLevel;
    let attempts = 0;
    let successes = 0;
    let failures = 0;
    const maxEnchant = 10;

    const baseMaterials = this.getAdjustedMaterials(recipe.materials || {});
    const costMultiplier = this.getProfessionCostMultiplier(player) * (hasEnchanter ? 1 : 1.6);
    const adjustedMaterials = this.applyCostMultiplier(baseMaterials, costMultiplier);

    const baseFailChance = Math.min(0.4 + (requiredLevel * 0.04), 0.85);
    const reduction = hasEnchanter ? enchanterLevel * 0.02 : 0;
    const penalty = hasEnchanter ? 0 : 0.2;
    const failChance = Math.min(Math.max(baseFailChance - reduction + penalty, 0.05), 0.9);

    let stopReason = '';
    const MAX_ATTEMPTS = 1000; // Safety limit

    while (currentLevel < targetLevel && currentLevel < maxEnchant && attempts < MAX_ATTEMPTS) {
      attempts++;

      // Check materials
      if (!this.hasMaterials(player, adjustedMaterials)) {
        stopReason = 'Out of materials';
        break;
      }

      // Consume materials
      this.consumeMaterials(player, adjustedMaterials);

      // Roll for success
      const roll = Math.random();
      if (roll < failChance) {
        failures++;
      } else {
        currentLevel++;
        successes++;
        player.equipmentEnchants[slot][enchantType] = currentLevel;

        // Award profession XP
        if (hasEnchanter) {
          const xpGain = requiredLevel * 10;
          player.professionXp = player.professionXp || {};
          player.professionLevels = player.professionLevels || {};
          const MAX_PROFESSION_LEVEL = 80;
          const currentProfLevel = player.professionLevels.enchanter || 1;
          
          if (currentProfLevel < MAX_PROFESSION_LEVEL) {
            player.professionXp.enchanter = (player.professionXp.enchanter || 0) + xpGain;
            while (player.professionXp.enchanter >= 100 && (player.professionLevels.enchanter || 1) < MAX_PROFESSION_LEVEL) {
              player.professionXp.enchanter -= 100;
              player.professionLevels.enchanter = (player.professionLevels.enchanter || 1) + 1;
            }
            if ((player.professionLevels.enchanter || 1) >= MAX_PROFESSION_LEVEL) {
              player.professionXp.enchanter = 0;
            }
          }
        }
      }
    }

    player.clearStatsCache();
    this.persistPlayer(player);

    return {
      startLevel,
      endLevel: currentLevel,
      attempts,
      successes,
      failures,
      reachedTarget: currentLevel >= targetLevel,
      stopReason: stopReason || (currentLevel >= maxEnchant ? 'Max enchant level reached' : '')
    };
  },

  async handleEnchant(interaction, player) {
    this.trackMenuNavigation(player, 'enchant');
    const hasEnchanter = player.professions?.includes('enchanter');
    const enchanterLevel = Number(player.professionLevels?.enchanter) || 0;

    const recipes = RECIPES_SORTED.filter((rec) => rec.profession === 'enchanter');

    // Migrate old enchant data if needed
    this.migrateEnchantData(player);

    // Check equipped items
    const equippedSlots = this.getResolvedEquippedSlots(player);
    const enchantInfo = {
      damage: '+5% attack damage per level',
      xp: '+10% XP gain per level',
      loot: '+8% item drop rate per level',
      doublehit: '+3% chance to hit twice per level'
    };

    // Build enchant overview
    let enchantOverview = '';
    if (equippedSlots.length > 0) {
      const slotEnchants = equippedSlots.map(slot => {
        const enchants = player.equipmentEnchants?.[slot] || {};
        const enchantStrings = Object.entries(enchants)
          .filter(([type, level]) => level > 0)
          .map(([type, level]) => `${type} +${level}`)
          .join(', ');
        return `**${slot.toUpperCase()}**: ${enchantStrings || 'None'}`;
      });
      enchantOverview = '\n\n**Current Enchants:**\n' + slotEnchants.join('\n');
    }

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('✨ Enchantment - Gear Enhancement')
      .setDescription(
        hasEnchanter
          ? `**Enchanter Level: ${enchanterLevel}**\n**Tier 1-2**: Accessible to all\n**Tier 3-5**: Requires Enchanter profession\n\n**NEW**: Up to 2 different enchants per slot (max +10 each)\n**NEW**: Auto-enchant to target level!${enchantOverview}`
          : `**No Enchanter Profession**\nAccess Tier 1-2 enchants. Tier 3-5 require the profession.\nCosts 60% more materials without profession.\n\n**NEW**: Up to 2 different enchants per slot (max +10 each)\n**NEW**: Auto-enchant to target level!${enchantOverview}`
      )
      .addFields([
        { name: '🔥 Damage Enchant', value: enchantInfo.damage, inline: true },
        { name: '⭐ XP Enchant', value: enchantInfo.xp, inline: true },
        { name: '💎 Loot Enchant', value: enchantInfo.loot, inline: true },
        { name: '⚡ Double Hit Enchant', value: enchantInfo.doublehit, inline: true },
      ]);

    if (equippedSlots.length === 0) {
      await interaction.reply({ content: 'You need to equip some gear first!', ephemeral: true });
      return;
    }

    const options = recipes.slice(0, 25).map((rec) => {
      const recLevel = Number(rec.level) || 1;
      const recTier = Number(rec.tier) || 1;
      const playerLock = player.level < recLevel;
      const requiresProf = rec.requiresProfession && (!hasEnchanter || enchanterLevel < recLevel);
      
      // Check if boss damage enchant t4/t5 requires shop unlock
      const requiresBossShopUnlock = (rec.id === 'boss_damage_enchant_t4' || rec.id === 'boss_damage_enchant_t5');
      const hasShopUnlock = requiresBossShopUnlock 
        ? (player.bossEnchantRecipesUnlocked || []).includes(rec.id) 
        : true;
      
      const locked = playerLock || requiresProf || (requiresBossShopUnlock && !hasShopUnlock);
      
      // Build requirement text
      let reqText = '';
      if (playerLock) {
        reqText = `❌ Requires Player Lvl ${recLevel}`;
      } else if (requiresProf) {
        reqText = `❌ Requires Enchanter Lvl ${recLevel}`;
      } else if (requiresBossShopUnlock && !hasShopUnlock) {
        reqText = `❌ Purchase from Boss Shop`;
      } else {
        reqText = `✓ Tier ${recTier}`;
      }
      
      // Build materials text
      const matText = Object.entries(rec.materials || {})
        .map(([mat, qty]) => `${Number(qty) || 1}x ${getMaterial(mat)?.name || mat}`)
        .join(', ');
      
      const lockTag = locked ? ' [🔒]' : '';
      const desc = matText ? `${reqText} • ${matText}` : reqText;
      return {
        label: `${rec.name}${lockTag}`.slice(0, 100),
        value: String(rec.id),
        description: (desc || 'Enchant').slice(0, 100),
      };
    });

    const rows = [];
    if (options.length > 0) {
      // Validate and filter options
      const validOptions = options.filter(opt => opt && opt.label && opt.value);
      
      if (validOptions.length > 0) {
        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('rpg-enchant-select')
              .setPlaceholder('Select an enchantment')
              .addOptions(validOptions)
          )
        );
      }
    }

    // Add auto-enchant button
    const autoEnchantRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-auto-enchant-menu')
        .setLabel('🔄 Auto-Enchant to Target +')
        .setStyle(ButtonStyle.Primary)
    );
    rows.push(autoEnchantRow);

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );
    rows.push(backRow);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  },

  async handleAutoEnchantMenu(interaction, player) {
    this.trackMenuNavigation(player, 'auto-enchant');
    const hasEnchanter = player.professions?.includes('enchanter');
    const enchanterLevel = Number(player.professionLevels?.enchanter) || 0;

    const recipes = RECIPES_SORTED.filter((rec) => rec.profession === 'enchanter');

    // Migrate old enchant data
    this.migrateEnchantData(player);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('🔄 Auto-Enchant')
      .setDescription(
        'Select enchant type and target level.\\n\\n' +
        '**How it works:**\\n' +
        '1. Choose an enchant type\\n' +
        '2. Enter target level (1-10)\\n' +
        '3. Select which gear slot\\n' +
        '4. System automatically crafts until target is reached or materials run out\\n\\n' +
        '**Target Level Options:**'
      );

    // Create buttons for common target levels
    const targetButtons = [3, 5, 7, 10].map(level => 
      new ButtonBuilder()
        .setCustomId(`rpg-auto-enchant-target-${level}`)
        .setLabel(`Target +${level}`)
        .setStyle(ButtonStyle.Primary)
    );

    const rows = [];
    
    // Add target level buttons
    rows.push(new ActionRowBuilder().addComponents(...targetButtons));

    // Add enchant type select
    const enchantOptions = recipes.slice(0, 25).map((rec) => {
      const recLevel = Number(rec.level) || 1;
      const recTier = Number(rec.tier) || 1;
      const playerLock = player.level < recLevel;
      const requiresProf = rec.requiresProfession && (!hasEnchanter || enchanterLevel < recLevel);
      const locked = playerLock || requiresProf;
      
      let reqText = locked ? '❌ Locked' : `✓ T${recTier}`;
      
      return {
        label: `${rec.name} ${locked ? '[🔒]' : ''}`.slice(0, 100),
        value: String(rec.id),
        description: reqText.slice(0, 100),
      };
    });

    const validOptions = enchantOptions.filter(opt => opt && opt.label && opt.value);
    if (validOptions.length > 0) {
      rows.push(
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('rpg-auto-enchant-type-select')
            .setPlaceholder('Select enchant type')
            .addOptions(validOptions)
        )
      );
    }

    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-enchant')
        .setLabel('← Back to Enchanting')
        .setStyle(ButtonStyle.Secondary)
    ));

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  },

  async handleEnchantCraft(interaction, player, enchantId, targetLevel = null) {
    const recipe = getRecipe(enchantId);
    if (!recipe || recipe.profession !== 'enchanter') {
      await interaction.reply({ content: 'Invalid enchantment recipe.', ephemeral: true });
      return;
    }

    const hasEnchanter = player.professions?.includes('enchanter');
    const enchanterLevel = player.professionLevels?.enchanter || 0;
    const requiredLevel = recipe.level || 1;
    const tier = recipe.tier || 1;

    if (player.level < requiredLevel) {
      await interaction.reply({ content: `You need player level ${requiredLevel} to use this enchantment.`, ephemeral: true });
      return;
    }

    // Check tier-based access
    if (recipe.requiresProfession && (!hasEnchanter || enchanterLevel < requiredLevel)) {
      await interaction.reply({ content: `Tier ${tier} enchants require Enchanter Level ${requiredLevel}.`, ephemeral: true });
      return;
    }

    // Check if boss damage enchant t4/t5 requires shop unlock
    const requiresBossShopUnlock = (enchantId === 'boss_damage_enchant_t4' || enchantId === 'boss_damage_enchant_t5');
    if (requiresBossShopUnlock) {
      const hasShopUnlock = (player.bossEnchantRecipesUnlocked || []).includes(enchantId);
      if (!hasShopUnlock) {
        await interaction.reply({ content: `❌ This recipe must be purchased from the Boss Shop first!`, ephemeral: true });
        return;
      }
    }

    // Check which slots are equipped
    const equippedSlots = this.getResolvedEquippedSlots(player);
    if (equippedSlots.length === 0) {
      await interaction.reply({ content: 'You need equipped gear to enchant.', ephemeral: true });
      return;
    }

    // If target level is specified, ask for confirmation
    if (targetLevel && !player.confirmedAutoEnchant) {
      const enchantType = this.getEnchantType(enchantId);
      const embed = new EmbedBuilder()
        .setColor(0x8e44ad)
        .setTitle('🔄 Auto-Enchant Confirmation')
        .setDescription(`You're about to auto-enchant **${enchantType}** to **+${targetLevel}**.\n\nThis will automatically craft enchants until the target level is reached or you run out of materials.`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-auto-enchant-confirm-${enchantId}-${targetLevel}`)
          .setLabel('✅ Confirm Auto-Enchant')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rpg-enchant')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row]
      });
      return;
    }

    // If multiple slots equipped, ask player to select which one to enchant
    if (equippedSlots.length > 1 && !player.selectedEnchantSlot) {
      const enchantType = this.getEnchantType(enchantId);
      const slotButtons = equippedSlots.map(slot => {
        const equippedId = this.getResolvedEquippedItemId(player, slot);
        const equipment = getEquipment(equippedId) || getItemByIdDynamic(equippedId);
        const enchants = player.equipmentEnchants?.[slot] || {};
        const enchantLevel = enchants[enchantType] || 0;
        const enchantCount = Object.keys(enchants).filter(t => enchants[t] > 0).length;
        const label = `${slot.toUpperCase()} ${enchantType}+${enchantLevel} (${enchantCount}/2 types)`;
        return new ButtonBuilder()
          .setCustomId(`rpg-enchant-slot-${slot}-${enchantId}${targetLevel ? `-target${targetLevel}` : ''}`)
          .setLabel(label.slice(0, 80))
          .setStyle(ButtonStyle.Primary);
      });

      const rows = [];
      for (let i = 0; i < slotButtons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(...slotButtons.slice(i, i + 5)));
      }

      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-enchant')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      ));

      await this.updateInteractionWithTracking(interaction, {
        content: 'Select which gear piece to enchant:',
        components: rows,
      });
      return;
    }

    // Get the slot to enchant
    const slot = player.selectedEnchantSlot || equippedSlots[0];
    delete player.selectedEnchantSlot; // Clear selection
    delete player.confirmedAutoEnchant; // Clear auto-enchant confirmation
    
    const equippedItem = this.getResolvedEquippedItemId(player, slot);
    if (!equippedItem) {
      await interaction.reply({ content: `You need an equipped ${slot} to enchant.`, ephemeral: true });
      return;
    }

    // Migrate old enchant data
    this.migrateEnchantData(player);

    // Get enchant type from recipe ID
    const enchantType = this.getEnchantType(enchantId);
    player.equipmentEnchants = player.equipmentEnchants || {};
    player.equipmentEnchants[slot] = player.equipmentEnchants[slot] || {};
    
    // Check if we can add this enchant type (max 2 different types per slot)
    const currentEnchants = player.equipmentEnchants[slot];
    const enchantTypes = Object.keys(currentEnchants).filter(t => currentEnchants[t] > 0);
    
    if (!currentEnchants[enchantType] && enchantTypes.length >= 2) {
      await interaction.reply({ 
        content: `❌ Max of 2 different enchant types per slot! This slot already has: ${enchantTypes.join(', ')}.\nRemove an enchant first to add a different type.`, 
        ephemeral: true 
      });
      return;
    }

    const currentEnchantLevel = currentEnchants[enchantType] || 0;
    const maxEnchant = 10;

    // Check if already at max
    if (currentEnchantLevel >= maxEnchant) {
      await interaction.reply({ 
        content: `✅ This ${slot} ${enchantType} enchant is already at max level (+${maxEnchant})!`, 
        ephemeral: true 
      });
      return;
    }

    // Auto-enchant logic
    if (targetLevel) {
      const targetLevelNum = parseInt(targetLevel);
      if (isNaN(targetLevelNum) || targetLevelNum < 1 || targetLevelNum > maxEnchant) {
        await interaction.reply({ content: `Invalid target level. Must be between 1 and ${maxEnchant}.`, ephemeral: true });
        return;
      }

      if (currentEnchantLevel >= targetLevelNum) {
        await interaction.reply({ 
          content: `✅ ${slot} ${enchantType} enchant is already at +${currentEnchantLevel} (target: +${targetLevelNum})!`, 
          ephemeral: true 
        });
        return;
      }

      // Perform auto-enchanting
      const results = await this.performAutoEnchant(player, slot, enchantType, recipe, targetLevelNum, hasEnchanter, enchanterLevel, requiredLevel);
      
      const embed = new EmbedBuilder()
        .setColor(results.reachedTarget ? 0x00ff00 : 0xff9900)
        .setTitle('🔄 Auto-Enchant Results')
        .setDescription(
          `**Slot:** ${slot.toUpperCase()}\n` +
          `**Enchant:** ${enchantType}\n` +
          `**Starting Level:** +${results.startLevel}\n` +
          `**Ending Level:** +${results.endLevel}\n` +
          `**Target:** +${targetLevelNum}\n\n` +
          `**Attempts:** ${results.attempts}\n` +
          `**Successes:** ${results.successes}\n` +
          `**Failures:** ${results.failures}\n\n` +
          (results.reachedTarget 
            ? `✅ **Target reached!**` 
            : `⚠️ **Stopped:** ${results.stopReason}`)
        );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('rpg-enchant')
              .setLabel('← Back to Enchanting')
              .setStyle(ButtonStyle.Secondary)
          )
        ]
      });
      return;
    }

    const baseMaterials = this.getAdjustedMaterials(recipe.materials || {});
    const costMultiplier = this.getProfessionCostMultiplier(player) * (hasEnchanter ? 1 : 1.6);
    const adjustedMaterials = this.applyCostMultiplier(baseMaterials, costMultiplier);

    if (!this.hasMaterials(player, adjustedMaterials)) {
      const missingMats = this.getMissingMaterials(player, adjustedMaterials);
      const missing = missingMats
        .map(({ name, quantity }) => `${name} x${quantity}`)
        .join(', ');

      // Show enchant menu with gather buttons
      const embed = UIBuilder.createEnchantmentEmbed(player, { ...recipe, materials: adjustedMaterials });
      const materialCounts = this.getMaterialCounts(player);
      const overviewLines = Object.entries(adjustedMaterials).map(([matId, qty]) => {
        const mat = getMaterial(matId);
        const name = mat?.name || matId;
        const have = materialCounts[matId] || 0;
        const ok = have >= qty;
        const missingQty = Math.max(0, qty - have);
        const missingText = ok ? '' : ` (missing ${missingQty})`;
        return `${ok ? '✅' : '❌'} ${name}: ${have}/${qty}${missingText}`;
      });
      if (overviewLines.length > 0) {
        embed.addFields({
          name: 'Missing Materials Overview',
          value: overviewLines.join('\n'),
          inline: false,
        });
      }
      
      const rows = [];
      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-enchant')
          .setLabel('← Back to Enchanting')
          .setStyle(ButtonStyle.Secondary)
      );

      // Add buttons to go to gathering - grouped by area
      const areaMap = this.getGatheringAreasByMaterials(missingMats, player.level || 1);
      const areas = Object.values(areaMap);

      if (areas.length > 0) {
        player.pendingGatherAllMaterials = missingMats.map(({ id, quantity }) => ({ id, quantity }));
        this.persistPlayer(player);

        const gatherButtons = [];

        // Add area-based gather buttons
        for (const { area, materials } of areas) {
          const matNames = materials.map(m => m.name || getMaterial(m.id)?.name || m.id);
          const label = `⛏️ ${area.name}: ${matNames.slice(0, 2).join(', ')}${materials.length > 2 ? ` +${materials.length - 2}` : ''}`;
          
          gatherButtons.push(new ButtonBuilder()
            .setCustomId(`rpg-autogather-area-${area.id}`)
            .setLabel(label.slice(0, 80))
            .setStyle(ButtonStyle.Primary)
          );
        }

        if (gatherButtons.length > 0 && rows.length < 5) {
          rows.push(new ActionRowBuilder().addComponents(...gatherButtons));
        }
      } else {
        player.pendingGatherAllMaterials = null;
      }

      rows.push(backRow);

      await this.updateInteractionWithTracking(interaction, {
        content: `Missing materials: ${missing || 'Unknown materials'}.`,
        embeds: [embed],
        components: rows,
      });
      return;
    }

    const baseFailChance = Math.min(0.4 + (requiredLevel * 0.04), 0.85);
    const reduction = hasEnchanter ? enchanterLevel * 0.02 : 0;
    const penalty = hasEnchanter ? 0 : 0.2;
    const failChance = Math.min(Math.max(baseFailChance - reduction + penalty, 0.05), 0.9);

    this.consumeMaterials(player, adjustedMaterials);

    const roll = Math.random();
    if (roll < failChance) {
      this.persistPlayer(player);
      await interaction.reply({
        content: `❌ ${enchantType} enchant failed. (Fail chance: ${(failChance * 100).toFixed(1)}%)`,
        ephemeral: true,
      });
      return;
    }

    // Apply the enchant (new structure supports multiple types)
    player.equipmentEnchants[slot][enchantType] = Math.min((currentEnchants[enchantType] || 0) + 1, maxEnchant);
    player.clearStatsCache();

    if (hasEnchanter) {
      const xpGain = requiredLevel * 10;
      player.professionXp = player.professionXp || {};
      player.professionLevels = player.professionLevels || {};
      const MAX_PROFESSION_LEVEL = 80;
      const currentLevel = player.professionLevels.enchanter || 1;
      
      if (currentLevel < MAX_PROFESSION_LEVEL) {
        player.professionXp.enchanter = (player.professionXp.enchanter || 0) + xpGain;
        while (player.professionXp.enchanter >= 100 && (player.professionLevels.enchanter || 1) < MAX_PROFESSION_LEVEL) {
          player.professionXp.enchanter -= 100;
          player.professionLevels.enchanter = (player.professionLevels.enchanter || 1) + 1;
        }
        // Cap excess XP at max level
        if ((player.professionLevels.enchanter || 1) >= MAX_PROFESSION_LEVEL) {
          player.professionXp.enchanter = 0;
        }
      }
    }

    this.persistPlayer(player);

    const newLevel = player.equipmentEnchants[slot][enchantType];
    const allEnchants = Object.entries(player.equipmentEnchants[slot])
      .filter(([t, l]) => l > 0)
      .map(([t, l]) => `${t} +${l}`)
      .join(', ');

    const response = await interaction.reply({
      content: `✅ ${recipe.name} succeeded! ${slot.toUpperCase()} ${enchantType} is now +${newLevel}\n**All enchants on ${slot}:** ${allEnchants}`,
      ephemeral: false,
      fetchReply: true,
    });

    // Delete the completion message after 5 seconds
    setTimeout(() => {
      response.delete().catch(() => {});
    }, 5000);
  },

  async handleCraftingOverview(interaction, player, recipeId) {
    const recipe = getRecipe(recipeId);
    if (!recipe) {
      await interaction.reply({
        content: 'Unknown recipe.',
        ephemeral: true,
      });
      return;
    }

    if (recipe.requiresMasterBlacksmith) {
      const asgardWorldId = this.getAsgardWorldId();
      const playerInAsgard = String(player.currentWorld) === String(asgardWorldId);
      if (!player.masterBlacksmith || !playerInAsgard) {
        await interaction.reply({
          content: 'Gem crafting requires Master Blacksmith and access to Asgard.',
          ephemeral: true,
        });
        return;
      }
    }

    // Check class restriction
    const playerClass = player.class || player.internalClass;
    if (recipe.classRestriction && recipe.classRestriction !== playerClass) {
      await interaction.reply({
        content: `This recipe is only available to **${recipe.classRestriction}** class.`,
        ephemeral: true,
      });
      return;
    }

    // Check if output item has class restriction
    const outputItem = getEquipment(recipe.output.item) || getItemByIdDynamic(recipe.output.item);
    if (outputItem && outputItem.classRestriction && outputItem.classRestriction !== playerClass) {
      await interaction.reply({
        content: `This item is only available to **${outputItem.classRestriction}** class.`,
        ephemeral: true,
      });
      return;
    }

    // Check blacksmith level
    const blacksmithLevel = player.professionLevels?.blacksmith || 0;
    const requiredLevel = recipe.level || 1;
    if (blacksmithLevel < requiredLevel) {
      await interaction.reply({
        content: `You need Blacksmith Level ${requiredLevel} to craft **${recipe.name}**. (Current: ${blacksmithLevel})`,
        ephemeral: true,
      });
      return;
    }

    // Get materials
    const baseMaterials = this.getAdjustedMaterials(recipe.materials);
    const adjustedMaterials = this.applyCostMultiplier(baseMaterials, this.getProfessionCostMultiplier(player));

    // Create overview embed using the crafting embed
    const embed = UIBuilder.createCraftingEmbed(player, { ...recipe, materials: adjustedMaterials });

    // Add XP information
    const xpGain = (recipe.level || 1) * 10;
    const currentXp = player.professionXp?.blacksmith || 0;
    const xpThreshold = 250; // Blacksmith requires 250 XP per level
    const xpNeededForNextLevel = xpThreshold - currentXp;
    const xpProgressBar = this.buildProgressBar(currentXp, xpThreshold, 10);
    
    // Build materials status with checkmarks and Xs
    const materialStatusList = Object.entries(adjustedMaterials)
      .map(([matId, qty]) => {
        const materialName = getMaterial(matId)?.name || matId;
        const playerCount = this.getMaterialCounts(player)[matId] || 0;
        const hasEnough = playerCount >= qty;
        const icon = hasEnough ? '✅' : '❌';
        return `${icon} ${materialName} x${qty}`;
      })
      .join('\n');
    
    embed.addFields(
      {
        name: '📦 Required Materials',
        value: materialStatusList || 'None',
        inline: false
      },
      {
        name: '⭐ Profession XP',
        value: `Gain: **${xpGain} XP** per craft\n` +
               `Progress: ${xpProgressBar} (${currentXp}/${xpThreshold})\n` +
               `Until Next Level: **${xpNeededForNextLevel} XP**`,
        inline: false
      }
    );

    // Build buttons with quantity options
    const quantityRow = new ActionRowBuilder();
    
    // Check if player has enough materials for different quantities
    const hasEnough1x = this.hasMaterials(player, adjustedMaterials);
    
    // Calculate how many times they can craft
    let maxCrafts = 1;
    if (hasEnough1x) {
      for (let i = 2; i <= 100; i++) {
        const multipliedMats = {};
        for (const [matId, qty] of Object.entries(adjustedMaterials)) {
          multipliedMats[matId] = qty * i;
        }
        if (!this.hasMaterials(player, multipliedMats)) {
          maxCrafts = i - 1;
          break;
        }
        if (i === 100) maxCrafts = 100;
      }
    }
    
    // Add quantity buttons (avoid duplicate IDs by using 'all' suffix)
    const buttons = [
      new ButtonBuilder()
        .setCustomId(`rpg-confirm-craft-${recipeId}-1`)
        .setLabel('✅ 1x')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!hasEnough1x)
    ];
    
    // Only add 5x button if it's different from maxCrafts
    if (maxCrafts >= 5) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`rpg-confirm-craft-${recipeId}-5`)
          .setLabel('✅ 5x')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(maxCrafts < 5)
      );
    }
    
    // Only add 25x button if it's different from maxCrafts
    if (maxCrafts >= 25) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`rpg-confirm-craft-${recipeId}-25`)
          .setLabel('✅ 25x')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(maxCrafts < 25)
      );
    }
    
    // Add "All" button with unique ID - only if maxCrafts is not already covered
    if (maxCrafts !== 1 && maxCrafts !== 5 && maxCrafts !== 25) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`rpg-confirm-craft-${recipeId}-all`)
          .setLabel(`✅ All (${maxCrafts}x)`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!hasEnough1x)
      );
    } else if (maxCrafts === 1 || maxCrafts === 5 || maxCrafts === 25) {
      // If maxCrafts matches one of the quantity buttons, make that button show "(All)"
      const lastButton = buttons[buttons.length - 1];
      const currentLabel = lastButton.data.label;
      buttons[buttons.length - 1] = ButtonBuilder.from(lastButton).setLabel(currentLabel.replace('✅', '✅ All'));
    }
    
    quantityRow.addComponents(...buttons);

    // Build components array
    const components = [quantityRow];

    // If missing materials, add gather buttons in row 2
    const missingMats = this.getMissingMaterials(player, adjustedMaterials);
    if (missingMats.length > 0) {
      const gatherButtons = [];
      const areaMap = this.getGatheringAreasByMaterials(missingMats, player.level || 1);
      const areas = Object.values(areaMap);

      if (areas.length > 0) {
        player.pendingGatherAllMaterials = missingMats.map(({ id, quantity }) => ({ id, quantity }));
        this.persistPlayer(player);

        for (const { area, materials } of areas.slice(0, 5)) {
          const matNames = materials.map(m => m.name || getMaterial(m.id)?.name || m.id);
          const label = `⛏️ ${area.name}: ${matNames.slice(0, 2).join(', ')}${materials.length > 2 ? ` +${materials.length - 2}` : ''}`;
          
          gatherButtons.push(new ButtonBuilder()
            .setCustomId(`rpg-autogather-area-${area.id}`)
            .setLabel(label.slice(0, 80))
            .setStyle(ButtonStyle.Primary)
          );
        }
      } else {
        // Fallback: Create buttons by gathering type
        const skillMap = {};
        for (const mat of missingMats) {
          const skillId = this.getGatheringTypeForMaterial(mat);
          if (skillId && !skillMap[skillId]) {
            skillMap[skillId] = [];
          }
          if (skillId) {
            skillMap[skillId].push(mat);
          }
        }

        player.pendingGatherAllMaterials = missingMats.map(({ id, quantity }) => ({ id, quantity }));
        this.persistPlayer(player);

        for (const [skillId, mats] of Object.entries(skillMap)) {
          const skill = getGatheringSkill(skillId);
          if (!skill) continue;

          const matNames = mats.map(m => m.name || m.id).slice(0, 2);
          const label = `${skill.icon} ${skill.name}: ${matNames.join(', ')}${mats.length > 2 ? ` +${mats.length - 2}` : ''}`;
          
          gatherButtons.push(new ButtonBuilder()
            .setCustomId(`rpg-autogather-${skillId}`)
            .setLabel(label.slice(0, 80))
            .setStyle(ButtonStyle.Primary)
          );
        }
      }

      // Add gather button rows (up to 5 buttons per row)
      for (let i = 0; i < gatherButtons.length; i += 5) {
        components.push(new ActionRowBuilder().addComponents(...gatherButtons.slice(i, i + 5)));
      }
    }

    // Add back button as final row
    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-crafting')
        .setLabel('← Back to Crafting')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-hub')
        .setLabel('🏠 Hub')
        .setStyle(ButtonStyle.Primary)
    );
    components.push(backRow);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  },

  async handleCraftRecipe(interaction, player, recipeId, quantity = 1) {
    // Defer the interaction to allow editReply and followUp later
    await interaction.deferUpdate();

    const recipe = getRecipe(recipeId);
    if (!recipe) {
      await interaction.followUp({
        content: 'Unknown recipe.',
        ephemeral: true,
      });
      return;
    }

    if (recipe.requiresMasterBlacksmith) {
      const asgardWorldId = this.getAsgardWorldId();
      const playerInAsgard = String(player.currentWorld) === String(asgardWorldId);
      if (!player.masterBlacksmith || !playerInAsgard) {
        await interaction.followUp({
          content: 'Gem crafting requires Master Blacksmith and access to Asgard.',
          ephemeral: true,
        });
        return;
      }
    }

    // Ensure quantity is a valid number
    quantity = Math.max(1, Math.min(quantity, 100));

    // Check class restriction on both recipe and output item
    const playerClass = player.class || player.internalClass;
    if (recipe.classRestriction && recipe.classRestriction !== playerClass) {
      await interaction.followUp({
        content: `This recipe is only available to **${recipe.classRestriction}** class.`,
        ephemeral: true,
      });
      return;
    }

    // Also check if the output item has a class restriction
    const outputItem = getEquipment(recipe.output.item) || getItemByIdDynamic(recipe.output.item);
    if (outputItem && outputItem.classRestriction && outputItem.classRestriction !== playerClass) {
      await interaction.followUp({
        content: `This item is only available to **${outputItem.classRestriction}** class.`,
        ephemeral: true,
      });
      return;
    }

    const blacksmithLevel = player.professionLevels?.blacksmith || 0;
    const requiredLevel = recipe.level || 1;
    if (blacksmithLevel < requiredLevel) {
      const embed = UIBuilder.createCraftingEmbed(player, recipe);
      const components = this.buildCraftingComponents(player, 0);

      await this.updateInteractionWithTracking(interaction, {
        content: `You need Blacksmith Level ${requiredLevel} to craft **${recipe.name}**.`,
        embeds: [embed],
        components,
      });
      return;
    }

    const baseMaterials = this.getAdjustedMaterials(recipe.materials);
    const adjustedMaterials = this.applyCostMultiplier(baseMaterials, this.getProfessionCostMultiplier(player));
    
    // Multiply materials by quantity
    const totalMaterialsNeeded = {};
    for (const [matId, qty] of Object.entries(adjustedMaterials)) {
      totalMaterialsNeeded[matId] = qty * quantity;
    }

    if (!this.hasMaterials(player, totalMaterialsNeeded)) {
      const missingMats = this.getMissingMaterials(player, totalMaterialsNeeded);
      const missing = missingMats
        .map(({ name, quantity }) => `${name} x${quantity}`)
        .join(', ');
      const embed = UIBuilder.createCraftingEmbed(player, { ...recipe, materials: adjustedMaterials });

      // Build gather buttons
      const gatherButtons = [];
      const areaMap = this.getGatheringAreasByMaterials(missingMats, player.level || 1);
      const areas = Object.values(areaMap);

      if (areas.length > 0) {
        player.pendingGatherAllMaterials = missingMats.map(({ id, quantity }) => ({ id, quantity }));
        this.persistPlayer(player);

        for (const { area, materials } of areas.slice(0, 5)) {
          const matNames = materials.map(m => m.name || getMaterial(m.id)?.name || m.id);
          const label = `⛏️ ${area.name}: ${matNames.slice(0, 2).join(', ')}${materials.length > 2 ? ` +${materials.length - 2}` : ''}`;
          
          gatherButtons.push(new ButtonBuilder()
            .setCustomId(`rpg-autogather-area-${area.id}`)
            .setLabel(label.slice(0, 80))
            .setStyle(ButtonStyle.Primary)
          );
        }
      } else {
        // Fallback: Create buttons by gathering type
        const skillMap = {};
        for (const mat of missingMats) {
          const skillId = this.getGatheringTypeForMaterial(mat);
          if (skillId && !skillMap[skillId]) {
            skillMap[skillId] = [];
          }
          if (skillId) {
            skillMap[skillId].push(mat);
          }
        }

        player.pendingGatherAllMaterials = missingMats.map(({ id, quantity }) => ({ id, quantity }));
        this.persistPlayer(player);

        for (const [skillId, mats] of Object.entries(skillMap)) {
          const skill = getGatheringSkill(skillId);
          if (!skill) continue;

          const matNames = mats.map(m => m.name || m.id).slice(0, 2);
          const label = `${skill.icon} ${skill.name}: ${matNames.join(', ')}${mats.length > 2 ? ` +${mats.length - 2}` : ''}`;
          
          gatherButtons.push(new ButtonBuilder()
            .setCustomId(`rpg-autogather-${skillId}`)
            .setLabel(label.slice(0, 80))
            .setStyle(ButtonStyle.Primary)
          );
        }
      }

      // Build components with gather buttons
      const components = [];
      
      // Add gather button rows (up to 5 buttons per row)
      for (let i = 0; i < gatherButtons.length; i += 5) {
        components.push(new ActionRowBuilder().addComponents(...gatherButtons.slice(i, i + 5)));
      }
      
      // Add back button row
      components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      ));

      await this.updateInteractionWithTracking(interaction, {
        content: `Missing materials: ${missing || 'Unknown materials'}.`,
        embeds: [embed],
        components,
      });
      return;
    }

    // Consume all materials at once
    this.consumeMaterials(player, totalMaterialsNeeded);

    // Get output name before loop
    const outputName = this.getItemDisplayName(recipe.output.item);

    // Craft item(s) quantity times
    let totalQuantityCrafted = recipe.output.quantity * quantity;
    const craftResults = [];
    const xpThreshold = 250; // Blacksmith requires 250 XP per level
    const MAX_PROFESSION_LEVEL = 80;

    // Send initial progress embed that will be edited
    const initialEmbed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`⚒️ Crafting Progress: 0/${quantity}`)
      .setDescription(
        `**Item:** ${outputName}\n` +
        `**Blacksmith Level:** ${blacksmithLevel}/${MAX_PROFESSION_LEVEL}\n` +
        `**XP Gained:** 0 XP\n` +
        `**Progress:** 0/${quantity}`
      );

    let progressMessage = await interaction.editReply({ embeds: [initialEmbed] });

    for (let i = 0; i < quantity; i++) {
      const craftResult = this.addCraftedItem(player, recipe.output.item, recipe.output.quantity);
      craftResults.push(craftResult);

      // Update overview embed to show progress every craft (or every 5 for large batches)
      const shouldUpdate = quantity <= 10 || (i + 1) % 5 === 0 || i === quantity - 1;
      if (shouldUpdate) {
        const xpGainCurrent = (recipe.level || 1) * 10 * (i + 1);
        const currentBlacksmithLevel = player.professionLevels.blacksmith || 1;
        const currentXp = player.professionXp?.blacksmith || 0;
        const xpProgress = currentXp % xpThreshold;
        const xpNeeded = xpThreshold - xpProgress;
        const xpProgressBar = this.buildProgressBar(xpProgress, xpThreshold, 10);

        const updatedEmbed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle(`⚒️ Crafting Progress: ${i + 1}/${quantity}`)
          .setDescription(
            `**Item:** ${outputName}\n` +
            `**Blacksmith Level:** ${currentBlacksmithLevel}/${MAX_PROFESSION_LEVEL}\n` +
            `**XP Progress:** ${xpProgressBar} (${xpProgress}/${xpThreshold})\n` +
            `**XP Gained:** ${xpGainCurrent} XP\n` +
            `**Until Next Level:** ${xpNeeded} XP`
          );

        try {
          await interaction.editReply({ embeds: [updatedEmbed] });
        } catch (err) {
          // Silently fail if edit rate limit hit
        }
      }
    }

    // Track all unique crafted items as collectibles
    if (outputItem) {
      if (!player.collectibles) player.collectibles = [];
      const collectibleId = `crafted_${recipe.output.item}`;
      if (!player.collectibles.includes(collectibleId)) {
        player.collectibles.push(collectibleId);
      }
    }

    const craftedText = `Crafted **${outputName} x${totalQuantityCrafted}**.`;
    
    // Summarize equipped and added items (avoid long lists)
    const equippedItems = craftResults.flatMap(r => r.equipped);
    const addedItems = craftResults.flatMap(r => r.added);
    let equipText = '';
    
    if (equippedItems.length > 0) {
      if (equippedItems.length <= 3) {
        equipText = ` Auto-equipped: ${equippedItems.join(', ')}.`;
      } else {
        // Show first item and count instead of full list
        const firstItem = equippedItems[0];
        equipText = ` Auto-equipped: ${firstItem} and ${equippedItems.length - 1} more.`;
      }
    } else if (addedItems.length > 0 && quantity <= 5) {
      // Only show added items for small batches
      equipText = ` Added to inventory: ${addedItems.slice(0, 3).join(', ')}${addedItems.length > 3 ? ` and ${addedItems.length - 3} more` : ''}.`;
    } else if (addedItems.length > 0) {
      // For large bulk crafts, just mention they were added
      equipText = ` Added ${addedItems.length} item${addedItems.length > 1 ? 's' : ''} to inventory.`;
    }

    // Track crafts completed for progress stats
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
    player.progressStats.craftsCompleted += quantity;

    // Award profession XP for crafting
    const professionId = recipe.profession || 'blacksmith';
    const xpGain = (recipe.level || 1) * 10 * quantity; // XP based on recipe level and quantity
    // Blacksmith requires 250 XP per level (2.5x harder than other professions at 100 XP per level)
    const profXpThreshold = professionId === 'blacksmith' ? 250 : 100;
    
    if (!player.professionXp) player.professionXp = {};
    
    let professionLevelUpText = '';
    let levelUpsCount = 0;
    const startLevel = player.professionLevels[professionId] || 1;
    
    // Only award XP if not at max level
    if (startLevel < MAX_PROFESSION_LEVEL) {
      player.professionXp[professionId] = (player.professionXp[professionId] || 0) + xpGain;
      
      while (player.professionXp[professionId] >= profXpThreshold && (player.professionLevels[professionId] || 1) < MAX_PROFESSION_LEVEL) {
        player.professionXp[professionId] -= profXpThreshold;
        player.professionLevels[professionId] = (player.professionLevels[professionId] || 1) + 1;
        levelUpsCount++;
      }
      
      // Cap excess XP at max level
      if ((player.professionLevels[professionId] || 1) >= MAX_PROFESSION_LEVEL) {
        player.professionXp[professionId] = 0;
      }
    }
    
    // Summarize level ups to avoid message overflow
    if (levelUpsCount > 0) {
      const newLevel = player.professionLevels[professionId];
      const professionName = professionId.charAt(0).toUpperCase() + professionId.slice(1);
      if (levelUpsCount === 1) {
        professionLevelUpText = `\n✨ **${professionName} reached level ${newLevel}**!`;
      } else {
        professionLevelUpText = `\n✨ **${professionName} leveled up ${levelUpsCount} times!** (Level ${startLevel} → ${newLevel})`;
      }
    }

    // Track guild quest progress for crafting
    const dailyQuests = getAvailableDailyQuests(player.level, player.dailyQuestsCompleted);
    const weeklyQuests = getAvailableWeeklyQuests(player.level, player.weeklyQuestsCompleted);
    const claimedLimited = (player.claimedQuests || [])
      .map(id => getGuildQuestById(id))
      .filter(Boolean)
      .filter(q => !player.limitedQuestsCompleted.includes(q.id));

    if (!player.guildQuestProgress) player.guildQuestProgress = {};

    const event = {
      type: 'craft',
      target: 'item',
      count: quantity,
      tags: []
    };

    this.applyGuildQuestProgress(player, dailyQuests, weeklyQuests, claimedLimited, event);

    this.persistPlayer(player);

    // Construct final message
    let finalMessage = `${craftedText}${equipText}${professionLevelUpText}`;

    const response = await interaction.followUp({
      content: finalMessage,
      ephemeral: false,
      fetchReply: true,
    });
    
    // Delete the result message after 5 seconds
    setTimeout(() => {
      response.delete().catch(() => {});
    }, 5000);
  },
};
