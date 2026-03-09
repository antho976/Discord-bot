export default function setup(app, deps, F) {
  const { requireAuth, requireTier } = deps;

  if (!F.channelActivity) F.channelActivity = {};

  function trackChannelActivity(channelId, userId) {
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
    res.json({ success: true, activity: F.channelActivity });
  });

  return {
    hooks: { trackChannelActivity },
    backgroundTasks: [],
    masterData: () => ({ channelActivity: { tracked: Object.keys(F.channelActivity).length } })
  };
}
