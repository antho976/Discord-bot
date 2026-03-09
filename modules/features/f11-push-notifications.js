export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState } = deps;

  if (!F.pushNotifications) F.pushNotifications = { enabled: false, events: ['giveaway', 'moderation', 'stream'] };

  app.get('/api/features/push-notifications', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.pushNotifications });
  });
  app.post('/api/features/push-notifications', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, events } = req.body;
    if (typeof enabled === 'boolean') F.pushNotifications.enabled = enabled;
    if (Array.isArray(events)) F.pushNotifications.events = events.filter(e => typeof e === 'string');
    saveState();
    res.json({ success: true, config: F.pushNotifications });
  });

  return {
    hooks: {},
    backgroundTasks: [],
    masterData: () => ({ pushNotifications: { enabled: F.pushNotifications.enabled } })
  };
}
