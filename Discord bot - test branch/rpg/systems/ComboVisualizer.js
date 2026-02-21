/**
 * Skill Combo Visualizer - Shows skill chains visually
 */

class ComboVisualizer {
  constructor() {}

  /**
   * Create visual combo chain display
   */
  visualizeCombo(combo, includeStats = false) {
    const skillChain = combo.skills.join(' → ');
    
    let visualization = {
      name: combo.name,
      sequence: skillChain,
      count: combo.skills.length,
      damageMultiplier: combo.damageMultiplier,
      effect: combo.effect || null,
      timing: combo.timing || '5 second window',
      visualization: this.createASCIIChain(combo.skills),
      stats: {}
    };

    if (includeStats) {
      const baseDamage = 100;
      const comboBonus = (combo.damageMultiplier - 1) * 100;
      
      visualization.stats = {
        baseDamage,
        bonusDamage: Math.round(baseDamage * comboBonus / 100),
        totalDamage: Math.round(baseDamage * combo.damageMultiplier),
        damagePercentage: combo.damageMultiplier * 100
      };
    }

    return visualization;
  }

  /**
   * Create ASCII art skill chain
   */
  createASCIIChain(skills) {
    return skills.map((skill, index) => {
      const arrow = index < skills.length - 1 ? ' → ' : '';
      return `[${skill}]${arrow}`;
    }).join('');
  }

  /**
   * Get recommended combos for class
   */
  getRecommendedCombos(comboList, playerLevel) {
    return comboList
      .filter(combo => combo.requiredLevel ? combo.requiredLevel <= playerLevel : true)
      .sort((a, b) => b.damageMultiplier - a.damageMultiplier)
      .slice(0, 5);
  }

  /**
   * Show combo rotation (sequence of combos)
   */
  suggestComboRotation(comboList, playerStats) {
    const rotation = [];
    const usedSkills = new Set();

    // Pick 2-3 high-value combos that don't share skills
    for (const combo of comboList.sort((a, b) => b.damageMultiplier - a.damageMultiplier)) {
      if (rotation.length >= 3) break;

      const hasOverlap = combo.skills.some(skill => usedSkills.has(skill));
      if (!hasOverlap) {
        rotation.push(combo);
        combo.skills.forEach(skill => usedSkills.add(skill));
      }
    }

    return {
      rotation: rotation.map(c => c.name),
      totalSkills: usedSkills.size,
      estimatedDamage: rotation.reduce((sum, c) => sum + c.damageMultiplier, 0)
    };
  }

  /**
   * Calculate combo execution time
   */
  calculateComboTime(combo, playerAgility = 10) {
    const baseTime = combo.skills.length * 0.5; // 0.5 sec per skill
    const agilityBonus = 1 - (playerAgility * 0.02); // Faster with agility
    return Math.max(1, baseTime * agilityBonus);
  }
}

export default ComboVisualizer;
