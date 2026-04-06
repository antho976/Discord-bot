function registerQuotesRoutes(app, { smartBot, requireAuth, debouncedSaveState }) {
  app.get('/api/smartbot/quotes', requireAuth, (req, res) => {
    res.json({ success: true, quotes: smartBot.quoteManager.getAll() });
  });

  app.post('/api/smartbot/quotes', requireAuth, (req, res) => {
    const { text, addedBy, tags } = req.body;
    if (!text || !text.trim()) return res.json({ success: false, error: 'Quote text is required' });
    const safeText = String(text).slice(0, 500);
    const safeBy = String(addedBy || req.session?.username || 'dashboard').slice(0, 100);
    const safeTags = Array.isArray(tags) ? tags.map(t => String(t).slice(0, 50)).slice(0, 10) : [];
    const quote = smartBot.quoteManager.add(safeText, safeBy, safeTags);
    debouncedSaveState();
    res.json({ success: true, quote, total: smartBot.quoteManager.quotes.length });
  });

  app.put('/api/smartbot/quotes/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.json({ success: false, error: 'Invalid quote ID' });
    const updated = smartBot.quoteManager.edit(id, req.body);
    if (!updated) return res.json({ success: false, error: 'Quote not found' });
    debouncedSaveState();
    res.json({ success: true, quote: updated });
  });

  app.delete('/api/smartbot/quotes/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.json({ success: false, error: 'Invalid quote ID' });
    const deleted = smartBot.quoteManager.remove(id);
    if (!deleted) return res.json({ success: false, error: 'Quote not found' });
    debouncedSaveState();
    res.json({ success: true, total: smartBot.quoteManager.quotes.length });
  });
}

export { registerQuotesRoutes };