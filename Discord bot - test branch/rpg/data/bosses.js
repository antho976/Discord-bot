/**
 * World Bosses - Tier 4
 * One per world, unlocks next world when defeated
 * 
 * BOSS REWARDS (Enhanced for single-floor encounters):
 * - Massive XP and Gold rewards
 * - Legendary materials (5-10x more than dungeon drops)
 * - Epic equipment drops
 * - High-tier potions (T3-T4)
 * - Powerful enchantments (T2-T3)
 * - Guaranteed rare loot
 */

export const WORLD_BOSSES = {
  1: {
    id: 'boss_world_1',
    name: 'Goblin Warlord',
    description: 'The tyrannical ruler of Beginner\'s Vale',
    world: 1,
    minLevel: 8,
    level: 10,
    hp: 650,
    stats: {
      strength: 18,
      defense: 12,
      intelligence: 6,
      agility: 10,
    },
    skills: ['slash', 'shield_bash'],
    xpReward: 2500,  // Increased from 900
    goldReward: 1500,  // NEW: Boss-specific gold
    loot: ['mithril_blade', 'iron_greatsword', 'steel_plate'],
    materials: [
      { id: 'adamantite', quantity: 8 },
      { id: 'mithril_ore', quantity: 10 },
      { id: 'dragonhide', quantity: 5 },
      { id: 'arcane_essence', quantity: 6 },
      { id: 'moonflower', quantity: 5 }
    ],
    potions: [
      { id: 'health_potion_t3', quantity: 4 },
      { id: 'xp_potion_t3', quantity: 3 },
      { id: 'gold_potion_t3', quantity: 2 },
      { id: 'gathering_potion_t3', quantity: 2 },
      { id: 'loot_potion_t2', quantity: 2 }
    ],
    enchants: [
      { id: 'damage_enchant_t2', quantity: 2 },
      { id: 'loot_enchant_t2', quantity: 2 },
      { id: 'xp_enchant_t2', quantity: 1 }
    ],
    unlocksWorld: 2,
  },
  2: {
    id: 'boss_world_2',
    name: 'Shadow Empress',
    description: 'The dark ruler of the Shadow Forest',
    world: 2,
    minLevel: 18,
    level: 20,
    hp: 1100,
    stats: {
      strength: 24,
      defense: 18,
      intelligence: 20,
      agility: 16,
    },
    skills: ['fireball', 'ice_spike', 'backstab'],
    xpReward: 5000,  // Increased from 1800
    goldReward: 3500,  // NEW: Boss-specific gold
    loot: ['demonic_blade', 'mithril_blade', 'shadow_cloak', 'mithril_plate'],
    materials: [
      { id: 'dragonstone', quantity: 10 },
      { id: 'adamantite', quantity: 12 },
      { id: 'phoenix_feather', quantity: 8 },
      { id: 'dragonhide', quantity: 7 },
      { id: 'arcane_essence', quantity: 10 },
      { id: 'moonflower', quantity: 8 }
    ],
    potions: [
      { id: 'health_potion_t4', quantity: 5 },
      { id: 'xp_potion_t4', quantity: 4 },
      { id: 'gold_potion_t3', quantity: 3 },
      { id: 'gathering_potion_t4', quantity: 3 },
      { id: 'loot_potion_t3', quantity: 2 },
      { id: 'damage_potion_t3', quantity: 2 }
    ],
    enchants: [
      { id: 'damage_enchant_t3', quantity: 2 },
      { id: 'loot_enchant_t3', quantity: 2 },
      { id: 'xp_enchant_t2', quantity: 2 },
      { id: 'doublehit_enchant_t2', quantity: 1 }
    ],
    unlocksWorld: 3,
  },
  3: {
    id: 'boss_world_3',
    name: 'Stone Colossus',
    description: 'An ancient giant guardian of the Mountains',
    world: 3,
    minLevel: 28,
    level: 30,
    hp: 1800,
    stats: {
      strength: 32,
      defense: 35,
      intelligence: 12,
      agility: 6,
    },
    skills: ['shield_bash', 'parry', 'holy_strike'],
    xpReward: 8500,  // Increased from 3200
    goldReward: 6000,  // NEW: Boss-specific gold
    loot: ['demonic_blade', 'crown_darkness', 'infernal_armor', 'mithril_plate', 'colossus_hammer'],
    materials: [
      { id: 'dragonstone', quantity: 15 },
      { id: 'phoenix_feather', quantity: 12 },
      { id: 'adamantite', quantity: 18 },
      { id: 'dragonhide', quantity: 10 },
      { id: 'moonflower', quantity: 12 },
      { id: 'arcane_essence', quantity: 15 }
    ],
    potions: [
      { id: 'health_potion_t4', quantity: 8 },
      { id: 'xp_potion_t4', quantity: 6 },
      { id: 'gold_potion_t4', quantity: 5 },
      { id: 'gathering_potion_t4', quantity: 5 },
      { id: 'loot_potion_t4', quantity: 4 },
      { id: 'damage_potion_t4', quantity: 3 }
    ],
    enchants: [
      { id: 'damage_enchant_t3', quantity: 3 },
      { id: 'loot_enchant_t3', quantity: 2 },
      { id: 'xp_enchant_t3', quantity: 2 },
      { id: 'doublehit_enchant_t3', quantity: 2 },
      { id: 'lifesteal_enchant_t2', quantity: 1 }
    ],
    unlocksWorld: 4,
  },
  4: {
    id: 'boss_world_4',
    name: 'Demon Overlord',
    description: 'The ultimate evil ruling the Infernal Abyss',
    world: 4,
    minLevel: 40,
    level: 50,
    hp: 3200,
    stats: {
      strength: 48,
      defense: 40,
      intelligence: 35,
      agility: 28,
    },
    skills: ['fireball', 'backstab', 'divine_protection', 'heal'],
    xpReward: 15000,  // Increased from 6500
    goldReward: 10000,  // NEW: Boss-specific gold
    loot: ['demonic_blade', 'crown_darkness', 'infernal_armor', 'hellfire_ring', 'deathbringer', 'void_staff'],
    materials: [
      { id: 'phoenix_feather', quantity: 20 },
      { id: 'dragonstone', quantity: 18 },
      { id: 'adamantite', quantity: 25 },
      { id: 'dragonhide', quantity: 15 },
      { id: 'moonflower', quantity: 18 },
      { id: 'arcane_essence', quantity: 20 }
    ],
    potions: [
      { id: 'health_potion_t4', quantity: 12 },
      { id: 'xp_potion_t4', quantity: 10 },
      { id: 'gold_potion_t4', quantity: 8 },
      { id: 'gathering_potion_t4', quantity: 8 },
      { id: 'loot_potion_t4', quantity: 6 },
      { id: 'damage_potion_t4', quantity: 6 }
    ],
    enchants: [
      { id: 'damage_enchant_t3', quantity: 4 },
      { id: 'loot_enchant_t3', quantity: 3 },
      { id: 'xp_enchant_t3', quantity: 3 },
      { id: 'doublehit_enchant_t3', quantity: 2 },
      { id: 'lifesteal_enchant_t3', quantity: 2 }
    ],
    unlocksWorld: null,
  },
};
