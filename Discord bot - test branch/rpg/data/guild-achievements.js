/**
 * Guild Achievements System
 * Collective achievements for guild progression
 */

import { getGuildLevel } from './guild-levels.js';

export const GUILD_ACHIEVEMENTS = {
  // Member Achievements
  guild_starter: {
    id: 'guild_starter',
    name: 'Getting Started',
    description: 'Recruit your first guild member (3 total)',
    icon: '👥',
    requirement: { type: 'memberCount', value: 3 },
    rewards: { gold: 5000, xp: 1000 },
    rarity: 'common',
  },
  guild_growing: {
    id: 'guild_growing',
    name: 'Growing Community',
    description: 'Reach 10 guild members',
    icon: '👥',
    requirement: { type: 'memberCount', value: 10 },
    rewards: { gold: 10000, xp: 2500 },
    rarity: 'common',
  },
  guild_large: {
    id: 'guild_large',
    name: 'Thriving Guild',
    description: 'Reach 25 guild members',
    icon: '👥',
    requirement: { type: 'memberCount', value: 25 },
    rewards: { gold: 25000, xp: 7500 },
    rarity: 'uncommon',
  },
  guild_massive: {
    id: 'guild_massive',
    name: 'Massive Guild',
    description: 'Reach 50 guild members',
    icon: '👥',
    requirement: { type: 'memberCount', value: 50 },
    rewards: { gold: 50000, xp: 17500 },
    rarity: 'rare',
  },
  
  // Level Achievements
  guild_level_10: {
    id: 'guild_level_10',
    name: 'Established Guild',
    description: 'Reach guild level 10',
    icon: '⭐',
    requirement: { type: 'level', value: 10 },
    rewards: { gold: 20000, xp: 5000 },
    rarity: 'uncommon',
  },
  guild_level_25: {
    id: 'guild_level_25',
    name: 'Powerful Guild',
    description: 'Reach guild level 25',
    icon: '⭐',
    requirement: { type: 'level', value: 25 },
    rewards: { gold: 75000, xp: 20000 },
    rarity: 'rare',
  },
  guild_level_50: {
    id: 'guild_level_50',
    name: 'Legendary Guild',
    description: 'Reach maximum guild level 50',
    icon: '🌟',
    requirement: { type: 'level', value: 50 },
    rewards: { gold: 250000, xp: 75000 },
    rarity: 'legendary',
  },
  
  // Boss Achievements
  guild_first_boss: {
    id: 'guild_first_boss',
    name: 'First Blood',
    description: 'Defeat your first guild boss',
    icon: '🐉',
    requirement: { type: 'bossesDefeated', value: 1 },
    rewards: { gold: 15000, xp: 4000 },
    rarity: 'common',
  },
  guild_boss_badge_1: {
    id: 'guild_boss_badge_1',
    name: 'Boss Badge I',
    description: 'Defeat 1 guild boss',
    icon: '🎖️',
    requirement: { type: 'bossesDefeated', value: 1 },
    rewards: { gold: 5000, xp: 1500 },
    rarity: 'common',
  },
  guild_boss_badge_5: {
    id: 'guild_boss_badge_5',
    name: 'Boss Badge II',
    description: 'Defeat 5 guild bosses',
    icon: '🏅',
    requirement: { type: 'bossesDefeated', value: 5 },
    rewards: { gold: 15000, xp: 4500 },
    rarity: 'uncommon',
  },
  guild_boss_badge_10: {
    id: 'guild_boss_badge_10',
    name: 'Boss Badge III',
    description: 'Defeat 10 guild bosses',
    icon: '🥇',
    requirement: { type: 'bossesDefeated', value: 10 },
    rewards: { gold: 30000, xp: 10000 },
    rarity: 'rare',
  },
  guild_boss_hunter: {
    id: 'guild_boss_hunter',
    name: 'Boss Hunters',
    description: 'Defeat 25 guild bosses',
    icon: '🐉',
    requirement: { type: 'bossesDefeated', value: 25 },
    rewards: { gold: 50000, xp: 15000 },
    rarity: 'rare',
  },
  guild_boss_slayers: {
    id: 'guild_boss_slayers',
    name: 'Boss Slayers',
    description: 'Defeat 100 guild bosses',
    icon: '💀',
    requirement: { type: 'bossesDefeated', value: 100 },
    rewards: { gold: 150000, xp: 50000 },
    rarity: 'epic',
  },
  
  // Treasury Achievements
  guild_wealthy: {
    id: 'guild_wealthy',
    name: 'Wealthy Guild',
    description: 'Accumulate 100,000 gold in treasury',
    icon: '💰',
    requirement: { type: 'treasuryGold', value: 100000 },
    rewards: { gold: 25000, xp: 7500 },
    rarity: 'uncommon',
  },
  guild_rich: {
    id: 'guild_rich',
    name: 'Rich Guild',
    description: 'Accumulate 1,000,000 gold in treasury',
    icon: '💎',
    requirement: { type: 'treasuryGold', value: 1000000 },
    rewards: { gold: 100000, xp: 37500 },
    rarity: 'rare',
  },
  
  // Activity Achievements
  guild_quest_masters: {
    id: 'guild_quest_masters',
    name: 'Quest Masters',
    description: 'Complete 100 guild quests',
    icon: '📜',
    requirement: { type: 'questsCompleted', value: 100 },
    rewards: { gold: 50000, xp: 20000 },
    rarity: 'rare',
  },
  guild_dungeon_clearers: {
    id: 'guild_dungeon_clearers',
    name: 'Dungeon Masters',
    description: 'Clear 50 dungeons as a guild',
    icon: '🏰',
    requirement: { type: 'dungeonsCleared', value: 50 },
    rewards: { gold: 75000, xp: 25000 },
    rarity: 'epic',
  },
  
  // Special Achievements
  guild_first_week: {
    id: 'guild_first_week',
    name: 'First Week Anniversary',
    description: 'Survive one week as a guild',
    icon: '🎂',
    requirement: { type: 'age', value: 7 * 24 * 60 * 60 * 1000 }, // 7 days in ms
    rewards: { gold: 10000, xp: 2500 },
    rarity: 'common',
  },
  guild_one_month: {
    id: 'guild_one_month',
    name: 'One Month Strong',
    description: 'Celebrate one month as a guild',
    icon: '🎉',
    requirement: { type: 'age', value: 30 * 24 * 60 * 60 * 1000 }, // 30 days in ms
    rewards: { gold: 50000, xp: 15000 },
    rarity: 'uncommon',
  },
  guild_veteran: {
    id: 'guild_veteran',
    name: 'Veteran Guild',
    description: 'Reach 6 months as a guild',
    icon: '🏅',
    requirement: { type: 'age', value: 180 * 24 * 60 * 60 * 1000 }, // 180 days in ms
    rewards: { gold: 200000, xp: 75000 },
    rarity: 'legendary',
  },
};

/**
 * Check if guild meets achievement requirement
 */
export function checkGuildAchievement(achievement, guild) {
  const req = achievement.requirement;
  
  switch (req.type) {
    case 'memberCount':
      return Object.keys(guild.members || {}).length >= req.value;
      
    case 'level':
      const guildLevel = getGuildLevel(guild.xp || 0);
      return guildLevel.level >= req.value;
      
    case 'bossesDefeated':
      return (guild.bossHistory?.length || 0) >= req.value;
      
    case 'treasuryGold':
      return (guild.gold || 0) >= req.value;
      
    case 'questsCompleted':
      return (guild.stats?.questsCompleted || 0) >= req.value;
      
    case 'dungeonsCleared':
      return (guild.stats?.dungeonsCleared || 0) >= req.value;
      
    case 'age':
      const guildAge = Date.now() - (guild.createdAt || Date.now());
      // Handle negative ages (guild created in future due to timestamp issues)
      if (guildAge < 0) return false;
      return guildAge >= req.value;
      
    default:
      return false;
  }
}

/**
 * Get all earned guild achievements
 */
export function getEarnedGuildAchievements(guild) {
  const earned = [];
  const claimed = guild.claimedAchievements || [];
  
  for (const achievement of Object.values(GUILD_ACHIEVEMENTS)) {
    if (checkGuildAchievement(achievement, guild)) {
      earned.push({
        ...achievement,
        claimed: claimed.includes(achievement.id),
      });
    }
  }
  
  return earned;
}

/**
 * Get unclaimed guild achievements
 */
export function getUnclaimedGuildAchievements(guild) {
  return getEarnedGuildAchievements(guild).filter(a => !a.claimed);
}

/**
 * Get achievement by ID
 */
export function getGuildAchievement(id) {
  return GUILD_ACHIEVEMENTS[id] || null;
}
