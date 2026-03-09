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
 * rpg-exploration-handlers — extracted from RPGCommand.js
 * 20 methods, ~1139 lines
 */
export const ExplorationHandlers = {
  async handlePartyMenu(interaction, player) {
    this.trackMenuNavigation(player, 'party');

    const party = player.party || { members: [] };
    const activeIndex = party.activeIndex ?? 0;
    const memberLines = (party.members || []).map((member, index) => {
      const activeTag = index === activeIndex ? '⭐' : '•';
      const classLabel = member.classId ? ` (${member.classId})` : '';
      return `${activeTag} ${member.name || `Member ${index + 1}`}${classLabel}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('👥 Party')
      .setDescription(
        memberLines.length > 0
          ? memberLines.join('\n')
          : 'No party members yet.'
      );

    embed.addFields({
      name: 'Party Size',
      value: `${party.members?.length || 0}/${party.maxSize || 4}`,
      inline: true,
    });

    const actions = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-party-add')
        .setLabel('➕ Add Member')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-party-remove')
        .setLabel('➖ Remove Member')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-party-active')
        .setLabel('⭐ Set Active')
        .setStyle(ButtonStyle.Secondary)
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
      components: [actions, buttons],
    });
  }

  /**
   * Show modal to add a party member
   */,

  async handlePartyAdd(interaction, player) {
    const party = player.party || { maxSize: 4, members: [] };
    if ((party.members?.length || 0) >= (party.maxSize || 4)) {
      await interaction.reply({ content: 'Party is full (max 4).', ephemeral: true });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('rpg-party-add-modal')
      .setTitle('Add Party Member');

    const nameInput = new TextInputBuilder()
      .setCustomId('member-name')
      .setLabel('Member Name')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., Aria the Scout')
      .setRequired(true)
      .setMaxLength(40);

    const classInput = new TextInputBuilder()
      .setCustomId('member-class')
      .setLabel('Class (optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('warrior / mage / rogue / paladin')
      .setRequired(false)
      .setMaxLength(20);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(classInput)
    );

    await interaction.showModal(modal);
  }

  /**
   * Show remove member selector
   */,

  async handlePartyRemoveMenu(interaction, player) {
    const party = player.party || { members: [] };
    const removable = (party.members || []).filter((_, index) => index > 0);

    if (removable.length === 0) {
      await interaction.reply({ content: 'No removable party members.', ephemeral: true });
      return;
    }

    const options = removable.map((member, index) => {
      const actualIndex = index + 1;
      return {
        label: member.name || `Member ${actualIndex + 1}`,
        value: String(actualIndex),
        description: member.classId ? `Class: ${member.classId}` : 'No class',
      };
    });

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-party-remove-select')
        .setPlaceholder('Select a member to remove')
        .addOptions(options)
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-party-menu')
        .setLabel('← Back to Party')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [new EmbedBuilder().setColor(0xe67e22).setTitle('➖ Remove Party Member')],
      components: [selectRow, backRow],
    });
  }

  /**
   * Show set active member selector
   */,

  async handlePartyActiveMenu(interaction, player) {
    const party = player.party || { members: [] };
    const options = (party.members || []).map((member, index) => {
      const isActive = index === (party.activeIndex ?? 0);
      return {
        label: member.name || `Member ${index + 1}`,
        value: String(index),
        description: isActive ? 'Active' : (member.classId ? `Class: ${member.classId}` : 'No class'),
      };
    });

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-party-active-select')
        .setPlaceholder('Select active member')
        .addOptions(options)
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-party-menu')
        .setLabel('← Back to Party')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [new EmbedBuilder().setColor(0x3498db).setTitle('⭐ Set Active Member')],
      components: [selectRow, backRow],
    });
  }

  /**
   * Remove selected party member
   */,

  async handlePartyRemoveSelect(interaction, player, index) {
    const party = player.party || { members: [] };
    if (!party.members || index <= 0 || index >= party.members.length) {
      await interaction.reply({ content: 'Invalid party member.', ephemeral: true });
      return;
    }

    party.members.splice(index, 1);
    if (party.activeIndex >= party.members.length) {
      party.activeIndex = Math.max(0, party.members.length - 1);
    }

    player.party = party;
    this.persistPlayer(player);
    await this.handlePartyMenu(interaction, player);
  }

  /**
   * Set active party member
   */,

  async handlePartyActiveSelect(interaction, player, index) {
    const party = player.party || { members: [] };
    if (!party.members || index < 0 || index >= party.members.length) {
      await interaction.reply({ content: 'Invalid party member.', ephemeral: true });
      return;
    }

    party.activeIndex = index;
    player.party = party;
    this.persistPlayer(player);
    await this.handlePartyMenu(interaction, player);
  }

  /**
   * Handle progress menu
   */,

  async handleArena(interaction, player) {
    this.trackMenuNavigation(player, 'arena');
    
    if (player.level < 5) {
      await interaction.reply({
        content: '🔒 **Arena Locked**\nReach level 5 to unlock Arena mode!',
        ephemeral: true,
      });
      return;
    }
    
    if (this.combatSystem.isInCombat(player.userId)) {
      await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
      return;
    }

    // Show choice: Fight Bot vs Challenge Player vs Arena Shop
    const embed = new EmbedBuilder()
      .setColor(0xff6b6b)
      .setTitle('⚔️ Arena Mode')
      .setDescription(
        '**Choose your path:**\n\n' +
        `**Your Arena Points:** ${player.arenaPoints || 0} AP\n` +
        `**Rank:** ${this.getArenaRank(player.arenaPoints || 0)}`
      )
      .addFields(
        {
          name: '🤖 Fight Bot',
          value: '+10 Arena Points for victory',
          inline: false,
        },
        {
          name: '👥 Challenge Player',
          value: '+50 Arena Points for victory\nFight against player snapshots',
          inline: false,
        },
        {
          name: '🏪 Arena Shop',
          value: 'Spend Arena Points on potions and rare materials',
          inline: false,
        }
      );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-arena-bot')
        .setLabel('🤖 Fight Bot')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-arena-player')
        .setLabel('👥 Challenge Player')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-arena-shop')
        .setLabel('🏪 Arena Shop')
        .setStyle(ButtonStyle.Secondary)
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons, backRow],
    });
  }

  /**
   * Get arena rank based on points
   */,

  async handleArenaBotFight(interaction, player) {
    if (this.combatSystem.isInCombat(player.userId)) {
      await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
      return;
    }

    const enemyNames = ['Arena Challenger', 'Wild Stalker', 'Savage Raider', 'Forest Spirit', 'Cave Brute'];
    const enemyName = enemyNames[Math.floor(Math.random() * enemyNames.length)];

    const combatState = this.combatSystem.startCombat(
      player,
      enemyName,
      Math.max(1, player.level + 1),
      { meta: { type: 'arena', opponent: 'bot' } }
    );

    this.persistPlayer(player);

    const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
    const buttons = this.createCombatButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  },

  async handleArenaPlayerFight(interaction, player) {
    if (this.combatSystem.isInCombat(player.userId)) {
      await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
      return;
    }

    // Get snapshots of all other players
    await this.updateArenaSnapshots(player);

    // Get arena snapshots (excluding current player)
    const allSnapshots = (player.arenaSnapshots || []).filter(s => s.userId !== player.userId);

    if (allSnapshots.length === 0) {
      await interaction.reply({
        content: '❌ No opponents available yet. Arena snapshots are generated as players progress!',
        ephemeral: true,
      });
      return;
    }

    // Group opponents by level ranges relative to player
    const playerLevel = player.level;
    const levelRanges = [
      { label: '⚖️ Exact Level', min: playerLevel, max: playerLevel },
      { label: '📊 Close Range (±3)', min: playerLevel - 3, max: playerLevel + 3 },
      { label: '🎯 Medium Range (±7)', min: playerLevel - 7, max: playerLevel + 7 },
      { label: '🌐 Wide Range (±15)', min: playerLevel - 15, max: playerLevel + 15 },
      { label: '🔓 Any Level', min: 1, max: 999 },
    ];

    let selectedOpponents = [];
    let selectedRange = null;

    // Find first range with available opponents
    for (const range of levelRanges) {
      const inRange = allSnapshots.filter(
        s => s.level >= Math.max(1, range.min) && s.level <= range.max
      );
      if (inRange.length > 0) {
        selectedOpponents = inRange;
        selectedRange = range;
        break;
      }
    }

    if (selectedOpponents.length === 0) {
      await interaction.reply({
        content: '❌ No opponents available.',
        ephemeral: true,
      });
      return;
    }

    // Sort by level difference (closest first)
    selectedOpponents.sort((a, b) => {
      const diffA = Math.abs(a.level - playerLevel);
      const diffB = Math.abs(b.level - playerLevel);
      return diffA - diffB;
    });

    // Limit to top 25 for select menu
    const displayOpponents = selectedOpponents.slice(0, 25);

    const embed = new EmbedBuilder()
      .setColor(0xff6b6b)
      .setTitle('👥 Arena Matchmaking')
      .setDescription(
        `**Your Level:** ${playerLevel}\n` +
        `**Matchmaking Range:** ${selectedRange.label}\n` +
        `**Opponents Found:** ${selectedOpponents.length}\n\n` +
        `Select an opponent to challenge. Closer level = Fair fight!`
      );

    // Add top opponents preview
    const topOpponents = displayOpponents.slice(0, 10).map(s => {
      const levelDiff = s.level - playerLevel;
      const diffText = levelDiff > 0 ? `+${levelDiff}` : levelDiff < 0 ? `${levelDiff}` : '=';
      return `• **${s.username}** (Lvl ${s.level}) [${diffText}] - ${s.classId || 'adventurer'}`;
    }).join('\n');

    embed.addFields({
      name: 'Available Opponents',
      value: topOpponents + (displayOpponents.length > 10 ? `\n...and ${displayOpponents.length - 10} more` : ''),
      inline: false,
    });

    // Create select menu
    const selectOptions = displayOpponents.map(s => {
      const levelDiff = s.level - playerLevel;
      const diffText = levelDiff > 0 ? `+${levelDiff}` : levelDiff < 0 ? `${levelDiff}` : '=';
      return {
        label: `${s.username} (Lvl ${s.level})`.substring(0, 100),
        value: s.userId,
        description: `Level ${diffText} | ${s.classId || 'adventurer'} | HP: ${s.maxHp}`.substring(0, 100),
        emoji: this.getClassEmoji(s.classId),
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-arena-opponent-select')
      .setPlaceholder('Choose your opponent...')
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-arena')
        .setLabel('← Back to Arena')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  }

  /**
   * Get class emoji for display
   */,

  async updateArenaSnapshots(player) {
    const allPlayers = this.playerManager.getAllPlayers();
    const snapshots = [];

    for (const p of allPlayers) {
      if (p.userId === player.userId) continue; // Don't snapshot self

      const opponentClass = p.class || p.internalClass || 'adventurer';
      let opponentTypes = ['physical'];
      if (opponentClass === 'mage') opponentTypes = ['arcane'];
      if (opponentClass === 'rogue') opponentTypes = ['shadow'];
      if (opponentClass === 'ranger') opponentTypes = ['physical', 'nature'];
      if (opponentClass === 'paladin') opponentTypes = ['holy'];

      snapshots.push({
        userId: p.userId,
        username: p.username,
        level: p.level || 1,
        classId: opponentClass,
        maxHp: p.maxHp || 100,
        strength: p.strength || 10,
        defense: p.defense || 10,
        intelligence: p.intelligence || 10,
        agility: p.agility || 10,
        skills: [...(p.skills || [])],
        types: opponentTypes,
        lastUpdated: Date.now(),
      });
    }

    // Save snapshots to player's data
    player.arenaSnapshots = snapshots;
    this.persistPlayer(player);
  }

  /**
   * Start arena fight with selected opponent
   */,

  async handleArenaFightStart(interaction, player, opponentId) {
    if (this.combatSystem.isInCombat(player.userId)) {
      await interaction.reply({ content: 'You are already in combat!', ephemeral: true });
      return;
    }

    // Find opponent snapshot
    const opponentSnapshot = (player.arenaSnapshots || []).find(s => s.userId === opponentId);
    if (!opponentSnapshot) {
      await interaction.reply({
        content: '❌ Opponent snapshot not found. Try refreshing the arena.',
        ephemeral: true,
      });
      return;
    }

    // Start combat with snapshot stats
    const combatState = this.combatSystem.startCombatWithCustomEnemy(
      player,
      opponentSnapshot.username,
      opponentSnapshot.level,
      opponentSnapshot.maxHp,
      {
        strength: opponentSnapshot.strength,
        defense: opponentSnapshot.defense,
        intelligence: opponentSnapshot.intelligence,
        agility: opponentSnapshot.agility,
        types: opponentSnapshot.types,
      },
      opponentSnapshot.skills,
      { type: 'arena', opponent: 'player', opponentId: opponentSnapshot.userId, opponentSnapshot }
    );

    this.persistPlayer(player);

    const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
    const levelDiff = opponentSnapshot.level - player.level;
    const diffText = levelDiff > 0 ? `+${levelDiff}` : levelDiff < 0 ? `${levelDiff}` : '=';
    
    embed.addFields({
      name: '👥 Arena PvP Battle',
      value: `Facing: **${opponentSnapshot.username}** (Level ${opponentSnapshot.level} [${diffText}])\n` +
             `Class: ${opponentSnapshot.classId || 'adventurer'}\n` +
             `Reward: **+50 Arena Points** on victory`,
      inline: false,
    });
    
    const buttons = this.createCombatButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Handle Arena Shop
   */,

  async handleArenaShop(interaction, player) {
    this.trackMenuNavigation(player, 'arena-shop');
    
    const arenaPoints = player.arenaPoints || 0;

    const shopItems = [
      // Potions
      { id: 'health_potion_t3', name: 'Rare Health Potion', cost: 500, type: 'potion', emoji: '❤️' },
      { id: 'xp_potion_t3', name: 'Rare XP Potion', cost: 1000, type: 'potion', emoji: '⭐' },
      { id: 'gold_potion_t3', name: 'Rare Gold Potion', cost: 750, type: 'potion', emoji: '💰' },
      { id: 'loot_potion_t3', name: 'Rare Loot Potion', cost: 1000, type: 'potion', emoji: '🎁' },
      { id: 'health_potion_t4', name: 'Epic Health Potion', cost: 1500, type: 'potion', emoji: '❤️' },
      { id: 'xp_potion_t4', name: 'Epic XP Potion', cost: 2500, type: 'potion', emoji: '⭐' },
      
      // Rare Materials
      { id: 'mithril_ore', name: 'Mithril Ore', cost: 1000, type: 'material', emoji: '⛏️', quantity: 5 },
      { id: 'adamantite', name: 'Adamantite', cost: 2000, type: 'material', emoji: '💎', quantity: 3 },
      { id: 'arcane_essence', name: 'Arcane Essence', cost: 1500, type: 'material', emoji: '✨', quantity: 3 },
      { id: 'dragonhide', name: 'Dragonhide', cost: 2500, type: 'material', emoji: '🐉', quantity: 2 },
      { id: 'moonflower', name: 'Moonflower', cost: 1000, type: 'material', emoji: '🌙', quantity: 3 },
      { id: 'rare_flower', name: 'Rare Flower', cost: 500, type: 'material', emoji: '🌸', quantity: 5 },
    ];

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('🏪 Arena Shop')
      .setDescription(
        `**Your Arena Points:** ${arenaPoints} AP\n` +
        `**Your Rank:** ${this.getArenaRank(arenaPoints)}\n\n` +
        `Spend your hard-earned Arena Points on premium items!`
      );

    // Group items by type
    const potions = shopItems.filter(i => i.type === 'potion');
    const materials = shopItems.filter(i => i.type === 'material');

    const potionsList = potions.map(item => {
      const canBuy = arenaPoints >= item.cost;
      const status = canBuy ? '✅' : '❌';
      return `${status} ${item.emoji} **${item.name}** - ${item.cost} AP`;
    }).join('\n');

    const materialsList = materials.map(item => {
      const canBuy = arenaPoints >= item.cost;
      const status = canBuy ? '✅' : '❌';
      const qty = item.quantity ? ` x${item.quantity}` : '';
      return `${status} ${item.emoji} **${item.name}${qty}** - ${item.cost} AP`;
    }).join('\n');

    embed.addFields(
      { name: '🧪 Premium Potions', value: potionsList, inline: false },
      { name: '⚒️ Rare Materials', value: materialsList, inline: false }
    );

    // Create purchase buttons (limited to 5 per row, max 25 items in select menu)
    const selectOptions = shopItems.slice(0, 25).map(item => {
      const canBuy = arenaPoints >= item.cost;
      const qty = item.quantity ? ` x${item.quantity}` : '';
      return {
        label: `${item.name}${qty}`.substring(0, 100),
        value: item.id,
        description: `${item.cost} AP ${canBuy ? '' : '(Not enough AP)'}`.substring(0, 100),
        emoji: item.emoji,
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-arena-shop-buy')
      .setPlaceholder('Select an item to purchase...')
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-arena')
        .setLabel('← Back to Arena')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-hub')
        .setLabel('🏠 Hub')
        .setStyle(ButtonStyle.Primary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  }

  /**
   * Handle Arena Shop Purchase
   */,

  async handleArenaShopPurchase(interaction, player, itemId) {
    const arenaPoints = player.arenaPoints || 0;

    // Define shop items (same as in handleArenaShop)
    const shopItems = [
      { id: 'health_potion_t3', name: 'Rare Health Potion', cost: 500, type: 'consumable', emoji: '❤️' },
      { id: 'xp_potion_t3', name: 'Rare XP Potion', cost: 1000, type: 'consumable', emoji: '⭐' },
      { id: 'gold_potion_t3', name: 'Rare Gold Potion', cost: 750, type: 'consumable', emoji: '💰' },
      { id: 'loot_potion_t3', name: 'Rare Loot Potion', cost: 1000, type: 'consumable', emoji: '🎁' },
      { id: 'health_potion_t4', name: 'Epic Health Potion', cost: 1500, type: 'consumable', emoji: '❤️' },
      { id: 'xp_potion_t4', name: 'Epic XP Potion', cost: 2500, type: 'consumable', emoji: '⭐' },
      { id: 'mithril_ore', name: 'Mithril Ore', cost: 1000, type: 'material', emoji: '⛏️', quantity: 5 },
      { id: 'adamantite', name: 'Adamantite', cost: 2000, type: 'material', emoji: '💎', quantity: 3 },
      { id: 'arcane_essence', name: 'Arcane Essence', cost: 1500, type: 'material', emoji: '✨', quantity: 3 },
      { id: 'dragonhide', name: 'Dragonhide', cost: 2500, type: 'material', emoji: '🐉', quantity: 2 },
      { id: 'moonflower', name: 'Moonflower', cost: 1000, type: 'material', emoji: '🌙', quantity: 3 },
      { id: 'rare_flower', name: 'Rare Flower', cost: 500, type: 'material', emoji: '🌸', quantity: 5 },
    ];

    const item = shopItems.find(i => i.id === itemId);
    if (!item) {
      await interaction.reply({
        content: '❌ Invalid item selection.',
        ephemeral: true,
      });
      return;
    }

    // Check if player has enough arena points
    if (arenaPoints < item.cost) {
      await interaction.reply({
        content: `❌ Not enough Arena Points! You have ${arenaPoints} AP but need ${item.cost} AP.`,
        ephemeral: true,
      });
      return;
    }

    // Deduct arena points
    player.arenaPoints -= item.cost;

    // Add item to inventory
    const quantity = item.quantity || 1;
    const inventoryItem = {
      id: item.id,
      name: item.name,
      type: item.type,
      quantity: quantity,
      rarity: item.id.includes('t4') ? 'epic' : item.id.includes('t3') ? 'rare' : 'uncommon',
    };

    // Check if item already exists in inventory to stack
    const existingItem = player.inventory.find(i => i && i.id === item.id);
    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + quantity;
    } else {
      player.inventory.push(inventoryItem);
    }

    this.persistPlayer(player);

    // Show success message
    const qtyText = quantity > 1 ? ` x${quantity}` : '';
    await interaction.reply({
      content: `✅ **Purchase Successful!**\n\n` +
               `${item.emoji} Bought: **${item.name}${qtyText}**\n` +
               `💰 Cost: ${item.cost} AP\n` +
               `💳 Remaining: ${player.arenaPoints} AP`,
      ephemeral: false,
    });

    // Return to shop after 3 seconds
    setTimeout(async () => {
      try {
        await this.handleArenaShop(interaction, player);
      } catch (e) {
        // Ignore if interaction expired
      }
    }, 3000);
  }

  /**
   * Load market data from file
   */,

  async handleRaids(interaction, player) {
    if (player.level < 20) {
      await interaction.reply({
        content: '🔒 **Raids Locked**\nReach level 20 to unlock Raids!',
        ephemeral: true,
      });
      return;
    }
    
    this.trackMenuNavigation(player, 'raids');
    const raids = getAvailableRaids(player.level, player.currentWorld);
    const embed = UIBuilder.createRaidsEmbed(player.level, player.currentWorld);

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    if (raids.length === 0) {
      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [backButton],
      });
      return;
    }

    const validRaids = raids.filter(r => r && r.id && r.name);
    
    if (validRaids.length === 0) {
      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [backButton],
      });
      return;
    }

    const options = validRaids.map(r => {
      const floors = r.floors || 1;
      const floorText = floors > 1 ? ` • ${floors} Floors` : '';
      const bossCount = r.bosses?.length || 0;
      const label = `${r.name} (Lvl ${r.minLevel}${floorText})`.substring(0, 100);
      return {
        label: label,
        value: r.id.substring(0, 100),
        description: `${bossCount} Bosses${floorText}`.substring(0, 100),
      };
    });

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-select-raid')
        .setPlaceholder('Select a raid to challenge')
        .addOptions(options)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectMenu, backButton],
    });
  }

  /**
   * Handle world boss challenge
   */,

  async handleWorldBoss(interaction, player) {
    if (this.combatSystem.isInCombat(player.userId)) {
      await interaction.reply({
        content: 'You are already in combat!',
        ephemeral: true,
      });
      return;
    }

    // Get the current world from content system, fall back to local world data
    const contentWorld = getWorldFromContent(player.currentWorld);
    const fallbackWorld = getWorld(player.currentWorld);
    const worldId = contentWorld?.id ?? fallbackWorld?.id ?? player.currentWorld;

    // Get the boss details (content system first, then fallback)
    let boss = null;
    if (contentWorld?.worldBoss) {
      const allBosses = getAllBosses();
      boss = allBosses.find(b => b.id === contentWorld.worldBoss) || null;
    }

    if (!boss) {
      const fallbackBoss = getWorldBoss(player.currentWorld);
      if (fallbackBoss) {
        boss = {
          id: `world_boss_${worldId}`,
          name: fallbackBoss.name,
          level: fallbackBoss.level,
          hp: fallbackBoss.hp,
          xpReward: fallbackBoss.xpReward,
          loot: fallbackBoss.loot,
        };
      }
    }

    if (!boss) {
      await interaction.reply({
        content: 'No world boss available in this world!',
        ephemeral: true,
      });
      return;
    }

    // Check if already defeated
    const defeatedWorlds = (player.worldBossesDefeated || []).map(String);
    if (defeatedWorlds.includes(String(worldId))) {
      await interaction.reply({
        content: `You already defeated the world boss for ${contentWorld?.name || fallbackWorld?.name || 'this world'}.`,
        ephemeral: true,
      });
      return;
    }

    const combatState = this.combatSystem.startCombat(
      player,
      boss.name,
      boss.level,
      { meta: { type: 'worldBoss', worldId: worldId } }
    );

    this.persistPlayer(player);

    const embed = UIBuilder.createCombatStartEmbed(player, combatState.enemy, combatState.worldState);
    const buttons = this.createCombatButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Retroactively unlock worlds based on boss defeats
   * This grants unlocks to players who defeated bosses before the unlock bug was fixed
   */,

  async handleWorldTravel(interaction, player) {
    // Retroactively unlock worlds for players who defeated bosses before the bug was fixed
    this.retroactivelyUnlockWorlds(player);

    const allWorlds = getAllWorlds();
    
    if (!allWorlds || allWorlds.length === 0) {
      await interaction.reply({
        content: 'No worlds available yet!',
        ephemeral: true,
      });
      return;
    }

    // Sort worlds by tier
    const sortedWorlds = allWorlds.sort((a, b) => (a.tier || 1) - (b.tier || 1));
    
    const unlockedWorldIds = (player.worldsUnlocked || []).map(String);
    const defeatedWorldIds = (player.worldBossesDefeated || []).map(String);
    const currentWorldId = String(player.currentWorld);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🌍 World Travel')
      .setDescription('Select a world to travel to. Defeat the world boss to unlock the next world!');

    sortedWorlds.forEach((world, index) => {
      const worldKey = String(world.id);
      const isUnlocked = unlockedWorldIds.includes(worldKey);
      const isDefeated = defeatedWorldIds.includes(worldKey);
      const isCurrent = currentWorldId === worldKey;

      const minLevel = world.minLevel || 1;
      const maxLevel = world.maxLevel || '∞';
      const levelRange = `Levels ${minLevel} - ${maxLevel}`;
      
      let status = '';
      if (isCurrent) {
        status = '📍 Current Location';
      } else if (isDefeated) {
        status = '✅ Boss Defeated';
      } else if (isUnlocked) {
        status = '🔓 Unlocked';
      } else {
        // Show the previous world's boss that needs to be defeated
        const prevWorld = index > 0 ? sortedWorlds[index - 1] : null;
        if (prevWorld) {
          // Get boss name from content system
          const allBosses = getAllBosses();
          const prevWorldData = getWorldFromContent(prevWorld.id);
          const bossName = prevWorldData?.worldBoss 
            ? allBosses.find(b => b.id === prevWorldData.worldBoss)?.name || 'World Boss'
            : 'World Boss';
          status = `🔒 Defeat ${bossName} in ${prevWorld.name} to unlock`;
        } else {
          status = '🔒 Locked';
        }
      }

      embed.addFields({
        name: `${world.name || `World ${index + 1}`}${isCurrent ? ' ⬅️' : ''}`,
        value: `Tier ${world.tier || 1} • ${levelRange}\n${status}`,
        inline: false,
      });
    });

    // Create buttons for unlocked worlds
    const buttons = [];
    const unlockedWorlds = sortedWorlds.filter(w => unlockedWorldIds.includes(String(w.id)));
    
    for (let i = 0; i < Math.min(unlockedWorlds.length, 25); i += 5) {
      const row = new ActionRowBuilder();
      const slice = unlockedWorlds.slice(i, i + 5);
      
      slice.forEach(world => {
        const isCurrent = currentWorldId === String(world.id);
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-travel-${world.id}`)
            .setLabel(world.name || 'World')
            .setStyle(isCurrent ? ButtonStyle.Success : ButtonStyle.Primary)
            .setDisabled(isCurrent)
        );
      });
      
      buttons.push(row);
    }

    // Add back button
    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back-to-hub')
        .setLabel('🏠 Back to Hub')
        .setStyle(ButtonStyle.Secondary)
    );
    buttons.push(backRow);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Handle traveling to a specific world
   */,

  async handleTravelToWorld(interaction, player, worldId) {
    const normalizedWorldId = String(worldId);
    const unlockedWorldIds = (player.worldsUnlocked || []).map(String);

    // Check if world is unlocked
    if (!unlockedWorldIds.includes(normalizedWorldId)) {
      await interaction.reply({
        content: 'This world is not unlocked yet! Defeat the previous world boss first.',
        ephemeral: true,
      });
      return;
    }

    // Update player's current world
    player.currentWorld = normalizedWorldId;
    this.persistPlayer(player);

    const world = getWorldFromContent(normalizedWorldId);
    const worldName = world?.name || 'Unknown World';

    await interaction.reply({
      content: `✈️ You have traveled to **${worldName}**!`,
      ephemeral: true,
    });

    // Show the main menu
    await this.handleCommand(interaction);
  }

  /**
   * Handle Adventurers Guild menu
   */,

  async handleLayeredRaid(interaction, player, raid) {
    if (!raid || !raid.layers || raid.layers.length === 0) {
      await interaction.reply({
        content: 'This raid does not have layer support yet.',
        ephemeral: true,
      });
      return;
    }

    // Create an embed showing available layers
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`⛰️ ${raid.name} - Select Layer`)
      .setDescription('Choose which layer to raid. Higher layers have better rewards!');

    // Add layer options as fields with rarity colors
    raid.layers.forEach((layer, idx) => {
      const rarityColors = {
        'common': '⚪',
        'uncommon': '🟢',
        'rare': '🔵',
        'epic': '🟣',
        'legendary': '🟠'
      };
      const pkg = layer.rewardPackages?.[0];
      const color = rarityColors[pkg?.rarity] || '⚪';
      
      embed.addFields({
        name: `${color} ${layer.name}`,
        value: `Level ${layer.level} • XP: ${pkg?.xp || 0} • Gold: ${pkg?.gold || 0}`,
        inline: false
      });
    });

    // Create buttons for each layer
    const buttons = new ActionRowBuilder();
    raid.layers.slice(0, 5).forEach((layer, idx) => {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`raid-layer-${raid.id}-${idx}`)
          .setLabel(`Layer ${idx + 1}`)
          .setStyle(ButtonStyle.Primary)
      );
    });

    buttons.addComponents(
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
   * Handle team package selection for raids
   * If one player gets legendary, all team members can get it
   */,

  async handleRaidPackageSelection(interaction, player, raid, layerIndex) {
    const layer = raid.layers?.[layerIndex];
    if (!layer || !layer.rewardPackages) {
      await interaction.reply({
        content: 'Layer not found.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`${layer.name} - Reward Package Selection`)
      .setDescription('Select your reward package. If anyone in your team gets Legendary, everyone can take it!');

    // Show available packages with drop chances
    layer.rewardPackages.forEach((pkg, idx) => {
      const itemCount = (pkg.items?.length || 0) + (pkg.materials?.length || 0);
      embed.addFields({
        name: `${pkg.rarity.toUpperCase()} - ${pkg.name}`,
        value: `Drop Chance: ${pkg.dropChance}% • Items: ${itemCount} • XP: ${pkg.xp} • Gold: ${pkg.gold}`,
        inline: false
      });
    });

    // Create package selection buttons
    const buttons = new ActionRowBuilder();
    layer.rewardPackages.slice(0, 5).forEach((pkg, idx) => {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`raid-pkg-${raid.id}-${layerIndex}-${idx}`)
          .setLabel(pkg.rarity.toUpperCase())
          .setStyle(pkg.rarity === 'legendary' ? ButtonStyle.Success : ButtonStyle.Primary)
      );
    });

    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  },

  async handleAdventure(interaction, player) {
    this.trackMenuNavigation(player, 'adventure');
    const now = Date.now();
    const timeSinceLastAdventure = now - player.lastAdventureTime;
    const cooldownMs = player.adventureCooldown;

    if (timeSinceLastAdventure < cooldownMs) {
      const remainingMs = cooldownMs - timeSinceLastAdventure;
      const minutesRemaining = Math.ceil(remainingMs / 60000);
      const embed = UIBuilder.createAdventureUnavailableEmbed(minutesRemaining);
      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );
      await this.updateInteractionWithTracking(interaction, {
        embeds: [embed],
        components: [backButton],
      });
      return;
    }

    // Run adventure - grant XP based on current level
    const balance = loadBalanceData();
    const baseXp = 50;
    const xpMult = Number(balance.adventureXpMultiplier) || 1;
    const xpGained = Math.floor(baseXp * (1 + player.level * 0.5) * xpMult);
    player.addXp(xpGained);
    player.lastAdventureTime = now;
    player.clearStatsCache(); // Clear cache after stats change

    const materialsFound = this.generateAdventureMaterials(player);
  this.persistPlayer(player);
    const embed = UIBuilder.createAdventureCompletedEmbed(player, xpGained, materialsFound);
    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backButton],
    });
  },
};
