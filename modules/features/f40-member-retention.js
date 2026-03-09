export default function setup(app, deps, F) {
  const { requireAuth, requireTier } = deps;

  if (!F.memberRetention) F.memberRetention = { joins: [], leaves: [] };

  function trackMemberJoin(userId) {
    if (!F.memberRetention.joins) F.memberRetention.joins = [];
    F.memberRetention.joins.push({ id: userId, ts: Date.now() });
    if (F.memberRetention.joins.length > 10000) F.memberRetention.joins = F.memberRetention.joins.slice(-5000);
  }

  function trackMemberLeave(userId) {
    if (!F.memberRetention.leaves) F.memberRetention.leaves = [];
    F.memberRetention.leaves.push({ id: userId, ts: Date.now() });
    if (F.memberRetention.leaves.length > 10000) F.memberRetention.leaves = F.memberRetention.leaves.slice(-5000);
  }

  function calculateRetentionStats() {
    const now = Date.now();
    const periods = { '1d': 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000 };
    const result = {};
    for (const [label, ms] of Object.entries(periods)) {
      const joinsInPeriod = (F.memberRetention.joins || []).filter(j => now - j.ts <= ms);
      const leavesInPeriod = (F.memberRetention.leaves || []).filter(l => now - l.ts <= ms);
      const leaveIds = new Set(leavesInPeriod.map(l => l.id));
      const retained = joinsInPeriod.filter(j => !leaveIds.has(j.id)).length;
      result[label] = {
        joined: joinsInPeriod.length, left: leavesInPeriod.length, retained,
        rate: joinsInPeriod.length > 0 ? Math.round((retained / joinsInPeriod.length) * 100) : 100
      };
    }
    return result;
  }

  app.get('/api/features/member-retention', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, retention: calculateRetentionStats(), raw: { joins: (F.memberRetention.joins || []).length, leaves: (F.memberRetention.leaves || []).length } });
  });

  return {
    hooks: { trackMemberJoin, trackMemberLeave },
    exports: { calculateRetentionStats },
    backgroundTasks: [],
    masterData: () => ({ memberRetention: { joins: (F.memberRetention.joins || []).length, leaves: (F.memberRetention.leaves || []).length } })
  };
}
