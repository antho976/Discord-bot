/**
 * Narrative Character Creation - V2 upgrade for V1
 */

export const NARRATIVE_CHOICES = {
  defender: {
    id: 'defender',
    title: 'Stand Your Ground',
    narrativeText: 'You have always been the shield for others, holding the line when chaos erupts.',
    flavorText: 'You feel the weight of responsibility and the calm of unwavering resolve.',
    internalClass: 'warrior',
    baseStats: {
      strength: 12,
      defense: 14,
      vitality: 12,
      hp: 120,
      mana: 40,
    },
    aiTendencies: {
      aggression: 0.4,
      riskTaking: 0.2,
      skillUsage: 0.6,
      resourceConservation: 0.7,
      defensivePriority: 0.85,
      finisherUsage: 0.3,
    },
  },
  striker: {
    id: 'striker',
    title: 'Strike First',
    narrativeText: 'You believe in decisive action and swift elimination of threats.',
    flavorText: 'Speed and precision are your truest allies.',
    internalClass: 'rogue',
    baseStats: {
      strength: 12,
      agility: 14,
      defense: 8,
      hp: 95,
      mana: 55,
    },
    aiTendencies: {
      aggression: 0.9,
      riskTaking: 0.8,
      skillUsage: 0.75,
      resourceConservation: 0.35,
      defensivePriority: 0.2,
      finisherUsage: 0.9,
    },
  },
  tactician: {
    id: 'tactician',
    title: 'Study Patterns',
    narrativeText: 'You watch, learn, and strike at the perfect moment.',
    flavorText: 'You trust in preparation more than brute force.',
    internalClass: 'mage',
    baseStats: {
      intelligence: 14,
      wisdom: 12,
      agility: 10,
      hp: 90,
      mana: 80,
    },
    aiTendencies: {
      aggression: 0.6,
      riskTaking: 0.45,
      skillUsage: 0.85,
      resourceConservation: 0.6,
      defensivePriority: 0.4,
      finisherUsage: 0.6,
    },
  },
};

export function getNarrativeChoice(choiceId) {
  return NARRATIVE_CHOICES[choiceId];
}

export function getAllNarrativeChoices() {
  return Object.values(NARRATIVE_CHOICES);
}
