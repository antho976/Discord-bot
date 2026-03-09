export default function setup(app, deps, F) {
  const { requireAuth, saveState } = deps;

  if (!F.dashboardPrefs) F.dashboardPrefs = { mobileOptimized: true, widgetLayout: [] };

  app.get('/api/features/dashboard-prefs', requireAuth, (req, res) => {
    res.json({ success: true, prefs: F.dashboardPrefs });
  });
  app.post('/api/features/dashboard-prefs', requireAuth, (req, res) => {
    const { widgetLayout } = req.body;
    if (Array.isArray(widgetLayout)) {
      F.dashboardPrefs.widgetLayout = widgetLayout.slice(0, 20).map(w => ({
        id: String(w.id || '').slice(0, 30),
        position: parseInt(w.position) || 0,
        visible: w.visible !== false
      }));
    }
    saveState();
    res.json({ success: true, prefs: F.dashboardPrefs });
  });

  return {
    hooks: {},
    backgroundTasks: [],
    masterData: () => ({ dashboardPrefs: F.dashboardPrefs })
  };
}
