export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.welcomeImage) F.welcomeImage = { enabled: false, background: null, textColor: '#ffffff', font: 'bold 28px sans-serif' };

  app.get('/api/features/welcome-image', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.welcomeImage });
  });
  app.post('/api/features/welcome-image', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, background, textColor, font } = req.body;
    if (typeof enabled === 'boolean') F.welcomeImage.enabled = enabled;
    if (typeof background === 'string') F.welcomeImage.background = background.slice(0, 200);
    if (typeof textColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(textColor)) F.welcomeImage.textColor = textColor;
    if (typeof font === 'string') F.welcomeImage.font = font.slice(0, 50);
    saveState();
    dashAudit(req.userName, 'update-welcome-image', `Welcome image: enabled=${F.welcomeImage.enabled}`);
    res.json({ success: true, config: F.welcomeImage });
  });

  return {
    hooks: {},
    backgroundTasks: [],
    masterData: () => ({ welcomeImage: { enabled: F.welcomeImage.enabled } })
  };
}
