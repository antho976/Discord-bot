import { evaluateGuidance, loadConfig, saveConfig, EXTRACTOR_IDS, EXTRACTOR_META, getParamOptions, getAllExtractorIDs, getAllExtractorMeta, loadCustomExtractors, saveCustomExtractors } from '../guidance-engine.js';
import { getReviewSave, refreshCachedReviews, getCachedUserIds, getCachedReview } from '../idleon-review.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

// ── Rate limiter for evaluation routes (#87) ────────────────────────────────
const _evalCooldowns = new Map(); // sessionId → timestamp
const EVAL_COOLDOWN_MS = 10_000; // 10s between evaluations per user

function _checkRateLimit(req, res) {
  const sid = req.session?.id || req.ip;
  const now = Date.now();
  const last = _evalCooldowns.get(sid);
  if (last && now - last < EVAL_COOLDOWN_MS) {
    const wait = Math.ceil((EVAL_COOLDOWN_MS - (now - last)) / 1000);
    res.status(429).json({ error: `Rate limited — try again in ${wait}s` });
    return false;
  }
  _evalCooldowns.set(sid, now);
  // Prune old entries every 100 calls
  if (_evalCooldowns.size > 500) {
    for (const [k, v] of _evalCooldowns) { if (now - v > EVAL_COOLDOWN_MS * 10) _evalCooldowns.delete(k); }
  }
  return true;
}

// ── Request ID middleware (#88) ─────────────────────────────────────────────
function _attachRequestId(req, res, next) {
  req._reqId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req._reqId);
  next();
}

// ── Config version tracker (#92) ────────────────────────────────────────────
let _configVersion = 0;

// ── Cached extractor response (#96) ─────────────────────────────────────────
let _extractorCache = null;
let _extractorCacheTs = 0;
const EXTRACTOR_CACHE_TTL = 3600_000; // 1 hour

// ── Webhook notification helper (#100) ───────────────────────────────────────
function _notifyConfigWebhook(DATA_DIR, action, user) {
  try {
    const whFile = path.join(DATA_DIR, 'webhooks.json');
    if (!fs.existsSync(whFile)) return;
    const hooks = JSON.parse(fs.readFileSync(whFile, 'utf8'));
    const url = hooks?.guidance_config_change;
    if (!url) return;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'guidance_config_change', action, user, ts: Date.now(), version: _configVersion }),
    }).catch(() => {});
  } catch { /* non-critical */ }
}

export function registerGuidanceRoutes(app, deps) {
  const { requireAuth, requireTier, loadJSON, DATA_DIR } = deps;

  // Attach request ID to all guidance routes
  app.use('/api/guidance', _attachRequestId);

  // ── Sanitized error helper (#95) ──────────────────────────────────────────
  function _safeError(res, code, publicMsg, internalErr) {
    if (internalErr) console.error(`[guidance][${new Date().toISOString()}]`, publicMsg, internalErr.message || internalErr);
    return res.status(code).json({ error: publicMsg });
  }

  // ── GET config ──────────────────────────────────────────────────────────────
  app.get('/api/guidance/config', requireAuth, (req, res) => {
    try {
      const cfg = loadConfig(true);
      res.setHeader('X-Config-Version', String(_configVersion));
      res.json(cfg);
    } catch (e) {
      _safeError(res, 500, 'Failed to load guidance config', e);
    }
  });

  // ── PUT config (full replace) ──────────────────────────────────────────────
  app.put('/api/guidance/config', requireAuth, requireTier(3), (req, res) => {
    // Body size check (#97) — max 2 MB for config
    const contentLen = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLen > 2 * 1024 * 1024) {
      return res.status(413).json({ error: 'Config payload too large — max 2 MB' });
    }
    const cfg = req.body;
    if (!cfg || !Array.isArray(cfg.worlds)) {
      return res.status(400).json({ error: 'Invalid config: missing worlds array' });
    }
    try {
      // Auto-backup before overwriting
      _autoBackup(DATA_DIR);
      // Stamp version (#92)
      _configVersion++;
      cfg._version = _configVersion;
      cfg._lastModified = Date.now();
      cfg._lastModifiedBy = req.session?.odUid || req.session?.odid || 'unknown';
      saveConfig(cfg);
      _extractorCache = null; // bust cache
      _notifyConfigWebhook(DATA_DIR, 'put', cfg._lastModifiedBy);
      res.json({ ok: true, version: _configVersion });
    } catch (e) {
      _safeError(res, 500, 'Failed to save guidance config', e);
    }
  });

  // ── GET config history ─────────────────────────────────────────────────────
  app.get('/api/guidance/config/history', requireAuth, requireTier(3), (req, res) => {
    try {
      const versions = _listBackups(DATA_DIR);
      res.json({ versions, currentVersion: _configVersion });
    } catch (e) {
      _safeError(res, 500, 'Failed to list backups', e);
    }
  });

  // ── POST create manual backup ──────────────────────────────────────────────
  app.post('/api/guidance/config/backup', requireAuth, requireTier(3), (req, res) => {
    try {
      const file = _createBackup(DATA_DIR, req.body?.label || 'Manual backup');
      res.json({ ok: true, file });
    } catch (e) {
      _safeError(res, 500, 'Backup failed', e);
    }
  });

  // ── GET download a specific backup ────────────────────────────────────────
  app.get('/api/guidance/config/backup/:filename', requireAuth, requireTier(3), (req, res) => {
    const { filename } = req.params;
    if (!filename || !/^guidance-config-[\d\w._-]+\.json$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    try {
      const backupDir = path.join(DATA_DIR, 'backups', 'guidance');
      const filePath = path.join(backupDir, filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found' });
      const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      res.json({ config });
    } catch (e) {
      _safeError(res, 500, 'Failed to load backup', e);
    }
  });

  // ── POST restore config from backup ───────────────────────────────────────
  app.post('/api/guidance/config/restore/:filename', requireAuth, requireTier(3), (req, res) => {
    const { filename } = req.params;
    if (!filename || !/^guidance-config-[\d\w._-]+\.json$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    try {
      const backupDir = path.join(DATA_DIR, 'backups', 'guidance');
      const filePath = path.join(backupDir, filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup file not found' });
      // Backup current before restoring
      _autoBackup(DATA_DIR);
      const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!config || !Array.isArray(config.worlds)) {
        return res.status(400).json({ error: 'Invalid backup: missing worlds array' });
      }
      saveConfig(config);
      _configVersion++;
      _extractorCache = null;
      _notifyConfigWebhook(DATA_DIR, 'restore', req.session?.odUid || req.session?.odid || 'unknown');
      res.json({ ok: true, config, version: _configVersion });
    } catch (e) {
      _safeError(res, 500, 'Restore failed', e);
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
  // Deep-merge two plain objects; arrays/primitives from `src` win but nested objects are merged
  // #89: Sanitize __proto__ and constructor to prevent prototype pollution attacks
  function _deepMerge(target, src) {
    const out = Object.assign({}, target);
    for (const [k, v] of Object.entries(src)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (v && typeof v === 'object' && !Array.isArray(v) && typeof target[k] === 'object' && !Array.isArray(target[k])) {
        out[k] = _deepMerge(target[k], v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  app.patch('/api/guidance/config', requireAuth, requireTier(3), (req, res) => {
    const { worldId, categoryId, cardId, update } = req.body;
    if (!update) return res.status(400).json({ error: 'Missing update payload' });

    try {
      const cfg = loadConfig(true);
      const world = cfg.worlds.find(w => w.id === worldId);
      if (!world) return res.status(404).json({ error: `World not found: ${worldId}` });

      if (!categoryId) {
        // Update world-level fields
        Object.assign(world, _deepMerge(world, update), { id: world.id }); // keep id
        _configVersion++;
        cfg._version = _configVersion;
        cfg._lastModified = Date.now();
        cfg._lastModifiedBy = req.session?.odUid || req.session?.odid || 'unknown';
        saveConfig(cfg);
        _extractorCache = null;
        _notifyConfigWebhook(DATA_DIR, 'patch', cfg._lastModifiedBy);
        return res.json({ ok: true, updated: 'world', version: _configVersion });
      }

      const cat = world.categories.find(c => c.id === categoryId);
      if (!cat) return res.status(404).json({ error: `Category not found: ${categoryId}` });

      if (!cardId) {
        // Update category-level fields
        Object.assign(cat, _deepMerge(cat, update), { id: cat.id });
        _configVersion++;
        cfg._version = _configVersion;
        cfg._lastModified = Date.now();
        cfg._lastModifiedBy = req.session?.odUid || req.session?.odid || 'unknown';
        saveConfig(cfg);
        _extractorCache = null;
        _notifyConfigWebhook(DATA_DIR, 'patch', cfg._lastModifiedBy);
        return res.json({ ok: true, updated: 'category', version: _configVersion });
      }

      const card = cat.cards.find(c => c.id === cardId);
      if (!card) return res.status(404).json({ error: `Card not found: ${cardId}` });

      Object.assign(card, _deepMerge(card, update), { id: card.id });
      // Config versioning on PATCH (#92)
      _configVersion++;
      cfg._version = _configVersion;
      cfg._lastModified = Date.now();
      cfg._lastModifiedBy = req.session?.odUid || req.session?.odid || 'unknown';
      saveConfig(cfg);
      _extractorCache = null; // bust cache
      _notifyConfigWebhook(DATA_DIR, 'patch', cfg._lastModifiedBy);
      return res.json({ ok: true, updated: 'card', version: _configVersion });
    } catch (e) {
      _safeError(res, 500, 'Patch failed', e);
    }
  });

  // ── GET valid extractor IDs (built-in + custom) — cached for 1h (#96) ─────
  app.get('/api/guidance/extractors', requireAuth, (req, res) => {
    try {
      const now = Date.now();
      if (!_extractorCache || now - _extractorCacheTs > EXTRACTOR_CACHE_TTL) {
        _extractorCache = { ids: getAllExtractorIDs(), meta: getAllExtractorMeta() };
        _extractorCacheTs = now;
      }
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(_extractorCache.ids);
    } catch (e) { _safeError(res, 500, 'Failed to load extractors', e); }
  });

  // ── GET extractor metadata (built-in + custom) — cached for 1h (#96) ──────
  app.get('/api/guidance/extractor-meta', requireAuth, (req, res) => {
    try {
      const now = Date.now();
      if (!_extractorCache || now - _extractorCacheTs > EXTRACTOR_CACHE_TTL) {
        _extractorCache = { ids: getAllExtractorIDs(), meta: getAllExtractorMeta() };
        _extractorCacheTs = now;
      }
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(_extractorCache.meta);
    } catch (e) { _safeError(res, 500, 'Failed to load extractor metadata', e); }
  });

  // ── GET param options for a specific extractor ────────────────────────────
  app.get('/api/guidance/param-options/:extId', requireAuth, (req, res) => {
    const { extId } = req.params;
    if (!extId) return res.status(400).json({ error: 'Missing extId' });
    try {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(getParamOptions(extId));
    } catch (e) { _safeError(res, 500, 'Failed to load param options', e); }
  });

  // ── Custom extractor CRUD ─────────────────────────────────────────────────
  app.get('/api/guidance/custom-extractors', requireAuth, (req, res) => {
    try { res.json(loadCustomExtractors()); }
    catch (e) { _safeError(res, 500, 'Failed to load custom extractors', e); }
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
      _extractorCache = null; // bust cache on new extractor
      res.json({ ok: true, id: def.id });
    } catch (e) {
      _safeError(res, 500, 'Failed to save custom extractor', e);
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
      _extractorCache = null; // bust cache on update
      res.json({ ok: true });
    } catch (e) {
      _safeError(res, 500, 'Failed to update custom extractor', e);
    }
  });

  app.delete('/api/guidance/custom-extractors/:id', requireAuth, requireTier(3), (req, res) => {
    const { id } = req.params;
    try {
      const defs = loadCustomExtractors();
      const next = defs.filter(d => d.id !== id);
      if (next.length === defs.length) return res.status(404).json({ error: 'Not found' });
      saveCustomExtractors(next);
      _extractorCache = null; // bust cache on delete
      res.json({ ok: true });
    } catch (e) {
      _safeError(res, 500, 'Failed to delete custom extractor', e);
    }
  });

  // ── POST evaluate (body = {save: {...}} or empty to use session user's saved save) ──────
  app.post('/api/guidance/evaluate', requireAuth, (req, res) => {    // Rate limiting (#87)
    if (!_checkRateLimit(req, res)) return;    // Reject oversized payloads (max 4 MB raw save)
    const contentLen = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLen > 4 * 1024 * 1024) {
      return res.status(413).json({ error: 'Payload too large — max 4 MB' });
    }
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
      _safeError(res, 500, 'Evaluation failed', e);
    }
  });

  // ── POST sandbox evaluate (admin only, no rate limit, custom JSON) ───
  app.post('/api/guidance/sandbox-evaluate', requireAuth, requireTier(3), (req, res) => {
    try {
      let save = req.body?.save;
      if (!save && req.body?.saveJson) {
        save = typeof req.body.saveJson === 'string'
          ? JSON.parse(req.body.saveJson)
          : req.body.saveJson;
      }
      if (!save || !save.data) {
        return res.status(400).json({ error: 'Missing save data — provide a JSON object with a "data" key' });
      }
      const result = evaluateGuidance(save, { profile: true });
      res.json(result);
    } catch (e) {
      _safeError(res, 500, 'Sandbox evaluation failed', e);
    }
  });

  // ── GET evaluate by stored account UID ───────────────────────────────
  app.get('/api/guidance/evaluate/:uid', requireAuth, (req, res) => {
    // Rate limiting (#87)
    if (!_checkRateLimit(req, res)) return;
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
      _safeError(res, 500, 'Evaluation failed', e);
    }
  });

  // ── GET guidance leaderboard (top-N users by overall guidance pct) ──────────
  app.get('/api/guidance/leaderboard', requireAuth, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    try {
      const uids = getCachedUserIds();
      const rows = [];
      for (const uid of uids) {
        const save = getReviewSave(uid);
        if (!save || !save.data) continue;
        let guid;
        try { guid = evaluateGuidance(save); } catch { continue; }
        if (!guid || !guid.worlds) continue;
        // Compute overall pct = average world pct
        const pcts = guid.worlds.map(w => w.pct || 0);
        const globalPct = pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
        const worldMap = {};
        for (const w of guid.worlds) worldMap[w.id] = Math.round((w.pct || 0) * 1000) / 1000;
        const review = getCachedReview(uid);
        rows.push({
          uid,
          globalPct: Math.round(globalPct * 1000) / 1000,
          worlds: worldMap,
          tier: review?.result?.tier ?? null,
          tierLabel: review?.result?.tierLabel ?? null,
          analyzedAt: review?.analyzedAt ?? null,
        });
      }
      rows.sort((a, b) => b.globalPct - a.globalPct);
      res.json({ ok: true, leaderboard: rows.slice(0, limit), total: rows.length });
    } catch (e) {
      _safeError(res, 500, 'Leaderboard failed', e);
    }
  });
}

// ── Backup helpers ─────────────────────────────────────────────────────────

function _backupDir(DATA_DIR) {
  const dir = path.join(DATA_DIR, 'backups', 'guidance');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function _createBackup(DATA_DIR, label = '') {
  const cfg = loadConfig();
  const ts = Date.now();
  const filename = 'guidance-config-' + ts + '.json';
  const dir = _backupDir(DATA_DIR);
  const filePath = path.join(dir, filename);
  const payload = { ...cfg, _backupTs: ts, _backupLabel: label };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  // Keep only last 20 backups
  const all = fs.readdirSync(dir).filter(f => f.startsWith('guidance-config-') && f.endsWith('.json')).sort();
  if (all.length > 20) {
    for (const old of all.slice(0, all.length - 20)) {
      try { fs.unlinkSync(path.join(dir, old)); } catch { /* ignore */ }
    }
  }
  return filename;
}

function _autoBackup(DATA_DIR) {
  try { _createBackup(DATA_DIR, 'Auto-backup before save'); } catch { /* non-critical */ }
}

function _listBackups(DATA_DIR) {
  const dir = _backupDir(DATA_DIR);
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('guidance-config-') && f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 20);
  return files.map(file => {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      let cardCount = 0;
      if (Array.isArray(raw.worlds)) {
        for (const w of raw.worlds) for (const c of (w.categories || [])) cardCount += (c.cards || []).length;
      }
      return {
        file,
        ts: raw._backupTs || parseInt(file.replace('guidance-config-', '').replace('.json', ''), 10),
        label: raw._backupLabel || '',
        worldCount: Array.isArray(raw.worlds) ? raw.worlds.length : 0,
        cardCount,
      };
    } catch {
      return { file, ts: 0, label: '', worldCount: 0, cardCount: 0 };
    }
  });
}
