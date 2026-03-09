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
 * rpg-inventory-handlers — extracted from RPGCommand.js
 * 21 methods, ~2066 lines
 */
export const InventoryHandlers = {
  async handleInventory(interaction, player, skipTracking = false) {
    if (!skipTracking) {
      this.trackMenuNavigation(player, 'inventory');
    }
    // Organize items by type (focus on materials and consumables)
    const organized = {
      material: [],
      consumable: [],
      enchant: [],
      quest: [],
      other: [],
    };

    for (const item of player.inventory) {
      if (!item || typeof item === 'string') continue;
      // Skip equipment - that's in Equipment tab now
      if (item.type === 'equipment') continue;
      
      const type = item.type || 'other';
      let bin = organized[type];
      if (!bin) bin = organized.other;
      bin.push(item);
    }

    // Count equipment for reference
    const equipmentCount = player.inventory.filter(item => 
      item && typeof item === 'object' && item.type === 'equipment'
    ).length;
    const lootboxCount = player.inventory
      .filter(item => item && typeof item === 'object' && item.type === 'consumable' && item.subtype === 'lootbox')
      .reduce((sum, item) => sum + (item.quantity || 1), 0);

    // Build formatted strings for each category
    const formatItems = (items) => {
      if (items.length === 0) return 'None';
      return items
        .map(item => {
          const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
          return `• ${item.name}${qty}`;
        })
        .join('\n');
    };

    const embed = new EmbedBuilder()
      .setColor(0x00aa00)
      .setTitle('🎒 Inventory')
      .setDescription(
        '**Current Items Summary:**\n' +
        `• Total items: ${player.inventory.length}\n` +
        `• Equipment: ${equipmentCount} (view in ⚙️ Equipment tab)\n` +
        `• Materials: ${organized.material.length}\n` +
        `• Consumables: ${organized.consumable.length}\n` +
        `• Lootboxes: ${lootboxCount}\n` +
        `• Enchants: ${organized.enchant.length}\n` +
        `• Quest Items: ${organized.quest.length}`
      );

    // Primary filter row - Item Type filters
    const typeFilterRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-filter-all')
        .setLabel('📋 All Items')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-filter-materials')
        .setLabel(`🔧 Materials (${organized.material.length})`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(organized.material.length === 0),
      new ButtonBuilder()
        .setCustomId('rpg-filter-consumables')
        .setLabel(`🧪 Consumables (${organized.consumable.length})`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(organized.consumable.length === 0),
      new ButtonBuilder()
        .setCustomId('rpg-filter-enchants')
        .setLabel(`✨ Enchants (${organized.enchant.length})`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(organized.enchant.length === 0)
    );

    // Actions and navigation row
    const actionsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-use-potion')
        .setLabel('💊 Use Potion')
        .setStyle(ButtonStyle.Success)
        .setDisabled(organized.consumable.length === 0),
      new ButtonBuilder()
        .setCustomId('rpg-open-lootbox')
        .setLabel(`🎁 Open Lootbox (${lootboxCount})`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(lootboxCount === 0),
      new ButtonBuilder()
        .setCustomId('rpg-equipment')
        .setLabel('⚙️ View Equipment')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    // Rarity filter - Select menu
    const raritySelectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-inventory-rarity-select')
        .setPlaceholder('🎨 Filter by Rarity')
        .addOptions(
          { label: '⚪ Common', value: 'common', description: 'Filter common items' },
          { label: '🟢 Uncommon', value: 'uncommon', description: 'Filter uncommon items' },
          { label: '🔵 Rare', value: 'rare', description: 'Filter rare items' },
          { label: '🟣 Epic', value: 'epic', description: 'Filter epic items' }
        )
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [typeFilterRow, actionsRow, raritySelectRow],
    });
  }

  /**
   * Handle inventory filter - show only specific item types
   */,

  async handleInventoryFilter(interaction, player, filterType) {
    this.trackMenuNavigation(player, 'inventory');
    
    const filtered = player.inventory.filter(item => {
      if (!item || typeof item === 'string') return false;
      return item.type === filterType;
    });

    // Sort consumables by rarity (highest to lowest)
    if (filterType === 'consumable') {
      const rarityOrder = { 'legendary': 4, 'epic': 3, 'rare': 2, 'uncommon': 1, 'basic': 0 };
      
      filtered.sort((a, b) => {
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
    }

    const formatItems = (items) => {
      if (items.length === 0) return 'None';
      return items
        .map(item => {
          const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
          const rarity = item.rarity ? ` [${item.rarity}]` : '';
          return `• ${item.name}${qty}${rarity}`;
        })
        .join('\n');
    };

    const typeNames = {
      material: '🔧 Crafting Materials',
      consumable: '🧪 Consumables',
      enchant: '✨ Enchants',
      quest: '📜 Quest Items',
    };

    const typeEmojis = {
      material: '🔧',
      consumable: '🧪',
      enchant: '✨',
      quest: '📜',
    };

    const embed = new EmbedBuilder()
      .setColor(0x00aa00)
      .setTitle(`🎒 ${typeNames[filterType] || filterType}`)
      .setDescription(
        `**Current Filter:** ${typeEmojis[filterType]} ${typeNames[filterType]}\n` +
        `**Items:** ${filtered.length}/${player.inventory.filter(i => i && typeof i === 'object' && i.type !== 'equipment').length}\n\n` +
        `Showing all ${filterType}(s) in your inventory.`
      );

    if (filtered.length > 0) {
      // Show all items in chunks
      const chunkSize = 30;
      for (let i = 0; i < Math.min(filtered.length, 90); i += chunkSize) {
        const chunk = filtered.slice(i, i + chunkSize);
        const title = i === 0 ? `${typeNames[filterType]} (Page 1)` : `${typeNames[filterType]} (Page ${Math.ceil(i / chunkSize) + 1})`;
        embed.addFields({
          name: title,
          value: formatItems(chunk),
          inline: false,
        });
      }
      
      if (filtered.length > 90) {
        embed.addFields({
          name: '...',
          value: `And ${filtered.length - 90} more items (showing first 90)`,
          inline: false,
        });
      }
    } else {
      embed.addFields({
        name: 'Empty',
        value: `You don't have any ${filterType}s.`,
        inline: false,
      });
    }

    // Type filter row - show current selection
    const filterRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-filter-all')
        .setLabel('📋 All Items')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-filter-materials')
        .setLabel('🔧 Materials')
        .setStyle(filterType === 'material' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-filter-consumables')
        .setLabel('🧪 Consumables')
        .setStyle(filterType === 'consumable' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-filter-enchants')
        .setLabel('✨ Enchants')
        .setStyle(filterType === 'enchant' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );

    // Rarity filter - Select menu
    const rarityFilterRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-inventory-rarity-select')
        .setPlaceholder('🎨 Filter by Rarity')
        .addOptions(
          { label: '⚪ Common', value: 'common', description: 'Filter common items' },
          { label: '🟢 Uncommon', value: 'uncommon', description: 'Filter uncommon items' },
          { label: '🔵 Rare', value: 'rare', description: 'Filter rare items' },
          { label: '🟣 Epic', value: 'epic', description: 'Filter epic items' }
        )
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-inventory')
        .setLabel('📖 Back to Guide')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-equipment')
        .setLabel('⚙️ View Equipment')
        .setStyle(ButtonStyle.Primary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [filterRow, rarityFilterRow, backRow],
    });
  }

  /**
   * Helper function to get item profession/material type
   */,

  async handleInventoryFilterByRarity(interaction, player, rarity) {
    this.trackMenuNavigation(player, 'inventory-rarity-filter');
    
    const filtered = player.inventory.filter(item => {
      if (!item || typeof item === 'string' || item.type === 'equipment') return false;
      return (item.rarity || 'common').toLowerCase() === rarity.toLowerCase();
    });

    const rarityEmojis = {
      common: '⚪',
      uncommon: '🟢',
      rare: '🔵',
      epic: '🟣',
      legendary: '🟡',
    };

    const rarityNames = {
      common: 'Common',
      uncommon: 'Uncommon',
      rare: 'Rare',
      epic: 'Epic',
      legendary: 'Legendary',
    };

    const formatItems = (items) => {
      if (items.length === 0) return 'None';
      return items
        .map(item => {
          const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
          const type = item.type ? ` [${item.type}]` : '';
          return `• ${item.name}${qty}${type}`;
        })
        .join('\n');
    };

    const embed = new EmbedBuilder()
      .setColor(0x00aa00)
      .setTitle(`${rarityEmojis[rarity]} ${rarityNames[rarity]} Items`)
      .setDescription(
        `**Current Filter:** ${rarityEmojis[rarity]} ${rarityNames[rarity]}\n` +
        `**Items Found:** ${filtered.length}\n\n` +
        `Showing all ${rarity} rarity items in your inventory.`
      );

    if (filtered.length > 0) {
      const chunkSize = 25;
      for (let i = 0; i < Math.min(filtered.length, 75); i += chunkSize) {
        const chunk = filtered.slice(i, i + chunkSize);
        const title = i === 0 ? `${rarityNames[rarity]} Items (Page 1)` : `${rarityNames[rarity]} Items (Page ${Math.ceil(i / chunkSize) + 1})`;
        embed.addFields({
          name: title,
          value: formatItems(chunk),
          inline: false,
        });
      }
      
      if (filtered.length > 75) {
        embed.addFields({
          name: '...',
          value: `And ${filtered.length - 75} more items (showing first 75)`,
          inline: false,
        });
      }
    } else {
      embed.addFields({
        name: 'No Items',
        value: `You don't have any ${rarity} items.`,
        inline: false,
      });
    }

    const rarityFilterRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-inventory-rarity-select')
        .setPlaceholder(`🎨 Current: ${rarityNames[rarity]}`)
        .addOptions(
          { label: '⚪ Common', value: 'common', description: 'Filter common items', default: rarity === 'common' },
          { label: '🟢 Uncommon', value: 'uncommon', description: 'Filter uncommon items', default: rarity === 'uncommon' },
          { label: '🔵 Rare', value: 'rare', description: 'Filter rare items', default: rarity === 'rare' },
          { label: '🟣 Epic', value: 'epic', description: 'Filter epic items', default: rarity === 'epic' }
        )
    );

    const typeFilterRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-filter-all')
        .setLabel('📋 All Items')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-filter-materials')
        .setLabel('🔧 Materials')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-filter-consumables')
        .setLabel('🧪 Consumables')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-inventory')
        .setLabel('📖 Back to Guide')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [rarityFilterRow, typeFilterRow],
    });
  }

  /**
   * Handle inventory filter by profession/crafting type
   */,

  async handleInventoryFilterByProfession(interaction, player, profession) {
    this.trackMenuNavigation(player, 'inventory-profession-filter');
    
    const filtered = player.inventory.filter(item => {
      if (!item || typeof item === 'string' || item.type === 'equipment') return false;
      const profType = this.getItemProfessionType(item);
      return profType === profession;
    });

    const professionIcons = {
      blacksmith: '🛠️',
      botanic: '🌿',
      enchanter: '✨',
    };

    const professionNames = {
      blacksmith: 'Blacksmith',
      botanic: 'Botanic',
      enchanter: 'Enchanter',
    };

    const formatItems = (items) => {
      if (items.length === 0) return 'None';
      return items
        .map(item => {
          const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
          const rarity = item.rarity ? ` [${item.rarity}]` : '';
          return `• ${item.name}${qty}${rarity}`;
        })
        .join('\n');
    };

    const embed = new EmbedBuilder()
      .setColor(0x00aa00)
      .setTitle(`${professionIcons[profession]} ${professionNames[profession]} Materials`)
      .setDescription(
        `**Current Filter:** ${professionIcons[profession]} ${professionNames[profession]}\n` +
        `**Items Found:** ${filtered.length}\n\n` +
        `Showing materials useful for ${professionNames[profession]} crafting.`
      );

    if (filtered.length > 0) {
      const chunkSize = 25;
      for (let i = 0; i < Math.min(filtered.length, 75); i += chunkSize) {
        const chunk = filtered.slice(i, i + chunkSize);
        const title = i === 0 ? `${professionNames[profession]} Materials (Page 1)` : `${professionNames[profession]} Materials (Page ${Math.ceil(i / chunkSize) + 1})`;
        embed.addFields({
          name: title,
          value: formatItems(chunk),
          inline: false,
        });
      }
      
      if (filtered.length > 75) {
        embed.addFields({
          name: '...',
          value: `And ${filtered.length - 75} more items (showing first 75)`,
          inline: false,
        });
      }
    } else {
      embed.addFields({
        name: 'No Items',
        value: `You don't have any ${professionNames[profession]} materials.`,
        inline: false,
      });
    }

    const professionFilterRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-inventory-profession-select')
        .setPlaceholder(`🔧 Current: ${professionNames[profession]}`)
        .addOptions(
          { label: '🛠️ Blacksmith', value: 'blacksmith', description: 'Blacksmith materials', default: profession === 'blacksmith' },
          { label: '🌿 Botanic', value: 'botanic', description: 'Botanic materials', default: profession === 'botanic' },
          { label: '✨ Enchanter', value: 'enchanter', description: 'Enchanter materials', default: profession === 'enchanter' }
        )
    );

    const typeFilterRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-filter-all')
        .setLabel('📋 All Items')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-filter-materials')
        .setLabel('🔧 Materials')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-inventory')
        .setLabel('📖 Back to Guide')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [professionFilterRow, typeFilterRow],
    });
  },

  async handleManageEquipment(interaction, player) {
    this.trackMenuNavigation(player, 'manage-equipment');
    
    // Get all equipment from inventory
    const equipmentItems = player.inventory.filter(item => {
      if (!item || typeof item === 'string' || item.type !== 'equipment') return false;
      
      const equipment = getEquipment(item.id) || getItemByIdDynamic(item.id);
      
      // Must have a slot (weapon, chest, head, legs, boots, etc.) to be real equipment
      // Check both item.slot (stored) and equipment.slot (from definition)
      const slot = item.slot || equipment?.slot;
      if (!slot) return false;
      
      const playerClass = player.class || player.internalClass;
      if (equipment && equipment.classRestriction && equipment.classRestriction !== playerClass) {
        return false;
      }
      return true;
    });

    // Also include currently equipped items (they might not be in inventory)
    const equippedIds = new Set(equipmentItems.map(item => item.id));
    if (player.equippedItems) {
      for (const [slot, itemId] of Object.entries(player.equippedItems)) {
        if (itemId && !equippedIds.has(itemId)) {
          const equipment = getEquipment(itemId) || getItemByIdDynamic(itemId);
          if (equipment) {
            const playerClass = player.class || player.internalClass;
            if (equipment.classRestriction && equipment.classRestriction !== playerClass) {
              continue;
            }
            equipmentItems.push({
              id: itemId,
              name: equipment.name,
              type: 'equipment',
              slot: equipment.slot || slot,
              quantity: 1,
            });
            equippedIds.add(itemId);
          }
        }
      }
    }

    if (equipmentItems.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0xff6600)
        .setTitle('⚙️ Manage Equipment')
        .setDescription('No equipment available in your inventory.');

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-equipment')
          .setLabel('← Back to Equipment')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rpg-hub')
          .setLabel('🏠 Hub')
          .setStyle(ButtonStyle.Primary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [buttons],
      });
      return;
    }

    // Sort equipment from best to worst (by rarity, then total stats, then name)
    const rarityValues = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
    equipmentItems.sort((a, b) => {
      const equipA = getEquipment(a.id) || getItemByIdDynamic(a.id);
      const equipB = getEquipment(b.id) || getItemByIdDynamic(b.id);
      
      // Sort by rarity first
      const rarityA = rarityValues[equipA?.rarity] || 0;
      const rarityB = rarityValues[equipB?.rarity] || 0;
      if (rarityA !== rarityB) return rarityB - rarityA;
      
      // Then by total stats
      const statsA = equipA?.stats || equipA?.bonuses || {};
      const statsB = equipB?.stats || equipB?.bonuses || {};
      const totalA = Object.values(statsA).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
      const totalB = Object.values(statsB).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
      if (totalA !== totalB) return totalB - totalA;
      
      // Finally alphabetically
      return a.name.localeCompare(b.name);
    });

    // Create select menu with equipment options
    const options = equipmentItems.slice(0, 25).map((item, index) => {
      const equipment = getEquipment(item.id) || getItemByIdDynamic(item.id);
      const isEquipped = Object.values(player.equippedItems || {}).includes(item.id);
      const slot = equipment?.slot || item.slot || 'unknown';
      const rarity = equipment?.rarity || 'common';
      
      let stats = [];
      // Check for nested stats/bonuses or direct properties
      const s = equipment?.stats || equipment?.bonuses || equipment;
      if (s) {
        if (s.damage) stats.push(`DMG+${s.damage}`);
        if (s.strength) stats.push(`STR+${s.strength}`);
        if (s.defense) stats.push(`DEF+${s.defense}`);
        if (s.agility) stats.push(`AGI+${s.agility}`);
        if (s.intelligence) stats.push(`INT+${s.intelligence}`);
        if (s.vitality) stats.push(`VIT+${s.vitality}`);
        if (s.wisdom) stats.push(`WIS+${s.wisdom}`);
      }
      
      const rarityEmoji = { legendary: '⭐', epic: '💜', rare: '💙', uncommon: '💚', common: '⚪' };
      const qty = item.quantity > 1 ? ` (x${item.quantity})` : '';
      
      return {
        label: `${isEquipped ? '✅ ' : ''}${item.name}${qty}`,
        value: `${item.id}::${index}`,
        description: `${rarityEmoji[rarity] || ''} ${rarity} ${slot} | ${stats.join(' ') || 'No stats'}`.substring(0, 100),
        emoji: isEquipped ? '⚙️' : '📦',
      };
    });

    const embed = new EmbedBuilder()
      .setColor(0x00aa00)
      .setTitle('⚙️ Manage Equipment')
      .setDescription('Select an item to equip/unequip, or dismantle for 20% materials back.')
      .addFields({
        name: 'Currently Equipped',
        value: Object.keys(player.equippedItems || {}).length > 0
          ? Object.entries(player.equippedItems).map(([slot, id]) => {
              const eq = getEquipment(id);
              return `**${slot}**: ${eq?.name || id}`;
            }).join('\\n')
          : 'Nothing equipped',
        inline: false,
      });

    const equipMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-equip-item')
        .setPlaceholder('Select equipment to equip/unequip')
        .addOptions(options)
    );

    const dismantleMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-dismantle-item')
        .setPlaceholder('Select equipment to dismantle (20% materials)')
        .addOptions(options)
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-equipment')
        .setLabel('← Back to Equipment')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-hub')
        .setLabel('🏠 Hub')
        .setStyle(ButtonStyle.Primary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [equipMenu, dismantleMenu, buttons],
    });
  }

  /**
   * Handle equipment sets - save/load equipment loadouts
   */,

  async handleEquipmentSets(interaction, player) {
    this.trackMenuNavigation(player, 'equipment-sets');
    
    if (!player.equipmentSets) {
      player.equipmentSets = [];
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📋 Equipment Sets')
      .setDescription('Save and load equipment loadouts for quick swapping.');

    if (player.equipmentSets.length > 0) {
      const setsText = player.equipmentSets.map((set, idx) => {
        const itemCount = Object.keys(set.items || {}).length;
        return `**${idx + 1}. ${set.name}** (${itemCount} items)`;
      }).join('\\n');
      
      embed.addFields({
        name: 'Saved Sets',
        value: setsText,
        inline: false,
      });
    } else {
      embed.addFields({
        name: 'No Saved Sets',
        value: 'Create your first equipment set to quickly swap between loadouts!',
        inline: false,
      });
    }

    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();
    const row3 = new ActionRowBuilder();

    // Save current equipment button
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-save-equipment-set')
        .setLabel('💾 Save Current Equipment')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!player.equippedItems || Object.keys(player.equippedItems).length === 0)
    );

    // Load set buttons (max 5 sets)
    if (player.equipmentSets.length > 0) {
      const loadOptions = player.equipmentSets.slice(0, 25).map((set, idx) => ({
        label: `${idx + 1}. ${set.name}`,
        value: `set_${idx}`,
        description: `${Object.keys(set.items || {}).length} items`.substring(0, 100),
        emoji: '⚙️',
      }));

      row2.addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-load-equipment-set')
          .setPlaceholder('Load an equipment set')
          .addOptions(loadOptions)
      );

      // Delete set menu
      const deleteOptions = player.equipmentSets.slice(0, 25).map((set, idx) => ({
        label: `Delete: ${idx + 1}. ${set.name}`,
        value: `delete_${idx}`,
        description: 'Remove this set',
        emoji: '🗑️',
      }));

      row3.addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-delete-equipment-set')
          .setPlaceholder('Delete an equipment set')
          .addOptions(deleteOptions)
      );
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-equipment')
        .setLabel('← Back to Equipment')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-hub')
        .setLabel('🏠 Hub')
        .setStyle(ButtonStyle.Primary)
    );

    const components = [row1];
    if (row2.components.length > 0) components.push(row2);
    if (row3.components.length > 0) components.push(row3);
    components.push(backButton);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Handle save equipment set - show modal for name input
   */,

  async handleSaveEquipmentSet(interaction, player) {
    // Create modal for set name
    const modal = new ModalBuilder()
      .setCustomId('rpg-save-set-modal')
      .setTitle('Save Equipment Set');

    const nameInput = new TextInputBuilder()
      .setCustomId('set-name')
      .setLabel('Equipment Set Name')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., Tank Build, DPS Setup')
      .setRequired(true)
      .setMaxLength(50);

    const row = new ActionRowBuilder().addComponents(nameInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  /**
   * Start multi-dismantle selection - shows equipment list with checkmarks
   */,

  async handleDismantleMultipleStart(interaction, player) {
    try {
      this.trackMenuNavigation(player, 'dismantle-multiple');

      // Get all equipment items in inventory
      const seenEquipmentIds = new Set();
      const equipmentItems = player.inventory
        .filter(item => {
          if (!item || typeof item !== 'object' || item.type !== 'equipment') return false;
          if (seenEquipmentIds.has(item.id)) return false;
          seenEquipmentIds.add(item.id);
          return true;
        })
        .map((item, idx) => ({
          item,
          index: idx,
          id: item.id,
          equipment: getEquipment(item.id) || getItemByIdDynamic(item.id),
        }))
        .filter(({ equipment, id }) => {
          // Filter out items without equipment data
          if (!equipment) return false;
          // Filter out items without recipes (dungeon gear, unique items, etc.)
          const recipe = Object.values(RECIPES).find(r => r.output.item === id);
          return recipe != null;
        });

      if (equipmentItems.length === 0) {
        await interaction.reply({
          content: '❌ No equipment items to dismantle.',
          ephemeral: true,
        });
        return;
      }

      // Store selection state
      if (!this.dismantleSelections) this.dismantleSelections = {};
      this.dismantleSelections[player.id] = {
        queue: {}, // itemId -> quantity
        equipment: equipmentItems,
        timestamp: Date.now(),
      };

      // Create select menu with equipment items (Discord max 25 options)
      const selectOptions = equipmentItems.slice(0, 25).map(eq => {
        const count = player.inventory.filter(i => i && i.id === eq.id && i.type === 'equipment').reduce((sum, i) => sum + (i.quantity || 1), 0);
        return {
          label: `${(eq.equipment?.name || 'Unknown').substring(0, 70)} (x${count})`,
          value: eq.id,
          description: `Rarity: ${eq.equipment?.rarity || 'Common'}`.substring(0, 100),
        };
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('rpg-dismantle-select-item')
        .setPlaceholder(`Select an item to dismantle (${Math.min(equipmentItems.length, 25)}/${equipmentItems.length})`)
        .addOptions(selectOptions)
        .setMinValues(1)
        .setMaxValues(1); // Only select ONE at a time

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-manage-equipment')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );

      const embed = new EmbedBuilder()
        .setColor(16743680) // Orange
        .setTitle('♻️ Multi-Dismantle Items')
        .setDescription(`Select an item to view details and choose how many to dismantle.\n\n📦 ${equipmentItems.length} unique equipment items found.`);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [selectRow, buttonRow],
      });
    } catch (err) {
      console.error('Error in handleDismantleMultipleStart:', err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: `❌ Error: ${err.message}`, ephemeral: true });
        }
      } catch (e) {
        console.error('Failed to send error:', e);
      }
    }
  }

  /**
   * Display list of items as clickable buttons
   */,

  async displayDismantleItemList(interaction, player) {
    const selection = this.dismantleSelections?.[player.id];
    if (!selection) return;

    const { equipment: equipmentItems, selections } = selection;
    
    // Build summary of selected items
    let selectionSummary = '';
    if (Object.keys(selections).length > 0) {
      const summaryLines = Object.entries(selections)
        .map(([itemId, qty]) => {
          const item = equipmentItems.find(e => e.id === itemId);
          const name = item?.equipment?.name || 'Unknown';
          return `✅ ${name} x${qty}`;
        })
        .slice(0, 5); // Show first 5
      
      const moreCount = Object.keys(selections).length - 5;
      if (moreCount > 0) summaryLines.push(`... and ${moreCount} more`);
      
      selectionSummary = '\n\n**Selected Items:**\n' + summaryLines.join('\n');
    }

    const embed = new EmbedBuilder()
      .setColor(16743680) // Orange
      .setTitle('♻️ Dismantle Multiple Items')
      .setDescription(`Click an item to select quantity${selectionSummary}`);

    // Show first 5 items as buttons (Discord has 5 buttons per row limit)
    const itemsToShow = equipmentItems.slice(0, 5);
    const rows = [];
    
    for (let i = 0; i < itemsToShow.length; i += 5) {
      const buttonChunk = itemsToShow.slice(i, i + 5);
      const row = new ActionRowBuilder();
      
      buttonChunk.forEach(equipItem => {
        const eq = equipItem.equipment;
        const name = (eq && eq.name) ? String(eq.name) : 'Unknown';
        const qty = selections[equipItem.id] || 0;
        const label = `${name.substring(0, 15)}${qty > 0 ? ` (${qty})` : ''}`.substring(0, 25);
        
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-dismantle-item-SELECT-${equipItem.id}`)
            .setLabel(label)
            .setStyle(ButtonStyle.Secondary)
        );
      });
      
      rows.push(row);
    }

    // Add confirm and cancel buttons
    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-dismantle-multiple-confirm')
        .setLabel('✅ Confirm')
        .setStyle(ButtonStyle.Success)
        .setDisabled(Object.keys(selections).length === 0),
      new ButtonBuilder()
        .setCustomId('rpg-dismantle-cancel')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Danger)
    );

    rows.push(controlRow);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  }

  /**
   * Show quantity selection for a specific item
   */,

  async handleDismantleItemSelect(interaction, player, itemId) {
    const selection = this.dismantleSelections?.[player.id];
    if (!selection) {
      await interaction.reply({ content: '❌ Selection expired. Try again.', ephemeral: true });
      return;
    }

    const item = selection.equipment.find(e => e.id === itemId);
    if (!item) {
      await interaction.reply({ content: '❌ Item not found.', ephemeral: true });
      return;
    }

    const eq = item.equipment;
    const name = (eq && eq.name) ? String(eq.name) : 'Unknown';
    const currentQty = selection.selections[itemId] || 0;

    const embed = new EmbedBuilder()
      .setColor(16743680) // Orange
      .setTitle(`📦 ${name}`)
      .setDescription(`How many would you like to dismantle?\n\nCurrently selected: ${currentQty}`);

    // Quantity buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rpg-dismantle-qty-APPLY-${itemId}-1`)
        .setLabel('1x')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`rpg-dismantle-qty-APPLY-${itemId}-10`)
        .setLabel('10x')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`rpg-dismantle-qty-APPLY-${itemId}-50`)
        .setLabel('50x')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`rpg-dismantle-qty-APPLY-${itemId}-max`)
        .setLabel('Max')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`rpg-dismantle-qty-BACK`)
        .setLabel('⬅️ Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row],
    });
  }

  /**
   * Show item overview with quantity selection buttons
   */,

  async handleDismantleItemOverview(interaction, player, itemId) {
    try {
      const selection = this.dismantleSelections?.[player.id];
      if (!selection) {
        await interaction.reply({ content: '❌ Selection expired. Try again.', ephemeral: true });
        return;
      }

      const item = selection.equipment.find(e => e.id === itemId);
      if (!item) {
        await interaction.reply({ content: '❌ Item not found.', ephemeral: true });
        return;
      }

      const eq = item.equipment;
      const name = (eq && eq.name) ? String(eq.name) : 'Unknown';
      const currentQty = selection.queue[itemId] || 0;
      const ownedCount = player.inventory.filter(inv => inv && inv.id === itemId && inv.type === 'equipment').reduce((sum, i) => sum + (i.quantity || 1), 0);

      const embed = new EmbedBuilder()
        .setColor(16743680) // Orange
        .setTitle(`📦 ${name}`)
        .setDescription(`**Rarity:** ${eq.rarity || 'Common'}\n**Owned:** ${ownedCount}\n**In Queue:** ${currentQty}\n\nSelect quantity to add:`)
        .addFields(
          {
            name: 'Returns as Materials',
            value: '20% of crafting materials',
            inline: false,
          }
        );

      // Quantity buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-dismantle-qty-${itemId}-1`)
          .setLabel('1x')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`rpg-dismantle-qty-${itemId}-10`)
          .setLabel('10x')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`rpg-dismantle-qty-${itemId}-50`)
          .setLabel('50x')
          .setStyle(ButtonStyle.Primary)
      );

      // Max and additional options
      const invCount = player.inventory.filter(inv => inv.id === itemId && inv.type === 'equipment').reduce((sum, i) => sum + (i.quantity || 1), 0);
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-dismantle-qty-${itemId}-max`)
          .setLabel(`Max (${invCount})`)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rpg-dismantle-add-another')
          .setLabel('➕ Add Another Item')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rpg-dismantle-finish')
          .setLabel('✅ Confirm All')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rpg-dismantle-multiple-start')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.deferUpdate();
      await interaction.editReply({
        embeds: [embed],
        components: [row, row2],
      });
    } catch (err) {
      console.error('Error in handleDismantleItemOverview:', err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Error loading item details.', ephemeral: true });
        }
      } catch (e) {
        console.error('Failed to send error response:', e);
      }
    }
  }

  /**
   * Handle quantity selection for item
   */,

  async handleDismantleAddQuantity(interaction, player, itemId, quantity) {
    try {
      const selection = this.dismantleSelections?.[player.id];
      if (!selection) {
        await interaction.reply({ content: '❌ Selection expired. Try again.', ephemeral: true });
        return;
      }

      const item = selection.equipment.find(e => e.id === itemId);
      if (!item) {
        await interaction.reply({ content: '❌ Item not found.', ephemeral: true });
        return;
      }

      // Handle max quantity
      if (quantity === 'max') {
        quantity = player.inventory.filter(inv => inv.id === itemId && inv.type === 'equipment').reduce((sum, i) => sum + (i.quantity || 1), 0);
      } else {
        quantity = parseInt(quantity, 10);
      }

      // Add to queue
      selection.queue[itemId] = (selection.queue[itemId] || 0) + quantity;

      // Build queue summary
      const queueSummary = Object.entries(selection.queue)
        .map(([id, qty]) => {
          const itm = selection.equipment.find(e => e.id === id);
          const nm = itm?.equipment?.name || 'Unknown';
          return `📋 ${nm} x${qty}`;
        })
        .join('\n');

      const queueText = queueSummary || 'Queue is empty';

      const embed = new EmbedBuilder()
        .setColor(16743680) // Orange
        .setTitle('♻️ Dismantle Queue')
        .setDescription(`**Items Ready to Dismantle:**\n\n${queueText}`)
        .addFields(
          {
            name: 'Total Items',
            value: String(Object.values(selection.queue).reduce((a, b) => a + b, 0)),
            inline: true,
          }
        );

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
        .setPlaceholder('Select another item to add')
        .addOptions(selectOptions)
        .setMinValues(1)
        .setMaxValues(1);

      const selectRow = new ActionRowBuilder().addComponents(selectMenu);

      const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-dismantle-finish')
          .setLabel('✅ Dismantle All')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rpg-dismantle-cancel')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.deferUpdate();
      await interaction.editReply({
        embeds: [embed],
        components: [selectRow, buttonRow],
      });
    } catch (err) {
      console.error('Error in handleDismantleAddQuantity:', err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Error adding to queue.', ephemeral: true });
        }
      } catch (e) {
        console.error('Failed to send error response:', e);
      }
    }
  }

  /**
   * Finish and execute the dismantle
   */,

  async handleDismantleFinish(interaction, player) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }

      const selection = this.dismantleSelections?.[player.id];
      if (!selection || !selection.queue || Object.keys(selection.queue).length === 0) {
        await interaction.followUp({
          content: '❌ No items queued for dismantle.',
          ephemeral: true,
        });
        return;
      }

      // Build itemsToDismantle array (repeat itemId by quantity)
      const itemsToDismantle = [];
      const itemsToDismantleList = [];

      for (const [itemId, quantity] of Object.entries(selection.queue)) {
        const item = selection.equipment.find(e => e.id === itemId);
        const name = item?.equipment?.name || 'Unknown';
        itemsToDismantleList.push(`${name} x${quantity}`);

        for (let i = 0; i < quantity; i++) {
          itemsToDismantle.push(itemId);
        }
      }

      // Execute dismantle
      const results = this.dismantleMultipleItems(player, itemsToDismantle);

      // Clean up
      delete this.dismantleSelections[player.id];

      // Build response
      let materialsText = '';
      if (Object.keys(results.totalMaterials).length > 0) {
        const matLines = Object.entries(results.totalMaterials)
          .slice(0, 10)
          .map(([matId, qty]) => `• ${matId}: +${qty}`)
          .join('\n');

        const totalMats = Object.keys(results.totalMaterials).length;
        materialsText = totalMats > 10
          ? `${matLines}\n• ... and ${totalMats - 10} more materials`
          : matLines;
      }

      const itemsText = itemsToDismantleList.slice(0, 5).join('\n') +
                        (itemsToDismantleList.length > 5 ? `\n... and ${itemsToDismantleList.length - 5} more` : '');

      const embed = new EmbedBuilder()
        .setColor(16743680)
        .setTitle('♻️ Dismantle Complete!')
        .setDescription(`Successfully dismantled ${results.successful.length} items${results.failed.length > 0 ? ` (${results.failed.length} failed)` : ''}`)
        .addFields(
          {
            name: '📦 Items',
            value: itemsText || 'None',
            inline: true,
          },
          {
            name: '✅ Success',
            value: String(results.successful.length),
            inline: true,
          }
        );

      if (materialsText) {
        embed.addFields({
          name: '💎 Materials Returned (20%)',
          value: materialsText,
          inline: false,
        });
      }

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    } catch (err) {
      console.error('Error in handleDismantleFinish:', err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Error executing dismantle.', ephemeral: true });
        }
      } catch (e) {
        console.error('Failed to send error response:', e);
      }
    }
  }

  /**
   * Dismantle multiple items at once - returns materials for all
   */,

  async handleRemoveEnchantStart(interaction, player) {
    // Migrate old data first
    this.migrateEnchantData(player);
    
    const enchantedSlots = [];
    
    if (player.equipmentEnchants) {
      for (const [slot, enchants] of Object.entries(player.equipmentEnchants)) {
        const equippedId = this.getResolvedEquippedItemId(player, slot);
        
        if (typeof enchants === 'object' && equippedId) {
          const equipment = getEquipment(equippedId) || getItemByIdDynamic(equippedId);
          
          // Check each enchant type
          for (const [type, level] of Object.entries(enchants)) {
            if (level > 0) {
              enchantedSlots.push({
                slot,
                type,
                level,
                itemId: equippedId,
                name: equipment?.name || 'Unknown'
              });
            }
          }
        }
      }
    }

    if (enchantedSlots.length === 0) {
      await interaction.reply({ content: 'You have no enchanted equipment.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('✨ Remove Enchantments')
      .setDescription('Select which enchanted item to remove enchants from.\n\n**Gold Cost:** 100 gold per enchant level (e.g., +5 enchant costs 500 gold)\nRemoving enchants is permanent and cannot be undone.');

    const slotsText = enchantedSlots
      .map(({ slot, type, level, name }) => `• **${slot.toUpperCase()}** [${type} +${level}]: ${name}`)
      .join('\n');
    
    embed.addFields({
      name: 'Enchanted Equipment',
      value: slotsText,
      inline: false
    });

    // Create buttons for each enchanted slot/type
    const buttons = enchantedSlots.map((item, index) => 
      new ButtonBuilder()
        .setCustomId(`rpg-remove-enchant-confirm-${item.slot}-${item.type}`)
        .setLabel(`${item.slot.toUpperCase()} ${item.type} +${item.level} (${item.level * 100}g)`.slice(0, 80))
        .setStyle(ButtonStyle.Danger)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(...buttons.slice(i, i + 5)));
    }

    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-equipment')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    ));

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows
    });
  }

  /**
   * Confirm and remove enchant from a slot
   */,

  async handleRemoveEnchantConfirm(interaction, player, slotAndType) {
    // Migrate old data
    this.migrateEnchantData(player);
    
    // Parse slot and type from parameter (format: "slot-type")
    const parts = slotAndType.split('-');
    const slot = parts[0];
    const type = parts.slice(1).join('-') || 'damage'; // fallback to damage for old format
    
    const enchants = player.equipmentEnchants?.[slot] || {};
    const enchantLevel = enchants[type] || 0;
    
    if (enchantLevel === 0) {
      await interaction.reply({ content: `The ${slot} slot has no ${type} enchantment.`, ephemeral: true });
      return;
    }

    const goldCost = enchantLevel * 100;
    const playerGold = player.gold || 0;

    if (playerGold < goldCost) {
      await interaction.reply({ 
        content: `❌ Not enough gold! You need ${goldCost} gold but only have ${playerGold} gold.`, 
        ephemeral: true 
      });
      return;
    }

    // Remove the specific enchant type and deduct gold
    player.equipmentEnchants[slot][type] = 0;
    player.gold -= goldCost;
    this.trackGoldSpent(player, goldCost, 'upgrades');
    player.clearStatsCache();
    this.persistPlayer(player);

    const equippedId = this.getResolvedEquippedItemId(player, slot);
    const equipment = getEquipment(equippedId) || getItemByIdDynamic(equippedId);
    const itemName = equipment?.name || slot;

    await interaction.reply({
      content: `✅ Removed **${type} +${enchantLevel}** enchantment from **${itemName}** (${slot}).\n-${goldCost} gold`,
      ephemeral: false
    });

    // Go back to equipment menu after 3 seconds
    setTimeout(() => {
      this.handleEquipment(interaction, player, true).catch(() => {});
    }, 3000);
  }

  /**
   * Handle dungeons button
   */,

  async handleEquipment(interaction, player, skipTracking = false) {
    if (!skipTracking) {
      this.trackMenuNavigation(player, 'equipment');
    }
    
    // Get all equipment from inventory
    const equipmentItems = player.inventory.filter(item => {
      if (!item || typeof item === 'string' || item.type !== 'equipment') return false;
      
      const equipment = getEquipment(item.id) || getItemByIdDynamic(item.id);
      
      // Must have a slot (weapon, chest, head, legs, boots, etc.) to be real equipment
      // Check both item.slot (stored) and equipment.slot (from definition)
      const slot = item.slot || equipment?.slot;
      if (!slot) return false;
      
      const playerClass = player.class || player.internalClass;
      if (equipment && equipment.classRestriction && equipment.classRestriction !== playerClass) {
        return false;
      }
      return true;
    });

    // Also include currently equipped items (they might not be in inventory)
    const equippedIds = new Set(equipmentItems.map(item => item.id));
    if (player.equippedItems) {
      for (const [slot, itemId] of Object.entries(player.equippedItems)) {
        if (itemId && !equippedIds.has(itemId)) {
          const equipment = getEquipment(itemId) || getItemByIdDynamic(itemId);
          if (equipment) {
            const playerClass = player.class || player.internalClass;
            if (equipment.classRestriction && equipment.classRestriction !== playerClass) {
              continue;
            }
            equipmentItems.push({
              id: itemId,
              name: equipment.name,
              type: 'equipment',
              slot: equipment.slot || slot,
              quantity: 1,
            });
            equippedIds.add(itemId);
          }
        }
      }
    }

    // Include currently equipped weapon for comparison (may not be in inventory)
    const allCandidates = [...equipmentItems];
    const equippedWeaponId = player.equippedItems?.weapon;
    if (equippedWeaponId && !equipmentItems.some(item => item.id === equippedWeaponId)) {
      const equippedWeapon = getEquipment(equippedWeaponId) || getItemByIdDynamic(equippedWeaponId);
      if (equippedWeapon) {
        allCandidates.push({
          id: equippedWeaponId,
          name: equippedWeapon.name,
          type: 'equipment',
          slot: equippedWeapon.slot || 'weapon',
          quantity: 1,
        });
      }
    }

    // Find the best weapon
    const bestWeapon = this.findBestEquipment(allCandidates);
    const currentWeapon = player.equippedItems?.weapon;
    const isCurrentlyEquippedBest = currentWeapon === bestWeapon?.item?.id;

    // Build embed with better formatting
    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🗡️ Equipment Management')
      .setDescription('Manage your equipment, save loadouts, and find the best gear.');

    // Show currently equipped items with stats
    if (player.equippedItems && Object.keys(player.equippedItems).length > 0) {
      const equippedText = Object.entries(player.equippedItems)
        .map(([slot, itemId]) => {
          const equipment = getEquipment(itemId);
          const name = equipment?.name || itemId;
          const upgradeLevel = player.equipmentUpgrades?.[slot] || 0;
          const enchantLevel = player.equipmentEnchants?.[slot] || 0;
          const upgradeText = upgradeLevel > 0 ? ` +${upgradeLevel}` : '';
          const enchantText = enchantLevel > 0 ? ` ✨${enchantLevel}` : '';
          
          let statsText = '';
          const stats = equipment?.stats || equipment?.bonuses || equipment;
          if (stats) {
            const statsList = [];
            if (stats.damage) statsList.push(`DMG ${stats.damage > 0 ? '+' : ''}${stats.damage}`);
            if (stats.strength) statsList.push(`STR ${stats.strength > 0 ? '+' : ''}${stats.strength}`);
            if (stats.defense) statsList.push(`DEF ${stats.defense > 0 ? '+' : ''}${stats.defense}`);
            if (stats.agility) statsList.push(`AGI ${stats.agility > 0 ? '+' : ''}${stats.agility}`);
            if (stats.intelligence) statsList.push(`INT ${stats.intelligence > 0 ? '+' : ''}${stats.intelligence}`);
            if (stats.vitality) statsList.push(`VIT ${stats.vitality > 0 ? '+' : ''}${stats.vitality}`);
            if (stats.wisdom) statsList.push(`WIS ${stats.wisdom > 0 ? '+' : ''}${stats.wisdom}`);
            if (statsList.length > 0) {
              statsText = ` [${statsList.join(' | ')}]`;
            }
          }
          
          return `• **${slot}**: ${name}${upgradeText}${enchantText}${statsText}`;
        })
        .join('\n');
      embed.addFields({
        name: '⚙️ Currently Equipped',
        value: equippedText,
        inline: false,
      });
    } else {
      embed.addFields({
        name: '⚙️ Currently Equipped',
        value: '📭 Nothing equipped',
        inline: false,
      });
    }

    // Show available equipment summary
    if (equipmentItems.length > 0) {
      const weaponCount = equipmentItems.filter(item => {
        const eq = getEquipment(item.id) || getItemByIdDynamic(item.id);
        return eq?.slot === 'weapon';
      }).length;
      
      const armorCount = equipmentItems.filter(item => {
        const eq = getEquipment(item.id) || getItemByIdDynamic(item.id);
        return eq?.slot && eq.slot !== 'weapon';
      }).length;

      const availableSummary = `🗡️ ${weaponCount} weapon${weaponCount !== 1 ? 's' : ''} | 🛡️ ${armorCount} armor piece${armorCount !== 1 ? 's' : ''}`;
      embed.addFields({
        name: '📦 Available Equipment',
        value: availableSummary,
        inline: false,
      });
    } else {
      embed.addFields({
        name: '📦 Available Equipment',
        value: '📭 No equipment in inventory',
        inline: false,
      });
    }

    // Show saved sets count
    const setsCount = player.equipmentSets?.length || 0;
    if (setsCount > 0) {
      embed.addFields({
        name: '📋 Saved Equipment Sets',
        value: `${setsCount} loadout${setsCount > 1 ? 's' : ''} saved`,
        inline: false,
      });
    }

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-manage-equipment')
        .setLabel('⚙️ Equip/Unequip')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(equipmentItems.length === 0),
      new ButtonBuilder()
        .setCustomId('rpg-equip-best-weapon')
        .setLabel('⭐ Equip Best')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!bestWeapon || isCurrentlyEquippedBest),
      new ButtonBuilder()
        .setCustomId('rpg-upgrade-weapon')
        .setLabel('🔧 Upgrade')
        .setStyle(ButtonStyle.Secondary)
    );

    // Check if any equipped item has enchants
    const hasEnchants = player.equipmentEnchants && Object.values(player.equipmentEnchants).some(level => level > 0);

    const row1b = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-equipment-sets')
        .setLabel('📋 Equipment Sets')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-dismantle-multiple-start')
        .setLabel('♻️ Dismantle Multiple')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-remove-enchant-start')
        .setLabel('✨ Remove Enchant')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasEnchants),
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    // Add quick-swap tabs for saved equipment sets
    const components = [row1, row1b];
    const savedSets = player.equipmentSets || [];
    if (savedSets.length > 0) {
      const quickSwapRow = new ActionRowBuilder();
      for (let i = 0; i < Math.min(savedSets.length, 5); i++) {
        quickSwapRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-quickswap-set-${i}`)
            .setLabel(savedSets[i].name.substring(0, 15))
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⚡')
        );
      }
      components.push(quickSwapRow);
    }

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Equip the best weapon found in inventory
   */,

  async handleEquipBestWeapon(interaction, player) {
    // Get all equipment from inventory
    const equipmentItems = player.inventory.filter(item => {
      if (!item || typeof item === 'string' || item.type !== 'equipment') return false;
      const equipment = getEquipment(item.id) || getItemByIdDynamic(item.id);
      const playerClass = player.class || player.internalClass;
      if (equipment && equipment.classRestriction && equipment.classRestriction !== playerClass) {
        return false;
      }
      return true;
    });

    // Find the best weapon
    const bestWeapon = this.findBestEquipment(equipmentItems);

    if (!bestWeapon) {
      await interaction.reply({
        content: '❌ No weapons found in your inventory!',
        ephemeral: true,
      });
      return;
    }

    // Check if already equipped
    if (player.equippedItems?.weapon === bestWeapon.item.id) {
      await interaction.reply({
        content: '✅ You already have the best weapon equipped!',
        ephemeral: true,
      });
      return;
    }

    // Equip the best weapon
    if (!player.equippedItems) player.equippedItems = {};
    if (!player.equipment || typeof player.equipment !== 'object') player.equipment = {};
    const oldWeapon = player.equippedItems.weapon;

    if (oldWeapon && oldWeapon !== bestWeapon.item.id) {
      const oldEquip = getEquipment(oldWeapon) || getItemByIdDynamic(oldWeapon);
      if (oldEquip) {
        this.addInventoryItem(player, {
          id: oldEquip.id,
          name: oldEquip.name,
          type: 'equipment',
          slot: oldEquip.slot || 'weapon',
        });
      }
    }

    // Remove the newly equipped weapon from inventory if present
    const bestIndex = player.inventory.findIndex(item => 
      item && typeof item === 'object' && item.id === bestWeapon.item.id
    );
    if (bestIndex !== -1) {
      const invItem = player.inventory[bestIndex];
      if (invItem && invItem.quantity > 1) {
        invItem.quantity -= 1;
      } else {
        player.inventory.splice(bestIndex, 1);
      }
    }

    player.equippedItems.weapon = bestWeapon.item.id;
    player.equipment.weapon = bestWeapon.item;
    player.clearStatsCache();
    this.persistPlayer(player);

    let message = `⭐ **${bestWeapon.item.name}** equipped as your best weapon!`;
    if (oldWeapon) {
      const oldEq = getEquipment(oldWeapon);
      message += `\n(Replaced ${oldEq?.name || oldWeapon})`;
    }

    await interaction.reply({
      content: message,
      ephemeral: true,
    });

    // Refresh the equipment view
    await this.handleEquipment(interaction, player, true);
  }

  /**
   * Handle talents
   */,

  async handleUpgradeWeapon(interaction, player) {
    await this.handleUpgradeGear(interaction, player);
  },

  async handleUpgradeGear(interaction, player) {
    this.trackMenuNavigation(player, 'upgrade');
    
    // Check which slots are equipped
    const equippedSlots = this.getResolvedEquippedSlots(player);
    if (equippedSlots.length === 0) {
      await interaction.reply({ content: 'You have no gear equipped.', ephemeral: true });
      return;
    }

    // If multiple slots equipped, ask player to select which one to upgrade (unless confirming)
    if (equippedSlots.length > 1 && !player.selectedUpgradeSlot && !player.confirmUpgrade) {
      const slotButtons = equippedSlots.map(slot => {
        const equippedId = this.getResolvedEquippedItemId(player, slot);
        const equipment = getEquipment(equippedId) || getItemByIdDynamic(equippedId);
        const upgradeLevel = player.equipmentUpgrades?.[slot] || 0;
        return new ButtonBuilder()
          .setCustomId(`rpg-upgrade-slot-${slot}`)
          .setLabel(`${slot.toUpperCase()} +${upgradeLevel} (${equipment?.name || 'Unknown'})`)
          .setStyle(ButtonStyle.Primary);
      });

      const rows = [];
      for (let i = 0; i < slotButtons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(...slotButtons.slice(i, i + 5)));
      }

      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      ));

      await this.updateInteractionWithTracking(interaction, {
        content: 'Select which gear piece to upgrade:',
        components: rows,
      });
      return;
    }

    // Get the slot to upgrade (from confirmation data if confirming, otherwise from selection)
    const slot = player.confirmUpgrade?.slot || player.selectedUpgradeSlot || equippedSlots[0];
    delete player.selectedUpgradeSlot; // Clear selection
    
    const itemId = this.getResolvedEquippedItemId(player, slot);
    if (!itemId) {
      await interaction.reply({ content: `You have no ${slot} equipped.`, ephemeral: true });
      return;
    }

    const equipment = getEquipment(itemId) || getItemByIdDynamic(itemId);
    const upgradeLevel = player.equipmentUpgrades?.[slot] || 0;
    const nextLevel = upgradeLevel + 1;
    const maxUpgrade = 10;
    if (upgradeLevel >= maxUpgrade) {
      await interaction.reply({ content: `Your ${slot} is already at max upgrade (+${maxUpgrade}).`, ephemeral: true });
      return;
    }

    const bonuses = equipment?.bonuses || equipment?.stats || {};
    const currentMult = 1 + (upgradeLevel * 0.1);
    const nextMult = 1 + (nextLevel * 0.1);
    const previewLines = Object.keys(bonuses).length > 0
      ? Object.entries(bonuses).map(([stat, value]) => {
          const currentValue = Math.round((Number(value) || 0) * currentMult);
          const nextValue = Math.round((Number(value) || 0) * nextMult);
          const format = (num) => (num >= 0 ? `+${num}` : `${num}`);
          return `${stat.toUpperCase()}: ${format(currentValue)} → ${format(nextValue)}`;
        })
      : ['No stat bonuses.'];
    const previewText = previewLines.join('\n');

    const blacksmithLevel = player.professionLevels?.blacksmith || 0;
    const baseBreakChance = Math.min(0.25 + (upgradeLevel * 0.07), 0.85);
    const reduction = blacksmithLevel * 0.03;
    const breakChance = Math.max(baseBreakChance - reduction, 0.03);
    const cost = 100 * nextLevel;

    // Show confirmation dialog
    if (!player.confirmUpgrade) {
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`🔧 ${slot.toUpperCase()} Upgrade Preview`)
        .setDescription(`**${equipment?.name || itemId}** ➔ +${nextLevel}`)
        .addFields(
          { name: '📊 Stat Changes', value: previewText, inline: false },
          { name: '💰 Cost', value: `${cost} gold`, inline: true },
          { name: '⚠️ Break Chance', value: `${(breakChance * 100).toFixed(1)}%`, inline: true },
          { name: '🔨 Blacksmith Level', value: `${blacksmithLevel} (-${(reduction * 100).toFixed(1)}% break chance)`, inline: true },
          { name: '⚡ Success Rate', value: `${((1 - breakChance) * 100).toFixed(1)}%`, inline: true }
        )
        .setFooter({ text: '⚠️ WARNING: Failed upgrades will destroy your gear!' })
        .setTimestamp();

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-upgrade-confirm')
          .setLabel('✅ Confirm Upgrade')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      player.confirmUpgrade = { slot, cost, breakChance, nextLevel };
      this.persistPlayer(player);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [confirmRow],
      });
      return;
    }

    // Execute upgrade
    const upgradeData = player.confirmUpgrade;
    delete player.confirmUpgrade;
    
    if (player.gold < upgradeData.cost) {
      await interaction.reply({ content: `You need ${upgradeData.cost} gold to upgrade.`, ephemeral: true });
      return;
    }

    player.gold -= upgradeData.cost;
    this.trackGoldSpent(player, upgradeData.cost, 'upgrades');
    const roll = Math.random();
    let resultText = '';

    if (roll < upgradeData.breakChance) {
      // Equipment breaks
      delete player.equippedItems[upgradeData.slot];
      if (player.equipment && typeof player.equipment === 'object') {
        delete player.equipment[upgradeData.slot];
      }
      if (player.equipmentUpgrades) delete player.equipmentUpgrades[upgradeData.slot];
      player.clearStatsCache();
      resultText = `❌ Upgrade failed! Your ${upgradeData.slot} broke and was destroyed. (Break chance: ${(upgradeData.breakChance * 100).toFixed(1)}%)`;
    } else {
      if (!player.equipmentUpgrades) player.equipmentUpgrades = {};
      player.equipmentUpgrades[upgradeData.slot] = upgradeData.nextLevel;
      player.clearStatsCache();
      resultText = `✅ Upgrade success! ${upgradeData.slot.toUpperCase()} is now +${upgradeData.nextLevel}. (Break chance: ${(upgradeData.breakChance * 100).toFixed(1)}%)`;
    }

    this.persistPlayer(player);

    const embed = new EmbedBuilder()
      .setColor(roll < upgradeData.breakChance ? 0xff0000 : 0x00ff00)
      .setTitle(`🔧 ${upgradeData.slot.toUpperCase()} Upgrade Result`)
      .setDescription(resultText)
      .addFields(
        { name: 'Gold Spent', value: `${upgradeData.cost}`, inline: true },
        { name: 'Blacksmith Level', value: `${blacksmithLevel}`, inline: true }
      )
      .setTimestamp();

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-upgrade-return')
        .setLabel('🔧 Back to Upgrades')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Main Menu')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backRow],
    });
  }

  /**
   * Handle professions
   */
  /**
   * View professions tab with rewards and progression
   */,

  async handleGemSocketing(interaction, player) {
    if (!player.masterBlacksmith) {
      await interaction.reply({
        content: '❌ You need to upgrade to Master Blacksmith to socket gems!',
        ephemeral: true,
      });
      return;
    }

    const { getGem, calculateGemStats, getSocketSlots } = await import('../data/gems.js');
    const socketedGems = player.socketedGems || {};
    const gemStats = calculateGemStats(socketedGems);

    const embed = new EmbedBuilder()
      .setColor(0x9d00ff)
      .setTitle('💎 Gem Socketing')
      .setDescription(
        `Socket powerful gems into your equipment to gain bonus stats!\n\n` +
        `**Your Socketed Gems:**`
      );

    // Show currently equipped items and their sockets
    const equippedSlots = ['weapon', 'chest', 'legs', 'boots', 'gloves', 'helmet'];
    const slotEmojis = {
      weapon: '⚔️',
      chest: '🛡️',
      legs: '👖',
      boots: '👢',
      gloves: '🧤',
      helmet: '⛑️',
    };

    let socketInfo = '';
    equippedSlots.forEach(slot => {
      const equippedItem = player.equippedItems?.[slot];
      const maxSockets = getSocketSlots(slot);
      const slotGems = socketedGems[slot] || {};
      
      if (equippedItem) {
        socketInfo += `\n${slotEmojis[slot]} **${slot.charAt(0).toUpperCase() + slot.slice(1)}** (${maxSockets} socket${maxSockets > 1 ? 's' : ''})\n`;
        for (let i = 1; i <= maxSockets; i++) {
          const gemId = slotGems[`socket${i}`];
          if (gemId) {
            const gem = getGem(gemId);
            socketInfo += `  └ Socket ${i}: ${gem?.name || 'Unknown Gem'}\n`;
          } else {
            socketInfo += `  └ Socket ${i}: Empty\n`;
          }
        }
      }
    });

    embed.addFields({
      name: 'Equipped Gear',
      value: socketInfo || 'No equipment equipped!',
      inline: false,
    });

    // Show total stats from gems
    if (Object.keys(gemStats).length > 0) {
      const statsList = Object.entries(gemStats)
        .map(([stat, value]) => `${stat}: +${value}`)
        .join('\\n');
      embed.addFields({
        name: 'Total Gem Bonuses',
        value: statsList,
        inline: false,
      });
    }

    // Show available gems in inventory
    const gemIds = Object.keys(await import('../data/gems.js')).filter(k => k !== 'default');
    const availableGems = (player.inventory || []).filter(item => 
      gemIds.some(gemId => item === gemId || item?.id === gemId)
    );

    if (availableGems.length > 0) {
      const gemList = availableGems
        .slice(0, 10)
        .map(item => {
          const itemId = typeof item === 'string' ? item : item.id;
          const gem = getGem(itemId);
          return gem ? `• ${gem.name} (${gem.tier})` : `• ${itemId}`;
        })
        .join('\n');
      embed.addFields({
        name: 'Available Gems in Inventory',
        value: gemList + (availableGems.length > 10 ? `\n...and ${availableGems.length - 10} more` : ''),
        inline: false,
      });
    } else {
      embed.addFields({
        name: 'Available Gems',
        value: 'No gems in inventory. Craft gems using blacksmith recipes!',
        inline: false,
      });
    }

    const rows = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('← Back to Professions')
          .setStyle(ButtonStyle.Secondary)
      ),
    ];

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  }

  /**
   * Handle shop display
   */,

  async handleEquipmentBuilds(interaction, player) {
    const builds = this.equipmentBuilds.getBuilds(player.userId);

    const embed = new EmbedBuilder()
      .setColor(0x00ccff)
      .setTitle('⚙️ **Equipment Builds**')
      .setDescription(`Manage quick-swap equipment loadouts (${builds.length}/3)`);

    if (builds.length > 0) {
      builds.forEach(build => {
        const summary = this.equipmentBuilds.getBuildSummary(build.equipment);
        embed.addFields({
          name: build.name,
          value: `${summary.itemCount} items equipped`,
          inline: true
        });
      });
    }

    const buttons = new ActionRowBuilder();
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-builds-save')
        .setLabel('Save Current')
        .setStyle(ButtonStyle.Success)
        .setEmoji('💾'),
      new ButtonBuilder()
        .setCustomId('rpg-builds-load')
        .setLabel('Load Build')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📂')
    );

    if (builds.length > 0) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-builds-delete')
          .setLabel('Delete Build')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );
    }

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
      ephemeral: true
    });
  }

  /**
   * Combat Style Recommendations - Suggests best style for current encounter
   */,
};
