/**
 * Damage Tracker - Track weekly damage trends and guild comparisons
 */

class DamageTracker {
  constructor() {
    // Map<playerId, damageHistory>
    this.playerDamage = new Map();
  }

  /**
   * Record damage dealt in a session
   */
  recordDamage(playerId, damageAmount) {
    if (!this.playerDamage.has(playerId)) {
      this.playerDamage.set(playerId, {
        playerId,
        sessions: [],
        weeklyTotal: 0,
        weekStartDate: new Date().toISOString()
      });
    }

    const dmgRecord = this.playerDamage.get(playerId);
    const now = new Date();

    // Check if we need to reset weekly total (every Sunday)
    const weekStart = new Date(dmgRecord.weekStartDate);
    const daysDiff = Math.floor((now - weekStart) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 7) {
      dmgRecord.weeklyTotal = 0;
      dmgRecord.weekStartDate = now.toISOString();
    }

    dmgRecord.sessions.push({
      timestamp: now.toISOString(),
      damage: damageAmount,
      day: now.toLocaleDateString()
    });

    dmgRecord.weeklyTotal += damageAmount;

    // Keep only last 52 sessions (2 weeks)
    if (dmgRecord.sessions.length > 52) {
      dmgRecord.sessions.shift();
    }
  }

  /**
   * Get weekly breakdown by day
   */
  getWeeklyBreakdown(playerId) {
    const dmgRecord = this.playerDamage.get(playerId);
    if (!dmgRecord) return null;

    const now = new Date();
    const weekStart = new Date(dmgRecord.weekStartDate);
    const daysDiff = Math.floor((now - weekStart) / (1000 * 60 * 60 * 24));

    // Group by day
    const dailyDamage = {};
    dmgRecord.sessions.forEach(session => {
      const day = session.day;
      if (!dailyDamage[day]) dailyDamage[day] = 0;
      dailyDamage[day] += session.damage;
    });

    const avgDaily = dmgRecord.weeklyTotal / (daysDiff + 1);
    const trend = this.calculateTrend(dmgRecord.sessions);

    return {
      weeklyTotal: dmgRecord.weeklyTotal,
      dailyAverage: Math.floor(avgDaily),
      daysActive: Object.keys(dailyDamage).length,
      dailyBreakdown: dailyDamage,
      trend,
      peakDay: Object.keys(dailyDamage).reduce((a, b) => 
        dailyDamage[a] > dailyDamage[b] ? a : b
      )
    };
  }

  /**
   * Calculate trend (improving, stagnant, declining)
   */
  calculateTrend(sessions) {
    if (sessions.length < 2) return 'new';

    const half = Math.floor(sessions.length / 2);
    const firstHalf = sessions.slice(0, half).reduce((sum, s) => sum + s.damage, 0) / half;
    const secondHalf = sessions.slice(half).reduce((sum, s) => sum + s.damage, 0) / (sessions.length - half);

    const percentChange = ((secondHalf - firstHalf) / firstHalf) * 100;

    if (percentChange > 20) return 'improving';
    if (percentChange > -20) return 'stable';
    return 'declining';
  }

  /**
   * Get comparison with guild average
   */
  getGuildComparison(playerId, guildPlayerDamages) {
    const playerDmg = this.getWeeklyBreakdown(playerId);
    if (!playerDmg) return null;

    const guildDamages = guildPlayerDamages.map(dmg => dmg.weeklyTotal);
    const guildAvg = guildDamages.reduce((a, b) => a + b, 0) / guildDamages.length;
    const guildMax = Math.max(...guildDamages);

    const percentAboveAvg = ((playerDmg.weeklyTotal - guildAvg) / guildAvg) * 100;

    return {
      playerDamage: playerDmg.weeklyTotal,
      guildAverage: Math.floor(guildAvg),
      guildMax,
      percentAboveAvg: Math.floor(percentAboveAvg),
      rank: guildDamages.filter(d => d > playerDmg.weeklyTotal).length + 1,
      totalGuildMembers: guildDamages.length
    };
  }

  /**
   * Get multi-week history for graphing
   */
  getHistoryChart(playerId) {
    const dmgRecord = this.playerDamage.get(playerId);
    if (!dmgRecord || dmgRecord.sessions.length === 0) return null;

    const dailyData = {};
    dmgRecord.sessions.forEach(session => {
      const day = session.day;
      if (!dailyData[day]) dailyData[day] = 0;
      dailyData[day] += session.damage;
    });

    // Create bar chart ASCII
    const maxDamage = Math.max(...Object.values(dailyData));
    const barWidth = 20;

    const chart = Object.entries(dailyData).map(([day, dmg]) => {
      const barLength = Math.floor((dmg / maxDamage) * barWidth);
      const bar = '█'.repeat(barLength) + '░'.repeat(barWidth - barLength);
      return `${day}: [${bar}] ${dmg}`;
    }).join('\n');

    return {
      chart,
      maxDay: Object.keys(dailyData)[0],
      minDay: Object.keys(dailyData)[Object.keys(dailyData).length - 1],
      totalDays: Object.keys(dailyData).length
    };
  }
}

export default DamageTracker;
