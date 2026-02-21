/**
 * QOL System - Tracks combat history, boss defeats, achievements, and player statistics
 * for enhanced UI visibility and progression tracking
 */

class QOLSystem {
  constructor() {
    // Combat logs: Map<playerId, Array<action>>
    this.combatLogs = new Map();
    
    // Boss defeats: Map<playerId, Array<bossDefeated>>
    this.bossDefeats = new Map();
    
    // Player stats history: Map<playerId, Array<weeklyStats>>
    this.statsHistory = new Map();
    
    // Recent actions: Map<playerId, Array<action>>
    this.recentActions = new Map();
    
    // Achievement progress: Map<playerId, Object<achievementId, progress>>
    this.achievementProgress = new Map();
    
    // Max entries to keep
    this.MAX_LOG_ENTRIES = 5;
    this.MAX_RECENT_ACTIONS = 5;
    this.MAX_STATS_WEEKS = 52; // One year of data
  }

  /**
   * Add combat action to log
   */
  addCombatAction(playerId, action) {
    if (!this.combatLogs.has(playerId)) {
      this.combatLogs.set(playerId, []);
    }
    
    const logs = this.combatLogs.get(playerId);
    logs.unshift({
      timestamp: Date.now(),
      action: action.action, // e.g., 'skill', 'ability', 'item'
      source: action.source, // 'player' or enemy name
      target: action.target,
      description: action.description, // "Used Fireball for 125 damage"
      damage: action.damage || 0,
      healing: action.healing || 0,
      effect: action.effect || null, // e.g., { type: 'burn', duration: 2 }
      environmentalEffect: action.environmentalEffect || null // e.g., "Volcanic Lava - 20 damage"
    });
    
    // Keep only last N entries
    if (logs.length > this.MAX_LOG_ENTRIES) {
      logs.pop();
    }

    // Also add to recent actions globally
    this.addRecentAction(playerId, action.description);
  }

  /**
   * Get last N combat actions
   */
  getCombatLog(playerId, count = 5) {
    return (this.combatLogs.get(playerId) || []).slice(0, count);
  }

  /**
   * Clear combat log when starting new combat
   */
  clearCombatLog(playerId) {
    this.combatLogs.delete(playerId);
  }

  /**
   * Record boss defeat
   */
  recordBossDefeat(playerId, boss) {
    if (!this.bossDefeats.has(playerId)) {
      this.bossDefeats.set(playerId, []);
    }

    const defeats = this.bossDefeats.get(playerId);
    const existingBoss = defeats.find(b => b.bossName === boss.bossName);

    if (existingBoss) {
      existingBoss.defeatedCount++;
      existingBoss.lastDefeated = Date.now();
      existingBoss.totalAttempts++;
    } else {
      defeats.push({
        bossName: boss.bossName,
        bossTemplate: boss.bossTemplate, // e.g., 'inferno_lord'
        defeatedCount: 1,
        totalAttempts: 1,
        firstDefeated: Date.now(),
        lastDefeated: Date.now(),
        difficulty: boss.difficulty || 'normal',
        loot: [boss.reward || {}]
      });
    }
  }

  /**
   * Get boss defeat statistics
   */
  getBossDefeats(playerId) {
    return this.bossDefeats.get(playerId) || [];
  }

  /**
   * Get boss win/loss ratio
   */
  getBossStats(playerId, bossName) {
    const defeats = this.bossDefeats.get(playerId) || [];
    return defeats.find(b => b.bossName === bossName);
  }

  /**
   * Add action to recent actions list
   */
  addRecentAction(playerId, actionDescription) {
    if (!this.recentActions.has(playerId)) {
      this.recentActions.set(playerId, []);
    }

    const actions = this.recentActions.get(playerId);
    actions.unshift({
      timestamp: Date.now(),
      description: actionDescription
    });

    if (actions.length > this.MAX_RECENT_ACTIONS) {
      actions.pop();
    }
  }

  /**
   * Get recent actions
   */
  getRecentActions(playerId, count = 5) {
    return (this.recentActions.get(playerId) || []).slice(0, count);
  }

  /**
   * Update achievement progress
   */
  updateAchievementProgress(playerId, achievementId, progress, maxValue) {
    if (!this.achievementProgress.has(playerId)) {
      this.achievementProgress.set(playerId, {});
    }

    const playerAchieves = this.achievementProgress.get(playerId);
    if (!playerAchieves[achievementId]) {
      playerAchieves[achievementId] = {
        current: 0,
        max: maxValue,
        percentage: 0
      };
    }

    playerAchieves[achievementId].current = progress;
    playerAchieves[achievementId].max = maxValue;
    playerAchieves[achievementId].percentage = Math.round((progress / maxValue) * 100);
  }

  /**
   * Get achievement progress
   */
  getAchievementProgress(playerId, achievementId) {
    const progress = (this.achievementProgress.get(playerId) || {})[achievementId];
    return progress || { current: 0, max: 0, percentage: 0 };
  }

  /**
   * Record weekly stats snapshot for timeline tracking
   */
  recordWeeklyStats(playerId, playerData) {
    if (!this.statsHistory.has(playerId)) {
      this.statsHistory.set(playerId, []);
    }

    const history = this.statsHistory.get(playerId);
    history.push({
      timestamp: Date.now(),
      week: Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)),
      level: playerData.level,
      experience: playerData.experience,
      strength: playerData.strength || 0,
      intelligence: playerData.intelligence || 0,
      agility: playerData.dexterity || 0,
      constitution: playerData.constitution || 0,
      totalDamage: playerData.totalDamageDealt || 0,
      totalHealing: playerData.totalHealing || 0,
      bossesFelled: playerData.bossesFelled || 0
    });

    if (history.length > this.MAX_STATS_WEEKS) {
      history.shift();
    }
  }

  /**
   * Get stats historical data
   */
  getStatsHistory(playerId) {
    return this.statsHistory.get(playerId) || [];
  }

  /**
   * Calculate stat growth over last N weeks
   */
  getStatGrowth(playerId, weeks = 4) {
    const history = this.getStatsHistory(playerId);
    if (history.length < 2) return null;

    const current = history[history.length - 1];
    const baseline = history[Math.max(0, history.length - weeks)];

    return {
      strengthGrowth: current.strength - baseline.strength,
      intelligenceGrowth: current.intelligence - baseline.intelligence,
      agilityGrowth: current.agility - baseline.agility,
      constitutionGrowth: current.constitution - baseline.constitution,
      levelGrowth: current.level - baseline.level,
      weeksTracked: history.length
    };
  }

  /**
   * Calculate achievement progress percentage
   */
  calculateAchievementPercentage(playerId) {
    const achievements = this.achievementProgress.get(playerId) || {};
    const values = Object.values(achievements);
    
    if (values.length === 0) return 0;
    
    const totalPercent = values.reduce((sum, ach) => sum + ach.percentage, 0);
    return Math.round(totalPercent / values.length);
  }

  /**
   * Get combat effectiveness score (1-100)
   * Based on: stat alignment with style, equipment synergy, recent performance
   */
  calculateCombatEffectiveness(player, combatStyle, equipment) {
    let score = 50; // baseline

    // Check stat alignment with style
    if (combatStyle.statMods) {
      const statMods = combatStyle.statMods;
      if (statMods.damageDealt > 0) score += 10;
      if (statMods.accuracy > 0) score += 5;
      if (statMods.crit > 0) score += 5;
      if (statMods.damageTaken < 0) score += 10;
    }

    // Check equipment quality
    if (equipment && equipment.length > 0) {
      const hasLegendary = equipment.some(e => e.rarity === 'legendary');
      const hasEpic = equipment.some(e => e.rarity === 'epic');
      
      if (hasLegendary) score += 15;
      else if (hasEpic) score += 10;
      else score += 5;
    }

    // Cap at 100
    return Math.min(100, score);
  }

  /**
   * Get milestones approaching (for notifications)
   */
  getMilestonesApproaching(player) {
    const milestones = [];

    // Level milestone (every 5 levels)
    const nextLevelMilestone = Math.ceil(player.level / 5) * 5;
    if (nextLevelMilestone > player.level && nextLevelMilestone - player.level <= 2) {
      milestones.push({
        type: 'level',
        target: nextLevelMilestone,
        progress: player.level,
        description: `Approaching level ${nextLevelMilestone}`
      });
    }

    // Experience milestone (every 1000 XP)
    const nextXpMilestone = Math.ceil(player.experience / 1000) * 1000;
    if (nextXpMilestone > player.experience && nextXpMilestone - player.experience <= 100) {
      milestones.push({
        type: 'experience',
        target: nextXpMilestone,
        progress: player.experience,
        description: `${nextXpMilestone - player.experience} XP until ${nextXpMilestone} milestone`
      });
    }

    return milestones;
  }

  /**
   * Clear all data for a player
   */
  clearPlayerData(playerId) {
    this.combatLogs.delete(playerId);
    this.bossDefeats.delete(playerId);
    this.statsHistory.delete(playerId);
    this.recentActions.delete(playerId);
    this.achievementProgress.delete(playerId);
  }
}

export default QOLSystem;
