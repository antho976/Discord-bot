/**
 * UI Builder - Generate Discord embeds for the RPG system
 */

import { EmbedBuilder } from 'discord.js';
import { getQuestCategoriesByWorld } from '../data/quests.js';
import { getDungeonsByWorld, getAvailableDungeons } from '../data/dungeons.js';
import { getWorld } from '../data/worlds.js';
import { getAllWorlds, getWorld as getWorldFromContent, getWorldByBoss, getItemByIdForBot } from '../data/content-system.js';
import { getRarityColor } from '../data/items.js';
import { CLASSES, getSkill } from '../data/classes.js';
import { getAllNarrativeChoices, getNarrativeChoice } from '../data/narrative-classes.js';
import { getRaidsByWorld } from '../data/raids.js';
import { RECIPES, MATERIALS, getMaterial } from '../data/professions.js';
import { getGem } from '../data/gems.js';
import { getGatheringXpToNextLevel } from '../data/gathering.js';
import { getEquipment } from '../data/equipment.js';
import { loadTutorialData } from '../data/tutorial.js';

class UIBuilder {
  static cachedEmbeds = new Map(); // Cache embeds that don't change frequently
  static cachedStrings = new Map(); // Cache formatted strings
  
  /**
   * Get or create cached string (reduces template literal overhead)
   */
  static getCachedString(key, generator) {
    if (this.cachedStrings.has(key)) {
      return this.cachedStrings.get(key);
    }
    const str = generator();
    this.cachedStrings.set(key, str);
    return str;
  }
  
  /**
   * Clear cached strings periodically
   */
  static clearStringCache() {
    this.cachedStrings.clear();
  }
  static cachedStrings = new Map(); // Cache formatted strings
  
  /**
   * Get or create cached string (reduces template literal overhead)
   */
  static getCachedString(key, generator) {
    if (this.cachedStrings.has(key)) {
      return this.cachedStrings.get(key);
    }
    const str = generator();
    this.cachedStrings.set(key, str);
    return str;
  }
  
  /**
   * Clear cached strings periodically
   */
  static clearStringCache() {
    this.cachedStrings.clear();
  }

  /**
   * Create story intro embed
   */
  static createStoryIntroEmbed() {
    const tutorial = loadTutorialData();

    const embed = new EmbedBuilder()
      .setColor(0x6a5acd)
      .setTitle(tutorial.title || '📖 Your Journey Begins')
      .setDescription(tutorial.intro || 'Welcome to the RPG!')
      .setTimestamp();

    const sections = Array.isArray(tutorial.sections) ? tutorial.sections : [];
    const safeSections = sections.slice(0, 8);

    for (const section of safeSections) {
      if (!section) continue;
      const title = section.title || 'Overview';
      const body = section.body || 'Details coming soon.';
      embed.addFields({ name: title, value: body, inline: false });
    }

    return embed;
  }

  /**
   * Create player menu embed
   */
  static createPlayerMenuEmbed(player, discordUser) {
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('👤 Player Menu')
      .setDescription(
        '**Manage your character:**\n\n' +
        '💪 **Skills** - View and upgrade your abilities and talent tree.\n' +
        '⚙️ **Equipment** - Manage gear, sets, and upgrades.\n' +
        '🔨 **Crafting** - Create items, craft gear, and enchant equipment.\n' +
        '🎒 **Inventory** - View all your items and materials.\n' +
        '💼 **Professions** - Learn trades and gather resources.\n' +
        '⭐ **Stats & Talents** - View core stats and talent allocations.'
      )
      .setTimestamp();

    if (discordUser && discordUser.displayAvatarURL) {
      embed.setThumbnail(discordUser.displayAvatarURL({ size: 128 }));
    }

    return embed;
  }

  /**
   * Create adventure completed embed - optimized for fast loading
   */
  static createAdventureCompletedEmbed(player, xpGained, materialsFound = []) {
    const nextAdventureTime = new Date(player.lastAdventureTime + player.adventureCooldown);
    const minutesUntilNext = Math.ceil((nextAdventureTime - Date.now()) / 60000);
    const materialsText = materialsFound.length > 0
      ? materialsFound.map((mat) => `• ${mat.name} x${mat.quantity}`).join('\n')
      : 'No materials found this time.';

    return new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✨ Adventure Complete!')
      .setDescription(`**+${xpGained} XP** | Level ${player.level}`)
      .addFields(
        {
          name: '🧰 Materials',
          value: materialsText,
          inline: true,
        },
        {
          name: '⏱️ Next Adventure',
          value: minutesUntilNext > 0 ? `${minutesUntilNext}m` : 'Ready!',
          inline: true,
        }
      )
      .setTimestamp();
  }

  /**
   * Create adventure unavailable embed
   */
  static createAdventureUnavailableEmbed(minutesRemaining) {
    return new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('⏳ Adventure Cooldown')
      .setDescription(`Adventures are on a 2-minute cooldown to prevent farming.`)
      .addFields({
        name: 'Next available in:',
        value: `**${minutesRemaining}m ${Math.round((minutesRemaining * 60) % 60)}s**`,
        inline: false,
      })
      .setTimestamp();
  }

  /**
   * Create goals/objectives embed
   */
  static createGoalsEmbed(player) {
    const world = getWorld(player.currentWorld);
    const boss = world ? world.bosses?.[0] : null;

    return new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🎯 Objectives')
      .setDescription(`Your journey in ${world?.name || 'this world'}`)
      .addFields(
        {
          name: '📈 Progression',
          value: `Level: ${player.level} | XP: ${player.xp}/${player.xpToNextLevel}`,
          inline: false,
        },
        {
          name: '⚔️ World Boss',
          value: boss ? `${boss.name}\nLevel: ${boss.level} | Defeated: ${player.worldBossesDefeated.includes(player.currentWorld) ? '✅' : '❌'}` : 'No boss data',
          inline: false,
        },
        {
          name: '💪 Get Stronger By:',
          value: '• Running Adventures (2m cooldown) for XP\n• Crafting gear to boost stats\n• Testing yourself in dungeons',
          inline: false,
        }
      )
      .setTimestamp();
  }
  static createMainMenuEmbed(player, discordUser) {
    const summary = player.getSummary();
    const world = getWorld(summary.currentWorld);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚔️ RPG Hub')
      .setDescription(`**${player.username}** • Level ${summary.level} • ${summary.class || 'Midguard'}\n\u200B`)
      .addFields(
        {
          name: '📊 Progress',
          value: `XP: **${summary.xp}** / ${summary.xpToNextLevel}\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\nHP: **${summary.hp}** / ${summary.maxHp}\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000`,
          inline: false,
        },
        {
          name: '💰 Resources',
          value: `Gold: **${summary.gold}**\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000`,
          inline: false,
        }
      )
      .setTimestamp();

    // Add user's actual avatar if available
    if (discordUser && discordUser.displayAvatarURL) {
      embed.setThumbnail(discordUser.displayAvatarURL({ size: 256 }));
    }

    return embed;
  }

  /**
   * Create a progress bar visualization
   */
  static createProgressBar(current, max, length = 10) {
    const percentage = Math.min(Math.max(current / max, 0), 1);
    const filled = Math.round(percentage * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Create combat start embed
   */
  static createCombatStartEmbed(player, enemy, worldState) {
    return new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('⚔️ Combat Started!')
      .setDescription(`${player.username} is fighting ${enemy.name}!`)
      .addFields(
        {
          name: `${player.username}`,
          value: `HP: ${player.hp}/${player.maxHp}`,
          inline: true,
        },
        {
          name: `${enemy.name}`,
          value: `HP: ${enemy.hp}/${enemy.maxHp}`,
          inline: true,
        },
        {
          name: '🌍 World State',
          value: worldState ? `${worldState.name}
${worldState.description}` : 'Normal Day',
          inline: false,
        },
        {
          name: '\u200b', // blank field
          value: 'Click **Next Turn** to watch the AI fight!',
          inline: false,
        }
      )
      .setTimestamp();
  }

  /**
   * Create combat state embed
   */
  static createCombatStateEmbed(combatState) {
    const { playerStatus, enemyStatus, round, log, worldState, playerEffects, enemyEffects, playerStance, playerGuard, enemyGuard, guardMax, enemyIntent } = combatState;

    // Create health bars
    const playerBar = this.createHealthBar(playerStatus.hpPercent);
    const enemyBar = this.createHealthBar(enemyStatus.hpPercent);

    const stanceLabels = {
      balanced: 'Balanced',
      aggressive: 'Aggressive',
      defensive: 'Defensive',
      focused: 'Focused',
      evasive: 'Evasive',
    };

    const formatEffects = (effects) => {
      if (!effects || effects.length === 0) return 'None';
      const labels = {
        poison: 'Poison',
        bleed: 'Bleed',
        stun: 'Stun',
        slow: 'Slow',
        weakened: 'Weakened',
        exposed: 'Exposed',
        broken: 'Broken',
        ward: 'Ward',
        absorb: 'Absorb',
        regeneration: 'Regen',
        damage_reduction: 'Guarded',
        defense_boost: 'Defense Up',
        defense_reduction: 'Defense Down',
        strength_boost: 'Strength Up',
        agility_boost: 'Agility Up',
        dodge: 'Evasion',
      };

      const items = effects.map((effect) => {
        const name = labels[effect.type] || effect.type;
        const duration = Number(effect.duration) || 0;
        return duration > 0 ? `${name} (${duration}t)` : name;
      });

      const shown = items.slice(0, 5);
      if (items.length > 5) shown.push(`+${items.length - 5} more`);
      return shown.join(', ');
    };

    const playerGuardMax = guardMax || 100;
    const enemyGuardMax = guardMax || 100;
    const playerGuardBar = this.createProgressBar(playerGuard || 0, playerGuardMax);
    const enemyGuardBar = this.createProgressBar(enemyGuard || 0, enemyGuardMax);

    // Create log text (last 5 entries)
    const logText = log.slice(-5).join('\n');

    return new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle(`⚔️ Combat - Round ${round}`)
      .addFields(
        {
          name: `${playerStatus.name}`,
          value: `${playerBar}\nHP: ${playerStatus.hp}/${playerStatus.maxHp}\nGuard: ${playerGuardBar} ${playerGuard || 0}/${playerGuardMax}\nStance: ${stanceLabels[playerStance] || 'Balanced'}`,
          inline: true,
        },
        {
          name: `${enemyStatus.name}`,
          value: `${enemyBar}\nHP: ${enemyStatus.hp}/${enemyStatus.maxHp}\nGuard: ${enemyGuardBar} ${enemyGuard || 0}/${enemyGuardMax}`,
          inline: true,
        },
        {
          name: '🌍 World State',
          value: worldState ? `${worldState.name}` : 'Normal Day',
          inline: false,
        },
        ...(enemyIntent?.label ? [{
          name: '🔮 Enemy Intent',
          value: enemyIntent.label,
          inline: false,
        }] : []),
        {
          name: '🧪 Status Effects',
          value: `Player: ${formatEffects(playerEffects)}\nEnemy: ${formatEffects(enemyEffects)}`,
          inline: false,
        },
        {
          name: 'Battle Log',
          value: `\`\`\`\n${logText}\n\`\`\``,
          inline: false,
        }
      )
      .setTimestamp();
  }

  /**
   * Create combat end embed
   */
  static createCombatEndEmbed(playerWon, player, enemy, xpGained = 0) {
    const title = playerWon ? '🎉 Victory!' : '💀 Defeat!';
    const color = playerWon ? 0x00ff00 : 0xff0000;
    const description = playerWon
      ? `${player.username} defeated ${enemy.name}!`
      : `${enemy.name} defeated ${player.username}...`;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);

    if (playerWon) {
      embed.addFields({
        name: 'Rewards',
        value: `+${xpGained} XP`,
        inline: false,
      });
    }

    return embed.setTimestamp();
  }

  /**
   * Create player stats embed - optimized for fast loading
   */
  static createPlayerStatsEmbed(player) {
    const summary = player.getSummary();
    const breakdown = player.getDetailedStatsBreakdown();
    const stats = breakdown.total;
    const pathTitle = player.narrativeChoice
      ? getNarrativeChoice(player.narrativeChoice)?.title
      : null;

    // Build damage breakdown text
    const damageBreakdown = [];
    if (breakdown.weaponDamage > 0) damageBreakdown.push(`Weapon: ${breakdown.weaponDamage}`);
    const strBonus = Math.floor(stats.strength * 0.5);
    if (strBonus > 0) damageBreakdown.push(`STR Bonus: ${strBonus}`);
    const damageText = damageBreakdown.length > 0 
      ? `**${breakdown.totalDamage}** (${damageBreakdown.join(' + ')})`
      : `**${breakdown.totalDamage}**`;

    // Build stat source text helper
    const buildStatText = (stat) => {
      const sources = [];
      if (breakdown.base[stat]) sources.push(`Base: ${breakdown.base[stat]}`);
      if (breakdown.classBonus[stat]) sources.push(`Class: +${breakdown.classBonus[stat]}`);
      if (breakdown.equipmentBonus[stat]) sources.push(`Equip: ${breakdown.equipmentBonus[stat] >= 0 ? '+' : ''}${breakdown.equipmentBonus[stat]}`);
      if (breakdown.setBonus[stat]) sources.push(`Set: +${breakdown.setBonus[stat]}`);
      if (breakdown.passiveSetBonus[stat]) sources.push(`Passive: +${breakdown.passiveSetBonus[stat]}`);
      if (breakdown.gatheringBonus[stat]) sources.push(`Gather: +${breakdown.gatheringBonus[stat]}`);
        if (breakdown.talentBonus?.[stat]) sources.push(`Talent: ${breakdown.talentBonus[stat] >= 0 ? '+' : ''}${breakdown.talentBonus[stat]}`);
      return `**${stats[stat]}**\n${sources.join(' | ')}`;
    };

    // Build potion buffs text
    const potionBuffsText = [];
    const pb = player.potionBuffs || {};
    
    if (pb.xpBonus && pb.xpRemaining > 0) {
      const capIcon = pb.xpBonus >= 500 ? '🔴' : '';
      potionBuffsText.push(`✨ +${pb.xpBonus}% XP (${pb.xpRemaining} uses) ${capIcon}`);
    }
    if (pb.goldBonus && pb.goldRemaining > 0) {
      const capIcon = pb.goldBonus >= 500 ? '🔴' : '';
      potionBuffsText.push(`💰 +${pb.goldBonus}% Gold (${pb.goldRemaining} uses) ${capIcon}`);
    }
    if (pb.lootBonus && pb.lootRemaining > 0) {
      const capIcon = pb.lootBonus >= 200 ? '🔴' : '';
      potionBuffsText.push(`🎁 +${pb.lootBonus}% Loot (${pb.lootRemaining} combats) ${capIcon}`);
    }
    if (pb.nextCombatHeal > 0) {
      const capIcon = pb.nextCombatHeal >= 5000 ? '🔴' : '';
      potionBuffsText.push(`💚 ${pb.nextCombatHeal} HP pre-heal ${capIcon}`);
    }
    if (pb.gatheringBonus && pb.gatheringExpires > Date.now()) {
      const minutesLeft = Math.ceil((pb.gatheringExpires - Date.now()) / 60000);
      const timeStr = minutesLeft > 60 
        ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m`
        : `${minutesLeft}m`;
      potionBuffsText.push(`⛏️ +${pb.gatheringBonus}% Gathering (${timeStr})`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`📊 ${player.username} - Detailed Stats`)
      .setDescription(
        `Level ${summary.level} ${summary.class ? `${summary.class.charAt(0).toUpperCase() + summary.class.slice(1)}` : 'Adventurer'}`
        + (pathTitle ? ` • Path: ${pathTitle}` : '')
      )
      .addFields(
        {
          name: '⚔️ Attack Damage',
          value: damageText,
          inline: true,
        },
        {
          name: '❤️ Health',
          value: `**${summary.hp}/${stats.hp}**`,
          inline: true,
        },
        {
          name: '💙 Mana',
          value: `**${summary.mana}/${stats.mana}**`,
          inline: true,
        },
        {
          name: '💪 Strength',
          value: buildStatText('strength'),
          inline: true,
        },
        {
          name: '🛡️ Defense',
          value: buildStatText('defense'),
          inline: true,
        },
        {
          name: '⚡ Agility',
          value: buildStatText('agility'),
          inline: true,
        },
        {
          name: '📚 Intelligence',
          value: buildStatText('intelligence'),
          inline: true,
        },
        {
          name: '❤️‍🩹 Vitality',
          value: buildStatText('vitality'),
          inline: true,
        },
        {
          name: '🧙 Wisdom',
          value: buildStatText('wisdom'),
          inline: true,
        }
      );

    // Add potion buffs if any are active
    if (potionBuffsText.length > 0) {
      embed.addFields({
        name: '🧪 Active Potion Buffs',
        value: potionBuffsText.join('\n') + '\n\n🔴 = At maximum cap',
        inline: false,
      });
    }

    return embed
      .setFooter({ text: 'Stats are calculated from base + class + equipment + sets + gathering skills' })
      .setTimestamp();
  }

  /**
   * Create leaderboard embed
   */
  static createLeaderboardEmbed(leaderboard) {
    let description = '';
    leaderboard.forEach((entry) => {
      description += `#${entry.rank} **${entry.username}** - Level ${entry.level}\n`;
    });

    return new EmbedBuilder()
      .setColor(0xffff00)
      .setTitle('🏆 Leaderboard')
      .setDescription(description || 'No players yet')
      .setTimestamp();
  }

  /**
   * Helper: Create health bar
   */
  static createHealthBar(percent) {
    const filled = Math.round(percent / 10);
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${percent}%`;
  }

  /**
   * Create quests embed - optimized for fast loading
   */
  static createQuestsEmbed(player, worldId, defenseQuests = []) {
    const world = getWorld(worldId);
    const { main, side, daily } = getQuestCategoriesByWorld(worldId);
    const playerLevel = player.level;

    const formatList = (list) => {
      return list.length > 0
        ? list.map(q => {
          const warning = q.minLevel > playerLevel ? ' ⚠️' : '';
          return `• **${q.name}** (Lvl ${q.minLevel}${warning})`;
        }).join('\n')
        : 'None available.';
    };

    const formatDefenseList = (list) => {
      return list.length > 0
        ? list.map(q => {
          const status = player.hasQuestFlag(q.id) ? '✅' : '🛡️';
          const warning = q.minLevel > playerLevel ? ' ⚠️' : '';
          return `${status} **${q.name}** (Lvl ${q.minLevel}${warning})`;
        }).join('\n')
        : 'None available.';
    };

    const description = [
      `**Main Quests**\n${formatList(main)}`,
      `\n**Side Quests**\n${formatList(side)}`,
      `\n**Daily Quests**\n${formatList(daily)}`,
      `\n**Town Defense**\n${formatDefenseList(defenseQuests)}`,
    ].join('\n');

    return new EmbedBuilder()
      .setColor(0x00aa00)
      .setTitle(`📜 Quests`)
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Create a quest detail embed
   */
  static createQuestDetailEmbed(quest, player) {
    const objectives = Array.isArray(quest.objectives) && quest.objectives.length > 0
      ? quest.objectives.map(o => `• ${o}`).join('\n')
      : 'No objectives listed.';

    const description = [
      `**What to do:**\n${objectives}`,
      '',
      `**Level Required:** ${quest.minLevel ?? 'N/A'}`,
      '',
      `**Description:**\n${quest.description || 'No description provided.'}`,
    ].join('\n');

    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📝 ${quest.name || quest.title || 'Quest Details'}`)
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Create shop embed
   */
  static createShopEmbed(unlockedTiers, getItemDisplayName) {
    let description = 'No shops unlocked yet. Defend a town to open vendors.';

    if (unlockedTiers.length > 0) {
      description = unlockedTiers.map((tier) => {
        const itemsText = tier.items
          .map(item => `• ${getItemDisplayName(item.id)} — ${item.price} gold`)
          .join('\n');
        return `**${tier.name}**\n_${tier.description}_\n${itemsText}`;
      }).join('\n\n');
    }

    return new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🛍️ Shops')
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Create dungeons embed - optimized for fast loading
   */
  static createDungeonsEmbed(playerLevel, worldId) {
    const world = getWorld(worldId);
    const worldName = world?.name || 'your current world';
    const dungeons = getAvailableDungeons(playerLevel, worldId);
    
    let dungeonList = 'No dungeons available in this world.';
    if (dungeons && dungeons.length > 0) {
      dungeonList = dungeons.map(d => {
        const floors = d.floors || 1;
        const floorText = floors > 1 ? ` • ${floors} Floors` : '';
        return `**${d.name}** (Lvl ${d.minLevel}+)${floorText}`;
      }).join('\n');
    }

    const description = `Dungeons are multi-room challenges filled with elite foes and a powerful boss at the end.\n\nEnter a dungeon to earn bonus XP, gold, and rare loot. Higher level dungeons have multiple floors to clear!\n\nCurrent world: **${worldName}**\n\n${dungeonList}\n\nSelect a dungeon below to begin.`;

    return new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle(`🏰 Dungeons`)
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Create world selection embed
   */
  static createWorldSelectionEmbed(playerLevel, unlockedWorlds, worldBossesDefeated = []) {
    let description = '';
    const worlds = getAllWorlds();

    // If no worlds in content system, fall back to old system (1-4)
    const worldsToShow = worlds.length > 0 ? worlds : 
      Array.from({length: 4}, (_, i) => {
        const world = getWorld(i + 1);
        return world ? { ...world, id: i + 1 } : null;
      }).filter(Boolean);

    for (const world of worldsToShow) {
      const worldId = world.id;
      const isUnlocked = unlockedWorlds.includes(worldId);
      const isMeetRequirements = playerLevel >= (world.minLevel || 1);
      
      // Check if world has a boss requirement
      let bossStatus = '';
      if (world.worldBoss) {
        const bossDefeated = worldBossesDefeated.includes(world.id);
        bossStatus = bossDefeated ? ' ⚔️ Boss Defeated' : ' 🔴 Boss: Not Defeated';
      }

      if (isUnlocked && (!world.worldBoss || worldBossesDefeated.includes(world.id))) {
        description += `✅ **${world.name}**${bossStatus} (Lvl ${world.minLevel || 1}+)\n${world.description || 'No description'}\n\n`;
      } else if (isMeetRequirements && (!world.worldBoss || worldBossesDefeated.includes(world.id))) {
        description += `🔓 **${world.name}**${bossStatus} - Level requirement met!\n${world.description || 'No description'}\n\n`;
      } else if (world.worldBoss && !worldBossesDefeated.includes(world.id)) {
        description += `🚫 **${world.name}**${bossStatus} - Defeat the boss to progress!\n${world.description || 'No description'}\n\n`;
      } else {
        description += `🔒 **${world.name}** (Requires Level ${world.minLevel || 1})\n${world.description || 'No description'}\n\n`;
      }
    }

    return new EmbedBuilder()
      .setColor(0x9900ff)
      .setTitle('🌍 Worlds')
      .setDescription(description || 'No worlds available')
      .setTimestamp();
  }

  /**
   * Create class selection embed
   */
  static createClassSelectionEmbed() {
    const statLabelMap = {
      strength: 'STR',
      defense: 'DEF',
      agility: 'AGI',
      intelligence: 'INT',
      vitality: 'VIT',
      wisdom: 'WIS',
      hp: 'HP',
      mana: 'MANA',
    };

    const getPathHint = (baseStats = {}) => {
      const ranked = Object.entries(baseStats)
        .filter(([, value]) => typeof value === 'number')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([key]) => statLabelMap[key] || key.toUpperCase());
      return ranked.length > 0 ? `Boost focus: ${ranked.join(' / ')}` : 'Boost focus: Balanced';
    };

    const classInfo = getAllNarrativeChoices().map((choice) => ({
      name: `${choice.title}`,
      value: `${choice.narrativeText}\n*${choice.flavorText}*\n_${getPathHint(choice.baseStats)}_`,
      inline: false,
    }));

    return new EmbedBuilder()
      .setColor(0xff6b6b)
      .setTitle('📖 Choose Your Path')
      .setDescription('Select the story that defines how your AI will fight:')
      .addFields(classInfo)
      .setTimestamp();
  }

  /**
   * Create world entry embed
   */
  static createWorldEntryEmbed(worldId) {
    const world = getWorld(worldId);
    if (!world) {
      return new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('🌍 Unknown World')
        .setDescription('This world could not be found.')
        .setTimestamp();
    }

    return new EmbedBuilder()
      .setColor(0x6a5acd)
      .setTitle(`🌍 Entering ${world.name}`)
      .setDescription(world.description)
      .addFields(
        {
          name: 'Level Range',
          value: `${world.minLevel} - ${world.maxLevel}`,
          inline: true,
        },
        {
          name: 'Status',
          value: 'Tier 1 unlocked ✅',
          inline: true,
        }
      )
      .setTimestamp();
  }

  /**
   * Create character sheet embed - optimized for fast loading
   */
  static createCharacterSheetEmbed(player) {
    const summary = player.getSummary();
    const stats = player.getStats();

    return new EmbedBuilder()
      .setColor(0x4a90e2)
      .setTitle(`📋 ${player.username}`)
      .addFields(
        { name: 'Class', value: summary.class || 'None', inline: true },
        { name: 'Level', value: `${summary.level}`, inline: true },
        { name: 'Gold', value: `${summary.gold}`, inline: true },
        { name: '⚔️ STR', value: `${stats.strength}`, inline: true },
        { name: '🛡️ DEF', value: `${stats.defense}`, inline: true },
        { name: '⚡ AGI', value: `${stats.agility}`, inline: true },
        { name: '📚 INT', value: `${stats.intelligence}`, inline: true },
        { name: '❤️ VIT', value: `${stats.vitality}`, inline: true },
        { name: '🧙 WIS', value: `${stats.wisdom}`, inline: true }
      )
      .setTimestamp();
  }

  /**
   * Create equipment/inventory embed - optimized for fast loading
   */
  static createEquipmentEmbed(player) {
    let equipped = 'None';
    if (player.equippedItems && Object.keys(player.equippedItems).length > 0) {
      equipped = Object.entries(player.equippedItems)
        .map(([slot, itemId]) => {
          const equipment = getEquipment(itemId);
          const name = equipment?.name || itemId;
          const upgradeLevel = player.equipmentUpgrades?.[slot] || 0;
          const upgradeText = upgradeLevel > 0 ? ` +${upgradeLevel}` : '';
          return `**${slot}**: ${name}${upgradeText}`;
        })
        .join('\n');
    }

    let inventory = 'Empty';
    if (player.inventory && player.inventory.length > 0) {
      // Summarize instead of listing all items
      const itemCount = player.inventory.length;
      const equipCount = player.inventory.filter(i => !i.type || i.type !== 'material').length;
      const matCount = player.inventory.filter(i => i.type === 'material').length;
      inventory = `${equipCount} items, ${matCount} materials (${itemCount} total)`;
    }

    return new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle('🎒 Inventory')
      .addFields(
        { name: 'Equipped', value: equipped, inline: true },
        { name: 'Count', value: inventory, inline: true }
      )
      .setTimestamp();
  }

  /**
   * Create skills embed
   */
  static createSkillsEmbed(player) {
    let skillsText = 'No skills learned';

    if (player.skills && player.skills.length > 0) {
      skillsText = player.skills
        .map((skillId) => {
          const skill = getSkill(skillId);
          if (!skill) return skillId;
          
          let skillLine = `**${skill.name}** (Mana: ${skill.manaCost}, CD: ${skill.cooldown}s)`;
          
          // Add passive bonuses if they exist
          if (skill.passiveBonuses && Object.keys(skill.passiveBonuses).length > 0) {
            const bonusStrings = [];
            Object.entries(skill.passiveBonuses).forEach(([stat, value]) => {
              if (value > 0) {
                bonusStrings.push(`+${value} ${stat.toUpperCase()}`);
              }
            });
            if (bonusStrings.length > 0) {
              skillLine += ` | *Passive: ${bonusStrings.join(', ')}*`;
            }
          }
          
          return skillLine;
        })
        .join('\n');
    }

    return new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('✨ Skills')
      .setDescription(skillsText)
      .setTimestamp();
  }

  /**
   * Create professions embed
   */
  static createProfessionsEmbed(player) {
    let profText = 'No professions learned';

    if (player.professions && player.professions.length > 0) {
      profText = player.professions
        .map((profId) => {
          const level = player.professionLevels[profId] || 0;
          return `**${profId}** - Level ${level}`;
        })
        .join('\n');
    }

    const slotsText = `${player.professions?.length || 0}/${player.maxProfessions || 1}`;

    return new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('🔨 Professions')
      .addFields(
        { name: 'Slots', value: slotsText, inline: true },
        { name: 'Learned', value: profText, inline: false }
      )
      .setTimestamp();
  }

  /**
   * Create crafting/forge embed - optimized for fast loading
   * Only shows material counts (no detailed recipe info - that's in buttons)
   */
  static createCraftingEmbed(player, selectedRecipe = null) {
    const materialCounts = {};
    if (player.inventory && player.inventory.length > 0) {
      for (const item of player.inventory) {
        if (!item || typeof item !== 'object') continue;
        const isGem = item.id ? getGem(item.id) : null;
        if (item.type === 'material' || isGem) {
          materialCounts[item.id] = (materialCounts[item.id] || 0) + (item.quantity || 1);
        }
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('🔥 Crafting Station')
      .setDescription(
        '**Craft and combine materials into powerful equipment!**\n\n' +
        '🔨 **How to Craft:**\n' +
        '1. Select a recipe from the menu\n' +
        '2. Check if you have enough materials\n' +
        '3. Click to craft the item\n\n' +
        '📦 **Get Materials From:**\n' +
        '⛏️ Mining • 🪓 Chopping • 🌿 Gathering • 💼 Professions'
      );

    // If a recipe is selected, show its full details with material check
    if (selectedRecipe) {
      const recipe = typeof selectedRecipe === 'string' ? RECIPES[selectedRecipe] : selectedRecipe;
      if (recipe) {
        // Get equipment/item stats
        const equipment = getEquipment(recipe.output.item);
        const item = getItemByIdForBot(recipe.output.item);
        
        // Build stats display
        let statsText = 'No stat bonuses';
        const stats = equipment?.bonuses || equipment?.stats || item?.stats;
        if (stats && typeof stats === 'object') {
          const statLines = [];
          if (stats.strength) statLines.push(`⚔️ STR: +${stats.strength}`);
          if (stats.defense) statLines.push(`🛡️ DEF: +${stats.defense}`);
          if (stats.agility) statLines.push(`⚡ AGI: +${stats.agility}`);
          if (stats.intelligence) statLines.push(`📚 INT: +${stats.intelligence}`);
          if (stats.vitality) statLines.push(`❤️ VIT: +${stats.vitality}`);
          if (stats.wisdom) statLines.push(`🧙 WIS: +${stats.wisdom}`);
          if (statLines.length > 0) statsText = statLines.join('\n');
        }

        // Build materials required display with sufficiency check
        let materialsReqText = 'None';
        let canCraft = true;
        if (recipe.materials && typeof recipe.materials === 'object') {
          materialsReqText = Object.entries(recipe.materials)
            .map(([matId, qty]) => {
              const mat = getMaterial(matId);
              const gem = mat ? null : getGem(matId);
              const owned = materialCounts[matId] || 0;
              const hasEnough = owned >= qty;
              if (!hasEnough) canCraft = false;
              
              // Show where to get the material
              let sourceInfo = '';
              if (mat?.gatheringType) {
                const gatherIcons = { Mining: '⛏️', Chopping: '🪓', Herbing: '🌿' };
                sourceInfo = ` (${gatherIcons[mat.gatheringType] || ''} ${mat.gatheringType})`;
              }
              
              const matName = mat?.name || gem?.name || matId;
              return `${hasEnough ? '✅' : '❌'} ${matName}: ${owned}/${qty}${sourceInfo}`;
            })
            .join('\n');
        }

        const craftStatus = canCraft ? '✅ **Ready to Craft!**' : '❌ **Not Enough Materials**';
        
        embed.addFields(
          { name: '📋 Selected Recipe', value: `**${recipe.name}**\nLevel Required: ${recipe.level}`, inline: false },
          { name: craftStatus, value: materialsReqText, inline: false },
          { name: '📊 Item Stats', value: statsText, inline: true }
        );
        
        // Add note about gathering areas if missing materials
        if (!canCraft) {
          embed.addFields({
            name: '💡 Missing Materials?',
            value: 'Click the gathering area buttons below to gather the materials you need!',
            inline: false,
          });
        }
      }
    } else {
      embed.addFields(
        { name: 'Select a Recipe', value: 'Choose a recipe from the menu below to see materials needed and craft it.', inline: false }
      );
    }

    return embed.setTimestamp();
  }

  /**
   * Create raids embed
   */
  static createRaidsEmbed(playerLevel, worldId) {
    const raids = getRaidsByWorld(worldId) || [];

    let description = 'Raids are epic multi-boss encounters with increasing difficulty. Higher level raids have multiple floors to conquer!\n\n';
    
    if (raids.length > 0) {
      description += raids.map(r => {
        const floors = r.floors || 1;
        const floorText = floors > 1 ? ` • ${floors} Floors` : '';
        const bossCount = r.bosses?.length || 0;
        return `**${r.name}** (Lvl ${r.minLevel}+)${floorText} • ${bossCount} Bosses`;
      }).join('\n');
    } else {
      description += 'No raids available in this world.';
    }

    return new EmbedBuilder()
      .setColor(0xd35400)
      .setTitle('⚔️ Raids')
      .setDescription(description)
      .setTimestamp();
  }

  /**
   * Create world boss challenge embed
   */
  static createWorldBossEmbed(boss) {
    const bossHp = boss.hp ?? boss.health ?? boss.level * 120;
    const reward = boss.reward || (boss.xpReward ? `+${boss.xpReward} XP` : 'Great rewards await!');
    return new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle(`👹 ${boss.name}`)
      .setDescription(boss.description || 'A powerful world boss')
      .addFields(
        { name: 'Level', value: `${boss.level}`, inline: true },
        { name: 'HP', value: `${bossHp}`, inline: true },
        { name: 'Reward', value: reward, inline: true }
      )
      .setTimestamp();
  }

  /**
   * Create gathering result embed - optimized for speed
   */
  static createGatheringResultEmbed(skill, xpGained, levelsGained, newLevel, materials, minutesWaited = 0) {
    // Pre-compute everything needed for the embed
    const rareChancePercent = Math.min(minutesWaited * 10, 100);
    const levelUpText = levelsGained > 0 ? `\n**🎉 Level Up! +${levelsGained} Levels**` : '';
    const bonusText = minutesWaited > 0
      ? `\n⏱️ **Time Bonus:** +${rareChancePercent}% rare drop chance (waited ${minutesWaited}m)`
      : '\n⏱️ No time bonus yet - wait longer for rarer drops!';

    // Single pass for materials text
    let materialsText;
    if (materials.length > 0) {
      materialsText = materials.map(mat => `• ${mat.name} x${mat.quantity}`).join('\n');
    } else {
      materialsText = 'No materials found.';
    }

    return new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle(`${skill.icon} ${skill.name} Complete!`)
      .setDescription(`You gathered resources and gained **+${xpGained} XP**!${levelUpText}${bonusText}`)
      .addFields(
        {
          name: '🧰 Materials Found',
          value: materialsText,
          inline: false,
        },
        {
          name: `${skill.name} Level`,
          value: `${newLevel}`,
          inline: true,
        },
        {
          name: '📈 Progress',
          value: `${xpGained}/${getGatheringXpToNextLevel(newLevel)} XP`,
          inline: true,
        }
      )
      .setTimestamp();
  }

  /**
   * Create gathering cooldown embed (deprecated - now uses time bonus instead)
   */
  static createGatheringCooldownEmbed(skill, minutesRemaining) {
    return new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle(`${skill.icon} ${skill.name} - On Cooldown`)
      .setDescription(`You need a short rest before gathering again.`)
      .addFields({
        name: 'Available in:',
        value: `**${minutesRemaining}m**`,
        inline: false,
      })
      .setTimestamp();
  }

  static createAlchemyEmbed(player, selectedRecipe = null) {
    const materialCounts = {};
    if (player.inventory && player.inventory.length > 0) {
      for (const item of player.inventory) {
        if (item && typeof item === 'object' && item.type === 'material') {
          materialCounts[item.id] = (materialCounts[item.id] || 0) + (item.quantity || 1);
        }
      }
    }

    let materialsText;
    const entries = Object.entries(materialCounts);
    if (entries.length > 0) {
      materialsText = entries
        .map(([id, qty]) => `• ${getMaterial(id)?.name || id}: ${qty}`)
        .join('\n');
    } else {
      materialsText = 'No materials yet - run Adventures to gather!';
    }

    const botanicLevel = player.professionLevels?.botanic || 0;
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🧪 Alchemy Brewing Station')
      .setDescription(`**Botanic Level: ${botanicLevel}**\n💡 Tip: Get materials from 🌿 **Gathering** in Adventures!`)
      .addFields({
        name: 'Materials Inventory',
        value: materialsText,
        inline: false
      });

    if (selectedRecipe) {
      const recipe = typeof selectedRecipe === 'string' ? RECIPES[selectedRecipe] : selectedRecipe;
      if (recipe) {
        const mats = Object.entries(recipe.materials || {})
          .map(([id, qty]) => `• ${getMaterial(id)?.name || id} x${qty}`)
          .join('\n');
        embed.addFields({
          name: 'Required Materials',
          value: mats || 'Unknown',
          inline: true
        });
      }
    }

    return embed;
  }

  static createEnchantmentEmbed(player, selectedRecipe = null) {
    const materialCounts = {};
    if (player.inventory && player.inventory.length > 0) {
      for (const item of player.inventory) {
        if (item && typeof item === 'object' && item.type === 'material') {
          materialCounts[item.id] = (materialCounts[item.id] || 0) + (item.quantity || 1);
        }
      }
    }

    let materialsText;
    const entries = Object.entries(materialCounts);
    if (entries.length > 0) {
      materialsText = entries
        .map(([id, qty]) => `• ${getMaterial(id)?.name || id}: ${qty}`)
        .join('\n');
    } else {
      materialsText = 'No materials yet - run Adventures to gather!';
    }

    const enchanterLevel = player.professionLevels?.enchanter || 0;
    const embed = new EmbedBuilder()
      .setColor(0x8e44ad)
      .setTitle('✨ Enchantment Station')
      .setDescription(`**Enchanter Level: ${enchanterLevel}**\n💡 Tip: Get materials from ⛏️ **Mining** and 🪓 **Chopping** in Adventures!`)
      .addFields({
        name: 'Materials Inventory',
        value: materialsText,
        inline: false
      });

    if (selectedRecipe) {
      const recipe = typeof selectedRecipe === 'string' ? RECIPES[selectedRecipe] : selectedRecipe;
      if (recipe) {
        const mats = Object.entries(recipe.materials || {})
          .map(([id, qty]) => `• ${getMaterial(id)?.name || id} x${qty}`)
          .join('\n');
        embed.addFields({
          name: 'Required Materials',
          value: mats || 'Unknown',
          inline: true
        });
      }
    }

    return embed;
  }

}

export default UIBuilder;
