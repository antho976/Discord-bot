export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.autoResponder) F.autoResponder = { enabled: false, rules: [] };

  function checkAutoResponder(message) {
    if (!F.autoResponder.enabled || !F.autoResponder.rules.length) return null;
    if (message.author.bot) return null;
    const now = Date.now();
    for (const rule of F.autoResponder.rules) {
      if (rule.channels?.length && !rule.channels.includes(message.channel.id)) continue;
      const cooldown = (rule.cooldownSec || 30) * 1000;
      if (now - (rule.lastUsed || 0) < cooldown) continue;
      let matched = false;
      if (rule.isRegex) {
        try { matched = new RegExp(rule.pattern, 'i').test(message.content); } catch {}
      } else {
        matched = message.content.toLowerCase().includes(rule.pattern.toLowerCase());
      }
      if (matched) {
        rule.lastUsed = now;
        return rule.response;
      }
    }
    return null;
  }

  app.get('/api/features/auto-responder', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.autoResponder });
  });
  app.post('/api/features/auto-responder', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, rules } = req.body;
    if (typeof enabled === 'boolean') F.autoResponder.enabled = enabled;
    if (Array.isArray(rules)) {
      F.autoResponder.rules = rules.slice(0, 50).map((r, i) => ({
        id: r.id || `rule-${i}`,
        pattern: String(r.pattern || '').slice(0, 200),
        isRegex: !!r.isRegex,
        response: String(r.response || '').slice(0, 2000),
        channels: Array.isArray(r.channels) ? r.channels.filter(c => typeof c === 'string') : [],
        cooldownSec: Math.max(5, Math.min(3600, parseInt(r.cooldownSec) || 30)),
        lastUsed: 0
      }));
    }
    saveState();
    dashAudit(req.userName, 'update-auto-responder', `Auto-responder: ${F.autoResponder.rules.length} rules, enabled=${F.autoResponder.enabled}`);
    res.json({ success: true, config: F.autoResponder });
  });

  return {
    hooks: { checkAutoResponder },
    backgroundTasks: [],
    masterData: () => ({ autoResponder: { enabled: F.autoResponder.enabled, rules: F.autoResponder.rules.length } })
  };
}
