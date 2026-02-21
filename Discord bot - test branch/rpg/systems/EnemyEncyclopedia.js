/**
 * Enemy Encyclopedia - Track enemy encounters and build database
 */

class EnemyEncyclopedia {
  constructor() {
    // Map<playerId, enemyDatabase>
    this.playerEncyclopedias = new Map();
  }

  /**
   * Initialize player encyclopedia
   */
  initializeEncyclopedia(playerId) {
    this.playerEncyclopedias.set(playerId, {
      playerId,
      enemies: {},
      totalEncounters: 0,
      uniqueEnemies: 0,
      trophies: []
    });
  }

  /**
   * Get player encyclopedia
   */
  getEncyclopedia(playerId) {
    if (!this.playerEncyclopedias.has(playerId)) {
      this.initializeEncyclopedia(playerId);
    }
    return this.playerEncyclopedias.get(playerId);
  }

  /**
   * Record enemy encounter
   */
  recordEnemy(playerId, enemyId, enemyName, enemyLevel, enemyHp, hpMin, hpMax, rewards) {
    const encyclopedia = this.getEncyclopedia(playerId);

    if (!encyclopedia.enemies[enemyId]) {
      encyclopedia.enemies[enemyId] = {
        enemyId,
        enemyName,
        minLevel: enemyLevel,
        maxLevel: enemyLevel,
        hpMin,
        hpMax,
        encounters: 0,
        defeats: 0,
        losses: 0,
        lastEncounter: null,
        firstEncounter: null,
        avgReward: rewards,
        dropTable: {},
        weakness: null,
        strength: null
      };
      encyclopedia.uniqueEnemies++;
    }

    const enemy = encyclopedia.enemies[enemyId];
    enemy.encounters++;
    enemy.lastEncounter = Date.now();
    if (!enemy.firstEncounter) {
      enemy.firstEncounter = Date.now();
    }

    enemy.minLevel = Math.min(enemy.minLevel, enemyLevel);
    enemy.maxLevel = Math.max(enemy.maxLevel, enemyLevel);

    encyclopedia.totalEncounters++;

    // Check for trophy (defeated same enemy 10+ times)
    this.checkTrophies(encyclopedia);

    return enemy;
  }

  /**
   * Record enemy defeat
   */
  recordDefeat(playerId, enemyId, damageDealt, damageReceived) {
    const encyclopedia = this.getEncyclopedia(playerId);
    const enemy = encyclopedia.enemies[enemyId];

    if (enemy) {
      enemy.defeats++;
      enemy.defeatRate = Math.floor((enemy.defeats / enemy.encounters) * 100);
    }

    this.checkTrophies(encyclopedia);
  }

  /**
   * Record floor/loot drop
   */
  recordDrop(playerId, enemyId, itemId, itemName) {
    const encyclopedia = this.getEncyclopedia(playerId);
    const enemy = encyclopedia.enemies[enemyId];

    if (enemy) {
      if (!enemy.dropTable[itemId]) {
        enemy.dropTable[itemId] = { name: itemName, count: 0 };
      }
      enemy.dropTable[itemId].count++;
    }
  }

  /**
   * Update enemy weakness/strength
   */
  setEnemyInfo(playerId, enemyId, weakness, strength) {
    const encyclopedia = this.getEncyclopedia(playerId);
    const enemy = encyclopedia.enemies[enemyId];

    if (enemy) {
      enemy.weakness = weakness;
      enemy.strength = strength;
    }
  }

  /**
   * Get enemy details
   */
  getEnemyDetails(playerId, enemyId) {
    const encyclopedia = this.getEncyclopedia(playerId);
    const enemy = encyclopedia.enemies[enemyId];

    if (!enemy) return null;

    const dropRate = Object.entries(enemy.dropTable).map(([itemId, data]) => ({
      itemId,
      itemName: data.name,
      count: data.count,
      percentage: Math.floor((data.count / enemy.encounters) * 100)
    })).sort((a, b) => b.count - a.count);

    return {
      ...enemy,
      defeatRate: enemy.defeatRate || 0,
      rarity: this.getRarityRating(enemy.encounters),
      difficulty: this.getDifficultyRating(enemy.maxLevel),
      dropTable: dropRate,
      hasWeakness: !!enemy.weakness,
      hasStrength: !!enemy.strength,
      timeSinceLastEncounter: this.getTimeAgo(enemy.lastEncounter),
      firstEncounterAgo: this.getTimeAgo(enemy.firstEncounter)
    };
  }

  /**
   * Get rarity classification
   */
  getRarityRating(encounters) {
    if (encounters >= 100) return 'Common';
    if (encounters >= 50) return 'Uncommon';
    if (encounters >= 20) return 'Rare';
    if (encounters >= 5) return 'Epic';
    return 'Legendary';
  }

  /**
   * Get difficulty rating
   */
  getDifficultyRating(maxLevel) {
    if (maxLevel >= 50) return '⚔️⚔️⚔️⚔️⚔️ Extremely Dangerous';
    if (maxLevel >= 40) return '⚔️⚔️⚔️⚔️ Very Dangerous';
    if (maxLevel >= 30) return '⚔️⚔️⚔️ Dangerous';
    if (maxLevel >= 20) return '⚔️⚔️ Moderate';
    if (maxLevel >= 10) return '⚔️ Easy';
    return '✓ Trivial';
  }

  /**
   * Get time ago string
   */
  getTimeAgo(timestamp) {
    const ms = Date.now() - timestamp;
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
  }

  /**
   * Check and award trophies
   */
  checkTrophies(encyclopedia) {
    const enemyDefeats = Object.values(encyclopedia.enemies)
      .filter(e => e.defeats > 0)
      .sort((a, b) => b.defeats - a.defeats);

    encyclopedia.trophies = [];

    enemyDefeats.forEach(enemy => {
      if (enemy.defeats >= 100) {
        encyclopedia.trophies.push({
          enemyId: enemy.enemyId,
          enemyName: enemy.enemyName,
          trophy: '🏆 Slayer of 100',
          defeats: enemy.defeats,
          reward: 500
        });
      } else if (enemy.defeats >= 50) {
        encyclopedia.trophies.push({
          enemyId: enemy.enemyId,
          enemyName: enemy.enemyName,
          trophy: '🥇 Slayer of 50',
          defeats: enemy.defeats,
          reward: 250
        });
      } else if (enemy.defeats >= 25) {
        encyclopedia.trophies.push({
          enemyId: enemy.enemyId,
          enemyName: enemy.enemyName,
          trophy: '🥈 Slayer of 25',
          defeats: enemy.defeats,
          reward: 100
        });
      } else if (enemy.defeats >= 10) {
        encyclopedia.trophies.push({
          enemyId: enemy.enemyId,
          enemyName: enemy.enemyName,
          trophy: '🥉 Slayer of 10',
          defeats: enemy.defeats,
          reward: 50
        });
      }
    });
  }

  /**
   * Get all trophies
   */
  getTrophies(playerId) {
    const encyclopedia = this.getEncyclopedia(playerId);
    return encyclopedia.trophies;
  }

  /**
   * Get encyclopedia summary
   */
  getSummary(playerId) {
    const encyclopedia = this.getEncyclopedia(playerId);
    const enemies = Object.values(encyclopedia.enemies);

    const totalDefeats = enemies.reduce((sum, e) => sum + e.defeats, 0);
    const totalLosses = enemies.reduce((sum, e) => sum + e.losses, 0);
    const overallWinRate = Math.floor((totalDefeats / (totalDefeats + totalLosses)) * 100) || 0;

    const mostEncountered = enemies.reduce((a, b) => a.encounters > b.encounters ? a : b);
    const mostDefeated = enemies.reduce((a, b) => a.defeats > b.defeats ? a : b);
    const highestLevel = enemies.reduce((a, b) => a.maxLevel > b.maxLevel ? a : b);

    return {
      totalEncounters: encyclopedia.totalEncounters,
      uniqueEnemies: encyclopedia.uniqueEnemies,
      totalDefeats,
      totalLosses,
      overallWinRate,
      totalTrophies: encyclopedia.trophies.length,
      mostEncountered: mostEncountered?.enemyName || 'N/A',
      mostDefeated: mostDefeated?.enemyName || 'N/A',
      strongestEncountered: highestLevel?.enemyName || 'N/A'
    };
  }

  /**
   * Get full enemy list (sorted by encounters)
   */
  getAllEnemies(playerId, limit = 20) {
    const encyclopedia = this.getEncyclopedia(playerId);
    const enemies = Object.values(encyclopedia.enemies);

    return enemies
      .sort((a, b) => b.encounters - a.encounters)
      .slice(0, limit);
  }
}

export default EnemyEncyclopedia;
