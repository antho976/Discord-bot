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
 * rpg-economy-handlers — extracted from RPGCommand.js
 * 16 methods, ~1087 lines
 */
export const EconomyHandlers = {
  async handleEconomyMenu(interaction, player) {
    this.trackMenuNavigation(player, 'economy');
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('💰 Economy Hub')
      .setDescription('Manage crafting, inventory, professions, and shopping.');

    const buttons = this.createEconomyMenuButtons();

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: buttons,
    });
  }

  /**
   * Handle gambling menu
   */,

  async handleGambling(interaction, player) {
    this.trackMenuNavigation(player, 'gambling');
    const playerGold = player.gold || 0;
    
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🎰 Gambling Hall')
      .setDescription(
        `**Try your luck and win big!** ⚡\n\n` +
        `Your Gold: **${playerGold}**\n\n` +
        `**Games Available:**\n` +
        `🎰 **Slots** - Spin the reels, match symbols to win!\n` +
        `🪙 **Coinflip** - Choose heads or tails, double your money!\n\n` +
        `⚠️ *House Edge: 5% per bet*`
      );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-slots')
        .setLabel('🎰 Play Slots')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-coinflip')
        .setLabel('🪙 Play Coinflip')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-economy-menu')
        .setLabel('← Back to Economy')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Show slots betting menu
   */,

  async handleSlots(interaction, player) {
    const playerGold = player.gold || 0;
    
    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🎰 Slot Machine')
      .setDescription(
        `**Choose your bet amount!**\n\n` +
        `Available Gold: **${playerGold}**\n\n` +
        `💡 **Regular Bets:**\n` +
        `🍒🍒🍒 - Triple Match = 5x Payout\n` +
        `🍒🍒 or 🎰🎰 etc - Double Match = 2x Payout\n\n` +
        `💎 **All-In (100% of gold):**\n` +
        `🍒🍒🍒 - Triple Match = 10x Payout\n` +
        `🍒🍒 or 🎰🎰 etc - Double Match = 4x Payout\n\n` +
        `Select a bet amount below:`
      );

    const betAmounts = [100, 500, 1000, 5000];
    const buttons = new ActionRowBuilder();

    for (const amount of betAmounts) {
      const canAfford = playerGold >= amount;
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-slots-bet-${amount}`)
          .setLabel(`💰 ${amount}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!canAfford)
      );
    }

    const customButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-slots-custom')
        .setLabel('💵 Custom Amount')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-slots-allin')
        .setLabel('💎 All-In (100%)')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(playerGold === 0)
    );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-gambling')
        .setLabel('← Back to Gambling')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons, customButton, backButton],
    });
  }

  /**
   * Play slots game
   */,

  async playSlots(interaction, player, betAmount, isAllIn = false) {
    const playerGold = player.gold || 0;

    if (playerGold < betAmount) {
      await interaction.reply({
        content: `❌ You don't have enough gold! Need ${betAmount}, have ${playerGold}.`,
        ephemeral: true,
      });
      return;
    }

    // Deduct bet and store last bet amount
    player.gold -= betAmount;
    this.trackGoldSpent(player, betAmount, 'gambling');
    player.lastSlotsBet = betAmount;

    // Slot symbols
    const symbols = ['🍒', '🍊', '🍋', '🎰', '💎'];
    
    // Final result
    const finalReels = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    // Show spinning animation
    const spinFrames = 8;
    const spinEmbed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🎰 Slots')
      .setDescription(`**Spinning${isAllIn ? ' (ALL-IN)' : ''}...**\n\n🎰 🎰 🎰\n\nBet: **${betAmount}** gold`);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [spinEmbed],
      components: [],
    });

    // Animate the spinning
    for (let i = 0; i < spinFrames; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const randomReels = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ];

      const animEmbed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🎰 Slots')
        .setDescription(`**Spinning${isAllIn ? ' (ALL-IN)' : ''}...**\n\n${randomReels.join(' ')}\n\nBet: **${betAmount}** gold`);

      await interaction.editReply({
        embeds: [animEmbed],
        components: [],
      });
    }

    // Wait a moment before showing result
    await new Promise(resolve => setTimeout(resolve, 300));

    // Calculate winnings (multipliers change based on all-in)
    let winAmount = 0;
    let resultMessage = `**Final Spin:** ${finalReels.join(' ')}\n\n`;
    const tripleMultiplier = isAllIn ? 10 : 5;
    const doubleMultiplier = isAllIn ? 4 : 2;

    // Check for triple match
    if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
      winAmount = Math.floor(betAmount * tripleMultiplier);
      resultMessage += `🎉 **TRIPLE MATCH!** 🎉\n`;
      if (isAllIn) {
        resultMessage += `🔥 **ALL-IN JACKPOT!** 🔥\n`;
      }
      resultMessage += `You won **${winAmount}** gold!`;
    }
    // Check for double match (any two positions match)
    else if (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2] || finalReels[0] === finalReels[2]) {
      winAmount = Math.floor(betAmount * doubleMultiplier);
      resultMessage += `✨ **Double Match!** ✨\n`;
      if (isAllIn) {
        resultMessage += `🔥 **ALL-IN BONUS!** 🔥\n`;
      }
      resultMessage += `You won **${winAmount}** gold!`;
    }
    // House edge - 5% lose
    else {
      const houseEdge = Math.floor(betAmount * 0.05);
      resultMessage += `❌ No match...\n`;
      resultMessage += `House took **${houseEdge}** gold (5% house edge).`;
      if (isAllIn) {
        resultMessage += `\n💔 **Lost your entire bankroll!**`;
      }
    }

    // Add winnings
    player.gold += winAmount;

    // Track gambling stats
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

    if (!player.gamblingStats) {
      player.gamblingStats = {
        totalBet: 0,
        totalWon: 0,
        totalLost: 0,
        slotsPlayed: 0,
        coinflipsPlayed: 0,
      };
    }

    player.gamblingStats.slotsPlayed += 1;
    player.gamblingStats.totalBet += betAmount;
    if (winAmount > 0) {
      player.gamblingStats.totalWon += winAmount;
      player.progressStats.goldEarned += winAmount;
    } else {
      player.gamblingStats.totalLost += betAmount;
    }

    this.persistPlayer(player);

    const embed = new EmbedBuilder()
      .setColor(winAmount > 0 ? 0x2ecc71 : 0xe74c3c)
      .setTitle('🎰 Slots Result')
      .setDescription(resultMessage)
      .addFields({
        name: '💰 Balance',
        value: `**${player.gold}** gold`,
        inline: false,
      });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-slots-play-again')
        .setLabel(`🎰 Play Again (${betAmount})`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-slots')
        .setLabel('💰 Change Bet')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-gambling')
        .setLabel('← Back to Gambling')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Show coinflip betting menu
   */,

  async handleCoinflip(interaction, player) {
    const playerGold = player.gold || 0;

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🪙 Coinflip')
      .setDescription(
        `**Choose heads or tails!**\n\n` +
        `Available Gold: **${playerGold}**\n\n` +
        `💡 **How to Win:**\n` +
        `Guess correctly: Win 2x your bet\n` +
        `Guess wrong: Lose your bet\n\n` +
        `Select your bet amount:`
      );

    const betAmounts = [100, 500, 1000, 5000];
    const betsRow = new ActionRowBuilder();

    for (const amount of betAmounts) {
      const canAfford = playerGold >= amount;
      betsRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-coinflip-choice-${amount}`)
          .setLabel(`💰 ${amount}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!canAfford)
      );
    }

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-gambling')
        .setLabel('← Back to Gambling')
        .setStyle(ButtonStyle.Secondary)
    );

    // Store the bet amount in player data for next interaction
    player.pendingCoinflipBet = null;

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [betsRow, backButton],
    });
  }

  /**
   * Handle coinflip choice (heads/tails)
   */,

  async handleCoinflipChoice(interaction, player, betAmount) {
    const playerGold = player.gold || 0;

    if (playerGold < betAmount) {
      await interaction.reply({
        content: `❌ You don't have enough gold! Need ${betAmount}, have ${playerGold}.`,
        ephemeral: true,
      });
      return;
    }

    // Store bet amount for the next click
    player.pendingCoinflipBet = betAmount;
    this.persistPlayer(player);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🪙 Choose Your Side')
      .setDescription(
        `**Bet Amount: ${betAmount} gold**\n\n` +
        `Pick heads or tails and test your luck!`
      );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rpg-coinflip-bet-${betAmount}-heads`)
        .setLabel('🪙 Heads')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`rpg-coinflip-bet-${betAmount}-tails`)
        .setLabel('🪙 Tails')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-gambling')
        .setLabel('← Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Play coinflip game
   */,

  async playCoinflip(interaction, player, betAmount, playerChoice) {
    const playerGold = player.gold || 0;

    if (playerGold < betAmount) {
      await interaction.reply({
        content: `❌ You don't have enough gold! Need ${betAmount}, have ${playerGold}.`,
        ephemeral: true,
      });
      return;
    }

    // Deduct bet
    player.gold -= betAmount;
    this.trackGoldSpent(player, betAmount, 'gambling');

    // Flip coin
    const flip = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = flip === playerChoice;

    let resultMessage = `**Coin lands on: ${flip === 'heads' ? '🪙 Heads' : '🪙 Tails'}**\n\n`;
    const houseEdgeAmount = Math.floor(betAmount * 0.05);

    let winAmount = 0;
    if (won) {
      winAmount = Math.floor(betAmount * 2) - houseEdgeAmount;
      resultMessage += `🎉 **You Won!** 🎉\n`;
      resultMessage += `Prize: **${winAmount}** gold (after 5% house edge)`;
    } else {
      resultMessage += `❌ You Lost...\n`;
      resultMessage += `Better luck next time!`;
    }

    // Add winnings
    player.gold += winAmount;

    // Track gambling stats
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

    if (!player.gamblingStats) {
      player.gamblingStats = {
        totalBet: 0,
        totalWon: 0,
        totalLost: 0,
        slotsPlayed: 0,
        coinflipsPlayed: 0,
      };
    }

    player.gamblingStats.coinflipsPlayed += 1;
    player.gamblingStats.totalBet += betAmount;
    if (won) {
      player.gamblingStats.totalWon += winAmount;
      player.progressStats.goldEarned += winAmount;
    } else {
      player.gamblingStats.totalLost += betAmount;
    }

    this.persistPlayer(player);

    const embed = new EmbedBuilder()
      .setColor(won ? 0x2ecc71 : 0xe74c3c)
      .setTitle('🪙 Coinflip Result')
      .setDescription(resultMessage)
      .addFields({
        name: '💰 Balance',
        value: `**${player.gold}** gold`,
        inline: false,
      });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-coinflip')
        .setLabel('🪙 Play Again')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-gambling')
        .setLabel('← Back to Gambling')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Handle party menu
   */,

  async handleMarket(interaction, player) {
    const marketData = this.loadMarketData();
    const activeListings = marketData.listings.filter(l => l.active !== false);
    const myListings = activeListings.filter(l => l.sellerId === player.userId);

    // Get guild rank tax reduction
    const guildRank = this.getGuildRank(player.guildXP || 0);
    const taxReduction = guildRank.buffs?.marketTaxReduction || 0;
    const taxRate = Math.max(0, 10 - taxReduction); // Base 10% tax

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🏪 Player Market')
      .setDescription(
        '**Welcome to the Player Market!**\n' +
        `Trade items with other players. Buy low, sell high!\n\n` +
        `**Market Info:**\n` +
        `• Active Listings: ${activeListings.length}\n` +
        `• Your Listings: ${myListings.length}\n` +
        `• Market Tax: ${taxRate}% (Guild Rank Bonus: -${taxReduction}%)\n` +
        `• Your Gold: ${player.gold || 0}g`
      )
      .addFields(
        { name: '📊 Browse Market', value: 'View and purchase items from other players', inline: false },
        { name: '💰 Sell Items', value: 'List your items for sale', inline: false },
        { name: '📋 My Listings', value: 'Manage your active listings', inline: false }
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-market-browse')
        .setLabel('📊 Browse Market')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-market-sell')
        .setLabel('💰 Sell Items')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('rpg-market-my-listings')
        .setLabel('📋 My Listings')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(myListings.length === 0)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-economy-menu')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row1, row2],
    });
  }

  /**
   * Handle Market Browse
   */,

  async handleMarketBrowse(interaction, player) {
    const marketData = this.loadMarketData();
    const activeListings = marketData.listings.filter(
      l => l.active !== false && l.sellerId !== player.userId
    );

    if (activeListings.length === 0) {
      await interaction.reply({
        content: '🏪 The market is currently empty. Check back later!',
        ephemeral: true,
      });
      return;
    }

    // Sort by newest first
    activeListings.sort((a, b) => b.listedAt - a.listedAt);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📊 Market Listings')
      .setDescription(
        `**${activeListings.length} items available**\n` +
        `Your Gold: ${player.gold || 0}g\n\n` +
        `Select an item to purchase:`
      );

    // Show top listings
    const displayListings = activeListings.slice(0, 10);
    const listingsList = displayListings.map(listing => {
      const canAfford = (player.gold || 0) >= listing.price;
      const affordIcon = canAfford ? '✅' : '❌';
      const qtyText = listing.quantity > 1 ? ` x${listing.quantity}` : '';
      return `${affordIcon} **${listing.itemName}${qtyText}** - ${listing.price}g (by ${listing.sellerName})`;
    }).join('\n');

    embed.addFields({
      name: 'Available Items',
      value: listingsList + (activeListings.length > 10 ? `\n...and ${activeListings.length - 10} more` : ''),
      inline: false,
    });

    // Create select menu
    const selectOptions = displayListings.slice(0, 25).map(listing => {
      const canAfford = (player.gold || 0) >= listing.price;
      const qtyText = listing.quantity > 1 ? ` x${listing.quantity}` : '';
      return {
        label: `${listing.itemName}${qtyText}`.substring(0, 100),
        value: listing.id,
        description: `${listing.price}g by ${listing.sellerName} ${canAfford ? '' : '(Not enough gold)'}`.substring(0, 100),
        emoji: this.getItemTypeEmoji(listing.itemType),
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-market-listing-select')
      .setPlaceholder('Select an item to purchase...')
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-market')
        .setLabel('← Back to Market')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  }

  /**
   * Get item type emoji
   */,

  async handleMarketPurchase(interaction, player, listingId) {
    const marketData = this.loadMarketData();
    const listing = marketData.listings.find(l => l.id === listingId && l.active !== false);

    if (!listing) {
      await interaction.reply({
        content: '❌ Listing not found or no longer available.',
        ephemeral: true,
      });
      return;
    }

    // Check if trying to buy own listing
    if (listing.sellerId === player.userId) {
      await interaction.reply({
        content: '❌ You cannot purchase your own listing!',
        ephemeral: true,
      });
      return;
    }

    // Check if player has enough gold
    if ((player.gold || 0) < listing.price) {
      await interaction.reply({
        content: `❌ Not enough gold! You have ${player.gold || 0}g but need ${listing.price}g.`,
        ephemeral: true,
      });
      return;
    }

    // Deduct gold from buyer
    player.gold -= listing.price;
    this.trackGoldSpent(player, listing.price, 'marketplace');

    // Add item to buyer's inventory
    const purchasedItem = {
      id: listing.itemId,
      name: listing.itemName,
      type: listing.itemType,
      quantity: listing.quantity,
      rarity: listing.rarity || 'common',
    };

    const existingItem = player.inventory.find(i => i && i.id === listing.itemId);
    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + listing.quantity;
    } else {
      player.inventory.push(purchasedItem);
    }

    // Calculate tax
    const guildRank = this.getGuildRank(player.guildXP || 0);
    const taxReduction = guildRank.buffs?.marketTaxReduction || 0;
    const taxRate = Math.max(0, 10 - taxReduction) / 100;
    const tax = Math.floor(listing.price * taxRate);
    const sellerReceives = listing.price - tax;

    // Give gold to seller (if they exist)
    const seller = this.playerManager.getPlayer(listing.sellerId);
    if (seller) {
      seller.gold = (seller.gold || 0) + sellerReceives;
      this.playerManager.savePlayer(seller);
    }

    // Mark listing as sold
    listing.active = false;
    listing.soldAt = Date.now();
    listing.buyerId = player.userId;
    listing.buyerName = player.username;

    this.saveMarketData(marketData);
    this.persistPlayer(player);

    // Track trade history for buyer
    if (!player.tradeHistory) player.tradeHistory = [];
    player.tradeHistory.push({ type: 'buy', item: listing.itemName, price: listing.price, partner: listing.sellerName || 'Unknown', timestamp: Date.now() });
    if (player.tradeHistory.length > 50) player.tradeHistory = player.tradeHistory.slice(-50);

    // Track trade history for seller
    if (seller) {
      if (!seller.tradeHistory) seller.tradeHistory = [];
      seller.tradeHistory.push({ type: 'sell', item: listing.itemName, price: sellerReceives, partner: player.username, timestamp: Date.now() });
      if (seller.tradeHistory.length > 50) seller.tradeHistory = seller.tradeHistory.slice(-50);
      this.playerManager.savePlayer(seller);
    }

    const qtyText = listing.quantity > 1 ? ` x${listing.quantity}` : '';
    await interaction.reply({
      content: `✅ **Purchase Successful!**\n\n` +
               `📦 Bought: **${listing.itemName}${qtyText}**\n` +
               `💰 Paid: ${listing.price}g\n` +
               `🏛️ Market Tax: ${tax}g (${taxRate * 100}%)\n` +
               `💳 Remaining: ${player.gold}g\n\n` +
               `Seller received ${sellerReceives}g`,
      ephemeral: false,
    });

    // Return to browse after 2 seconds
    setTimeout(async () => {
      try {
        await this.handleMarketBrowse(interaction, player);
      } catch (e) {
        // Ignore if interaction expired
      }
    }, 2000);
  }

  /**
   * Handle Market Sell Menu
   */,

  async handleMarketSellMenu(interaction, player) {
    // Get sellable items from inventory
    const sellableItems = player.inventory.filter(item => 
      item && typeof item === 'object' && 
      item.id && item.name &&
      !item.slot  // Exclude items currently in equipment slots
    );

    if (sellableItems.length === 0) {
      await interaction.reply({
        content: '❌ You have no items to sell. Gather materials or craft items first!',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('💰 Sell Items')
      .setDescription(
        'Choose an item from your inventory to list on the market.\n\n' +
        `**Your Sellable Items:** ${sellableItems.length}\n\n` +
        '_Materials, Consumables, Equipment, and Gems can all be sold!_'
      );

    // Show items
    const itemsList = sellableItems.slice(0, 15).map(item => {
      const qtyText = item.quantity > 1 ? ` x${item.quantity}` : '';
      const rarityText = item.rarity ? ` [${item.rarity}]` : '';
      return `• ${item.name}${qtyText}${rarityText}`;
    }).join('\n');

    embed.addFields({
      name: 'Available Items',
      value: itemsList + (sellableItems.length > 15 ? `\n...and ${sellableItems.length - 15} more` : ''),
      inline: false,
    });

    // Create select menu
    const selectOptions = sellableItems.slice(0, 25).map(item => {
      const qtyText = item.quantity > 1 ? ` x${item.quantity}` : '';
      const rarityText = item.rarity ? ` [${item.rarity}]` : '';
      return {
        label: `${item.name}${qtyText}`.substring(0, 100),
        value: item.id,
        description: `${item.type}${rarityText}`.substring(0, 100),
        emoji: this.getItemTypeEmoji(item.type),
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-market-item-select')
      .setPlaceholder('Select an item to sell...')
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-market')
        .setLabel('← Back to Market')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  }

  /**
   * Handle Market Item Details (before listing)
   */,

  async handleMarketItemDetails(interaction, player, itemId) {
    const item = player.inventory.find(i => i && i.id === itemId);
    
    if (!item) {
      await interaction.reply({
        content: '❌ Item not found in your inventory.',
        ephemeral: true,
      });
      return;
    }

    // Show modal for price input
    const modal = new ModalBuilder()
      .setCustomId(`rpg-market-list-${itemId}`)
      .setTitle(`List ${item.name}`);

    const priceInput = new TextInputBuilder()
      .setCustomId('item_price')
      .setLabel('Price (in gold)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 100')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(10);

    const quantityInput = new TextInputBuilder()
      .setCustomId('item_quantity')
      .setLabel(`Quantity (max: ${item.quantity || 1})`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('1')
      .setValue('1')
      .setRequired(false)
      .setMinLength(1)
      .setMaxLength(5);

    const priceRow = new ActionRowBuilder().addComponents(priceInput);
    const quantityRow = new ActionRowBuilder().addComponents(quantityInput);

    modal.addComponents(priceRow, quantityRow);

    await interaction.showModal(modal);
  }

  /**
   * Handle Market Create Listing
   */,

  async handleMarketCreateListing(interaction, player, itemId, price, quantity) {
    const item = player.inventory.find(i => i && i.id === itemId);
    
    if (!item) {
      await interaction.reply({
        content: '❌ Item not found in your inventory.',
        ephemeral: true,
      });
      return;
    }

    if (quantity > (item.quantity || 1)) {
      await interaction.reply({
        content: `❌ You only have ${item.quantity || 1} of this item.`,
        ephemeral: true,
      });
      return;
    }

    // Remove item from inventory
    if (quantity >= (item.quantity || 1)) {
      // Remove entire stack
      player.inventory = player.inventory.filter(i => i !== item);
    } else {
      // Reduce quantity
      item.quantity -= quantity;
    }

    // Create listing
    const marketData = this.loadMarketData();
    const listingId = `${Date.now()}_${player.userId}_${itemId}`;
    
    const newListing = {
      id: listingId,
      sellerId: player.userId,
      sellerName: player.username,
      itemId: item.id,
      itemName: item.name,
      itemType: item.type,
      quantity: quantity,
      price: price,
      rarity: item.rarity || 'common',
      listedAt: Date.now(),
      active: true,
    };

    marketData.listings.push(newListing);
    this.saveMarketData(marketData);
    this.persistPlayer(player);

    const qtyText = quantity > 1 ? ` x${quantity}` : '';
    await this.updateInteractionWithTracking(interaction, {
      content: `✅ **Listed on Market!**\n\n` +
               `📦 Item: **${item.name}${qtyText}**\n` +
               `💰 Price: ${price}g\n` +
               `🏪 Your listing is now visible to all players!`,
      embeds: [],
      components: [],
    });

    // Return to market after 2 seconds
    setTimeout(async () => {
      try {
        await this.handleMarket(interaction, player);
      } catch (e) {
        // Ignore if interaction expired
      }
    }, 2000);
  }

  /**
   * Handle Market My Listings
   */,

  async handleMarketMyListings(interaction, player) {
    const marketData = this.loadMarketData();
    const myListings = marketData.listings.filter(
      l => l.sellerId === player.userId && l.active !== false
    );

    if (myListings.length === 0) {
      await interaction.reply({
        content: '📋 You have no active listings.',
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('📋 My Listings')
      .setDescription(
        `You have **${myListings.length}** active listing(s).\n\n` +
        `Select a listing to cancel and reclaim your item:`
      );

    const listingsList = myListings.map(listing => {
      const qtyText = listing.quantity > 1 ? ` x${listing.quantity}` : '';
      const age = Math.floor((Date.now() - listing.listedAt) / 60000); // minutes
      return `• **${listing.itemName}${qtyText}** - ${listing.price}g (${age}m ago)`;
    }).join('\n');

    embed.addFields({
      name: 'Your Active Listings',
      value: listingsList,
      inline: false,
    });

    // Create select menu
    const selectOptions = myListings.slice(0, 25).map(listing => {
      const qtyText = listing.quantity > 1 ? ` x${listing.quantity}` : '';
      const age = Math.floor((Date.now() - listing.listedAt) / 60000);
      return {
        label: `${listing.itemName}${qtyText} - ${listing.price}g`.substring(0, 100),
        value: listing.id,
        description: `Listed ${age} minutes ago - Click to cancel`.substring(0, 100),
        emoji: this.getItemTypeEmoji(listing.itemType),
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-market-my-listing-select')
      .setPlaceholder('Select a listing to cancel...')
      .addOptions(selectOptions);

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-market')
        .setLabel('← Back to Market')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [selectRow, backRow],
    });
  }

  /**
   * Handle Market Cancel Listing
   */,

  async handleMarketCancelListing(interaction, player, listingId) {
    const marketData = this.loadMarketData();
    const listing = marketData.listings.find(l => l.id === listingId && l.active !== false);

    if (!listing) {
      await interaction.reply({
        content: '❌ Listing not found.',
        ephemeral: true,
      });
      return;
    }

    if (listing.sellerId !== player.userId) {
      await interaction.reply({
        content: '❌ You can only cancel your own listings!',
        ephemeral: true,
      });
      return;
    }

    // Return item to inventory
    const returnedItem = {
      id: listing.itemId,
      name: listing.itemName,
      type: listing.itemType,
      quantity: listing.quantity,
      rarity: listing.rarity || 'common',
    };

    const existingItem = player.inventory.find(i => i && i.id === listing.itemId);
    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + listing.quantity;
    } else {
      player.inventory.push(returnedItem);
    }

    // Mark listing as cancelled
    listing.active = false;
    listing.cancelledAt = Date.now();

    this.saveMarketData(marketData);
    this.persistPlayer(player);

    const qtyText = listing.quantity > 1 ? ` x${listing.quantity}` : '';
    await this.updateInteractionWithTracking(interaction, {
      content: `✅ **Listing Cancelled**\n\n` +
               `📦 Returned: **${listing.itemName}${qtyText}**\n` +
               `Item has been returned to your inventory.`,
      embeds: [],
      components: [],
    });

    // Return to my listings or market if no more listings
    setTimeout(async () => {
      try {
        const updatedListings = marketData.listings.filter(
          l => l.sellerId === player.userId && l.active !== false
        );
        if (updatedListings.length > 0) {
          await this.handleMarketMyListings(interaction, player);
        } else {
          await this.handleMarket(interaction, player);
        }
      } catch (e) {
        // Ignore if interaction expired
      }
    }, 2000);
  }

  /**
   * Quick battle mode
   */,

  async handleShop(interaction, player) {
    this.trackMenuNavigation(player, 'shop');
    const unlockedTiers = getUnlockedShopTiers(player);
    const getItemDisplayName = (itemId) => {
      const equipment = getEquipment(itemId);
      const item = getItemByIdDynamic(itemId);
      const material = getMaterial(itemId);
      return equipment?.name || item?.name || material?.name || itemId;
    };

    const embed = UIBuilder.createShopEmbed(unlockedTiers, getItemDisplayName);
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
   * Start a quest from the detail view
   */,
};
