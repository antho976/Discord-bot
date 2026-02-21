/**
 * Gathering Profession Rewards System
 * Provides detailed milestone rewards for gathering profession levels
 */

export const GATHERING_REWARDS = {
  unlocks: {
    1: {
      level: 1,
      isSmall: false,
      rewards: ['🔓 Begin your journey as a Gatherer', 'Access to basic gathering areas'],
      tools: ['Basic Pickaxe', 'Basic Axe', 'Basic Sickle'],
      passiveBonus: { agility: 1, intelligence: 1 },
    },
    2: {
      level: 2,
      isSmall: true,
      rewards: ['+5% gathering yield'],
      passiveBonus: { agility: 1 },
    },
    3: {
      level: 3,
      isSmall: true,
      rewards: ['+2% rare material find chance'],
      passiveBonus: { intelligence: 1 },
    },
    4: {
      level: 4,
      isSmall: true,
      rewards: ['+3% gathering speed (reduced cooldown)'],
      passiveBonus: { agility: 1 },
    },
    5: {
      level: 5,
      isSmall: false,
      rewards: ['🔓 Unlock Uncommon gathering areas', '+10% all gathering bonuses', 'Chance to find bonus materials'],
      items: ['gathering_potion_t2'],
      passiveBonus: { strength: 1, agility: 1, intelligence: 1, vitality: 1 },
    },
    6: {
      level: 6,
      isSmall: true,
      rewards: ['Unlock Uncommon Tools', '+2% material quality'],
      tools: ['Uncommon Pickaxe', 'Uncommon Axe', 'Uncommon Sickle'],
      passiveBonus: { agility: 1 },
    },
    7: {
      level: 7,
      isSmall: true,
      rewards: ['+5% double gather chance'],
      passiveBonus: { intelligence: 1 },
    },
    8: {
      level: 8,
      isSmall: true,
      rewards: ['+3% material yield bonus'],
      passiveBonus: { agility: 1 },
    },
    9: {
      level: 9,
      isSmall: true,
      rewards: ['+2% high-tier material discovery'],
      passiveBonus: { intelligence: 1 },
    },
    10: {
      level: 10,
      isSmall: false,
      rewards: ['🔓 Master Gatherer rank', '+15% all gathering stats', 'Unlock auto-gathering efficiency'],
      items: ['gathering_potion_t3', 'yield_blessing_t2'],
      passiveBonus: { strength: 2, agility: 2, intelligence: 2, vitality: 2 },
    },
    11: {
      level: 11,
      isSmall: true,
      rewards: ['Unlock Rare Tools', '+5% legendary material chance'],
      tools: ['Rare Pickaxe', 'Rare Axe', 'Rare Sickle'],
      passiveBonus: { agility: 1 },
    },
    12: {
      level: 12,
      isSmall: true,
      rewards: ['+3% gathering critical success (2x yield)'],
      passiveBonus: { intelligence: 1 },
    },
    13: {
      level: 13,
      isSmall: true,
      rewards: ['+5% stamina efficiency'],
      passiveBonus: { vitality: 1 },
    },
    14: {
      level: 14,
      isSmall: true,
      rewards: ['+2% material purity bonus'],
      passiveBonus: { intelligence: 1 },
    },
    15: {
      level: 15,
      isSmall: false,
      rewards: ['🔓 Expert Gatherer rank', '+20% gathering speed', '+10% rare finds', 'Unlock legendary areas'],
      items: ['gathering_potion_t4', 'rarity_finder_t2'],
      passiveBonus: { strength: 3, agility: 3, intelligence: 3, vitality: 3 },
    },
    16: {
      level: 16,
      isSmall: true,
      rewards: ['Unlock Epic Tools', '+3% epic material discovery'],
      tools: ['Epic Pickaxe', 'Epic Axe', 'Epic Sickle'],
      passiveBonus: { agility: 1 },
    },
    17: {
      level: 17,
      isSmall: true,
      rewards: ['+5% material refinement quality'],
      passiveBonus: { intelligence: 1 },
    },
    18: {
      level: 18,
      isSmall: true,
      rewards: ['+3% triple gather chance'],
      passiveBonus: { agility: 1 },
    },
    19: {
      level: 19,
      isSmall: true,
      rewards: ['+2% legendary affinity'],
      passiveBonus: { intelligence: 1 },
    },
    20: {
      level: 20,
      isSmall: false,
      rewards: ['🔓 Grand Master Gatherer', '+25% all gathering bonuses', '+15% XP gain while gathering'],
      items: ['gathering_potion_t5', 'rarity_finder_t3', 'speed_gloves_t3'],
      passiveBonus: { strength: 4, agility: 4, intelligence: 4, vitality: 4 },
    },
    21: {
      level: 21,
      isSmall: true,
      rewards: ['Unlock Legendary Tools', '+5% mythic material detection'],
      tools: ['Legendary Pickaxe', 'Legendary Axe', 'Legendary Sickle'],
      passiveBonus: { agility: 1 },
    },
    22: {
      level: 22,
      isSmall: true,
      rewards: ['+3% gathering skill mastery'],
      passiveBonus: { intelligence: 1 },
    },
    23: {
      level: 23,
      isSmall: true,
      rewards: ['+5% resource node richness'],
      passiveBonus: { agility: 1 },
    },
    24: {
      level: 24,
      isSmall: true,
      rewards: ['+2% divine material chance'],
      passiveBonus: { intelligence: 1 },
    },
    25: {
      level: 25,
      isSmall: false,
      rewards: ['🏆 Legendary Gatherer', '+30% all gathering bonuses', 'Unlock ultimate gathering areas', 'Passive gold generation while gathering'],
      items: ['legendary_yield_blessing', 'legendary_rarity_finder'],
      passiveBonus: { strength: 5, agility: 5, intelligence: 5, vitality: 5 },
    },
    30: {
      level: 30,
      isSmall: false,
      rewards: ['🏆 Titan of Resources', '+50% all stats', 'Gathering never fails', '+50% material yields', 'Unlock hidden legendary areas'],
      items: ['titan_gathering_set'],
      passiveBonus: { strength: 6, agility: 6, intelligence: 6, vitality: 6 },
    },
  },
  passive: '🌲 Gathering profession unlocks specialized tools and provides major stat bonuses. Each level increases material yield, rare find chance, and gathering efficiency.',
};

export function getGatheringReward(level) {
  return GATHERING_REWARDS.unlocks[level] || null;
}

export function getGatheringRewardsUpTo(level) {
  const rewards = [];
  for (let i = 1; i <= level; i++) {
    const reward = GATHERING_REWARDS.unlocks[i];
    if (reward) rewards.push({ ...reward, level: i });
  }
  return rewards;
}

export function getNextGatheringMilestone(currentLevel) {
  const nextMilestones = Object.keys(GATHERING_REWARDS.unlocks)
    .map(Number)
    .filter(lvl => lvl > currentLevel && !GATHERING_REWARDS.unlocks[lvl].isSmall)
    .sort((a, b) => a - b);
  
  if (nextMilestones.length > 0) {
    return {
      level: nextMilestones[0],
      reward: GATHERING_REWARDS.unlocks[nextMilestones[0]]
    };
  }
  return null;
}

export default {
  GATHERING_REWARDS,
  getGatheringReward,
  getGatheringRewardsUpTo,
  getNextGatheringMilestone,
};
