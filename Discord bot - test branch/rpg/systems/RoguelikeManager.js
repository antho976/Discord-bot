/**
 * RoguelikeManager - Manages roguelike dungeon progression
 * 26 floors total (5 bosses in 5 sections + final boss)
 * Base level 1 stats, dual currency system, stat reset per run
 * Expanded with mini-bosses, room modifiers, buffs/debuffs, events, consumables, and more
 */

class RoguelikeManager {
  constructor() {
    this.TOTAL_FLOORS = 26;
    this.FLOORS_PER_BOSS = 5;
    this.NUM_BOSSES = 5;
    this.FINAL_BOSS_FLOOR = 26;

    // Room types and their properties
    this.ROOM_TYPES = {
      skill: { name: 'Skill Room', emoji: '⚡', weight: 20, hasBoss: true },
      treasure: { name: 'Treasure Room', emoji: '💎', weight: 15, hasBoss: true },
      healing: { name: 'Healing Room', emoji: '❤️', weight: 15, hasBoss: false }, // No boss
      rest: { name: 'Rest Room', emoji: '😴', weight: 10, hasBoss: false }, // No boss
      trap: { name: 'Trap Room', emoji: '⚠️', weight: 10, hasBoss: true },
      shop: { name: 'Shop', emoji: '🏪', weight: 10, hasBoss: false }, // No boss
      libraryRoom: { name: 'Library', emoji: '📚', weight: 0, unlockable: true, costB: 50, hasBoss: false },
      armoryRoom: { name: 'Armory', emoji: '🛡️', weight: 0, unlockable: true, costB: 75, hasBoss: true },
      alchemyRoom: { name: 'Alchemy Lab', emoji: '🧪', weight: 0, unlockable: true, costB: 60, hasBoss: false },
      combat: { name: 'Combat Chamber', emoji: '⚔️', weight: 12, hasBoss: true },
      mystery: { name: 'Mystery Room', emoji: '❓', weight: 8, hasBoss: true },
      elite: { name: 'Elite Chamber', emoji: '👑', weight: 5, hasBoss: true },
    };

    // Base stat values for level 1
    this.BASE_STATS = {
      strength: 10,
      defense: 10,
      agility: 10,
      intelligence: 10,
      vitality: 10,
      wisdom: 10,
      maxHp: 100,
      maxMana: 50,
    };

    // Currency rewards based on exit method
    this.CURRENCY_REWARDS = {
      death: { currencyA: 1.0, currencyB: 1.0, currencyC: 1.0 },
      voluntaryExit: { currencyA: 0.5, currencyB: 0.5, currencyC: 0.5 },
      bossDefeated: { currencyA: 0.3, currencyB: 0.3, currencyC: 0.3 },
    };

    // Currency Names & Descriptions
    this.CURRENCIES = {
      currencyA: { name: 'Gold', emoji: '💰', description: 'Standard currency earned from defeating enemies and completing rooms' },
      currencyB: { name: 'Essence', emoji: '✨', description: 'Rare currency for unlocking special room types during runs' },
      currencyC: { name: 'Void Shards', emoji: '🔷', description: 'Precious currency earned only from defeating bosses' },
    };

    // ROGUELIKE PACKS - Bundle of stat boosts purchasable with Gold
    this.ROGUELIKE_PACKS = {
      warrior: { id: 'warrior', name: '⚔️ Warrior Pack', emoji: '⚔️', description: 'For those who prefer hitting hard and tanking blows', cost: 150, bonuses: { strength: 15, defense: 10, maxHp: 50, damage: 5 }, color: 0xFF6B6B },
      mage: { id: 'mage', name: '🔮 Mage Pack', emoji: '🔮', description: 'Master the arcane arts with intelligence and wisdom', cost: 150, bonuses: { intelligence: 15, wisdom: 10, maxMana: 40, damage: 3 }, color: 0x4ECDC4 },
      rogue: { id: 'rogue', name: '🥷 Rogue Pack', emoji: '🥷', description: 'Navigate with speed and precision', cost: 150, bonuses: { agility: 20, defense: 5, maxHp: 30, damage: 4 }, color: 0x95E1D3 },
      paladin: { id: 'paladin', name: '✨ Paladin Pack', emoji: '✨', description: 'Balance offense and defense with holy power', cost: 180, bonuses: { strength: 10, defense: 15, maxHp: 60, wisdom: 8 }, color: 0xFFD766 },
      berserker: { id: 'berserker', name: '🔥 Berserker Pack', emoji: '🔥', description: 'Pure damage and raw power - high risk, high reward', cost: 120, bonuses: { strength: 25, agility: 5, maxHp: 20, damage: 8 }, color: 0xFF4757 },
      ranger: { id: 'ranger', name: '🏹 Ranger Pack', emoji: '🏹', description: 'Master precision and multi-target attacks', cost: 140, bonuses: { agility: 12, intelligence: 10, wisdom: 5, damage: 4 }, color: 0x2ED573 },
      balanced: { id: 'balanced', name: '⚖️ Balanced Pack', emoji: '⚖️', description: 'A bit of everything - versatile and reliable', cost: 130, bonuses: { strength: 8, defense: 8, agility: 8, intelligence: 8, maxHp: 40, maxMana: 20 }, color: 0x7B68EE }
    };

    // Scaling per boss section
    this.SCALING = {
      healthPerBoss: 1.15, // +15% health per boss section
      damagePerBoss: 1.12, // +12% damage per boss section
    };

    // Room modifiers (random effects that apply to rooms)
    this.ROOM_MODIFIERS = {
      blessed: { name: '✨ Blessed', description: 'Rewards increased by 25%', rewardMultiplier: 1.25 },
      cursed: { name: '💀 Cursed', description: 'Rewards decreased by 30%', rewardMultiplier: 0.7 },
      flooded: { name: '💧 Flooded', description: 'Healing effects reduced by 50%', healingMultiplier: 0.5 },
      frozen: { name: '❄️ Frozen', description: 'Damage reduced, but stuns are stronger', damageMultiplier: 0.8 },
      inferno: { name: '🔥 Inferno', description: 'Damage increased by 20%, HP loss on room entry', damageMultiplier: 1.2 },
      thunderstorm: { name: '⚡ Thunderstorm', description: 'Actions may chain hit', chainChance: 0.3 },
    };

    // Room-specific events (puzzles, riddles, skill checks)
    this.ROOM_EVENTS = [
      { id: 'riddle', name: '🧩 Ancient Riddle', type: 'wisdom_check', difficulty: 'medium', reward: 'currencyC' },
      { id: 'puzzle', name: '🔐 Magical Puzzle', type: 'intelligence_check', difficulty: 'hard', reward: 'rareItem' },
      { id: 'trial', name: '⚔️ Warrior\'s Trial', type: 'strength_check', difficulty: 'medium', reward: 'buff' },
      { id: 'stealth', name: '🥷 Stealth Challenge', type: 'agility_check', difficulty: 'hard', reward: 'consumable' },
      { id: 'meditation', name: '🧘 Meditation', type: 'wisdom_check', difficulty: 'easy', reward: 'manaRestore' },
    ];

    // Buffs and debuffs (persist for multiple rooms or whole floor)
    this.BUFFS = {
      strengthBoost: { name: '+10% Strength', duration: 3, statMod: { strength: 1.1 } },
      defenseBoost: { name: '+10% Defense', duration: 3, statMod: { defense: 1.1 } },
      speedBoost: { name: '+10% Agility', duration: 2, statMod: { agility: 1.1 } },
      damageBoost: { name: '+15% Damage', duration: 2, damageMultiplier: 1.15 },
      regeneration: { name: '🩹 Regeneration', duration: 4, regenPerRoom: 0.1 }, // 10% max HP per room
      fortunate: { name: '🍀 Lucky', duration: 3, rewardMultiplier: 1.3 },
      cursed: { name: '💀 Cursed', duration: 5, rewardMultiplier: 0.6, damageMultiplier: 1.2 }, // Takes more damage, gets less loot
      weakened: { name: '😴 Weakened', duration: 2, damageMultiplier: 0.75 },
      poisoned: { name: '☠️ Poisoned', duration: 6, damagePerRoom: 0.15 }, // 15% max HP per room
    };

    // Consumable items (usable only during a run)
    this.CONSUMABLES = {
      healthPotion: { name: 'Health Potion 🧪', effect: '+40 HP', value: 'healing', amount: 40 },
      manaPotion: { name: 'Mana Potion 💙', effect: '+25 Mana', value: 'mana', amount: 25 },
      antidote: { name: 'Antidote ☘️', effect: 'Remove poison', value: 'removeDebuff', debuff: 'poisoned' },
      cleanse: { name: 'Cleanse Scroll 📜', effect: 'Remove all debuffs', value: 'removeAllDebuffs' },
      revive: { name: 'Phoenix Feather 🪶', effect: 'Survive fatal blow once', value: 'shield', amount: 1 },
    };

    // Floor-wide challenges
    this.FLOOR_CHALLENGES = [
      { id: 'noHealing', name: '❌ No Healing', description: 'Healing rooms heal half as much', healingMultiplier: 0.5 },
      { id: 'doubleEnemies', name: '👥 Double Enemies', description: 'All bosses have +50% HP', bossHPMultiplier: 1.5 },
      { id: 'damageReduction', name: '🛡️ Reinforced', description: 'Enemies deal 20% less damage', enemyDamageMultiplier: 0.8 },
      { id: 'timeLimit', name: '⏱️ Time Pressure', description: 'Complete more than normal rooms', extra: 2 },
      { id: 'weakWeapons', name: '⚔️ Rusty Weapons', description: 'Your damage reduced by 25%', playerDamageMultiplier: 0.75 },
    ];

    // Achievements for run milestones
    this.ACHIEVEMENTS = {
      tenBosses: { id: 'tenBosses', name: '💪 Boss Slayer', description: 'Defeat 10 mini-bosses in a run', criterion: 'minisBossesDefeated >= 10' },
      noDamage: { id: 'noDamage', name: '🛡️ Untouchable', description: 'Complete a run without taking damage', criterion: 'damageTokenTaken === 0' },
      speedrun: { id: 'speedrun', name: '⚡ Lightning Run', description: 'Complete 10 floors in under 5 minutes', criterion: 'time < 300000 && floorsCleared >= 10' },
      allRoomTypes: { id: 'allRoomTypes', name: '🗺️ Explorer', description: 'Visit all room types in one run', criterion: 'visitedAllRoomTypes' },
      noConsumables: { id: 'noConsumables', name: '💯 Pure', description: 'Complete a run without using consumables', criterion: 'consumablesUsed === 0' },
      maxFloor: { id: 'maxFloor', name: '🏔️ Mountain Climber', description: 'Reach floor 26', criterion: 'currentFloor === 26' },
      collectThemAll: { id: 'collectThemAll', name: '🎁 Hoarder', description: 'Collect 20+ items in a run', criterion: 'items.length >= 20' },
      masterUpgrades: { id: 'masterUpgrades', name: '🎓 Scholar', description: 'Buy 10+ upgrades from shop', criterion: 'shopUpgradesPurchased >= 10' },
    };

    // Boss loot drops - rewards for defeating mini-bosses
    this.BOSS_LOOT_TABLES = {
      common: [
        { id: 'goldCoins', name: 'Gold Coins', value: 25, rarity: 'common' },
        { id: 'healthPotion', name: 'Health Potion', value: 1, rarity: 'common' },
        { id: 'manaPotion', name: 'Mana Potion', value: 1, rarity: 'common' },
      ],
      rare: [
        { id: 'rareGem', name: 'Rare Gem', value: 50, rarity: 'rare' },
        { id: 'enchantedScroll', name: 'Enchanted Scroll', value: 30, rarity: 'rare' },
        { id: 'ancientRelic', name: 'Ancient Relic', value: 75, rarity: 'rare' },
      ],
      legendary: [
        { id: 'midasTouch', name: 'Midas Touch', value: 200, rarity: 'legendary', description: '+100% gold from bosses' },
        { id: 'dragonScale', name: 'Dragon Scale', value: 150, rarity: 'legendary', description: '+20% defense' },
        { id: 'voidShard', name: 'Void Shard', value: 180, rarity: 'legendary', description: '+25% damage' },
      ],
    };

    // Artifact system - rare powerful items (not consumables)
    this.ARTIFACTS = {
      phoenixFeather: { id: 'phoenixFeather', name: '🪶 Phoenix Feather', type: 'revive', effect: 'Survive one fatal blow', rarity: 'legendary', uses: 1 },
      chronometer: { id: 'chronometer', name: '⏰ Chronometer', type: 'timeControl', effect: 'Slow time by 50% for one room', rarity: 'epic', uses: 1 },
      aceInTheHole: { id: 'aceInTheHole', name: '🎯 Ace in the Hole', type: 'critBoost', effect: 'Guaranteed critical hit next action', rarity: 'epic', uses: 1 },
      moneyBag: { id: 'moneyBag', name: '💰 Bottomless Money Bag', type: 'currencyMultiplier', effect: 'Double currency from next 3 rooms', rarity: 'epic', uses: 1 },
      soulGem: { id: 'soulGem', name: '💎 Soul Gem', type: 'buffPower', effect: 'Amplify all buffs by 50% for run', rarity: 'legendary', uses: 1 },
      voidwalker: { id: 'voidwalker', name: '🌌 Voidwalker', type: 'immunity', effect: 'Skip next 2 trap effects', rarity: 'epic', uses: 2 },
      lifewell: { id: 'lifewell', name: '⛲ Lifewell', type: 'fullHeal', effect: 'Fully restore HP and Mana', rarity: 'legendary', uses: 1 },
    };

    // Room themes - different environments with varied enemy/aesthetic
    this.ROOM_THEMES = {
      darkness: { name: '🌑 Darkness', enemies: ['Shadow Beast', 'Void Watcher', 'Dark Spirit'], colorMod: '💀', dmgBonus: 1.1 },
      forest: { name: '🌲 Enchanted Forest', enemies: ['Forest Guardian', 'Wild Beast', 'Nature Spirit'], colorMod: '🍃', dmgBonus: 1.0 },
      volcano: { name: '🌋 Volcano', enemies: ['Flame Sentinel', 'Magma Elemental', 'Fire Drake'], colorMod: '🔥', dmgBonus: 1.15 },
      void: { name: '✨ Void', enemies: ['Void Entity', 'Cosmic Horror', 'Reality Tear'], colorMod: '▫️', dmgBonus: 1.2 },
      ice: { name: '❄️ Frozen Wastes', enemies: ['Frost Giant', 'Ice Wraith', 'Glacier Lord'], colorMod: '🧊', dmgBonus: 1.05 },
      arcane: { name: '🔮 Arcane Library', enemies: ['Spellcaster', 'Mana Elemental', 'Arcane Construct'], colorMod: '⭐', dmgBonus: 1.08 },
    };

    // Permanent upgrades purchasable with Currency A
    this.PERMANENT_UPGRADES = {
      maxHealthBonus: {
        id: 'maxHealthBonus',
        name: 'Max Health',
        description: 'Increase your maximum health for all roguelike runs',
        emoji: '❤️',
        baseCost: 50,
        costScaling: 1.15,
        increment: 10,
        maxLevel: 50,
        category: 'survival',
        detailDescription: 'Every level adds +10 HP to your starting health in roguelike runs. Essential for surviving deeper floors.'
      },
      maxManaBonus: {
        id: 'maxManaBonus',
        name: 'Max Mana',
        description: 'Increase your maximum mana for all roguelike runs',
        emoji: '💙',
        baseCost: 40,
        costScaling: 1.15,
        increment: 5,
        maxLevel: 50,
        category: 'magic',
        detailDescription: 'Every level adds +5 Mana to your starting mana pool. Crucial for spell-based builds.'
      },
      damageBonus: {
        id: 'damageBonus',
        name: 'Attack Power',
        description: 'Increase your base damage for all roguelike runs',
        emoji: '⚔️',
        baseCost: 60,
        costScaling: 1.2,
        increment: 5,
        maxLevel: 40,
        category: 'offense',
        detailDescription: 'Every level adds +5% base damage to all your attacks. Stack this for devastating boss kills.'
      },
      defenseBonus: {
        id: 'defenseBonus',
        name: 'Defense',
        description: 'Increase your defense rating for all roguelike runs',
        emoji: '🛡️',
        baseCost: 50,
        costScaling: 1.15,
        increment: 5,
        maxLevel: 40,
        category: 'survival',
        detailDescription: 'Every level adds +5% damage reduction. Survive longer against mini-bosses and floor bosses.'
      },
      critChanceBonus: {
        id: 'critChanceBonus',
        name: 'Critical Chance',
        description: 'Increase your critical hit chance',
        emoji: '🎯',
        baseCost: 75,
        costScaling: 1.25,
        increment: 2,
        maxLevel: 25,
        category: 'offense',
        detailDescription: 'Every level adds +2% critical hit chance. Critical hits deal 2x damage!'
      },
      critDamageBonus: {
        id: 'critDamageBonus',
        name: 'Critical Damage',
        description: 'Increase your critical hit damage multiplier',
        emoji: '💥',
        baseCost: 80,
        costScaling: 1.3,
        increment: 5,
        maxLevel: 30,
        category: 'offense',
        detailDescription: 'Every level adds +5% to your critical damage multiplier. Base crit is 2x, this adds to it.'
      },
      agilityBonus: {
        id: 'agilityBonus',
        name: 'Agility',
        description: 'Increase your agility stat for dodging and speed',
        emoji: '💨',
        baseCost: 45,
        costScaling: 1.15,
        increment: 3,
        maxLevel: 40,
        category: 'utility',
        detailDescription: 'Every level adds +3 agility. Higher agility increases dodge chance and turn order.'
      },
      intelligenceBonus: {
        id: 'intelligenceBonus',
        name: 'Intelligence',
        description: 'Increase your intelligence for magic damage and puzzles',
        emoji: '🧠',
        baseCost: 45,
        costScaling: 1.15,
        increment: 3,
        maxLevel: 40,
        category: 'magic',
        detailDescription: 'Every level adds +3 intelligence. Improves magic damage and success rate on puzzle rooms.'
      },
      luckBonus: {
        id: 'luckBonus',
        name: 'Luck',
        description: 'Increase your luck for better loot drops',
        emoji: '🍀',
        baseCost: 100,
        costScaling: 1.4,
        increment: 2,
        maxLevel: 20,
        category: 'utility',
        detailDescription: 'Every level adds +2% luck. Improves quality and quantity of loot drops from all sources.'
      },
      experienceBonus: {
        id: 'experienceBonus',
        name: 'Experience Gain',
        description: 'Increase experience gained from completing floors',
        emoji: '⭐',
        baseCost: 70,
        costScaling: 1.2,
        increment: 5,
        maxLevel: 30,
        category: 'progression',
        detailDescription: 'Every level adds +5% to all currency earned. Helps you upgrade faster!'
      },
      goldFindBonus: {
        id: 'goldFindBonus',
        name: 'Gold Find',
        description: 'Increase gold and currency drops',
        emoji: '💰',
        baseCost: 90,
        costScaling: 1.3,
        increment: 5,
        maxLevel: 25,
        category: 'progression',
        detailDescription: 'Every level adds +5% to treasure room rewards and boss gold drops.'
      },
      startingCurrencyB: {
        id: 'startingCurrencyB',
        name: 'Starting Currency',
        description: 'Start each run with bonus Currency B',
        emoji: '💎',
        baseCost: 120,
        costScaling: 1.5,
        increment: 10,
        maxLevel: 20,
        category: 'progression',
        detailDescription: 'Every level gives you +10 Currency B at the start of each run. Use it to unlock rooms earlier!'
      },
    };
  }

  /**
   * Initialize a new roguelike run for a player
   * @param {Player} player - Player starting the run
   * @returns {Object} Initial roguelike state
   */
  initializeRun(player) {
    const startStats = { ...this.BASE_STATS };
    
    // Select random theme for the run
    const themeKeys = Object.keys(this.ROOM_THEMES);
    const selectedTheme = themeKeys[Math.floor(Math.random() * themeKeys.length)];

    return {
      isActive: true,
      currentFloor: 1,
      floorsCleared: 0,
      bossesDefeated: 0,
      miniBossesDefeated: 0,
      damageTokenTaken: 0,
      consumablesUsed: 0,
      shopUpgradesPurchased: 0,
      visitedRoomTypes: new Set(),
      startedAt: Date.now(),
      
      // Stats (reset to level 1)
      stats: startStats,
      hp: startStats.maxHp,
      mana: startStats.maxMana,
      
      // Inventory for run
      skills: [], // Skills learned from skill rooms
      items: [], // Items collected (consumables + equipment)
      artifacts: [], // Artifact items (rare, powerful)
      
      // Currency earned this run
      currencyAEarned: 0,
      currencyBEarned: 0,
      currencyCEarned: 0,
      
      // Unlocked room types (purchasable during run)
      unlockedRooms: ['skill', 'treasure', 'healing', 'rest', 'trap', 'shop'],
      
      // Scaling tracker
      difficultyMultiplier: 1.0,
      
      // Room generation seed
      seed: Math.random(),
      
      // Room choices on current floor
      currentFloorRooms: [],
      
      // Active effects
      activeBuffs: [], // Array of buff objects with duration tracking
      activeDebuffs: [],
      floorChallenge: null, // Current floor-wide challenge
      
      // Run stats for achievements
      achievementsEarned: [],
      
      // Theme system
      theme: selectedTheme,
      themeName: this.ROOM_THEMES[selectedTheme].name,
      
      // Statistics for panel
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      criticalHits: 0,
      enemiesDefeated: 0,
      treasureRoomsCleared: 0,
      
      // Milestones tracking
      milestonesReached: [],
    };
  }

  ensureVisitedRoomTypesSet(roguelikeState) {
    if (!roguelikeState) return new Set();
    const current = roguelikeState.visitedRoomTypes;
    if (current instanceof Set) return current;

    const next = new Set();
    if (Array.isArray(current)) {
      current.forEach((value) => next.add(value));
    } else if (current && typeof current === 'object') {
      Object.values(current).forEach((value) => next.add(value));
    }

    roguelikeState.visitedRoomTypes = next;
    return next;
  }

  /**
   * Generate a mini-boss for a room
   * Excludes: healing, rest, shop, alchemy, library
   * @param {string} roomType - Type of room
   * @param {number} floorNumber - Current floor number
   * @param {number} difficultyMultiplier - Difficulty multiplier
   * @returns {Object|null} Mini-boss object or null if room shouldn't have boss
   */
  generateMiniBoss(roomType, floorNumber, difficultyMultiplier) {
    // No boss for these room types
    const noBossRooms = ['healing', 'rest', 'shop', 'alchemyRoom', 'libraryRoom'];
    if (noBossRooms.includes(roomType)) return null;

    const bossSection = Math.ceil(floorNumber / 5);
    const baseHealth = 60;
    const baseDamage = 12;

    const health = Math.floor(baseHealth * (1 + floorNumber * 0.08) * difficultyMultiplier);
    const damage = Math.floor(baseDamage * (1 + floorNumber * 0.06) * difficultyMultiplier);

    const miniBossNames = [
      'Shade Guardian', 'Flame Sentinel', 'Void Watcher', 'Dark Disciple',
      'Lich Keeper', 'Shadow Beast', 'Cursed Revenant', 'Infernal Hound',
      'Corrupted Knight', 'Abyssal Creature',
    ];

    const miniBossAbilities = [
      { name: 'Cleave', damage: Math.floor(damage * 1.5), description: 'Heavy attack' },
      { name: 'Dark Pulse', damage: Math.floor(damage * 1.2), description: 'Magic attack' },
      { name: 'Shadow Strike', damage: Math.floor(damage * 1.3), description: 'Quick melee' },
      { name: 'Curse', damage: 0, description: 'Inflict debuff' },
      { name: 'Regenerate', damage: 0, description: 'Heal 20% HP' },
    ];

    // Generate loot drops
    const loot = this.generateBossLoot(floorNumber);

    return {
      name: miniBossNames[Math.floor(Math.random() * miniBossNames.length)],
      health,
      maxHealth: health,
      damage,
      defense: 3 + Math.floor(floorNumber / 3),
      ability: miniBossAbilities[Math.floor(Math.random() * miniBossAbilities.length)],
      defeated: false,
      loot, // Boss loot drops
    };
  }

  /**
   * Generate boss loot drops
   * @param {number} floorNumber - Current floor number
   * @returns {Array} Array of loot items
   */
  generateBossLoot(floorNumber) {
    const loot = [];
    const roll = Math.random();

    // Common drop (always)
    const commonLoot = this.BOSS_LOOT_TABLES.common[Math.floor(Math.random() * this.BOSS_LOOT_TABLES.common.length)];
    loot.push({ ...commonLoot, id: `loot_${Date.now()}` });

    // Rare drop (45% chance, higher on later floors)
    if (roll < 0.45 || floorNumber > 15) {
      const rareLoot = this.BOSS_LOOT_TABLES.rare[Math.floor(Math.random() * this.BOSS_LOOT_TABLES.rare.length)];
      loot.push({ ...rareLoot, id: `loot_${Date.now() + 1}` });
    }

    // Legendary drop (5% chance, 15% after floor 20)
    const legendaryChance = floorNumber > 20 ? 0.15 : 0.05;
    if (roll < legendaryChance) {
      const legendaryLoot = this.BOSS_LOOT_TABLES.legendary[Math.floor(Math.random() * this.BOSS_LOOT_TABLES.legendary.length)];
      loot.push({ ...legendaryLoot, id: `loot_${Date.now() + 2}` });
    }

    // Artifact drops (1% base, 5% after floor 20)
    const artifactChance = floorNumber > 20 ? 0.05 : 0.01;
    if (roll < artifactChance) {
      const artifactKeys = Object.keys(this.ARTIFACTS);
      const artifact = this.ARTIFACTS[artifactKeys[Math.floor(Math.random() * artifactKeys.length)]];
      loot.push({ ...artifact, id: `artifact_${Date.now()}`, isArtifact: true });
    }

    return loot;
  }

  /**
   * Generate a room modifier (random effect)
   * @param {number} floorNumber - Current floor
   * @returns {Object|null} Room modifier or null if none
   */
  generateRoomModifier(floorNumber) {
    // 40% chance to apply a modifier
    if (Math.random() > 0.4) return null;

    const modifierKeys = Object.keys(this.ROOM_MODIFIERS);
    const randomMod = modifierKeys[Math.floor(Math.random() * modifierKeys.length)];
    return { type: randomMod, ...this.ROOM_MODIFIERS[randomMod] };
  }

  /**
   * Generate a room event (puzzle, riddle, etc.)
   * @param {number} floorNumber - Current floor
   * @returns {Object|null} Room event or null if none
   */
  generateRoomEvent(floorNumber) {
    // 30% chance to add an event
    if (Math.random() > 0.3) return null;

    const event = this.ROOM_EVENTS[Math.floor(Math.random() * this.ROOM_EVENTS.length)];
    return { ...event, difficulty: event.difficulty };
  }

  /**
   * Generate a floor-wide challenge
   * @param {number} floorNumber - Current floor
   * @returns {Object|null} Floor challenge or null
   */
  generateFloorChallenge(floorNumber) {
    // 25% chance per floor
    if (Math.random() > 0.25) return null;

    const challenge = this.FLOOR_CHALLENGES[Math.floor(Math.random() * this.FLOOR_CHALLENGES.length)];
    return { ...challenge };
  }

  /**
   * Apply a buff to the run
   * @param {Object} roguelikeState - Current run state
   * @param {string} buffType - Type of buff
   * @returns {boolean} Whether buff was applied
   */
  applyBuff(roguelikeState, buffType) {
    if (!this.BUFFS[buffType]) return false;

    const buff = { ...this.BUFFS[buffType], type: buffType, durationLeft: this.BUFFS[buffType].duration };
    roguelikeState.activeBuffs.push(buff);
    return true;
  }

  /**
   * Apply a debuff to the run
   * @param {Object} roguelikeState - Current run state
   * @param {string} debuffType - Type of debuff
   * @returns {boolean} Whether debuff was applied
   */
  applyDebuff(roguelikeState, debuffType) {
    if (!this.BUFFS[debuffType]) return false;

    const debuff = { ...this.BUFFS[debuffType], type: debuffType, durationLeft: this.BUFFS[debuffType].duration };
    roguelikeState.activeDebuffs.push(debuff);
    return true;
  }

  /**
   * Advance buff/debuff durations (call at end of each room)
   * @param {Object} roguelikeState - Current run state
   */
  advanceBuffDurations(roguelikeState) {
    roguelikeState.activeBuffs = roguelikeState.activeBuffs.filter(buff => {
      buff.durationLeft--;
      return buff.durationLeft > 0;
    });

    roguelikeState.activeDebuffs = roguelikeState.activeDebuffs.filter(debuff => {
      debuff.durationLeft--;
      return debuff.durationLeft > 0;
    });
  }

  /**
   * Get cumulative buff/debuff effects
   * @param {Object} roguelikeState - Current run state
   * @returns {Object} Combined effects
   */
  getActiveEffects(roguelikeState) {
    const effects = {
      damageMultiplier: 1.0,
      rewardMultiplier: 1.0,
      healingMultiplier: 1.0,
      statMods: {},
      regenPerRoom: 0,
      damagePerRoom: 0,
    };

    // Apply all active buffs
    roguelikeState.activeBuffs.forEach(buff => {
      if (buff.damageMultiplier) effects.damageMultiplier *= buff.damageMultiplier;
      if (buff.rewardMultiplier) effects.rewardMultiplier *= buff.rewardMultiplier;
      if (buff.healingMultiplier) effects.healingMultiplier *= buff.healingMultiplier;
      if (buff.statMod) {
        Object.keys(buff.statMod).forEach(stat => {
          effects.statMods[stat] = (effects.statMods[stat] || 1) * buff.statMod[stat];
        });
      }
      if (buff.regenPerRoom) effects.regenPerRoom += buff.regenPerRoom;
    });

    // Apply all active debuffs
    roguelikeState.activeDebuffs.forEach(debuff => {
      if (debuff.damageMultiplier) effects.damageMultiplier *= debuff.damageMultiplier;
      if (debuff.rewardMultiplier) effects.rewardMultiplier *= debuff.rewardMultiplier;
      if (debuff.damagePerRoom) effects.damagePerRoom += debuff.damagePerRoom;
    });

    return effects;
  }

  /**
   * Use a consumable item
   * @param {Object} roguelikeState - Current run state
   * @param {string} consumableId - Consumable type
   * @returns {Object|null} Effect result or null if failed
   */
  useConsumable(roguelikeState, consumableId) {
    const consumable = this.CONSUMABLES[consumableId];
    if (!consumable) return null;

    roguelikeState.consumablesUsed++;
    const itemIndex = roguelikeState.items.findIndex(i => i.id === consumableId);
    if (itemIndex >= 0) {
      roguelikeState.items.splice(itemIndex, 1);
    }

    // Apply effects
    switch (consumable.value) {
      case 'healing':
        roguelikeState.hp = Math.min(roguelikeState.hp + consumable.amount, roguelikeState.stats.maxHp);
        return { type: 'healing', amount: consumable.amount };

      case 'mana':
        roguelikeState.mana = Math.min(roguelikeState.mana + consumable.amount, roguelikeState.stats.maxMana);
        return { type: 'mana', amount: consumable.amount };

      case 'removeDebuff':
        const debuffIdx = roguelikeState.activeDebuffs.findIndex(d => d.type === consumable.debuff);
        if (debuffIdx >= 0) {
          roguelikeState.activeDebuffs.splice(debuffIdx, 1);
          return { type: 'cleanse', removed: consumable.debuff };
        }
        break;

      case 'removeAllDebuffs':
        roguelikeState.activeDebuffs = [];
        return { type: 'cleanse', removed: 'all' };

      case 'shield':
        return { type: 'shield', amount: consumable.amount };
    }

    return null;
  }

  /**
   * Check if an achievement was earned
   * @param {Object} roguelikeState - Final run state
   * @param {string} achievementId - Achievement ID
   * @returns {boolean} Whether achievement was earned
   */
  checkAchievement(roguelikeState, achievementId) {
    const achievement = this.ACHIEVEMENTS[achievementId];
    if (!achievement) return false;

    const criterion = achievement.criterion;
    // Simple eval-like check (in production, use safer evaluation)
    try {
      const result = eval(`
        (${JSON.stringify(roguelikeState)}) && (${criterion.replace(/roguelikeState\./g, '')})
      `);
      return result;
    } catch (e) {
      return false;
    }
  }

  /**
   * Generate leaderboard entry
   * @param {Object} roguelikeState - Final run state
   * @param {string} userId - Discord user ID
   * @param {string} userName - Discord user name
   * @returns {Object} Leaderboard entry
   */
  generateLeaderboardEntry(roguelikeState, userId, userName) {
    const timeElapsed = Date.now() - roguelikeState.startedAt;
    return {
      userId,
      userName,
      highestFloor: roguelikeState.currentFloor,
      floorsCleared: roguelikeState.floorsCleared,
      bossesDefeated: roguelikeState.bossesDefeated,
      miniBossesDefeated: roguelikeState.miniBossesDefeated,
      timeSeconds: Math.floor(timeElapsed / 1000),
      currencyEarned: roguelikeState.currencyAEarned + roguelikeState.currencyBEarned + roguelikeState.currencyCEarned,
      achievements: roguelikeState.achievementsEarned,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate room choices for a floor
   * @param {Object} roguelikeState - Current run state
   * @param {number} floorNumber - Current floor number
   * @returns {Array} Array of 3-4 room options
   */
  generateFloorRooms(roguelikeState, floorNumber) {
    const roomCount = Math.random() < 0.5 ? 3 : 4; // 50% chance for 3 or 4 rooms
    const rooms = [];
    const usedTypes = new Set(); // Track used room types to prevent duplicates
    const availableRooms = this.getAvailableRooms(roguelikeState);

    // Always include skill room on some floors, but never on boss floors
    const isBossFloor = floorNumber % 5 === 0 || floorNumber === 26;
    const includeSkillRoom = floorNumber % 3 !== 0 && !isBossFloor; // Skill rooms on most floors
    
    for (let i = 0; i < roomCount; i++) {
      if (i === 0 && includeSkillRoom) {
        const skillRoom = this.generateRoom('skill', floorNumber, roguelikeState);
        rooms.push(skillRoom);
        usedTypes.add('skill');
      } else {
        let randomType = this.selectRandomRoom(availableRooms, roguelikeState.seed + i);
        
        // If this room type was already used, try to find a different one
        let attempts = 0;
        while (usedTypes.has(randomType) && attempts < 5) {
          randomType = this.selectRandomRoom(availableRooms, roguelikeState.seed + i + Math.random());
          attempts++;
        }
        
        // Only add if unique type
        if (!usedTypes.has(randomType)) {
          usedTypes.add(randomType);
          rooms.push(this.generateRoom(randomType, floorNumber, roguelikeState));
        }
      }
    }

    return rooms;
  }

  /**
   * Generate a specific room
   * @param {string} roomType - Type of room
   * @param {number} floorNumber - Current floor number
   * @param {Object} roguelikeState - Current run state
   * @returns {Object} Room object with properties
   */
  generateRoom(roomType, floorNumber, roguelikeState) {
    const bossSection = Math.ceil(floorNumber / 5);
    const multiplier = roguelikeState.difficultyMultiplier;
    const theme = this.ROOM_THEMES[roguelikeState.theme];

    const roomData = { 
      id: Math.random().toString(36).substr(2, 9), 
      type: roomType,
      modifier: null,
      event: null,
      miniBoss: null,
      theme: roguelikeState.theme,
      themeName: theme.name,
    };

    // Add room modifier and event
    roomData.modifier = this.generateRoomModifier(floorNumber);
    roomData.event = this.generateRoomEvent(floorNumber);

    switch (roomType) {
      case 'skill':
        roomData.skillOptions = this.generateSkillChoices(floorNumber, multiplier);
        roomData.description = `${theme.colorMod} Choose a new skill`;
        roomData.miniBoss = this.generateMiniBoss(roomType, floorNumber, multiplier);
        break;

      case 'treasure':
        roomData.reward = {
          currencyA: Math.floor(10 + floorNumber * 2),
          items: this.generateTreasure(floorNumber, multiplier),
        };
        roomData.description = `${theme.colorMod} Claim treasure!`;
        roomData.miniBoss = this.generateMiniBoss(roomType, floorNumber, multiplier);
        break;

      case 'healing':
        roomData.healAmount = Math.floor(30 + floorNumber * 5);
        roomData.description = `${theme.colorMod} Restore health`;
        break;

      case 'rest':
        roomData.restoreAmount = Math.floor(20 + floorNumber * 3);
        roomData.description = `${theme.colorMod} Rest and restore resources`;
        break;

      case 'trap':
        roomData.danger = {
          healthLoss: Math.floor(20 * multiplier),
          currencyLoss: Math.floor(5 * multiplier),
        };
        roomData.description = `${theme.colorMod} Dangerous trap ahead`;
        roomData.miniBoss = this.generateMiniBoss(roomType, floorNumber, multiplier);
        break;

      case 'shop':
        roomData.items = this.generateShopItems(floorNumber, roguelikeState);
        roomData.description = `${theme.colorMod} Shop - buy upgrades`;
        break;

      case 'libraryRoom':
        roomData.reward = {
          skills: this.generateLibrarySkills(floorNumber, multiplier),
          currencyA: Math.floor(5 + floorNumber),
        };
        roomData.description = `${theme.colorMod} Ancient knowledge awaits`;
        break;

      case 'armoryRoom':
        roomData.reward = {
          equipment: this.generateArmoryItems(floorNumber, multiplier),
          defense: Math.floor(5 + floorNumber / 3),
        };
        roomData.description = `${theme.colorMod} Ancient armor and weapons`;
        roomData.miniBoss = this.generateMiniBoss(roomType, floorNumber, multiplier);
        break;

      case 'alchemyRoom':
        roomData.reward = {
          potions: this.generateAlchemyPotions(floorNumber),
          intelligence: Math.floor(2 + floorNumber / 4),
        };
        roomData.description = `${theme.colorMod} Mystical potions`;
        break;

      case 'combat':
        roomData.difficulty = 'hard';
        roomData.miniBoss = this.generateMiniBoss(roomType, floorNumber, roguelikeState.difficultyMultiplier * 1.2);
        roomData.reward = {
          currencyA: Math.floor(15 + floorNumber * 3),
          currencyB: Math.floor(2 + Math.random() * 3),
        };
        roomData.description = `${theme.colorMod} Direct combat awaits`;
        break;

      case 'mystery':
        roomData.difficulty = 'medium';
        roomData.miniBoss = this.generateMiniBoss(roomType, floorNumber, roguelikeState.difficultyMultiplier);
        roomData.reward = {
          currencyA: Math.floor(8 + floorNumber * 2),
          currencyB: Math.floor(1 + Math.random() * 2),
        };
        roomData.description = `${theme.colorMod} Unknown encounter...`;
        break;

      case 'elite':
        roomData.difficulty = 'elite';
        roomData.miniBoss = this.generateMiniBoss(roomType, floorNumber, roguelikeState.difficultyMultiplier * 1.5);
        roomData.reward = {
          currencyA: Math.floor(20 + floorNumber * 4),
          currencyB: Math.floor(3 + Math.random() * 4),
          currencyC: Math.floor(1 + Math.random() * 2),
        };
        roomData.description = `${theme.colorMod} Elite champion appears!`;
        break;
    }

    return roomData;
  }

  /**
   * Generate a skill for skill rooms
   * @param {number} floorNumber - Current floor
   * @param {number} multiplier - Difficulty multiplier
   * @returns {Object} Skill object
   */
  generateSkill(floorNumber, multiplier) {
    // Tiered skill pool with progression
    const allSkills = [
      // Tier 1: Early game
      { id: 'slash', name: 'Slash', damage: 20, mana: 5, description: 'Quick melee attack', tier: 1 },
      { id: 'magicMissile', name: 'Magic Missile', damage: 18, mana: 10, description: 'Precise arcane attack', tier: 1 },
      { id: 'defend', name: 'Defend', damage: 0, mana: 8, description: 'Reduce next damage 30%', tier: 1 },
      
      // Tier 2: Mid game
      { id: 'powerStrike', name: 'Power Strike', damage: 50, mana: 20, description: 'Heavy melee attack', tier: 2 },
      { id: 'frostbolt', name: 'Frostbolt', damage: 40, mana: 25, description: 'Freezing attack', tier: 2 },
      { id: 'shadowStep', name: 'Shadow Step', damage: 35, mana: 15, description: 'Evade and counter', tier: 2 },
      { id: 'heal', name: 'Heal', damage: 0, mana: 18, description: 'Restore 35 HP', tier: 2 },
      { id: 'arrowStorm', name: 'Arrow Storm', damage: 38, mana: 22, description: 'Multi-shot attack', tier: 2 },
      
      // Tier 3: Late game
      { id: 'fireball', name: 'Fireball', damage: 60, mana: 35, description: 'Explosive magic', tier: 3 },
      { id: 'chainLightning', name: 'Chain Lightning', damage: 65, mana: 40, description: 'Arc between foes', tier: 3 },
      { id: 'divineShield', name: 'Divine Shield', damage: 0, mana: 38, description: 'Protect + heal', tier: 3 },
      { id: 'vampiricStrike', name: 'Vampiric Strike', damage: 45, mana: 25, description: 'Lifesteal attack', tier: 3 },
      { id: 'thunderClap', name: 'Thunder Clap', damage: 50, mana: 30, description: 'Stun blast', tier: 3 },
    ];

    // Filter skills by floor progression
    let availableSkills = allSkills;
    if (floorNumber < 10) {
      availableSkills = allSkills.filter(s => s.tier <= 1 || Math.random() < 0.3); // Mostly tier 1
    } else if (floorNumber < 20) {
      availableSkills = allSkills.filter(s => s.tier <= 2 || Math.random() < 0.2); // Mostly tier 1-2
    }
    // 20+ has access to all

    // Select random skill
    const skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
    
    // Scale skill power by floor
    const scaledSkill = {
      ...skill,
      damage: skill.damage > 0 ? Math.floor(skill.damage * (1 + floorNumber * 0.08) * multiplier) : 0,
      mana: Math.floor(skill.mana * (1 + floorNumber * 0.02)),
    };

    return scaledSkill;
  }

  generateSkillChoices(floorNumber, multiplier, choiceCount) {
    const targetCount = choiceCount || (Math.random() < 0.5 ? 3 : 4);
    const choices = [];
    const usedIds = new Set();
    let attempts = 0;

    while (choices.length < targetCount && attempts < 20) {
      const skill = this.generateSkill(floorNumber, multiplier);
      if (!usedIds.has(skill.id)) {
        usedIds.add(skill.id);
        choices.push(skill);
      }
      attempts++;
    }

    return choices;
  }

  /**
   * Generate treasure items
   * @param {number} floorNumber - Current floor
   * @param {number} multiplier - Difficulty multiplier
   * @returns {Array} Array of treasure items
   */
  generateTreasure(floorNumber, multiplier) {
    const treasureTypes = [
      { name: 'Gold Coin', value: Math.floor(5 * multiplier) },
      { name: 'Rare Gem', value: Math.floor(15 * multiplier) },
      { name: 'Ancient Relic', value: Math.floor(25 * multiplier) },
      { name: 'Enchanted Scroll', value: Math.floor(10 * multiplier) },
    ];

    const count = Math.random() < 0.5 ? 1 : 2;
    const treasures = [];

    for (let i = 0; i < count; i++) {
      treasures.push(treasureTypes[Math.floor(Math.random() * treasureTypes.length)]);
    }

    return treasures;
  }

  /**
   * Generate shop items
   * @param {number} floorNumber - Current floor
   * @param {Object} roguelikeState - Current run state
   * @returns {Array} Shop items for purchase
   */
  generateShopItems(floorNumber, roguelikeState) {
    const bossSection = Math.ceil(floorNumber / 5);
    const scaledCost = Math.floor(1 + (floorNumber * 0.5));
    
    // All available shop items with categories
    const allItems = [
      // CONSUMABLES - HEALING (Category A)
      { id: 'healthPotion', name: '❤️ Health Potion', category: 'consumable', cost: 20 * scaledCost, effect: 'Restore 50 HP', tier: 1 },
      { id: 'healthPotionMajor', name: '❤️ Major Health Potion', category: 'consumable', cost: 35 * scaledCost, effect: 'Restore 100 HP', tier: 2 },
      { id: 'manaPotion', name: '💙 Mana Potion', category: 'consumable', cost: 15 * scaledCost, effect: 'Restore 30 Mana', tier: 1 },
      { id: 'manaPotionMajor', name: '💙 Major Mana Potion', category: 'consumable', cost: 28 * scaledCost, effect: 'Restore 60 Mana', tier: 2 },
      { id: 'rejuvenation', name: '✨ Rejuvenation Elixir', category: 'consumable', cost: 50 * scaledCost, effect: 'Restore 30% HP + 30% Mana', tier: 3 },
      
      // TEMPORARY BUFFS (Category B)
      { id: 'strengthPotion', name: '💪 Strength Potion', category: 'buff', cost: 30 * scaledCost, effect: '+5 Strength (this run)', tier: 1 },
      { id: 'strengthElixir', name: '💪 Strength Elixir', category: 'buff', cost: 55 * scaledCost, effect: '+10 Strength (this run)', tier: 2 },
      { id: 'defensePotion', name: '🛡️ Defense Potion', category: 'buff', cost: 25 * scaledCost, effect: '+5 Defense (this run)', tier: 1 },
      { id: 'defenseElixir', name: '🛡️ Defense Elixir', category: 'buff', cost: 50 * scaledCost, effect: '+10 Defense (this run)', tier: 2 },
      { id: 'speedPotion', name: '⚡ Speed Potion', category: 'buff', cost: 25 * scaledCost, effect: '+5 Agility (this run)', tier: 1 },
      { id: 'speedElixir', name: '⚡ Speed Elixir', category: 'buff', cost: 48 * scaledCost, effect: '+10 Agility (this run)', tier: 2 },
      { id: 'intelligencePotion', name: '🧠 Intelligence Potion', category: 'buff', cost: 28 * scaledCost, effect: '+5 Intelligence (this run)', tier: 1 },
      { id: 'wisdomPotion', name: '📖 Wisdom Potion', category: 'buff', cost: 28 * scaledCost, effect: '+5 Wisdom (this run)', tier: 1 },
      
      // EQUIPMENT (Category C)
      { id: 'ironSword', name: '⚔️ Iron Sword', category: 'equipment', cost: 40 * scaledCost, effect: '+8 Damage', tier: 1 },
      { id: 'steelSword', name: '⚔️ Steel Sword', category: 'equipment', cost: 70 * scaledCost, effect: '+15 Damage', tier: 2 },
      { id: 'mythrilSword', name: '⚔️ Mythril Sword', category: 'equipment', cost: 120 * scaledCost, effect: '+25 Damage', tier: 3 },
      { id: 'leatherArmor', name: '🛡️ Leather Armor', category: 'equipment', cost: 35 * scaledCost, effect: '+5 Defense', tier: 1 },
      { id: 'chainmail', name: '🛡️ Chainmail', category: 'equipment', cost: 65 * scaledCost, effect: '+10 Defense', tier: 2 },
      { id: 'plateArmor', name: '🛡️ Plate Armor', category: 'equipment', cost: 110 * scaledCost, effect: '+18 Defense', tier: 3 },
      
      // SPECIAL ITEMS (Category D)
      { id: 'luckCharm', name: '🍀 Luck Charm', category: 'special', cost: 60 * scaledCost, effect: '+10% loot drop rate', tier: 2 },
      { id: 'experienceBoost', name: '📚 XP Tome', category: 'special', cost: 50 * scaledCost, effect: '+20% skill XP gain', tier: 2 },
      { id: 'goldMultiplier', name: '💰 Merchant Ring', category: 'special', cost: 75 * scaledCost, effect: '+25% gold from rooms', tier: 2 },
      { id: 'damageMultiplier', name: '🔥 Power Amulet', category: 'special', cost: 80 * scaledCost, effect: '+15% all damage', tier: 3 },
      { id: 'critBoost', name: '🎯 Critical Ring', category: 'special', cost: 70 * scaledCost, effect: '+10% crit chance', tier: 2 },
      { id: 'vampiricTouch', name: '🩸 Vampire Ring', category: 'special', cost: 90 * scaledCost, effect: 'Lifesteal: 5% damage to HP', tier: 3 },
      
      // UTILITY (Category E)
      { id: 'mapFragment', name: '🗺️ Map Fragment', category: 'utility', cost: 45 * scaledCost, effect: 'Reveal next 3 room types', tier: 2 },
      { id: 'keyRing', name: '🔑 Skeleton Key', category: 'utility', cost: 55 * scaledCost, effect: 'Skip one trap room', tier: 2 },
      { id: 'returnScroll', name: '📜 Escape Scroll', category: 'utility', cost: 40 * scaledCost, effect: 'Safe exit (keep 70% gold)', tier: 2 },
      { id: 'rerollToken', name: '🎲 Reroll Token', category: 'utility', cost: 35 * scaledCost, effect: 'Reroll room choices once', tier: 1 },
    ];
    
    // Select items based on floor progressThe shop offers 5-7 random items per visit
    const itemCount = 5 + Math.floor(Math.random() * 3); // 5-7 items
    const selectedItems = [];
    const availableItems = [...allItems];
    
    // Weight selection towards tier 1 early, tier 2-3 later
    for (let i = 0; i < itemCount; i++) {
      if (availableItems.length === 0) break;
      
      let filteredItems;
      if (floorNumber <= 5) {
        // Early floors: mostly tier 1
        filteredItems = availableItems.filter(item => item.tier === 1 || Math.random() < 0.3);
      } else if (floorNumber <= 15) {
        // Mid floors: tier 1-2
        filteredItems = availableItems.filter(item => item.tier <= 2 || Math.random() < 0.2);
      } else {
        // Late floors: all tiers
        filteredItems = availableItems;
      }
      
      if (filteredItems.length === 0) filteredItems = availableItems;
      
      const randomIndex = Math.floor(Math.random() * filteredItems.length);
      const selected = filteredItems[randomIndex];
      selectedItems.push(selected);
      
      // Remove from available
      const originalIndex = availableItems.indexOf(selected);
      availableItems.splice(originalIndex, 1);
    }
    
    return selectedItems;
  }

  /**
   * Get shop items organized by category for overview
   * @param {number} floorNumber - Current floor
   * @returns {Object} Items organized by category
   */
  getShopCatalog(floorNumber) {
    const scaledCost = Math.floor(1 + (floorNumber * 0.5));
    
    return {
      consumables: [
        { id: 'healthPotion', name: '❤️ Health Potion', cost: 20 * scaledCost, effect: 'Restore 50 HP' },
        { id: 'healthPotionMajor', name: '❤️ Major Health Potion', cost: 35 * scaledCost, effect: 'Restore 100 HP' },
        { id: 'manaPotion', name: '💙 Mana Potion', cost: 15 * scaledCost, effect: 'Restore 30 Mana' },
        { id: 'manaPotionMajor', name: '💙 Major Mana Potion', cost: 28 * scaledCost, effect: 'Restore 60 Mana' },
        { id: 'rejuvenation', name: '✨ Rejuvenation Elixir', cost: 50 * scaledCost, effect: 'Restore 30% HP + 30% Mana' },
      ],
      buffs: [
        { id: 'strengthPotion', name: '💪 Strength Potion', cost: 30 * scaledCost, effect: '+5 STR (run)' },
        { id: 'strengthElixir', name: '💪 Strength Elixir', cost: 55 * scaledCost, effect: '+10 STR (run)' },
        { id: 'defensePotion', name: '🛡️ Defense Potion', cost: 25 * scaledCost, effect: '+5 DEF (run)' },
        { id: 'defenseElixir', name: '🛡️ Defense Elixir', cost: 50 * scaledCost, effect: '+10 DEF (run)' },
        { id: 'speedPotion', name: '⚡ Speed Potion', cost: 25 * scaledCost, effect: '+5 AGI (run)' },
        { id: 'speedElixir', name: '⚡ Speed Elixir', cost: 48 * scaledCost, effect: '+10 AGI (run)' },
      ],
      equipment: [
        { id: 'ironSword', name: '⚔️ Iron Sword', cost: 40 * scaledCost, effect: '+8 DMG' },
        { id: 'steelSword', name: '⚔️ Steel Sword', cost: 70 * scaledCost, effect: '+15 DMG' },
        { id: 'mythrilSword', name: '⚔️ Mythril Sword', cost: 120 * scaledCost, effect: '+25 DMG' },
        { id: 'leatherArmor', name: '🛡️ Leather Armor', cost: 35 * scaledCost, effect: '+5 DEF' },
        { id: 'chainmail', name: '🛡️ Chainmail', cost: 65 * scaledCost, effect: '+10 DEF' },
        { id: 'plateArmor', name: '🛡️ Plate Armor', cost: 110 * scaledCost, effect: '+18 DEF' },
      ],
      special: [
        { id: 'luckCharm', name: '🍀 Luck Charm', cost: 60 * scaledCost, effect: '+10% loot' },
        { id: 'goldMultiplier', name: '💰 Merchant Ring', cost: 75 * scaledCost, effect: '+25% gold' },
        { id: 'damageMultiplier', name: '🔥 Power Amulet', cost: 80 * scaledCost, effect: '+15% DMG' },
        { id: 'critBoost', name: '🎯 Critical Ring', cost: 70 * scaledCost, effect: '+10% crit' },
        { id: 'vampiricTouch', name: '🩸 Vampire Ring', cost: 90 * scaledCost, effect: '5% lifesteal' },
      ],
      utility: [
        { id: 'mapFragment', name: '🗺️ Map Fragment', cost: 45 * scaledCost, effect: 'Reveal 3 rooms' },
        { id: 'keyRing', name: '🔑 Skeleton Key', cost: 55 * scaledCost, effect: 'Skip trap' },
        { id: 'returnScroll', name: '📜 Escape Scroll', cost: 40 * scaledCost, effect: 'Safe exit (70%)' },
        { id: 'rerollToken', name: '🎲 Reroll Token', cost: 35 * scaledCost, effect: 'Reroll rooms' },
      ],
    };
  }

  /**
   * Generate library skills
   * @param {number} floorNumber - Current floor
   * @param {number} multiplier - Difficulty multiplier
   * @returns {Array} Library skills
   */
  generateLibrarySkills(floorNumber, multiplier) {
    return [
      { id: 'arcaneBlast', name: 'Arcane Blast', mana: 45, damage: 50 },
      { id: 'spellshield', name: 'Spell Shield', mana: 35, defense: 20 },
    ];
  }

  /**
   * Generate armory items
   * @param {number} floorNumber - Current floor
   * @param {number} multiplier - Difficulty multiplier
   * @returns {Array} Armory items
   */
  generateArmoryItems(floorNumber, multiplier) {
    return [
      { id: 'ancientSword', name: 'Ancient Sword', damage: Math.floor(20 * multiplier) },
      { id: 'dragonplate', name: 'Dragonplate Armor', defense: Math.floor(15 * multiplier) },
    ];
  }

  /**
   * Generate alchemy potions
   * @param {number} floorNumber - Current floor
   * @returns {Array} Potions
   */
  generateAlchemyPotions(floorNumber) {
    return [
      { id: 'elixirOfPower', name: 'Elixir of Power', effect: '+3 All Stats' },
      { id: 'elixirOfVitality', name: 'Elixir of Vitality', effect: '+20 Max HP' },
    ];
  }

  /**
   * Get list of available room types based on unlocks
   * @param {Object} roguelikeState - Current run state
   * @returns {Array} Available room type keys
   */
  getAvailableRooms(roguelikeState) {
    return roguelikeState.unlockedRooms;
  }

  /**
   * Select a random room type from available options
   * @param {Array} availableRooms - Available room types
   * @param {number} seed - Random seed
   * @returns {string} Selected room type
   */
  selectRandomRoom(availableRooms, seed) {
    const seedNum = seed * 10000 % availableRooms.length;
    return availableRooms[Math.floor(seedNum)];
  }

  /**
   * Check if player is eligible for roguelike (Tier 2+)
   * Tier 2 = World 2+ unlocked (minLevel 8+)
   * @param {Player} player - Player to check
   * @returns {boolean} Whether player can access roguelike
   */
  isPlayerEligible(player) {
    // Player must have unlocked world 2 (tier 2) or higher
    return player.worldsUnlocked && player.worldsUnlocked.length >= 2;
  }

  /**
   * Calculate boss stats for current run
   * @param {number} bossNumber - Which boss (1-5, 6 = final boss)
   * @param {Object} roguelikeState - Current run state
   * @returns {Object} Boss stats
   */
  calculateBossStats(bossNumber, roguelikeState) {
    const bossSection = bossNumber === 6 ? 5 : bossNumber; // Final boss = section 5 scaling

    // Base boss stats (level 1 equivalent)
    const baseHealth = 150;
    const baseDamage = 20;

    // Apply scaling
    const health = Math.floor(baseHealth * Math.pow(this.SCALING.healthPerBoss, bossSection - 1));
    const damage = Math.floor(baseDamage * Math.pow(this.SCALING.damagePerBoss, bossSection - 1));

    return {
      name: this.getBossName(bossNumber),
      health,
      maxHealth: health,
      damage,
      defense: 5 + bossSection * 2,
      description: this.getBossDescription(bossNumber),
    };
  }

  /**
   * Get boss name by number
   * @param {number} bossNumber - Boss number (1-6)
   * @returns {string} Boss name
   */
  getBossName(bossNumber) {
    const bosses = [
      'Shadow Wraith',
      'Infernal Drake',
      'Void Entity',
      'Dark Sorcerer',
      'Abyssal Titan',
      'The Eternal One', // Final boss
    ];
    return bosses[bossNumber - 1] || 'Unknown Boss';
  }

  /**
   * Get boss description
   * @param {number} bossNumber - Boss number (1-6)
   * @returns {string} Boss description
   */
  getBossDescription(bossNumber) {
    const descriptions = [
      'A shadowy figure emerges from the darkness...',
      'Flames engulf as a dragon descends...',
      'Reality warps around an otherworldly being...',
      'Dark magic crackles as a sorcerer appears...',
      'The earth trembles at the arrival of a titan...',
      'Time itself seems to stop as an ancient power awakens...',
    ];
    return descriptions[bossNumber - 1] || 'A powerful foe appears...';
  }

  /**
   * Complete a room
   * @param {Object} roguelikeState - Current run state
   * @param {Object} room - Room that was completed
   * @param {Object} actionResults - Results of player actions in room
   * @returns {Object} Updated roguelike state
   */
  completeRoom(roguelikeState, room, actionResults) {
    roguelikeState.floorsCleared++;

    // Track room type
    this.ensureVisitedRoomTypesSet(roguelikeState).add(room.type);

    // Check for milestone
    this.checkMilestone(roguelikeState);

    // Handle mini-boss defeat
    if (room.miniBoss && actionResults.bossDefeated) {
      roguelikeState.miniBossesDefeated++;
      roguelikeState.enemiesDefeated++;
      
      // Apply boss loot drops
      if (room.miniBoss.loot && room.miniBoss.loot.length > 0) {
        room.miniBoss.loot.forEach(loot => {
          if (loot.isArtifact) {
            roguelikeState.artifacts.push(loot);
          } else {
            roguelikeState.items.push(loot);
            // Add currency from loot
            if (loot.rarity === 'legendary') {
              roguelikeState.currencyAEarned += loot.value || 50;
            } else if (loot.rarity === 'rare') {
              roguelikeState.currencyAEarned += loot.value || 25;
            } else {
              roguelikeState.currencyAEarned += loot.value || 10;
            }
          }
        });
      }
      
      // Boss drops random buff (40% chance)
      if (Math.random() < 0.4) {
        const buffKeys = Object.keys(this.BUFFS);
        const buffType = buffKeys[Math.floor(Math.random() * buffKeys.length)];
        this.applyBuff(roguelikeState, buffType);
      }
      
      // Track damage dealt
      if (actionResults.damageDealt) {
        roguelikeState.totalDamageDealt += actionResults.damageDealt;
      }
    }

    // Handle room modifier effects on rewards
    let rewardMultiplier = 1.0;
    if (room.modifier) {
      if (room.modifier.type === 'blessed') rewardMultiplier = 1.5;
      else if (room.modifier.type === 'cursed') rewardMultiplier = 0.5;
      else if (room.modifier.type === 'inferno' && room.type === 'treasure') rewardMultiplier = 1.25;
    }

    // Handle room events
    if (room.event && actionResults.eventResolved) {
      if (actionResults.eventSuccess) {
        // Success reward
        const eventReward = Math.floor(5 * roguelikeState.currentFloor);
        roguelikeState.currencyAEarned += eventReward;
      } else {
        // Failure penalty
        roguelikeState.hp -= Math.floor(10 * roguelikeState.currentFloor / 5);
        roguelikeState.totalDamageTaken += Math.floor(10 * roguelikeState.currentFloor / 5);
      }
    }

    const bossCleared = !room.miniBoss || actionResults.bossDefeated;

    // Apply room rewards
    switch (room.type) {
      case 'skill':
        if (bossCleared && actionResults.selectedSkill) {
          roguelikeState.skills.push(actionResults.selectedSkill);
        }
        break;

      case 'treasure':
        if (bossCleared) {
          roguelikeState.treasureRoomsCleared++;
          roguelikeState.currencyAEarned += Math.floor(room.reward.currencyA * rewardMultiplier);
          roguelikeState.items.push(...room.reward.items);
        }
        break;

      case 'healing':
        roguelikeState.hp = Math.min(
          roguelikeState.hp + room.healAmount,
          roguelikeState.stats.maxHp
        );
        break;

      case 'rest':
        roguelikeState.mana = Math.min(
          roguelikeState.mana + room.restoreAmount,
          roguelikeState.stats.maxMana
        );
        break;

      case 'trap':
        if (!actionResults.avoided) {
          roguelikeState.hp -= room.danger.healthLoss;
          roguelikeState.currencyAEarned -= room.danger.currencyLoss;
          roguelikeState.currencyAEarned = Math.max(0, roguelikeState.currencyAEarned);
          roguelikeState.damageTokenTaken += room.danger.healthLoss;
          roguelikeState.totalDamageTaken += room.danger.healthLoss;
        }
        break;

      case 'shop':
        if (actionResults.purchasedItems) {
          roguelikeState.items.push(...actionResults.purchasedItems);
          roguelikeState.currencyBEarned -= actionResults.costB || 0;
          roguelikeState.shopUpgradesPurchased++;
        }
        break;

      case 'libraryRoom':
        if (bossCleared) {
          roguelikeState.skills.push(...room.reward.skills);
          roguelikeState.currencyAEarned += Math.floor(room.reward.currencyA * rewardMultiplier);
        }
        break;

      case 'armoryRoom':
        if (bossCleared) {
          roguelikeState.items.push(...room.reward.equipment);
          roguelikeState.stats.defense += room.reward.defense;
        }
        break;

      case 'alchemyRoom':
        if (bossCleared) {
          roguelikeState.items.push(...room.reward.potions);
          roguelikeState.stats.intelligence += room.reward.intelligence;
        }
        break;

      case 'combat':
      case 'mystery':
      case 'elite':
        if (bossCleared && room.reward) {
          roguelikeState.currencyAEarned += Math.floor((room.reward.currencyA || 0) * rewardMultiplier);
          roguelikeState.currencyBEarned += Math.floor((room.reward.currencyB || 0) * rewardMultiplier);
          roguelikeState.currencyCEarned += Math.floor((room.reward.currencyC || 0) * rewardMultiplier);
        }
        break;
    }

    // Advance buff/debuff durations
    this.advanceBuffDurations(roguelikeState);

    // Apply regeneration from active buffs
    const effects = this.getActiveEffects(roguelikeState);
    if (effects.regenPerRoom > 0) {
      roguelikeState.hp = Math.min(
        roguelikeState.hp + effects.regenPerRoom,
        roguelikeState.stats.maxHp
      );
    }

    return roguelikeState;
  }

  /**
   * Advance to next floor
   * @param {Object} roguelikeState - Current run state
   * @returns {Object} Updated state
   */
  advanceFloor(roguelikeState) {
    roguelikeState.currentFloor++;

    // Check if this is a boss floor
    const isBossFloor = roguelikeState.currentFloor % 5 === 0 || roguelikeState.currentFloor === 26;

    if (isBossFloor) {
      roguelikeState.bossesDefeated++;
      // Increase difficulty after boss
      roguelikeState.difficultyMultiplier *= 1.2;
    }

    return roguelikeState;
  }

  /**
   * Calculate currency rewards on run end
   * @param {Object} roguelikeState - Final run state
   * @param {string} exitMethod - 'death' or 'voluntaryExit'
   * @returns {Object} Currency rewards
   */
  calculateRewards(roguelikeState, exitMethod = 'death') {
    const multiplier = this.CURRENCY_REWARDS[exitMethod] || this.CURRENCY_REWARDS.death;

    // Base rewards per floor
    const baseA = roguelikeState.floorsCleared * 5;
    const baseB = roguelikeState.floorsCleared * 3;
    const baseC = roguelikeState.floorsCleared * 2;

    // Boss bonus
    const bossBonus = roguelikeState.bossesDefeated * 50;

    return {
      currencyA: Math.floor((baseA + roguelikeState.currencyAEarned + bossBonus) * multiplier.currencyA),
      currencyB: Math.floor((baseB + roguelikeState.currencyBEarned) * multiplier.currencyB),
      currencyC: Math.floor((baseC + bossBonus) * multiplier.currencyC),
    };
  }

  /**
   * Check if player has unlocked a room type
   * @param {Object} roguelikeState - Current run state
   * @param {string} roomType - Room type to check
   * @returns {boolean} Whether room is unlocked
   */
  isRoomUnlocked(roguelikeState, roomType) {
    return roguelikeState.unlockedRooms.includes(roomType);
  }

  /**
   * Purchase a room unlock
   * @param {Object} roguelikeState - Current run state
   * @param {string} roomType - Room type to purchase
   * @returns {boolean} Whether purchase was successful
   */
  purchaseRoomUnlock(roguelikeState, roomType) {
    const room = this.ROOM_TYPES[roomType];
    if (!room || !room.unlockable) return false;

    if (roguelikeState.currencyBEarned >= room.costB) {
      roguelikeState.currencyBEarned -= room.costB;
      roguelikeState.unlockedRooms.push(roomType);
      return true;
    }

    return false;
  }

  /**
   * Validate all achievements for a completed run
   * @param {Object} roguelikeState - Final run state
   * @returns {Array} Array of earned achievement IDs
   */
  validateAchievements(roguelikeState) {
    const earned = [];
    const visitedRoomTypes = this.ensureVisitedRoomTypesSet(roguelikeState);

    // tenBosses: Defeat 10 mini-bosses in a run
    if (roguelikeState.miniBossesDefeated >= 10) {
      earned.push('tenBosses');
    }

    // noDamage: Complete run without taking damage
    if (roguelikeState.damageTokenTaken === 0) {
      earned.push('noDamage');
    }

    // speedrun: Complete run in under 10 minutes
    if (roguelikeState.runDuration && roguelikeState.runDuration < 600) {
      earned.push('speedrun');
    }

    // allRoomTypes: Visit all room types in one run
    if (visitedRoomTypes.size >= 8) {
      earned.push('allRoomTypes');
    }

    // noConsumables: Complete run without using any consumable items
    if (roguelikeState.consumablesUsed === 0) {
      earned.push('noConsumables');
    }

    // maxFloor: Reach floor 26
    if (roguelikeState.currentFloor >= 26) {
      earned.push('maxFloor');
    }

    // collectThemAll: Collect at least 1 of each consumable type
    const consumableTypes = new Set(
      roguelikeState.items
        .filter(item => Object.keys(this.CONSUMABLES).includes(item.id))
        .map(item => item.id)
    );
    if (consumableTypes.size >= Object.keys(this.CONSUMABLES).length) {
      earned.push('collectThemAll');
    }

    // masterUpgrades: Purchase 5+ upgrades from shop
    if (roguelikeState.shopUpgradesPurchased >= 5) {
      earned.push('masterUpgrades');
    }

    roguelikeState.achievementsEarned = earned;
    return earned;
  }

  /**
   * Get all achievements with formatted display info
   * @returns {Object} Achievements with display formatting
   */
  getAchievementsList() {
    const list = {};
    Object.keys(this.ACHIEVEMENTS).forEach(key => {
      const achievement = this.ACHIEVEMENTS[key];
      list[key] = {
        id: key,
        name: achievement.name,
        description: achievement.description,
        criterion: achievement.criterion,
      };
    });
    return list;
  }

  /**
   * Calculate run duration
   * @param {Object} roguelikeState - Run state
   * @returns {number} Duration in seconds
   */
  calculateRunDuration(roguelikeState) {
    if (!roguelikeState.startedAt) return 0;
    return Math.floor((Date.now() - roguelikeState.startedAt) / 1000);
  }

  /**
   * Get final run summary for Discord embed with enhanced statistics
   * @param {Object} roguelikeState - Final run state
   * @param {string} exitReason - 'death' or 'voluntaryExit'
   * @returns {Object} Summary object for embedding
   */
  getRunSummary(roguelikeState, exitReason = 'death') {
    const duration = this.calculateRunDuration(roguelikeState);
    const durationMinutes = Math.floor(duration / 60);
    const durationSeconds = duration % 60;
    const earned = this.validateAchievements(roguelikeState);
    const rewards = this.calculateRewards(roguelikeState, exitReason);

    // Calculate detailed statistics
    const dps = duration > 0 ? Math.floor(roguelikeState.totalDamageDealt / (duration / 60)) : 0;
    const goldPerRoom = roguelikeState.floorsCleared > 0 ? Math.floor(roguelikeState.currencyAEarned / roguelikeState.floorsCleared) : 0;
    const itemsPerFloor = roguelikeState.floorsCleared > 0 ? (roguelikeState.items.length / roguelikeState.floorsCleared).toFixed(2) : 0;
    const survivalRate = Math.max(0, roguelikeState.hp);

    return {
      status: exitReason === 'death' ? '💀 Run Ended' : '✅ Completed',
      floor: roguelikeState.currentFloor,
      floorsCleared: roguelikeState.floorsCleared,
      bossesDefeated: roguelikeState.bossesDefeated,
      miniBossesDefeated: roguelikeState.miniBossesDefeated,
      duration: `${durationMinutes}m ${durationSeconds}s`,
      durationSeconds: duration,
      
      // Detailed statistics
      statistics: {
        damageDealt: roguelikeState.totalDamageDealt,
        damageTaken: roguelikeState.totalDamageTaken,
        dps: `${dps} per minute`,
        enemiesDefeated: roguelikeState.enemiesDefeated,
        treasureRoomsCleared: roguelikeState.treasureRoomsCleared,
        goldPerRoom: goldPerRoom,
        itemsCollected: roguelikeState.items.length,
        itemsPerFloor: itemsPerFloor,
        artifactsFound: roguelikeState.artifacts.length,
        criticalHits: roguelikeState.criticalHits,
        skillsLearned: roguelikeState.skills.length,
        survivalHP: survivalRate,
        theme: roguelikeState.themeName,
        milestonesReached: roguelikeState.milestonesReached,
      },
      
      // Legacy fields
      itemsCollected: roguelikeState.items.length,
      skillsLearned: roguelikeState.skills.length,
      
      // Rewards and achievements
      achievements: earned,
      rewards,
      finalHP: roguelikeState.hp,
      finalMana: roguelikeState.mana,
      
      // Efficiency metrics
      efficiency: {
        roomsPerMinute: roguelikeState.floorsCleared > 0 ? (roguelikeState.floorsCleared / (duration / 60)).toFixed(2) : 0,
        goldEfficiency: goldPerRoom,
        itemEfficiency: itemsPerFloor,
      },
    };
  }

  /**
   * Check if a milestone was reached at current floor
   * Milestones: 5, 10, 15, 20, 25
   * @param {Object} roguelikeState - Current run state
   */
  checkMilestone(roguelikeState) {
    const milestoneLevels = [5, 10, 15, 20, 25];
    if (milestoneLevels.includes(roguelikeState.currentFloor)) {
      roguelikeState.milestonesReached.push({
        floor: roguelikeState.currentFloor,
        timestamp: Date.now(),
        reward: Math.floor(100 * (roguelikeState.currentFloor / 5)),
      });
      roguelikeState.currencyAEarned += Math.floor(100 * (roguelikeState.currentFloor / 5));
    }
  }

  /**
   * Use an artifact item
   * @param {Object} roguelikeState - Current run state
   * @param {string} artifactId - Artifact ID
   * @returns {Object|null} Effect result or null if failed
   */
  useArtifact(roguelikeState, artifactId) {
    const artifactIdx = roguelikeState.artifacts.findIndex(a => a.id === artifactId);
    if (artifactIdx < 0) return null;

    const artifact = roguelikeState.artifacts[artifactIdx];
    const result = { artifactName: artifact.name, type: artifact.type };

    // Apply artifact effects
    switch (artifact.type) {
      case 'revive':
        result.effect = 'Survive next fatal blow';
        break;
      case 'timeControl':
        result.effect = 'Next room - 50% slower enemies';
        break;
      case 'critBoost':
        roguelikeState.criticalHits += 1;
        result.effect = 'Guaranteed critical hit';
        break;
      case 'currencyMultiplier':
        result.effect = 'Next 3 rooms give +100% gold';
        break;
      case 'buffPower':
        roguelikeState.activeBuffs.forEach(buff => {
          if (buff.damageMultiplier) buff.damageMultiplier *= 1.5;
          if (buff.rewardMultiplier) buff.rewardMultiplier *= 1.5;
        });
        result.effect = 'All buffs increased by 50%';
        break;
      case 'immunity':
        result.effect = 'Next 2 traps avoided';
        break;
      case 'fullHeal':
        roguelikeState.hp = roguelikeState.stats.maxHp;
        roguelikeState.mana = roguelikeState.stats.maxMana;
        result.effect = 'HP and Mana fully restored';
        break;
    }

    // Remove artifact after use (single-use items)
    roguelikeState.artifacts.splice(artifactIdx, 1);
    return result;
  }

  /**
   * Get artifact by ID
   * @param {string} artifactId - Artifact ID
   * @returns {Object|null} Artifact definition
   */
  getArtifact(artifactId) {
    return this.ARTIFACTS[artifactId] || null;
  }

  /**
   * Get all available artifacts
   * @returns {Object} All artifact definitions
   */
  getArtifactsList() {
    const list = {};
    Object.keys(this.ARTIFACTS).forEach(key => {
      const artifact = this.ARTIFACTS[key];
      list[key] = {
        id: key,
        name: artifact.name,
        type: artifact.type,
        effect: artifact.effect,
        rarity: artifact.rarity,
        uses: artifact.uses,
      };
    });
    return list;
  }

  /**
   * Get top players for leaderboard
   * @param {Array} playerLeaderboardData - Array of player leaderboard entries
   * @param {string} category - 'floor', 'bosses', 'time', or 'achievements'
   * @param {number} limit - Number of top entries to return
   * @returns {Array} Top entries sorted by criteria
   */
  getLeaderboard(playerLeaderboardData, category = 'floor', limit = 10) {
    let sorted = [...playerLeaderboardData];

    switch (category) {
      case 'floor':
        sorted.sort((a, b) => b.highestFloor - a.highestFloor);
        break;
      case 'bosses':
        sorted.sort((a, b) => b.bossesDefeated - a.bossesDefeated);
        break;
      case 'time':
        sorted.sort((a, b) => a.timeSeconds - b.timeSeconds);
        break;
      case 'achievements':
        sorted.sort((a, b) => (b.achievements?.length || 0) - (a.achievements?.length || 0));
        break;
      default:
        sorted.sort((a, b) => b.highestFloor - a.highestFloor);
    }

    return sorted.slice(0, limit);
  }

  /**
   * Format leaderboard entry for display
   * @param {Object} entry - Leaderboard entry
   * @param {number} rank - Rank position (1-based)
   * @returns {string} Formatted entry string
   */
  formatLeaderboardEntry(entry, rank) {
    const medals = ['🥇', '🥈', '🥉'];
    const emoji = medals[rank - 1] || `#${rank}`;
    return `${emoji} **${entry.userName}** - Floor ${entry.highestFloor} (${entry.bossesDefeated} bosses, ${Math.floor(entry.timeSeconds / 60)}m)`;
  }

  /**
   * Calculate cost for a specific upgrade level
   * @param {string} upgradeId - Upgrade identifier
   * @param {number} currentLevel - Current level of the upgrade
   * @returns {number} Cost for next level
   */
  calculateUpgradeCost(upgradeId, currentLevel) {
    const upgrade = this.PERMANENT_UPGRADES[upgradeId];
    if (!upgrade) return 0;
    if (currentLevel >= upgrade.maxLevel) return Infinity;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, currentLevel));
  }

  /**
   * Get all upgrades with current levels and costs
   * @param {Object} playerUpgrades - Player's current upgrade levels
   * @returns {Array} Array of upgrade objects with costs and details
   */
  getAvailableUpgrades(playerUpgrades) {
    const upgrades = [];
    Object.keys(this.PERMANENT_UPGRADES).forEach(key => {
      const upgrade = this.PERMANENT_UPGRADES[key];
      const currentLevel = playerUpgrades[key] || 0;
      const cost = this.calculateUpgradeCost(key, currentLevel);
      const isMaxed = currentLevel >= upgrade.maxLevel;
      
      upgrades.push({
        id: key,
        name: upgrade.name,
        emoji: upgrade.emoji,
        description: upgrade.description,
        detailDescription: upgrade.detailDescription,
        category: upgrade.category,
        currentLevel,
        maxLevel: upgrade.maxLevel,
        cost,
        increment: upgrade.increment,
        isMaxed,
        currentBonus: currentLevel * upgrade.increment,
        nextBonus: (currentLevel + 1) * upgrade.increment,
      });
    });
    return upgrades;
  }

  /**
   * Get upgrades grouped by category
   * @param {Object} playerUpgrades - Player's current upgrade levels
   * @returns {Object} Upgrades grouped by category
   */
  getUpgradesByCategory(playerUpgrades) {
    const upgrades = this.getAvailableUpgrades(playerUpgrades);
    const grouped = {
      survival: [],
      offense: [],
      magic: [],
      utility: [],
      progression: []
    };
    
    upgrades.forEach(upgrade => {
      if (grouped[upgrade.category]) {
        grouped[upgrade.category].push(upgrade);
      }
    });
    
    return grouped;
  }

  /**
   * Get details for a specific upgrade
   * @param {string} upgradeId - Upgrade identifier
   * @param {Object} playerUpgrades - Player's current upgrade levels
   * @returns {Object} Detailed upgrade information
   */
  getUpgradeDetails(upgradeId, playerUpgrades) {
    const upgrade = this.PERMANENT_UPGRADES[upgradeId];
    if (!upgrade) return null;
    
    const currentLevel = playerUpgrades[upgradeId] || 0;
    const cost = this.calculateUpgradeCost(upgradeId, currentLevel);
    const isMaxed = currentLevel >= upgrade.maxLevel;
    
    return {
      id: upgradeId,
      name: upgrade.name,
      emoji: upgrade.emoji,
      description: upgrade.description,
      detailDescription: upgrade.detailDescription,
      category: upgrade.category,
      currentLevel,
      maxLevel: upgrade.maxLevel,
      cost,
      increment: upgrade.increment,
      isMaxed,
      currentBonus: currentLevel * upgrade.increment,
      nextBonus: isMaxed ? currentLevel * upgrade.increment : (currentLevel + 1) * upgrade.increment,
      costProgression: this.getUpgradeCostProgression(upgradeId, currentLevel, 5),
    };
  }

  /**
   * Get cost progression for next N levels
   * @param {string} upgradeId - Upgrade identifier
   * @param {number} currentLevel - Current level
   * @param {number} levels - Number of levels to show
   * @returns {Array} Array of { level, cost } objects
   */
  getUpgradeCostProgression(upgradeId, currentLevel, levels = 5) {
    const upgrade = this.PERMANENT_UPGRADES[upgradeId];
    if (!upgrade) return [];
    
    const progression = [];
    for (let i = 1; i <= levels && (currentLevel + i) <= upgrade.maxLevel; i++) {
      const level = currentLevel + i;
      const cost = this.calculateUpgradeCost(upgradeId, level - 1);
      progression.push({ level, cost });
    }
    return progression;
  }

  /**
   * Purchase an upgrade for a player
   * @param {Object} player - Player object
   * @param {string} upgradeId - Upgrade identifier
   * @returns {Object} Result with success status and message
   */
  purchaseUpgrade(player, upgradeId) {
    const upgrade = this.PERMANENT_UPGRADES[upgradeId];
    if (!upgrade) {
      return { success: false, message: 'Invalid upgrade!' };
    }

    const currentLevel = player.roguelikeUpgrades[upgradeId] || 0;
    
    // Check if max level
    if (currentLevel >= upgrade.maxLevel) {
      return { success: false, message: 'Upgrade already at max level!' };
    }

    const cost = this.calculateUpgradeCost(upgradeId, currentLevel);
    
    // Check if player has enough currency
    if (player.roguelikeCurrencies.currencyA < cost) {
      return { 
        success: false, 
        message: `Not enough Currency A! Need ${cost}, have ${player.roguelikeCurrencies.currencyA}` 
      };
    }

    // Purchase upgrade
    player.roguelikeCurrencies.currencyA -= cost;
    player.roguelikeUpgrades[upgradeId] = currentLevel + 1;

    return {
      success: true,
      message: `Upgraded ${upgrade.name} to level ${currentLevel + 1}!`,
      newLevel: currentLevel + 1,
      bonusGained: upgrade.increment,
      currencyRemaining: player.roguelikeCurrencies.currencyA
    };
  }
}

export default RoguelikeManager;

