/**
 * Profession Efficiency System - Optimal strategies for gathering/crafting
 */

class ProfessionEfficiency {
  constructor() {
    this.strategies = {
      gathering: {
        beginner: {
          level: 1,
          recommendation: 'Focus on Copper Ore and Herbs',
          locations: ['Ancient Forest', 'Peaceful Plains'],
          toolRecommendation: 'Beginner\'s Pickaxe',
          estimatedYield: '10-20 items/hour',
          bestTime: 'All day',
          tips: [
            'Gather from multiple nodes to avoid respawn waiting',
            'Use auto-gather feature to passively farm',
            'Sell common materials for starting capital'
          ]
        },
        intermediate: {
          level: 20,
          recommendation: 'Transition to Silver and Rare Herbs',
          locations: ['Volcanic Cavern', 'Frozen Tundra'],
          toolRecommendation: 'Silver Pickaxe',
          estimatedYield: '30-50 items/hour',
          bestTime: 'Night yields rare drops',
          tips: [
            'Nodes respawn faster at night - prioritize night farming',
            'Silver ore sells for 3x the price of copper',
            'Collect specialty herbs for alchemy recipes'
          ]
        },
        advanced: {
          level: 40,
          recommendation: 'Farm Mythril and Ancient Artifacts',
          locations: ['Ancient Ruins', 'The Abyss', 'Thunderstorm Peak'],
          toolRecommendation: 'Mythril Pickaxe',
          estimatedYield: '50-100 items/hour',
          bestTime: 'Rare spawns at specific hours',
          tips: [
            'Mythril nodes appear only at specific times - track patterns',
            'Combine gathering with combat for maximum efficiency',
            'Ancient artifacts sell for 10x normal materials'
          ]
        }
      },
      crafting: {
        beginner: {
          level: 1,
          recommendation: 'Start with basic recipes',
          profitableRecipes: ['Wooden Sword', 'Copper Helmet'],
          materialCost: '10-50 gold',
          sellPrice: '50-150 gold',
          profitMargin: '300-500%',
          tips: [
            'Focus on recipes with high profit margins',
            'Buy bulk materials during sales',
            'Craft items that NPCs always buy'
          ]
        },
        intermediate: {
          level: 20,
          recommendation: 'Craft rare equipment',
          profitableRecipes: ['Silver Armor', 'Enchanted Boots', 'Rare Rings'],
          materialCost: '100-500 gold',
          sellPrice: '500-2000 gold',
          profitMargin: '300-400%',
          tips: [
            'Intermediate crafting needs quality materials',
            'Check market prices before gathering',
            'Bundle items for higher prices (e.g., full armor sets)'
          ]
        },
        advanced: {
          level: 40,
          recommendation: 'Craft legendary equipment',
          profitableRecipes: ['Legendary Sword', 'Ancient Guardian Set', 'Mythril Armor'],
          materialCost: '5000-50000 gold',
          sellPrice: '50000-500000 gold',
          profitMargin: '500-1000%',
          tips: [
            'Legendary recipes have huge profit potential',
            'Requires significant material investment',
            'Sell to wealthy players for premium prices',
            'Combine materials from multiple gathering runs'
          ]
        }
      },
      alchemy: {
        beginner: {
          recommendation: 'Brew basic potions',
          recipes: ['Healing Potion', 'Mana Potion'],
          ingredients: 'Common herbs',
          yield: '10-20 potions per batch',
          profitPerPotion: '5-10 gold',
          tips: [
            'Brewing is low effort - great for passive income',
            'Potions always have market demand',
            'Store potions to sell during boss events'
          ]
        },
        intermediate: {
          recommendation: 'Brew buffs and stat boosters',
          recipes: ['Strength Elixir', 'Intelligence Brew', 'Agility Potion'],
          ingredients: 'Rare herbs + catalysts',
          yield: '5-10 potions per batch',
          profitPerPotion: '50-100 gold',
          tips: [
            'Buff potions sell during raids and guild wars',
            'Higher ingredient cost = higher profit',
            'Create variety packs for bulk sales'
          ]
        }
      }
    };
  }

  /**
   * Get profession strategy for player level
   */
  getStrategyForLevel(profession, playerLevel) {
    const profStrategies = this.strategies[profession];
    if (!profStrategies) return null;

    if (playerLevel < 20) {
      return profStrategies.beginner || null;
    } else if (playerLevel < 40) {
      return profStrategies.intermediate || null;
    } else {
      return profStrategies.advanced || null;
    }
  }

  /**
   * Calculate optimal profit for profession
   */
  calculateOptimalProfit(profession, timeHours, playerLevel) {
    const strategy = this.getStrategyForLevel(profession, playerLevel);
    if (!strategy) return null;

    let estimatedYield = 10;
    let profitPerItem = 5;

    if (profession === 'gathering') {
      // Extract yield from strategy (e.g., "10-20 items/hour")
      if (strategy.estimatedYield) {
        const yieldMatch = strategy.estimatedYield.match(/(\d+)-(\d+)/);
        if (yieldMatch) {
          estimatedYield = (parseInt(yieldMatch[1]) + parseInt(yieldMatch[2])) / 2;
        }
      }
      profitPerItem = playerLevel * 0.5; // Increases with level
    } else if (profession === 'crafting') {
      const margin = parseInt(strategy.profitMargin);
      const materialCost = parseInt(strategy.materialCost.split('-')[1]);
      profitPerItem = (materialCost * margin) / 100;
    }

    const totalItems = estimatedYield * timeHours;
    return {
      hoursWorked: timeHours,
      estimatedYield: Math.round(totalItems),
      profitPerItem: Math.round(profitPerItem),
      totalProfit: Math.round(totalItems * profitPerItem),
      hourlyRate: Math.round((totalItems * profitPerItem) / timeHours),
      professionLevel: playerLevel
    };
  }

  /**
   * Get efficiency recommendations
   */
  getEfficiencyTips(profession, playerLevel) {
    const strategy = this.getStrategyForLevel(profession, playerLevel);
    if (!strategy) return [];

    return strategy.tips || [];
  }

  /**
   * Compare professions for profitability
   */
  compareProfessions(timeHours, playerLevel) {
    const professions = ['gathering', 'crafting', 'alchemy'];
    
    return professions.map(prof => {
      const profit = this.calculateOptimalProfit(prof, timeHours, playerLevel);
      return {
        profession: prof,
        ...profit
      };
    }).sort((a, b) => b.hourlyRate - a.hourlyRate);
  }

  /**
   * Get next level recommendation
   */
  getNextLevelGoal(profession, currentLevel) {
    const strategy = this.getStrategyForLevel(profession, currentLevel + 1);
    if (!strategy) {
      return {
        currentLevel,
        recommendation: 'You\'ve reached max progression!',
        nextLevel: currentLevel
      };
    }

    return {
      currentLevel,
      nextLevel: currentLevel + 1,
      recommendation: strategy.recommendation,
      newTools: strategy.toolRecommendation,
      newLocations: strategy.locations,
      expectedYieldImprovement: '25-50%'
    };
  }
}

export default ProfessionEfficiency;
