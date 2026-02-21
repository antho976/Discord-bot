/**
 * Guild Level System
 * Defines guild progression, member limits, and unlocks
 */

export const GUILD_LEVELS = [];

// Generate 50 levels with increasing XP requirements
for (let i = 1; i <= 50; i++) {
  const baseXP = 1000;
  const xpRequired = Math.floor(baseXP * Math.pow(1.15, i - 1));
  const memberLimit = Math.min(10 + (i * 2), 100); // 12 at level 1, max 100 at level 45+
  
  GUILD_LEVELS.push({
    level: i,
    xpRequired,
    memberLimit,
    unlocks: getUnlocksForLevel(i),
    buffs: getBuffsForLevel(i),
  });
}

function getUnlocksForLevel(level) {
  const unlocks = [];
  
  if (level === 1) unlocks.push('Guild Creation', 'Basic Treasury');
  if (level === 2) unlocks.push('Guild Tag');
  if (level === 3) unlocks.push('Guild Invites');
  if (level === 5) unlocks.push('Guild Buffs Tier 1', 'Guild Boss Access');
  if (level === 10) unlocks.push('Guild Vault (50 slots)', 'Officer Roles');
  if (level === 15) unlocks.push('Guild Buffs Tier 2', 'Guild Shop');
  if (level === 20) unlocks.push('Guild World Boss Access');
  if (level === 25) unlocks.push('Guild Buffs Tier 3', 'Guild Vault (100 slots)');
  if (level === 30) unlocks.push('Guild Dungeons');
  if (level === 35) unlocks.push('Guild Buffs Tier 4', 'Guild Wars');
  if (level === 40) unlocks.push('Guild Vault (200 slots)', 'Territory Control');
  if (level === 45) unlocks.push('Guild Buffs Tier 5');
  if (level === 50) unlocks.push('Max Level Guild - Ultimate Buffs');
  
  return unlocks;
}

function getBuffsForLevel(level) {
  const tier = Math.floor(level / 5);
  return {
    xpBonus: tier * 2, // 2% per tier (max 20%)
    goldBonus: tier * 2, // 2% per tier (max 20%)
    shopDiscount: tier * 1, // 1% per tier (max 10%)
    gatheringSpeed: tier * 3, // 3% per tier (max 30%)
    craftingSpeed: tier * 2, // 2% per tier (max 20%)
    bossRewardBoost: tier * 1.5, // 1.5% per tier (max 15%)
    rareDropRate: tier * 0.5, // 0.5% per tier (max 5%)
    damageBonus: tier * 1, // 1% per tier (max 10%)
    defenseBonus: tier * 1, // 1% per tier (max 10%)
  };
}

/**
 * Get guild level info by current XP
 */
export function getGuildLevel(currentXP) {
  let level = 1;
  let totalXP = 0;
  
  for (const lvl of GUILD_LEVELS) {
    if (currentXP >= totalXP + lvl.xpRequired) {
      totalXP += lvl.xpRequired;
      level = lvl.level;
    } else {
      break;
    }
  }
  
  return {
    level,
    currentXP,
    xpIntoLevel: currentXP - totalXP,
    xpNeededForNext: GUILD_LEVELS[level]?.xpRequired || 0,
    info: GUILD_LEVELS[level - 1],
  };
}

/**
 * Get XP needed for next level
 */
export function getXPToNextLevel(currentXP) {
  const levelInfo = getGuildLevel(currentXP);
  if (levelInfo.level >= 50) return 0;
  return levelInfo.xpNeededForNext - levelInfo.xpIntoLevel;
}

/**
 * Calculate guild buff values with caps
 */
export function getGuildBuffs(guildLevel, purchasedBuffs = {}) {
  const levelInfo = GUILD_LEVELS[guildLevel - 1];
  if (!levelInfo) return { 
    xpBonus: 0, 
    goldBonus: 0, 
    shopDiscount: 0, 
    gatheringSpeed: 0,
    craftingSpeed: 0,
    bossRewardBoost: 0,
    rareDropRate: 0,
    damageBonus: 0,
    defenseBonus: 0,
  };
  
  const baseBuffs = levelInfo.buffs;
  const purchased = {
    xpBonus: Math.min(purchasedBuffs.xpBonus || 0, 30), // Cap at 30%
    goldBonus: Math.min(purchasedBuffs.goldBonus || 0, 30), // Cap at 30%
    shopDiscount: Math.min(purchasedBuffs.shopDiscount || 0, 20), // Cap at 20%
    gatheringSpeed: Math.min(purchasedBuffs.gatheringSpeed || 0, 40), // Cap at 40%
    craftingSpeed: Math.min(purchasedBuffs.craftingSpeed || 0, 25), // Cap at 25%
    bossRewardBoost: Math.min(purchasedBuffs.bossRewardBoost || 0, 25), // Cap at 25%
    rareDropRate: Math.min(purchasedBuffs.rareDropRate || 0, 10), // Cap at 10%
    damageBonus: Math.min(purchasedBuffs.damageBonus || 0, 20), // Cap at 20%
    defenseBonus: Math.min(purchasedBuffs.defenseBonus || 0, 20), // Cap at 20%
  };
  
  return {
    xpBonus: Math.min(baseBuffs.xpBonus + purchased.xpBonus, 50),
    goldBonus: Math.min(baseBuffs.goldBonus + purchased.goldBonus, 50),
    shopDiscount: Math.min(baseBuffs.shopDiscount + purchased.shopDiscount, 30),
    gatheringSpeed: Math.min(baseBuffs.gatheringSpeed + purchased.gatheringSpeed, 70),
    craftingSpeed: Math.min(baseBuffs.craftingSpeed + purchased.craftingSpeed, 45),
    bossRewardBoost: Math.min(baseBuffs.bossRewardBoost + purchased.bossRewardBoost, 40),
    rareDropRate: Math.min(baseBuffs.rareDropRate + purchased.rareDropRate, 15),
    damageBonus: Math.min(baseBuffs.damageBonus + purchased.damageBonus, 30),
    defenseBonus: Math.min(baseBuffs.defenseBonus + purchased.defenseBonus, 30),
  };
}

/**
 * Guild buff costs (for purchasing additional buffs with guild gold)
 */
export const GUILD_BUFF_COSTS = {
  xpBonus: 50000,         // 50k per +1%
  goldBonus: 50000,       // 50k per +1%
  shopDiscount: 75000,    // 75k per +1%
  gatheringSpeed: 60000,  // 60k per +1%
  craftingSpeed: 55000,   // 55k per +1%
  bossRewardBoost: 80000, // 80k per +1%
  rareDropRate: 100000,   // 100k per +1%
  damageBonus: 70000,     // 70k per +1%
  defenseBonus: 70000,    // 70k per +1%
};
