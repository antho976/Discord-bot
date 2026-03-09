export default function setup(app, deps, F) {
  const { requireAuth, requireTier } = deps;

  if (!F.voiceActivity) F.voiceActivity = {};

  function handleVoiceStateUpdate(oldState, newState) {
    const userId = newState.member?.id || oldState.member?.id;
    if (!userId) return;
    if (!F.voiceActivity[userId]) F.voiceActivity[userId] = { totalMinutes: 0, sessions: 0, lastJoin: 0, channels: {} };
    const va = F.voiceActivity[userId];
    if (!oldState.channelId && newState.channelId) {
      va.lastJoin = Date.now();
      va.sessions++;
    }
    if (oldState.channelId && !newState.channelId) {
      if (va.lastJoin > 0) {
        const minutes = Math.floor((Date.now() - va.lastJoin) / 60000);
        va.totalMinutes += minutes;
        if (!va.channels[oldState.channelId]) va.channels[oldState.channelId] = 0;
        va.channels[oldState.channelId] += minutes;
        va.lastJoin = 0;
      }
    }
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      if (va.lastJoin > 0) {
        const minutes = Math.floor((Date.now() - va.lastJoin) / 60000);
        va.totalMinutes += minutes;
        if (!va.channels[oldState.channelId]) va.channels[oldState.channelId] = 0;
        va.channels[oldState.channelId] += minutes;
      }
      va.lastJoin = Date.now();
    }
  }

  app.get('/api/features/voice-activity', requireAuth, requireTier('moderator'), (req, res) => {
    const sorted = Object.entries(F.voiceActivity)
      .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes)
      .slice(0, 50).map(([id, d]) => ({ userId: id, ...d }));
    res.json({ success: true, activity: sorted });
  });

  return {
    hooks: { handleVoiceStateUpdate },
    backgroundTasks: [],
    masterData: () => ({ voiceActivity: { tracked: Object.keys(F.voiceActivity).length } })
  };
}
