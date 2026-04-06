function registerKnowledgeRoutes(app, { smartBot, requireAuth, saveState }) {
  app.get('/api/smartbot/knowledge', requireAuth, (req, res) => {
    res.json({ success: true, knowledge: smartBot.knowledge });
  });

  app.post('/api/smartbot/knowledge', requireAuth, (req, res) => {
    const allowed = ['streamSchedule', 'nextStream', 'isLive', 'currentGame',
      'streamTitle', 'viewerCount', 'streamerName', 'socials', 'serverInfo', 'rules',
      'lastStreamPeakViewers', 'lastStreamDate', 'lastStreamDuration', 'lastStreamGame', 'lastStreamAvgViewers'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) smartBot.knowledge[key] = req.body[key];
    }
    saveState();
    res.json({ success: true, knowledge: smartBot.knowledge });
  });

  app.post('/api/smartbot/knowledge/custom', requireAuth, (req, res) => {
    const { key, patterns, answer } = req.body;
    if (!key || !patterns || !answer) return res.status(400).json({ success: false, error: 'key, patterns, and answer required' });
    if (!smartBot.knowledge.customEntries) smartBot.knowledge.customEntries = {};
    smartBot.knowledge.customEntries[key] = { patterns, answer };
    saveState();
    res.json({ success: true, knowledge: smartBot.knowledge });
  });

  app.delete('/api/smartbot/knowledge/custom/:key', requireAuth, (req, res) => {
    if (smartBot.knowledge.customEntries) delete smartBot.knowledge.customEntries[req.params.key];
    saveState();
    res.json({ success: true, knowledge: smartBot.knowledge });
  });

  app.get('/api/smartbot/facts', requireAuth, (req, res) => {
    res.json({ success: true, facts: smartBot.knowledge.facts || {} });
  });

  app.post('/api/smartbot/facts', requireAuth, (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ success: false, error: 'key and value required' });
    if (!smartBot.knowledge.facts) smartBot.knowledge.facts = {};
    smartBot.knowledge.facts[key] = value;
    saveState();
    res.json({ success: true, facts: smartBot.knowledge.facts });
  });

  app.delete('/api/smartbot/facts/:key', requireAuth, (req, res) => {
    if (smartBot.knowledge.facts) delete smartBot.knowledge.facts[req.params.key];
    saveState();
    res.json({ success: true, facts: smartBot.knowledge.facts });
  });
}

export { registerKnowledgeRoutes };