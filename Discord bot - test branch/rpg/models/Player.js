/**
 * Player Model - Core player data and progression
 * Handles stats, XP, leveling, and player state
 */

import { getClass, getSkill } from '../data/classes.js';
import { getNarrativeChoice } from '../data/narrative-classes.js';
import { getEquipment, calculateSetBonuses, calculateOwnedSetBonuses } from '../data/equipment.js';
import { getFirstWorldId } from '../data/worlds.js';
import { calculateGatheringBoosts } from '../data/gathering.js';
import { getTalent } from '../data/talents.js';
import { loadBalanceData } from '../data/balance.js';

export default class Player {
  constructor(userId, username) {
    // V8 optimization: Initialize ALL properties in same order always (creates hidden class)
    // This makes property access 2-3x faster
    this.userId = userId;
    this.username = username;
    this.createdAt = Date.now();

    // Progression
    this.level = 1;
    this.xp = 0;
    const balance = loadBalanceData();
    const base = Number(balance.levelXpBase) || 120;
    const growth = Number(balance.levelXpGrowth) || 1.15;
    this.xpToNextLevel = Math.floor(base * Math.pow(growth, this.level));
    this.gold = 0;

    // Class and Skills (Tier 3)
    this.class = null; // Selected class (warrior, mage, rogue, paladin)
    this.narrativeChoice = null;
    this.internalClass = null;
    this.classUnlocked = false;
    this.characterCreated = false;
    this.skills = []; // Array of skill IDs player has learned
    this.skillCooldowns = {}; // Track skill cooldowns { skillId: turnsRemaining }
    this.skillPoints = 0; // Unspent skill points (earned every 2 levels)
    this.skillLevels = {}; // Track skill upgrade levels { skillId: level (1-3) }

    // Equipment (Tier 3)
    this.equippedItems = {}; // { slot: itemId } (weapon, chest, etc)
    this.inventory = []; // Items in backpack
    this.equipmentSets = []; // Saved equipment loadouts { name, items: { slot: itemId } }
    
    // Professions (Tier 3)
    this.maxProfessions = 1; // Starting profession slots
    this.professions = []; // Array of profession IDs
    this.professionLevels = { blacksmith: 1 }; // { professionId: level } - all players start with blacksmith level 1
    this.professionXp = {}; // { professionId: xpAmount }
    this.craftingQueue = []; // Items being crafted
    this.gatheringRewardsClaimedLevel = 0; // Highest gathering reward level granted

    // Talents (passive stat boosts)
    this.talents = {}; // { talentId: rank }
    this.talentPoints = 0; // Earned on level up

    // Arena system
    this.arenaPoints = 0; // Points earned from arena fights
    this.arenaWins = 0; // Count of arena victories
    this.arenaLosses = 0; // Count of arena defeats

    // Equipment upgrades
    this.equipmentUpgrades = {}; // { slot: level }
    this.equipmentEnchants = {}; // { slot: { enchantType: level } } - supports up to 2 types per slot, max +10 each
    
    // Master Blacksmith upgrade (Asgard exclusive)
    this.masterBlacksmith = false; // Unlocks gem socketing and crafting
    this.socketedGems = {}; // { slot: { socket1: gemId, socket2: gemId } }

    // UI Navigation
    this.currentMenu = 'main'; // Track current menu for back button
    this.menuHistory = []; // Stack of previous menus

    // Core Stats (base - persist across levels)
    this.strength = 10;
    this.defense = 10;
    this.agility = 10;
    this.intelligence = 10;
    this.vitality = 10;
    this.wisdom = 10;
    this.maxHp = 100;
    this.maxMana = 50;
    this.hp = 100;
    this.mana = 50;

    // Boss battle progression (separate from normal stats)
    this.bossStats = {
      strength: 5,
      defense: 5,
      agility: 5,
      intelligence: 5,
      vitality: 5,
      wisdom: 5,
      maxHp: 100,
      maxMana: 50,
    };
    this.bossSkills = []; // Boss-only skill unlocks
    this.bossSkillLevels = {}; // { skillId: level }
    this.bossTalents = {}; // { talentId: rank }
    this.bossEnchantRecipesUnlocked = []; // ['boss_damage_enchant_t4', ...]
    this.bossShopSpent = { gold: 0, bossEssence: 0 };
    this._bossSnapshot = null; // Restore normal stats after boss combat

    // Combat state
    this.isInCombat = false;
    this.currentEnemy = null;
    this.currentEffects = []; // Active status effects
    this.party = {
      maxSize: 4,
      activeIndex: 0,
      members: [
        {
          userId: this.userId,
          name: this.username,
          classId: this.class || this.internalClass,
          role: 'leader',
        },
      ],
    };
    this.aiTendencies = {
      aggression: 0.5,
      riskTaking: 0.5,
      skillUsage: 0.5,
      resourceConservation: 0.5,
      defensivePriority: 0.5,
      finisherUsage: 0.5,
    };
    this.questFlags = {};

    // World progression
    const firstWorldId = getFirstWorldId();
    this.currentWorld = firstWorldId;
    this.worldsUnlocked = [firstWorldId];
    this.worldBossesDefeated = []; // Track defeated world bosses

    // Tutorial & Story
    this.tutorialCompleted = false;
    this.storyProgress = 0; // 0 = start, 1 = after intro story, etc

    // Adventure system
    this.lastAdventureTime = 0; // Timestamp of last adventure
    this.adventureCooldown = 120000; // 2 minutes in ms

    // Gathering Skills
    this.gatheringLevels = {
      mining: 1,
      chopping: 1,
      gathering: 1,
    };
    this.gatheringXp = {
      mining: 0,
      chopping: 0,
      gathering: 0,
    };
    this.lastGatherTime = {
      mining: 0,
      chopping: 0,
      gathering: 0,
    };

    // Auto-gather system
    this.isAutoGathering = false;
    this.autoGatherSkill = null; // 'mining', 'chopping', or 'gathering'
    this.autoGatherStartTime = 0;
    this.autoGatherCount = 0;
    this.autoGatherTotalXp = 0;
    this.autoGatherMaterials = {}; // { materialId: quantity }
    this.autoGatherIntervalId = null; // For clearing interval
    this.autoGatherMessageId = null; // Discord message ID for updates
    this.autoGatherChannelId = null; // Discord channel ID for updates

    // Adventurers Guild System
    this.guildRank = 'F'; // Current guild rank (F, E, D, C, B, A, S)
    this.guildXP = 0; // XP towards next rank
    this.activeBounties = []; // Active bounty IDs
    this.completedBounties = []; // Completed bounty IDs
    this.lastWeeklyReward = 0; // Timestamp of last weekly reward claim
    this.claimedQuests = []; // IDs of claimed limited quests
    this.limitedQuestsCompleted = []; // Limited quest IDs completed
    this.dailyQuestsCompleted = []; // Quest IDs completed today
    this.weeklyQuestsCompleted = []; // Quest IDs completed this week
    this.lastDailyReset = Date.now(); // Last time daily quests reset
    this.lastWeeklyReset = Date.now(); // Last time weekly quests reset
    this.guildQuestProgress = {}; // { questId: { count, updatedAt } }

    // Guild boss attempts (daily reset)
    this.guildBossAttemptsToday = 0;
    this.guildBossAttemptResetAt = Date.now();

    // Achievements
    this.achievementRewardsClaimed = {}; // { achievementId: { tierId: true } }

    // Progress stats
    this.progressStats = {
      monstersDefeated: 0,
      gatheringActions: 0,
      materialsCollected: 0,
      craftsCompleted: 0,
      goldEarned: 0,
      criticalHits: 0,
      dungeonsCleared: 0,
      raidsCleared: 0,
    };

    // Tier 1-4 QOL Features Persistence
    // Daily Quest Tracker
    this.questData = {
      daily: [],
      weekly: [],
      totalClaimedRewards: 0,
      lastReset: Date.now()
    };

    // Damage Tracker
    this.damageHistory = {
      sessions: [],
      weeklyTotal: 0,
      dailyBreakdown: [0, 0, 0, 0, 0, 0, 0]
    };

    // Boss Weakness Analyzer
    this.bossStats = {
      encounters: {}, // { bossName: { winRate, difficulty, encounters } }
      elementalStats: {} // { element: { effectiveness } }
    };

    // Loot Analytics
    this.lootHistory = {
      drops: [],
      enemyEncounters: {},
      dropRates: {}
    };

    // Skill Mastery
    this.skillMastery = {
      skills: {}, // { skillId: { level, usageCount, variants } }
      masteriesAchieved: 0,
      unlockedVariants: []
    };

    // Favorite Item Loadout
    this.favorites = {
      items: [] // Array of { name, slot, stats }
    };

    // Notification System
    this.notifications = {
      list: [],
      preferences: {
        levelUp: true,
        skillMastery: true,
        bossDefeated: true,
        guildEvents: true,
        questComplete: true,
        equipmentUpgrade: true,
        milestones: true
      },
      unreadCount: 0
    };

    // Enemy Encyclopedia
    this.encyclopedia = {
      enemies: {}, // { enemyName: { encounters, winRate, rarity, trophyProgress } }
      trophies: [] // Array of completed trophy sets
    };

    // Command Hotkeys / Shorthand Tips
    this.hotkeys = {
      custom: {}, // { key: commandName }
      recentlyUsed: [],
      favorites: []
    };

    // Crafting Queue
    this.craftingQueue = {
      queue: [],
      processing: null,
      totalCrafted: 0
    };

    // Auto-Sell Junk Settings
    this.autoSellSettings = {
      enabled: false,
      rarityFilters: [],
      excludedItems: [],
      itemsSold: 0,
      totalGoldEarned: 0
    };

    // UI Theme Manager
    this.uiTheme = {
      currentTheme: 'dark',
      customColors: null,
      fontSize: 'medium',
      animationsEnabled: true,
      layout: 'default'
    };

    // Session Statistics
    this.sessionStats = {
      activeSessions: [],
      completedSessions: [],
      totalPlayTime: 0
    };

    // Timezone Support
    this.timezone = 'UTC';

    // Additional feature tracking
    this.featureUsageStats = {
      timezoneConversions: 0,
      themeChanges: 0,
      fastCraft: 0,
      autoSellActivations: 0
    };

    // Roguelike Dungeon System (Tier 2+ only)
    this.roguelikeCurrencies = {
      currencyA: 0, // Permanent roguelike upgrades
      currencyB: 0, // Room upgrades inside roguelike
      currencyC: 0, // Player upgrades outside dungeon
    };

    this.roguelikeState = null; // Active run state or null
    this.roguelikeUpgrades = {
      // Permanent stat upgrades purchased with currency A
      maxHealthBonus: 0,
      maxManaBonus: 0,
      damageBonus: 0,
      defenseBonus: 0,
      critChanceBonus: 0,
      critDamageBonus: 0,
      agilityBonus: 0,
      intelligenceBonus: 0,
      luckBonus: 0,
      experienceBonus: 0,
      goldFindBonus: 0,
      startingCurrencyB: 0,
    };

    this.roguelikeStats = {
      totalRunsCompleted: 0,
      highestFloorReached: 0,
      totalCurrencyEarned: { A: 0, B: 0, C: 0 },
      bossesDefeated: 0,
      voluntaryExits: 0,
      deathCount: 0,
    };

    // === NEW TRACKING FIELDS ===

    // Last active timestamp (updated on every RPG command)
    this.lastActive = Date.now();

    // Level-up history with timestamps
    this.levelUpHistory = []; // [{ level, timestamp }]

    // Gold spending tracker (counterpart to progressStats.goldEarned)
    this.goldSpentTotal = 0;
    this.goldSpentBreakdown = {
      shop: 0,        // Boss shop, guild shop, gathering tools
      crafting: 0,    // Crafting costs
      gambling: 0,    // Slots, coinflip
      guild: 0,       // Guild creation, donations
      upgrades: 0,    // Equipment upgrades, enchants
      marketplace: 0, // Player marketplace purchases
      other: 0        // Misc (streak restore, etc.)
    };

    // Combat log (win/loss by enemy)
    this.combatRecord = {
      totalWins: 0,
      totalLosses: 0,
      totalForfeits: 0,
      byEnemy: {},     // { "Goblin": { wins: 0, losses: 0 }, ... }
      byType: {        // By combat type
        normal: { wins: 0, losses: 0 },
        boss: { wins: 0, losses: 0 },
        worldBoss: { wins: 0, losses: 0 },
        dungeon: { wins: 0, losses: 0 },
        arena: { wins: 0, losses: 0 },
        guildBoss: { wins: 0, losses: 0 },
        raid: { wins: 0, losses: 0 }
      }
    };

    // Skill usage tracking
    this.skillUsageStats = {}; // { "Fireball": { timesUsed: 0, totalDamage: 0 }, ... }

    // Death log (last 50 deaths)
    this.deathLog = []; // [{ enemy, enemyLevel, playerLevel, timestamp, type }]

    // Trade/market history (last 50 trades)
    this.tradeHistory = []; // [{ type: 'buy'|'sell'|'list', item, price, partner, timestamp }]

    // Crafting success/fail tracking
    this.craftingRecord = {
      totalAttempts: 0,
      successes: 0,
      failures: 0,
      byRecipe: {} // { "Iron Sword": { attempts: 0, successes: 0 } }
    };
  }

  // Get current stats (including equipment and class bonuses)
  getStats() {
    // Return cached stats if they exist (cache expires after interaction)
    if (this._statsCache) {
      if (this.hp > this._statsCache.hp) {
        this.hp = this._statsCache.hp;
      }
      return this._statsCache;
    }

    let stats = {
      hp: this.maxHp,
      mana: this.maxMana,
      strength: this.strength,
      defense: this.defense,
      agility: this.agility,
      intelligence: this.intelligence,
      vitality: this.vitality,
      wisdom: this.wisdom,
    };
    
    // Apply class bonuses only when class is unlocked
    if (this.class && this.classUnlocked) {
      const playerClass = getClass(this.class);
      if (playerClass && playerClass.statBonuses) {
        const bonuses = playerClass.statBonuses;
        stats.strength += bonuses.strength || 0;
        stats.defense += bonuses.defense || 0;
        stats.agility += bonuses.agility || 0;
        stats.intelligence += bonuses.intelligence || 0;
        stats.vitality += bonuses.vitality || 0;
        stats.wisdom += bonuses.wisdom || 0;
        stats.hp += bonuses.hp || 0;
        stats.mana += bonuses.mana || 0;
      }
    }
    
    // Apply equipment bonuses
    if (this.equippedItems) {
      for (const [slot, itemId] of Object.entries(this.equippedItems)) {
        const equipment = getEquipment(itemId);
        if (equipment && equipment.bonuses) {
          const bonuses = equipment.bonuses;
          const upgradeLevel = this.equipmentUpgrades?.[slot] || 0;
          
          // Calculate total enchant level from all enchant types on this slot
          let totalEnchantLevel = 0;
          const slotEnchants = this.equipmentEnchants?.[slot];
          if (slotEnchants && typeof slotEnchants === 'object') {
            // New structure: { damage: 5, xp: 3, boss_damage: 4 }
            totalEnchantLevel = Object.values(slotEnchants).reduce((sum, level) => sum + (level || 0), 0);
          } else if (typeof slotEnchants === 'number') {
            // Old structure for backward compatibility
            totalEnchantLevel = slotEnchants;
          }
          
          const upgradeMult = 1 + (upgradeLevel * 0.1) + (totalEnchantLevel * 0.05);

          stats.strength += Math.round((bonuses.strength || 0) * upgradeMult);
          stats.defense += Math.round((bonuses.defense || 0) * upgradeMult);
          stats.agility += Math.round((bonuses.agility || 0) * upgradeMult);
          stats.intelligence += Math.round((bonuses.intelligence || 0) * upgradeMult);
          stats.vitality += Math.round((bonuses.vitality || 0) * upgradeMult);
          stats.wisdom += Math.round((bonuses.wisdom || 0) * upgradeMult);
          stats.hp += Math.round((bonuses.hp || 0) * upgradeMult);
          stats.mana += Math.round((bonuses.mana || 0) * upgradeMult);
        }
      }
    }

    // Apply equipped set bonuses
    const equippedIds = Object.values(this.equippedItems || {});
    const setBonuses = calculateSetBonuses(equippedIds);
    Object.keys(setBonuses).forEach((stat) => {
      stats[stat] = (stats[stat] || 0) + (setBonuses[stat] || 0);
    });

    // Apply passive set bonuses from owned full sets
    const ownedSetBonuses = calculateOwnedSetBonuses(this.inventory || [], this.equippedItems || {});
    Object.keys(ownedSetBonuses).forEach((stat) => {
      stats[stat] = (stats[stat] || 0) + (ownedSetBonuses[stat] || 0);
    });

    // Apply gathering skill boosts
    const gatheringBoosts = calculateGatheringBoosts(this.gatheringLevels);
    stats.strength += gatheringBoosts.strength || 0;
    stats.agility += gatheringBoosts.agility || 0;
    stats.intelligence += gatheringBoosts.intelligence || 0;

    // Apply skill passive bonuses (talents)
    if (this.skills && Array.isArray(this.skills)) {
      for (const skillId of this.skills) {
        const skill = getSkill(skillId);
        if (skill?.passiveBonuses) {
          Object.keys(skill.passiveBonuses).forEach(stat => {
            stats[stat] = (stats[stat] || 0) + (skill.passiveBonuses[stat] || 0);
          });
        }
      }
    }

    // Apply talent bonuses
    if (this.talents) {
      Object.entries(this.talents).forEach(([talentId, rank]) => {
        const talent = getTalent(talentId);
        if (!talent?.bonuses) return;
        Object.entries(talent.bonuses).forEach(([stat, value]) => {
          stats[stat] = (stats[stat] || 0) + (value * rank);
        });
      });
    }

    // Clamp HP to computed max to avoid showing over-cap values
    stats.hp = Math.max(1, stats.hp || 1);
    if (this.hp > stats.hp) {
      this.hp = stats.hp;
    }
    
    // Cache the result for this interaction
    this._statsCache = stats;
    return stats;
  }

  /**
   * Clear stats cache (call after stat-modifying actions)
   */
  clearStatsCache() {
    this._statsCache = null;
  }

  /**
   * Get detailed stats breakdown showing sources (base, class, equipment, sets, gathering)
   */
  getDetailedStatsBreakdown() {
    // Base stats
    const base = {
      strength: this.strength,
      defense: this.defense,
      agility: this.agility,
      intelligence: this.intelligence,
      vitality: this.vitality,
      wisdom: this.wisdom,
      hp: this.maxHp,
      mana: this.maxMana,
    };

    // Class bonuses
    const classBonus = {
      strength: 0, defense: 0, agility: 0, intelligence: 0,
      vitality: 0, wisdom: 0, hp: 0, mana: 0,
    };
    if (this.class && this.classUnlocked) {
      const playerClass = getClass(this.class);
      if (playerClass?.statBonuses) {
        Object.keys(classBonus).forEach(stat => {
          classBonus[stat] = playerClass.statBonuses[stat] || 0;
        });
      }
    }

    // Equipment bonuses
    const equipmentBonus = {
      strength: 0, defense: 0, agility: 0, intelligence: 0,
      vitality: 0, wisdom: 0, hp: 0, mana: 0,
    };
    let weaponDamage = 0;
    if (this.equippedItems) {
      for (const [slot, itemId] of Object.entries(this.equippedItems)) {
        const equipment = getEquipment(itemId);
        if (equipment) {
          const bonuses = equipment.bonuses || equipment.stats || {};
          const upgradeLevel = this.equipmentUpgrades?.[slot] || 0;
          const upgradeMult = 1 + (upgradeLevel * 0.1);
          Object.keys(equipmentBonus).forEach(stat => {
            equipmentBonus[stat] += Math.round((bonuses[stat] || 0) * upgradeMult);
          });

          // Calculate weapon damage
          if (slot === 'weapon' && bonuses.strength) {
            weaponDamage = Math.round((bonuses.strength || 0) * upgradeMult);
          }
        }
      }
    }

    // Apply class-based main stat scaling to equipment bonuses
    if (this.class && this.classUnlocked) {
      const playerClass = getClass(this.class);
      if (playerClass?.mainStat && equipmentBonus[playerClass.mainStat]) {
        // Apply 50% bonus to main stat from equipment
        const mainStatBonus = Math.round(equipmentBonus[playerClass.mainStat] * 0.5);
        equipmentBonus[playerClass.mainStat] += mainStatBonus;
      }
    }

    // Set bonuses (equipped)
    const setBonus = {
      strength: 0, defense: 0, agility: 0, intelligence: 0,
      vitality: 0, wisdom: 0, hp: 0, mana: 0,
    };
    const equippedIds = Object.values(this.equippedItems || {});
    const setBonuses = calculateSetBonuses(equippedIds);
    Object.keys(setBonus).forEach(stat => {
      setBonus[stat] = setBonuses[stat] || 0;
    });

    // Passive set bonuses
    const passiveSetBonus = {
      strength: 0, defense: 0, agility: 0, intelligence: 0,
      vitality: 0, wisdom: 0, hp: 0, mana: 0,
    };
    const ownedSetBonuses = calculateOwnedSetBonuses(this.inventory || [], this.equippedItems || {});
    Object.keys(passiveSetBonus).forEach(stat => {
      passiveSetBonus[stat] = ownedSetBonuses[stat] || 0;
    });

    // Gathering bonuses
    const gatheringBonus = {
      strength: 0, defense: 0, agility: 0, intelligence: 0,
      vitality: 0, wisdom: 0, hp: 0, mana: 0,
    };
    const gatheringBoosts = calculateGatheringBoosts(this.gatheringLevels);
    gatheringBonus.strength = gatheringBoosts.strength || 0;
    gatheringBonus.agility = gatheringBoosts.agility || 0;
    gatheringBonus.intelligence = gatheringBoosts.intelligence || 0;

    // Talent bonuses
    const talentBonus = {
      strength: 0, defense: 0, agility: 0, intelligence: 0,
      vitality: 0, wisdom: 0, hp: 0, mana: 0,
    };
    if (this.talents) {
      Object.entries(this.talents).forEach(([talentId, rank]) => {
        const talent = getTalent(talentId);
        if (!talent?.bonuses) return;
        Object.entries(talent.bonuses).forEach(([stat, value]) => {
          talentBonus[stat] += value * rank;
        });
      });
    }

    // Calculate totals
    const total = {};
    Object.keys(base).forEach(stat => {
      total[stat] = base[stat] + classBonus[stat] + equipmentBonus[stat]
        + setBonus[stat] + passiveSetBonus[stat] + gatheringBonus[stat]
        + talentBonus[stat];
    });

    // Calculate damage (weapon + strength bonus)
    const totalDamage = weaponDamage + Math.floor(total.strength * 0.5);

    return {
      base,
      classBonus,
      equipmentBonus,
      setBonus,
      passiveSetBonus,
      gatheringBonus,
      talentBonus,
      total,
      weaponDamage,
      totalDamage,
    };
  }

  /**
   * Apply narrative choice and initialize class
   */
  applyNarrativeChoice(choiceId) {
    const choice = getNarrativeChoice(choiceId);
    if (!choice) return false;

    this.narrativeChoice = choiceId;
    this.internalClass = choice.internalClass;
    this.class = null;
    this.classUnlocked = false;
    this.characterCreated = true;

    // Apply base stats
    if (choice.baseStats) {
      this.strength = choice.baseStats.strength ?? this.strength;
      this.defense = choice.baseStats.defense ?? this.defense;
      this.agility = choice.baseStats.agility ?? this.agility;
      this.intelligence = choice.baseStats.intelligence ?? this.intelligence;
      this.vitality = choice.baseStats.vitality ?? this.vitality;
      this.wisdom = choice.baseStats.wisdom ?? this.wisdom;
      this.maxHp = choice.baseStats.hp ?? this.maxHp;
      this.maxMana = choice.baseStats.mana ?? this.maxMana;
      this.hp = this.maxHp;
      this.mana = this.maxMana;
    }

    this.aiTendencies = { ...this.aiTendencies, ...choice.aiTendencies };

    return true;
  }

  setQuestFlag(key, value) {
    this.questFlags[key] = value;
  }

  hasQuestFlag(key) {
    return Boolean(this.questFlags[key]);
  }

  /**
   * Award XP and handle leveling
   */
  addXp(amount) {
    this.xp += amount;
    const levelsGained = this.tryLevelUp();
    return levelsGained;
  }

  /**
   * Check if level up is possible and apply it
   */
  tryLevelUp() {
    let levelsGained = 0;
    const milestones = [];
    const balance = loadBalanceData();
    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level += 1;
      levelsGained += 1;
      this.talentPoints += 1;

      // Track level-up timestamp
      if (!this.levelUpHistory) this.levelUpHistory = [];
      this.levelUpHistory.push({ level: this.level, timestamp: Date.now() });
      if (this.levelUpHistory.length > 200) this.levelUpHistory = this.levelUpHistory.slice(-200);

      // Grant skill point every 2 levels
      if (this.level % 2 === 0) {
        this.skillPoints += 1;
      }

      // Stat increases on level up
      this.strength += 2;
      this.defense += 2;
      this.agility += 1;
      this.intelligence += 2;
      this.vitality += 2;
      this.wisdom += 1;

      // HP and mana increase
      this.maxHp += 20;
      this.hp = this.maxHp;
      this.maxMana += 10;
      this.mana = this.maxMana;

      // Unlock additional profession slots at levels 15, 20, and 35
      if (this.level === 15) {
        this.maxProfessions = 2;
      } else if (this.level === 20) {
        this.maxProfessions = 3;
      } else if (this.level === 35) {
        this.maxProfessions = 4;
      }

      // Check for milestone rewards
      const milestone = this.getMilestoneReward(this.level);
      if (milestone) {
        milestones.push(milestone);
        // Apply milestone rewards
        if (milestone.gold) this.gold += milestone.gold;
        if (milestone.talentPoints) this.talentPoints += milestone.talentPoints;
      }

      // XP requirement increases (balance configurable)
      const base = Number(balance.levelXpBase) || 120;
      const growth = Number(balance.levelXpGrowth) || 1.15;
      this.xpToNextLevel = Math.floor(base * Math.pow(growth, this.level));
    }
    return { levelsGained, milestones };
  }

  /**
   * Get milestone reward for a specific level
   */
  getMilestoneReward(level) {
    const milestones = {
      5: { gold: 100, talentPoints: 1, message: '⚡ Arena Mode Unlocked!' },
      10: { gold: 250, talentPoints: 2, message: '🏰 Dungeons Unlocked!' },
      15: { gold: 500, talentPoints: 2, message: '💼 2nd Profession Slot Unlocked!' },
      20: { gold: 1000, talentPoints: 3, message: '⚔️ Raids Unlocked!' },
      25: { gold: 2000, talentPoints: 3, message: '💼 3rd Profession Slot Unlocked!' },
      30: { gold: 3500, talentPoints: 4, message: '🌟 Milestone Achievement!' },
      35: { gold: 5000, talentPoints: 5, message: '🏅 Elite Status Reached!' },
      40: { gold: 7500, talentPoints: 5, message: '👑 Master Adventurer!' },
      45: { gold: 10000, talentPoints: 6, message: '🔥 Legendary Tier!' },
      50: { gold: 15000, talentPoints: 10, message: '⭐ Maximum Level Reached!' }
    };
    return milestones[level];
  }

  /**
   * Heal the player
   */
  heal(amount) {
    const oldHp = this.hp;
    this.hp = Math.min(this.hp + amount, this.maxHp);
    return this.hp - oldHp;
  }

  /**
   * Take damage (reduces HP)
   */
  takeDamage(amount) {
    this.hp = Math.max(this.hp - amount, 0);
    return this.hp === 0; // returns true if dead
  }

  /**
   * Restore mana
   */
  restoreMana(amount) {
    this.maxMana = Math.min(this.mana + amount, this.maxMana);
    return this.mana;
  }

  /**
   * Use mana for an action
   */
  useMana(amount) {
    if (this.mana < amount) return false;
    this.mana -= amount;
    return true;
  }

  /**
   * Get player summary for display
   */
  getSummary() {
    const stats = this.getStats();
    if (this.hp > stats.hp) {
      this.hp = stats.hp;
    }
    return {
      userId: this.userId,
      username: this.username,
      level: this.level,
      xp: this.xp,
      xpToNextLevel: this.xpToNextLevel,
      xpProgress: Math.round((this.xp / this.xpToNextLevel) * 100),
      hp: this.hp,
      maxHp: stats.hp || this.maxHp,
      mana: this.mana,
      maxMana: stats.mana || this.maxMana,
      gold: this.gold,
      class: this.classUnlocked ? this.class : null,
      skills: this.skills,
      professions: this.professions,
      stats: {
        strength: stats.strength,
        defense: stats.defense,
        agility: stats.agility,
        intelligence: stats.intelligence,
        vitality: stats.vitality,
        wisdom: stats.wisdom,
      },
      equippedItems: this.equippedItems,
      currentWorld: this.currentWorld,
      worldsUnlocked: this.worldsUnlocked,
      isAlive: this.hp > 0,
    };
  }

  /**
   * Serialize player for database storage
   */
  toJSON() {
    return {
      userId: this.userId,
      username: this.username,
      createdAt: this.createdAt,
      level: this.level,
      xp: this.xp,
      xpToNextLevel: this.xpToNextLevel,
      hp: this.hp,
      maxHp: this.maxHp,
      mana: this.mana,
      maxMana: this.maxMana,
      gold: this.gold,
      strength: this.strength,
      defense: this.defense,
      agility: this.agility,
      intelligence: this.intelligence,
      vitality: this.vitality,
      wisdom: this.wisdom,
      class: this.class,
      classUnlocked: this.classUnlocked,
      narrativeChoice: this.narrativeChoice,
      internalClass: this.internalClass,
      skills: this.skills,
      skillCooldowns: this.skillCooldowns,
      talents: this.talents,
      talentPoints: this.talentPoints,
      equippedItems: this.equippedItems,
      equipmentUpgrades: this.equipmentUpgrades,
      equipmentEnchants: this.equipmentEnchants,
      inventory: this.inventory,
      questFlags: this.questFlags,
      professions: this.professions,
      professionLevels: this.professionLevels,
      professionXp: this.professionXp,
      maxProfessions: this.maxProfessions,
      gatheringRewardsClaimedLevel: this.gatheringRewardsClaimedLevel,
      craftingQueue: this.craftingQueue,
      arenaPoints: this.arenaPoints,
      isInCombat: this.isInCombat,
      currentWorld: this.currentWorld,
      worldsUnlocked: this.worldsUnlocked,
      worldBossesDefeated: this.worldBossesDefeated,
    };
  }

  /**
   * Deserialize player from stored data
   */
  static fromJSON(data) {
    const player = new Player(data.userId, data.username);
    Object.assign(player, data);
    if (!player.talents) player.talents = {};
    if (!Number.isFinite(player.talentPoints)) player.talentPoints = 0;
    if (!player.equipmentUpgrades) player.equipmentUpgrades = {};
    if (!player.equipmentEnchants) player.equipmentEnchants = {};
    if (!player.questFlags) player.questFlags = {};
    if (!player.menuHistory) player.menuHistory = [];
    if (!Number.isFinite(player.maxProfessions)) player.maxProfessions = 1;
    if (!Number.isFinite(player.gatheringRewardsClaimedLevel)) player.gatheringRewardsClaimedLevel = 0;
    if (player.level >= 35 && player.maxProfessions < 4) {
      player.maxProfessions = 4;
    } else if (player.level >= 20 && player.maxProfessions < 3) {
      player.maxProfessions = 3;
    } else if (player.level >= 15 && player.maxProfessions < 2) {
      player.maxProfessions = 2;
    }
    if (!player.classUnlocked && player.narrativeChoice) player.class = null;
    if (!player.worldsUnlocked || !Array.isArray(player.worldsUnlocked)) {
      const firstWorldId = getFirstWorldId();
      player.worldsUnlocked = [firstWorldId];
    }
    if (!player.worldBossesDefeated || !Array.isArray(player.worldBossesDefeated)) {
      player.worldBossesDefeated = [];
    }
    if (!player.professionXp) player.professionXp = {};
    // Ensure all players have blacksmith level 1 as base level (can craft basic weapons even without choosing blacksmith)
    if (!player.professionLevels) player.professionLevels = {};
    if (!player.professionLevels.blacksmith || player.professionLevels.blacksmith < 1) {
      player.professionLevels.blacksmith = 1;
    }
    if (!Number.isFinite(player.arenaPoints)) player.arenaPoints = 0;
    return player;
  }
}
