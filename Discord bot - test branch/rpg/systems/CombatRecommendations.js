/**
 * Combat Recommendations System - Suggests optimal strategies based on encounter
 */

class CombatRecommendations {
  constructor() {
    // Strategies mapped by enemy type/boss template
    this.strategies = {
      'inferno_lord': {
        recommendedStyle: 'cryomancer',
        recommendedElement: 'ice',
        avoidElement: 'fire',
        tips: [
          'Use ice spells to counter Inferno Lord\'s fire attacks',
          'Focus on defense during phase 2 when damage increases',
          'Move around arena edges to avoid lava pools'
        ],
        difficultyRating: 8,
        estimatedDuration: '5-7 minutes'
      },
      'frost_queen': {
        recommendedStyle: 'pyromancer',
        recommendedElement: 'fire',
        avoidElement: 'ice',
        tips: [
          'Use fire spells to melt ice barriers',
          'Stay mobile to avoid frozen zones',
          'Phase 3 requires focused damage - switch to aggressive style'
        ],
        difficultyRating: 8,
        estimatedDuration: '5-7 minutes'
      },
      'storm_titan': {
        recommendedStyle: 'spellblade',
        recommendedElement: 'earth',
        avoidElement: 'lightning',
        tips: [
          'Ground yourself with earth element spells',
          'Avoid standing in water pools during electrical phases',
          'High INT gear helps resist lightning damage'
        ],
        difficultyRating: 9,
        estimatedDuration: '7-9 minutes'
      },
      'shadow_king': {
        recommendedStyle: 'shadow_dancer',
        recommendedElement: 'dark',
        avoidElement: 'light',
        tips: [
          'High agility is critical for dodging shadow clones',
          'Shadow spells are super effective',
          'Phase 2 spawns additional enemies - AoE damage recommended'
        ],
        difficultyRating: 9,
        estimatedDuration: '8-10 minutes'
      },
      'celestial_guardian': {
        recommendedStyle: 'crusader',
        recommendedElement: 'holy',
        avoidElement: 'dark',
        tips: [
          'Holy element damage is most effective',
          'High constitution helps survive beam attacks',
          'Phase 3 requires sustained damage output',
          'Guardian adds powerful healing - disrupt if possible'
        ],
        difficultyRating: 10,
        estimatedDuration: '10-12 minutes'
      }
    };
  }

  /**
   * Get recommendation for a specific boss
   */
  getBossRecommendation(bossTemplate) {
    return this.strategies[bossTemplate] || {
      recommendedStyle: 'balanced',
      recommendedElement: 'neutral',
      avoidElement: 'none',
      tips: [
        'Study the boss pattern before committing',
        'Maintain health above 50% to survive big attacks',
        'Use high-level gear for this encounter'
      ],
      difficultyRating: 5,
      estimatedDuration: '3-5 minutes'
    };
  }

  /**
   * Calculate style effectiveness against enemy
   */
  calculateStyleEffectiveness(playerStyle, enemyType) {
    const effectiveness = {
      damage: 100,
      defense: 100,
      recommendation: 'Adequate'
    };

    // Boss-specific counters
    if (enemyType === 'inferno_lord' && playerStyle === 'cryomancer') {
      effectiveness.damage = 150;
      effectiveness.defense = 120;
      effectiveness.recommendation = 'Excellent - Super effective!';
    } else if (enemyType === 'frost_queen' && playerStyle === 'pyromancer') {
      effectiveness.damage = 150;
      effectiveness.defense = 120;
      effectiveness.recommendation = 'Excellent - Super effective!';
    } else if (enemyType === 'storm_titan' && playerStyle === 'spellblade') {
      effectiveness.damage = 140;
      effectiveness.defense = 115;
      effectiveness.recommendation = 'Very Good - Highly effective';
    } else if (enemyType === 'shadow_king' && playerStyle === 'shadow_dancer') {
      effectiveness.damage = 160;
      effectiveness.defense = 130;
      effectiveness.recommendation = 'Excellent - Expert match!';
    } else if (enemyType === 'celestial_guardian' && playerStyle === 'crusader') {
      effectiveness.damage = 150;
      effectiveness.defense = 125;
      effectiveness.recommendation = 'Excellent - Holy match!';
    }

    return effectiveness;
  }

  /**
   * Get element advantage
   */
  getElementAdvantage(playerElement, enemyElement) {
    const advantages = {
      'fire': ['ice', 'wind', 'nature'],
      'ice': ['fire', 'nature', 'earth'],
      'lightning': ['water', 'wind', 'nature'],
      'water': ['fire', 'lightning', 'earth'],
      'nature': ['water', 'fire', 'earth'],
      'earth': ['lightning', 'water', 'wind'],
      'wind': ['fire', 'lightning', 'water'],
      'holy': ['dark', 'fire', 'nature'],
      'dark': ['holy', 'lightning', 'water']
    };

    const advantage = advantages[playerElement?.toLowerCase()] || [];
    
    return {
      isAdvantage: advantage.includes(enemyElement?.toLowerCase()),
      damageMultiplier: advantage.includes(enemyElement?.toLowerCase()) ? 1.3 : 1.0,
      recommendation: advantage.includes(enemyElement?.toLowerCase()) 
        ? `${playerElement} is super effective against ${enemyElement}!`
        : `${playerElement} is not particularly effective against ${enemyElement}`
    };
  }

  /**
   * Generate full battle recommendation
   */
  generateBattleRecommendation(playerStyle, playerElement, bossTemplate, bossStats) {
    const bossRec = this.getBossRecommendation(bossTemplate);
    const styleEff = this.calculateStyleEffectiveness(playerStyle, bossTemplate);
    const elementAdv = this.getElementAdvantage(playerElement, bossRec.recommendedElement);

    return {
      overall: {
        difficultyRating: bossRec.difficultyRating,
        estimatedDuration: bossRec.estimatedDuration,
        successProbability: this.calculateSuccessProbability(styleEff, elementAdv, bossRec.difficultyRating)
      },
      style: {
        current: playerStyle,
        effectiveness: styleEff.recommendation,
        recommended: bossRec.recommendedStyle,
        damageModifier: styleEff.damage
      },
      element: {
        current: playerElement,
        effectiveness: elementAdv.recommendation,
        recommended: bossRec.recommendedElement,
        avoid: bossRec.avoidElement,
        damageMultiplier: elementAdv.damageMultiplier
      },
      tips: bossRec.tips,
      strengthsToExploit: this.findStrengths(playerStyle, bossTemplate),
      weaknessesToWatch: this.findWeaknesses(playerStyle, bossTemplate)
    };
  }

  /**
   * Calculate estimated success probability
   */
  calculateSuccessProbability(styleEff, elementAdv, bossDifficulty) {
    let probability = 50; // baseline

    // Style effectiveness modifier
    const stylePercent = styleEff.damage / 100;
    probability += (stylePercent - 1) * 25; // -25 to +25

    // Element advantage modifier
    if (elementAdv.isAdvantage) {
      probability += 15;
    }

    // Boss difficulty modifier
    probability -= (bossDifficulty - 5) * 5; // - max 25

    return Math.max(10, Math.min(95, Math.round(probability)));
  }

  /**
   * Find strategic strengths in matchup
   */
  findStrengths(playerStyle, bossTemplate) {
    const strengths = [];

    if ((playerStyle === 'cryomancer' && bossTemplate === 'inferno_lord') ||
        (playerStyle === 'pyromancer' && bossTemplate === 'frost_queen')) {
      strengths.push('Elemental superiority');
    }

    if (playerStyle === 'shadow_dancer' && bossTemplate === 'shadow_king') {
      strengths.push('Speed advantage');
    }

    if (playerStyle === 'crusader' || playerStyle === 'guardian') {
      strengths.push('High survivability');
    }

    if (playerStyle === 'executioner') {
      strengths.push('Burst damage potential');
    }

    return strengths.length > 0 ? strengths : ['Balanced approach'];
  }

  /**
   * Find strategic weaknesses in matchup
   */
  findWeaknesses(playerStyle, bossTemplate) {
    const weaknesses = [];

    if ((playerStyle === 'pyromancer' && bossTemplate === 'frost_queen') === false &&
        playerStyle === 'pyromancer' && bossTemplate === 'inferno_lord') {
      weaknesses.push('Weak to opposite element');
    }

    if (playerStyle === 'shadow_dancer' && bossTemplate === 'celestial_guardian') {
      weaknesses.push('Dark element ineffective');
    }

    if (playerStyle === 'aggressive' && bossTemplate.includes('multiple_enemies')) {
      weaknesses.push('Multiple targets');
    }

    return weaknesses.length > 0 ? weaknesses : ['No major weaknesses'];
  }
}

export default CombatRecommendations;
