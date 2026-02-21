/**
 * Adventurers Guild Rank System
 */

export const GUILD_RANKS = {
  F: {
    name: 'F Rank',
    minXP: 0,
    color: 0x808080,
    icon: '📝',
    weeklyRewards: {
      gold: 100,
      items: [],
    },
    buffs: {
      marketTaxReduction: 0, // 0%
      shopDiscount: 0, // 0%
      questXPBonus: 0, // 0%
    }
  },
  E: {
    name: 'E Rank',
    minXP: 100,
    color: 0x8B4513,
    icon: '🥉',
    weeklyRewards: {
      gold: 250,
      items: ['item_1770440470158'], // Bronze sword
    },
    buffs: {
      marketTaxReduction: 5, // 5%
      shopDiscount: 5, // 5%
      questXPBonus: 10, // 10%
    }
  },
  D: {
    name: 'D Rank',
    minXP: 300,
    color: 0xCD7F32,
    icon: '🥉',
    weeklyRewards: {
      gold: 500,
      items: [],
    },
    buffs: {
      marketTaxReduction: 10,
      shopDiscount: 10,
      questXPBonus: 15,
    }
  },
  C: {
    name: 'C Rank',
    minXP: 750,
    color: 0xC0C0C0,
    icon: '🥈',
    weeklyRewards: {
      gold: 1000,
      items: [],
    },
    buffs: {
      marketTaxReduction: 15,
      shopDiscount: 15,
      questXPBonus: 20,
    }
  },
  B: {
    name: 'B Rank',
    minXP: 1500,
    color: 0x4169E1,
    icon: '💎',
    weeklyRewards: {
      gold: 2000,
      items: [],
    },
    buffs: {
      marketTaxReduction: 20,
      shopDiscount: 20,
      questXPBonus: 25,
    }
  },
  A: {
    name: 'A Rank',
    minXP: 3000,
    color: 0xFFD700,
    icon: '🥇',
    weeklyRewards: {
      gold: 4000,
      items: [],
    },
    buffs: {
      marketTaxReduction: 25,
      shopDiscount: 25,
      questXPBonus: 35,
    }
  },
  S: {
    name: 'S Rank',
    minXP: 6000,
    color: 0xFF00FF,
    icon: '👑',
    weeklyRewards: {
      gold: 10000,
      items: [],
    },
    buffs: {
      marketTaxReduction: 30,
      shopDiscount: 30,
      questXPBonus: 50,
    }
  }
};

export const RANK_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

/**
 * Get rank info by guild XP
 */
export function getRankByXP(guildXP) {
  let currentRank = 'F';
  
  for (const rank of RANK_ORDER) {
    if (guildXP >= GUILD_RANKS[rank].minXP) {
      currentRank = rank;
    } else {
      break;
    }
  }
  
  return GUILD_RANKS[currentRank];
}

/**
 * Get next rank info
 */
export function getNextRank(currentRankKey) {
  const currentIndex = RANK_ORDER.indexOf(currentRankKey);
  if (currentIndex === -1 || currentIndex === RANK_ORDER.length - 1) {
    return null;
  }
  return GUILD_RANKS[RANK_ORDER[currentIndex + 1]];
}

/**
 * Calculate XP needed for next rank
 */
export function getXPToNextRank(guildXP) {
  const currentRank = getRankByXP(guildXP);
  const currentRankKey = RANK_ORDER.find(key => GUILD_RANKS[key].name === currentRank.name);
  const nextRank = getNextRank(currentRankKey);
  
  if (!nextRank) return 0; // Max rank
  
  return nextRank.minXP - guildXP;
}

/**
 * Get current rank key by XP
 */
export function getRankKey(guildXP) {
  let currentRank = 'F';
  
  for (const rank of RANK_ORDER) {
    if (guildXP >= GUILD_RANKS[rank].minXP) {
      currentRank = rank;
    } else {
      break;
    }
  }
  
  return currentRank;
}
