export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState } = deps;

  if (!F.timezones) F.timezones = { enabled: false, entries: {} };

  function getUserTimezone(userId) {
    return F.timezones.entries[userId] || null;
  }

  function getUserLocalTime(userId) {
    const tz = F.timezones.entries[userId];
    if (!tz) return null;
    try {
      return new Date().toLocaleString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true, timeZoneName: 'short' });
    } catch { return null; }
  }

  app.get('/api/features/timezones', requireAuth, (req, res) => {
    res.json({ success: true, config: { enabled: F.timezones.enabled }, entries: F.timezones.entries });
  });
  app.post('/api/features/timezones', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled === 'boolean') F.timezones.enabled = enabled;
    saveState();
    res.json({ success: true });
  });
  app.post('/api/features/timezones/set', requireAuth, (req, res) => {
    const { userId, timezone } = req.body;
    if (!userId || !timezone) return res.json({ success: false, error: 'userId and timezone required' });
    try { new Date().toLocaleString('en-US', { timeZone: timezone }); } catch { return res.json({ success: false, error: 'Invalid timezone' }); }
    F.timezones.entries[userId] = timezone;
    saveState();
    res.json({ success: true });
  });

  return {
    hooks: { getUserLocalTime },
    backgroundTasks: [],
    masterData: () => ({ timezones: { enabled: F.timezones.enabled, users: Object.keys(F.timezones.entries).length } })
  };
}
