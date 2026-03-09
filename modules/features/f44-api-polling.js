export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.apiPolling) F.apiPolling = { enabled: false, polls: [] };

  async function checkAPIPolls() {
    if (!F.apiPolling.enabled || !F.apiPolling.polls.length) return;
    for (const poll of F.apiPolling.polls) {
      try {
        if (!poll.url || !poll.channelId) continue;
        try { new URL(poll.url); } catch { continue; }
        const resp = await fetch(poll.url).catch(() => null);
        if (!resp || !resp.ok) continue;
        const json = await resp.json().catch(() => null);
        if (!json) continue;
        let value = json;
        if (poll.jsonPath) {
          for (const key of poll.jsonPath.split('.')) {
            if (value == null) break;
            value = value[key];
          }
        }
        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (strValue === poll.lastValue) continue;
        poll.lastValue = strValue;
        const ch = await client.channels.fetch(poll.channelId).catch(() => null);
        if (!ch) continue;
        const text = (poll.template || '📊 **{label}**: {value}')
          .replace('{value}', strValue.slice(0, 1000))
          .replace('{label}', poll.label || 'Data');
        await ch.send(text);
      } catch (e) {
        addLog('error', `API poll failed (${poll.label || poll.url}): ${e.message}`);
      }
    }
  }

  app.get('/api/features/api-polling', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.apiPolling });
  });
  app.post('/api/features/api-polling', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, polls } = req.body;
    if (typeof enabled === 'boolean') F.apiPolling.enabled = enabled;
    if (Array.isArray(polls)) {
      F.apiPolling.polls = polls.slice(0, 10).map(p => {
        try { new URL(p.url); } catch { return null; }
        return {
          url: String(p.url || ''), jsonPath: String(p.jsonPath || '').slice(0, 100),
          channelId: String(p.channelId || ''),
          template: String(p.template || '📊 **{label}**: {value}').slice(0, 500),
          intervalMin: Math.max(5, Math.min(1440, parseInt(p.intervalMin) || 30)),
          lastValue: p.lastValue || null, label: String(p.label || '').slice(0, 50)
        };
      }).filter(Boolean);
    }
    saveState();
    dashAudit(req.userName, 'update-api-polling', `API polling: ${F.apiPolling.polls.length} configured, enabled=${F.apiPolling.enabled}`);
    res.json({ success: true, config: F.apiPolling });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: checkAPIPolls, intervalMs: 1800000 }],
    masterData: () => ({ apiPolling: { enabled: F.apiPolling.enabled, polls: F.apiPolling.polls.length } })
  };
}
