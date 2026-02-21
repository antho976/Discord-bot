/**
 * Guild Analytics System - Leaderboards, suggestions, and member tracking
 */

class GuildAnalytics {
  constructor() {
    // Map<guildId, memberStats>
    this.guildStats = new Map();
  }

  /**
   * Update member stats in guild
   */
  recordMemberStats(guildId, memberId, stats) {
    if (!this.guildStats.has(guildId)) {
      this.guildStats.set(guildId, []);
    }

    const members = this.guildStats.get(guildId);
    const memberIndex = members.findIndex(m => m.memberId === memberId);

    const statsEntry = {
      memberId,
      timestamp: Date.now(),
      level: stats.level,
      totalDamage: stats.totalDamage || 0,
      bossesFelled: stats.bossesFelled || 0,
      dungeonsClear: stats.dungeonsClear || 0,
      damageDealt: stats.totalDamageDealt || 0,
      joinedAt: stats.joinedAt || Date.now()
    };

    if (memberIndex >= 0) {
      members[memberIndex] = statsEntry;
    } else {
      members.push(statsEntry);
    }
  }

  /**
   * Get guild leaderboard - Members ranked by stats
   */
  getLeaderboard(guildId, sortBy = 'level') {
    const members = this.guildStats.get(guildId) || [];
    
    const sortFunctions = {
      level: (a, b) => b.level - a.level,
      damage: (a, b) => b.totalDamage - a.totalDamage,
      bosses: (a, b) => b.bossesFelled - a.bossesFelled,
      dungeons: (a, b) => b.dungeonsClear - a.dungeonsClear,
      overall: (a, b) => {
        const scoreA = (a.level * 10) + (a.totalDamage / 100) + (a.bossesFelled * 50);
        const scoreB = (b.level * 10) + (b.totalDamage / 100) + (b.bossesFelled * 50);
        return scoreB - scoreA;
      }
    };

    return members.sort(sortFunctions[sortBy] || sortFunctions.overall).slice(0, 10);
  }

  /**
   * Suggest group content for member
   */
  suggestGroupContent(memberStats) {
    const suggestions = [];

    // Level-based suggestions
    if (memberStats.level < 20) {
      suggestions.push({
        type: 'dungeon',
        name: 'Beginner\'s Crypt',
        reason: 'Perfect for your level',
        reward: '50-100 gold'
      });
    } else if (memberStats.level < 40) {
      suggestions.push({
        type: 'raid',
        name: 'Shadow Keep Raid',
        reason: 'Mid-level challenge',
        reward: '500-1000 gold'
      });
    } else {
      suggestions.push({
        type: 'world_boss',
        name: 'Celestial Guardian',
        reason: 'End-game content',
        reward: 'Legendary gear'
      });
    }

    // Suggest based on performance
    if (memberStats.bossesFelled > memberStats.dungeonsClear) {
      suggestions.push({
        type: 'dungeon',
        name: 'Tower Defense',
        reason: 'Good for your playstyle',
        reward: 'Equipment'
      });
    }

    return suggestions;
  }

  /**
   * Track member growth over time for guild chart
   */
  trackMemberGrowth(guildId, memberId) {
    const members = this.guildStats.get(guildId) || [];
    const memberHistory = members.filter(m => m.memberId === memberId);

    if (memberHistory.length < 2) {
      return null;
    }

    const latest = memberHistory[memberHistory.length - 1];
    const earliest = memberHistory[0];

    return {
      memberId,
      levelGrowth: latest.level - earliest.level,
      damageGrowth: latest.totalDamage - earliest.totalDamage,
      bossesFelled: latest.bossesFelled - earliest.bossesFelled,
      startDate: new Date(earliest.timestamp),
      currentDate: new Date(latest.timestamp),
      daysActive: Math.floor((latest.timestamp - earliest.timestamp) / (1000 * 60 * 60 * 24)),
      growthRate: {
        levelPerDay: ((latest.level - earliest.level) / Math.max(1, Math.floor((latest.timestamp - earliest.timestamp) / (1000 * 60 * 60 * 24)))).toFixed(2),
        damagePerDay: ((latest.totalDamage - earliest.totalDamage) / Math.max(1, Math.floor((latest.timestamp - earliest.timestamp) / (1000 * 60 * 60 * 24)))).toFixed(0)
      }
    };
  }

  /**
   * Get guild average stats
   */
  getGuildAverageStats(guildId) {
    const members = this.guildStats.get(guildId) || [];
    
    if (members.length === 0) {
      return null;
    }

    const avgLevel = Math.round(members.reduce((sum, m) => sum + m.level, 0) / members.length);
    const avgDamage = Math.round(members.reduce((sum, m) => sum + m.totalDamage, 0) / members.length);
    const totalBosses = members.reduce((sum, m) => sum + m.bossesFelled, 0);

    return {
      memberCount: members.length,
      averageLevel: avgLevel,
      averageDamage: avgDamage,
      totalBossesFelled: totalBosses,
      guildStrength: avgLevel + (totalBosses / members.length)
    };
  }

  /**
   * Clear guild data
   */
  clearGuildData(guildId) {
    this.guildStats.delete(guildId);
  }
}

export default GuildAnalytics;
