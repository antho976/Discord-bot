export default function setup(app, deps, F) {
  const { requireAuth, saveState } = deps;

  if (!F.themeConfig) F.themeConfig = { mode: 'dark', customColors: null };

  app.get('/api/features/theme', requireAuth, (req, res) => {
    res.json({ success: true, theme: F.themeConfig });
  });
  app.post('/api/features/theme', requireAuth, (req, res) => {
    const { mode, customColors } = req.body;
    if (['dark', 'light', 'custom'].includes(mode)) F.themeConfig.mode = mode;
    if (customColors && typeof customColors === 'object') {
      const safe = {};
      for (const [k, v] of Object.entries(customColors)) {
        if (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v)) safe[k] = v;
      }
      F.themeConfig.customColors = safe;
    }
    saveState();
    res.json({ success: true, theme: F.themeConfig });
  });

  return {
    hooks: {},
    backgroundTasks: [],
    masterData: () => ({ theme: F.themeConfig })
  };
}
