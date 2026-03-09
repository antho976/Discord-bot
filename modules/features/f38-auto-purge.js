export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.autoPurge) F.autoPurge = { enabled: false, channels: [] };

  async function runAutoPurge() {
    if (!F.autoPurge.enabled || !F.autoPurge.channels.length) return;
    for (const cfg of F.autoPurge.channels) {
      try {
        const ch = await client.channels.fetch(cfg.channelId).catch(() => null);
        if (!ch || !ch.isTextBased()) continue;
        const maxAge = (cfg.maxAgeDays || 7) * 86400000;
        const cutoff = Date.now() - maxAge;
        const fourteenDays = Date.now() - 14 * 86400000;
        let messages = await ch.messages.fetch({ limit: 100 });
        const toDelete = messages.filter(m => m.createdTimestamp < cutoff && m.createdTimestamp > fourteenDays && !m.pinned);
        if (toDelete.size > 0) {
          const result = await ch.bulkDelete(toDelete, true).catch(() => null);
          const deleted = result?.size || 0;
          if (deleted > 0) addLog('info', `Auto-purge: deleted ${deleted} messages from ${ch.name}`);
        }
      } catch (e) {
        addLog('error', `Auto-purge failed in ${cfg.channelId}: ${e.message}`);
      }
    }
  }

  app.get('/api/features/auto-purge', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.autoPurge });
  });
  app.post('/api/features/auto-purge', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, channels } = req.body;
    if (typeof enabled === 'boolean') F.autoPurge.enabled = enabled;
    if (Array.isArray(channels)) {
      F.autoPurge.channels = channels.slice(0, 10).map(c => ({
        channelId: String(c.channelId || ''),
        maxAgeDays: Math.max(1, Math.min(14, parseInt(c.maxAgeDays) || 7)),
        checkIntervalHours: Math.max(1, Math.min(24, parseInt(c.checkIntervalHours) || 6))
      }));
    }
    saveState();
    dashAudit(req.userName, 'update-auto-purge', `Auto-purge: enabled=${F.autoPurge.enabled}, ${F.autoPurge.channels.length} channels`);
    res.json({ success: true, config: F.autoPurge });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: runAutoPurge, intervalMs: 21600000 }],
    masterData: () => ({ autoPurge: { enabled: F.autoPurge.enabled, channels: F.autoPurge.channels.length } })
  };
}
