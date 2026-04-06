function registerNewsRoutes(app, { smartBot, requireAuth, checkNewsFeed }) {
  app.post('/api/smartbot/news/post', requireAuth, async (req, res) => {
    try {
      if (typeof checkNewsFeed === 'function') await checkNewsFeed(true);
      res.json({ success: true });
    } catch (e) { res.json({ success: false, error: 'News post failed' }); }
  });

  app.get('/api/smartbot/news/last', requireAuth, (req, res) => {
    res.json({ success: true, post: smartBot.config?.lastNewsPost || null });
  });
}

export { registerNewsRoutes };