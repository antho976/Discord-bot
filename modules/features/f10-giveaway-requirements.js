export default function setup(app, deps, F) {
  const { leveling, requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.giveawayRequirements) F.giveawayRequirements = { enabled: false, minLevel: 0, minActivityDays: 0, requiredRoles: [] };

  function checkGiveawayEligibility(userId) {
    if (!F.giveawayRequirements.enabled) return { eligible: true };
    const reasons = [];
    const userLevel = leveling[userId]?.level || 0;
    if (F.giveawayRequirements.minLevel > 0 && userLevel < F.giveawayRequirements.minLevel) {
      reasons.push(`Minimum level ${F.giveawayRequirements.minLevel} required (you are level ${userLevel})`);
    }
    if (F.giveawayRequirements.minActivityDays > 0) {
      const lastActive = leveling[userId]?.lastMsg || 0;
      const daysSince = Math.floor((Date.now() - lastActive) / 86400000);
      if (daysSince > F.giveawayRequirements.minActivityDays) {
        reasons.push(`Must be active within last ${F.giveawayRequirements.minActivityDays} days`);
      }
    }
    return { eligible: reasons.length === 0, reasons };
  }

  app.get('/api/features/giveaway-requirements', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.giveawayRequirements });
  });
  app.post('/api/features/giveaway-requirements', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, minLevel, minActivityDays, requiredRoles } = req.body;
    if (typeof enabled === 'boolean') F.giveawayRequirements.enabled = enabled;
    if (minLevel != null) F.giveawayRequirements.minLevel = Math.max(0, Math.min(200, parseInt(minLevel) || 0));
    if (minActivityDays != null) F.giveawayRequirements.minActivityDays = Math.max(0, Math.min(90, parseInt(minActivityDays) || 0));
    if (Array.isArray(requiredRoles)) F.giveawayRequirements.requiredRoles = requiredRoles.filter(r => typeof r === 'string');
    saveState();
    dashAudit(req.userName, 'update-giveaway-reqs', `Giveaway requirements: enabled=${F.giveawayRequirements.enabled}`);
    res.json({ success: true, config: F.giveawayRequirements });
  });

  return {
    hooks: { checkGiveawayEligibility },
    backgroundTasks: [],
    masterData: () => ({ giveawayRequirements: { enabled: F.giveawayRequirements.enabled } })
  };
}
