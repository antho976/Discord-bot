function registerStatsRoutes(app, { smartBot, requireAuth }) {
  app.get('/api/smartbot/stats', requireAuth, (req, res) => {
    res.json({ success: true, stats: smartBot.stats });
  });

  app.get('/api/smartbot/top-users', requireAuth, (req, res) => {
    const users = [];
    for (const [id, data] of smartBot.userPreferences) {
      users.push({ id, count: data.messageCount || 0 });
    }
    users.sort((a, b) => b.count - a.count);
    res.json({ success: true, users: users.slice(0, 20) });
  });

  app.get('/api/smartbot/reply-history', requireAuth, (req, res) => {
    const dailyReplies = smartBot.stats.dailyReplies || {};
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: dailyReplies[key] || 0 });
    }
    res.json({ success: true, history: days });
  });

  app.get('/api/smartbot/learning-log', requireAuth, (req, res) => {
    const entries = smartBot.learningLog.getRecent(50);
    res.json({ success: true, entries });
  });

  app.get('/api/smartbot/learned', requireAuth, (req, res) => {
    const subjects = [];
    for (const [name, data] of smartBot.learnedKnowledge.subjects) {
      subjects.push({
        name, mentions: data.mentions,
        positive: (data.sentiments || {}).positive || 0,
        negative: (data.sentiments || {}).negative || 0,
        neutral: (data.sentiments || {}).neutral || 0,
        lastSeen: data.lastSeen, users: data.users || 0
      });
    }
    subjects.sort((a, b) => b.mentions - a.mentions);
    res.json({ success: true, subjects: subjects.slice(0, 100) });
  });

  app.get('/api/smartbot/slang', requireAuth, (req, res) => {
    const expressions = smartBot.slangTracker.getPopular();
    res.json({ success: true, expressions });
  });

  app.get('/api/smartbot/feedback', requireAuth, (req, res) => {
    const templates = [];
    for (const [key, data] of smartBot.feedback.templateScores) {
      templates.push({ key, ...data });
    }
    templates.sort((a, b) => b.uses - a.uses);
    res.json({ success: true, templates: templates.slice(0, 50) });
  });

  app.get('/api/smartbot/embedder/stats', requireAuth, (req, res) => {
    const e = smartBot.embedder;
    res.json({
      success: true,
      enabled: e?.enabled || false,
      ready: e?.isReady() || false,
      pairsCached: e?._pairEmbeddings?.size || 0,
      apiCalls: e?._apiCalls || 0,
      cacheHits: e?._cacheHits || 0,
      contextChannels: e?._channelContexts?.size || 0,
    });
  });
}

export { registerStatsRoutes };