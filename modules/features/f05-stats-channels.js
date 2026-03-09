export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.statsChannels) F.statsChannels = { enabled: false, channels: [], updateInterval: 10 };

  async function updateStatsChannels() {
    if (!F.statsChannels.enabled || !F.statsChannels.channels.length) return;
    try {
      const guild = client.guilds.cache.first();
      if (!guild) return;
      for (const sc of F.statsChannels.channels) {
        const ch = guild.channels.cache.get(sc.channelId);
        if (!ch) continue;
        let value = '';
        switch (sc.type) {
          case 'members': value = guild.memberCount; break;
          case 'online': value = guild.members.cache.filter(m => m.presence?.status === 'online' || m.presence?.status === 'dnd').size; break;
          case 'bots': value = guild.members.cache.filter(m => m.user.bot).size; break;
          case 'channels': value = guild.channels.cache.size; break;
          case 'roles': value = guild.roles.cache.size; break;
          default: value = '?';
        }
        const name = (sc.template || `📊 ${sc.type}: {count}`).replace('{count}', value);
        if (ch.name !== name) {
          await ch.setName(name).catch(() => {});
        }
      }
    } catch (e) {
      addLog('error', `Stats channels update failed: ${e.message}`);
    }
  }

  app.get('/api/features/stats-channels', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.statsChannels });
  });
  app.post('/api/features/stats-channels', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, channels, updateInterval } = req.body;
    if (typeof enabled === 'boolean') F.statsChannels.enabled = enabled;
    if (Array.isArray(channels)) {
      F.statsChannels.channels = channels.slice(0, 10).map(c => ({
        type: ['members', 'online', 'bots', 'channels', 'roles'].includes(c.type) ? c.type : 'members',
        channelId: String(c.channelId || ''),
        template: String(c.template || '').slice(0, 50)
      }));
    }
    if (updateInterval != null) F.statsChannels.updateInterval = Math.max(5, Math.min(60, parseInt(updateInterval) || 10));
    saveState();
    dashAudit(req.userName, 'update-stats-channels', `Stats channels: ${F.statsChannels.channels.length} configured`);
    res.json({ success: true, config: F.statsChannels });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: updateStatsChannels, intervalMs: (F.statsChannels.updateInterval || 10) * 60000 }],
    masterData: () => ({ statsChannels: { enabled: F.statsChannels.enabled, count: F.statsChannels.channels.length } })
  };
}
