export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.webhookForwarding) F.webhookForwarding = { enabled: false, url: null, events: ['stream', 'moderation', 'giveaway', 'leveling'] };

  function forwardWebhookEvent(event, data) {
    if (!F.webhookForwarding.enabled || !F.webhookForwarding.url) return;
    if (!F.webhookForwarding.events.includes(event)) return;
    const url = F.webhookForwarding.url;
    try { new URL(url); } catch { return; }
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, ts: Date.now(), source: 'discord-bot' })
    }).catch(() => {});
  }

  app.get('/api/features/webhook-forwarding', requireAuth, requireTier('owner'), (req, res) => {
    res.json({ success: true, config: F.webhookForwarding });
  });
  app.post('/api/features/webhook-forwarding', requireAuth, requireTier('owner'), (req, res) => {
    const { enabled, url, events } = req.body;
    if (typeof enabled === 'boolean') F.webhookForwarding.enabled = enabled;
    if (typeof url === 'string') {
      try { new URL(url); F.webhookForwarding.url = url; } catch { return res.json({ success: false, error: 'Invalid URL' }); }
    }
    if (Array.isArray(events)) F.webhookForwarding.events = events.filter(e => typeof e === 'string');
    saveState();
    dashAudit(req.userName, 'update-webhook-forwarding', `Webhook forwarding: enabled=${F.webhookForwarding.enabled}`);
    res.json({ success: true, config: F.webhookForwarding });
  });

  return {
    hooks: { forwardWebhookEvent },
    backgroundTasks: [],
    masterData: () => ({ webhookForwarding: { enabled: F.webhookForwarding.enabled } })
  };
}
