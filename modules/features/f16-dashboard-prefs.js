export default function setup(app, deps, F) {
  const { requireAuth, saveState } = deps;

  if (!F.dashboardPrefs) F.dashboardPrefs = { compact: false, animations: true, sounds: false, sidebarWidth: 'normal', landingPage: 'overview' };

  app.get('/api/features/dashboard-prefs', requireAuth, (req, res) => {
    res.json({ success: true, prefs: F.dashboardPrefs });
  });
  app.post('/api/features/dashboard-prefs', requireAuth, (req, res) => {
    const { compact, animations, sounds, sidebarWidth, landingPage, widgetLayout } = req.body;
    if (typeof compact === 'boolean') F.dashboardPrefs.compact = compact;
    if (typeof animations === 'boolean') F.dashboardPrefs.animations = animations;
    if (typeof sounds === 'boolean') F.dashboardPrefs.sounds = sounds;
    const allowedWidths = ['narrow', 'normal', 'wide'];
    if (allowedWidths.includes(sidebarWidth)) F.dashboardPrefs.sidebarWidth = sidebarWidth;
    const allowedPages = ['overview', 'stats', 'welcome', 'pets', 'moderation'];
    if (allowedPages.includes(landingPage)) F.dashboardPrefs.landingPage = landingPage;
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
