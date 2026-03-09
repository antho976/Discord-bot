export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.levelingStreaks) F.levelingStreaks = {};
  if (!F.streakConfig) F.streakConfig = { enabled: false, bonusPerDay: 5, maxStreak: 30 };

  function checkLevelingStreak(userId) {
    if (!F.streakConfig.enabled) return 0;
    const now = Date.now();
    const dayMs = 86400000;
    const streak = F.levelingStreaks[userId] || { lastActive: 0, streak: 0 };
    const daysSinceLast = Math.floor((now - streak.lastActive) / dayMs);
    if (daysSinceLast === 0) return streak.streak;
    if (daysSinceLast === 1) {
      streak.streak = Math.min(streak.streak + 1, F.streakConfig.maxStreak);
    } else {
      streak.streak = 1;
    }
    streak.lastActive = now;
    F.levelingStreaks[userId] = streak;
    return streak.streak;
  }

  function getStreakBonus(userId) {
    if (!F.streakConfig.enabled) return 0;
    const streak = F.levelingStreaks[userId]?.streak || 0;
    return streak * (F.streakConfig.bonusPerDay || 5);
  }

  app.get('/api/features/streaks', requireAuth, (req, res) => {
    res.json({ success: true, config: F.streakConfig, streaks: F.levelingStreaks });
  });
  app.post('/api/features/streaks', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, bonusPerDay, maxStreak } = req.body;
    if (typeof enabled === 'boolean') F.streakConfig.enabled = enabled;
    if (bonusPerDay != null) F.streakConfig.bonusPerDay = Math.max(1, Math.min(50, parseInt(bonusPerDay) || 5));
    if (maxStreak != null) F.streakConfig.maxStreak = Math.max(1, Math.min(365, parseInt(maxStreak) || 30));
    saveState();
    dashAudit(req.userName, 'update-streaks', `Streaks: enabled=${F.streakConfig.enabled}`);
    res.json({ success: true, config: F.streakConfig });
  });

  return {
    hooks: { checkLevelingStreak, getStreakBonus },
    backgroundTasks: [],
    masterData: () => ({ levelingStreaks: { enabled: F.streakConfig.enabled, config: F.streakConfig } })
  };
}
