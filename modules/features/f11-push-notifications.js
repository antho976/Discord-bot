export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState } = deps;

  if (!F.pushNotifications) F.pushNotifications = { enabled: false, streamLive: true, newMember: true, modAlert: false, giveaway: false, ticket: false };

  app.get('/api/features/push-notifications', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.pushNotifications });
  });
  app.post('/api/features/push-notifications', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, streamLive, newMember, modAlert, giveaway, ticket } = req.body;
    if (typeof enabled === 'boolean') F.pushNotifications.enabled = enabled;
    if (typeof streamLive === 'boolean') F.pushNotifications.streamLive = streamLive;
    if (typeof newMember === 'boolean') F.pushNotifications.newMember = newMember;
    if (typeof modAlert === 'boolean') F.pushNotifications.modAlert = modAlert;
    if (typeof giveaway === 'boolean') F.pushNotifications.giveaway = giveaway;
    if (typeof ticket === 'boolean') F.pushNotifications.ticket = ticket;
    saveState();
    res.json({ success: true, config: F.pushNotifications });
  });

  return {
    hooks: {},
    backgroundTasks: [],
    masterData: () => ({ pushNotifications: { enabled: F.pushNotifications.enabled } })
  };
}
