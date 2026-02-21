/**
 * TowerManager - Niflheim Infinite Tower System
 * 100 floors of escalating difficulty
 * Regular combat floors with bosses every 5 floors
 * Rewards: Lootboxes, Guild Boss Essence, Gold, Materials, Enchants, Potions
 * Difficulty scales exponentially with floor number
 * Requires Level 150+ (Niflheim access)
 */

class TowerManager {
  constructor() {
    this.TOTAL_FLOORS = 100;
    this.BOSS_INTERVAL = 5;
    this.MIN_LEVEL_REQUIREMENT = 150; // Niflheim access required

    // Tower reward types with scaling
    this.REWARD_TYPES = {
      gold: { name: 'Gold', emoji: '💰', baseAmount: 5000 },
      guildEssence: { name: 'Guild Boss Essence', emoji: '🔮', baseAmount: 50 },
      materials: { name: 'Materials', emoji: '⛏️', common: ['mithril_ore', 'ancient_wood', 'leather'] },
      lootboxes: { 
        name: 'Lootbox', 
        emoji: '📦', 
        types: {
          basic: { chance: 0.7, tier: 1 },
          rare: { chance: 0.25, tier: 2 },
          legendary: { chance: 0.05, tier: 3 }
        }
      },
      enchants: { 
        name: 'Enchants', 
        emoji: '✨', 
        types: ['damage_enchant', 'xp_enchant', 'loot_enchant', 'doublehit_enchant', 'boss_damage_enchant']
      },
      potions: {
        name: 'Potions',
        emoji: '🧪',
        types: ['health_potion', 'xp_potion', 'gold_potion', 'gathering_potion', 'loot_potion']
      }
    };

    // Base enemy stats (scales with floor)
    this.BASE_ENEMY_STATS = {
      regular: {
        hp: 10000,
        damage: 500,
        defense: 150,
        xpReward: 8000,
        gold: 3000
      },
      boss: {
        hp: 50000,
        damage: 1200,
        defense: 300,
        xpReward: 50000,
        gold: 20000
      }
    };

    // Scaling formulas
    this.SCALING = {
      // Exponential scaling for enemies
      regular: {
        hpMultiplier: (floor) => Math.pow(1.08, floor - 1), // 8% per floor
        damageMultiplier: (floor) => Math.pow(1.06, floor - 1), // 6% per floor
        defenseMultiplier: (floor) => Math.pow(1.05, floor - 1) // 5% per floor
      },
      boss: {
        hpMultiplier: (floor) => Math.pow(1.12, floor / 5 - 1), // 12% per boss floor
        damageMultiplier: (floor) => Math.pow(1.10, floor / 5 - 1), // 10% per boss floor
        defenseMultiplier: (floor) => Math.pow(1.08, floor / 5 - 1) // 8% per boss floor
      },
      // Rewards scale linearly with floor
      rewards: {
        goldMultiplier: (floor) => 1 + (floor * 0.15), // 15% per floor
        essenceMultiplier: (floor) => 1 + (floor * 0.10), // 10% per floor
        materialMultiplier: (floor) => Math.floor(1 + (floor * 0.08)) // Quantity increases
      }
    };

    // Tower boss names and themes per milestone
    this.BOSS_THEMES = {
      5: { name: 'Frozen Sentinel', emoji: '🛡️', theme: 'defense' },
      10: { name: 'Glacial Reaver', emoji: '⚔️', theme: 'physical' },
      15: { name: 'Frostborn Sorcerer', emoji: '🔮', theme: 'magic' },
      20: { name: 'Ice Wyrm Hatchling', emoji: '🐉', theme: 'hybrid' },
      25: { name: 'Rime Executioner', emoji: '🗡️', theme: 'speed' },
      30: { name: 'Permafrost Golem', emoji: '🗿', theme: 'tank' },
      35: { name: 'Mistborn Phantom', emoji: '👻', theme: 'evasion' },
      40: { name: 'Coldstar Avenger', emoji: '⭐', theme: 'burst' },
      45: { name: 'Everwinter Drake', emoji: '🐲', theme: 'aoe' },
      50: { name: 'Helglass Tyrant', emoji: '👑', theme: 'boss' },
      55: { name: 'Void Ice Demon', emoji: '😈', theme: 'curse' },
      60: { name: 'Glacial Archon', emoji: '👼', theme: 'holy' },
      65: { name: 'Cryogenic Aberration', emoji: '🦑', theme: 'chaos' },
      70: { name: 'Niflheim Warden', emoji: '⚖️', theme: 'justice' },
      75: { name: 'Frostwyrm Matriarch', emoji: '🐉', theme: 'ultimate' },
      80: { name: 'Eternal Frost Giant', emoji: '🏔️', theme: 'colossal' },
      85: { name: 'Mistlord Sovereign', emoji: '🌫️', theme: 'control' },
      90: { name: 'Absolute Zero Entity', emoji: '🌀', theme: 'void' },
      95: { name: 'Primordial Ice Spirit', emoji: '💠', theme: 'ancient' },
      100: { name: 'Heart of Niflheim', emoji: '❄️', theme: 'final' }
    };

    // Regular enemy names (randomized)
    this.ENEMY_TYPES = [
      { name: 'Frozen Warrior', emoji: '🗡️' },
      { name: 'Ice Mage', emoji: '🔮' },
      { name: 'Frost Wraith', emoji: '👻' },
      { name: 'Glacial Beast', emoji: '🐺' },
      { name: 'Rime Sentinel', emoji: '🛡️' },
      { name: 'Permafrost Horror', emoji: '👹' },
      { name: 'Coldstar Cultist', emoji: '🙏' },
      { name: 'Mistborn Assassin', emoji: '🗡️' },
      { name: 'Helglass Golem', emoji: '🗿' },
      { name: 'Void Ice Spawn', emoji: '👾' }
    ];
  }

  /**
   * Initialize tower progress for a player
   */
  initializeTowerProgress(player) {
    if (!player.towerProgress) {
      player.towerProgress = {
        currentFloor: 1,
        highestFloor: 0,
        totalClears: 0,
        totalAttempts: 0,
        lastAttemptDate: null,
        lifetimeRewards: {
          gold: 0,
          essence: 0,
          lootboxes: 0,
          materials: 0
        }
      };
    }
    return player.towerProgress;
  }

  /**
   * Check if player meets requirements to enter tower
   */
  canEnterTower(player) {
    if (player.level < this.MIN_LEVEL_REQUIREMENT) {
      return {
        allowed: false,
        reason: `You must be level ${this.MIN_LEVEL_REQUIREMENT}+ to access the Niflheim Tower`
      };
    }
    return { allowed: true };
  }

  /**
   * Generate enemy for current floor
   */
  generateEnemy(floor, isBoss = false) {
    const enemyType = isBoss ? 'boss' : 'regular';
    const baseStats = this.BASE_ENEMY_STATS[enemyType];
    const scaling = this.SCALING[enemyType];

    const scaledStats = {
      hp: Math.floor(baseStats.hp * scaling.hpMultiplier(floor)),
      maxHp: Math.floor(baseStats.hp * scaling.hpMultiplier(floor)),
      damage: Math.floor(baseStats.damage * scaling.damageMultiplier(floor)),
      defense: Math.floor(baseStats.defense * scaling.defenseMultiplier(floor)),
      xpReward: Math.floor(baseStats.xpReward * (1 + floor * 0.1)),
      goldReward: Math.floor(baseStats.gold * (1 + floor * 0.15))
    };

    if (isBoss) {
      const bossData = this.BOSS_THEMES[floor] || { 
        name: `Floor ${floor} Guardian`, 
        emoji: '👑', 
        theme: 'default' 
      };
      return {
        id: `tower_boss_${floor}`,
        name: bossData.name,
        emoji: bossData.emoji,
        theme: bossData.theme,
        floor: floor,
        isBoss: true,
        ...scaledStats
      };
    } else {
      const randomEnemy = this.ENEMY_TYPES[Math.floor(Math.random() * this.ENEMY_TYPES.length)];
      return {
        id: `tower_enemy_${floor}_${Date.now()}`,
        name: `${randomEnemy.name} (Floor ${floor})`,
        emoji: randomEnemy.emoji,
        floor: floor,
        isBoss: false,
        ...scaledStats
      };
    }
  }

  /**
   * Check if current floor is a boss floor
   */
  isBossFloor(floor) {
    return floor % this.BOSS_INTERVAL === 0;
  }

  /**
   * Generate rewards for completing a floor
   */
  generateFloorRewards(floor, isBoss = false) {
    const rewards = {
      gold: 0,
      guildEssence: 0,
      materials: [],
      lootboxes: [],
      enchants: [],
      potions: [],
      xp: 0
    };

    // Base rewards with scaling
    const goldMult = this.SCALING.rewards.goldMultiplier(floor);
    const essenceMult = this.SCALING.rewards.essenceMultiplier(floor);
    const matMult = this.SCALING.rewards.materialMultiplier(floor);

    // Gold (always)
    rewards.gold = Math.floor(this.REWARD_TYPES.gold.baseAmount * goldMult);

    // Guild Essence (always)
    rewards.guildEssence = Math.floor(this.REWARD_TYPES.guildEssence.baseAmount * essenceMult);

    // Materials (50% chance, higher on boss floors)
    const materialChance = isBoss ? 1.0 : 0.5;
    if (Math.random() < materialChance) {
      const matTypes = this.REWARD_TYPES.materials.common;
      const numMaterials = isBoss ? 3 : Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < numMaterials; i++) {
        const material = matTypes[Math.floor(Math.random() * matTypes.length)];
        rewards.materials.push({
          id: material,
          quantity: Math.floor((10 + floor * 2) * matMult)
        });
      }
    }

    // Lootboxes (boss floors guaranteed, 30% on regular)
    const lootboxChance = isBoss ? 1.0 : 0.3;
    if (Math.random() < lootboxChance) {
      const lootboxType = this.rollLootboxType(floor, isBoss);
      rewards.lootboxes.push({
        type: lootboxType,
        quantity: isBoss ? Math.floor(floor / 10) + 1 : 1
      });
    }

    // Enchants (20% chance, higher on milestone floors)
    const enchantChance = (floor % 10 === 0) ? 0.6 : 0.2;
    if (Math.random() < enchantChance) {
      const enchantType = this.REWARD_TYPES.enchants.types[
        Math.floor(Math.random() * this.REWARD_TYPES.enchants.types.length)
      ];
      const tier = Math.min(6, Math.floor(floor / 15) + 1);
      rewards.enchants.push({
        id: `${enchantType}_t${tier}`,
        quantity: 1
      });
    }

    // Potions (40% chance)
    if (Math.random() < 0.4) {
      const potionType = this.REWARD_TYPES.potions.types[
        Math.floor(Math.random() * this.REWARD_TYPES.potions.types.length)
      ];
      const tier = Math.min(6, Math.floor(floor / 15) + 1);
      rewards.potions.push({
        id: `${potionType}_t${tier}`,
        quantity: isBoss ? 3 : 1
      });
    }

    // Bonus rewards for milestone floors (10, 20, 30, etc.)
    if (floor % 10 === 0) {
      rewards.gold = Math.floor(rewards.gold * 2);
      rewards.guildEssence = Math.floor(rewards.guildEssence * 2);
      // Guaranteed high-tier lootbox
      rewards.lootboxes.push({
        type: floor >= 50 ? 'legendary' : 'rare',
        quantity: 1
      });
    }

    // Floor 100 special rewards
    if (floor === 100) {
      rewards.gold *= 5;
      rewards.guildEssence *= 5;
      rewards.lootboxes.push({ type: 'legendary', quantity: 5 });
      rewards.enchants.push(
        { id: 'damage_enchant_t6', quantity: 3 },
        { id: 'boss_damage_enchant_t6', quantity: 2 }
      );
      rewards.potions.push(
        { id: 'health_potion_t6', quantity: 5 },
        { id: 'xp_potion_t6', quantity: 5 }
      );
    }

    return rewards;
  }

  /**
   * Roll lootbox type based on floor and boss status
   */
  rollLootboxType(floor, isBoss) {
    const lootboxData = this.REWARD_TYPES.lootboxes.types;
    let roll = Math.random();

    // Increase legendary chance on higher floors
    const legendaryBonus = Math.min(0.15, floor * 0.001); // +0.1% per floor, max +15%
    const rareBonus = Math.min(0.2, floor * 0.002); // +0.2% per floor, max +20%

    // Boss floors have better loot
    if (isBoss) {
      roll -= 0.15; // 15% better odds
    }

    if (roll < lootboxData.legendary.chance + legendaryBonus) {
      return 'legendary';
    } else if (roll < lootboxData.legendary.chance + legendaryBonus + lootboxData.rare.chance + rareBonus) {
      return 'rare';
    } else {
      return 'basic';
    }
  }

  /**
   * Complete a floor and generate rewards
   */
  completeFloor(player, floor, combatResult) {
    const isBoss = this.isBossFloor(floor);
    const rewards = this.generateFloorRewards(floor, isBoss);

    // Update player progress
    if (!player.towerProgress) {
      this.initializeTowerProgress(player);
    }

    player.towerProgress.currentFloor = floor + 1;
    if (floor > player.towerProgress.highestFloor) {
      player.towerProgress.highestFloor = floor;
    }

    // Track lifetime rewards
    player.towerProgress.lifetimeRewards.gold += rewards.gold;
    player.towerProgress.lifetimeRewards.essence += rewards.guildEssence;
    player.towerProgress.lifetimeRewards.lootboxes += rewards.lootboxes.length;
    player.towerProgress.lifetimeRewards.materials += rewards.materials.reduce((sum, m) => sum + m.quantity, 0);

    // Floor 100 completion
    if (floor === 100) {
      player.towerProgress.totalClears++;
      player.towerProgress.currentFloor = 1; // Reset to floor 1 for next run
    }

    return {
      success: true,
      floor: floor,
      nextFloor: floor === 100 ? 1 : floor + 1,
      isBoss: isBoss,
      rewards: rewards,
      completedTower: floor === 100
    };
  }

  /**
   * Handle tower defeat (player dies)
   */
  handleDefeat(player, floor) {
    if (!player.towerProgress) {
      this.initializeTowerProgress(player);
    }

    player.towerProgress.totalAttempts++;
    player.towerProgress.lastAttemptDate = new Date().toISOString();

    // Keep progress but don't reset to floor 1
    return {
      success: false,
      floor: floor,
      message: `Defeated on Floor ${floor}. You can retry from Floor 1 or continue from Floor ${player.towerProgress.currentFloor}.`
    };
  }

  /**
   * Reset tower progress (start from floor 1)
   */
  resetProgress(player) {
    if (!player.towerProgress) {
      this.initializeTowerProgress(player);
    }

    player.towerProgress.currentFloor = 1;
    player.towerProgress.totalAttempts++;

    return { currentFloor: 1 };
  }

  /**
   * Get tower status embed data
   */
  getTowerStatus(player) {
    const progress = this.initializeTowerProgress(player);

    return {
      currentFloor: progress.currentFloor,
      highestFloor: progress.highestFloor,
      totalClears: progress.totalClears,
      totalAttempts: progress.totalAttempts,
      lifetimeRewards: progress.lifetimeRewards,
      nextIsBoss: this.isBossFloor(progress.currentFloor),
      percentComplete: ((progress.highestFloor / this.TOTAL_FLOORS) * 100).toFixed(1)
    };
  }
}

export default TowerManager;
