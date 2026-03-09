export default function setup(app, deps, F) {
  const { addLog, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.autoThread) F.autoThread = { enabled: false, channels: [] };

  async function handleAutoThread(message) {
    if (!F.autoThread.enabled) return;
    const cfg = F.autoThread.channels.find(c => c.channelId === message.channel.id);
    if (!cfg) return;
    try {
      const name = (cfg.nameTemplate || '{user}-{date}')
        .replace('{user}', message.author.username.slice(0, 20))
        .replace('{date}', new Date().toISOString().slice(0, 10))
        .slice(0, 100);
      await message.startThread({ name, autoArchiveDuration: cfg.archiveMinutes || 1440 });
    } catch (e) {
      addLog('error', `Auto-thread failed: ${e.message}`);
    }
  }

  app.get('/api/features/auto-thread', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.autoThread });
  });
  app.post('/api/features/auto-thread', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, channels } = req.body;
    if (typeof enabled === 'boolean') F.autoThread.enabled = enabled;
    if (Array.isArray(channels)) {
      F.autoThread.channels = channels.slice(0, 10).map(c => ({
        channelId: String(c.channelId || ''),
        nameTemplate: String(c.nameTemplate || '{user}-{date}').slice(0, 100),
        archiveMinutes: Math.max(60, Math.min(10080, parseInt(c.archiveMinutes) || 1440))
      }));
    }
    saveState();
    dashAudit(req.userName, 'update-auto-thread', `Auto-thread: enabled=${F.autoThread.enabled}`);
    res.json({ success: true, config: F.autoThread });
  });

  return {
    hooks: { handleAutoThread },
    backgroundTasks: [],
    masterData: () => ({ autoThread: { enabled: F.autoThread.enabled, channels: F.autoThread.channels.length } })
  };
}
