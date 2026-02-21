/**
 * Auto-Gather Manager - Handles continuous gathering with periodic Discord updates
 * Runs gathering every 5 seconds, updates Discord every 30 seconds
 */

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getGatheringSkill, generateGatheringMaterials, generateAreaGatheringMaterials, getGatheringXpToNextLevel, getGatheringProfessionLevel, getGatheringProfessionBonuses, applyGatheringYieldBonus, addGatheringProfessionXp } from '../data/gathering.js';
import { getGatheringArea } from '../data/gathering-areas.js';
import { getMaterial } from '../data/professions.js';
import { getAvailableDailyQuests, getAvailableWeeklyQuests, getGuildQuestById } from '../data/guild-quests.js';
import { loadBalanceData } from '../data/balance.js';

class AutoGatherManager {
  constructor(rpgCommand) {
    this.rpgCommand = rpgCommand;
    this.activeGathers = new Map();
    this.areaEvents = new Map(); // areaId -> { active, name, multiplier, expiresAt }
    this.initializeAreaEvents();
  }

  /**
   * Initialize gathering mini-events for areas
   */
  initializeAreaEvents() {
    const events = [
      { areaId: 'lush_forest', name: '🌿 Bountiful Growth', multiplier: 1.5, duration: 3600000 },
      { areaId: 'rocky_mountains', name: '⛏️ Rich Veins', multiplier: 1.4, duration: 3600000 },
      { areaId: 'misty_swamp', name: '🌿 Blooming Season', multiplier: 1.35, duration: 3600000 },
      { areaId: 'ancient_ruins', name: '✨ Arcane Surge', multiplier: 1.3, duration: 3600000 },
    ];

    for (const evt of events) {
      if (Math.random() < 0.2) {
        this.areaEvents.set(evt.areaId, {
          active: true,
          name: evt.name,
          multiplier: evt.multiplier,
          expiresAt: Date.now() + evt.duration,
        });
      }
    }

    setInterval(() => this.refreshAreaEvents(), 3600000);
  }

  /**
   * Refresh area events (called hourly)
   */
  refreshAreaEvents() {
    const now = Date.now();
    for (const [areaId, evt] of this.areaEvents.entries()) {
      if (evt.expiresAt < now) {
        this.areaEvents.delete(areaId);
      }
    }

    const areaIds = ['lush_forest', 'rocky_mountains', 'misty_swamp', 'ancient_ruins'];
    for (const areaId of areaIds) {
      if (!this.areaEvents.has(areaId) && Math.random() < 0.25) {
        const multipliers = { lush_forest: 1.5, rocky_mountains: 1.4, misty_swamp: 1.35, ancient_ruins: 1.3 };
        const names = { lush_forest: '🌿 Bountiful Growth', rocky_mountains: '⛏️ Rich Veins', misty_swamp: '🌿 Blooming Season', ancient_ruins: '✨ Arcane Surge' };
        this.areaEvents.set(areaId, {
          active: true,
          name: names[areaId],
          multiplier: multipliers[areaId],
          expiresAt: Date.now() + 3600000,
        });
      }
    }
  }

  /**
   * Get area event bonus
   */
  getAreaEventBonus(areaId) {
    const evt = this.areaEvents.get(areaId);
    if (evt && evt.expiresAt > Date.now()) {
      return { multiplier: evt.multiplier, name: evt.name };
    }
    return { multiplier: 1, name: null };
  }

  /**
   * Start auto-gathering for a player
   */
  startAutoGather(player, skillId, interaction) {
    const skill = getGatheringSkill(skillId);
    if (!skill) {
      return { success: false, error: 'Invalid skill' };
    }

    // Stop any existing auto-gather
    if (player.isAutoGathering) {
      this.stopAutoGather(player);
    }

    // Clear area if it doesn't support this skill
    if (player.currentGatherArea) {
      const area = getGatheringArea(player.currentGatherArea);
      if (!area || !area.skillTypes || !area.skillTypes.includes(skillId)) {
        player.currentGatherArea = null;
      }
    }

    // Initialize auto-gather state
    player.isAutoGathering = true;
    player.autoGatherSkill = skillId;
    player.autoGatherStartTime = Date.now();
    player.autoGatherCount = 0;
    player.autoGatherTotalXp = 0;
    player.autoGatherMaterials = {};
    player.autoGatherChannelId = interaction.channelId;

    // Run gather every 5 seconds
    const intervalId = setInterval(() => {
      this.performGatherCycle(player, skill);
    }, 5000);

    // Store interval only in Map, NOT on player (causes circular reference)
    this.activeGathers.set(player.userId, { 
      player, 
      skill, 
      intervalId,
      updateIntervalId: null, // Will be set when viewing the status
      lastMessageId: null,
      lastChannelId: interaction.channelId,
    });

    return { success: true, skill };
  }

  /**
   * Single gather cycle (happens every 5 seconds)
   */
  performGatherCycle(player, skill) {
    const now = Date.now();
    if (!player.lastGatherTime) {
      player.lastGatherTime = { mining: 0, chopping: 0, gathering: 0 };
    }

    const timeWaited = now - (Number(player.lastGatherTime[skill.id]) || 0);
    const minutesWaited = Math.floor(timeWaited / 60000);

    const gatheringLevel = getGatheringProfessionLevel(player);
    const bonuses = getGatheringProfessionBonuses(gatheringLevel);

    // Perform gathering
    const balance = loadBalanceData();
    const baseXp = skill.baseXp;
    const xpMult = Number(balance.gatheringXpMultiplier) || 1;
    const xpGained = Math.floor(baseXp * (1 + gatheringLevel * 0.1) * xpMult);

    let materialsRaw = null;

    if (player.currentGatherArea) {
      const areaResult = generateAreaGatheringMaterials(
        player.currentGatherArea,
        skill.id,
        gatheringLevel,
        timeWaited,
        bonuses.rareBonusPct / 100
      );

      if (areaResult?.error) {
        player.currentGatherArea = null;
      } else if (Array.isArray(areaResult?.materials) && areaResult.materials.length > 0) {
        const counts = {};
        for (const id of areaResult.materials) {
          counts[id] = (counts[id] || 0) + 1;
        }
        materialsRaw = Object.entries(counts).map(([id, quantity]) => ({ id, quantity }));
      }
    }

    if (!materialsRaw) {
      materialsRaw = generateGatheringMaterials(skill.id, gatheringLevel, timeWaited);
    }

    // Check for active gathering potion bonus
    let potionBonus = 0;
    if (player.potionBuffs?.gatheringBonus && player.potionBuffs?.gatheringExpires) {
      if (Date.now() < player.potionBuffs.gatheringExpires) {
        potionBonus = player.potionBuffs.gatheringBonus;
      } else {
        // Expired, clear it
        delete player.potionBuffs.gatheringBonus;
        delete player.potionBuffs.gatheringExpires;
      }
    }

    // Map materials to include names and apply area event bonus
    const eventBonus = this.getAreaEventBonus(player.currentGatherArea);
    let yieldBonus = bonuses.yieldBonusPct + potionBonus;
    let eventMessage = '';
    
    if (eventBonus.multiplier > 1) {
      yieldBonus *= eventBonus.multiplier;
      if (Math.random() < 0.1) { // Show event notice 10% of the time
        eventMessage = `${eventBonus.name} is active in this area!`;
      }
    }
    
    const materials = applyGatheringYieldBonus(
      materialsRaw.map(mat => {
        const matData = getMaterial(mat.id);
        return {
          ...mat,
          name: matData?.name || mat.id,
        };
      }),
      yieldBonus
    );
    
    // Store event message on player for display
    if (eventMessage) {
      player.lastGatherEventMessage = eventMessage;
    }

    // Add XP and check level up
    const levelResult = addGatheringProfessionXp(player, xpGained);
    const currentLevel = levelResult.level;
    this.rpgCommand.applyMissingGatheringRewards(player);

    // Add materials to inventory
    for (const mat of materials) {
      this.rpgCommand.addMaterialToInventory(player, mat.id, mat.quantity);
      
      // Track guild quest progress properly
      const dailyQuests = getAvailableDailyQuests(player.guildRank, player.dailyQuestsCompleted);
      const weeklyQuests = getAvailableWeeklyQuests(player.guildRank, player.weeklyQuestsCompleted);
      const claimedLimited = (player.claimedQuests || [])
        .map(id => getGuildQuestById(id))
        .filter(Boolean)
        .filter(q => !player.limitedQuestsCompleted.includes(q.id));
      
      this.rpgCommand.applyGuildQuestProgress(player, dailyQuests, weeklyQuests, claimedLimited, {
        type: 'gather',
        target: mat.id,
        count: mat.quantity || 1,
      });
      
      // Track for summary
      player.autoGatherMaterials[mat.id] = (player.autoGatherMaterials[mat.id] || 0) + mat.quantity;
    }

    // Update counters
    player.lastGatherTime[skill.id] = now;
    player.autoGatherCount += 1;
    player.autoGatherTotalXp += xpGained;
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
    player.progressStats.gatheringActions += 1;
    player.clearStatsCache();

    // Save player data after each cycle to persist progress
    this.rpgCommand.persistPlayer(player);
  }

  /**
   * Start periodic Discord message updates (every 30 seconds)
   */
  startMessageUpdates(userId, messageId, channelId, client) {
    const gatherData = this.activeGathers.get(userId);
    if (!gatherData) return;

    // Store message info
    gatherData.lastMessageId = messageId;
    gatherData.lastChannelId = channelId;

    // Clear any existing update interval
    if (gatherData.updateIntervalId) {
      clearInterval(gatherData.updateIntervalId);
    }

    // Update every 30 seconds
    gatherData.updateIntervalId = setInterval(async () => {
      try {
        const channel = client.channels.cache.get(channelId);
        const message = await channel.messages.fetch(messageId).catch(() => null);
        
        if (message && gatherData.player.isAutoGathering) {
          const updatedEmbed = this.createAutoGatherSummaryEmbed(gatherData.player, gatherData.skill);
          await message.edit({ embeds: [updatedEmbed] });
        }
      } catch (err) {
        // Silently fail - message might have been deleted
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * Stop periodic Discord message updates
   */
  stopMessageUpdates(userId) {
    const gatherData = this.activeGathers.get(userId);
    if (gatherData?.updateIntervalId) {
      clearInterval(gatherData.updateIntervalId);
      gatherData.updateIntervalId = null;
      gatherData.lastMessageId = null;
    }
  }

  /**
   * Stop auto-gathering for a player
   */
  stopAutoGather(player) {
    if (!player.isAutoGathering) return;

    const gatherData = this.activeGathers.get(player.userId);
    if (gatherData?.intervalId) {
      clearInterval(gatherData.intervalId);
    }

    // Stop message updates
    this.stopMessageUpdates(player.userId);

    player.isAutoGathering = false;
    this.activeGathers.delete(player.userId);
  }

  /**
   * Create summary embed for auto-gather progress
   */
  createAutoGatherSummaryEmbed(player, skill) {
    const elapsedMs = Date.now() - player.autoGatherStartTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    // Format materials
    let materialsText = 'None yet';
    if (Object.keys(player.autoGatherMaterials).length > 0) {
      materialsText = Object.entries(player.autoGatherMaterials)
        .map(([id, qty]) => {
          const mat = getMaterial(id);
          return `• ${mat?.name || id}: ${qty}`;
        })
        .join('\n');
    }

    const avgPerCycle = player.autoGatherCount > 0 ? (player.autoGatherTotalXp / player.autoGatherCount).toFixed(1) : 0;

    // Check for active gathering potion bonus
    let potionBonusText = '';
    if (player.potionBuffs?.gatheringBonus && player.potionBuffs?.gatheringExpires) {
      if (Date.now() < player.potionBuffs.gatheringExpires) {
        const timeLeft = Math.ceil((player.potionBuffs.gatheringExpires - Date.now()) / 60000);
        potionBonusText = `⚗️ **Active Potion:** +${player.potionBuffs.gatheringBonus}% yield (${timeLeft}m left)\n`;
      }
    }

    return new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle(`${skill.icon} Auto-Gathering in Progress`)
      .setDescription(`Gathering ${skill.name} continuously...\n${potionBonusText}`)
      .addFields(
        {
          name: '⏱️ Duration',
          value: `${elapsedMinutes}m ${elapsedSeconds % 60}s`,
          inline: true,
        },
        {
          name: '⛏️ Cycles',
          value: `${player.autoGatherCount}`,
          inline: true,
        },
        {
          name: '📈 Total XP',
          value: `${player.autoGatherTotalXp}`,
          inline: true,
        },
        {
          name: '📊 Avg XP/Cycle',
          value: `${avgPerCycle}`,
          inline: true,
        },
        {
          name: '⭐ Gathering Level',
          value: `${getGatheringProfessionLevel(player)}`,
          inline: true,
        },
        {
          name: '🧰 Materials',
          value: materialsText,
          inline: false,
        }
      )
      .setTimestamp();
  }

  /**
   * Get stop button
   */
  getStopButton() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('rpg-stop-autogather')
        .setLabel('⏹️ Stop Auto-Gather')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('rpg-back-to-gather')
        .setLabel('← Back to Gathering')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rpg-hub')
        .setLabel('🏠 Hub')
        .setStyle(ButtonStyle.Primary)
    );
  }

  /**
   * Check if a player is currently auto-gathering
   */
  isGathering(userId) {
    return this.activeGathers.has(userId);
  }

  /**
   * Get active gather info
   */
  getActiveGather(userId) {
    return this.activeGathers.get(userId);
  }

  /**
   * Restore auto-gathering sessions after bot restart
   */
  restoreAutoGatherSession(player) {
    // If player data says they're gathering but no interval exists, restart it
    if (player.isAutoGathering && !this.activeGathers.has(player.userId)) {
      const skill = getGatheringSkill(player.autoGatherSkill);
      if (skill) {
        // Run gather every 5 seconds
        const intervalId = setInterval(() => {
          this.performGatherCycle(player, skill);
        }, 5000);

        // Store interval
        this.activeGathers.set(player.userId, { player, skill, intervalId });
        
        console.log(`[AutoGather] Restored gathering session for ${player.userId}`);
      }
    }
  }

  /**
   * Ensure gathering is running (call this when loading player data)
   */
  ensureGatheringActive(player) {
    if (player.isAutoGathering && !this.activeGathers.has(player.userId)) {
      this.restoreAutoGatherSession(player);
    }
  }
}

export default AutoGatherManager;
