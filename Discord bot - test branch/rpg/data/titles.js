/**
 * Titles and Badges System
 * Earnable titles and badges that players can display
 */

export const TITLES = {
  // Combat Titles
  warrior_novice: {
    id: 'warrior_novice',
    name: 'Novice Warrior',
    displayName: '⚔️ Novice Warrior',
    description: 'Defeat 50 enemies',
    requirement: { type: 'monstersDefeated', value: 50 },
    rarity: 'common',
    activeBonus: { type: 'damage', value: 2, description: '+2% damage in combat' },
    passiveBonus: { type: 'xp', value: 1, description: '+1% XP gain' },
  },
  warrior_adept: {
    id: 'warrior_adept',
    name: 'Adept Warrior',
    displayName: '⚔️ Adept Warrior',
    description: 'Defeat 250 enemies',
    requirement: { type: 'monstersDefeated', value: 250 },
    rarity: 'uncommon',
    activeBonus: { type: 'damage', value: 5, description: '+5% damage in combat' },
    passiveBonus: { type: 'xp', value: 2, description: '+2% XP gain' },
  },
  battle_master: {
    id: 'battle_master',
    name: 'Battle Master',
    displayName: '🗡️ Battle Master',
    description: 'Defeat 1000 enemies',
    requirement: { type: 'monstersDefeated', value: 1000 },
    rarity: 'rare',
    activeBonus: { type: 'damage', value: 8, description: '+8% damage in combat' },
    passiveBonus: { type: 'xp', value: 3, description: '+3% XP gain' },
  },
  slayer: {
    id: 'slayer',
    name: 'Slayer',
    displayName: '💀 Slayer',
    description: 'Defeat 5000 enemies',
    requirement: { type: 'monstersDefeated', value: 5000 },
    rarity: 'epic',
    activeBonus: { type: 'damage', value: 12, description: '+12% damage in combat' },
    passiveBonus: { type: 'xp', value: 5, description: '+5% XP gain' },
  },
  
  // Crafting Titles
  apprentice_crafter: {
    id: 'apprentice_crafter',
    name: 'Apprentice Crafter',
    displayName: '🔨 Apprentice Crafter',
    description: 'Craft 100 items',
    requirement: { type: 'craftsCompleted', value: 100 },
    rarity: 'common',
    activeBonus: { type: 'craftingSpeed', value: 5, description: '+5% faster crafting' },
    passiveBonus: { type: 'professionXp', value: 2, description: '+2% profession XP' },
  },
  master_craftsman: {
    id: 'master_craftsman',
    name: 'Master Craftsman',
    displayName: '⚒️ Master Craftsman',
    description: 'Craft 1000 items',
    requirement: { type: 'craftsCompleted', value: 1000 },
    rarity: 'rare',
    activeBonus: { type: 'craftingSpeed', value: 10, description: '+10% faster crafting' },
    passiveBonus: { type: 'professionXp', value: 5, description: '+5% profession XP' },
  },
  legendary_smith: {
    id: 'legendary_smith',
    name: 'Legendary Smith',
    displayName: '🏆 Legendary Smith',
    description: 'Craft 5000 items',
    requirement: { type: 'craftsCompleted', value: 5000 },
    rarity: 'legendary',
    activeBonus: { type: 'craftingSpeed', value: 15, description: '+15% faster crafting' },
    passiveBonus: { type: 'professionXp', value: 10, description: '+10% profession XP' },
  },
  
  // Gathering Titles
  naturalist: {
    id: 'naturalist',
    name: 'Naturalist',
    displayName: '🌿 Naturalist',
    description: 'Perform 500 gathering actions',
    requirement: { type: 'gatheringActions', value: 500 },
    rarity: 'uncommon',
    activeBonus: { type: 'gatheringSpeed', value: 8, description: '+8% faster gathering' },
    passiveBonus: { type: 'gatheringYield', value: 3, description: '+3% gathering yield' },
  },
  resource_hoarder: {
    id: 'resource_hoarder',
    name: 'Resource Hoarder',
    displayName: '📦 Resource Hoarder',
    description: 'Collect 5000 materials',
    requirement: { type: 'materialsCollected', value: 5000 },
    rarity: 'rare',
    activeBonus: { type: 'gatheringSpeed', value: 12, description: '+12% faster gathering' },
    passiveBonus: { type: 'gatheringYield', value: 5, description: '+5% gathering yield' },
  },
  
  // Wealth Titles
  merchant: {
    id: 'merchant',
    name: 'Merchant',
    displayName: '💰 Merchant',
    description: 'Earn 100,000 gold',
    requirement: { type: 'goldEarned', value: 100000 },
    rarity: 'uncommon',
    activeBonus: { type: 'goldGain', value: 5, description: '+5% gold from all sources' },
    passiveBonus: { type: 'shopDiscount', value: 2, description: '2% discount in shops' },
  },
  tycoon: {
    id: 'tycoon',
    name: 'Tycoon',
    displayName: '💎 Tycoon',
    description: 'Earn 1,000,000 gold',
    requirement: { type: 'goldEarned', value: 1000000 },
    rarity: 'epic',
    activeBonus: { type: 'goldGain', value: 10, description: '+10% gold from all sources' },
    passiveBonus: { type: 'shopDiscount', value: 5, description: '5% discount in shops' },
  },
  
  // Dungeon & Raid Titles
  dungeon_delver: {
    id: 'dungeon_delver',
    name: 'Dungeon Delver',
    displayName: '🏰 Dungeon Delver',
    description: 'Clear 25 dungeons',
    requirement: { type: 'dungeonsCleared', value: 25 },
    rarity: 'rare',
    activeBonus: { type: 'dungeonLoot', value: 8, description: '+8% dungeon loot quality' },
    passiveBonus: { type: 'dungeonXp', value: 5, description: '+5% XP from dungeons' },
  },
  raid_commander: {
    id: 'raid_commander',
    name: 'Raid Commander',
    displayName: '🐉 Raid Commander',
    description: 'Clear 10 raids',
    requirement: { type: 'raidsCleared', value: 10 },
    rarity: 'epic',
    activeBonus: { type: 'raidLoot', value: 12, description: '+12% raid loot quality' },
    passiveBonus: { type: 'raidXp', value: 8, description: '+8% XP from raids' },
  },
  
  // Special Titles
  first_blood: {
    id: 'first_blood',
    name: 'First Blood',
    displayName: '🩸 First Blood',
    description: 'Land 100 critical hits',
    requirement: { type: 'criticalHits', value: 100 },
    rarity: 'uncommon',
    activeBonus: { type: 'critChance', value: 3, description: '+3% critical hit chance' },
    passiveBonus: { type: 'critDamage', value: 5, description: '+5% critical damage' },
  },
  critical_specialist: {
    id: 'critical_specialist',
    name: 'Critical Specialist',
    displayName: '💥 Critical Specialist',
    description: 'Land 1000 critical hits',
    requirement: { type: 'criticalHits', value: 1000 },
    rarity: 'rare',
    activeBonus: { type: 'critChance', value: 5, description: '+5% critical hit chance' },
    passiveBonus: { type: 'critDamage', value: 10, description: '+10% critical damage' },
  },
  
  // Collector Titles (from collectibles milestones)
  novice_collector: {
    id: 'novice_collector',
    name: 'Novice Collector',
    displayName: '📚 Novice Collector',
    description: 'Collect 10 unique collectibles',
    requirement: { type: 'collectibles', value: 10 },
    rarity: 'uncommon',
    activeBonus: { type: 'dropRate', value: 3, description: '+3% rare item drop rate' },
    passiveBonus: { type: 'luckBonus', value: 2, description: '+2% luck bonus' },
  },
  master_collector: {
    id: 'master_collector',
    name: 'Master Collector',
    displayName: '🏅 Master Collector',
    description: 'Collect 50 unique collectibles',
    requirement: { type: 'collectibles', value: 50 },
    rarity: 'legendary',
    activeBonus: { type: 'dropRate', value: 10, description: '+10% rare item drop rate' },
    passiveBonus: { type: 'luckBonus', value: 5, description: '+5% luck bonus' },
  },
};

export const BADGES = {
  // Achievement Badges
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    icon: '🐦',
    description: 'One of the first 100 players',
    requirement: { type: 'special', value: 'early_player' },
    rarity: 'rare',
  },
  guild_founder: {
    id: 'guild_founder',
    name: 'Guild Founder',
    icon: '🏰',
    description: 'Created a guild',
    requirement: { type: 'special', value: 'created_guild' },
    rarity: 'uncommon',
  },
  guild_leader: {
    id: 'guild_leader',
    name: 'Guild Leader',
    icon: '👑',
    description: 'Current leader of a guild',
    requirement: { type: 'special', value: 'is_guild_leader' },
    rarity: 'uncommon',
  },
  world_first: {
    id: 'world_first',
    name: 'World First',
    icon: '🌍',
    description: 'First to complete a major milestone',
    requirement: { type: 'special', value: 'world_first' },
    rarity: 'legendary',
  },
  
  // Combat Badges
  boss_slayer: {
    id: 'boss_slayer',
    name: 'Boss Slayer',
    icon: '💀',
    description: 'Defeat 10 world bosses',
    requirement: { type: 'worldBossesDefeated', value: 10 },
    rarity: 'rare',
  },
  solo_artist: {
    id: 'solo_artist',
    name: 'Solo Artist',
    icon: '⭐',
    description: 'Complete a dungeon solo',
    requirement: { type: 'special', value: 'solo_dungeon' },
    rarity: 'epic',
  },
  
  // Profession Badges
  master_blacksmith: {
    id: 'master_blacksmith',
    name: 'Master Blacksmith',
    icon: '🔨',
    description: 'Reach Blacksmith level 50',
    requirement: { type: 'professionLevel', profession: 'blacksmith', value: 50 },
    rarity: 'epic',
  },
  master_gatherer: {
    id: 'master_gatherer',
    name: 'Master Gatherer',
    icon: '⛏️',
    description: 'Reach Gathering level 50',
    requirement: { type: 'professionLevel', profession: 'gathering', value: 50 },
    rarity: 'epic',
  },
  
  // Social Badges
  helpful_hero: {
    id: 'helpful_hero',
    name: 'Helpful Hero',
    icon: '🤝',
    description: 'Help 50 other players',
    requirement: { type: 'playersHelped', value: 50 },
    rarity: 'rare',
  },
  party_master: {
    id: 'party_master',
    name: 'Party Master',
    icon: '👥',
    description: 'Complete 100 group activities',
    requirement: { type: 'groupActivities', value: 100 },
    rarity: 'rare',
  },
  
  // Event Badges
  seasonal_champion: {
    id: 'seasonal_champion',
    name: 'Seasonal Champion',
    icon: '🎁',
    description: 'Win a seasonal event',
    requirement: { type: 'special', value: 'seasonal_winner' },
    rarity: 'legendary',
  },
  event_collector: {
    id: 'event_collector',
    name: 'Event Collector',
    icon: '🎪',
    description: 'Participate in 10 events',
    requirement: { type: 'eventsParticipated', value: 10 },
    rarity: 'uncommon',
  },
};

/**
 * Check if player meets title requirements
 */
export function checkTitleRequirement(title, player) {
  const req = title.requirement;
  
  if (req.type === 'special') {
    // Special requirements handled separately
    return false;
  }
  
  const stats = player.progressStats || {};
  const value = stats[req.type] || 0;
  
  if (req.type === 'professionLevel') {
    const profLevel = player.professionLevels?.[req.profession] || 0;
    return profLevel >= req.value;
  }
  
  if (req.type === 'worldBossesDefeated') {
    return (player.worldBossesDefeated?.length || 0) >= req.value;
  }
  
  if (req.type === 'collectibles') {
    return (player.collectibles?.length || 0) >= req.value;
  }
  
  return value >= req.value;
}

/**
 * Get all earned titles for a player
 */
export function getEarnedTitles(player) {
  return Object.values(TITLES).filter(title => checkTitleRequirement(title, player));
}

/**
 * Get all earned badges for a player
 */
export function getEarnedBadges(player) {
  return Object.values(BADGES).filter(badge => {
    const req = badge.requirement;
    
    if (req.type === 'special') {
      // Check special badge conditions
      if (req.value === 'is_guild_leader') {
        // Check if player is guild leader (would need guild manager check)
        return player.isGuildLeader || false;
      }
      if (req.value === 'created_guild') {
        return player.hasCreatedGuild || false;
      }
      return false;
    }
    
    const stats = player.progressStats || {};
    const value = stats[req.type] || 0;
    
    if (req.type === 'professionLevel') {
      const profLevel = player.professionLevels?.[req.profession] || 0;
      return profLevel >= req.value;
    }
    
    if (req.type === 'worldBossesDefeated') {
      return (player.worldBossesDefeated?.length || 0) >= req.value;
    }
    
    return value >= req.value;
  });
}

/**
 * Get title by ID
 */
export function getTitle(id) {
  return TITLES[id] || null;
}

/**
 * Get badge by ID
 */
export function getBadge(id) {
  return BADGES[id] || null;
}
