import { evaluateGuidance, loadConfig, saveConfig, EXTRACTOR_IDS } from '../guidance-engine.js';

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

  // ── GET valid extractor IDs ────────────────────────────────────────────────
  app.get('/api/guidance/extractors', requireAuth, (req, res) => {
    res.json(EXTRACTOR_IDS);
  });

  // ── POST evaluate (body = {save: {...}} or {saveJson: 'string'}) ───────────
  app.post('/api/guidance/evaluate', requireAuth, (req, res) => {
    try {
      let save = req.body?.save;
      if (!save && req.body?.saveJson) {
        save = typeof req.body.saveJson === 'string'
          ? JSON.parse(req.body.saveJson)
          : req.body.saveJson;
      }
      if (!save || !save.data) {
        return res.status(400).json({ error: 'Missing save.data in request body' });
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
      // Try to load the save from the accounts data
      const accounts = loadJSON
        ? loadJSON(`${DATA_DIR}/accounts.json`, {})
        : {};
      const account = accounts[uid] || accounts[Object.keys(accounts).find(k =>
        accounts[k]?.discordId === uid || accounts[k]?.uid === uid
      )];
      if (!account?.save) {
        return res.status(404).json({ error: `No save found for uid: ${uid}` });
      }
      const result = evaluateGuidance(account.save);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'Evaluation failed', detail: e.message });
    }
  });
}
