/**
 * Town Defense Quest Chain - Unlocks new quests and shops
 * Each quest starts a combat encounter or presents choices
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load defense quests from JSON file (editable) or fall back to default
export function loadDefenseQuests() {
  const defenseQuestsPath = path.join(__dirname, '../../data/defense-quests.json');
  
  try {
    if (fs.existsSync(defenseQuestsPath)) {
      const data = fs.readFileSync(defenseQuestsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading defense-quests.json, using defaults:', err);
  }
  
  // Default quests if JSON doesn't exist yet
  return DEFAULT_DEFENSE_QUESTS;
}

const DEFAULT_DEFENSE_QUESTS = [
  {
    id: 'defense_millhaven',
    name: 'Defend Millhaven',
    description: 'Drive off raiders threatening the farmlands.',
    minLevel: 1,
    unlocks: null,
    type: 'combat', // combat or choice
    enemy: {
      name: 'Raider Captain',
      level: 3,
      hp: 200,
      stats: {
        strength: 8,
        defense: 6,
        intelligence: 3,
        agility: 7,
      },
      skills: ['slash', 'shield_bash'],
    },
    reward: {
      xp: 180,
      gold: 120,
      items: [
        { id: 'health_potion', quantity: 3 },
        { id: 'leather_armor', quantity: 1 },
      ],
    },
  },
  {
    id: 'defense_shadowport',
    name: 'Defend Shadowport',
    description: 'Protect the docks from pirates and smugglers.',
    minLevel: 5,
    unlocks: 'defense_millhaven',
    type: 'combat',
    enemy: {
      name: 'Pirate Lord',
      level: 7,
      hp: 380,
      stats: {
        strength: 12,
        defense: 8,
        intelligence: 6,
        agility: 14,
      },
      skills: ['backstab', 'slash', 'poison_strike'],
    },
    reward: {
      xp: 350,
      gold: 260,
      items: [
        { id: 'mana_potion', quantity: 3 },
        { id: 'steel_longsword', quantity: 1 },
      ],
    },
  },
  {
    id: 'defense_mysterious_stranger',
    name: 'The Mysterious Stranger',
    description: 'A hooded figure approaches you with information about the pirate attacks. Do you trust them?',
    minLevel: 6,
    unlocks: 'defense_shadowport',
    type: 'choice',
    branches: [
      {
        id: 'branch_trust',
        title: '🤝 Trust the Stranger',
        description: 'Accept their help and follow their lead.',
      },
      {
        id: 'branch_investigate',
        title: '🔍 Investigate First',
        description: 'Ask around town about this stranger before committing.',
      },
      {
        id: 'branch_refuse',
        title: '⛔ Refuse and Report',
        description: 'Turn them into the town guard as suspicious.',
      },
    ],
    outcomes: [
      {
        id: 'outcome_trust',
        branchId: 'branch_trust',
        title: 'Betrayed!',
        description: 'The stranger was a pirate spy! They ambush you and steal some gold.',
        isNegative: true,
        reward: {
          xp: 100,
          gold: -150, // Negative gold = loss
          items: [],
        },
        consequences: {
          healthLoss: 30, // Percentage
          debuff: {
            name: 'Wounded',
            duration: 2, // turns in next combat
            effect: { defense: -5 },
          },
        },
        flagsSet: ['quest_stranger_betrayed', 'reputation_shadowport_decreased'],
      },
      {
        id: 'outcome_investigate',
        branchId: 'branch_investigate',
        title: 'Wise Decision',
        description: 'Your investigation reveals the stranger is actually an undercover ally. They share valuable intel.',
        isNegative: false,
        reward: {
          xp: 280,
          gold: 200,
          items: [
            { id: 'mana_potion', quantity: 2 },
          ],
        },
        flagsSet: ['quest_stranger_investigated', 'reputation_shadowport_increased'],
        bonuses: {
          nextCombatBonus: { agility: 3 }, // Bonus for next combat
        },
      },
      {
        id: 'outcome_refuse',
        branchId: 'branch_refuse',
        title: 'Missed Opportunity',
        description: 'The guards find nothing wrong. You missed a chance for valuable information.',
        isNegative: true,
        reward: {
          xp: 50,
          gold: 20,
          items: [],
        },
        flagsSet: ['quest_stranger_refused'],
        consequences: {
          vendorPriceIncrease: 10, // 10% more expensive vendors for next 3 purchases
        },
      },
    ],
  },
  {
    id: 'defense_class_awakening',
    name: 'Awaken Your Class',
    description: 'A trial in the Dark Forest to awaken your true class.',
    minLevel: 8,
    unlocks: 'defense_shadowport',
    type: 'combat',
    enemy: {
      name: 'Forest Warden',
      level: 9,
      hp: 420,
      stats: {
        strength: 14,
        defense: 10,
        intelligence: 8,
        agility: 12,
      },
      skills: ['slash', 'evade', 'parry'],
    },
    reward: {
      xp: 450,
      gold: 320,
      unlockClass: true,
      items: [
        { id: 'health_potion', quantity: 4 },
      ],
    },
  },
  {
    id: 'defense_arcane_tower',
    name: 'Defend the Arcane Tower',
    description: 'Seal a rift and protect the mage archives.',
    minLevel: 10,
    unlocks: 'defense_shadowport',
    type: 'combat',
    enemy: {
      name: 'Rift Demon',
      level: 12,
      hp: 550,
      stats: {
        strength: 10,
        defense: 12,
        intelligence: 18,
        agility: 10,
      },
      skills: ['fireball', 'ice_spike', 'lightning_bolt'],
    },
    reward: {
      xp: 600,
      gold: 450,
      items: [
        { id: 'staff_wisdom', quantity: 1 },
        { id: 'mana_potion', quantity: 5 },
      ],
    },
  },
  {
    id: 'defense_drakehollow',
    name: 'Defend Drakehollow',
    description: 'Hold the line against draconic forces.',
    minLevel: 12,
    unlocks: 'defense_arcane_tower',
    type: 'combat',
    enemy: {
      name: 'Drake Commander',
      level: 15,
      hp: 750,
      stats: {
        strength: 20,
        defense: 16,
        intelligence: 12,
        agility: 11,
      },
      skills: ['slash', 'dragon_breath', 'tail_sweep'],
    },
    reward: {
      xp: 900,
      gold: 700,
      items: [
        { id: 'mithril_blade', quantity: 1 },
        { id: 'adamantite', quantity: 2 },
      ],
    },
  },
  {
    id: 'defense_cursed_artifact',
    name: 'The Cursed Artifact',
    description: 'You discover a powerful cursed artifact. What will you do with it?',
    minLevel: 14,
    unlocks: 'defense_drakehollow',
    type: 'choice',
    branches: [
      {
        id: 'branch_use',
        title: '⚡ Use the Artifact',
        description: 'Harness its dark power for yourself, despite the risk.',
      },
      {
        id: 'branch_destroy',
        title: '🔨 Destroy the Artifact',
        description: 'Break the curse and eliminate the threat permanently.',
      },
      {
        id: 'branch_study',
        title: '📚 Study the Artifact',
        description: 'Take time to research and understand it before deciding.',
      },
    ],
    outcomes: [
      {
        id: 'outcome_use',
        branchId: 'branch_use',
        title: 'Corrupted Power',
        description: 'You gain immense power, but the curse takes its toll on your mind.',
        isNegative: true,
        reward: {
          xp: 800,
          gold: 500,
          items: [
            { id: 'cursed_amulet', quantity: 1 },
          ],
        },
        flagsSet: ['quest_artifact_used', 'cursed_player'],
        consequences: {
          permanentDebuff: {
            name: 'Cursed',
            effect: { wisdom: -5, intelligence: +8, mana: +50 },
            description: 'The curse grants power but clouds judgment',
          },
          goldLossPerDay: 10, // Lose gold over time
        },
      },
      {
        id: 'outcome_destroy',
        branchId: 'branch_destroy',
        title: 'Curse Lifted',
        description: 'The artifact shatters, releasing trapped souls who reward you.',
        isNegative: false,
        reward: {
          xp: 1000,
          gold: 800,
          items: [
            { id: 'blessed_pendant', quantity: 1 },
            { id: 'ancient_fang', quantity: 3 },
          ],
        },
        flagsSet: ['quest_artifact_destroyed', 'hero_of_light'],
        bonuses: {
          permanentBuff: {
            name: 'Blessed',
            effect: { wisdom: +3, defense: +2 },
          },
        },
      },
      {
        id: 'outcome_study',
        branchId: 'branch_study',
        title: 'Knowledge Gained',
        description: 'Through careful study, you learn to control the artifact safely.',
        isNegative: false,
        reward: {
          xp: 1200,
          gold: 600,
          items: [
            { id: 'tome_of_shadows', quantity: 1 },
          ],
        },
        flagsSet: ['quest_artifact_studied', 'artifact_scholar'],
        bonuses: {
          skillUnlock: 'shadow_mastery',
          permanentBuff: {
            name: 'Enlightened',
            effect: { intelligence: +5 },
          },
        },
      },
    ],
  },
];

// Export loaded quests
export const DEFENSE_QUESTS = loadDefenseQuests();

export function getDefenseQuestById(id) {
  const quests = loadDefenseQuests();
  return quests.find(q => q.id === id);
}

export function getAvailableDefenseQuests(player) {
  const quests = loadDefenseQuests();
  return quests.filter(q => {
    // Show all quests regardless of level (just display as recommended)
    if (q.unlocks && !player.hasQuestFlag(q.unlocks)) return false;
    return !player.hasQuestFlag(q.id);
  });
}

export function getCompletedDefenseQuests(player) {
  const quests = loadDefenseQuests();
  return quests.filter(q => player.hasQuestFlag(q.id));
}
