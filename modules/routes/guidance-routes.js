import { evaluateGuidance, loadConfig, saveConfig, EXTRACTOR_IDS, EXTRACTOR_META, getParamOptions, getAllExtractorIDs, getAllExtractorMeta, loadCustomExtractors, saveCustomExtractors } from '../guidance-engine.js';
import { getReviewSave, refreshCachedReviews } from '../idleon-review.js';

/**
 * Guidance routes — config CRUD + evaluation
 *
 *  GET  /api/guidance/config          — full guidance-config.json
 *  PUT  /api/guidance/config          — overwrite config (admin only)
 *  PATCH /api/guidance/config         — merge-update a single card/category (admin only)
 *  GET  /api/guidance/extractors      — list of valid extractor IDs
 *  POST /api/guidance/evaluate        — evaluate a save object
 *  GET  /api/guidance/evaluate/:uid   — evaluate a saved user's save (if stored)
 */
export function registerGuidanceRoutes(app, deps) {
  const { requireAuth, requireTier, loadJSON, DATA_DIR } = deps;

  // ── GET config ──────────────────────────────────────────────────────────────
  app.get('/api/guidance/config', requireAuth, (req, res) => {
    try {
      res.json(loadConfig(true));
    } catch (e) {
      res.status(500).json({ error: 'Failed to load guidance config', detail: e.message });
    }
  });

  // ── PUT config (full replace) ──────────────────────────────────────────────
  app.put('/api/guidance/config', requireAuth, requireTier(3), (req, res) => {
    const cfg = req.body;
    if (!cfg || !Array.isArray(cfg.worlds)) {
      return res.status(400).json({ error: 'Invalid config: missing worlds array' });
    }
    try {
      saveConfig(cfg);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save guidance config', detail: e.message });
    }
  });

  // ── POST refresh the saving user's cached review after config change ──────
  app.post('/api/guidance/refresh-my-review', requireAuth, requireTier(3), (req, res) => {
    const userId = req.session?.odUid || req.session?.odid;
    if (!userId) return res.json({ ok: true, refreshed: [] });
    const refreshed = refreshCachedReviews([userId]);
    res.json({ ok: true, refreshed });
  });

  // ── PATCH config (update one card or category) ────────────────────────────
  app.patch('/api/guidance/config', requireAuth, requireTier(3), (req, res) => {
    const { worldId, categoryId, cardId, update } = req.body;
    if (!update) return res.status(400).json({ error: 'Missing update payload' });

    try {
      const cfg = loadConfig(true);
      const world = cfg.worlds.find(w => w.id === worldId);
      if (!world) return res.status(404).json({ error: `World not found: ${worldId}` });

      if (!categoryId) {
        // Update world-level fields
        Object.assign(world, update, { id: world.id }); // keep id
        saveConfig(cfg);
        return res.json({ ok: true, updated: 'world' });
      }

      const cat = world.categories.find(c => c.id === categoryId);
      if (!cat) return res.status(404).json({ error: `Category not found: ${categoryId}` });

      if (!cardId) {
        // Update category-level fields
        Object.assign(cat, update, { id: cat.id });
        saveConfig(cfg);
        return res.json({ ok: true, updated: 'category' });
      }

      const card = cat.cards.find(c => c.id === cardId);
      if (!card) return res.status(404).json({ error: `Card not found: ${cardId}` });

      Object.assign(card, update, { id: card.id });
      saveConfig(cfg);
      return res.json({ ok: true, updated: 'card' });
    } catch (e) {
      res.status(500).json({ error: 'Patch failed', detail: e.message });
    }
  });

  // ── GET valid extractor IDs (built-in + custom) ───────────────────────────
  app.get('/api/guidance/extractors', requireAuth, (req, res) => {
    try { res.json(getAllExtractorIDs()); }
    catch (e) { res.status(500).json({ error: 'Failed', detail: e.message }); }
  });

  // ── GET extractor metadata (built-in + custom) ────────────────────────────
  app.get('/api/guidance/extractor-meta', requireAuth, (req, res) => {
    try { res.json(getAllExtractorMeta()); }
    catch (e) { res.status(500).json({ error: 'Failed', detail: e.message }); }
  });

  // ── GET param options for a specific extractor ────────────────────────────
  app.get('/api/guidance/param-options/:extId', requireAuth, (req, res) => {
    const { extId } = req.params;
    if (!extId) return res.status(400).json({ error: 'Missing extId' });
    try { res.json(getParamOptions(extId)); }
    catch (e) { res.status(500).json({ error: 'Failed', detail: e.message }); }
  });

  // ── Custom extractor CRUD ─────────────────────────────────────────────────
  app.get('/api/guidance/custom-extractors', requireAuth, (req, res) => {
    try { res.json(loadCustomExtractors()); }
    catch (e) { res.status(500).json({ error: 'Failed', detail: e.message }); }
  });

  app.post('/api/guidance/custom-extractors', requireAuth, requireTier(3), (req, res) => {
    const def = req.body;
    if (!def.id || !def.label || !def.dataKey || !def.operation) {
      return res.status(400).json({ error: 'Missing required fields: id, label, dataKey, operation' });
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(def.id)) {
      return res.status(400).json({ error: 'Invalid id: must be alphanumeric with . _ - only' });
    }
    if (EXTRACTOR_IDS.includes(def.id)) {
      return res.status(409).json({ error: 'ID conflicts with a built-in extractor' });
    }
    try {
      const defs = loadCustomExtractors();
      if (defs.find(d => d.id === def.id)) {
        return res.status(409).json({ error: 'Custom extractor with this ID already exists' });
      }
      defs.push(def);
      saveCustomExtractors(defs);
      res.json({ ok: true, id: def.id });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save', detail: e.message });
    }
  });

  app.put('/api/guidance/custom-extractors/:id', requireAuth, requireTier(3), (req, res) => {
    const { id } = req.params;
    const update = req.body;
    if (!update.label || !update.dataKey || !update.operation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      const defs = loadCustomExtractors();
      const idx = defs.findIndex(d => d.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      defs[idx] = { ...update, id }; // keep original id
      saveCustomExtractors(defs);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save', detail: e.message });
    }
  });

  app.delete('/api/guidance/custom-extractors/:id', requireAuth, requireTier(3), (req, res) => {
    const { id } = req.params;
    try {
      const defs = loadCustomExtractors();
      const next = defs.filter(d => d.id !== id);
      if (next.length === defs.length) return res.status(404).json({ error: 'Not found' });
      saveCustomExtractors(next);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to save', detail: e.message });
    }
  });

  // ── POST evaluate (body = {save: {...}} or empty to use session user's saved save) ──────
  app.post('/api/guidance/evaluate', requireAuth, (req, res) => {
    try {
      let save = req.body?.save;
      if (!save && req.body?.saveJson) {
        save = typeof req.body.saveJson === 'string'
          ? JSON.parse(req.body.saveJson)
          : req.body.saveJson;
      }
      // No save in body — try the session user's stored review save
      if (!save || !save.data) {
        const userId = req.session?.odUid || req.session?.odid;
        if (userId) save = getReviewSave(userId);
      }
      if (!save || !save.data) {
        return res.status(400).json({ error: 'Missing save data — paste your JSON or analyze first' });
      }
      const result = evaluateGuidance(save);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'Evaluation failed', detail: e.message });
    }
  });

  // ── GET evaluate by stored account UID ───────────────────────────────────
  app.get('/api/guidance/evaluate/:uid', requireAuth, (req, res) => {
    try {
      const { uid } = req.params;
      // First: try the review save cache (populated when user analyzes via the review tab)
      let save = getReviewSave(uid);
      // Second: fall back to accounts.json (linked Idleon accounts)
      if (!save || !save.data) {
        const accounts = loadJSON
          ? loadJSON(`${DATA_DIR}/accounts.json`, {})
          : {};
        const account = accounts[uid] || accounts[Object.keys(accounts).find(k =>
          accounts[k]?.discordId === uid || accounts[k]?.uid === uid
        )];
        if (account?.save) save = account.save;
      }
      if (!save || !save.data) {
        return res.status(404).json({ error: `No save found for uid: ${uid}` });
      }
      const result = evaluateGuidance(save);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'Evaluation failed', detail: e.message });
    }
  });
}
