/**
 * Talents System - Passive stat boosts and class-specific abilities
 */

// Universal talents (available to all classes)
export const UNIVERSAL_TALENTS = [
  {
    id: 'iron_body',
    name: 'Iron Body',
    description: 'Increase defense by +2 per rank. When HP drops below 50%, gain bonus +3% damage reduction.',
    maxRank: 5,
    bonuses: { defense: 2 },
    classRestriction: null,
    effect: 'conditional_defense',
  },
  {
    id: 'vital_surge',
    name: 'Vital Surge',
    description: 'Increase max HP by +10 per rank. Regenerate 2% max HP every 3 turns.',
    maxRank: 5,
    bonuses: { hp: 10 },
    classRestriction: null,
    effect: 'hp_regeneration',
  },
  {
    id: 'keen_mind',
    name: 'Keen Mind',
    description: 'Increase intelligence by +2 per rank. Gain +5% XP from all sources.',
    maxRank: 5,
    bonuses: { intelligence: 2 },
    classRestriction: null,
    effect: 'xp_boost',
  },
  {
    id: 'swift_steps',
    name: 'Swift Steps',
    description: 'Increase agility by +2 per rank. +3% chance to dodge attacks.',
    maxRank: 5,
    bonuses: { agility: 2 },
    classRestriction: null,
    effect: 'dodge_chance',
  },
  {
    id: 'relentless',
    name: 'Relentless',
    description: 'Increase strength by +2 per rank. Each consecutive attack on the same target deals +2% more damage (stacks up to 5 times).',
    maxRank: 5,
    bonuses: { strength: 2 },
    classRestriction: null,
    effect: 'momentum_damage',
  },
  {
    id: 'wisdom_flow',
    name: 'Wisdom Flow',
    description: 'Increase wisdom by +2 per rank. Critical hits restore 5% max mana.',
    maxRank: 5,
    bonuses: { wisdom: 2 },
    classRestriction: null,
    effect: 'mana_on_crit',
  },
  {
    id: 'mana_battery',
    name: 'Mana Battery',
    description: 'Increase max mana by +15 per rank. Start combat with 20% bonus mana.',
    maxRank: 5,
    bonuses: { mana: 15 },
    classRestriction: null,
    effect: 'combat_start_mana',
  },
  {
    id: 'treasure_hunter',
    name: 'Treasure Hunter',
    description: 'Increase gold drops by +10% per rank. +5% chance to find rare materials.',
    maxRank: 5,
    bonuses: { wisdom: 1 },
    classRestriction: null,
    effect: 'loot_bonus',
  },
  {
    id: 'rapid_learner',
    name: 'Rapid Learner',
    description: 'Gain +8% profession XP per rank. Crafting has 10% reduced material costs.',
    maxRank: 5,
    bonuses: { intelligence: 1 },
    classRestriction: null,
    effect: 'profession_bonus',
  },
];

// Warrior-specific talents
export const WARRIOR_TALENTS = [
  {
    id: 'unbreakable',
    name: 'Unbreakable',
    description: 'Reduce all damage taken by 5% per rank. When blocking, reflect 10% damage back.',
    maxRank: 5,
    bonuses: { defense: 3 },
    classRestriction: 'warrior',
    effect: 'damage_reduction_reflect',
  },
  {
    id: 'last_stand',
    name: 'Last Stand',
    description: 'When HP drops below 30%, gain +20% defense per rank and become immune to crowd control.',
    maxRank: 3,
    bonuses: { defense: 5 },
    classRestriction: 'warrior',
    effect: 'low_hp_defense_cc_immune',
  },
  {
    id: 'cleave',
    name: 'Cleave Mastery',
    description: 'Gain +1 weapon damage per rank. Basic attacks have 15% chance to hit adjacent enemies.',
    maxRank: 5,
    bonuses: { strength: 3 },
    classRestriction: 'warrior',
    effect: 'aoe_basic_attack',
  },
  {
    id: 'fortress',
    name: 'Fortress',
    description: 'Shield bash has 25% chance per rank to stun enemies for 1 turn. Stuns reset cooldowns 50% faster.',
    maxRank: 5,
    bonuses: { defense: 4 },
    classRestriction: 'warrior',
    effect: 'shield_bash_stun_cd',
  },
  {
    id: 'berserker_rage',
    name: 'Berserker Rage',
    description: 'Gain +3% damage per rank for each 10% HP lost. At full fury, attacks never miss.',
    maxRank: 5,
    bonuses: { strength: 4, vitality: -1 },
    classRestriction: 'warrior',
    effect: 'damage_per_missing_hp',
  },
  {
    id: 'war_cry',
    name: 'War Cry',
    description: '+10% intimidation per rank. Enemies deal 5% less damage while intimidated (3 turns).',
    maxRank: 3,
    bonuses: { strength: 2, defense: 2 },
    classRestriction: 'warrior',
    effect: 'intimidate_debuff',
  },
];

// Mage-specific talents
export const MAGE_TALENTS = [
  {
    id: 'spell_mastery',
    name: 'Spell Mastery',
    description: 'Increase spell damage by +5% per rank.',
    maxRank: 5,
    bonuses: { intelligence: 3 },
    classRestriction: 'mage',
    effect: 'spell_damage',
  },
  {
    id: 'arcane_flow',
    name: 'Arcane Flow',
    description: 'Reduce spell mana cost by 10% per rank.',
    maxRank: 5,
    bonuses: { mana: 10 },
    classRestriction: 'mage',
    effect: 'mana_efficiency',
  },
  {
    id: 'inferno',
    name: 'Inferno',
    description: 'Fireball does +20% damage per rank and burns enemies.',
    maxRank: 5,
    bonuses: { intelligence: 4 },
    classRestriction: 'mage',
    effect: 'fireball_burn',
  },
  {
    id: 'frost_armor',
    name: 'Frost Armor',
    description: 'Ice shield grants +10% defense per rank.',
    maxRank: 5,
    bonuses: { defense: 2, intelligence: 2 },
    classRestriction: 'mage',
    effect: 'frost_defense',
  },
  {
    id: 'mana_shield_upgrade',
    name: 'Mana Shield Upgrade',
    description: 'Mana shield absorbs +15% damage per rank.',
    maxRank: 4,
    bonuses: { mana: 15, defense: 2 },
    classRestriction: 'mage',
    effect: 'mana_shield_strength',
  },
];

// Rogue-specific talents
export const ROGUE_TALENTS = [
  {
    id: 'shadow_dance',
    name: 'Shadow Dance',
    description: 'Increase dodge chance by 5% per rank.',
    maxRank: 5,
    bonuses: { agility: 3 },
    classRestriction: 'rogue',
    effect: 'dodge_chance',
  },
  {
    id: 'deadly_strike',
    name: 'Deadly Strike',
    description: 'Critical strike chance increased by 8% per rank.',
    maxRank: 5,
    bonuses: { strength: 2, agility: 2 },
    classRestriction: 'rogue',
    effect: 'crit_chance',
  },
  {
    id: 'poison_mastery',
    name: 'Poison Mastery',
    description: 'Poison damage increased by 20% per rank.',
    maxRank: 5,
    bonuses: { intelligence: 2, agility: 2 },
    classRestriction: 'rogue',
    effect: 'poison_damage',
  },
  {
    id: 'evasion',
    name: 'Evasion',
    description: 'Evade has a 20% chance per rank to grant invisibility for 1 turn.',
    maxRank: 5,
    bonuses: { agility: 4 },
    classRestriction: 'rogue',
    effect: 'evasion_invisibility',
  },
  {
    id: 'assassinate',
    name: 'Assassinate',
    description: 'Backstab damage increased by 25% per rank.',
    maxRank: 5,
    bonuses: { strength: 3, agility: 3 },
    classRestriction: 'rogue',
    effect: 'backstab_bonus',
  },
];

// Paladin-specific talents
export const PALADIN_TALENTS = [
  {
    id: 'holy_light',
    name: 'Holy Light',
    description: 'Healing spells restore +15% more HP per rank.',
    maxRank: 5,
    bonuses: { wisdom: 3, intelligence: 2 },
    classRestriction: 'paladin',
    effect: 'healing_boost',
  },
  {
    id: 'divine_shield',
    name: 'Divine Shield',
    description: 'Divine protection grants +10% damage reduction per rank.',
    maxRank: 5,
    bonuses: { defense: 3, wisdom: 2 },
    classRestriction: 'paladin',
    effect: 'shield_strength',
  },
  {
    id: 'blessed_strike',
    name: 'Blessed Strike',
    description: 'Holy strike restores +10% mana per rank.',
    maxRank: 5,
    bonuses: { strength: 2, wisdom: 3, mana: 10 },
    classRestriction: 'paladin',
    effect: 'mana_restoration',
  },
  {
    id: 'aura_of_protection',
    name: 'Aura of Protection',
    description: 'Gain +5% defense and wisdom per rank (passive aura).',
    maxRank: 5,
    bonuses: { defense: 3, wisdom: 3 },
    classRestriction: 'paladin',
    effect: 'passive_aura',
  },
  {
    id: 'redemption',
    name: 'Redemption',
    description: 'When healing others, restore +10% of your own HP per rank.',
    maxRank: 4,
    bonuses: { wisdom: 4, hp: 15 },
    classRestriction: 'paladin',
    effect: 'self_heal_on_cast',
  },
];

// Combine all talents
export const TALENTS = [
  ...UNIVERSAL_TALENTS,
  ...WARRIOR_TALENTS,
  ...MAGE_TALENTS,
  ...ROGUE_TALENTS,
  ...PALADIN_TALENTS,
];

export function getTalent(talentId) {
  return TALENTS.find(t => t.id === talentId) || null;
}

export function getTalents() {
  return TALENTS;
}

/**
 * Get talents available for a specific class
 */
export function getTalentsByClass(className) {
  return TALENTS.filter(t => t.classRestriction === null || t.classRestriction === className);
}

/**
 * Get class-specific talents only
 */
export function getClassSpecificTalents(className) {
  return TALENTS.filter(t => t.classRestriction === className);
}

/**
 * Get universal talents
 */
export function getUniversalTalents() {
  return UNIVERSAL_TALENTS;
}

export default {
  TALENTS,
  UNIVERSAL_TALENTS,
  WARRIOR_TALENTS,
  MAGE_TALENTS,
  ROGUE_TALENTS,
  PALADIN_TALENTS,
  getTalent,
  getTalents,
  getTalentsByClass,
  getClassSpecificTalents,
  getUniversalTalents,
};
