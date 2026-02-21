/**
 * Guild Boss System
 * Weekly guild raid bosses and world bosses
 */

export const GUILD_BOSSES = {
  'guild_boss_goblin_king': {
    id: 'guild_boss_goblin_king',
    name: 'Goblin King',
    icon: '👑',
    description: 'A massive goblin warlord leading an army of goblins',
    minGuildLevel: 5,
    maxHP: 30000,
    defense: 100,
    attack: 150,
    loot: {
      guaranteed: [
        { id: 'gold', quantity: 5000 },
        { id: 'guild_xp', quantity: 500 },
      ],
      possible: [
        { id: 'item_uncommon_weapon', chance: 0.3 },
        { id: 'iron_ore', quantity: 50, chance: 0.5 },
        { id: 'health_potion', quantity: 10, chance: 0.7 },
      ],
    },
    rewards: {
      guildXP: 500,
      guildGold: 5000,
      perPlayer: {
        gold: 1000,
        xp: 500,
      },
      tiers: {
        tier1: {
          gold: 250,
          xp: 150,
          items: [
            { id: 'iron_ore', quantity: 10 },
            { id: 'granite', quantity: 6 },
            { id: 'health_potion_t1', quantity: 2 },
            { id: 'xp_potion_t1', quantity: 1 },
            { id: 'damage_enchant_t1', quantity: 1 },
          ],
        },
        tier3: {
          gold: 750,
          xp: 450,
          items: [
            { id: 'mithril_ore', quantity: 8 },
            { id: 'mana_crystal', quantity: 6 },
            { id: 'health_potion_t2', quantity: 3 },
            { id: 'xp_potion_t2', quantity: 2 },
            { id: 'loot_enchant_t1', quantity: 1 },
          ],
        },
        tier5: {
          gold: 1500,
          xp: 900,
          items: [
            { id: 'adamantite', quantity: 6 },
            { id: 'arcane_essence', quantity: 6 },
            { id: 'health_potion_t3', quantity: 4 },
            { id: 'xp_potion_t3', quantity: 3 },
            { id: 'damage_enchant_t2', quantity: 1 },
            { id: 'loot_enchant_t2', quantity: 1 },
          ],
        },
      },
      killBonus: {
        multiplier: 2,
        badgeId: 'guild_boss_badge',
        achievementTiers: [1, 5, 10],
      },
    },
  },
  'guild_boss_frost_wyrm': {
    id: 'guild_boss_frost_wyrm',
    name: 'Frost Wyrm',
    icon: '🐉',
    description: 'An ancient ice dragon that freezes everything in its path',
    minGuildLevel: 10,
    maxHP: 85000,
    defense: 200,
    attack: 300,
    loot: {
      guaranteed: [
        { id: 'gold', quantity: 15000 },
        { id: 'guild_xp', quantity: 1500 },
        { id: 'frost_scale', quantity: 5 },
      ],
      possible: [
        { id: 'item_rare_weapon', chance: 0.2 },
        { id: 'diamond', quantity: 10, chance: 0.3 },
        { id: 'ice_crystal', quantity: 20, chance: 0.5 },
      ],
    },
    rewards: {
      guildXP: 1500,
      guildGold: 15000,
      perPlayer: {
        gold: 3000,
        xp: 1500,
      },
      tiers: {
        tier1: {
          gold: 800,
          xp: 400,
          items: [
            { id: 'mithril_ore', quantity: 10 },
            { id: 'ice_crystal', quantity: 8 },
            { id: 'health_potion_t2', quantity: 3 },
            { id: 'xp_potion_t2', quantity: 2 },
            { id: 'damage_enchant_t1', quantity: 1 },
          ],
        },
        tier3: {
          gold: 2000,
          xp: 1200,
          items: [
            { id: 'adamantite', quantity: 10 },
            { id: 'moonflower', quantity: 8 },
            { id: 'health_potion_t3', quantity: 4 },
            { id: 'xp_potion_t3', quantity: 3 },
            { id: 'damage_enchant_t2', quantity: 1 },
            { id: 'loot_enchant_t1', quantity: 1 },
          ],
        },
        tier5: {
          gold: 4000,
          xp: 2500,
          items: [
            { id: 'phoenix_feather', quantity: 6 },
            { id: 'dragonhide', quantity: 8 },
            { id: 'health_potion_t4', quantity: 5 },
            { id: 'xp_potion_t4', quantity: 4 },
            { id: 'loot_potion_t3', quantity: 2 },
            { id: 'damage_enchant_t3', quantity: 1 },
            { id: 'doublehit_enchant_t2', quantity: 1 },
          ],
        },
      },
      killBonus: {
        multiplier: 2,
        badgeId: 'guild_boss_badge',
        achievementTiers: [1, 5, 10],
      },
    },
  },
  'guild_boss_shadow_lord': {
    id: 'guild_boss_shadow_lord',
    name: 'Shadow Lord',
    icon: '👤',
    description: 'A powerful demon commanding shadow forces',
    minGuildLevel: 15,
    maxHP: 170000,
    defense: 350,
    attack: 450,
    loot: {
      guaranteed: [
        { id: 'gold', quantity: 30000 },
        { id: 'guild_xp', quantity: 3000 },
        { id: 'shadow_essence', quantity: 10 },
      ],
      possible: [
        { id: 'item_epic_weapon', chance: 0.15 },
        { id: 'mythril_ore', quantity: 20, chance: 0.4 },
        { id: 'cursed_gem', quantity: 5, chance: 0.3 },
      ],
    },
    rewards: {
      guildXP: 3000,
      guildGold: 30000,
      perPlayer: {
        gold: 5000,
        xp: 3000,
      },
      tiers: {
        tier1: {
          gold: 1200,
          xp: 700,
          items: [
            { id: 'arcane_essence', quantity: 10 },
            { id: 'rare_flower', quantity: 8 },
            { id: 'health_potion_t2', quantity: 3 },
            { id: 'xp_potion_t2', quantity: 2 },
            { id: 'damage_enchant_t2', quantity: 1 },
          ],
        },
        tier3: {
          gold: 3000,
          xp: 2000,
          items: [
            { id: 'adamantite', quantity: 12 },
            { id: 'moonflower', quantity: 10 },
            { id: 'health_potion_t3', quantity: 5 },
            { id: 'xp_potion_t3', quantity: 4 },
            { id: 'loot_potion_t2', quantity: 2 },
            { id: 'damage_enchant_t3', quantity: 1 },
            { id: 'loot_enchant_t2', quantity: 1 },
          ],
        },
        tier5: {
          gold: 6000,
          xp: 4000,
          items: [
            { id: 'dragonstone', quantity: 10 },
            { id: 'phoenix_feather', quantity: 8 },
            { id: 'health_potion_t4', quantity: 6 },
            { id: 'xp_potion_t4', quantity: 5 },
            { id: 'loot_potion_t3', quantity: 3 },
            { id: 'damage_enchant_t3', quantity: 2 },
            { id: 'doublehit_enchant_t3', quantity: 1 },
          ],
        },
      },
      killBonus: {
        multiplier: 2,
        badgeId: 'guild_boss_badge',
        achievementTiers: [1, 5, 10],
      },
    },
  },
  'guild_boss_titan': {
    id: 'guild_boss_titan',
    name: 'Ancient Titan',
    icon: '⚡',
    description: 'A colossal titan from the age of myths',
    minGuildLevel: 20,
    maxHP: 285000,
    defense: 500,
    attack: 600,
    loot: {
      guaranteed: [
        { id: 'gold', quantity: 50000 },
        { id: 'guild_xp', quantity: 5000 },
        { id: 'titan_core', quantity: 1 },
      ],
      possible: [
        { id: 'item_legendary_weapon', chance: 0.1 },
        { id: 'orichalcum_ore', quantity: 10, chance: 0.25 },
        { id: 'titan_blood', quantity: 3, chance: 0.4 },
      ],
    },
    rewards: {
      guildXP: 5000,
      guildGold: 50000,
      perPlayer: {
        gold: 10000,
        xp: 5000,
      },
      tiers: {
        tier1: {
          gold: 2000,
          xp: 1200,
          items: [
            { id: 'adamantite', quantity: 12 },
            { id: 'dragonhide', quantity: 10 },
            { id: 'health_potion_t3', quantity: 4 },
            { id: 'xp_potion_t3', quantity: 3 },
            { id: 'damage_enchant_t2', quantity: 2 },
          ],
        },
        tier3: {
          gold: 5000,
          xp: 3200,
          items: [
            { id: 'dragonstone', quantity: 12 },
            { id: 'phoenix_feather', quantity: 10 },
            { id: 'health_potion_t4', quantity: 5 },
            { id: 'xp_potion_t4', quantity: 4 },
            { id: 'loot_potion_t3', quantity: 2 },
            { id: 'damage_enchant_t3', quantity: 2 },
            { id: 'loot_enchant_t3', quantity: 1 },
          ],
        },
        tier5: {
          gold: 10000,
          xp: 7000,
          items: [
            { id: 'dragonstone', quantity: 18 },
            { id: 'phoenix_feather', quantity: 15 },
            { id: 'arcane_essence', quantity: 12 },
            { id: 'health_potion_t4', quantity: 6 },
            { id: 'xp_potion_t4', quantity: 5 },
            { id: 'loot_potion_t4', quantity: 3 },
            { id: 'damage_enchant_t3', quantity: 3 },
            { id: 'doublehit_enchant_t3', quantity: 2 },
            { id: 'lifesteal_enchant_t2', quantity: 1 },
            { id: 'demonic_blade', quantity: 1 },
          ],
        },
      },
      killBonus: {
        multiplier: 2,
        badgeId: 'guild_boss_badge',
        achievementTiers: [1, 5, 10],
      },
    },
  },
};

/**
 * Guild World Bosses - Massive HP, 48 hour duration
 */
export const GUILD_WORLD_BOSSES = {
  'world_boss_void_dragon': {
    id: 'world_boss_void_dragon',
    name: 'Void Dragon Nidhogg',
    icon: '🐲',
    description: 'A destroyer of worlds, emerged from the void',
    minGuildLevel: 20,
    maxHP: 10000000, // 10 million HP
    defense: 800,
    attack: 1000,
    duration: 48 * 60 * 60 * 1000, // 48 hours
    rewards: {
      guildXP: 25000,
      guildGold: 200000,
      topDamage: [
        { rank: 1, gold: 50000, items: ['legendary_chest'] },
        { rank: 2, gold: 30000, items: ['epic_chest'] },
        { rank: 3, gold: 20000, items: ['rare_chest'] },
      ],
      participation: {
        gold: 5000,
        xp: 2000,
      },
    },
  },
  'world_boss_chaos_serpent': {
    id: 'world_boss_chaos_serpent',
    name: 'Chaos Serpent Jörmungandr',
    icon: '🐍',
    description: 'The world serpent, bringer of chaos and destruction',
    minGuildLevel: 25,
    maxHP: 20000000, // 20 million HP
    defense: 1000,
    attack: 1200,
    duration: 48 * 60 * 60 * 1000,
    rewards: {
      guildXP: 50000,
      guildGold: 500000,
      topDamage: [
        { rank: 1, gold: 100000, items: ['legendary_chest', 'chaos_fragment'] },
        { rank: 2, gold: 60000, items: ['epic_chest', 'chaos_fragment'] },
        { rank: 3, gold: 40000, items: ['rare_chest'] },
      ],
      participation: {
        gold: 10000,
        xp: 5000,
      },
    },
  },
};

/**
 * Get available guild bosses for a guild level
 */
export function getAvailableGuildBosses(guildLevel) {
  return Object.values(GUILD_BOSSES).filter(boss => boss.minGuildLevel <= guildLevel);
}

/**
 * Get available world bosses for a guild level
 */
export function getAvailableWorldBosses(guildLevel) {
  return Object.values(GUILD_WORLD_BOSSES).filter(boss => boss.minGuildLevel <= guildLevel);
}

/**
 * Get guild boss by ID
 */
export function getGuildBoss(bossId) {
  return GUILD_BOSSES[bossId] || null;
}

/**
 * Get world boss by ID
 */
export function getWorldBoss(bossId) {
  return GUILD_WORLD_BOSSES[bossId] || null;
}

/**
 * Calculate damage contribution rewards
 */
export function calculateDamageRewards(totalDamage, bossMaxHP, baseRewards) {
  const damagePercent = (totalDamage / bossMaxHP) * 100;
  const multiplier = Math.min(damagePercent / 10, 2); // Up to 2x for 20%+ damage
  
  return {
    gold: Math.floor(baseRewards.gold * multiplier),
    xp: Math.floor(baseRewards.xp * multiplier),
  };
}
