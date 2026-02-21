/**
 * Multi-Enemy Encounters System - Group encounters with multiple enemies
 */

import Enemy from '../models/Enemy.js';

export const ENEMY_GROUPS = {
  // Goblin groups
  goblin_scout_party: {
    id: 'goblin_scout_party',
    name: 'Goblin Scout Party',
    description: 'A group of goblin scouts on patrol',
    baseLevel: 3,
    enemies: [
      { name: 'Goblin Scout', level: 3, count: 3 },
      { name: 'Goblin Archer', level: 3, count: 1 },
    ],
    rewards: { xpMult: 1.5, goldMult: 1.4 },
    difficulty: 'medium',
  },

  goblin_war_band: {
    id: 'goblin_war_band',
    name: 'Goblin War Band',
    description: 'Heavily armed goblins on the warpath',
    baseLevel: 6,
    enemies: [
      { name: 'Goblin Warrior', level: 6, count: 2 },
      { name: 'Goblin Shaman', level: 6, count: 1 },
      { name: 'Goblin Berserker', level: 7, count: 1 },
    ],
    rewards: { xpMult: 2.0, goldMult: 1.8 },
    difficulty: 'hard',
  },

  // Skeleton groups
  skeleton_patrol: {
    id: 'skeleton_patrol',
    name: 'Skeleton Patrol',
    description: 'Undead skeletons guarding the crypt',
    baseLevel: 4,
    enemies: [
      { name: 'Skeleton Warrior', level: 4, count: 3 },
      { name: 'Skeleton Mage', level: 4, count: 1 },
    ],
    rewards: { xpMult: 1.6, goldMult: 1.5 },
    difficulty: 'medium',
  },

  skeleton_death_squad: {
    id: 'skeleton_death_squad',
    name: 'Skeleton Death Squad',
    description: 'Elite undead warriors',
    baseLevel: 8,
    enemies: [
      { name: 'Skeleton Knight', level: 8, count: 2 },
      { name: 'Skeleton Lich', level: 9, count: 1 },
      { name: 'Skeletal Dragon', level: 10, count: 1 },
    ],
    rewards: { xpMult: 2.5, goldMult: 2.0 },
    difficulty: 'very_hard',
  },

  // Bandit groups
  bandit_thieves: {
    id: 'bandit_thieves',
    name: 'Bandit Thieves',
    description: 'Petty criminals hoping to rob travelers',
    baseLevel: 2,
    enemies: [
      { name: 'Bandit', level: 2, count: 4 },
      { name: 'Bandit Leader', level: 3, count: 1 },
    ],
    rewards: { xpMult: 1.2, goldMult: 1.3 },
    difficulty: 'easy',
  },

  bandit_syndicate: {
    id: 'bandit_syndicate',
    name: 'Bandit Syndicate',
    description: 'Organized crime group',
    baseLevel: 7,
    enemies: [
      { name: 'Syndicate Operative', level: 7, count: 2 },
      { name: 'Syndicate Assassin', level: 7, count: 2 },
      { name: 'Syndicate Boss', level: 8, count: 1 },
    ],
    rewards: { xpMult: 1.8, goldMult: 2.2 },
    difficulty: 'hard',
  },

  // Orc groups
  orc_raiding_party: {
    id: 'orc_raiding_party',
    name: 'Orc Raiding Party',
    description: 'Savage orc warriors raiding settlements',
    baseLevel: 5,
    enemies: [
      { name: 'Orc Warrior', level: 5, count: 2 },
      { name: 'Orc Shaman', level: 5, count: 1 },
      { name: 'Orc Brute', level: 6, count: 1 },
    ],
    rewards: { xpMult: 1.7, goldMult: 1.6 },
    difficulty: 'medium',
  },

  orc_horde: {
    id: 'orc_horde',
    name: 'Orc Horde',
    description: 'A massive gathering of orc warriors',
    baseLevel: 9,
    enemies: [
      { name: 'Orc Warlord', level: 10, count: 1 },
      { name: 'Orc Lieutenant', level: 9, count: 2 },
      { name: 'Orc Warrior', level: 8, count: 3 },
    ],
    rewards: { xpMult: 2.8, goldMult: 2.3 },
    difficulty: 'extreme',
  },

  // Dragon groups
  dragon_lair: {
    id: 'dragon_lair',
    name: 'Dragon Lair',
    description: 'Home to a powerful dragon and its minions',
    baseLevel: 15,
    enemies: [
      { name: 'Dragon Whelp', level: 12, count: 2 },
      { name: 'Drake', level: 13, count: 1 },
      { name: 'Ancient Dragon', level: 15, count: 1 },
    ],
    rewards: { xpMult: 3.5, goldMult: 3.0 },
    difficulty: 'legendary',
  },

  // Demon groups
  demon_cult: {
    id: 'demon_cult',
    name: 'Demon Cult',
    description: 'Servant demons summoned by cultists',
    baseLevel: 11,
    enemies: [
      { name: 'Lesser Demon', level: 10, count: 3 },
      { name: 'Demon Acolyte', level: 11, count: 2 },
      { name: 'Demon Lord', level: 12, count: 1 },
    ],
    rewards: { xpMult: 2.2, goldMult: 2.5 },
    difficulty: 'very_hard',
  },
};

/**
 * Get enemy group by ID
 */
export function getEnemyGroup(groupId) {
  return ENEMY_GROUPS[groupId] || null;
}

/**
 * Get random enemy group for player level
 */
export function getRandomEnemyGroupForLevel(playerLevel, difficulty = 'medium') {
  const groupIds = Object.keys(ENEMY_GROUPS);
  const filtered = groupIds.filter(id => {
    const group = ENEMY_GROUPS[id];
    const levelDiff = Math.abs(group.baseLevel - playerLevel);
    
    switch(difficulty) {
      case 'easy': return levelDiff <= 2 && group.baseLevel <= playerLevel;
      case 'medium': return levelDiff <= 3;
      case 'hard': return group.baseLevel >= playerLevel - 1;
      case 'very_hard': return group.baseLevel >= playerLevel + 1;
      case 'extreme': return group.baseLevel >= playerLevel + 3;
      default: return true;
    }
  });

  if (filtered.length === 0) return null;
  return ENEMY_GROUPS[filtered[Math.floor(Math.random() * filtered.length)]];
}

/**
 * Create enemy instances from group definition
 */
export function createEnemyGroupInstances(groupDef, scaleFactor = 1) {
  if (!groupDef) return [];

  const enemies = [];
  
  for (const enemySpec of groupDef.enemies) {
    const scaledLevel = Math.floor(enemySpec.level * scaleFactor);
    
    for (let i = 0; i < enemySpec.count; i++) {
      const enemy = new Enemy(enemySpec.name, scaledLevel);
      enemies.push(enemy);
    }
  }

  return enemies;
}

/**
 * Get difficulty rating for a group
 */
export function getGroupDifficultyRating(group, playerStats) {
  if (!group) return 'unknown';

  const totalEnemyLevel = group.enemies.reduce((sum, e) => sum + (e.level * e.count), 0);
  const avgEnemyLevel = totalEnemyLevel / group.enemies.reduce((sum, e) => sum + e.count, 0);
  
  const levelDiff = avgEnemyLevel - playerStats.level;

  if (levelDiff <= -3) return 'trivial';
  if (levelDiff <= -1) return 'easy';
  if (levelDiff <= 1) return 'medium';
  if (levelDiff <= 3) return 'hard';
  if (levelDiff <= 5) return 'very_hard';
  
  return 'extreme';
}

/**
 * Get summary of enemy group
 */
export function getGroupSummary(group) {
  if (!group) return null;

  const enemyList = group.enemies
    .map(e => `${e.count}× ${e.name} (Lv.${e.level})`)
    .join(', ');

  return {
    name: group.name,
    description: group.description,
    difficulty: group.difficulty,
    enemies: enemyList,
    totalCount: group.enemies.reduce((sum, e) => sum + e.count, 0),
  };
}

/**
 * Calculate total enemy strength
 */
export function calculateGroupStrength(group) {
  let totalStrength = 0;

  for (const enemy of group.enemies) {
    // Strength = level × count × base multiplier
    totalStrength += (enemy.level * enemy.count * 1.5);
  }

  return totalStrength;
}
