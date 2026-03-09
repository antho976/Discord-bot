export default function setup(app, deps, F) {
  const { addLog, client, state, requireAuth, requireTier, saveState } = deps;

  if (!F.eventSync) F.eventSync = { enabled: false, syncChannel: null };

  async function syncScheduledEvents() {
    if (!F.eventSync.enabled) return;
    try {
      const guild = client.guilds.cache.first();
      if (!guild) return;
      const schedule = state.schedule || {};
      if (!schedule.nextStreamAt) return;
      const nextStream = new Date(schedule.nextStreamAt);
      if (nextStream < new Date()) return;
      const events = await guild.scheduledEvents.fetch();
      const existing = events.find(e => e.name.includes('Stream') && e.scheduledStartAt > new Date());
      if (existing) return;
      await guild.scheduledEvents.create({
        name: '🎮 Stream', scheduledStartTime: nextStream,
        scheduledEndTime: new Date(nextStream.getTime() + 3 * 3600000),
        privacyLevel: 2, entityType: 3, entityMetadata: { location: 'Twitch' },
        description: 'Scheduled stream'
      });
      addLog('info', 'Discord scheduled event synced');
    } catch (e) {
      addLog('error', `Event sync failed: ${e.message}`);
    }
  }

  app.get('/api/features/event-sync', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.eventSync });
  });
  app.post('/api/features/event-sync', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled === 'boolean') F.eventSync.enabled = enabled;
    saveState();
    if (F.eventSync.enabled) syncScheduledEvents();
    res.json({ success: true, config: F.eventSync });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: syncScheduledEvents, intervalMs: 1800000 }],
    masterData: () => ({ eventSync: { enabled: F.eventSync.enabled } })
  };
}
