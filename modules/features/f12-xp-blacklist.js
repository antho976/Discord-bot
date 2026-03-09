export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.xpBlacklist) F.xpBlacklist = { channels: [], roles: [] };

  function isXpBlacklisted(channelId, memberRoleIds) {
    if (F.xpBlacklist.channels.includes(channelId)) return true;
    if (memberRoleIds && F.xpBlacklist.roles.some(r => memberRoleIds.includes(r))) return true;
    return false;
  }

  app.get('/api/features/xp-blacklist', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, blacklist: F.xpBlacklist });
  });
  app.post('/api/features/xp-blacklist', requireAuth, requireTier('admin'), (req, res) => {
    const { channels, roles } = req.body;
    if (Array.isArray(channels)) F.xpBlacklist.channels = channels.filter(c => typeof c === 'string');
    if (Array.isArray(roles)) F.xpBlacklist.roles = roles.filter(r => typeof r === 'string');
    saveState();
    dashAudit(req.userName, 'update-xp-blacklist', `XP blacklist: ${F.xpBlacklist.channels.length} channels, ${F.xpBlacklist.roles.length} roles`);
    res.json({ success: true, blacklist: F.xpBlacklist });
  });

  return {
    hooks: { isXpBlacklisted },
    backgroundTasks: [],
    masterData: () => ({ xpBlacklist: { channels: F.xpBlacklist.channels.length, roles: F.xpBlacklist.roles.length } })
  };
}
