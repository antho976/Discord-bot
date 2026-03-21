export default function setup(app, deps, F, shared) {
  const { client, leveling, warnings, requireAuth, requireTier } = deps;

  if (!F.serverHealth) F.serverHealth = { lastScore: 0, lastCalculated: 0, history: [] };

  function calculateServerHealth() {
    const guild = client.guilds.cache.first();
    if (!guild) return 0;
    let score = 50;
    const totalActivity = Object.values(F.channelActivity || {}).reduce((sum, ca) => sum + (ca.messages || 0), 0);
    if (totalActivity > 100) score += 10;
    else if (totalActivity > 50) score += 5;
    const retention = shared.calculateRetentionStats ? shared.calculateRetentionStats() : {};
    if (retention['7d']?.rate > 80) score += 10;
    else if (retention['7d']?.rate > 50) score += 5;
    const recentWarnings = Object.values(warnings || {}).reduce((sum, w) => sum + (Array.isArray(w) ? w.filter(ww => Date.now() - (ww.timestamp || 0) < 604800000).length : 0), 0);
    if (recentWarnings === 0) score += 10;
    else if (recentWarnings < 5) score += 5;
    else score -= 5;
    if (guild.memberCount > 100) score += 5;
    if (guild.memberCount > 500) score += 5;
    const activeLevelers = Object.values(leveling).filter(l => Date.now() - (l.lastMsg || 0) < 604800000).length;
    if (activeLevelers > 10) score += 5;
    if (activeLevelers > 50) score += 5;
    score = Math.max(0, Math.min(100, score));
    F.serverHealth.lastScore = score;
    F.serverHealth.lastCalculated = Date.now();
    F.serverHealth.history.push({ score, ts: Date.now() });
    if (F.serverHealth.history.length > 90) F.serverHealth.history = F.serverHealth.history.slice(-90);
    return score;
  }

  app.get('/api/features/server-health', requireAuth, requireTier('moderator'), (req, res) => {
    if (!F.serverHealth.lastScore || Date.now() - F.serverHealth.lastCalculated > 3600000) calculateServerHealth();
    res.json({ success: true, score: F.serverHealth.lastScore, history: F.serverHealth.history });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: calculateServerHealth, intervalMs: 3600000 }],
    masterData: () => ({ serverHealth: { score: F.serverHealth.lastScore } })
  };
}
