/**
 * Environmental Effect Predictions - Predict hazards and buffs in battles
 */

class EnvironmentPredictions {
  constructor() {
    this.effectChances = {
      'ancient_forest': {
        hazards: [
          { name: 'Vines', chance: 35, damage: '15-25' },
          { name: 'Poisonous Gas', chance: 25, damage: '10-20' }
        ],
        buffs: [
          { name: 'Nature\'s Blessing', chance: 40, effect: '+10% healing' },
          { name: 'Forest Speed', chance: 30, effect: '+5% agility' }
        ]
      },
      'volcanic_cavern': {
        hazards: [
          { name: 'Lava Pool', chance: 45, damage: '30-50' },
          { name: 'Fire Breath', chance: 35, damage: '20-40' }
        ],
        buffs: [
          { name: 'Infernal Might', chance: 30, effect: '+15% fire damage' },
          { name: 'Heat Resistance', chance: 25, effect: '-20% fire damage taken' }
        ]
      },
      'frozen_tundra': {
        hazards: [
          { name: 'Blizzard', chance: 40, damage: '25-40' },
          { name: 'Freezing Spike', chance: 30, damage: '20-35' }
        ],
        buffs: [
          { name: 'Ice Armor', chance: 35, effect: '+10% defense' },
          { name: 'Frozen Speed', chance: 25, effect: '+10% crit' }
        ]
      },
      'storm_ruin': {
        hazards: [
          { name: 'Lightning Strike', chance: 50, damage: '35-60' },
          { name: 'Thunder Storm', chance: 40, damage: '25-45' }
        ],
        buffs: [
          { name: 'Storm\'s Fury', chance: 35, effect: '+20% damage' },
          { name: 'Static Shield', chance: 25, effect: '+15% defense' }
        ]
      },
      'shadow_void': {
        hazards: [
          { name: 'Shadow Tendril', chance: 35, damage: '20-35' },
          { name: 'Void Drain', chance: 30, damage: '15-30' }
        ],
        buffs: [
          { name: 'Shadow Clone', chance: 40, effect: '+20% dodge' },
          { name: 'Dark Power', chance: 30, effect: '+15% dark damage' }
        ]
      },
      'holy_sanctuary': {
        hazards: [
          { name: 'Holy Fire', chance: 25, damage: '15-25' },
          { name: 'Divine Punishment', chance: 20, damage: '20-40' }
        ],
        buffs: [
          { name: 'Holy Protection', chance: 45, effect: '+20% defense' },
          { name: 'Divine Blessing', chance: 40, effect: '+30% healing received' }
        ]
      },
      'ancient_ruins': {
        hazards: [
          { name: 'Ancient Curse', chance: 30, damage: '20-30' },
          { name: 'Collapsing Debris', chance: 35, damage: '15-25' }
        ],
        buffs: [
          { name: 'Ancestral Wisdom', chance: 35, effect: '+15% intelligence' },
          { name: 'Ancient Strength', chance: 25, effect: '+10% damage' }
        ]
      },
      'the_abyss': {
        hazards: [
          { name: 'Abyssal Void', chance: 50, damage: '40-60' },
          { name: 'Chaos Waves', chance: 45, damage: '30-50' }
        ],
        buffs: [
          { name: 'Void Empowerment', chance: 25, effect: '+25% damage' },
          { name: 'Abyss Evasion', chance: 20, effect: '+25% dodge' }
        ]
      }
    };
  }

  /**
   * Predict effects for a specific environment
   */
  predictEffects(environmentId) {
    const envEffects = this.effectChances[environmentId];
    
    if (!envEffects) {
      return {
        environment: environmentId,
        hazards: [],
        buffs: [],
        prediction: 'Unknown environment'
      };
    }

    return {
      environment: environmentId,
      hazards: envEffects.hazards,
      buffs: envEffects.buffs,
      prediction: this.generatePrediction(envEffects)
    };
  }

  /**
   * Generate human-readable prediction text
   */
  generatePrediction(envEffects) {
    if (!envEffects.hazards || envEffects.hazards.length === 0 || !envEffects.buffs || envEffects.buffs.length === 0) {
      return 'This environment has minimal effects.';
    }

    const mostLikelyHazard = envEffects.hazards.sort((a, b) => b.chance - a.chance)[0];
    const mostLikelyBuff = envEffects.buffs.sort((a, b) => b.chance - a.chance)[0];

    return `Most likely hazard: ${mostLikelyHazard.name} (${mostLikelyHazard.chance}% chance). ` +
           `Most likely buff: ${mostLikelyBuff.name} (${mostLikelyBuff.chance}% chance)`;
  }

  /**
   * Get safe strategies for environment
   */
  getSafeStrategy(environmentId) {
    const prediction = this.predictEffects(environmentId);
    
    if (prediction.hazards.length === 0) {
      return { strategy: 'No major hazards - standard tactics work well' };
    }

    // Find element weakness of hazards
    const hazardTypes = new Set();
    let strategy = 'Use defensive style. ';

    if (environmentId.includes('volcanic') || environmentId.includes('fire')) {
      strategy += 'Equip ice resistance gear. Use cryomancer style.';
    } else if (environmentId.includes('frozen') || environmentId.includes('ice')) {
      strategy += 'Equip fire resistance gear. Use pyromancer style.';
    } else if (environmentId.includes('storm') || environmentId.includes('lightning')) {
      strategy += 'Equip earth resistance gear. Ground yourself with earth spells.';
    } else if (environmentId.includes('shadow') || environmentId.includes('void')) {
      strategy += 'Use light or holy element. High agility helps evade.';
    } else {
      strategy += 'Stay mobile and maintain high HP.';
    }

    return { strategy };
  }

  /**
   * Calculate hazard frequency for battle planning
   */
  calculateHazardFrequency(environmentId, battleDurationMinutes) {
    const prediction = this.predictEffects(environmentId);
    
    const avgHazardChance = prediction.hazards.reduce((sum, h) => sum + h.chance, 0) / prediction.hazards.length;
    const roundsPerMinute = 2; // Rough estimate
    const totalRounds = battleDurationMinutes * roundsPerMinute;
    
    const expectedHazards = Math.round((avgHazardChance / 100) * totalRounds);
    const expectedDamagePerHazard = prediction.hazards.reduce((sum, h) => {
      const dmg = parseInt(h.damage.split('-')[1]);
      return sum + dmg;
    }, 0) / prediction.hazards.length;

    return {
      expectedHazardCount: expectedHazards,
      totalExpectedDamage: Math.round(expectedHazards * expectedDamagePerHamard),
      hazardFrequency: `Every ${Math.round(totalRounds / expectedHazards)} rounds`,
      recommendation: expectedHazards > 5 ? 'Bring healing potions!' : 'Low hazard frequency'
    };
  }

  /**
   * Compare environments for safety
   */
  rankEnvironmentsBySafety(environmentIds) {
    return environmentIds
      .map(envId => {
        const prediction = this.predictEffects(envId);
        const avgHazardChance = prediction.hazards.reduce((sum, h) => sum + h.chance, 0) / prediction.hazards.length;
        const avgHazardDamage = prediction.hazards.reduce((sum, h) => {
          const dmg = parseInt(h.damage.split('-')[1]);
          return sum + dmg;
        }, 0) / prediction.hazards.length;

        const dangerScore = (avgHazardChance * avgHazardDamage) / 100;

        return {
          environment: envId,
          dangerScore: dangerScore.toFixed(1),
          safetyRating: dangerScore < 10 ? 'Safe' : dangerScore < 20 ? 'Moderate' : 'Dangerous'
        };
      })
      .sort((a, b) => parseFloat(a.dangerScore) - parseFloat(b.dangerScore));
  }
}

export default EnvironmentPredictions;
