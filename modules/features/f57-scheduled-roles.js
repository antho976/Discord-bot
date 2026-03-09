export default function setup(app, deps, F) {
  const { addLog, client, requireAuth, requireTier, saveState, dashAudit } = deps;

  // F57: Scheduled Role Assignments — give/remove roles at scheduled times
  if (!F.scheduledRoles) F.scheduledRoles = { enabled: false, schedules: [] };
  // schedules: [{ id, roleId, action: 'add'|'remove', cronDay, cronHour, cronMinute, targetType: 'all'|'role'|'users', targetValue, label, lastRun }]
  // targetType 'all' = all members, 'role' = members with a specific role, 'users' = specific user IDs

  async function checkScheduledRoles() {
    if (!F.scheduledRoles.enabled || !F.scheduledRoles.schedules.length) return;
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (const schedule of F.scheduledRoles.schedules) {
      if (!schedule.roleId) continue;

      const dayMatch = schedule.cronDay === '*' || schedule.cronDay === currentDay;
      const hourMatch = schedule.cronHour === currentHour;
      const minuteMatch = schedule.cronMinute === currentMinute;

      if (!dayMatch || !hourMatch || !minuteMatch) continue;

      // Prevent double-fire
      if (Date.now() - (schedule.lastRun || 0) < 60000) continue;

      try {
        const guild = client.guilds.cache.first();
        if (!guild) continue;

        const role = guild.roles.cache.get(schedule.roleId);
        if (!role) continue;

        let targetMembers = [];

        if (schedule.targetType === 'all') {
          const members = await guild.members.fetch();
          targetMembers = [...members.values()].filter(m => !m.user.bot);
        } else if (schedule.targetType === 'role' && schedule.targetValue) {
          const members = await guild.members.fetch();
          targetMembers = [...members.values()].filter(m => m.roles.cache.has(schedule.targetValue));
        } else if (schedule.targetType === 'users' && Array.isArray(schedule.targetValue)) {
          for (const uid of schedule.targetValue.slice(0, 100)) {
            const m = await guild.members.fetch(uid).catch(() => null);
            if (m) targetMembers.push(m);
          }
        }

        let count = 0;
        for (const member of targetMembers.slice(0, 200)) {
          try {
            if (schedule.action === 'add' && !member.roles.cache.has(schedule.roleId)) {
              await member.roles.add(schedule.roleId, `Scheduled role: ${schedule.label || schedule.id}`);
              count++;
            } else if (schedule.action === 'remove' && member.roles.cache.has(schedule.roleId)) {
              await member.roles.remove(schedule.roleId, `Scheduled role: ${schedule.label || schedule.id}`);
              count++;
            }
          } catch {}
        }

        schedule.lastRun = Date.now();
        if (count > 0) {
          addLog('info', `Scheduled role "${schedule.label || schedule.id}": ${schedule.action} ${role.name} for ${count} members`);
        }
      } catch (e) {
        addLog('error', `Scheduled role failed (${schedule.label || schedule.id}): ${e.message}`);
      }
    }
  }

  // API routes
  app.get('/api/features/scheduled-roles', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: { enabled: F.scheduledRoles.enabled }, schedules: F.scheduledRoles.schedules });
  });

  app.post('/api/features/scheduled-roles', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled === 'boolean') F.scheduledRoles.enabled = enabled;
    saveState();
    dashAudit(req.userName, 'update-scheduled-roles', `Scheduled roles: enabled=${F.scheduledRoles.enabled}`);
    res.json({ success: true, config: { enabled: F.scheduledRoles.enabled } });
  });

  app.post('/api/features/scheduled-roles/add', requireAuth, requireTier('admin'), (req, res) => {
    const { roleId, action, cronDay, cronHour, cronMinute, targetType, targetValue, label } = req.body;
    if (!roleId) return res.json({ success: false, error: 'roleId required' });
    if (!['add', 'remove'].includes(action)) return res.json({ success: false, error: 'action must be add or remove' });
    if (F.scheduledRoles.schedules.length >= 30) return res.json({ success: false, error: 'Maximum 30 schedules' });

    const id = `sr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const schedule = {
      id, roleId: String(roleId), action,
      cronDay: cronDay === '*' ? '*' : Math.max(0, Math.min(6, parseInt(cronDay) || 0)),
      cronHour: Math.max(0, Math.min(23, parseInt(cronHour) || 0)),
      cronMinute: Math.max(0, Math.min(59, parseInt(cronMinute) || 0)),
      targetType: ['all', 'role', 'users'].includes(targetType) ? targetType : 'all',
      targetValue: targetType === 'users' && Array.isArray(targetValue) ? targetValue.filter(u => typeof u === 'string').slice(0, 100) : (typeof targetValue === 'string' ? targetValue : null),
      label: String(label || '').slice(0, 50),
      lastRun: 0
    };
    F.scheduledRoles.schedules.push(schedule);
    saveState();
    dashAudit(req.userName, 'add-scheduled-role', `Added: ${schedule.label || schedule.id}`);
    res.json({ success: true, schedule });
  });

  app.post('/api/features/scheduled-roles/remove', requireAuth, requireTier('admin'), (req, res) => {
    const { id } = req.body;
    if (!id) return res.json({ success: false, error: 'id required' });
    const idx = F.scheduledRoles.schedules.findIndex(s => s.id === id);
    if (idx === -1) return res.json({ success: false, error: 'Schedule not found' });
    F.scheduledRoles.schedules.splice(idx, 1);
    saveState();
    dashAudit(req.userName, 'remove-scheduled-role', `Removed: ${id}`);
    res.json({ success: true });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: checkScheduledRoles, intervalMs: 60000 }],
    masterData: () => ({ scheduledRoles: { enabled: F.scheduledRoles.enabled, count: F.scheduledRoles.schedules.length } })
  };
}
