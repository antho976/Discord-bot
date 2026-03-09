export default function setup(app, deps, F) {
  const { client, requireAuth, requireTier, dashAudit } = deps;

  if (!F.bulkModeration) F.bulkModeration = { enabled: true };

  async function bulkModerate(action, userIds, reason, guildId) {
    const results = [];
    const guild = client.guilds.cache.get(guildId) || client.guilds.cache.first();
    if (!guild) return [{ error: 'Guild not found' }];
    for (const userId of userIds.slice(0, 25)) {
      try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) { results.push({ userId, success: false, error: 'Not found' }); continue; }
        switch (action) {
          case 'kick': await member.kick(reason || 'Bulk moderation'); break;
          case 'ban': await guild.members.ban(userId, { reason: reason || 'Bulk moderation' }); break;
          case 'timeout': await member.timeout(3600000, reason || 'Bulk moderation'); break;
          case 'warn': break;
        }
        results.push({ userId, success: true });
      } catch (e) {
        results.push({ userId, success: false, error: 'Moderation action failed' });
      }
    }
    return results;
  }

  app.post('/api/features/bulk-moderate', requireAuth, requireTier('admin'), async (req, res) => {
    const { action, userIds, reason } = req.body;
    if (!action || !Array.isArray(userIds) || !userIds.length) {
      return res.json({ success: false, error: 'action and userIds required' });
    }
    if (!['kick', 'ban', 'timeout'].includes(action)) {
      return res.json({ success: false, error: 'Invalid action' });
    }
    const results = await bulkModerate(action, userIds, reason, req.guildId);
    dashAudit(req.userName, 'bulk-moderate', `${action} ${userIds.length} users`);
    res.json({ success: true, results });
  });

  return {
    hooks: {},
    backgroundTasks: [],
    masterData: () => ({ bulkModeration: { enabled: F.bulkModeration.enabled } })
  };
}
