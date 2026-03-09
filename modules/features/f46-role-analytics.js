export default function setup(app, deps, F) {
  const { addLog, client, leveling, requireAuth, requireTier, saveState } = deps;

  if (!F.roleAnalytics) F.roleAnalytics = { lastCalculated: 0, data: {} };

  async function calculateRoleAnalytics() {
    const guild = client.guilds.cache.first();
    if (!guild) return;
    try {
      const members = await guild.members.fetch().catch(() => null);
      if (!members) return;
      const data = {};
      for (const [, role] of guild.roles.cache) {
        if (role.id === guild.id) continue;
        const roleMembers = members.filter(m => m.roles.cache.has(role.id));
        const activeCount = roleMembers.filter(m => {
          const l = leveling[m.id];
          return l && Date.now() - (l.lastMsg || 0) < 604800000;
        }).size;
        const avgLevel = roleMembers.size > 0
          ? Math.round(roleMembers.reduce((sum, m) => sum + (leveling[m.id]?.level || 0), 0) / roleMembers.size) : 0;
        data[role.id] = { name: role.name, color: role.hexColor, count: roleMembers.size, activeCount, avgLevel };
      }
      F.roleAnalytics.data = data;
      F.roleAnalytics.lastCalculated = Date.now();
    } catch (e) {
      addLog('error', `Role analytics failed: ${e.message}`);
    }
  }

  app.get('/api/features/role-analytics', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, data: F.roleAnalytics.data, lastCalculated: F.roleAnalytics.lastCalculated });
  });
  app.post('/api/features/role-analytics/refresh', requireAuth, requireTier('admin'), async (req, res) => {
    await calculateRoleAnalytics();
    saveState();
    res.json({ success: true, data: F.roleAnalytics.data });
  });

  return {
    hooks: {},
    backgroundTasks: [{ fn: calculateRoleAnalytics, intervalMs: 14400000 }],
    masterData: () => ({ roleAnalytics: { roles: Object.keys(F.roleAnalytics.data).length } })
  };
}
