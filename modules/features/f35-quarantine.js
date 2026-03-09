export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.quarantine) F.quarantine = { enabled: false, roleId: null, durationMinutes: 60, logChannelId: null };

  async function quarantineMember(member) {
    if (!F.quarantine.enabled || !F.quarantine.roleId) return;
    try {
      const guild = member.guild;
      if (!guild.roles.cache.has(F.quarantine.roleId)) return;
      await member.roles.add(F.quarantine.roleId, 'Quarantine: new member');
      addLog('info', `Quarantined new member: ${member.user.tag}`);
      if (F.quarantine.logChannelId) {
        const ch = await client.channels.fetch(F.quarantine.logChannelId).catch(() => null);
        if (ch) await ch.send(`🔒 <@${member.id}> has been quarantined for ${F.quarantine.durationMinutes} minutes.`);
      }
      const duration = (F.quarantine.durationMinutes || 60) * 60000;
      setTimeout(async () => {
        try {
          const m = await guild.members.fetch(member.id).catch(() => null);
          if (m && m.roles.cache.has(F.quarantine.roleId)) {
            await m.roles.remove(F.quarantine.roleId, 'Quarantine expired');
            addLog('info', `Quarantine released: ${m.user.tag}`);
          }
        } catch {}
      }, duration);
    } catch (e) {
      addLog('error', `Quarantine failed: ${e.message}`);
    }
  }

  app.get('/api/features/quarantine', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.quarantine });
  });
  app.post('/api/features/quarantine', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, roleId, durationMinutes, logChannelId } = req.body;
    if (typeof enabled === 'boolean') F.quarantine.enabled = enabled;
    if (roleId !== undefined) F.quarantine.roleId = roleId || null;
    if (durationMinutes != null) F.quarantine.durationMinutes = Math.max(5, Math.min(10080, parseInt(durationMinutes) || 60));
    if (logChannelId !== undefined) F.quarantine.logChannelId = logChannelId || null;
    saveState();
    dashAudit(req.userName, 'update-quarantine', `Quarantine: enabled=${F.quarantine.enabled}, ${F.quarantine.durationMinutes}min`);
    res.json({ success: true, config: F.quarantine });
  });

  return {
    hooks: { quarantineMember },
    backgroundTasks: [],
    masterData: () => ({ quarantine: { enabled: F.quarantine.enabled } })
  };
}
