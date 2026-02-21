/**
 * Session Statistics - Track gameplay metrics and performance analytics
 */

class SessionStatistics {
  constructor() {
    // Map<playerId, sessions>
    this.playerSessions = new Map();
  }

  /**
   * Initialize player sessions
   */
  initializeSessions(playerId) {
    this.playerSessions.set(playerId, {
      playerId,
      activeSessions: [],
      completedSessions: [],
      totalPlayTime: 0,
      statistics: {
        totalDamage: 0,
        totalHealing: 0,
        enemiesDefeated: 0,
        bossesFelled: 0,
        itemsLooted: 0,
        goldEarned: 0
      }
    });
  }

  /**
   * Get player sessions
   */
  getPlayerSessions(playerId) {
    if (!this.playerSessions.has(playerId)) {
      this.initializeSessions(playerId);
    }
    return this.playerSessions.get(playerId);
  }

  /**
   * Start new session
   */
  startSession(playerId, sessionType = 'combat') {
    const sessions = this.getPlayerSessions(playerId);

    const session = {
      id: `${playerId}-${Date.now()}`,
      type: sessionType,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      stats: {
        damageDealt: 0,
        damageTaken: 0,
        enemiesDefeated: 0,
        bossesFelled: 0,
        itemsLooted: 0,
        goldEarned: 0,
        actionsPerformed: 0
      }
    };

    sessions.activeSessions.push(session);

    return session;
  }

  /**
   * Record action during session
   */
  recordAction(playerId, sessionId, actionType, value) {
    const sessions = this.getPlayerSessions(playerId);
    const session = sessions.activeSessions.find(s => s.id === sessionId);

    if (!session) return { success: false, message: 'Session not found' };

    switch (actionType) {
      case 'damage':
        session.stats.damageDealt += value;
        break;
      case 'heal':
        session.stats.damageHealed = (session.stats.damageHealed || 0) + value;
        break;
      case 'takeDamage':
        session.stats.damageTaken += value;
        break;
      case 'enemyDefeated':
        session.stats.enemiesDefeated += 1;
        break;
      case 'bossDefeated':
        session.stats.bossesFelled += 1;
        break;
      case 'loot':
        session.stats.itemsLooted += 1;
        break;
      case 'gold':
        session.stats.goldEarned += value;
        break;
    }

    session.stats.actionsPerformed++;

    return { success: true };
  }

  /**
   * End session
   */
  endSession(playerId, sessionId) {
    const sessions = this.getPlayerSessions(playerId);
    const sessionIndex = sessions.activeSessions.findIndex(s => s.id === sessionId);

    if (sessionIndex < 0) {
      return { success: false, message: 'Session not found' };
    }

    const session = sessions.activeSessions[sessionIndex];
    session.endTime = Date.now();
    session.duration = Math.floor((session.endTime - session.startTime) / 1000); // seconds

    // Move to completed
    sessions.activeSessions.splice(sessionIndex, 1);
    sessions.completedSessions.push(session);

    // Update global statistics
    sessions.totalPlayTime += session.duration;
    Object.keys(session.stats).forEach(key => {
      if (typeof session.stats[key] === 'number' && sessions.statistics[key] !== undefined) {
        sessions.statistics[key] += session.stats[key];
      }
    });

    // Keep only last 100 sessions
    if (sessions.completedSessions.length > 100) {
      sessions.completedSessions.shift();
    }

    return {
      success: true,
      sessionStats: session.stats,
      sessionDuration: this.formatDuration(session.duration)
    };
  }

  /**
   * Format duration
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  /**
   * Get current session stats
   */
  getCurrentSessionStats(playerId) {
    const sessions = this.getPlayerSessions(playerId);

    if (sessions.activeSessions.length === 0) {
      return null;
    }

    const current = sessions.activeSessions[0];
    const elapsed = Math.floor((Date.now() - current.startTime) / 1000);

    return {
      ...current,
      elapsed,
      elapsedFormatted: this.formatDuration(elapsed),
      avgDamagePerSecond: current.stats.damageDealt / Math.max(1, elapsed),
      avgGoldPerMinute: (current.stats.goldEarned / Math.max(1, elapsed)) * 60
    };
  }

  /**
   * Get session summary
   */
  getSessionSummary(playerId, limit = 10) {
    const sessions = this.getPlayerSessions(playerId);

    return sessions.completedSessions
      .slice(-limit)
      .reverse()
      .map(session => ({
        type: session.type,
        duration: this.formatDuration(session.duration),
        damageDealt: session.stats.damageDealt,
        enemiesDefeated: session.stats.enemiesDefeated,
        goldEarned: session.stats.goldEarned,
        dps: Math.floor(session.stats.damageDealt / Math.max(1, session.duration / 60)),
        efficiency: this.calculateEfficiency(session.stats)
      }));
  }

  /**
   * Calculate efficiency score
   */
  calculateEfficiency(stats) {
    const damage = stats.damageDealt || 0;
    const time = 1; // normalized
    const enemies = stats.enemiesDefeated || 1;

    return Math.floor((damage / Math.max(1, enemies)) * 10);
  }

  /**
   * Get overall statistics
   */
  getOverallStatistics(playerId) {
    const sessions = this.getPlayerSessions(playerId);
    const stats = sessions.statistics;

    const totalSessions = sessions.completedSessions.length;
    const avgDamagePerSession = totalSessions > 0 ? Math.floor(stats.totalDamage / totalSessions) : 0;
    const avgGoldPerSession = totalSessions > 0 ? Math.floor(stats.goldEarned / totalSessions) : 0;
    const avgSessionDuration = totalSessions > 0 ? this.formatDuration(sessions.totalPlayTime / totalSessions) : '0s';

    return {
      totalSessions,
      totalPlayTime: this.formatDuration(sessions.totalPlayTime),
      totalPlayTimeSeconds: sessions.totalPlayTime,
      stats,
      averages: {
        damagePerSession: avgDamagePerSession,
        goldPerSession: avgGoldPerSession,
        sessionDuration: avgSessionDuration
      }
    };
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(playerId) {
    const sessions = this.getPlayerSessions(playerId);

    if (sessions.completedSessions.length < 2) {
      return { insufficient_data: true };
    }

    const recent = sessions.completedSessions.slice(-10);
    const older = sessions.completedSessions.slice(-20, -10);

    const recentAvgDamage = recent.reduce((sum, s) => sum + s.stats.damageDealt, 0) / recent.length;
    const olderAvgDamage = older.reduce((sum, s) => sum + s.stats.damageDealt, 0) / older.length;

    const dpsImprovement = ((recentAvgDamage - olderAvgDamage) / olderAvgDamage) * 100;

    return {
      pastPerformance: Math.floor(olderAvgDamage),
      currentPerformance: Math.floor(recentAvgDamage),
      improvement: Math.floor(dpsImprovement),
      trend: dpsImprovement > 5 ? 'Improving' : dpsImprovement < -5 ? 'Declining' : 'Stable'
    };
  }

  /**
   * Get best performing session
   */
  getBestSession(playerId) {
    const sessions = this.getPlayerSessions(playerId);

    if (sessions.completedSessions.length === 0) {
      return null;
    }

    return sessions.completedSessions.reduce((best, current) => {
      const bestScore = (best.stats.damageDealt / best.duration) * best.stats.enemiesDefeated;
      const currentScore = (current.stats.damageDealt / current.duration) * current.stats.enemiesDefeated;
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Clear old sessions
   */
  clearOldSessions(playerId, daysOld = 30) {
    const sessions = this.getPlayerSessions(playerId);
    const oldDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    const beforeLength = sessions.completedSessions.length;
    sessions.completedSessions = sessions.completedSessions.filter(s => s.endTime > oldDate);

    return {
      cleared: beforeLength - sessions.completedSessions.length,
      remaining: sessions.completedSessions.length
    };
  }
}

export default SessionStatistics;
