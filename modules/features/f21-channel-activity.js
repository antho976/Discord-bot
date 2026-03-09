export default function setup(app, deps, F) {
  const { requireAuth, requireTier } = deps;

  if (!F.channelActivity) F.channelActivity = {};
  if (!F.channelActivityConfig) F.channelActivityConfig = { trackedChannels: [] };

  function trackChannelActivity(channelId, userId) {
    // Only track configured channels (or all if none configured)
    const tracked = F.channelActivityConfig.trackedChannels || [];
    if (tracked.length > 0 && !tracked.includes(channelId)) return;
    if (!F.channelActivity[channelId]) {
      F.channelActivity[channelId] = { messages: 0, hourly: {}, topPosters: {} };
    }
    const ca = F.channelActivity[channelId];
    ca.messages++;
    const hour = new Date().getHours();
    ca.hourly[hour] = (ca.hourly[hour] || 0) + 1;
    ca.topPosters[userId] = (ca.topPosters[userId] || 0) + 1;
  }

  app.get('/api/features/channel-activity', requireAuth, requireTier('moderator'), (req, res) => {
    res.json({ success: true, activity: F.channelActivity, trackedChannels: F.channelActivityConfig.trackedChannels || [] });
  });

  app.post('/api/features/channel-activity', requireAuth, requireTier('admin'), (req, res) => {
    const { trackedChannels } = req.body;
    if (Array.isArray(trackedChannels)) {
      F.channelActivityConfig.trackedChannels = trackedChannels.filter(id => typeof id === 'string' && /^\d+$/.test(id));
    }
    res.json({ success: true });
  });

  return {
    hooks: { trackChannelActivity },
    backgroundTasks: [],
    masterData: () => ({ channelActivity: { tracked: Object.keys(F.channelActivity).length } })
  };
}
