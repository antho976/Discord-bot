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
 * rpg-skills-handlers — extracted from RPGCommand.js
 * 11 methods, ~1079 lines
 */
export const SkillsHandlers = {
  async handleStats(interaction, player, skipTracking = false) {
    if (!skipTracking) {
      this.trackMenuNavigation(player, 'stats');
    }
    const embed = UIBuilder.createPlayerStatsEmbed(player);
    const backTarget = (result.meta?.worldQuest || result.meta?.defenseQuest) ? 'rpg-quest-back' : 'rpg-back';
    const backLabel = backTarget === 'rpg-quest-back' ? '← Back to Quests' : '← Back';
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(backTarget)
        .setLabel(backLabel)
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [buttons],
    });
  }

  /**
   * Helper function to filter out quests that are part of chains (child quests)
   * Only returns starting quests and standalone quests
   */
  /**
   * Get all quest chain parent IDs and build quest hierarchy
   */,

  async handleCharacterSheet(interaction, player) {
    this.trackMenuNavigation(player, 'character');
    const embed = UIBuilder.createCharacterSheetEmbed(player);
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
   * Handle skills and talents
   */,

  async handleSkills(interaction, player, skipTracking = false) {
    if (!skipTracking) {
      this.trackMenuNavigation(player, 'skills');
    }

    const playerClass = player.class || player.internalClass;
    const classData = getClass(playerClass);
    
    const embed = new EmbedBuilder()
      .setColor('#9b59b6')
      .setTitle('✨ Skills & Talents')
      .setDescription(
        `Class: **${playerClass || 'None'}**\n` +
        `Level: **${player.level}** | Skill Points: **${player.skillPoints || 0}** 🔵`
      );

    // Show learned skills with current level
    if (player.skills && player.skills.length > 0) {
      const skillsList = player.skills
        .slice(0, 15)
        .map((skillId) => {
          const skill = getSkill(skillId);
          if (!skill) return `• ${skillId}`;
          
          const currentLevel = player.skillLevels?.[skillId] || 1;
          const maxLevel = skill.maxLevel || 3;
          const levelText = `Lv ${currentLevel}/${maxLevel}`;
          const cooldown = skill.getCooldown ? skill.getCooldown(currentLevel) : skill.cooldown || 0;
          const cdText = cooldown > 0 ? ` [CD: ${cooldown} turns]` : '';
          
          let upgradeIcon = '';
          if (currentLevel < maxLevel && (player.skillPoints || 0) > 0) {
            upgradeIcon = ' 🔼'; // Can upgrade
          }
          
          return `• **${skill.name}** ${levelText}${cdText}${upgradeIcon}`;
        })
        .join('\n');

      const remaining = player.skills.length > 15 ? `\n+(${player.skills.length - 15} more)` : '';
      embed.addFields({
        name: '⚔️ Learned Skills',
        value: skillsList + remaining,
        inline: false,
      });
    } else {
      embed.addFields({
        name: '⚔️ Learned Skills',
        value: 'No skills learned yet. You start with 2 free skills!',
        inline: false,
      });
    }

    // Show unlockable skills from skill tree
    if (classData && classData.skillTree) {
      const unlockable = classData.skillTree
        .filter(entry => !player.skills.includes(entry.skillId))
        .filter(entry => player.level >= entry.unlockLevel)
        .slice(0, 8);

      if (unlockable.length > 0) {
        const unlockableList = unlockable.map(entry => {
          const skill = getSkill(entry.skillId);
          const canAfford = (player.skillPoints || 0) >= entry.pointCost;
          const icon = canAfford ? '🔓' : '🔒';
          const name = skill?.name || entry.skillId;
          return `${icon} **${name}** (Lv${entry.unlockLevel}, ${entry.pointCost} pts)`;
        }).join('\n');

        embed.addFields({
          name: '🌟 Available Skills',
          value: unlockableList,
          inline: false,
        });
      }
    }

    embed.addFields({
      name: '💡 Tip',
      value: 'Select a skill to view details, upgrade, or unlock. You gain 1 skill point every 2 levels.',
      inline: false,
    });

    const rows = [];

    // Skill selection menu (learned + unlockable)
    const allSkillOptions = [];
    
    // Add learned skills
    if (player.skills && player.skills.length > 0) {
      player.skills.slice(0, 15).forEach(skillId => {
        const skill = getSkill(skillId);
        if (skill) {
          const currentLevel = player.skillLevels?.[skillId] || 1;
          allSkillOptions.push({
            label: `${skill.name} Lv${currentLevel}`.substring(0, 100),
            value: `learned-${skillId}`,
            description: (skill.description || 'No description').substring(0, 100),
            emoji: '⚔️',
          });
        }
      });
    }

    // Add unlockable skills
    if (classData && classData.skillTree) {
      const unlockable = classData.skillTree
        .filter(entry => !player.skills.includes(entry.skillId))
        .filter(entry => player.level >= entry.unlockLevel)
        .slice(0, 25 - allSkillOptions.length);

      unlockable.forEach(entry => {
        const skill = getSkill(entry.skillId);
        if (skill) {
          const canAfford = (player.skillPoints || 0) >= entry.pointCost;
          allSkillOptions.push({
            label: `🔒 ${skill.name} (${entry.pointCost} pts)`.substring(0, 100),
            value: `unlock-${entry.skillId}`,
            description: (skill.description || 'No description').substring(0, 100),
            emoji: canAfford ? '🔓' : '🔒',
          });
        }
      });
    }

    if (allSkillOptions.length > 0) {
      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-skill-select')
          .setPlaceholder('Select a skill to view or manage')
          .addOptions(allSkillOptions)
      );
      rows.push(selectRow);
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
  }

  /**
   * Calculate equipment score (sum of all stats for ranking)
   */,

  async handleTalents(interaction, player, skipTracking = false) {
    if (!skipTracking) {
      this.trackMenuNavigation(player, 'talents');
    }
    
    if (!player.talents) player.talents = {};
    if (!Number.isFinite(player.level)) player.level = 1;
    if (!Number.isFinite(player.talentPoints)) player.talentPoints = 0;
    const spentPoints = Object.values(player.talents).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const expectedPoints = Math.max(0, (player.level || 1) - 1 - spentPoints);
    if (player.talentPoints < expectedPoints) {
      player.talentPoints = expectedPoints;
      this.persistPlayer(player);
    }
    // Use cached talents data for better performance
    const talentList = this.getCachedData('talents', getTalents);
    const points = player.talentPoints || 0;

    // Pagination: 12 talents per page
    const talentsPerPage = 12;
    const page = player.currentTalentPage || 1;
    const pageNum = Math.max(1, Math.min(page, Math.ceil(talentList.length / talentsPerPage)));
    const startIdx = (pageNum - 1) * talentsPerPage;
    const endIdx = startIdx + talentsPerPage;
    const pagetalents = talentList.slice(startIdx, endIdx);

    const lines = pagetalents.map((talent) => {
      const rank = player.talents?.[talent.id] || 0;
      const maxRank = talent.maxRank || 1;
      const bonusText = Object.entries(talent.bonuses || {})
        .map(([stat, value]) => {
          const numericValue = Number(value);
          if (!Number.isFinite(numericValue)) return null;
          return `${numericValue > 0 ? '+' : ''}${numericValue} ${stat.toUpperCase()}`;
        })
        .filter(Boolean)
        .join(', ');
      const description = talent.description ? `${talent.description}` : 'No description';
      return `**${talent.name}** (${rank}/${maxRank})\n└ ${description}`;
    });

    // Filter out maxed talents from selector
    const availableTalents = talentList.filter((talent) => {
      const rank = player.talents?.[talent.id] || 0;
      const maxRank = talent.maxRank || 1;
      return rank < maxRank;
    });

    const selectableTalents = availableTalents.slice(0, 25);
    const totalPages = Math.ceil(talentList.length / talentsPerPage);

    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('🧠 Talents')
      .setDescription(`Talent Points Available: **${points}**\n\n${lines.join('\n')}`)
      .setFooter({ text: `Page ${pageNum}/${totalPages} • ${talentList.length} total talents • ${availableTalents.length} upgradeable` })
      .setTimestamp();

    const options = selectableTalents.map((talent) => {
      const rank = player.talents?.[talent.id] || 0;
      const maxRank = talent.maxRank || 1;
      return {
        label: `${talent.name} (${rank}/${maxRank})`,
        value: talent.id,
        description: (talent.description || '').slice(0, 100),
      };
    });

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rpg-talents-select')
        .setPlaceholder(points > 0 && options.length > 0 ? 'Spend a talent point' : options.length === 0 ? 'All talents maxed!' : 'No talent points available')
        .addOptions(options.length > 0 ? options : [{ label: 'No talents available', value: 'none', description: 'All talents maxed' }])
        .setDisabled(points <= 0 || options.length === 0)
    );

    const buttonRow = new ActionRowBuilder();
    
    // Add page navigation buttons if there are multiple pages
    if (totalPages > 1) {
      if (pageNum > 1) {
        buttonRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-talents-page-1`)
            .setLabel('◀️ Page 1')
            .setStyle(ButtonStyle.Primary)
        );
      }
      
      buttonRow.addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );
      
      if (pageNum < totalPages) {
        buttonRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`rpg-talents-page-${pageNum + 1}`)
            .setLabel(`Page ${pageNum + 1} ▶️`)
            .setStyle(ButtonStyle.Primary)
        );
      }
    } else {
      buttonRow.addComponents(
        new ButtonBuilder()
          .setCustomId('rpg-back')
          .setLabel('← Back')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    const components = points > 0 ? [selectRow, buttonRow] : [buttonRow];

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components,
    });
  }

  /**
   * Handle gear upgrades for all equipment slots
   */,

  async handleProfessions(interaction, player) {
    this.trackMenuNavigation(player, 'professions');
    const professionNames = { blacksmith: 'Blacksmith', botanic: 'Botanic', enchanter: 'Enchanter', gathering: 'Gatherer' };
    const professionEmojis = { blacksmith: '🔨', botanic: '🌿', enchanter: '✨', gathering: '⛏️' };

    // Fix maxProfessions for existing high-level players
    if (player.level >= 35 && player.maxProfessions < 4) {
      player.maxProfessions = 4;
      this.persistPlayer(player);
    } else if (player.level >= 20 && player.maxProfessions < 3) {
      player.maxProfessions = 3;
      this.persistPlayer(player);
    } else if (player.level >= 15 && player.maxProfessions < 2) {
      player.maxProfessions = 2;
      this.persistPlayer(player);
    }

    this.applyMissingGatheringRewards(player);

    const embed = new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('💼 Professions')
      .setDescription('Master crafting professions to create powerful items and earn rewards.');

    // Show current professions with levels and XP
    if (player.professions && player.professions.length > 0) {
      // Fix any accumulated gathering XP that hasn't been processed into levels
      if (player.professions.includes('gathering') && player.professionXp?.gathering >= 100) {
        const xpToProcess = player.professionXp.gathering;
        player.professionXp.gathering = 0;
        addGatheringProfessionXp(player, xpToProcess);
        this.persistPlayer(player);
      }

      const professionList = player.professions
        .map((prof) => {
          const level = player.professionLevels?.[prof] || 1;
          const currentXp = player.professionXp?.[prof] || 0;
          // XP formulas: Gathering 200+(level*100), Blacksmith 400, others 100
          let xpNeeded;
          if (prof === 'gathering') {
            xpNeeded = 200 + level * 100;
          } else if (prof === 'blacksmith') {
            xpNeeded = 400;
          } else {
            xpNeeded = 100;
          }
          const xpToNextLevel = xpNeeded - currentXp;
          return `${professionEmojis[prof] || '📌'} **${professionNames[prof]}** - Level ${level}\n   └ XP: ${currentXp}/${xpNeeded} (${xpToNextLevel} to next level)`;
        })
        .join('\n');
      embed.addFields({ name: 'Your Professions', value: professionList });
    }

    // Show profession rewards
    const rewards = {
      blacksmith: '🔨 Craft weapons and armor\n🎁 Earn crafting XP\n💰 Sell items for gold\n⚡ Unlock rare recipes at higher levels',
      botanic: '🌿 Craft potions and remedies\n🎁 Earn gathering XP\n💚 Restore health and mana\n⚡ Unlock rare potions at higher levels',
      enchanter: '✨ Enhance equipment with magic\n🎁 Earn enchanting XP\n💫 Increase item power\n⚡ Unlock powerful enchants at higher levels',
      gathering: '⛏️ Craft gathering tools & buffs\n🎁 Earn massive stat bonuses\n💎 Unlock better gathering areas\n⚡ Specialized tools at higher levels',
    };

    // Show available professions to add
    const availableSlots = (player.maxProfessions || 1) - (player.professions?.length || 0);
    const availableProfessions = ['blacksmith', 'botanic', 'enchanter', 'gathering'].filter((id) => !player.professions?.includes(id));

    if (availableProfessions.length > 0) {
      const rewardsList = availableProfessions
        .map((prof) => `**${professionNames[prof]}**\n${rewards[prof]}`)
        .join('\n\n');
      embed.addFields({
        name: `Available Professions (${availableSlots} slot${availableSlots !== 1 ? 's' : ''} remaining)`,
        value: rewardsList,
      });
    }

    // Show level progression
    let nextSlotLevel = null;
    if (player.maxProfessions === 1) {
      nextSlotLevel = 15;
    } else if (player.maxProfessions === 2) {
      nextSlotLevel = 20;
    } else if (player.maxProfessions === 3) {
      nextSlotLevel = 35;
    }

    if (nextSlotLevel && player.level < nextSlotLevel) {
      const targetSlot = player.maxProfessions + 1;
      const remainder = targetSlot % 100;
      let suffix = 'th';
      if (remainder < 11 || remainder > 13) {
        const last = targetSlot % 10;
        if (last === 1) suffix = 'st';
        else if (last === 2) suffix = 'nd';
        else if (last === 3) suffix = 'rd';
      }
      embed.addFields({
        name: '🎯 Next Milestone',
        value: `Reach level ${nextSlotLevel} to unlock your ${targetSlot}${suffix} profession slot`,
      });
    }

    // Add XP info
    embed.addFields({
      name: '📊 XP System',
      value: '• Craft items to gain profession XP\n• XP gain = Recipe Level × 10\n• **Blacksmith**: 400 XP per level\n• **Others**: 100 XP per level\n• **Gathering**: Scaling (200 + level×100)',
      inline: false,
    });
    
    // Show Master Blacksmith info if applicable
    const hasAsgardAccess = (player.worldsUnlocked || []).includes('world_1770519709022');
    const hasBlacksmith = (player.professions || []).includes('blacksmith');
    const blacksmithLevel = player.professionLevels?.blacksmith || 0;
    
    if (hasBlacksmith && player.masterBlacksmith) {
      embed.addFields({
        name: '🔥 Master Blacksmith Status',
        value: '✅ **ACTIVE** - Gem crafting and socketing unlocked!',
        inline: false,
      });
    } else if (hasBlacksmith && hasAsgardAccess && blacksmithLevel >= 25) {
      embed.addFields({
        name: '🔥 Master Blacksmith Upgrade Available!',
        value: `Unlock gem crafting and socketing for **50,000 gold**\n✅ Level ${blacksmithLevel}/25\n✅ Asgard Unlocked`,
        inline: false,
      });
    } else if (hasBlacksmith && blacksmithLevel < 25) {
      embed.addFields({
        name: '🔥 Master Blacksmith',
        value: `Reach Blacksmith Level 25 and unlock Asgard to access the Master upgrade!\nCurrent: Level ${blacksmithLevel}/25`,
        inline: false,
      });
    }

    const rows = [];

    // Show rewards for current professions
    if (player.professions && player.professions.length > 0) {
      const rewardsRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-profession-rewards-select')
          .setPlaceholder('View profession rewards')
          .addOptions(
            player.professions.map((id) => ({
              label: `${professionNames[id]} Rewards`,
              value: id,
              emoji: professionEmojis[id],
            }))
          )
      );
      rows.push(rewardsRow);
    }

    // Only show profession select if slots available
    if (availableSlots > 0 && availableProfessions.length > 0) {
      const selectRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rpg-profession-select')
          .setPlaceholder('Choose a profession to add')
          .addOptions(
            availableProfessions.map((id) => ({
              label: professionNames[id],
              value: id,
              emoji: professionEmojis[id],
            }))
          )
      );
      rows.push(selectRow);
    }

    const tabsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-alchemy')
        .setLabel('🧪 Alchemy')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rpg-enchant')
        .setLabel('✨ Enchant')
        .setStyle(ButtonStyle.Primary)
    );
    rows.push(tabsRow);
    
    // Master Blacksmith row (show if player has Asgard access and blacksmith)
    if (hasBlacksmith) {
      const masterRow = new ActionRowBuilder();
      
      if (!player.masterBlacksmith && hasAsgardAccess && blacksmithLevel >= 25) {
        masterRow.addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-master-blacksmith-upgrade')
            .setLabel('🔥 Upgrade to Master Blacksmith (50,000g)')
            .setStyle(ButtonStyle.Success)
            .setDisabled((player.gold || 0) < 50000)
        );
      }
      
      if (player.masterBlacksmith) {
        masterRow.addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-gem-socketing')
            .setLabel('💎 Socket Gems')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('rpg-crafting-upgrade')
            .setLabel('⬆️ Upgrade')
            .setStyle(ButtonStyle.Primary)
        );
      } else {
        masterRow.addComponents(
          new ButtonBuilder()
            .setCustomId('rpg-crafting-upgrade')
            .setLabel('⬆️ Upgrade')
            .setStyle(ButtonStyle.Primary)
        );
      }
      
      if (masterRow.components.length > 0) {
        rows.push(masterRow);
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
  }

  /**
   * Handle profession rewards display
   */,

  async handleProfessionRewardsDisplay(interaction, player, professionId) {
    const profession = getProfessionRewards(professionId);
    if (!profession) {
      await interaction.reply({ content: 'Profession not found.', ephemeral: true });
      return;
    }

    const level = player.professionLevels?.[professionId] || 1;

    const embed = new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle(`${profession.icon} ${profession.name} Rewards`)
      .setDescription(profession.description)
      .addFields({
        name: '📊 Current Level',
        value: `Level ${level}`,
        inline: true,
      })
      .addFields({
        name: '📖 Passive Ability',
        value: profession.passive,
        inline: false,
      });

    // Build all 30 levels progression
    const allLevels = [];
    for (let lv = 1; lv <= 30; lv++) {
      let levelInfo = `**Lvl ${lv}**`;
      if (lv <= level) {
        levelInfo += ' ✅';
      }
      allLevels.push(levelInfo);
    }

    // Split into chunks for readability
    const chunk1 = allLevels.slice(0, 10).join(' • ');
    const chunk2 = allLevels.slice(10, 20).join(' • ');
    const chunk3 = allLevels.slice(20, 30).join(' • ');

    embed.addFields({
      name: '📈 Level Progression (1-10)',
      value: chunk1,
      inline: false,
    });

    embed.addFields({
      name: '📈 Level Progression (11-20)',
      value: chunk2,
      inline: false,
    });

    embed.addFields({
      name: '📈 Level Progression (21-30)',
      value: chunk3,
      inline: false,
    });

    // Show major milestone rewards
    const milestones = [5, 10, 15, 20, 25, 30];
    let rewardsText = '';
    
    for (const milestone of milestones) {
      const rewards = profession.unlocks[milestone];
      if (rewards) {
        const isUnlocked = level >= milestone ? '✅' : '🔒';
        rewardsText += `${isUnlocked} **Level ${milestone}**: ${rewards.rewards.join(', ')}\n`;
      }
    }

    if (rewardsText) {
      embed.addFields({
        name: '🎁 Major Milestone Rewards',
        value: rewardsText,
        inline: false,
      });
    }

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [backRow],
    });
  }

  /**
   * Handle talent upgrade/selection
   */,

  async handleTalentUpgrade(interaction, player, talentId) {
    const talent = getTalent(talentId);
    if (!talent) {
      await interaction.reply({ content: 'Talent not found.', ephemeral: true });
      return;
    }

    const currentRank = player.talents?.[talentId] || 0;
    const maxRank = talent.maxRank || 1;
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`💎 ${talent.name}`)
      .setDescription(talent.description || 'No description')
      .addFields({
        name: 'Current Rank',
        value: `${currentRank}/${maxRank}`,
        inline: true,
      });

    // Show talent bonuses
    if (talent.bonuses && Object.keys(talent.bonuses).length > 0) {
      const bonusText = Object.entries(talent.bonuses)
        .map(([stat, value]) => {
          const numericValue = Number(value);
          if (!Number.isFinite(numericValue)) return null;
          const sign = numericValue >= 0 ? '+' : '';
          return `${sign}${numericValue} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`;
        })
        .filter(Boolean)
        .join('\n');
      embed.addFields({
        name: 'Stat Bonuses per Rank',
        value: bonusText || 'No bonuses',
        inline: true,
      });
    }

    // Show current effect
    if (talent.effect) {
      embed.addFields({
        name: '⚡ Effect',
        value: talent.effect.replace(/_/g, ' '),
        inline: false,
      });
    }

    // Show class restriction if any
    if (talent.classRestriction) {
      embed.addFields({
        name: '🔒 Class Requirement',
        value: talent.classRestriction.charAt(0).toUpperCase() + talent.classRestriction.slice(1),
        inline: false,
      });
    }

    const pointsAvailable = Number(player.talentPoints || 0);
    const ranksRemaining = Math.max(0, maxRank - currentRank);
    const maxSpend = Math.min(pointsAvailable, ranksRemaining);

    embed.addFields({
      name: '🎯 Talent Points Overview',
      value: `Points Available: **${pointsAvailable}**\n` +
        `Ranks Remaining: **${ranksRemaining}**\n` +
        `Can Upgrade: **+${maxSpend} rank${maxSpend === 1 ? '' : 's'}**`,
      inline: false,
    });

    const rows = [];

    // Upgrade/downgrade buttons
    if (currentRank < maxRank) {
      const upgradeButton = new ButtonBuilder()
        .setCustomId(`rpg-talent-upgrade-${talentId}`)
        .setLabel('⬆️ Upgrade 1')
        .setStyle(ButtonStyle.Success)
        .setDisabled(pointsAvailable <= 0);

      if (!rows[0]) rows[0] = new ActionRowBuilder();
      rows[0].addComponents(upgradeButton);

      if (maxSpend > 1) {
        const maxButton = new ButtonBuilder()
          .setCustomId(`rpg-talent-upgrade-max-${talentId}`)
          .setLabel(`⬆️ Upgrade Max (+${maxSpend})`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pointsAvailable <= 0);
        rows[0].addComponents(maxButton);
      }
    }

    if (currentRank > 0) {
      const downgradeButton = new ButtonBuilder()
        .setCustomId(`rpg-talent-downgrade-${talentId}`)
        .setLabel(`⬇️ Downgrade to Rank ${currentRank - 1}`)
        .setStyle(ButtonStyle.Danger);
      
      if (!rows[0]) rows[0] = new ActionRowBuilder();
      rows[0].addComponents(downgradeButton);
    }

    // Back button
    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-back')
        .setLabel('← Back')
        .setStyle(ButtonStyle.Secondary)
    );
    rows.push(backRow);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows.filter(r => r && r.components.length > 0),
    });
  }

  /**
   * Handle skill detail viewer
   */,

  async handleSkillDetail(interaction, player, skillId, action = 'learned') {
    this.trackMenuNavigation(player, 'skill-detail');
    const skill = getSkill(skillId);
    
    if (!skill) {
      await interaction.reply({
        content: `❌ Skill not found: ${skillId}`,
        ephemeral: true,
      });
      return;
    }

    const isLearned = player.skills.includes(skillId);
    const currentLevel = player.skillLevels?.[skillId] || 1;
    const maxLevel = skill.maxLevel || 3;
    
    // Get class data to find this skill in skill tree
    const playerClass = player.class || player.internalClass;
    const classData = getClass(playerClass);
    let skillTreeEntry = null;
    let unlockCost = 1;
    
    if (classData && classData.skillTree) {
      skillTreeEntry = classData.skillTree.find(s => s.skillId === skillId);
      if (skillTreeEntry) {
        unlockCost = skillTreeEntry.pointCost;
      }
    }
    
    // Upgrade cost is always 1 skill point per level
    const upgradeCost = 1;
    
    // Check if can upgrade (must have enough points for the upgrade cost)
    const canUpgrade = isLearned && currentLevel < maxLevel && (player.skillPoints || 0) >= upgradeCost;

    const embed = new EmbedBuilder()
      .setColor(isLearned ? 0x2ecc71 : 0xff9800)
      .setTitle(`⚔️ ${skill.name}`)
      .setDescription(skill.description || 'No description available');

    // Add skill level and status
    embed.addFields({
      name: '📊 Skill Status',
      value: isLearned 
        ? `✅ **Learned** | Level: **${currentLevel}/${maxLevel}**`
        : `🔒 **Not Learned** | Requires Level ${skillTreeEntry?.unlockLevel || '?'} (Cost: ${unlockCost} points)`,
      inline: false,
    });

    // Show different stats based on skill level
    if (skill.levels && skill.levels[currentLevel]) {
      const levelData = skill.levels[currentLevel];
      const statsText = [];
      
      if (levelData.damage) {
        const dmgValue = typeof levelData.damage === 'function' 
          ? levelData.damage(player).toFixed(1)
          : (levelData.damage * player.strength).toFixed(1);
        statsText.push(`💥 Damage: **${dmgValue}**`);
      }
      if (levelData.cooldown !== undefined) {
        statsText.push(`⏱️ Cooldown: **${levelData.cooldown}** turns`);
      }
      if (levelData.healPercent) {
        const healValue = Math.floor(player.maxHp * levelData.healPercent);
        statsText.push(`💚 Heal: **${healValue}** HP (${(levelData.healPercent * 100).toFixed(0)}%)`);
      }
      if (levelData.duration) {
        statsText.push(`⌛ Duration: **${levelData.duration}** turns`);
      }
      
      if (skill.type) statsText.push(`🎯 Type: **${skill.type}**`);
      if (skill.element) statsText.push(`⚡ Element: **${skill.element}**`);
      
      if (statsText.length > 0) {
        embed.addFields({
          name: `📋 Level ${currentLevel} Stats`,
          value: statsText.join('\n'),
          inline: false,
        });
      }

      // Show description for this level
      if (levelData.description) {
        embed.addFields({
          name: '📝 Level Description',
          value: levelData.description,
          inline: false,
        });
      }
    }

    // Show upgrade preview if available
    if (currentLevel < maxLevel && skill.levels && skill.levels[currentLevel + 1]) {
      const nextLevelData = skill.levels[currentLevel + 1];
      const upgradeText = [];
      
      if (nextLevelData.damage && skill.levels[currentLevel].damage) {
        upgradeText.push(`• Damage: ${(skill.levels[currentLevel].damage * 100).toFixed(0)}% → ${(nextLevelData.damage * 100).toFixed(0)}%`);
      }
      if (nextLevelData.cooldown !== undefined && skill.levels[currentLevel].cooldown !== undefined) {
        upgradeText.push(`• Cooldown: ${skill.levels[currentLevel].cooldown} → ${nextLevelData.cooldown} turns`);
      }
      
      if (upgradeText.length > 0) {
        embed.addFields({
          name: `🔼 Next Level (Lv${currentLevel + 1})`,
          value: upgradeText.join('\n'),
          inline: false,
        });
      }
    }

    // Add passive bonuses
    if (skill.passiveBonuses && Object.keys(skill.passiveBonuses).length > 0) {
      const bonusesText = Object.entries(skill.passiveBonuses)
        .map(([stat, value]) => `+${value} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`)
        .join(', ');
      
      embed.addFields({
        name: '🎁 Passive Bonuses',
        value: bonusesText,
        inline: false,
      });
    }

    const rows = [];
    
    // Add action buttons
    const buttonRow = new ActionRowBuilder();
    
    if (isLearned && canUpgrade) {
      buttonRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-skill-upgrade-${skillId}`)
          .setLabel(`🔼 Upgrade (${upgradeCost} pts)`)
          .setStyle(ButtonStyle.Success)
      );
    }
    
    if (!isLearned && skillTreeEntry && (player.skillPoints || 0) >= unlockCost && player.level >= skillTreeEntry.unlockLevel) {
      buttonRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`rpg-skill-unlock-${skillId}`)
          .setLabel(`🔓 Unlock (${unlockCost} pts)`)
          .setStyle(ButtonStyle.Success)
      );
    }
    
    if (buttonRow.components.length > 0) {
      rows.push(buttonRow);
    }

    // Add back button
    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-skills')
        .setLabel('← Back to Skills')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-hub')
        .setLabel('🏠 Hub')
        .setStyle(ButtonStyle.Primary)
    );
    rows.push(backRow);

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: rows,
    });
  }

  /**
   * Handle crafting
   */,

  async handleStatsAndTalents(interaction, player) {
    this.trackMenuNavigation(player, 'stats-talents');
    const embed = UIBuilder.createPlayerStatsEmbed(player);

    const talentEntries = Object.entries(player.talents || {});
    if (talentEntries.length > 0) {
      const talentLines = talentEntries.map(([talentId, rank]) => {
        const talent = getTalent(talentId);
        return `• ${talent?.name || talentId} (Rank ${rank})`;
      });
      embed.addFields({
        name: '🧠 Talents',
        value: talentLines.join('\n'),
        inline: false,
      });
    } else {
      embed.addFields({
        name: '🧠 Talents',
        value: 'No talents learned yet.',
        inline: false,
      });
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-talents')
        .setLabel('🧠 Manage Talents')
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
   * Handle story log
   */,

  async handleClassMasteryGuide(interaction, player) {
    const playerClass = player.class || player.internalClass;
    const classData = getClass(playerClass);

    if (!classData) {
      await interaction.reply({
        content: '❌ Class data not found.',
        ephemeral: true
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x6600ff)
      .setTitle(`📚 **${playerClass} Mastery Guide**`)
      .setDescription(`Master your ${playerClass} abilities`);

    // Key stats for this class
    const keyStats = playerClass === 'Mage' 
      ? 'Intelligence & Agility'
      : playerClass === 'Rogue'
      ? 'Agility & Strength'
      : playerClass === 'Paladin'
      ? 'Strength & Constitution'
      : 'Strength & Constitution';

    embed.addFields(
      { name: '⭐ Key Stats', value: keyStats, inline: true },
      { name: '🎯 Primary Role', value: classData.role || 'Balanced', inline: true },
      { name: '💪 Passive Ability', value: classData.passive || 'None', inline: false }
    );

    if (classData.skills && classData.skills.length > 0) {
      const topSkills = classData.skills.slice(0, 3).join(', ');
      embed.addFields({
        name: '⚡ Recommended Skills',
        value: topSkills,
        inline: false
      });
    }

    embed.addFields({
      name: '💡 Mastery Tips',
      value: `Focus on ${keyStats}. Use your class abilities to combo for higher damage!`,
      inline: false
    });

    await this.updateInteractionWithTracking(interaction, { embeds: [embed], ephemeral: true });
  }

  /**
   * Show environment advantage tool
   */,

  async handleProfessionTips(interaction, player) {
    const professions = ['gathering', 'crafting', 'alchemy'];

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('rpg-profession-tips-select')
      .setPlaceholder('Choose profession to learn about...')
      .addOptions(
        professions.map(prof => ({
          label: prof.charAt(0).toUpperCase() + prof.slice(1),
          value: prof,
          description: 'View efficiency tips',
          emoji: prof === 'gathering' ? '⛏️' : prof === 'crafting' ? '🔨' : '🧪'
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor(0x00aa00)
      .setTitle('💡 **Profession Efficiency Tips**')
      .setDescription('Optimize your gathering, crafting, and alchemy for maximum profit')
      .addFields({
        name: '💰 Compare Professions',
        value: 'See which profession is most profitable for your level',
        inline: false
      });

    await this.updateInteractionWithTracking(interaction, {
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  /**
   * Guild Leaderboard - Members ranked by stats
   */,
};
