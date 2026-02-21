/**
 * Collectibles System
 * Rare items players can collect with milestone rewards
 */

export const COLLECTIBLES = {
  // Rare Creature Souls
  soul_wolf: {
    id: 'soul_wolf',
    name: 'Wolf Soul',
    description: 'The essence of a fallen wolf',
    rarity: 'common',
    icon: '🐺',
    category: 'souls',
    dropSource: 'Wolf enemies',
  },
  soul_dragon: {
    id: 'soul_dragon',
    name: 'Dragon Soul',
    description: 'The mighty essence of a slain dragon',
    rarity: 'legendary',
    icon: '🐉',
    category: 'souls',
    dropSource: 'Dragon bosses',
  },
  soul_phoenix: {
    id: 'soul_phoenix',
    name: 'Phoenix Soul',
    description: 'The eternal flame of rebirth',
    rarity: 'mythic',
    icon: '🔥',
    category: 'souls',
    dropSource: 'Phoenix raid boss',
  },
  
  // Ancient Artifacts
  artifact_odin_eye: {
    id: 'artifact_odin_eye',
    name: "Odin's Eye",
    description: 'A replica of the All-Father\'s sacrificed eye',
    rarity: 'legendary',
    icon: '👁️',
    category: 'artifacts',
    dropSource: 'Asgard world bosses',
  },
  artifact_mjolnir_fragment: {
    id: 'artifact_mjolnir_fragment',
    name: 'Mjolnir Fragment',
    description: 'A tiny shard of Thor\'s legendary hammer',
    rarity: 'epic',
    icon: '🔨',
    category: 'artifacts',
    dropSource: 'Thunder dungeons',
  },
  artifact_yggdrasil_seed: {
    id: 'artifact_yggdrasil_seed',
    name: 'Yggdrasil Seed',
    description: 'A seed from the World Tree itself',
    rarity: 'mythic',
    icon: '🌱',
    category: 'artifacts',
    dropSource: 'World Tree raid',
  },
  
  // Mystical Treasures
  treasure_golden_fleece: {
    id: 'treasure_golden_fleece',
    name: 'Golden Fleece',
    description: 'The legendary prize of Jason\'s quest',
    rarity: 'legendary',
    icon: '🐑',
    category: 'treasures',
    dropSource: 'Greek mythology quests',
  },
  treasure_philosophers_stone: {
    id: 'treasure_philosophers_stone',
    name: "Philosopher's Stone",
    description: 'The ultimate goal of alchemy',
    rarity: 'mythic',
    icon: '💎',
    category: 'treasures',
    dropSource: 'Master alchemist quest',
  },
  
  // Exotic Pets
  pet_baby_dragon: {
    id: 'pet_baby_dragon',
    name: 'Baby Dragon',
    description: 'An adorable dragon hatchling',
    rarity: 'rare',
    icon: '🦎',
    category: 'pets',
    dropSource: 'Dragon nests',
  },
  pet_phoenix_chick: {
    id: 'pet_phoenix_chick',
    name: 'Phoenix Chick',
    description: 'A newborn phoenix, still learning to fly',
    rarity: 'epic',
    icon: '🐦',
    category: 'pets',
    dropSource: 'Phoenix events',
  },
  pet_frost_fox: {
    id: 'pet_frost_fox',
    name: 'Frost Fox',
    description: 'A mystical fox from the frozen north',
    rarity: 'rare',
    icon: '🦊',
    category: 'pets',
    dropSource: 'Winter zones',
  },
  
  // Rare Gems
  gem_star_ruby: {
    id: 'gem_star_ruby',
    name: 'Star Ruby',
    description: 'A ruby with a perfect star pattern',
    rarity: 'rare',
    icon: '💍',
    category: 'gems',
    dropSource: 'Mining in deep caves',
  },
  gem_moonstone: {
    id: 'gem_moonstone',
    name: 'Moonstone',
    description: 'Glows with lunar energy',
    rarity: 'epic',
    icon: '🌙',
    category: 'gems',
    dropSource: 'Night gathering',
  },
  gem_sun_diamond: {
    id: 'gem_sun_diamond',
    name: 'Sun Diamond',
    description: 'Radiates pure solar power',
    rarity: 'legendary',
    icon: '☀️',
    category: 'gems',
    dropSource: 'Solar eclipse events',
  },
};

export const COLLECTIBLE_CATEGORIES = {
  souls: {
    id: 'souls',
    name: 'Creature Souls',
    icon: '👻',
    description: 'Essences of defeated creatures',
  },
  artifacts: {
    id: 'artifacts',
    name: 'Ancient Artifacts',
    icon: '🏺',
    description: 'Legendary items from mythology',
  },
  treasures: {
    id: 'treasures',
    name: 'Mystical Treasures',
    icon: '📿',
    description: 'Rare and powerful treasures',
  },
  pets: {
    id: 'pets',
    name: 'Exotic Pets',
    icon: '🐾',
    description: 'Unique companion creatures',
  },
  gems: {
    id: 'gems',
    name: 'Rare Gems',
    icon: '💎',
    description: 'Precious gemstones with magical properties',
  },
};

/**
 * Milestone rewards for collecting X collectibles
 */
export const COLLECTIBLE_MILESTONES = {
  10: {
    count: 10,
    title: 'Novice Collector',
    rewards: {
      gold: 5000,
      xp: 1000,
      items: [],
    },
  },
  20: {
    count: 20,
    title: 'Dedicated Collector',
    rewards: {
      gold: 15000,
      xp: 3000,
      items: ['collectible_bag'], // Special item
    },
  },
  30: {
    count: 30,
    title: 'Expert Collector',
    rewards: {
      gold: 30000,
      xp: 7000,
      items: [],
    },
  },
  50: {
    count: 50,
    title: 'Master Collector',
    rewards: {
      gold: 75000,
      xp: 20000,
      items: ['collectors_crown'], // Special rare item
    },
  },
  75: {
    count: 75,
    title: 'Legendary Collector',
    rewards: {
      gold: 150000,
      xp: 50000,
      items: ['artifact_of_collection'], // Mythic item
    },
  },
  100: {
    count: 100,
    title: 'Supreme Collector',
    rewards: {
      gold: 300000,
      xp: 100000,
      items: ['ultimate_collectors_trophy'], // Ultimate reward
    },
  },
};

/**
 * Get a collectible by ID
 */
export function getCollectible(id) {
  return COLLECTIBLES[id] || null;
}

/**
 * Get all collectibles by category
 */
export function getCollectiblesByCategory(category) {
  return Object.values(COLLECTIBLES).filter(c => c.category === category);
}

/**
 * Check if player has reached a milestone
 */
export function checkCollectibleMilestone(collectedCount) {
  const milestones = Object.values(COLLECTIBLE_MILESTONES).sort((a, b) => a.count - b.count);
  return milestones.filter(m => collectedCount >= m.count);
}

/**
 * Get next unclaimed milestone
 */
export function getNextMilestone(collectedCount, claimedMilestones = []) {
  const allMilestones = Object.values(COLLECTIBLE_MILESTONES).sort((a, b) => a.count - b.count);
  return allMilestones.find(m => collectedCount >= m.count && !claimedMilestones.includes(m.count));
}
