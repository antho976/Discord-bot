export default function setup(app, deps, F) {
  const { requireAuth, requireTier } = deps;

  if (!F.engagementHeatmap) F.engagementHeatmap = {};

  function trackEngagementHeatmap() {
    const now = new Date();
    const key = `${now.getDay()}-${now.getHours()}`;
    F.engagementHeatmap[key] = (F.engagementHeatmap[key] || 0) + 1;
  }

  app.get('/api/features/engagement-heatmap', requireAuth, requireTier('moderator'), (req, res) => {
    res.json({ success: true, heatmap: F.engagementHeatmap });
  });

  return {
    hooks: { trackEngagementHeatmap },
    backgroundTasks: [],
    masterData: () => ({ engagementHeatmap: { dataPoints: Object.keys(F.engagementHeatmap).length } })
  };
}
