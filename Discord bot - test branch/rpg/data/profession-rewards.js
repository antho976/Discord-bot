/**
 * Profession Rewards System
 * Tracks profession-specific rewards and unlocks
 * Rewards every level with small bonuses, big milestones every 5 levels
 */

export const PROFESSION_REWARDS = {
  blacksmith: {
    id: 'blacksmith',
    name: 'Blacksmith',
    description: 'Master of metalworking and weaponry',
    icon: '🔨',
    unlocks: {
      1: {
        level: 1,
        isSmall: false,
        rewards: ['Ability to craft basic equipment'],
        passiveBonus: { strength: 1 },
      },
      2: {
        level: 2,
        isSmall: true,
        rewards: ['+2% weapon damage'],
        passiveBonus: { strength: 1 },
      },
      3: {
        level: 3,
        isSmall: true,
        rewards: ['+1% crafting speed'],
        passiveBonus: { strength: 1 },
      },
      4: {
        level: 4,
        isSmall: true,
        rewards: ['+2% upgrade success chance'],
        passiveBonus: { strength: 1 },
      },
      5: {
        level: 5,
        isSmall: false,
        rewards: ['🔓 Unlock steel equipment recipes', '+5% weapon quality'],
        items: ['steel_sword', 'steel_armor'],
        passiveBonus: { strength: 2, defense: 1 },
      },
      6: {
        level: 6,
        isSmall: true,
        rewards: ['+1% durability'],
        passiveBonus: { strength: 1 },
      },
      7: {
        level: 7,
        isSmall: true,
        rewards: ['+2% critical damage'],
        passiveBonus: { strength: 1 },
      },
      8: {
        level: 8,
        isSmall: true,
        rewards: ['+1% armor effectiveness'],
        passiveBonus: { defense: 1 },
      },
      9: {
        level: 9,
        isSmall: true,
        rewards: ['+2% weapon weight reduction'],
        passiveBonus: { strength: 1 },
      },
      10: {
        level: 10,
        isSmall: false,
        rewards: ['🔓 Unlock mithril equipment recipes', '+10% weapon quality', '+3% all weapon stats'],
        items: ['mithril_sword', 'mithril_armor'],
        passiveBonus: { strength: 3, defense: 2 },
      },
      11: {
        level: 11,
        isSmall: true,
        rewards: ['+2% material efficiency'],
        passiveBonus: { strength: 1 },
      },
      12: {
        level: 12,
        isSmall: true,
        rewards: ['+1% upgrade bonus'],
        passiveBonus: { strength: 1 },
      },
      13: {
        level: 13,
        isSmall: true,
        rewards: ['+2% critical strike'],
        passiveBonus: { strength: 1 },
      },
      14: {
        level: 14,
        isSmall: true,
        rewards: ['+1% defense boost'],
        passiveBonus: { defense: 1 },
      },
      15: {
        level: 15,
        isSmall: false,
        rewards: ['🔓 Ability to craft legendary weapons', '+20% critical damage', '+5% all weapon stats'],
        items: ['tyrfing', 'legendary_armor'],
        passiveBonus: { strength: 4, defense: 3 },
      },
      16: {
        level: 16,
        isSmall: true,
        rewards: ['+2% forge efficiency'],
        passiveBonus: { strength: 1 },
      },
      17: {
        level: 17,
        isSmall: true,
        rewards: ['+1% weapon stability'],
        passiveBonus: { strength: 1 },
      },
      18: {
        level: 18,
        isSmall: true,
        rewards: ['+2% armor reinforcement'],
        passiveBonus: { defense: 1 },
      },
      19: {
        level: 19,
        isSmall: true,
        rewards: ['+1% quality improvement'],
        passiveBonus: { strength: 1 },
      },
      20: {
        level: 20,
        isSmall: false,
        rewards: ['🔓 Master blacksmith unlocked', '+30% all weapon stats', '+15% upgrade success'],
        items: ['ultimate_sword', 'ultimate_armor'],
        passiveBonus: { strength: 5, defense: 4 },
      },
      21: {
        level: 21,
        isSmall: true,
        rewards: ['+2% exotic material handling'],
        passiveBonus: { strength: 1 },
      },
      22: {
        level: 22,
        isSmall: true,
        rewards: ['+1% enchantment compatibility'],
        passiveBonus: { strength: 1 },
      },
      23: {
        level: 23,
        isSmall: true,
        rewards: ['+2% masterwork bonus'],
        passiveBonus: { strength: 1 },
      },
      24: {
        level: 24,
        isSmall: true,
        rewards: ['+1% legendary affinity'],
        passiveBonus: { defense: 1 },
      },
      25: {
        level: 25,
        isSmall: false,
        rewards: ['🔓 Godforged weapons available', '+40% all weapon stats', '+20% critical damage'],
        items: ['godforged_blade', 'divine_armor'],
        passiveBonus: { strength: 6, defense: 5 },
      },
      26: {
        level: 26,
        isSmall: true,
        rewards: ['+2% mythic resonance'],
        passiveBonus: { strength: 1 },
      },
      27: {
        level: 27,
        isSmall: true,
        rewards: ['+1% eternal durability'],
        passiveBonus: { strength: 1 },
      },
      28: {
        level: 28,
        isSmall: true,
        rewards: ['+2% transcendent crafting'],
        passiveBonus: { strength: 1 },
      },
      29: {
        level: 29,
        isSmall: true,
        rewards: ['+1% cosmic enhancement'],
        passiveBonus: { defense: 1 },
      },
      30: {
        level: 30,
        isSmall: false,
        rewards: ['🏆 Grand Master Blacksmith', '+50% all stats', 'Access to mythic recipes', '+25% upgrade success'],
        items: ['mythic_sword', 'mythic_armor'],
        passiveBonus: { strength: 8, defense: 6 },
      },
    },
    passive: '🔨 Weapon upgrades gain +3% success chance per Blacksmith level',
  },
  botanic: {
    id: 'botanic',
    name: 'Botanist',
    description: 'Master of herbs and plant alchemy',
    icon: '🌿',
    unlocks: {
      1: {
        level: 1,
        isSmall: false,
        rewards: ['Ability to brew basic potions'],
        passiveBonus: { wisdom: 1 },
      },
      2: {
        level: 2,
        isSmall: true,
        rewards: ['+2% potion effect'],
        passiveBonus: { wisdom: 1 },
      },
      3: {
        level: 3,
        isSmall: true,
        rewards: ['+1% brewing speed'],
        passiveBonus: { wisdom: 1 },
      },
      4: {
        level: 4,
        isSmall: true,
        rewards: ['+2% ingredient yield'],
        passiveBonus: { wisdom: 1 },
      },
      5: {
        level: 5,
        isSmall: false,
        rewards: ['🔓 Unlock advanced potion recipes', '+5% potion potency'],
        items: ['greater_health_potion', 'greater_mana_potion'],
        passiveBonus: { wisdom: 2, intelligence: 1 },
      },
      6: {
        level: 6,
        isSmall: true,
        rewards: ['+1% herb preservation'],
        passiveBonus: { wisdom: 1 },
      },
      7: {
        level: 7,
        isSmall: true,
        rewards: ['+2% essence extraction'],
        passiveBonus: { wisdom: 1 },
      },
      8: {
        level: 8,
        isSmall: true,
        rewards: ['+1% potion duration'],
        passiveBonus: { wisdom: 1 },
      },
      9: {
        level: 9,
        isSmall: true,
        rewards: ['+2% rare ingredient chance'],
        passiveBonus: { wisdom: 1 },
      },
      10: {
        level: 10,
        isSmall: false,
        rewards: ['🔓 Unlock magical tonics', '+10% healing effectiveness', '+3% all potion effects'],
        items: ['elixir_of_strength', 'elixir_of_wisdom'],
        passiveBonus: { wisdom: 3, intelligence: 2 },
      },
      11: {
        level: 11,
        isSmall: true,
        rewards: ['+2% catalyst efficiency'],
        passiveBonus: { wisdom: 1 },
      },
      12: {
        level: 12,
        isSmall: true,
        rewards: ['+1% flavor perfection'],
        passiveBonus: { wisdom: 1 },
      },
      13: {
        level: 13,
        isSmall: true,
        rewards: ['+2% arcane binding'],
        passiveBonus: { wisdom: 1 },
      },
      14: {
        level: 14,
        isSmall: true,
        rewards: ['+1% purity increase'],
        passiveBonus: { intelligence: 1 },
      },
      15: {
        level: 15,
        isSmall: false,
        rewards: ['🔓 Master alchemy unlocked', '+20% potion creation speed', '+5% all potion effects'],
        items: ['philosopher_stone_brew', 'essence_of_vitality'],
        passiveBonus: { wisdom: 4, intelligence: 3 },
      },
      16: {
        level: 16,
        isSmall: true,
        rewards: ['+2% transmutation power'],
        passiveBonus: { wisdom: 1 },
      },
      17: {
        level: 17,
        isSmall: true,
        rewards: ['+1% alchemical reaction time'],
        passiveBonus: { wisdom: 1 },
      },
      18: {
        level: 18,
        isSmall: true,
        rewards: ['+2% essence saturation'],
        passiveBonus: { wisdom: 1 },
      },
      19: {
        level: 19,
        isSmall: true,
        rewards: ['+1% elemental synergy'],
        passiveBonus: { intelligence: 1 },
      },
      20: {
        level: 20,
        isSmall: false,
        rewards: ['🔓 Grand Master of herbalism', '+30% all potion effects', '+15% brewing success'],
        items: ['essence_of_life', 'elixir_of_immortality'],
        passiveBonus: { wisdom: 5, intelligence: 4 },
      },
      21: {
        level: 21,
        isSmall: true,
        rewards: ['+2% legendary herb affinity'],
        passiveBonus: { wisdom: 1 },
      },
      22: {
        level: 22,
        isSmall: true,
        rewards: ['+1% botanical resonance'],
        passiveBonus: { wisdom: 1 },
      },
      23: {
        level: 23,
        isSmall: true,
        rewards: ['+2% primal extraction'],
        passiveBonus: { wisdom: 1 },
      },
      24: {
        level: 24,
        isSmall: true,
        rewards: ['+1% cosmic herb mastery'],
        passiveBonus: { intelligence: 1 },
      },
      25: {
        level: 25,
        isSmall: false,
        rewards: ['🔓 Nature\'s ancient secrets unlocked', '+40% all potion effects', '+20% rare item yield'],
        items: ['nectar_of_gods', 'ambrosia_supreme'],
        passiveBonus: { wisdom: 6, intelligence: 5 },
      },
      26: {
        level: 26,
        isSmall: true,
        rewards: ['+2% celestial herb synthesis'],
        passiveBonus: { wisdom: 1 },
      },
      27: {
        level: 27,
        isSmall: true,
        rewards: ['+1% infinity plant cultivation'],
        passiveBonus: { wisdom: 1 },
      },
      28: {
        level: 28,
        isSmall: true,
        rewards: ['+2% transcendent botanical science'],
        passiveBonus: { wisdom: 1 },
      },
      29: {
        level: 29,
        isSmall: true,
        rewards: ['+1% eternal garden connection'],
        passiveBonus: { intelligence: 1 },
      },
      30: {
        level: 30,
        isSmall: false,
        rewards: ['🏆 Arch-Alchemist of all Realms', '+50% all stats', 'Recipe book expands infinitely', '+25% brewing success & effects'],
        items: ['infinite_potion', 'universal_remedy'],
        passiveBonus: { wisdom: 8, intelligence: 6 },
      },
    },
    passive: '🌿 Potions restore +20% more health/mana. Failure rate reduced by 2% per level.',
  },
  enchanter: {
    id: 'enchanter',
    name: 'Enchanter',
    description: 'Master of magical enchantments',
    icon: '✨',
    unlocks: {
      1: {
        level: 1,
        isSmall: false,
        rewards: ['Ability to enchant gear'],
        passiveBonus: { intelligence: 1 },
      },
      2: {
        level: 2,
        isSmall: true,
        rewards: ['+2% spell power'],
        passiveBonus: { intelligence: 1 },
      },
      3: {
        level: 3,
        isSmall: true,
        rewards: ['+1% mana efficiency'],
        passiveBonus: { intelligence: 1 },
      },
      4: {
        level: 4,
        isSmall: true,
        rewards: ['+2% enchantment clarity'],
        passiveBonus: { intelligence: 1 },
      },
      5: {
        level: 5,
        isSmall: false,
        rewards: ['🔓 Unlock advanced enchantments', '+5% spell effectiveness'],
        items: ['enchanted_ring', 'enchanted_amulet'],
        passiveBonus: { intelligence: 2, wisdom: 1 },
      },
      6: {
        level: 6,
        isSmall: true,
        rewards: ['+1% arcane resonance'],
        passiveBonus: { intelligence: 1 },
      },
      7: {
        level: 7,
        isSmall: true,
        rewards: ['+2% magical affinity'],
        passiveBonus: { intelligence: 1 },
      },
      8: {
        level: 8,
        isSmall: true,
        rewards: ['+1% aura intensity'],
        passiveBonus: { intelligence: 1 },
      },
      9: {
        level: 9,
        isSmall: true,
        rewards: ['+2% runic potency'],
        passiveBonus: { intelligence: 1 },
      },
      10: {
        level: 10,
        isSmall: false,
        rewards: ['🔓 Unlock ultimate enchantments', '+10% spell damage', '+3% all magical stats'],
        items: ['ring_of_arcane_power', 'amulet_of_wisdom'],
        passiveBonus: { intelligence: 3, wisdom: 2, mana: 20 },
      },
      11: {
        level: 11,
        isSmall: true,
        rewards: ['+2% essence channeling'],
        passiveBonus: { intelligence: 1 },
      },
      12: {
        level: 12,
        isSmall: true,
        rewards: ['+1% mana pool expansion'],
        passiveBonus: { intelligence: 1, mana: 5 },
      },
      13: {
        level: 13,
        isSmall: true,
        rewards: ['+2% spell casting speed'],
        passiveBonus: { intelligence: 1 },
      },
      14: {
        level: 14,
        isSmall: true,
        rewards: ['+1% magical resistance'],
        passiveBonus: { wisdom: 1 },
      },
      15: {
        level: 15,
        isSmall: false,
        rewards: ['🔓 Master enchanter unlocked', '+20% magical effects', '+5% all magical stats'],
        items: ['crown_of_archmage', 'robe_of_the_arcane'],
        passiveBonus: { intelligence: 4, wisdom: 3, mana: 40 },
      },
      16: {
        level: 16,
        isSmall: true,
        rewards: ['+2% ethereal binding'],
        passiveBonus: { intelligence: 1 },
      },
      17: {
        level: 17,
        isSmall: true,
        rewards: ['+1% planar fracture resistance'],
        passiveBonus: { intelligence: 1 },
      },
      18: {
        level: 18,
        isSmall: true,
        rewards: ['+2% dimensional stability'],
        passiveBonus: { intelligence: 1 },
      },
      19: {
        level: 19,
        isSmall: true,
        rewards: ['+1% cosmic attunement'],
        passiveBonus: { wisdom: 1, mana: 10 },
      },
      20: {
        level: 20,
        isSmall: false,
        rewards: ['🔓 Transcendent enchantment mastery', '+35% all magical stats', '+15% enchantment success'],
        items: ['infinity_stone', 'eternal_amulet'],
        passiveBonus: { intelligence: 5, wisdom: 4, mana: 60 },
      },
      21: {
        level: 21,
        isSmall: true,
        rewards: ['+2% void manipulation'],
        passiveBonus: { intelligence: 1 },
      },
      22: {
        level: 22,
        isSmall: true,
        rewards: ['+1% reality bending'],
        passiveBonus: { intelligence: 1 },
      },
      23: {
        level: 23,
        isSmall: true,
        rewards: ['+2% temporal enchanting'],
        passiveBonus: { intelligence: 1 },
      },
      24: {
        level: 24,
        isSmall: true,
        rewards: ['+1% space folding'],
        passiveBonus: { wisdom: 1, mana: 10 },
      },
      25: {
        level: 25,
        isSmall: false,
        rewards: ['🔓 Godly enchantments available', '+40% all magical stats', '+20% spell power & durability'],
        items: ['godly_talisman', 'divine_focus'],
        passiveBonus: { intelligence: 6, wisdom: 5, mana: 80 },
      },
      26: {
        level: 26,
        isSmall: true,
        rewards: ['+2% primordial magic'],
        passiveBonus: { intelligence: 1 },
      },
      27: {
        level: 27,
        isSmall: true,
        rewards: ['+1% mythic convergence'],
        passiveBonus: { intelligence: 1 },
      },
      28: {
        level: 28,
        isSmall: true,
        rewards: ['+2% universal harmony'],
        passiveBonus: { intelligence: 1 },
      },
      29: {
        level: 29,
        isSmall: true,
        rewards: ['+1% infinity manipulation'],
        passiveBonus: { wisdom: 1, mana: 10 },
      },
      30: {
        level: 30,
        isSmall: false,
        rewards: ['🏆 Supreme Archmage & Enchanter', '+50% all stats', 'Mastery of all magical arts', '+25% enchantment success & effects'],
        items: ['supreme_focus', 'infinite_talisman'],
        passiveBonus: { intelligence: 8, wisdom: 6, mana: 100 },
      },
    },
    passive: '✨ Enchantments last 50% longer and are 25% more powerful. 2% success bonus per level.',
  },
  gathering: {
    id: 'gathering',
    name: 'Gatherer',
    description: 'Master of resource collection and tool crafting',
    icon: '⛏️',
    unlocks: {
      1: {
        level: 1,
        isSmall: false,
        rewards: ['🔓 Begin your journey as a Gatherer', 'Access to basic gathering tools'],
        items: ['basic_pickaxe', 'basic_axe', 'basic_sickle'],
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
        rewards: ['+3% gathering speed'],
        passiveBonus: { agility: 1 },
      },
      5: {
        level: 5,
        isSmall: false,
        rewards: ['🔓 Unlock Uncommon tools & areas', '+10% all gathering bonuses'],
        items: ['uncommon_pickaxe', 'uncommon_axe', 'uncommon_sickle'],
        passiveBonus: { strength: 1, agility: 1, intelligence: 1, vitality: 1 },
      },
      6: {
        level: 6,
        isSmall: true,
        rewards: ['+2% material quality'],
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
        rewards: ['🔓 Master Gatherer rank', '+15% all gathering stats'],
        items: ['rare_pickaxe', 'rare_axe', 'rare_sickle'],
        passiveBonus: { strength: 2, agility: 2, intelligence: 2, vitality: 2 },
      },
      11: {
        level: 11,
        isSmall: true,
        rewards: ['+5% legendary material chance'],
        passiveBonus: { agility: 1 },
      },
      12: {
        level: 12,
        isSmall: true,
        rewards: ['+3% gathering critical success'],
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
        rewards: ['🔓 Expert Gatherer rank', '+20% gathering speed', 'Unlock legendary areas'],
        items: ['epic_pickaxe', 'epic_axe', 'epic_sickle'],
        passiveBonus: { strength: 3, agility: 3, intelligence: 3, vitality: 3 },
      },
      16: {
        level: 16,
        isSmall: true,
        rewards: ['+3% epic material discovery'],
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
        rewards: ['🔓 Grand Master Gatherer', '+25% all gathering bonuses', '+15% XP gain'],
        items: ['legendary_pickaxe', 'legendary_axe', 'legendary_sickle'],
        passiveBonus: { strength: 4, agility: 4, intelligence: 4, vitality: 4 },
      },
      21: {
        level: 21,
        isSmall: true,
        rewards: ['+5% mythic material detection'],
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
        rewards: ['🏆 Legendary Gatherer', '+30% all bonuses', 'Passive gold generation'],
        items: ['legendary_yield_blessing', 'legendary_rarity_finder'],
        passiveBonus: { strength: 5, agility: 5, intelligence: 5, vitality: 5 },
      },
      26: {
        level: 26,
        isSmall: true,
        rewards: ['+2% cosmic resonance'],
        passiveBonus: { intelligence: 1 },
      },
      27: {
        level: 27,
        isSmall: true,
        rewards: ['+1% primordial gathering'],
        passiveBonus: { agility: 1 },
      },
      28: {
        level: 28,
        isSmall: true,
        rewards: ['+2% universal abundance'],
        passiveBonus: { intelligence: 1 },
      },
      29: {
        level: 29,
        isSmall: true,
        rewards: ['+1% infinity harvesting'],
        passiveBonus: { agility: 1, intelligence: 1 },
      },
      30: {
        level: 30,
        isSmall: false,
        rewards: ['🏆 Titan of Resources', '+50% all stats', 'Gathering never fails', 'Unlock hidden legendary areas'],
        items: ['titan_gathering_set'],
        passiveBonus: { strength: 6, agility: 6, intelligence: 6, vitality: 6 },
      },
    },
    passive: '⛏️ Gathering profession provides massive stat bonuses and specialized tools. Each level increases material yield and rare find chance significantly.',
  },
};

/**
 * Get profession rewards info
 */
export function getProfessionRewards(professionId) {
  return PROFESSION_REWARDS[professionId] || null;
}

/**
 * Get specific level rewards for a profession
 */
export function getProfessionLevelRewards(professionId, level) {
  const profession = getProfessionRewards(professionId);
  if (!profession) return null;

  return profession.unlocks[level] || null;
}

/**
 * Get all unlocked rewards up to a level
 */
export function getUnlockedRewards(professionId, level) {
  const profession = getProfessionRewards(professionId);
  if (!profession) return [];

  const rewards = [];
  for (let i = 1; i <= level; i++) {
    if (profession.unlocks[i]) {
      rewards.push({
        level: i,
        ...profession.unlocks[i],
      });
    }
  }

  return rewards;
}

/**
 * Get next milestone for a profession
 */
export function getNextMilestone(professionId, currentLevel) {
  const profession = getProfessionRewards(professionId);
  if (!profession) return null;

  const levels = Object.keys(profession.unlocks)
    .map(Number)
    .sort((a, b) => a - b);

  for (const level of levels) {
    if (level > currentLevel) {
      return profession.unlocks[level];
    }
  }

  return null;
}

/**
 * Format rewards for display
 */
export function formatRewardsForDisplay(profession) {
  if (!profession) return '';

  const lines = [];
  lines.push(`**${profession.name}** (${profession.icon})`);
  lines.push(`*${profession.description}*`);
  lines.push('');
  lines.push('**Passive:** ' + profession.passive);

  return lines.join('\n');
}

/**
 * Calculate total passive bonuses from all profession levels
 */
export function calculateProfessionBonuses(playerProfessions) {
  const bonuses = {
    strength: 0,
    defense: 0,
    intelligence: 0,
    wisdom: 0,
    mana: 0,
    hp: 0,
  };

  if (!playerProfessions || typeof playerProfessions !== 'object') {
    return bonuses;
  }

  for (const [profId, level] of Object.entries(playerProfessions)) {
    const rewards = getUnlockedRewards(profId, level);
    
    for (const reward of rewards) {
      if (reward.passiveBonus) {
        for (const [stat, value] of Object.entries(reward.passiveBonus)) {
          bonuses[stat] = (bonuses[stat] || 0) + value;
        }
      }
    }
  }

  return bonuses;
}

export default {
  PROFESSION_REWARDS,
  getProfessionRewards,
  getProfessionLevelRewards,
  getUnlockedRewards,
  getNextMilestone,
  formatRewardsForDisplay,
  calculateProfessionBonuses,
};
