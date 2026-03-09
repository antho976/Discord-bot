export default function setup(app, deps, F) {
  const { addLog, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.autoRoleRejoin) F.autoRoleRejoin = { enabled: false, savedRoles: {} };

  function saveRolesOnLeave(member) {
    if (!F.autoRoleRejoin.enabled) return;
    const roles = member.roles.cache
      .filter(r => r.id !== member.guild.id)
      .map(r => r.id);
    if (roles.length > 0) F.autoRoleRejoin.savedRoles[member.id] = roles;
  }

  async function restoreRolesOnJoin(member) {
    if (!F.autoRoleRejoin.enabled) return;
    const savedRoles = F.autoRoleRejoin.savedRoles[member.id];
    if (!savedRoles || !savedRoles.length) return;
    try {
      const validRoles = savedRoles.filter(id => member.guild.roles.cache.has(id));
      if (validRoles.length > 0) {
        await member.roles.add(validRoles, 'Auto-role on rejoin');
        addLog('info', `Restored ${validRoles.length} roles for ${member.user.tag}`);
      }
      delete F.autoRoleRejoin.savedRoles[member.id];
    } catch (e) {
      addLog('error', `Auto-role rejoin failed for ${member.id}: ${e.message}`);
    }
  }

  app.get('/api/features/auto-role-rejoin', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: { enabled: F.autoRoleRejoin.enabled, savedCount: Object.keys(F.autoRoleRejoin.savedRoles).length } });
  });
  app.post('/api/features/auto-role-rejoin', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled === 'boolean') F.autoRoleRejoin.enabled = enabled;
    saveState();
    dashAudit(req.userName, 'update-auto-role-rejoin', `Auto-role rejoin: enabled=${F.autoRoleRejoin.enabled}`);
    res.json({ success: true, config: { enabled: F.autoRoleRejoin.enabled } });
  });

  return {
    hooks: { saveRolesOnLeave, restoreRolesOnJoin },
    backgroundTasks: [],
    masterData: () => ({ autoRoleRejoin: { enabled: F.autoRoleRejoin.enabled } })
  };
}
