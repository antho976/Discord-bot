import { generateReply } from '../generate-reply.js';

function registerConfigRoutes(app, { smartBot, requireAuth, saveState }) {
  app.get('/api/smartbot/config', requireAuth, (req, res) => {
    res.json({ success: true, config: smartBot.config });
  });

  app.post('/api/smartbot/config', requireAuth, (req, res) => {
    const allowed = ['enabled', 'replyChance', 'cooldownMs', 'minMessagesBetween',
      'markovChance', 'maxResponseLength', 'personality', 'mentionAlwaysReply',
      'nameAlwaysReply', 'allowedChannels', 'ignoredChannels',
      'newsChannelId', 'newsInterval', 'newsTopics',
      'rssFeeds', 'newsBlockedKeywords', 'newsNsfwFilter', 'aiMode'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.replyChance !== undefined) updates.replyChance = Math.max(0, Math.min(1, Number(updates.replyChance) || 0));
    if (updates.cooldownMs !== undefined) updates.cooldownMs = Math.max(1000, Math.min(300000, Math.round(Number(updates.cooldownMs) || 30000)));
    if (updates.minMessagesBetween !== undefined) updates.minMessagesBetween = Math.max(0, Math.min(50, Math.round(Number(updates.minMessagesBetween) || 4)));
    if (updates.markovChance !== undefined) updates.markovChance = Math.max(0, Math.min(1, Number(updates.markovChance) || 0));
    if (updates.maxResponseLength !== undefined) updates.maxResponseLength = Math.max(20, Math.min(500, Math.round(Number(updates.maxResponseLength) || 200)));
    if (updates.aiMode !== undefined && !['off', 'direct', 'smart', 'always'].includes(updates.aiMode)) updates.aiMode = 'direct';
    if (updates.newsInterval !== undefined) updates.newsInterval = Math.max(1, Math.min(24, Math.round(Number(updates.newsInterval) || 4)));

    Object.assign(smartBot.config, updates);
    saveState();
    res.json({ success: true, config: smartBot.config });
  });

  app.post('/api/smartbot/test', requireAuth, async (req, res) => {
    const msg = String(req.body.message || '').trim();
    if (!msg) return res.status(400).json({ success: false, error: 'message required' });
    try {
      // (moved to top-level import)
      const fakeMsg = {
        content: msg, author: { id: 'dashboard-test', username: 'DashboardTest', bot: false },
        member: { displayName: 'DashboardTest' },
        channel: { id: 'test-channel', name: 'dashboard-test', send: async () => {} },
        guild: { id: 'test', name: 'Test', members: { fetch: async () => null } },
        mentions: { has: () => false }, reply: async (txt) => txt, react: async () => {}
      };
      const reply = await generateReply(smartBot, fakeMsg, 'mention', { isDirect: true });
      const text = typeof reply === 'string' ? reply : (reply?.content || reply?.text || JSON.stringify(reply) || '(no reply)');
      res.json({ success: true, reply: text });
    } catch (e) { res.json({ success: true, reply: '(error: ' + e.message + ')' }); }
  });
}

export { registerConfigRoutes };