export default function setup(app, deps, F) {
  const { requireAuth, requireTier, saveState, dashAudit } = deps;

  if (!F.welcomeImage) F.welcomeImage = { enabled: false, backgroundUrl: null, textColor: '#ffffff', font: 'bold 28px sans-serif', overlayOpacity: 0.4 };
  // Migrate old 'background' field to 'backgroundUrl'
  if (F.welcomeImage.background && !F.welcomeImage.backgroundUrl) { F.welcomeImage.backgroundUrl = F.welcomeImage.background; delete F.welcomeImage.background; }

  if (!F.goodbyeImage) F.goodbyeImage = { enabled: false, backgroundUrl: null, textColor: '#ff6b6b', font: 'bold 28px sans-serif', overlayOpacity: 0.5 };
  if (F.goodbyeImage.background && !F.goodbyeImage.backgroundUrl) { F.goodbyeImage.backgroundUrl = F.goodbyeImage.background; delete F.goodbyeImage.background; }

  // ── Welcome Image ──
  app.get('/api/features/welcome-image', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.welcomeImage });
  });
  app.post('/api/features/welcome-image', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, backgroundUrl, textColor, font, overlayOpacity } = req.body;
    if (typeof enabled === 'boolean') F.welcomeImage.enabled = enabled;
    if (typeof backgroundUrl === 'string') F.welcomeImage.backgroundUrl = backgroundUrl.slice(0, 500);
    if (typeof textColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(textColor)) F.welcomeImage.textColor = textColor;
    if (typeof font === 'string') F.welcomeImage.font = font.slice(0, 50);
    if (typeof overlayOpacity === 'number') F.welcomeImage.overlayOpacity = Math.min(1, Math.max(0, overlayOpacity));
    saveState();
    dashAudit(req.userName, 'update-welcome-image', `Welcome image: enabled=${F.welcomeImage.enabled}`);
    res.json({ success: true, config: F.welcomeImage });
  });

  // ── Goodbye Image ──
  app.get('/api/features/goodbye-image', requireAuth, requireTier('admin'), (req, res) => {
    res.json({ success: true, config: F.goodbyeImage });
  });
  app.post('/api/features/goodbye-image', requireAuth, requireTier('admin'), (req, res) => {
    const { enabled, backgroundUrl, textColor, font, overlayOpacity } = req.body;
    if (typeof enabled === 'boolean') F.goodbyeImage.enabled = enabled;
    if (typeof backgroundUrl === 'string') F.goodbyeImage.backgroundUrl = backgroundUrl.slice(0, 500);
    if (typeof textColor === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(textColor)) F.goodbyeImage.textColor = textColor;
    if (typeof font === 'string') F.goodbyeImage.font = font.slice(0, 50);
    if (typeof overlayOpacity === 'number') F.goodbyeImage.overlayOpacity = Math.min(1, Math.max(0, overlayOpacity));
    saveState();
    dashAudit(req.userName, 'update-goodbye-image', `Goodbye image: enabled=${F.goodbyeImage.enabled}`);
    res.json({ success: true, config: F.goodbyeImage });
  });

  return {
    hooks: {},
    backgroundTasks: [],
    masterData: () => ({ welcomeImage: { enabled: F.welcomeImage.enabled }, goodbyeImage: { enabled: F.goodbyeImage.enabled } })
  };
}
