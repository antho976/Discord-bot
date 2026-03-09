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
 * rpg-roguelike-handlers — extracted from RPGCommand.js
 * 29 methods, ~1840 lines
 */
export const RoguelikeHandlers = {
  async handleRoguelikeStart(interaction, player) {
    try {
      const roguelike = new RoguelikeManager();

      // Check if player is eligible (Tier 2+)
      if (!roguelike.isPlayerEligible(player)) {
        await interaction.reply({
          content: '🔒 You must unlock World 2 (Tier 2) to access the Roguelike Dungeon!',
          ephemeral: true,
        });
        return;
      }

      // Check if player is already in a run
      if (player.roguelikeState && player.roguelikeState.isActive) {
        // Safety check: if run started more than 24 hours ago, auto-clear it
        const runAge = Date.now() - (player.roguelikeState.startedAt || 0);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (runAge > twentyFourHours) {
          console.log(`Auto-clearing stuck roguelike run for ${player.userId} (age: ${Math.floor(runAge / 3600000)} hours)`);
          player.roguelikeState = null;
          await this.playerManager.savePlayer(player);
        } else {
          await interaction.reply({
            content: '⚠️ You are already in a roguelike run! Complete or exit your current run first.\n*Tip: Use `/roguelike exit` to leave your current run.*',
            ephemeral: true,
          });
          return;
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🎲 Roguelike Dungeon')
        .setDescription(
          '**The Roguelike Challenge**\n\n' +
          '**26 Floors of Procedurally-Generated Dungeons**\n' +
          '• 5 bosses at every 5 floors\n' +
          '• 1 final boss on floor 26\n' +
          '• Difficulty scales per boss section\n\n' +
          '**Starting Conditions**\n' +
          '• Start at Level 1 with base stats\n' +
          '• All skills and equipment reset\n' +
          '• Gain skills from skill rooms\n\n' +
          '**Currency System**\n' +
          '💎 Currency A: Permanent roguelike upgrades\n' +
          '⭐ Currency B: Unlock room types during run\n' +
          '🏆 Currency C: Character upgrades outside roguelike\n\n' +
          '**Rewards**\n' +
          '💀 Death: 100% currency rewards\n' +
          '🚪 Voluntary Exit: 50% currency rewards\n\n' +
          `**Your Roguelike Stats**\n` +
          `Runs Completed: ${player.roguelikeStats.totalRunsCompleted}\n` +
          `Highest Floor: ${player.roguelikeStats.highestFloorReached}/26\n` +
          `Total Currency A: ${player.roguelikeCurrencies.currencyA}\n` +
          `Total Currency B: ${player.roguelikeCurrencies.currencyB}\n` +
          `Total Currency C: ${player.roguelikeCurrencies.currencyC}`
        )
        .setColor(0x9b59b6);

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-start-new')
          .setLabel('🎲 Start New Run')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-upgrades')
          .setLabel('💎 Upgrades')
          .setStyle(ButtonStyle.Primary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-stats')
          .setLabel('📊 Statistics')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row1, row2],
      });
    } catch (error) {
      console.error('Error in handleRoguelikeStart:', error);
      await interaction.reply({
        content: 'Failed to load roguelike dungeon.',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle starting a new roguelike run
   */,

  async handleRoguelikeStartNew(interaction, player) {
    try {
      const roguelike = new RoguelikeManager();

      // Initialize new run
      player.roguelikeState = roguelike.initializeRun(player);
      player.roguelikeState.isActive = true;

      // Save player
      await this.playerManager.savePlayer(player);

      // Show floor 1
      await this.handleRoguelikeFloor(interaction, player);
    } catch (error) {
      console.error('Error starting roguelike run:', error);
      await interaction.reply({
        content: 'Failed to start roguelike run.',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle displaying a roguelike floor
   */,

  async handleRoguelikeFloor(interaction, player) {
    try {
      if (!player.roguelikeState || !player.roguelikeState.isActive) {
        await interaction.reply({
          content: 'No active roguelike run. Start one first!',
          ephemeral: true,
        });
        return;
      }

      const roguelike = new RoguelikeManager();
      const state = player.roguelikeState;
      const currentFloor = state.currentFloor;
      const isBossFloor = currentFloor % 5 === 0 || currentFloor === 26;

      let floorTitle = `🎲 Floor ${currentFloor}/26`;
      if (isBossFloor) {
        const bossNum = currentFloor === 26 ? 6 : Math.ceil(currentFloor / 5);
        floorTitle = `👹 BOSS FLOOR ${bossNum}`;
      }

      // Generate rooms for this floor
      const rooms = roguelike.generateFloorRooms(state, currentFloor);
      state.currentFloorRooms = rooms;

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(floorTitle)
        .setDescription(
          `**Progress:** Floor ${currentFloor}/26 | Bosses Defeated: ${state.bossesDefeated}/5\n` +
          `**Mini-Bosses Defeated:** ${state.miniBossesDefeated || 0}\n\n` +
          `**Your Stats**\n` +
          `❤️ HP: ${state.hp}/${state.stats.maxHp}\n` +
          `💙 Mana: ${state.mana}/${state.stats.maxMana}\n` +
          `⚔️ Strength: ${state.stats.strength}\n` +
          `🛡️ Defense: ${state.stats.defense}\n\n` +
          `**Available Rooms**\n` +
          rooms.map((r, i) => {
            const roomEmoji = this.ROOM_EMOJIS[r.type] || '📍';
            const roomName = this.ROOM_NAMES[r.type] || r.type;
            const miniBossIndicator = r.miniBoss ? ' ⚔️' : '';
            const modifierIndicator = r.modifier ? ` ${r.modifier.name.split(' ')[0]}` : '';
            return `${i + 1}. ${roomEmoji}${miniBossIndicator} ${roomName}${modifierIndicator} - ${r.description}`;
          }).join('\n')
        )
        .setColor(isBossFloor ? 0xff0000 : 0x9b59b6);

      // Create room selection buttons
      const buttons = [];
      for (let i = 0; i < rooms.length; i += 5) {
        const batchButtons = rooms.slice(i, Math.min(i + 5, rooms.length)).map((room, idx) => {
          const buttonNum = i + idx + 1;
          return new ButtonBuilder()
            .setCustomId(`rpg-roguelike-room-${room.id}`)
            .setLabel(`${buttonNum}. ${this.ROOM_NAMES[room.type] || room.type}`)
            .setStyle(ButtonStyle.Primary);
        });

        if (batchButtons.length > 0) {
          buttons.push(new ActionRowBuilder().addComponents(batchButtons));
        }
      }

      // Add exit button
      const bottomRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-exit')
          .setLabel('🚪 Exit Dungeon (50% rewards)')
          .setStyle(ButtonStyle.Danger)
      );
      buttons.push(bottomRow);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: buttons,
      });
    } catch (error) {
      console.error('Error in handleRoguelikeFloor:', error);
      await interaction.reply({
        content: 'Failed to load floor.',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle room selection
   */,

  async handleRoguelikeRoomSelect(interaction, player, roomId) {
    try {
      if (!player.roguelikeState || !player.roguelikeState.isActive) {
        await interaction.reply({
          content: 'No active run.',
          ephemeral: true,
        });
        return;
      }

      const state = player.roguelikeState;
      const room = state.currentFloorRooms.find(r => r.id === roomId);

      if (!room) {
        await interaction.reply({
          content: 'Room not found.',
          ephemeral: true,
        });
        return;
      }

      const roguelike = new RoguelikeManager();
      const isBossFloor = state.currentFloor % 5 === 0 || state.currentFloor === 26;

      // Boss floors should always offer the boss encounter (except skill rooms)
      if (isBossFloor && room.type !== 'skill') {
        await this.handleRoguelikeBossRoom(interaction, player, room);
      } else if (room.miniBoss && !room.miniBoss.defeated) {
        // Show mini-boss encounter
        await this.handleRoguelikeMiniBossRoom(interaction, player, room);
      } else if (room.type === 'skill') {
        // Skill room - show skill and offer to accept
        await this.handleRoguelikeSkillRoom(interaction, player, room);
      } else if (room.type === 'shop') {
        // Shop room - show shop interface
        await this.handleRoguelikeShopRoom(interaction, player, room);
      } else {
        // Regular room - process and advance
        const actionResults = {};
        roguelike.completeRoom(state, room, actionResults);
        state.currentFloor++;

        // Save and show next floor
        await this.playerManager.savePlayer(player);
        await this.handleRoguelikeFloor(interaction, player);
      }
    } catch (error) {
      console.error('Error in handleRoguelikeRoomSelect:', error);
      await interaction.reply({
        content: 'Failed to process room selection.',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle mini-boss room encounter
   */,

  async handleRoguelikeMiniBossRoom(interaction, player, room) {
    try {
      const state = player.roguelikeState;
      const miniBoss = room.miniBoss;

      const embed = new EmbedBuilder()
        .setColor(0xff6b6b)
        .setTitle(`⚔️ ${miniBoss.name} Appears!`)
        .setDescription(
          `A fierce ${miniBoss.name} blocks your path in this ${this.ROOM_NAMES[room.type] || room.type}!\n\n` +
          `**Mini-Boss Stats**\n` +
          `❤️ Health: ${miniBoss.health}/${miniBoss.maxHealth}\n` +
          `⚔️ Damage: ${miniBoss.damage}\n` +
          `🛡️ Defense: ${miniBoss.defense}\n` +
          `✨ Special: ${miniBoss.ability.name} - ${miniBoss.ability.description}\n\n` +
          `**Your Stats**\n` +
          `❤️ HP: ${state.hp}/${state.stats.maxHp}\n` +
          `💙 Mana: ${state.mana}/${state.stats.maxMana}\n` +
          `⚔️ Strength: ${state.stats.strength}\n` +
          `🛡️ Defense: ${state.stats.defense}`
        );

      // Add modifier and event info if present
      if (room.modifier) {
        embed.addFields({ 
          name: `${room.modifier.name}`, 
          value: room.modifier.description, 
          inline: true 
        });
      }
      if (room.event) {
        embed.addFields({ 
          name: `📜 ${room.event.name}`, 
          value: `Complete this challenge for bonus rewards!`, 
          inline: true 
        });
      }

      // Show potential loot
      if (miniBoss.loot && miniBoss.loot.length > 0) {
        const lootPreview = miniBoss.loot.slice(0, 3).map(l => `${l.rarity === 'legendary' ? '⭐' : l.rarity === 'rare' ? '💎' : '💰'} ${l.name}`).join(', ');
        embed.addFields({ 
          name: '🎁 Potential Loot', 
          value: lootPreview + (miniBoss.loot.length > 3 ? '...' : ''), 
          inline: false 
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-roguelike-miniboss-fight-${room.id}`)
          .setLabel('⚔️ Fight Mini-Boss')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-exit')
          .setLabel('🚪 Flee (50% rewards)')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error('Error in handleRoguelikeMiniBossRoom:', error);
      await interaction.reply({
        content: 'Failed to load mini-boss encounter.',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle skill room selection
   */,

  async handleRoguelikeSkillRoom(interaction, player, room, victoryContext = null) {
    try {
      const skills = Array.isArray(room.skillOptions) && room.skillOptions.length
        ? room.skillOptions
        : (room.skill ? [room.skill] : []);

      if (skills.length === 0) {
        await interaction.reply({
          content: 'No skills available in this room.',
          ephemeral: true,
        });
        return;
      }

      const skillsList = skills
        .map((skill, index) =>
          `**${index + 1}. ${skill.name}** - ${skill.description}\n` +
          `⚔️ ${skill.damage} DMG | 💙 ${skill.mana} Mana`
        )
        .join('\n\n');

      const victoryText = victoryContext
        ? `**Victory Rewards**\n` +
          `💎 Currency A: +${victoryContext.currencyA}\n` +
          `⭐ Currency B: +${victoryContext.currencyB}\n` +
          (victoryContext.lootGained && victoryContext.lootGained.length > 0
            ? `🎁 Loot: ${victoryContext.lootGained.map(l => l.name).join(', ')}\n`
            : '') +
          '\n'
        : '';

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('⚡ Choose a Skill')
        .setDescription(
          `${victoryText}` +
          `**Available Skills**\n\n` +
          `${skillsList}\n\n` +
          `*Pick one skill to add to your run.*`
        );

      const rows = [];
      let currentRow = new ActionRowBuilder();

      skills.forEach((skill, index) => {
        const button = new ButtonBuilder()
          .setCustomId(`rpg-roguelike-skill-choose-${room.id}-${index}`)
          .setLabel(`${index + 1}. ${skill.name}`.slice(0, 80))
          .setStyle(ButtonStyle.Success);

        if (currentRow.components.length >= 5) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }

        currentRow.addComponents(button);
      });

      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }

      rows.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-roguelike-skill-decline-${room.id}`)
            .setLabel('✗ Skip Skill')
            .setStyle(ButtonStyle.Secondary)
        )
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: rows,
      });
    } catch (error) {
      console.error('Error in handleRoguelikeSkillRoom:', error);
      await interaction.reply({
        content: 'Failed to load skill room.',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle boss room
   */,

  async handleRoguelikeBossRoom(interaction, player, room) {
    try {
      const roguelike = new RoguelikeManager();
      const state = player.roguelikeState;

      // Calculate boss stats
      const nextBossNum = state.bossesDefeated + 1;
      const bossStats = roguelike.calculateBossStats(nextBossNum, state);

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`👹 ${bossStats.name}`)
        .setDescription(bossStats.description)
        .addFields(
          { name: '❤️ Health', value: `${bossStats.health}`, inline: true },
          { name: '⚔️ Damage', value: `${bossStats.damage}`, inline: true },
          { name: '🛡️ Defense', value: `${bossStats.defense}`, inline: true },
          { name: '⚠️ Warning', value: 'This is a powerful opponent. Your skills and items will help you survive!' }
        )
        .setColor(0xff0000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-boss-fight')
          .setLabel('⚔️ Fight Boss')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-exit')
          .setLabel('🚪 Flee (50% rewards)')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error('Error in handleRoguelikeBossRoom:', error);
      await interaction.reply({
        content: 'Failed to load boss room.',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle shop room with enhanced interface
   */,

  async handleRoguelikeShopRoom(interaction, player, room) {
    try {
      const state = player.roguelikeState;
      const roguelike = new RoguelikeManager();

      // Get available gold
      const gold = state.currencyAEarned || 0;

      // Format shop items
      let itemsList = room.items.map((item, index) => {
        const canAfford = gold >= item.cost;
        const status = canAfford ? '✅' : '❌';
        return `${status} **${item.name}** - ${item.cost} gold\n   ${item.effect}`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`🏪 Shop - Floor ${state.currentFloor}`)
        .setDescription(
          `**Welcome to the Shop!**\n` +
          `💰 Your Gold: **${gold}**\n\n` +
          `**Available Items:**\n${itemsList}\n\n` +
          `*Tip: View the full catalog to see all possible shop items!*`
        )
        .setFooter({ text: 'Items scale with floor level' });

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-shop-catalog')
          .setLabel('📋 View Full Catalog')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-shop-leave')
          .setLabel('🚪 Leave Shop')
          .setStyle(ButtonStyle.Secondary)
      );

      // Create buy buttons for affordable items (max 5 per row)
      const affordableItems = room.items.filter(item => gold >= item.cost).slice(0, 5);
      const components = [row1];
      
      if (affordableItems.length > 0) {
        const row2 = new ActionRowBuilder();
        affordableItems.slice(0, 5).forEach((item, index) => {
          row2.addComponents(
            new ButtonBuilder()
              .setCustomId(`rpg-roguelike-shop-buy_${index}`)
              .setLabel(`Buy ${item.name.slice(0, 20)}`)
              .setStyle(ButtonStyle.Success)
          );
        });
        components.push(row2);
      }

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components,
      });
    } catch (error) {
      console.error('Error in handleRoguelikeShopRoom:', error);
      await interaction.reply({
        content: 'Failed to load shop.',
        ephemeral: true,
      });
    }
  }

  /**
   * Show full shop catalog
   */,

  async handleRoguelikeShopCatalog(interaction, player) {
    try {
      const state = player.roguelikeState;
      const roguelike = new RoguelikeManager();
      const catalog = roguelike.getShopCatalog(state.currentFloor);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('📋 Shop Catalog - All Available Items')
        .setDescription(
          `*This catalog shows all items that can appear in shops throughout your run.*\n` +
          `*Prices scale with floor level. Current floor: ${state.currentFloor}*\n\n`
        )
        .addFields(
          {
            name: '❤️ CONSUMABLES',
            value: catalog.consumables.map(item => `**${item.name}** - ${item.cost}g\n   └ ${item.effect}`).join('\n'),
            inline: false
          },
          {
            name: '💪 TEMPORARY BUFFS',
            value: catalog.buffs.map(item => `**${item.name}** - ${item.cost}g\n   └ ${item.effect}`).join('\n'),
            inline: false
          },
          {
            name: '⚔️ EQUIPMENT',
            value: catalog.equipment.map(item => `**${item.name}** - ${item.cost}g\n   └ ${item.effect}`).join('\n'),
            inline: false
          },
          {
            name: '✨ SPECIAL ITEMS',
            value: catalog.special.map(item => `**${item.name}** - ${item.cost}g\n   └ ${item.effect}`).join('\n').slice(0, 1024),
            inline: false
          },
          {
            name: '🔧 UTILITY',
            value: catalog.utility.map(item => `**${item.name}** - ${item.cost}g\n   └ ${item.effect}`).join('\n'),
            inline: false
          }
        )
        .setFooter({ text: 'Shops offer 5-7 random items per visit' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-shop-back')
          .setLabel('← Back to Shop')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error('Error in handleRoguelikeShopCatalog:', error);
      await interaction.reply({
        content: 'Failed to load catalog.',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle shop item purchase
   */,

  async handleRoguelikeShopBuy(interaction, player, itemIndex) {
    try {
      const state = player.roguelikeState;
      if (!state || !state.isActive) {
        await interaction.reply({
          content: 'No active run.',
          ephemeral: true,
        });
        return;
      }

      const room = state.currentFloorRooms.find(r => r.type === 'shop');
      if (!room || !room.items || !room.items[itemIndex]) {
        await interaction.reply({
          content: 'Item not found.',
          ephemeral: true,
        });
        return;
      }

      const item = room.items[itemIndex];
      const gold = state.currencyAEarned || 0;

      // Check if can afford
      if (gold < item.cost) {
        await interaction.reply({
          content: `⚠️ Not enough gold! You need ${item.cost} gold but only have ${gold}.`,
          ephemeral: true,
        });
        return;
      }

      // Purchase item
      state.currencyAEarned -= item.cost;
      state.items.push({ ...item, purchasedAt: Date.now() });
      state.shopUpgradesPurchased++;

      // Apply item effect if it's a stat boost
      if (item.id.includes('Potion') || item.id.includes('Elixir')) {
        if (item.id.includes('strength')) {
          const boost = item.id.includes('Elixir') ? 10 : 5;
          state.stats.strength += boost;
        } else if (item.id.includes('defense')) {
          const boost = item.id.includes('Elixir') ? 10 : 5;
          state.stats.defense += boost;
        } else if (item.id.includes('speed')) {
          const boost = item.id.includes('Elixir') ? 10 : 5;
          state.stats.agility += boost;
        } else if (item.id.includes('intelligence')) {
          state.stats.intelligence += 5;
        } else if (item.id.includes('wisdom')) {
          state.stats.wisdom += 5;
        }
      }

      // Save player
      await this.playerManager.savePlayer(player);

      // Show confirmation and return to shop
      await interaction.reply({
        content: `✅ Purchased **${item.name}** for ${item.cost} gold!\n${item.effect}`,
        ephemeral: true,
      });

      // Refresh shop display
      setTimeout(async () => {
        await this.handleRoguelikeShopRoom(interaction, player, room);
      }, 1000);

    } catch (error) {
      console.error('Error in handleRoguelikeShopBuy:', error);
      await interaction.reply({
        content: 'Failed to purchase item.',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle roguelike exit
   */,

  async handleRoguelikeExit(interaction, player) {
    try {
      if (!player.roguelikeState || !player.roguelikeState.isActive) {
        await interaction.reply({
          content: 'No active run.',
          ephemeral: true,
        });
        return;
      }

      const roguelike = new RoguelikeManager();
      const state = player.roguelikeState;

      // Calculate rewards (50% for voluntary exit)
      const rewards = roguelike.calculateRewards(state, 'voluntaryExit');

      // Update player
      player.roguelikeCurrencies.currencyA += rewards.currencyA;
      player.roguelikeCurrencies.currencyB += rewards.currencyB;
      player.roguelikeCurrencies.currencyC += rewards.currencyC;

      // Update stats
      player.roguelikeStats.totalRunsCompleted++;
      player.roguelikeStats.highestFloorReached = Math.max(
        player.roguelikeStats.highestFloorReached,
        state.currentFloor
      );
      player.roguelikeStats.voluntaryExits++;

      // Clear run state
      player.roguelikeState = null;

      // Save player
      await this.playerManager.savePlayer(player);

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🎲 Roguelike Run Complete')
        .setDescription(
          `**You've exited the dungeon!**\n\n` +
          `**Rewards Earned (50% multiplier)**\n` +
          `💎 Currency A: +${rewards.currencyA}\n` +
          `⭐ Currency B: +${rewards.currencyB}\n` +
          `🏆 Currency C: +${rewards.currencyC}\n\n` +
          `**Run Summary**\n` +
          `📍 Floors Cleared: ${state.floorsCleared}\n` +
          `👹 Bosses Defeated: ${state.bossesDefeated}`
        )
        .setColor(0x2ecc71);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike')
          .setLabel('🎲 Back to Roguelike')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-combat-menu')
          .setLabel('⚔️ Combat Menu')
          .setStyle(ButtonStyle.Primary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error('Error in handleRoguelikeExit:', error);
      await interaction.reply({
        content: 'Failed to exit run.',
        ephemeral: true,
      });
    }
  }

  // Room emojis and names for display,

  get ROOM_EMOJIS() {
    return {
      skill: '⚡',
      treasure: '💎',
      healing: '❤️',
      rest: '😴',
      trap: '⚠️',
      shop: '🏪',
      libraryRoom: '📚',
      armoryRoom: '🛡️',
      alchemyRoom: '🧪',
    };
  },

  get ROOM_NAMES() {
    return {
      skill: 'Skill Room',
      treasure: 'Treasure',
      healing: 'Healing',
      rest: 'Rest',
      trap: 'Trap',
      shop: 'Shop',
      libraryRoom: 'Library',
      armoryRoom: 'Armory',
      alchemyRoom: 'Alchemy',
      combat: 'Combat Chamber',
      mystery: 'Mystery Room',
      elite: 'Elite Chamber',
    };
  }

  /**
   * Handle accepting skill in roguelike
   */,

  async handleRoguelikeSkillAccept(interaction, player) {
    try {
      if (!player.roguelikeState || !player.roguelikeState.isActive) {
        await interaction.reply({ content: 'No active run.', ephemeral: true });
        return;
      }

      const state = player.roguelikeState;
      const room = state.currentFloorRooms.find(r => r.type === 'skill');
      const fallbackSkills = room?.skillOptions || (room?.skill ? [room.skill] : []);

      if (!room || fallbackSkills.length === 0) {
        await interaction.reply({ content: 'No skill room found.', ephemeral: true });
        return;
      }

      await this.handleRoguelikeSkillChoose(interaction, player, room.id, 0);
    } catch (error) {
      console.error('Error accepting skill:', error);
      await interaction.reply({ content: 'Failed to accept skill.', ephemeral: true });
    }
  }

  /**
   * Handle declining skill in roguelike
   */,

  async handleRoguelikeSkillDecline(interaction, player, roomId = null) {
    try {
      if (!player.roguelikeState || !player.roguelikeState.isActive) {
        await interaction.reply({ content: 'No active run.', ephemeral: true });
        return;
      }

      const state = player.roguelikeState;
      const room = roomId
        ? state.currentFloorRooms.find(r => r.id === roomId)
        : state.currentFloorRooms.find(r => r.type === 'skill');

      if (!room) {
        await interaction.reply({ content: 'Skill room not found.', ephemeral: true });
        return;
      }

      const roguelike = new RoguelikeManager();
      const actionResults = { accepted: false, bossDefeated: !!room.miniBoss };
      roguelike.completeRoom(state, room, actionResults);
      state.currentFloor++;

      await this.playerManager.savePlayer(player);
      await this.handleRoguelikeFloor(interaction, player);
    } catch (error) {
      console.error('Error declining skill:', error);
      await interaction.reply({ content: 'Failed to decline skill.', ephemeral: true });
    }
  }

  /**
   * Handle selecting a specific skill option
   */,

  async handleRoguelikeSkillChoose(interaction, player, roomId, skillIndex) {
    try {
      if (!player.roguelikeState || !player.roguelikeState.isActive) {
        await interaction.reply({ content: 'No active run.', ephemeral: true });
        return;
      }

      const state = player.roguelikeState;
      const room = state.currentFloorRooms.find(r => r.id === roomId);

      if (!room) {
        await interaction.reply({ content: 'Skill room not found.', ephemeral: true });
        return;
      }

      const skillOptions = room.skillOptions || (room.skill ? [room.skill] : []);
      const selectedSkill = skillOptions[skillIndex];

      if (!selectedSkill) {
        await interaction.reply({ content: 'Invalid skill selection.', ephemeral: true });
        return;
      }

      const roguelike = new RoguelikeManager();
      const actionResults = { accepted: true, selectedSkill, bossDefeated: !!room.miniBoss };
      roguelike.completeRoom(state, room, actionResults);

      state.currentFloor++;
      await this.playerManager.savePlayer(player);
      await this.handleRoguelikeFloor(interaction, player);
    } catch (error) {
      console.error('Error selecting skill:', error);
      await interaction.reply({ content: 'Failed to select skill.', ephemeral: true });
    }
  }

  /**
   * Handle boss fight in roguelike
   */,

  async handleRoguelikeBossFight(interaction, player) {
    try {
      if (!player.roguelikeState || !player.roguelikeState.isActive) {
        await interaction.reply({ content: 'No active run.', ephemeral: true });
        return;
      }

      const roguelike = new RoguelikeManager();
      const state = player.roguelikeState;
      const nextBossNum = state.bossesDefeated + 1;
      const bossStats = roguelike.calculateBossStats(nextBossNum, state);

      // Simulate boss fight - for now, assume player wins (simplified for MVP)
      // In full implementation, this would integrate with CombatSystem
      state.bossesDefeated++;
      state.currencyAEarned += Math.floor(50 * state.difficultyMultiplier);
      state.currencyBEarned += Math.floor(30 * state.difficultyMultiplier);
      state.currencyCEarned += Math.floor(25 * state.difficultyMultiplier);

      // Increase difficulty for next boss
      state.difficultyMultiplier *= 1.2;

      // Move to next floor
      state.currentFloor++;

      // Check if final boss defeated
      if (state.currentFloor > 26) {
        await this.handleRoguelikeComplete(interaction, player);
        return;
      }

      await this.playerManager.savePlayer(player);
      await this.handleRoguelikeFloor(interaction, player);
    } catch (error) {
      console.error('Error in boss fight:', error);
      await interaction.reply({ content: 'Failed to process boss fight.', ephemeral: true });
    }
  }

  /**
   * Handle mini-boss fight in a room
   */,

  async handleRoguelikeMiniBossFight(interaction, player, roomId) {
    try {
      if (!player.roguelikeState || !player.roguelikeState.isActive) {
        await interaction.reply({ content: 'No active run.', ephemeral: true });
        return;
      }

      const state = player.roguelikeState;
      const room = state.currentFloorRooms.find(r => r.id === roomId);

      if (!room || !room.miniBoss) {
        await interaction.reply({ content: 'Mini-boss not found!', ephemeral: true });
        return;
      }

      const miniBoss = room.miniBoss;
      const roguelike = new RoguelikeManager();

      // Simulate mini-boss fight (simplified - assumes player wins)
      // In a full implementation, this would use the CombatSystem
      const playerDamage = state.stats.strength + Math.floor(Math.random() * 10);
      const damageTaken = Math.max(0, miniBoss.damage - state.stats.defense);
      
      // Mark mini-boss as defeated
      miniBoss.defeated = true;
      
      // Update player state
      state.hp = Math.max(1, state.hp - damageTaken);
      state.totalDamageTaken += damageTaken;
      state.totalDamageDealt += playerDamage;
      
      // Apply room modifier bonuses if present
      let rewardMultiplier = 1.0;
      if (room.modifier && room.modifier.rewardMultiplier) {
        rewardMultiplier = room.modifier.rewardMultiplier;
      }

      // Grant rewards
      const currencyA = Math.floor((15 + state.currentFloor * 2) * rewardMultiplier);
      const currencyB = Math.floor((10 + state.currentFloor) * rewardMultiplier);
      
      state.currencyAEarned += currencyA;
      state.currencyBEarned += currencyB;
      state.miniBossesDefeated++;

      // Grant loot
      const lootGained = miniBoss.loot || [];
      lootGained.forEach(loot => {
        if (loot.isArtifact) {
          state.artifacts.push(loot);
        } else {
          state.items.push(loot);
        }
      });

      if (room.type === 'skill') {
        await this.playerManager.savePlayer(player);
        await this.handleRoguelikeSkillRoom(interaction, player, room, {
          currencyA,
          currencyB,
          lootGained,
        });
        return;
      }

      // Build result embed
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('⚔️ Victory!')
        .setDescription(
          `You defeated the **${miniBoss.name}**!\n\n` +
          `💔 Damage taken: ${damageTaken}\n` +
          `❤️ HP remaining: ${state.hp}/${state.stats.maxHp}\n\n` +
          `**Rewards**\n` +
          `💎 Currency A: +${currencyA}\n` +
          `⭐ Currency B: +${currencyB}\n` +
          (lootGained.length > 0 ? `🎁 Loot: ${lootGained.map(l => l.name).join(', ')}\n` : '')
        );

      // Process room completion
      const actionResults = { bossDefeated: true };
      roguelike.completeRoom(state, room, actionResults);
      
      // Advance to next floor
      state.currentFloor++;

      // Save and continue
      await this.playerManager.savePlayer(player);

      // Check if player survived
      if (state.hp <= 0) {
        embed.setColor(0xff0000);
        embed.setTitle('💀 Defeated!');
        embed.setDescription('You were defeated by the mini-boss...');
        await this.handleRoguelikeExit(interaction, player);
        return;
      }

      // Add continue button
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-continue')
          .setLabel('➡️ Continue to Next Floor')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-exit')
          .setLabel('🚪 Exit (50% rewards)')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error('Error in mini-boss fight:', error);
      await interaction.reply({ content: 'Failed to process mini-boss fight.', ephemeral: true });
    }
  }

  /**
   * Handle roguelike complete (all bosses defeated)
   */,

  async handleRoguelikeComplete(interaction, player) {
    try {
      const roguelike = new RoguelikeManager();
      const state = player.roguelikeState;

      // Calculate rewards (100% for completion)
      const rewards = roguelike.calculateRewards(state, 'death');

      // Update player
      player.roguelikeCurrencies.currencyA += rewards.currencyA;
      player.roguelikeCurrencies.currencyB += rewards.currencyB;
      player.roguelikeCurrencies.currencyC += rewards.currencyC;

      // Update stats
      player.roguelikeStats.totalRunsCompleted++;
      player.roguelikeStats.highestFloorReached = Math.max(
        player.roguelikeStats.highestFloorReached,
        state.currentFloor
      );
      player.roguelikeStats.totalCurrencyEarned.A += rewards.currencyA;
      player.roguelikeStats.totalCurrencyEarned.B += rewards.currencyB;
      player.roguelikeStats.totalCurrencyEarned.C += rewards.currencyC;
      player.roguelikeStats.bossesDefeated += 6; // 5 bosses + final boss

      // Clear run state
      player.roguelikeState = null;

      // Save player
      await this.playerManager.savePlayer(player);

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('🎲 Roguelike Complete!')
        .setDescription(
          `**🏆 YOU CONQUERED THE ROGUELIKE DUNGEON! 🏆**\n\n` +
          `**Rewards Earned (100% multiplier)**\n` +
          `💎 Currency A: +${rewards.currencyA}\n` +
          `⭐ Currency B: +${rewards.currencyB}\n` +
          `🏆 Currency C: +${rewards.currencyC}\n\n` +
          `**Run Summary**\n` +
          `📍 Floors Cleared: 26/26 ✓\n` +
          `👹 Bosses Defeated: 6/6 ✓\n` +
          `⏱️ Difficulty Multiplier: ${state.difficultyMultiplier.toFixed(2)}x`
        )
        .setColor(0xffd700);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike')
          .setLabel('🎲 Again')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-upgrades')
          .setLabel('💎 Upgrade Stats')
          .setStyle(ButtonStyle.Primary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error('Error in roguelike complete:', error);
      await interaction.reply({
        content: 'Failed to complete roguelike.',
        ephemeral: true,
      });
    }
  }

  /**
   * Handle roguelike upgrades menu
   */,

  async handleRoguelikeUpgrades(interaction, player, category = 'all') {
    try {
      const roguelike = new RoguelikeManager();
      const allUpgrades = roguelike.getAvailableUpgrades(player.roguelikeUpgrades);
      
      // Filter upgrades by category if specified
      const filteredUpgrades = category === 'all' 
        ? allUpgrades 
        : allUpgrades.filter(u => u.category === category);

      // Create embed with currency explanations
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('💎 Roguelike Permanent Upgrades')
        .setDescription(
          `**Understanding Currencies:**\n\n` +
          `💎 **Currency A** (${player.roguelikeCurrencies.currencyA})\n` +
          `Used to purchase permanent upgrades that apply to all future roguelike runs. ` +
          `Earned by completing floors, defeating bosses, and reaching milestones.\n\n` +
          `⭐ **Currency B** (${player.roguelikeCurrencies.currencyB})\n` +
          `Used inside roguelike runs to unlock special rooms (Library, Armory, Alchemy). ` +
          `Earned during runs and resets when you exit.\n\n` +
          `🏆 **Currency C** (${player.roguelikeCurrencies.currencyC})\n` +
          `Used for player upgrades outside the dungeon. ` +
          `Earned from completing runs and achievements.\n\n` +
          `**Viewing:** ${category === 'all' ? 'All Upgrades' : category.charAt(0).toUpperCase() + category.slice(1)} ` +
          `(${filteredUpgrades.length} available)\n` +
          `Select an upgrade below to view details and purchase.`
        );

      // Create select menu for upgrades
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('rpg-roguelike-upgrade-select')
        .setPlaceholder('Choose an upgrade to view...')
        .setMinValues(1)
        .setMaxValues(1);

      // Add upgrade options to select menu (max 25)
      filteredUpgrades.slice(0, 25).forEach(upgrade => {
        const status = upgrade.isMaxed ? 'MAX' : `${upgrade.cost} 💎`;
        const label = `${upgrade.name} - ${status}`;
        const description = `Lv ${upgrade.currentLevel}/${upgrade.maxLevel} | ${upgrade.description}`.slice(0, 100);
        
        selectMenu.addOptions({
          label: label.slice(0, 100),
          description: description,
          value: upgrade.id,
          emoji: upgrade.emoji,
        });
      });

      const rows = [new ActionRowBuilder().addComponents(selectMenu)];

      // Add category filter buttons
      const categoryButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-upgrades-category-all')
          .setLabel('All')
          .setStyle(category === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-upgrades-category-survival')
          .setLabel('🛡️ Survival')
          .setStyle(category === 'survival' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-upgrades-category-offense')
          .setLabel('⚔️ Offense')
          .setStyle(category === 'offense' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-upgrades-category-magic')
          .setLabel('🔮 Magic')
          .setStyle(category === 'magic' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-upgrades-category-utility')
          .setLabel('💨 Utility')
          .setStyle(category === 'utility' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
      rows.push(categoryButtons);

      // Add progression category and back button
      const bottomButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-upgrades-category-progression')
          .setLabel('⭐ Progression')
          .setStyle(category === 'progression' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Danger)
      );
      rows.push(bottomButtons);

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: rows,
      });
    } catch (error) {
      console.error('Error in upgrades:', error);
      await interaction.reply({ content: 'Failed to load upgrades.', ephemeral: true });
    }
  }

  /**
   * Handle roguelike statistics
   */,

  async handleRoguelikeStats(interaction, player) {
    try {
      const stats = player.roguelikeStats;

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('📊 Roguelike Statistics')
        .setDescription('Your roguelike dungeon records and achievements.')
        .addFields(
          { name: 'Runs Completed', value: `${stats.totalRunsCompleted}`, inline: true },
          { name: 'Highest Floor', value: `${stats.highestFloorReached}/26`, inline: true },
          { name: 'Bosses Defeated', value: `${stats.bossesDefeated}`, inline: true },
          { name: 'Voluntary Exits', value: `${stats.voluntaryExits}`, inline: true },
          { name: 'Deaths', value: `${stats.deathCount}`, inline: true },
          {
            name: 'Total Currency Earned',
            value: `💎 A: ${stats.totalCurrencyEarned.A}\n⭐ B: ${stats.totalCurrencyEarned.B}\n🏆 C: ${stats.totalCurrencyEarned.C}`,
            inline: false,
          }
        )
        .setColor(0x9b59b6);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-roguelike')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error('Error in stats:', error);
      await interaction.reply({ content: 'Failed to load statistics.', ephemeral: true });
    }
  }

  /**
   * Handle viewing upgrade details
   */,

  async handleRoguelikeUpgradeView(interaction, player, upgradeId) {
    try {
      const roguelike = new RoguelikeManager();
      const upgradeDetails = roguelike.getUpgradeDetails(upgradeId, player.roguelikeUpgrades);
      
      if (!upgradeDetails) {
        await interaction.reply({ content: '❌ Invalid upgrade!', ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`${upgradeDetails.emoji} ${upgradeDetails.name}`)
        .setDescription(upgradeDetails.detailDescription)
        .addFields(
          { 
            name: '📊 Current Status', 
            value: `Level: **${upgradeDetails.currentLevel}/${upgradeDetails.maxLevel}**\n` +
                   `Current Bonus: **+${upgradeDetails.currentBonus}**\n` +
                   `Next Bonus: **+${upgradeDetails.nextBonus}**`,
            inline: true 
          },
          { 
            name: '💎 Cost Information', 
            value: upgradeDetails.isMaxed 
              ? '✅ **MAX LEVEL**' 
              : `Next Level Cost: **${upgradeDetails.cost}** Currency A\n` +
                `Your Currency: **${player.roguelikeCurrencies.currencyA}**`,
            inline: true 
          },
          {
            name: '📈 Upgrade Path (Next 5 Levels)',
            value: upgradeDetails.costProgression.length > 0
              ? upgradeDetails.costProgression.map(p => `Lv ${p.level}: ${p.cost} 💎`).join('\n')
              : '✅ Max level reached!',
            inline: false
          }
        )
        .setFooter({ text: `Category: ${upgradeDetails.category.toUpperCase()} | +${upgradeDetails.increment} per level` });

      const canAfford = !upgradeDetails.isMaxed && player.roguelikeCurrencies.currencyA >= upgradeDetails.cost;
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-roguelike-upgrade-buy-${upgradeId}`)
          .setLabel(upgradeDetails.isMaxed ? '✅ Maxed' : `💎 Purchase (${upgradeDetails.cost})`)
          .setStyle(upgradeDetails.isMaxed ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(upgradeDetails.isMaxed || !canAfford),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-upgrades')
          .setLabel('← Back to Upgrades')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error('Error viewing upgrade:', error);
      await interaction.reply({ content: '❌ Failed to view upgrade details.', ephemeral: true });
    }
  }

  /**
   * Handle purchasing an upgrade
   */,

  async handleRoguelikeUpgradePurchase(interaction, player, upgradeId) {
    try {
      const roguelike = new RoguelikeManager();
      const result = roguelike.purchaseUpgrade(player, upgradeId);
      
      if (!result.success) {
        await interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
        return;
      }

      // Save player
      await this.playerManager.savePlayer(player);

      // Show success message and return to upgrade details
      const upgradeDetails = roguelike.getUpgradeDetails(upgradeId, player.roguelikeUpgrades);
      
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Upgrade Purchased!')
        .setDescription(
          `**${upgradeDetails.emoji} ${upgradeDetails.name}** upgraded to **Level ${result.newLevel}**!\n\n` +
          `✨ Bonus gained: **+${result.bonusGained}**\n` +
          `💎 Currency remaining: **${result.currencyRemaining}**`
        )
        .addFields(
          { 
            name: '📊 Current Status', 
            value: `Level: **${upgradeDetails.currentLevel}/${upgradeDetails.maxLevel}**\n` +
                   `Total Bonus: **+${upgradeDetails.currentBonus}**`,
            inline: true 
          },
          { 
            name: '💎 Next Upgrade', 
            value: upgradeDetails.isMaxed 
              ? '✅ **MAX LEVEL**' 
              : `Cost: **${upgradeDetails.cost}** Currency A`,
            inline: true 
          }
        );

      const canAfford = !upgradeDetails.isMaxed && player.roguelikeCurrencies.currencyA >= upgradeDetails.cost;
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-roguelike-upgrade-buy-${upgradeId}`)
          .setLabel(upgradeDetails.isMaxed ? '✅ Maxed' : `💎 Buy Again (${upgradeDetails.cost})`)
          .setStyle(upgradeDetails.isMaxed ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(upgradeDetails.isMaxed || !canAfford),
        new ButtonBuilder()
          .setCustomId(`rpg-roguelike-upgrade-view-${upgradeId}`)
          .setLabel('📊 View Details')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('rpg-roguelike-upgrades')
          .setLabel('← Back to Upgrades')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      console.error('Error purchasing upgrade:', error);
      await interaction.reply({ content: '❌ Failed to purchase upgrade.', ephemeral: true });
    }
  }

  /**
   * Display leaderboards selector menu
   */,

  async handleTowerStart(interaction, player) {
    try {
      const tower = new TowerManager();
      
      // Check if player meets requirements
      const canEnter = tower.canEnterTower(player);
      if (!canEnter.allowed) {
        await interaction.reply({
          content: `🔒 ${canEnter.reason}`,
          ephemeral: true
        });
        return;
      }

      const towerStatus = tower.getTowerStatus(player);

      const embed = new EmbedBuilder()
        .setColor(0x00d4ff)
        .setTitle('❄️ NIFLHEIM TOWER')
        .setDescription(
          '**The Infinite Tower Challenge**\n\n' +
          '🏔️ **100 Floors** of escalating difficulty\n' +
          '⚔️ Combat every floor, **Boss every 5 floors**\n' +
         '❄️ Face the ultimate frozen challenge\n\n' +
          '**Rewards Per Floor:**\n' +
          '💰 **Gold** - Scales with floor\n' +
          '🔮 **Guild Boss Essence** - For guild upgrades\n' +
          '⛏️ **Materials** - Crafting resources\n' +
          '📦 **Lootboxes** - Better on boss floors\n' +
          '✨ **Enchants** - Tier scales with floor\n' +
          '🧪 **Potions** - Higher tiers at higher floors\n\n' +
          '**Special Bonuses:**\n' +
          '• Floors 10, 20, 30... give **2x rewards**\n' +
          '• Floor 100 gives **5x rewards** + **5 Legendary Lootboxes**\n' +
          '• Difficulty increases **exponentially** - prepare well!\n\n' +
          `**Your Progress:**\n` +
          `Current Floor: **${towerStatus.currentFloor}/${tower.TOTAL_FLOORS}**\n` +
          `Highest Floor: **${towerStatus.highestFloor}/${tower.TOTAL_FLOORS}** (${towerStatus.percentComplete}%)\n` +
          `Total Clears: **${towerStatus.totalClears}**\n` +
          `Total Attempts: **${towerStatus.totalAttempts}**\n\n` +
          `**Lifetime Rewards:**\n` +
          `💰 ${towerStatus.lifetimeRewards.gold.toLocaleString()} Gold\n` +
          `🔮 ${towerStatus.lifetimeRewards.essence.toLocaleString()} Essence\n` +
          `📦 ${towerStatus.lifetimeRewards.lootboxes} Lootboxes\n` +
          `⛏️ ${towerStatus.lifetimeRewards.materials.toLocaleString()} Materials`
        )
        .setFooter({ text: `Next Floor: ${towerStatus.nextIsBoss ? '👑 BOSS FLOOR' : '⚔️ Combat'}` });

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-tower-enter')
          .setLabel(`⚔️ Enter Floor ${towerStatus.currentFloor}`)
          .setStyle(towerStatus.nextIsBoss ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('rpg-tower-status')
          .setLabel('📊 Detailed Stats')
          .setStyle(ButtonStyle.Primary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-tower-reset')
          .setLabel('🔄 Reset to Floor 1')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(towerStatus.currentFloor === 1),
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('← Back to Combat')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row1, row2],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleTowerStart:', error);
      await interaction.reply({
        content: '❌ Failed to load Niflheim Tower.',
        ephemeral: true
      });
    }
  }

  /**
   * Handle tower enter - start combat on current floor
   */,

  async handleTowerEnter(interaction, player) {
    try {
      const tower = new TowerManager();
      const towerStatus = tower.getTowerStatus(player);
      const currentFloor = towerStatus.currentFloor;
      const isBoss = tower.isBossFloor(currentFloor);

      // Generate enemy
      const enemy = tower.generateEnemy(currentFloor, isBoss);

      // Store enemy in player state for combat
      if (!player.towerState) {
        player.towerState = {};
      }
      player.towerState.currentEnemy = enemy;
      player.towerState.currentFloor = currentFloor;
      await this.playerManager.savePlayer(player);

      const embed = new EmbedBuilder()
        .setColor(isBoss ? 0xff0000 : 0x00d4ff)
        .setTitle(`${isBoss ? '👑 BOSS FLOOR' : '⚔️ TOWER COMBAT'} - Floor ${currentFloor}`)
        .setDescription(
          `${enemy.emoji} **${enemy.name}**\n\n` +
          `**Enemy Stats:**\n` +
          `❤️ HP: ${enemy.hp.toLocaleString()}/${enemy.maxHp.toLocaleString()}\n` +
          `⚔️ Damage: ${enemy.damage.toLocaleString()}\n` +
          `🛡️ Defense: ${enemy.defense.toLocaleString()}\n\n` +
          `${isBoss ? '⚠️ **This is a BOSS floor!** Victory grants enhanced rewards!' : ''}\n\n` +
          `**Prepare for battle!**`
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-tower-fight')
          .setLabel('⚔️ Fight!')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('rpg-tower')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleTowerEnter:', error);
      await interaction.reply({
        content: '❌ Failed to enter tower floor.',
        ephemeral: true
      });
    }
  }

  /**
   * Handle tower fight - execute combat
   */,

  async handleTowerFight(interaction, player) {
    try {
      if (!player.towerState || !player.towerState.currentEnemy) {
        await interaction.reply({
          content: '❌ No active tower combat found.',
          ephemeral: true
        });
        return;
      }

      const tower = new TowerManager();
      const enemy = player.towerState.currentEnemy;
      const currentFloor = player.towerState.currentFloor;

      // Use existing combat system
      const combat = new CombatSystem();
      const result = await combat.executeCombat(player, enemy);

      if (result.victory) {
        // Player won - complete floor
        const completion = tower.completeFloor(player, currentFloor, result);
        await this.playerManager.savePlayer(player);

        // Build rewards display and distribute
        let rewardsText = '';
        
        // Add gold
        if (completion.rewards.gold > 0) {
          rewardsText += `💰 ${completion.rewards.gold.toLocaleString()} Gold\n`;
          player.gold = (player.gold || 0) + completion.rewards.gold;
        }
        
        // Add guild boss essence as material
        if (completion.rewards.guildEssence > 0) {
          rewardsText += `🔮 ${completion.rewards.guildEssence.toLocaleString()} Guild Boss Essence\n`;
          this.addMaterialToInventory(player, 'boss_essence', completion.rewards.guildEssence);
        }
        
        // Add materials
        if (completion.rewards.materials.length > 0) {
          rewardsText += `⛏️ Materials:\n`;
          for (const mat of completion.rewards.materials) {
            rewardsText += `  • ${mat.id}: ${mat.quantity}\n`;
            this.addMaterialToInventory(player, mat.id, mat.quantity);
          }
        }
        
        // Add lootboxes
        if (completion.rewards.lootboxes.length > 0) {
          rewardsText += `📦 Lootboxes:\n`;
          for (const box of completion.rewards.lootboxes) {
            rewardsText += `  • ${box.type} x${box.quantity}\n`;
            this.addLootboxToInventory(player, box.type, box.quantity);
          }
        }
        
        // Add enchants
        if (completion.rewards.enchants.length > 0) {
          rewardsText += `✨ Enchants:\n`;
          for (const ench of completion.rewards.enchants) {
            rewardsText += `  • ${ench.id} x${ench.quantity}\n`;
            // Add enchants to inventory properly
            for (let i = 0; i < ench.quantity; i++) {
              if (!player.inventory) player.inventory = [];
              player.inventory.push({
                id: ench.id,
                name: ench.id,
                type: 'consumable',
                subtype: 'enchant',
                quantity: 1
              });
            }
          }
        }
        
        // Add potions
        if (completion.rewards.potions.length > 0) {
          rewardsText += `🧪 Potions:\n`;
          for (const pot of completion.rewards.potions) {
            rewardsText += `  • ${pot.id} x${pot.quantity}\n`;
            // Add potions to inventory properly
            for (let i = 0; i < pot.quantity; i++) {
              if (!player.inventory) player.inventory = [];
              player.inventory.push({
                id: pot.id,
                name: pot.id,
                type: 'consumable',
                subtype: 'potion',
                quantity: 1
              });
            }
          }
        }

        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('✅ FLOOR CLEARED!')
          .setDescription(
            `${enemy.emoji} **${enemy.name}** defeated!\n\n` +
            `**Combat Summary:**\n` +
            `⚔️ Damage Dealt: ${result.damageDealt.toLocaleString()}\n` +
            `💔 Damage Taken: ${result.damageTaken.toLocaleString()}\n` +
            `⏱️ Combat Duration: ${result.turns} turns\n\n` +
            `**Floor ${currentFloor} Rewards:**\n${rewardsText}\n` +
            `${completion.completedTower ? '🎉 **TOWER COMPLETED!** You conquered all 100 floors!' : `➡️ Next: Floor ${completion.nextFloor}${tower.isBossFloor(completion.nextFloor) ? ' (BOSS)' : ''}`}`
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-tower-continue')
            .setLabel(completion.completedTower ? '🎉 Return to Tower' : `➡️ Continue to Floor ${completion.nextFloor}`)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('rpg-tower')
            .setLabel('📊 Tower Overview')
            .setStyle(ButtonStyle.Primary)
        );

        // Clear tower state
        player.towerState = null;
        await this.playerManager.savePlayer(player);

        await this.updateInteractionWithTracking(interaction, {
          embeds: [embed],
          components: [row],
          ephemeral: true
        });
      } else {
        // Player lost
        tower.handleDefeat(player, currentFloor);
        player.towerState = null;
        await this.playerManager.savePlayer(player);

        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('💀 DEFEATED')
          .setDescription(
            `${enemy.emoji} **${enemy.name}** has defeated you on Floor ${currentFloor}!\n\n` +
            `**Combat Summary:**\n` +
            `⚔️ Damage Dealt: ${result.damageDealt.toLocaleString()}\n` +
            `💔 Damage Taken: ${result.damageTaken.toLocaleString()}\n` +
            `⏱️ Survived: ${result.turns} turns\n\n` +
            `You can retry from Floor 1 or continue from your last checkpoint.`
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-tower-reset')
            .setLabel('🔄 Start from Floor 1')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('rpg-tower')
            .setLabel('← Back to Tower')
            .setStyle(ButtonStyle.Secondary)
        );

        await this.updateInteractionWithTracking(interaction, {
          embeds: [embed],
          components: [row],
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error in handleTowerFight:', error);
      await interaction.reply({
        content: '❌ Combat error occurred.',
        ephemeral: true
      });
    }
  }

  /**
   * Handle tower continue - proceed to next floor
   */,

  async handleTowerContinue(interaction, player) {
    // Just redirect to tower start which will show current floor
    await this.handleTowerStart(interaction, player);
  }

  /**
   * Handle tower reset - start over from floor 1
   */,

  async handleTowerReset(interaction, player) {
    try {
      const tower = new TowerManager();
      tower.resetProgress(player);
      await this.playerManager.savePlayer(player);

      await interaction.reply({
        content: '🔄 Tower progress reset! Starting from Floor 1.',
        ephemeral: true
      });

      // Show tower start
      await this.handleTowerStart(interaction, player);
    } catch (error) {
      console.error('Error in handleTowerReset:', error);
      await interaction.reply({
        content: '❌ Failed to reset tower progress.',
        ephemeral: true
      });
    }
  }

  /**
   * Handle tower status - show detailed statistics
   */,

  async handleTowerStatus(interaction, player) {
    try {
      const tower = new TowerManager();
      const towerStatus = tower.getTowerStatus(player);

      const embed = new EmbedBuilder()
        .setColor(0x00d4ff)
        .setTitle('📊 NIFLHEIM TOWER STATISTICS')
        .addFields(
          {
            name: '🏔️ Progress',
            value: `Current Floor: **${towerStatus.currentFloor}/${tower.TOTAL_FLOORS}**\n` +
                   `Highest Floor: **${towerStatus.highestFloor}/${tower.TOTAL_FLOORS}**\n` +
                   `Completion: **${towerStatus.percentComplete}%**`,
            inline: true
          },
          {
            name: '🏆 Achievements',
            value: `Total Clears: **${towerStatus.totalClears}**\n` +
                   `Total Attempts: **${towerStatus.totalAttempts}**\n` +
                   `Success Rate: **${towerStatus.totalAttempts > 0 ? ((towerStatus.totalClears / towerStatus.totalAttempts) * 100).toFixed(1) : 0}%**`,
            inline: true
          },
          {
            name: '💰 Lifetime Rewards',
            value: `Gold: **${towerStatus.lifetimeRewards.gold.toLocaleString()}** 💰\n` +
                   `Essence: **${towerStatus.lifetimeRewards.essence.toLocaleString()}** 🔮\n` +
                   `Lootboxes: **${towerStatus.lifetimeRewards.lootboxes}** 📦\n` +
                   `Materials: **${towerStatus.lifetimeRewards.materials.toLocaleString()}** ⛏️`,
            inline: false
          },
          {
            name: '📈 Next Milestones',
            value: this.getTowerMilestones(towerStatus.currentFloor),
            inline: false
          }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-tower')
          .setLabel('← Back to Tower')
          .setStyle(ButtonStyle.Secondary)
      );

      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error in handleTowerStatus:', error);
      await interaction.reply({
        content: '❌ Failed to load tower statistics.',
        ephemeral: true
      });
    }
  }

  /**
   * Get tower milestones for display
   */,
};
