/**
 * Stat Comparison - Compare item stats and show impact on equipment
 */

class StatComparison {
  constructor() {
    this.itemStats = new Map();
  }

  /**
   * Compare two items
   */
  compareItems(currentItem, newItem) {
    const comparison = {
      current: {
        name: currentItem.name,
        rarity: currentItem.rarity,
        stats: currentItem.stats || {}
      },
      new: {
        name: newItem.name,
        rarity: newItem.rarity,
        stats: newItem.stats || {}
      },
      differences: {},
      recommendation: null
    };

    // Compare all stats
    const allStats = new Set([
      ...Object.keys(currentItem.stats || {}),
      ...Object.keys(newItem.stats || {})
    ]);

    allStats.forEach(stat => {
      const currentVal = currentItem.stats?.[stat] || 0;
      const newVal = newItem.stats?.[stat] || 0;
      const diff = newVal - currentVal;

      comparison.differences[stat] = {
        current: currentVal,
        new: newVal,
        difference: diff,
        percentChange: currentVal !== 0 ? Math.floor((diff / currentVal) * 100) : 0,
        icon: diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️'
      };
    });

    // Calculate overall power score
    const currentPower = this.calculatePowerScore(currentItem.stats || {});
    const newPower = this.calculatePowerScore(newItem.stats || {});
    const powerDifference = newPower - currentPower;

    comparison.powerComparison = {
      currentPower: Math.floor(currentPower),
      newPower: Math.floor(newPower),
      difference: Math.floor(powerDifference),
      percentChange: currentPower !== 0 ? Math.floor((powerDifference / currentPower) * 100) : 0
    };

    // Recommendation
    if (powerDifference > 100) {
      comparison.recommendation = '✅ Strong Upgrade - Equip immediately!';
    } else if (powerDifference > 0) {
      comparison.recommendation = '➡️ Slight Upgrade - Equip if specialty needed';
    } else if (powerDifference > -50) {
      comparison.recommendation = '❌ Slight Downgrade - Keep current';
    } else {
      comparison.recommendation = '❌ Major Downgrade - Do not equip';
    }

    return comparison;
  }

  /**
   * Calculate overall power score from stats
   */
  calculatePowerScore(stats) {
    const weights = {
      attack: 1.5,
      damage: 1.5,
      defense: 1.0,
      hp: 0.8,
      intelligence: 1.2,
      agility: 1.0,
      speed: 0.9,
      critChance: 2.0,
      accuracy: 1.0
    };

    let score = 0;
    Object.entries(stats).forEach(([stat, value]) => {
      const weight = weights[stat] || 1.0;
      score += value * weight;
    });

    return score;
  }

  /**
   * Compare overall equipment sets
   */
  compareEquipmentSets(currentSet, newSet) {
    const comparison = {
      setName: newSet.name || 'New Set',
      slots: {}
    };

    const allSlots = new Set([...Object.keys(currentSet), ...Object.keys(newSet)]);

    let totalPowerDiff = 0;

    allSlots.forEach(slot => {
      const current = currentSet[slot];
      const newItem = newSet[slot];

      if (current && newItem) {
        const comparison = this.compareItems(current, newItem);
        comparison.slots[slot] = comparison;
        totalPowerDiff += comparison.powerComparison.difference;
      }
    });

    return {
      setComparison: comparison,
      totalPowerDifference: Math.floor(totalPowerDiff),
      isUpgrade: totalPowerDiff > 0,
      slots: comparison.slots
    };
  }

  /**
   * Get item impact on total stats
   */
  getEquipmentImpact(currentEquipment, slot, newItem) {
    const currentStats = this.calculateTotalStats(currentEquipment);
    const modifiedEquipment = { ...currentEquipment, [slot]: newItem };
    const newStats = this.calculateTotalStats(modifiedEquipment);

    const impact = {};
    Object.keys(currentStats).forEach(stat => {
      const diff = newStats[stat] - currentStats[stat];
      impact[stat] = {
        current: currentStats[stat],
        new: newStats[stat],
        difference: diff,
        percentChange: currentStats[stat] !== 0 ? Math.floor((diff / currentStats[stat]) * 100) : 0,
        icon: diff > 0 ? '✅' : diff < 0 ? '❌' : '➡️'
      };
    });

    return {
      slot,
      newItemName: newItem.name,
      impact,
      summary: this.generateImpactSummary(impact)
    };
  }

  /**
   * Calculate total stats from equipped items
   */
  calculateTotalStats(equipment) {
    const totals = {
      attack: 0,
      defense: 0,
      hp: 0,
      intelligence: 0,
      agility: 0,
      critChance: 0
    };

    Object.values(equipment).forEach(item => {
      if (item && item.stats) {
        Object.entries(item.stats).forEach(([stat, value]) => {
          if (totals.hasOwnProperty(stat)) {
            totals[stat] += value;
          }
        });
      }
    });

    return totals;
  }

  /**
   * Generate impact summary
   */
  generateImpactSummary(impact) {
    const positive = Object.values(impact).filter(i => i.difference > 0);
    const negative = Object.values(impact).filter(i => i.difference < 0);

    const summary = [];

    if (positive.length > 0) {
      const topGain = positive.reduce((a, b) => Math.abs(a.difference) > Math.abs(b.difference) ? a : b);
      summary.push(`Gain +${topGain.difference} ${Object.keys(impact).find(k => impact[k] === topGain)}`);
    }

    if (negative.length > 0) {
      const topLoss = negative.reduce((a, b) => Math.abs(a.difference) > Math.abs(b.difference) ? a : b);
      summary.push(`Lose ${topLoss.difference} ${Object.keys(impact).find(k => impact[k] === topLoss)}`);
    }

    if (summary.length === 0) {
      summary.push('No stat changes');
    }

    return summary.join(', ');
  }

  /**
   * Get best in slot comparison
   */
  getBestInSlot(slot, inventoryItems) {
    if (!inventoryItems || inventoryItems.length === 0) {
      return null;
    }

    const itemsForSlot = inventoryItems.filter(i => i.slot === slot);
    if (itemsForSlot.length === 0) return null;

    // Sort by power score
    return itemsForSlot
      .map(item => ({
        ...item,
        powerScore: this.calculatePowerScore(item.stats || {})
      }))
      .sort((a, b) => b.powerScore - a.powerScore)[0];
  }

  /**
   * Get comparison summary text
   */
  getComparisonText(comparison) {
    const parts = [];

    parts.push(`**${comparison.current.name}** → **${comparison.new.name}**`);
    parts.push(`Rarity: ${comparison.current.rarity} → ${comparison.new.rarity}`);
    parts.push(`Power: ${comparison.powerComparison.currentPower} → ${comparison.powerComparison.newPower} (${comparison.powerComparison.percentChange > 0 ? '+' : ''}${comparison.powerComparison.percentChange}%)`);
    parts.push(comparison.recommendation);

    return parts.join('\n');
  }
}

export default StatComparison;
