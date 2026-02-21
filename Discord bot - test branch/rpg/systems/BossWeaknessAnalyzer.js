/**
 * Boss Weakness Analyzer - Track win/loss vs bosses and element effectiveness
 */

class BossWeaknessAnalyzer {
  constructor() {
    // Map<playerId, bossStats>
    this.playerBossData = new Map();
  }

  /**
   * Record boss fight result
   */
  recordBossFight(playerId, bossId, bossName, won, damageDealt, elementUsed, staminaUsed) {
    if (!this.playerBossData.has(playerId)) {
      this.playerBossData.set(playerId, {
        playerId,
        bossFights: [],
        elementalStats: {}
      });
    }

    const bossData = this.playerBossData.get(playerId);

    // Record fight
    bossData.bossFights.push({
      bossId,
      bossName,
      timestamp: Date.now(),
      won,
      damageDealt,
      elementUsed: elementUsed || 'physical',
      staminaUsed,
      difficulty: this.estimateDifficulty(damageDealt, staminaUsed)
    });

    // Track element effectiveness
    if (!bossData.elementalStats[elementUsed]) {
      bossData.elementalStats[elementUsed] = { wins: 0, losses: 0, totalDamage: 0 };
    }

    if (won) {
      bossData.elementalStats[elementUsed].wins++;
    } else {
      bossData.elementalStats[elementUsed].losses++;
    }
    bossData.elementalStats[elementUsed].totalDamage += damageDealt;

    // Keep only last 100 fights
    if (bossData.bossFights.length > 100) {
      bossData.bossFights.shift();
    }
  }

  /**
   * Estimate fight difficulty based on performance
   */
  estimateDifficulty(damageDealt, staminaUsed) {
    if (damageDealt > 5000) return 'trivial';
    if (damageDealt > 2000) return 'easy';
    if (damageDealt > 800) return 'moderate';
    if (damageDealt > 300) return 'challenging';
    return 'brutal';
  }

  /**
   * Get win rate per boss
   */
  getBossStats(playerId) {
    const bossData = this.playerBossData.get(playerId);
    if (!bossData) return null;

    const bossStats = {};

    bossData.bossFights.forEach(fight => {
      if (!bossStats[fight.bossId]) {
        bossStats[fight.bossId] = {
          bossId: fight.bossId,
          bossName: fight.bossName,
          wins: 0,
          losses: 0,
          totalFights: 0,
          avgDamage: 0,
          lastFight: null,
          bestElement: null
        };
      }

      const stat = bossStats[fight.bossId];
      stat.totalFights++;
      stat.avgDamage = (stat.avgDamage * (stat.totalFights - 1) + fight.damageDealt) / stat.totalFights;
      
      if (fight.won) {
        stat.wins++;
      } else {
        stat.losses++;
      }

      stat.lastFight = fight.timestamp;
    });

    // Calculate win rates
    Object.values(bossStats).forEach(stat => {
      stat.winRate = Math.floor((stat.wins / stat.totalFights) * 100);
    });

    return Object.values(bossStats);
  }

  /**
   * Get element effectiveness analysis
   */
  getElementalAnalysis(playerId) {
    const bossData = this.playerBossData.get(playerId);
    if (!bossData) return null;

    const analysis = {};

    Object.entries(bossData.elementalStats).forEach(([element, stats]) => {
      const total = stats.wins + stats.losses;
      analysis[element] = {
        element,
        winRate: total > 0 ? Math.floor((stats.wins / total) * 100) : 0,
        avgDamage: Math.floor(stats.totalDamage / total),
        fightCount: total,
        effectiveness: this.rateEffectiveness((stats.wins / total) * 100)
      };
    });

    // Rank by effectiveness
    const ranked = Object.values(analysis).sort((a, b) => b.winRate - a.winRate);

    return {
      allElements: analysis,
      ranked,
      bestElement: ranked[0],
      worstElement: ranked[ranked.length - 1]
    };
  }

  /**
   * Rate element effectiveness
   */
  rateEffectiveness(winRate) {
    if (winRate > 75) return '🔥 Excellent';
    if (winRate > 60) return '✅ Good';
    if (winRate > 45) return '⚠️ Average';
    if (winRate > 30) return '❌ Poor';
    return '💀 Terrible';
  }

  /**
   * Get recommendations for new boss fights
   */
  getRecommendations(playerId, newBossId, newBossName) {
    const elementAnalysis = this.getElementalAnalysis(playerId);
    if (!elementAnalysis) {
      return { element: 'physical', reason: 'Build up element stats first', score: 0 };
    }

    // Recommend best element
    const recommendation = {
      element: elementAnalysis.bestElement.element,
      reason: `${elementAnalysis.bestElement.effectiveness} (${elementAnalysis.bestElement.winRate}% win rate)`,
      score: elementAnalysis.bestElement.winRate,
      avgDamage: elementAnalysis.bestElement.avgDamage,
      alternatives: elementAnalysis.ranked.slice(1, 3)
    };

    return recommendation;
  }

  /**
   * Get overall boss encounter summary
   */
  getSummary(playerId) {
    const bossStats = this.getBossStats(playerId);
    if (!bossStats || bossStats.length === 0) return null;

    const totalFights = bossStats.reduce((sum, b) => sum + b.totalFights, 0);
    const totalWins = bossStats.reduce((sum, b) => sum + b.wins, 0);
    const totalAvgDamage = Math.floor(
      bossStats.reduce((sum, b) => sum + b.avgDamage, 0) / bossStats.length
    );

    return {
      totalBossesFaced: bossStats.length,
      totalBossFights: totalFights,
      overallWinRate: Math.floor((totalWins / totalFights) * 100),
      averageDamagePerFight: totalAvgDamage,
      hardestBoss: bossStats.reduce((a, b) => a.avgDamage < b.avgDamage ? a : b),
      easiestBoss: bossStats.reduce((a, b) => a.avgDamage > b.avgDamage ? a : b)
    };
  }
}

export default BossWeaknessAnalyzer;
